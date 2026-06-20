# 开发日志 — 化疗血常规追踪器 (Chemotherapy Blood Tracker)

> 用于跟踪项目开发进度、已完成/未完成功能、质量指标。

---

## 📊 进度概览

| 维度 | 完成 | 总数 | 占比 |
|------|------|------|------|
| 后端 API 模块 | 7 / 7 | 7 | 100% |
| 后端基础设施 | 6 / 6 | 6 | 100% |
| 前端页面 | 11 / 11 | 11 | 100% |
| 后端测试 | 105 | TBD | — |
| 前端测试 | 71 | TBD | — |

**项目总进度**: █████████████████████ 99%

---

## ✅ 已完成功能

### 后端 (Backend)

| 日期 | 模块 | 内容 |
|------|------|------|
| — | Express 框架 | CORS, JSON, 路由, 健康检查 |
| — | MongoDB 连接 | Mongoose + config/db.ts |
| — | User Model | email, passwordHash, bcrypt, 嵌套 settings |
| — | BloodTest Model | wbc, rbc, hgb, plt (含 pre-save 异常值自动检测) |
| — | ChemoCycle Model | startDate, endDate, 嵌套 medications[] |
| 04-26 | Auth Controller | register, login, refresh-token, logout (JWT 双 Token) |
| 04-26 | BloodTest Controller | 完整 CRUD + 分页 + 权限校验 |
| 04-30 | ChemoCycle Controller | 完整 CRUD + 权限校验 |
| 04-30 | Auth Controller | forgot-password, reset-password |
| 04-30 | Analytics Controller | trends (趋势数据) + summary (摘要) |
| **06-18** | **Auth Controller** | **getProfile, updateProfile, updateSettings, changePassword, deleteAccount** |
| 06-18 | Reminder Controller | CRUD + upcoming (默认 7 天/最长 90 天) + complete (递归型自动滚下一周期) |
| 04-26 | Validation Middleware | Register, Login, BloodTest, Pagination, ID |
| 04-30 | Validation Middleware | ChemoCycle, ForgotPassword, ResetPassword, ProfileUpdate, SettingsUpdate |
| 06-18 | Validation Middleware | Reminder Create/Update (type/recurrence 枚举校验), ChangePassword, DeleteAccount |
| 04-26 | JWT Auth Middleware | Bearer token 解析 + 用户挂载 |
| 04-26 | Error Middleware | Mongoose/JWT/Duplicate/Validation 全覆盖 |
| 04-26 | ApiError 工具类 | 400/401/403/404/409/422/500 静态工厂 |
| 04-26 | asyncHandler | Promise catch → next() |
| 04-30 | 安全中间件 | helmet + express-rate-limit (100 req/15min/IP) |
| 04-26 | 数据契约层 | contracts/index.ts — 前后端唯一真相源 |

### 前端 (Frontend)

| 日期 | 页面/组件 | 内容 |
|------|-----------|------|
| — | React 入口 | index.tsx + Web Vitals |
| — | 路由配置 | App.tsx (ProtectedRoute + PublicOnlyRoute) |
| — | AuthContext | JWT 双 Token 自动刷新 + 30分钟无操作登出 |
| — | Layout | 侧边栏导航 + 用户信息 + 登出 |
| — | ApiClient | Axios 封装 + 拦截器 + 401 自动 refresh |
| 04-26 | Login | 登录页面 |
| 04-26 | Register | 注册页面 |
| 04-30 | ForgotPassword | 忘记密码申请页面 |
| 04-30 | ResetPassword | 重置密码页面 |
| 04-30 | Dashboard | 概览卡片 + 最近记录表 |
| — | BloodTests | 血常规CRUD |
| 04-30 | ChemoCycles | 化疗周期CRUD |
| 04-30 | Analytics | 趋势折线图 (Chart.js) + 摘要卡片 |
| 06-18 | Reminders | 提醒 CRUD + 状态/类型筛选 + 完成滚动 (递归型) |
| 06-18 | Settings | 4 功能区 (个人资料/通知/隐私/删除账户) + 修改密码内嵌表单 |

