# M-P4 数据共享（只读链接）— 设计文档

> 状态：草案，待用户审阅
> 日期：2026-06-19
> 关联：DEVLOG.md M-P4，预估 2 天

---

## 1. 目的

允许化疗血常规追踪器的用户**生成只读分享链接**，把自己的健康数据展示给医生、亲属或其他指定第三方。受邀者通过链接（可选 PIN）查看，**不需要注册账号**。链接由分享者**手动撤销**或**自动过期**失效。

不在本次范围内：受邀者评论 / 编辑 / 双向同步、邮件邀请发送、访问统计审计、社交账号登录、IP 白名单。

---

## 2. 用户决策汇总

九个澄清问题逐一锁定的设计参数：

| # | 问题 | 决策 |
|---|---|---|
| Q1 | 受邀者能看到什么 | **C** — 创建链接时分享者勾选范围（血常规 / 化疗周期 / 趋势分析 三选一以上） |
| Q2 | 链接形式 | **B** — 长 token 链接 + 可选 4–6 位 PIN |
| Q3 | 失效策略 | **B** — 默认 7 天，下拉支持 1d / 7d / 30d / 90d / 永不过期 |
| Q4 | 撤销语义 | **A** — 硬删除，旧链接立刻 404 |
| Q5 | 访问统计 | **A** — 不记录，viewer 端纯只读 |
| Q6 | 链接数量 | **A** — 不限，软上限 50/用户 |
| Q7 | viewer 路径 | **A** — 同 SPA 公开路由 `/share/:token` |
| Q8 | 数据快照 vs 实时 | **B** — 实时只读视图（owner 删账户 → 链接失效） |
| Q9 | 是否显示分享者姓名 | **A** — viewer 顶部显示 firstName + lastName，**不**暴露 email/性别/生日/_id |
| Q10 | PIN 错误处理 | **A** — 错误提示 + 5 次/分钟限流，不撤销、不通知 |
| 后续 | `User.settings.dataSharing.enabled` 处理 | 保留为 Settings 总开关，关闭时禁止新建分享 |
| 后续 | token 长度 | 32 字节（64 个 hex 字符） |
| 后续 | 是否复用受保护组件 | A — viewer 独立小展示组件，原组件不动 |

---

## 3. 架构总览

```
┌──────────────────┐    创建/列出/撤销 (JWT)        ┌────────────────┐
│  Settings 页面    │  ──────────────────────────►  │  /api/shares    │  protect 中间件
│  我的分享区        │                               └────────────────┘
└──────────────────┘                                        │
                                                            ▼
                                                    ┌────────────────┐
                                                    │  Share Model    │
                                                    │  (新集合)        │
                                                    └────────────────┘
                                                            ▲
┌──────────────────┐  数据请求 (token + PIN header)         │
│ /share/:token    │  ──────────────────────────►  ┌─────────────────────┐
│  公开 viewer      │                               │ /api/public/shares  │  无 JWT
│   PIN 输入框      │                               │  /:token/...         │  独立限流
│  + 数据视图       │  ◄────── JSON ────────────── └─────────────────────┘
└──────────────────┘                                        │
                                                  反查 owner，按 scope
                                                  实时查 BloodTest/ChemoCycle
```

---

## 4. 数据模型

### 4.1 Share Model — `backend/src/models/Share.ts`（新增）

| 字段 | 类型 | 说明 |
|---|---|---|
| `user` | `ObjectId(ref User)` | 必填，分享者 |
| `token` | `String` | 32 字节随机 hex（`crypto.randomBytes(32).toString('hex')` → 64 字符），唯一 |
| `pinHash` | `String \| null` | bcrypt(pin)；`null` 表示无 PIN |
| `scope.bloodTests` | `Boolean` | 至少有一个 scope.* 为 true |
| `scope.chemoCycles` | `Boolean` | |
| `scope.analytics` | `Boolean` | |
| `expiresAt` | `Date \| null` | `null` = 永不过期 |
| `createdAt` / `updatedAt` | `Date` | mongoose timestamps |

**索引**：
- `{ token: 1 }` 唯一索引（token 命中查询）
- `{ user: 1, createdAt: -1 }` 复合索引（"我的分享"列表分页）