### 测试 (Tests)

| 日期 | 模块 | 内容 | 数量 |
|------|------|------|------|
| 04-26 | BloodTest 契约测试 | API 响应形状验证 | 8 |
| 04-30 | ChemoCycle 契约测试 | API 响应形状验证 | 8 |
| 04-30 | Dashboard 单元测试 | 加载/空数据/有数据/错误状态 | 10 |
| 04-30 | ChemoCycles 单元测试 | 加载/列表/编辑/删除/添加药物 | 12 |
| **04-30** | **Auth 集成测试** | **注册→登录→资料→Token→设置→重置密码→登出 全链路** | **22** |
| **06-18** | **Login 单元测试** | **渲染/会话过期提示/成功登录跳转/ApiError/未知错误/Loading 态** | **7** |
| **06-18** | **Register 单元测试** | **渲染/密码不一致/成功注册/字段错误回填/未知错误** | **5** |
| **06-18** | **BloodTests 页面测试** | **三视图切换/编辑/删除 confirm 二态/导出 loading/导出失败** | **9** |
| **06-18** | **Settings 页面测试** | **个人资料保存/Tab 切换 (通知+数据)/修改密码 5 种校验/成功/失败/退出/删除账户 5 种 (展开/取消/空密码/成功+登出/失败)** | **18** |
| **06-18** | **Reminder 契约测试** | **CRUD + upcoming + complete + 401 响应形状** | **10** |
| **06-18** | **Reminder 集成测试** | **CRUD + 校验失败 + upcoming 窗口 + 滚动周期 + 跨用户隔离** | **17** |
| **06-18** | **DeleteAccount 集成测试** | **未授权/缺密码/错误密码/成功级联删除/删除后 token 失效/跨用户隔离** | **8** |

---

## ⏳ 待完成功能

### 🔴 高优先级

| ID | 功能 | 预估 | 状态 |
|----|------|------|------|
| ~~H-P1~~ | ~~前端 Settings 页面接入后端 profile/settings API~~ | 0.5天 | ✅ |
| ~~H-P2~~ | ~~前端补充测试 (Login, Register, BloodTests, Settings)~~ | 3天 | ✅ |
| ~~H-P3~~ | ~~修改密码 (PUT /api/auth/change-password + Settings 表单)~~ | 0.5天 | ✅ |
| ~~H-P4~~ | ~~血常规 ↔ 化疗周期关联~~ | 1天 | ✅ |
| ~~H-P5~~ | ~~数据导出 (CSV / 图表 PNG)~~ | 0.5天 | ✅ |
| ~~H-P6~~ | ~~提醒系统 (Reminder Model + API + 前端)~~ | 6-8天 | ✅ |

### 🟡 中优先级

| ID | 功能 | 预估 | 状态 |
|----|------|------|------|
| ~~M-P1~~ | ~~Analytics 时间范围筛选 (1m/3m/6m/1y/全部)~~ | 0.5天 | ✅ |
| ~~M-P2~~ | ~~Analytics 图表异常区间标记~~ | 0.5天 | ✅ |
| M-P3 | Dashboard 接入提醒列表 (依赖 H-P6) | 0.5天 | ✅ |
| ~~M-P4~~ | ~~数据共享 (生成只读链接 + 撤销)~~ | 2天 | ✅ |
| M-P5 | 账户删除 (DELETE /api/auth/account, GDPR) | 0.5天 | ✅ |
| ~~M-P6~~ | ~~姓名字段重构：合并 firstName/lastName 为单一 fullName~~ | 0.5天 | ✅ |
| M-P7 | 化疗周期重新设计：方案(regimen) → 药物(含起止日期) | 2-3天 | ❌ |

> **M-P6 姓名字段重构**（2026-06-19 端到端验证发现）：
> 现状 User 模型拆 `firstName`(名) / `lastName`(姓)，但显示顺序不一致 —— Dashboard 显示「李四」(中式 姓+名)，顶部账户区显示「四 李」(西式 名+姓)。中文场景下拆分姓/名意义不大。
> 方案：合并为单一 `fullName` 字段。影响面：User Model / contracts / 前端 types / 注册页 / Settings / Dashboard / Layout / viewer ownerName / 相关测试 + 契约校验。需走 brainstorm → spec。

> **M-P7 化疗周期重新设计**（2026-06-19 端到端验证发现）：
> 现状 ChemoCycle 只有 `startDate/endDate` + 扁平 `medications[]`（名称/剂量/时间表全必填自由文本），不符合实际治疗记录习惯。
> 目标形态：
> - 化疗周期 = 一个**方案**（regimen，如「VAC方案」）+ 方案起止日期
> - 方案下挂多个**药物**，每个药物有独立的**起止日期**（哪天开始用、哪天结束）+ 剂量（**可选**，病人不一定清楚）+ 给药方式
> - 周期默认规则：开始 = 首日用药，结束 ≈ 第 22 天（21 天间隔，标准化疗周期），但**仅为参考默认**，实际可改
> - 便捷输入：新建下一周期时，默认以上一周期结束日为起点
> - 用药时间表从自由文本改为**日期选择**（给药日 multi-select 或起止日期）
> 影响面：ChemoCycle Model 重构（medications 嵌套结构 + 日期字段）、contracts、前端 ChemoCycles 页面 + 表单、契约校验、相关测试。需走 brainstorm → spec → plan。

### 🟢 低优先级

| ID | 功能 | 预估 | 状态 |
|----|------|------|------|
| L-P1 | PWA 离线支持 | 3天 | ❌ |
| L-P2 | 安全审计日志 (异常登录检测) | 2天 | ❌ |
| ~~L-P3~~ | ~~CI/CD + Docker~~ | 3天 | ✅ |
| L-P4 | E2E 测试 (Cypress) | 3天 | ❌ |
| L-P5 | i18n / 国际化 (i18next) | 2天 | ❌ |
| L-P6 | axios 升级到 1.x (CVE) | 0.1天 | ✅ |
| L-P7 | JWT secret fallback 启动校验 (生产环境强制 env) | 0.1天 | ✅ |
| L-P8 | 登录端点单独限流 (5/min vs 全局 100/15min) | 0.2天 | ✅ |

---

## 🧪 质量门禁

| 检查项 | 命令 | 状态 |
|--------|------|------|
| 后端 TypeScript 编译 | `cd backend && npx tsc --noEmit` | ✅ 通过 |
| 前端 TypeScript 编译 | `cd frontend && npx tsc --noEmit` | ✅ 通过 |
| 前端 ESLint | `cd frontend && npm run lint` | ✅ M-P4 新增/改动 0 错误 (旧 prettier CRLF 噪声依旧) |
| 后端契约测试 | `cd backend && npm run test:contract` | ✅ 33/33 |
| 后端集成测试 | `cd backend && npx jest --testPathPatterns='integration'` | ✅ 64/64 |
| 后端全部测试 | `cd backend && npx jest` | ✅ 105/105 |
| 前端单元测试 | `cd frontend && npm test` | ✅ 71/71 |
| 契约一致性检查 | `cd backend && npm run contract:check` | ✅ 4/4 |

---

## 📅 变更日志

### 2026-06-20（L-P3 CI/CD + Docker）
- **GitHub Actions CI** (`.github/workflows/ci.yml`)：push main + PR 触发，两个 job 并行：
  - backend: `tsc --noEmit` + `npm run contract:check` + `jest`
  - frontend: `tsc --noEmit` + `npm run lint` + `react-scripts test`
  - 用 `npm ci` + `actions/setup-node` 的 npm 缓存加速