**约束**（schema 层）：
- `pre('validate')`：至少一个 `scope.*` 为 true，否则 ValidationError
- `pin` 在 controller 层校验 `^\d{4,6}$`；通过 `bcrypt.hash(pin, 10)` 存到 `pinHash`

### 4.2 现有结构改动

| 位置 | 改动 |
|---|---|
| `User.settings.dataSharing.enabled` | **保留**，作 Settings 总开关。关闭时 `POST /api/shares` 返回 422 |
| `User.settings.dataSharing.sharedWith` | 不动（无业务联动；M-P4 不依赖；保留是为不破现有 schema/契约） |
| `authController.deleteAccount` | 级联删除 `Share.deleteMany({ user: req.user._id })` |
| `contracts/index.ts` | 新增 ShareScope / ShareExpiresIn / Share / ShareCreateRequest / ShareCreateResponseData / PublicShareMeta |
| `app.ts` | 挂载新限流（公开 + PIN verify）、新路由 `/api/shares` 与 `/api/public/shares` |
| `backend/scripts/contract-validator.js` | 增加第 4 项：Share Model ↔ Validation ↔ contracts/index.ts 字段对齐 |

---

## 5. 受保护 API（`/api/shares`）

挂在 `protect` 中间件后。

### 5.1 `POST /api/shares` — 创建分享

**Request**
```ts
{
  scope: { bloodTests: boolean, chemoCycles: boolean, analytics: boolean },
  expiresIn: '1d' | '7d' | '30d' | '90d' | 'never',
  pin?: string  // 4–6 位数字
}
```

**校验**（`validateShareCreate`）：
- `scope.*` 必为布尔；至少一项 true
- `expiresIn` ∈ 5 枚举之一
- `pin` 可选；存在时必须 `^\d{4,6}$`

**业务前置**（controller 内）：
- `req.user.settings.dataSharing.enabled === true`，否则 422 + `"请先在设置→数据中开启数据共享"`
- `Share.countDocuments({ user: req.user._id }) < 50`，否则 422 + `"每个用户最多 50 条活跃分享链接"`

**Response 200**（**完整 token 仅此一次返回**）
```ts
{
  success: true,
  data: {
    _id: string,
    scope: ShareScope,
    expiresAt: Date | null,
    hasPin: boolean,
    token: string,                // 64-char hex
    shareUrl: string,             // `${FRONTEND_URL}/share/${token}` — 后端拼好
    createdAt: Date
  }
}
```

`FRONTEND_URL` 从 env 读取（dev 默认 `http://localhost:3000`）。需要在 `backend/.env` / `backend/src/config` 中补这一项。

### 5.2 `GET /api/shares` — 列出当前用户分享

按 `createdAt desc`。**响应里不包含 token**（也不包含 `pinHash`）：

```ts
data: Array<{
  _id, scope, expiresAt, hasPin, createdAt
}>
```

> 列表不返 token 是有意的：token 一旦泄露需重新创建。Settings UI 只能"看 + 撤销"。

### 5.3 `DELETE /api/shares/:id` — 撤销

`validateId` → `Share.findOneAndDelete({ _id: id, user: req.user._id })`，找不到返回 404，成功返回 `{ success: true, message: '分享已撤销' }`。

---

## 6. 公开 API（`/api/public/shares`）

**全部端点不挂 `protect`**，但走专用限流。

### 6.1 端点表

| Method | Path | 说明 |
|---|---|---|
| GET  | `/api/public/shares/:token` | 元信息：ownerName / scope / expiresAt / requiresPin |
| POST | `/api/public/shares/:token/verify` | 校验 PIN（无 PIN 链接也允许调，直接 200） |
| GET  | `/api/public/shares/:token/blood-tests` | 受 scope.bloodTests 限定 |
| GET  | `/api/public/shares/:token/chemo-cycles` | 受 scope.chemoCycles 限定 |
| GET  | `/api/public/shares/:token/analytics?range=...` | 受 scope.analytics 限定，复用 trends + summary |

### 6.2 PIN 传递约定

- 验证后 PIN 回写在 viewer 的 `sessionStorage[`share-pin-${token}`]`（关闭页面即丢，**不**用 localStorage）
- 后续每个数据请求把 PIN 放在 HTTP header `X-Share-Pin: <pin>`
- 服务端无 session、无 cookie，每次独立校验