- **backend Dockerfile**：多阶段构建（builder 跑 `tsc` 编译到 dist/ → runner 只装生产依赖，非 root 用户运行）
- **frontend Dockerfile + nginx.conf**：多阶段构建（builder 跑 `npm run build` → nginx:alpine 托管静态文件），nginx 配 SPA fallback（`try_files $uri /index.html`）让 React Router 接管路由 + static 长缓存 + gzip
- **docker-compose.yml**：mongo + backend + frontend 三服务
  - mongo:7 带 healthcheck（`mongosh --eval ping`），backend 等 mongo 健康后才启动
  - backend 注入 `MONGODB_URI=mongodb://mongo:27017/bloodtrack` + `JWT_SECRET` / `FRONTEND_URL` 等环境变量（生产 secret 通过宿主 `.env` 注入，默认值仅占位）
  - frontend 通过 build arg `REACT_APP_API_URL` 注入后端地址
  - `mongo_data` volume 持久化数据
- **DEPLOY.md**：本地 Docker 一键启动 + 生产部署指南（env 配置 / 反向代理 / 架构图）
- **未本地验证 docker build**：本地未装 Docker Desktop，配置正确性靠语法校验 + CI 实跑；首次 push 到 GitHub 后 CI 会验证 yml

### 2026-06-20（M-P6 姓名字段重构 + 端到端验证修复）
- **M-P6 姓名字段重构**：User Model 的 `firstName` + `lastName` 合并为单一 `fullName`，消除中文场景下显示顺序不一致（Dashboard 显示「李四」姓+名 vs Layout 顶部「四 李」名+姓）。决策：直接替换旧字段（不保留兼容），注册页两个输入框合并为一个「姓名」框，viewer ownerName 直接用 fullName。
- **后端改动**：
  - `User.ts` Model: `firstName/lastName` → `fullName` (required, trim)
  - `contracts/index.ts`: `AuthUser/RegisterRequest/User` 三处改 fullName
  - `validationMiddleware.ts`: `validateRegister` / `validateProfileUpdate` 改 fullName 校验
  - `authController.ts`: register/login/getProfile/updateProfile 四处响应改字段
  - `publicShareController.ts`: owner 查询 `select('fullName')`，ownerName 直接用 `owner.fullName`（不再拼接）
- **前端改动**：
  - `types/index.ts` + `authService.ts`: User/RegisterData/AuthResponseData 改 fullName
  - `Register.tsx`: 两个输入框（名字/姓氏）合并为一个「姓名」框
  - `Settings.tsx`: formFirstName/formLastName → formFullName，表单合并
  - `Layout.tsx`: 顶部用户名 `{user.fullName}`（不再名+姓拼接）
  - `Dashboard.tsx`: 欢迎语 + 统计卡用 `user.fullName`（不再 lastName+firstName）
- **测试修复**：8 个后端测试（4 contract + 4 integration）+ 5 个前端测试（Login/Register/Dashboard/ChemoCycles/Settings）的 mockUser 和断言全部改 fullName
- **质量门禁**: 后端 tsc ✅ / contract:check 4/4 ✅ / 后端 jest 105/105 ✅ / 前端 tsc ✅ / 前端 jest 71/71 ✅

### 2026-06-19（M-P4 端到端验证修复）
- **User Model dateOfBirth/gender 改可选**：原为 required，但注册页 UI 和校验中间件都标 optional，导致注册必 422。三处对齐。
- **dev 限流放宽**：全局限流 `NODE_ENV=development` 时 100→2000/15min，避免本地联调撞 429。生产仍 100。
- **`.prettierrc` 加 `endOfLine: auto`**：Windows `core.autocrlf=true` 让 checkout 出 CRLF，prettier 报全文件错误卡死 dev server。`endOfLine:auto` 接受现有行尾。
- 新增 M-P6 / M-P7 待办（来自端到端验证产品反馈）。

### 2026-06-19（M-P4 数据共享只读链接）
- **后端 Model**: `Share.ts` — `user(ref)/token(64-hex unique)/pinHash(bcrypt nullable)/scope{bloodTests,chemoCycles,analytics}/expiresAt(nullable)`，pre-validate 至少一项 scope；索引 `{token unique}` + `{user, createdAt:-1}`
- **受保护 API** (`/api/shares`，`protect` 中间件):
  - `POST` — 业务前置（总开关 → 403 forbidden / <50 上限 → 409 conflict）+ 32-byte token + bcrypt PIN(cost 10) + 一次性返回 `{token, shareUrl}`
  - `GET` — 列表通过 `publicView()` 剔除 token / pinHash
  - `DELETE /:id` — `findOneAndDelete({_id, user})` 硬撤销，跨用户隔离 → 404
- **公开 API** (`/api/public/shares`，无 JWT):
  - `GET /:token` — 元信息：ownerName(`firstName lastName`) + scope + expiresAt + requiresPin（owner 仅 `select('firstName lastName')`，不暴露 email/_id/dateOfBirth）
  - `POST /:token/verify` — bcrypt PIN 校验，无 PIN 链接直接成功
  - `GET /:token/{blood-tests, chemo-cycles, analytics}` — 共享 helper `loadShareWithPin(req)` → 校验 token+expiresAt+PIN → 校验 `share.scope.<resource>` 否则 403；PIN 通过 `X-Share-Pin` header 传递
  - 错误码: 404 / 410 / 403 / 401，新增 `ApiError.gone()` 静态工厂
  - 限流: 整体 30/min/IP，`/verify` 端点 5/min/IP+token (skipSuccessfulRequests)，用 `ipKeyGenerator` 归一化 IPv6
- **deleteAccount 级联**: 加 `Share.deleteMany({user})`，response data 加 `shares: deletedCount`
- **contracts/index.ts** 新增: `ShareScope/ShareExpiresIn/Share/ShareCreateRequest/ShareCreateResponseData/ShareListResponse/ShareCreateResponse/ShareDeleteResponse/PublicShareMeta/PublicShareMetaResponse/PublicSharePinVerifyResponse`（11 个 export，前端 `types/index.ts` 镜像）
- **contract-validator.js**: 加第 4 项 — Share Model / validateShareCreate / 前端 types 三处对齐校验，报告从 3/3 升级到 4/4
- **前端 services**:
  - `publicApiClient.ts`：干净 axios 实例（不挂任何拦截器），避免登录用户在 viewer 页误带 Authorization
  - `shareService.ts`：受保护，走 apiClient（含 Bearer 自动刷新）
  - `publicShareService.ts`：公开，走 publicApiClient；`pinHeader(pin)` helper 把 PIN 放进 X-Share-Pin header
- **前端 Settings**: 数据 tab 新增 `<SharesSection sharingEnabled={dataSharing.enabled} />`
  - `SharesSection`：列表 + 撤销 confirm 二态 + 总开关 disabled tooltip 提示
  - `CreateShareDialog`：scope 至少一项校验 / PIN 4-6 位校验 / 一次性显示完整 URL + `navigator.clipboard.writeText` 自动复制 + "仅本次显示" 警告
  - `CreateShareDialog.css` 提供 `.modal-backdrop` / `.modal` 全局样式
- **前端 viewer**: 公开路由 `/share/:token`、`/share/:token/expired`、`/share/not-found`（不在 ProtectedRoute / PublicOnlyRoute 包裹下）
  - `SharedView.tsx` 状态机：`loading → meta-error / pin / data` 4 phase；GET meta → 404→/not-found / 410→/:token/expired / 其他→meta-error；PIN 走 sessionStorage 缓存 `share-pin-${token}`（关页即丢）；按 scope 并行加载 3 资源；try-catch-finally 让加载失败也进 data phase（防止永久转圈）
  - 4 个展示组件：`PinPrompt`（4-6 位数字 + 429 提示）/ `SharedBloodTestList`（异常红字行）/ `SharedChemoCycleList` / `SharedAnalytics`（数值表 + 摘要，**不引入 Chart.js** 减小 viewer 包体）
  - `SharedView.css` 通用样式 + `.shared-blood-row.is-abnormal` 异常红字
  - 错误页 `ShareNotFound` / `ShareExpired`