### 6.3 公开 controller helper

`publicShareController.ts` 内私有函数 `loadShareWithPin(req)`：

```
1. 取 req.params.token
2. Share.findOne({ token })  → null → 抛 ApiError.notFound('链接不存在')
3. share.expiresAt && share.expiresAt < now → 抛 410（自定义 ApiError，statusCode = 410）
4. 如果 share.pinHash:
     pin = req.header('X-Share-Pin')
     pin 缺失 → 401 '请输入访问密码'
     bcrypt.compare(pin, share.pinHash) === false → 401 '密码错误'
5. 返回 { share, owner: User.findById(share.user).select('firstName lastName settings') }
6. owner 不存在（理论上不会，因 deleteAccount 会级联删 share，但保留兜底）→ 404
```

每个数据接口先调 `loadShareWithPin`，再校验 `share.scope.<resource>`，否则 403。

### 6.4 错误码统一

| 情况 | HTTP | message |
|---|---|---|
| token 不存在 | 404 | `链接不存在` |
| 已过期 | 410 | `链接已过期` |
| scope 未授权 | 403 | `该资源未在此分享中开启` |
| 无 PIN / PIN 错 | 401 | `请输入访问密码` / `密码错误` |
| 限流 | 429 | `请求过于频繁` / `尝试过多，请稍后再试` |

> 后端 `ApiError` 工具类目前覆盖 400/401/403/404/409/422/500（DEVLOG）；需新增 `gone()` 静态工厂返回 410。`errorMiddleware.ts` 已支持任意 statusCode，所以只是补充工厂方法。

### 6.5 限流

新增两条，挂在 `app.ts` 中：

```ts
// /api/public/shares 整体：30 次/分钟/IP
const publicShareLimiter = rateLimit({
  windowMs: 60_000, max: 30,
  keyGenerator: (req) => req.ip,
  skip: () => isTest,
  message: { success: false, message: '请求过于频繁' }
});

// /api/public/shares/:token/verify：5 次/分钟/IP+token，跳过成功
const pinVerifyLimiter = rateLimit({
  windowMs: 60_000, max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}:${req.params.token ?? 'no-token'}`,
  skip: () => isTest,
  message: { success: false, message: '尝试过多，请稍后再试' }
});

// 注册顺序（必须先于 publicShareRoutes 挂载）
app.use('/api/public/shares', publicShareLimiter);
app.use('/api/public/shares/:token/verify', pinVerifyLimiter);
app.use('/api/public/shares', publicShareRoutes);
```

> 30/min 对正常浏览（meta 1 + verify 1 + 三个资源 = 5 个请求）有充足余地；5/min/IP+token 的 PIN verify 限流在 4 位 PIN 1 万穷尽空间下，理论穷尽时间 ≥ 33 小时（且 bcrypt 解密成本本就拖慢），足够安全。

---

## 7. 前端

### 7.1 Settings 页面 — "我的分享"区域

放在现有 **"数据"tab** 中、紧跟 `dataSharing.enabled` 总开关之后。结构：

```
┌─────────────────────────────────────────────────────────┐
│ ▣ 启用数据共享 (现有总开关)                                │
│                                                         │
│ ─── 我的分享链接 ───────────────────                    │
│                                                         │
│ [+ 创建分享链接]   ← 总开关关闭时 disabled               │
│                                                         │
│ ┌─ 分享卡片 ─────────────────────────────┐              │
│ │ 范围: 血常规、化疗周期    PIN: 已设置    │              │
│ │ 有效期: 7 天后过期 (2026-06-26 14:30)    │              │
│ │ 创建于: 2 小时前                          │              │
│ │                              [撤销]      │              │
│ └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

**创建对话框**（modal）：
- 内容勾选（至少一项）
- 有效期单选（默认 7 天）
- PIN 输入（可选，4–6 位数字）
- 提交 → 调 `POST /api/shares` → 切到"创建成功"状态显示完整 URL + 自动 `navigator.clipboard.writeText` + 文案"⚠ 此链接仅本次显示"。关 modal 后列表里不再显示完整 URL。

**撤销**：`window.confirm('撤销后链接将立即失效，无法恢复。继续？')` → `DELETE /api/shares/:id`，沿用 BloodTests / Reminders 已有的 confirm 模式。