- **测试**:
  - 后端契约 +6（创建响应形状 / 总开关 403 / scope 全 false 422 / pin 非数字 422 / 列表无 token / 删除 + 401）
  - 后端集成 +18（受保护 5：CRUD/总开关 403/50 上限 409/跨用户隔离/never；公开 12：meta 200/404/410/不泄露敏感字段, verify 无 PIN/正确 PIN/错误 PIN, blood-tests 无 PIN/缺 header 401/正确 header, chemo-cycles scope 403, analytics trends+summary, deleteAccount 级联 → 旧 token 404）
  - 前端 SharedView +6 用例（无 PIN/有 PIN/正确 PIN/错误 PIN/404/410）
  - 前端 Settings 扩展 +1（总开关关闭 → 创建按钮 disabled）
- **修正**:
  - Spec 业务前置错误码：原写 422，review 改为 403（forbidden, 已认证但状态阻止）+ 409（conflict, 与现有资源冲突），422 专留给字段校验
  - Share Model `token: { unique: true }` 删除冗余 `index: true`（unique 已隐含）
  - `pinVerifyLimiter` keyGenerator 用 `ipKeyGenerator` 归一化 IPv6（修 ERR_ERL_KEY_GEN_IPV6 警告）
  - SharedView loadData try-catch-finally 让失败也 setPhase('data')
  - CreateShareDialog 的 `modal-backdrop`/`modal` class 之前没 CSS 定义，新建 CreateShareDialog.css
- **质量门禁**: tsc 双侧 ✅、contract:check 4/4 ✅、后端 jest 105/105 ✅、前端 jest 71/71 ✅、M-P4 新增/改动文件 ESLint 0 错误（项目其它历史 prettier CRLF 噪声不变）
- **未覆盖**：端到端手动验证（需要本地 MongoDB 启动），自动化 145+ 用例已覆盖完整链路

### 2026-06-18（第三轮：M-P5 账户删除 + L-P6/P7/P8 安全加固 + CLAUDE.md）
- **M-P5 账户删除前端**: Settings.tsx 新增"危险区域"区域 — 初始按钮"删除我的账户"，点击后展开确认表单（密码输入 + "确认删除"/"取消"），空密码客户端拦截，成功删除后自动 logout，ApiError 显示后端 message
- **Settings 测试扩展 (13→18)**: 删除账户 5 用例 — 展开确认表单、取消关闭并清空输入、空密码校验、成功调 deleteAccount + logout、ApiError 显示 message 不登出
- **L-P6 axios**: `frontend/package.json` 已升级 `^1.18.0`（CVE 修复）
- **L-P7 JWT secret 校验**: `backend/src/config/secrets.ts` — 生产环境 env 必须 ≥16 字符否则进程崩溃；开发/测试每次随机生成（进程级，代码里不再有硬编码 fallback）
- **L-P8 登录端点限流**: `app.ts` — 登录/注册/忘记密码/重置密码 4 个端点单独 5/min，`skipSuccessfulRequests: true`（成功登录不计入），全局限流 100/15min，测试环境全跳过
- **Dashboard 提醒集成** (M-P3): Dashboard.tsx 含"即将到期的提醒"区域，并行加载血常规 + 提醒，提醒失败不影响主数据；显示相对日期（今天/明天/N天后/已过期）
- 新建 `CLAUDE.md`：项目架构、常用命令、路由顺序注意事项、测试模式、数据契约说明
- 质量门禁: 后端 tsc ✅、前端 tsc ✅、后端 81/81 ✅、前端 64/64 ✅、契约 3/3 ✅、ESLint 0

### 2026-06-18（第二轮：H-P6 提醒系统）
- **后端 Model**: `Reminder.ts` — `user(ref)/title(≤120)/description(≤1000)/type(enum)/dueDate/recurrence(none|daily|weekly|monthly)/enabled/completed/notifications{email,push}/lastTriggeredAt`，`{user, dueDate}` 复合索引
- **后端 Controller** (`reminderController.ts`):
  - `GET /api/reminders?status=pending|completed&type=...` — 列表 (按 dueDate 升序)
  - `GET /api/reminders/upcoming?days=7` — 即将到期 (默认 7 天，最长 90 天，仅 enabled+未完成)
  - `POST /api/reminders` / `GET|PUT|DELETE /api/reminders/:id` — CRUD
  - `PATCH /api/reminders/:id/complete` — 一次性 → completed=true；递归型 → 滚动 dueDate (`daily +1d / weekly +7d / monthly setMonth+1`)，保留 enabled 让下一周期继续触发
  - PUT 路径剥掉 body 里的 `user` 字段防越权
- **路由顺序**: `/upcoming` 必须在 `/:id` 前注册（避免被 validateId 拦截）；`PATCH /:id/complete` 复用 validateId
- **Validation**: `validateReminderCreate` (title 必填+长度，dueDate 必填 ISO8601，type/recurrence 枚举，notifications.* 布尔)，`validateReminderUpdate` 全字段 optional
- **Contracts**: `contracts/index.ts` 新增 `Reminder / ReminderType / ReminderRecurrence / ReminderCreateRequest / ReminderUpdateRequest / ReminderListResponse / ReminderResponse / ReminderDeleteResponse`
- **后端测试**:
  - 契约 10 用例：POST/GET 列表/upcoming/GET-by-id/PUT/PATCH-complete/DELETE/401
  - 集成 17 用例：未授权 / 字段校验 (3) / CRUD (6) / 完成一次性 vs weekly 滚动 (2，验证 +7d=604800000ms) / upcoming 7 天默认窗口 + 90 天扩展 + disabled 排除 (2) / 跨用户隔离 (3)
- **前端 service**: `services/reminder/reminderService.ts` — 含 `getReminders(filter) / getUpcoming(days) / get / create / update / complete / delete`
- **前端页面**: `pages/reminders/Reminders.tsx` — list/add/edit 三视图；状态+类型 chip 筛选；卡片显示 类型 chip + 循环 chip + 到期时间（过期自动红色高亮）；递归型按钮文案"完成本次"，一次性"完成"；Form 含到期 datetime-local + 邮件/推送 checkbox；ApiError 字段级回填到 formErrors
- **路由 + 侧边栏**: App.tsx 加 `/reminders`，Layout.tsx 在 数据分析 与 设置 之间加导航入口
- 质量门禁: 后端 73/73 ✅、前端 56/56 ✅、tsc 双侧 ✅、新文件 ESLint 0 错误、契约校验 3/3 ✅

### 2026-06-18（H-P2 前端测试补全）
- **Login (7 用例)**: 字段渲染、`?expired=1` 会话过期提示、登录成功 → useNavigate('/dashboard') + AuthContext.login、ApiError 显示后端 message、未知错误兜底文案、loading 期按钮禁用
- **Register (5 用例)**: 字段渲染、客户端"两次密码不一致"短路、成功注册、ApiError.errors 字段级回填、未知错误
- **BloodTests 页面 (9 用例)**: list/add/edit 视图切换、编辑入口、删除流 confirm true/false 二态、删除失败 alert ApiError.message、导出按钮 loading 文案、导出失败 alert
  - 用 jest.mock 把 `BloodTestList` / `BloodTestForm` 桩成最小假组件，专注页面级编排（不重测子组件的 fetch 路径）
- **Settings 页面 (13 用例)**: profile 表单预填+只读邮箱、保存成功 toast、保存失败 toast、Tab 切换到通知/数据并保存、修改密码 5 种客户端校验（不一致/太短/缺大小写数字/与旧相同/缺位）、成功修改密码、ApiError 显示后端 message、退出登录
  - 关键坑: `useAuth` mock 的 user 对象要 hoist 成模块级常量，否则 `useEffect([user])` 引用变化触发无限渲染
  - Settings.tsx 的密码 `<label>` 没有 `htmlFor`，`getByLabelText` 不工作，改用 form 内 `querySelectorAll('input[type=password]')` 按位置取