### 7.2 viewer 页面 — `/share/:token`

注册在 `App.tsx`，**不在** `ProtectedRoute / PublicOnlyRoute` 任一包裹下：

```tsx
<Route path="/share/:token" element={<SharedView />} />
<Route path="/share/:token/expired" element={<ShareExpired />} />
<Route path="/share/not-found" element={<ShareNotFound />} />
```

**`SharedView` 状态机**：

```
mount: GET /api/public/shares/:token
  ├─ 404 → navigate('/share/not-found')
  ├─ 410 → navigate('/share/:token/expired')
  └─ 200 → setMeta(...)
            ├─ requiresPin === false → loadData()
            └─ requiresPin === true  → 渲染 PinPrompt
                                        ├─ verify 200 → sessionStorage 写 pin → loadData()
                                        ├─ verify 401 → 显示"密码错误"
                                        └─ verify 429 → 显示"尝试过多"

loadData: 按 meta.scope 并行调用三个端点（仿 Dashboard 现有的并行加载模式）
```

**布局**（按 scope 条件渲染）：
- 顶部：`<化疗血常规追踪器> {ownerName} 的健康数据 [🔒 只读视图]`
- `scope.analytics` → `<SharedAnalytics />`
- `scope.chemoCycles` → `<SharedChemoCycleList />`
- `scope.bloodTests` → `<SharedBloodTestList />`
- 底部：`链接将于 {expiresAt} 过期` 或 `链接长期有效` + footer "Powered by 化疗血常规追踪器"

**没有 Layout 组件、没有侧边栏、没有任何编辑按钮** — 视觉上与登录后的 dashboard 完全区分。

### 7.3 前端新增文件

| 文件 | 职责 |
|---|---|
| `pages/share/SharedView.tsx` | viewer 顶层状态机 |
| `pages/share/ShareExpired.tsx` | 410 错误页 |
| `pages/share/ShareNotFound.tsx` | 404 错误页 |
| `pages/share/components/PinPrompt.tsx` | PIN 输入表单 |
| `pages/share/components/SharedBloodTestList.tsx` | 只读血常规列表 + 异常红字标记 |
| `pages/share/components/SharedChemoCycleList.tsx` | 只读化疗周期列表 |
| `pages/share/components/SharedAnalytics.tsx` | 只读趋势图（可复用 Analytics 内的 Chart.js 子组件，因为它本就只读） |
| `pages/settings/components/SharesSection.tsx` | Settings "我的分享"区 |
| `pages/settings/components/CreateShareDialog.tsx` | 创建对话框 |
| `services/share/shareService.ts` | 受保护：list / create / delete |
| `services/share/publicShareService.ts` | 公开：getMeta / verify / blood-tests / chemo-cycles / analytics |
| `services/share/publicApiClient.ts` | 不带任何拦截器的干净 axios 实例（避免误带 Authorization） |

> **关键点**：`publicApiClient` 必须是**独立** axios 实例，**不能复用** `services/api/apiClient.ts`，否则会自动挂 `Authorization: Bearer ...`（如果浏览器中有登录态）。

### 7.4 受邀者已登录的边缘情况

viewer 不读 AuthContext。受邀者无论是否登录、是否是其他病人账号，都看到完全一致的只读页面。

### 7.5 contracts/index.ts 增补

```ts
export interface ShareScope {
  bloodTests:  boolean;
  chemoCycles: boolean;
  analytics:   boolean;
}

export type ShareExpiresIn = '1d' | '7d' | '30d' | '90d' | 'never';

export interface Share {
  _id: string;
  scope: ShareScope;
  expiresAt: string | null;
  hasPin: boolean;
  createdAt: string;
}

export interface ShareCreateRequest {
  scope: ShareScope;
  expiresIn: ShareExpiresIn;
  pin?: string;
}

export interface ShareCreateResponseData extends Share {
  token: string;
  shareUrl: string;
}

export type ShareListResponse = ApiResponse<Share[]>;
export type ShareCreateResponse = ApiResponse<ShareCreateResponseData>;
export type ShareDeleteResponse = ApiResponse<{ message: string }>;

export interface PublicShareMeta {
  ownerName: string;        // "张三"
  scope: ShareScope;
  expiresAt: string | null;
  requiresPin: boolean;
}

export type PublicShareMetaResponse = ApiResponse<PublicShareMeta>;
export type PublicSharePinVerifyResponse = ApiResponse<{ message: string }>;
```