- 前端测试 22 → 56，6 个 suite 全绿
- 已知遗留: `core.autocrlf=true` 让 prettier 在 Windows checkout 后报 CRLF 错（与本次改动无关，整个 working tree 都报）

### 2026-06-17（第二轮：Analytics 增强 + CSV 导出）
- **M-P1 时间范围筛选**: `GET /api/analytics/trends?range=1m|3m|6m|1y|all`，前端 chip 切换；默认 3 月
- **M-P2 图表异常标记**: 上下限红色虚线参考 dataset；超出范围的点用红色 + 加大半径；Tooltip 显示 高/低 标签；不引入 annotation 插件
- **H-P5 数据导出**:
  - 后端: `GET /api/blood-tests/export?format=csv`，UTF-8 BOM + CRLF + CSV 注入防护（`= + - @` 前置单引号），输出含周期日期、药物、是否异常等 11 列
  - 前端: `apiClient.download()` 复用拦截器（auth + 自动刷新 token），blood-tests 页面"⬇ 导出 CSV"按钮；Analytics 页面 chart.js `toBase64Image()` "📷 导出图表" 按钮
- 顺手修复: BloodTests 删除函数动态 import → 直接 import；Login/Register 之外的所有 `any` 警告清理
- 路由顺序: `/blood-tests/export` 必须在 `/:id` 之前，否则被 `validateId` 拦截
- 全部测试 46/46，契约 3/3，前端 lint 0 错误

### 2026-06-17（第一轮：DEVLOG 修正 + 修改密码 + 周期关联）
- **DEVLOG 修正**: H-P1 (Settings 接入后端) 标记为已完成，与代码现状对齐
- **H-P3 修改密码**:
  - 后端: `PUT /api/auth/change-password` + `validateChangePassword` + 集成测试 8 用例 (新旧密码相同/弱密码/不一致/错误密码/未授权/成功/旧密码失效/新密码登录)
  - 前端: `authService.changePassword`，Settings 页面账户操作区改为可展开内嵌表单（替换原死按钮）
- **H-P4 周期关联**:
  - Model: `BloodTest.chemoCycleId` (可选 ObjectId, ref ChemoCycle)
  - Controller: 新建/更新时若未显式传 chemoCycleId 则按 date 自动落入对应周期；显式 null 解除关联
  - Validation: chemoCycleId 接受 24-hex / null / 空
  - Contracts: contracts/index.ts、frontend types、contract-validator.js 三处同步
  - 前端: BloodTestForm 加"自动按日期匹配 / 不关联 / 选择周期"下拉；BloodTestList 加"关联周期"列
- 集成测试 22→30，全部测试 38→46 全绿；契约校验 3/3 通过

### 2026-04-30（今天第二轮）
- **B1**: 实现用户资料 API (GET/PUT /api/auth/profile)
- **B2**: 实现设置 API (PUT /api/auth/settings)
- **B3**: 编写 Auth 全链路集成测试 (22 用例)
- 从计划中移除数据导出功能
- 后端 API 模块 5/5 全部完成

### 2026-04-30（今天第一轮）
- **H-4**: 安装 helmet + express-rate-limit，完成安全中间件补全
- **H-1**: 实现密码重置完整链路
- **H-3**: 新增 analyticsController (GET /api/analytics/trends + summary)
- **H-2**: 安装 chart.js + react-chartjs-2，重写 Analytics 页面
- 更新 README.md

### 2026-04-26
- 完成 contracts/index.ts 数据契约层
- 前后端 22 处数据不一致全部修复
- 编写 BloodTest 契约测试 (8 用例)
- 第一次进度审查报告

---
*最后更新: 2026-06-20*