---

## 8. 测试

| 层 | 文件 | 覆盖点 |
|---|---|---|
| 后端契约 | `__tests__/contracts/share.contract.test.ts` | POST/GET/DELETE 形状；公开 5 端点形状；token 字段仅在 create 响应、不在 list；401/403/410 形状 |
| 后端集成 | `__tests__/integration/share.integration.test.ts` | 创建→列表（无 token）→viewer GET（无 PIN/有 PIN ✓/PIN ✗）→撤销→viewer 404；scope 未授权 → 403；过期 → 410；50 条上限 → 422；总开关关闭 → 422；deleteAccount 级联删除；跨用户隔离；PIN 错 5 次 → 429；scope 至少一项校验 |
| 前端单元 | `pages/share/__tests__/SharedView.test.tsx` | 4 种状态：loading / PIN 表单 / 数据视图 / 错误页；PIN 错回显；过期 navigate |
| 前端单元 | `pages/settings/__tests__/Settings.test.tsx`（扩展） | 创建：scope "至少选一项"校验、PIN 4–6 位校验、成功显示完整 URL；列表渲染；撤销 confirm 二态 |
| 契约校验 | `backend/scripts/contract-validator.js` | 第 4 项：Share Model ↔ Validation ↔ contracts/index.ts |

测试预期增量：
- 后端：契约 +10 用例、集成 +20 用例 → 总 81→111 用例
- 前端：+10 用例左右 → 总 64→74 用例

---

## 9. 安全考量

| 威胁 | 缓解 |
|---|---|
| 链接被猜测 | 32 字节随机 token（2^256 空间） |
| 链接被截图 / 转发泄露 | 可选 PIN（4–6 位 + bcrypt + 5/min 限流） |
| 数据库被拖库 | PIN 用 bcrypt 哈希；token 本身就是高熵随机串 |
| viewer 端泄露分享者敏感信息 | 公开 API 只返 firstName + lastName，不返 email/性别/生日/_id |
| 受邀者越权访问未授权资源 | 每个公开数据端点先 `loadShareWithPin` 再校验 `share.scope.<resource>`，未授权 403 |
| 公开 API 被刷 | publicShareLimiter 30/min/IP；pinVerifyLimiter 5/min/IP+token + skipSuccessfulRequests |
| 链接所有者删账户后旧链接仍可看 | deleteAccount 级联删除该用户所有 Share |
| viewer 自动带上访客自己的 JWT 干扰后端 | viewer 用独立 publicApiClient，不挂任何 Authorization |

---

## 10. 工作量预估

| 模块 | 估时 |
|---|---|
| 后端 Model + 受保护 controller + 路由 + 校验 | 0.3 d |
| 后端公开 controller + token/PIN/scope 守卫 + 限流 | 0.4 d |
| 后端测试（契约 + 集成） | 0.3 d |
| contracts + contract-validator 第 4 项 | 0.1 d |
| 前端 Settings 创建/列表/撤销 + 对话框 | 0.3 d |
| 前端 viewer 页面 + 三个展示组件 + publicApiClient | 0.4 d |
| 前端测试 | 0.2 d |
| **总计** | **约 2 天**（与 DEVLOG 预估一致） |

---

## 11. 实现阶段先后

实现时建议按下列顺序，每一步都让 `npx tsc --noEmit` + 既有测试保持绿色：

1. contracts/index.ts 类型定义（先于双侧编码）
2. 后端 Share Model + 校验 + 受保护路由 + 单元/契约测试
3. 后端公开 controller + 限流 + 集成测试（重点：scope/PIN/expiresAt 守卫）
4. authController.deleteAccount 加级联删除 + 集成测试
5. contract-validator 第 4 项
6. 前端 services + Settings UI（创建/列表/撤销）+ 单测
7. 前端 viewer 页面 + 三个展示组件 + 错误页 + 单测
8. 端到端手动验证：创建 → 在隐身窗口打开 → PIN → 看到数据；撤销 → 隐身窗口刷新 → 404
9. 全量门禁：tsc / lint / 后端 jest / 前端 jest / contract:check
10. 更新 DEVLOG.md M-P4 状态为 ✅
