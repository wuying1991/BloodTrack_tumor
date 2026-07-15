# L-P2 安全审计日志 + 异常登录检测 - 设计文档

> 状态：用户已确认设计
> 日期：2026-07-15
> 关联：DEVLOG.md L-P2，预估 2 天

---

## 1. 目标

为化疗血常规追踪器增加安全审计日志，记录所有安全敏感操作，并自动检测异常登录（新 IP / 暴力破解），让用户能在 Settings 查看自己的安全日志。

不在范围内：实时邮件/推送告警、管理员审计视图、地理位置分析、数据 CRUD 审计。

---

## 2. 用户决策汇总

| # | 问题 | 决策 |
|---|---|---|
| Q1 | 审计范围 | 登录相关 + 账户安全操作 + 分享链接创建/撤销 |
| Q2 | 异常检测规则 | 新 IP 登录 + 同一 IP 连续 5 次登录失败 |
| Q3 | 用户可见性 | Settings 新增「安全日志」tab，查看最近 50 条，异常高亮 |
| Q4 | 保留策略 | 90 天，MongoDB TTL 索引自动清理 |
| Q5 | 新 IP 检测 | User model 加 `knownIps: string[]` |

---

## 3. 数据模型

### 3.1 AuditLog Model - `backend/src/models/AuditLog.ts`（新增）

```ts
interface IAuditLog extends Document {
  user: mongoose.Types.ObjectId | null;  // null = 失败登录且邮箱不存在
  action: AuditAction;
  success: boolean;
  ip: string;
  userAgent: string;
  detail?: string;          // 补充信息（如"新IP登录"、错误原因、尝试的邮箱）
  isAnomaly: boolean;
  anomalyType?: 'new_ip' | 'brute_force';
  createdAt: Date;
}

type AuditAction =
  | 'login' | 'logout' | 'register' | 'refresh_token'
  | 'forgot_password' | 'reset_password'
  | 'change_password' | 'delete_account'
  | 'share_create' | 'share_revoke';
```

**索引**：
- `{ user: 1, createdAt: -1 }` -- 用户查看自己的日志
- `{ ip: 1, action: 1, createdAt: -1 }` -- 暴力破解检测（按 IP 查最近失败登录）
- `createdAt: 1` + `expireAfterSeconds: 90 * 24 * 3600` -- TTL 自动清理 90 天

### 3.2 User Model 改动

```ts
// 新增字段
knownIps: [String]  // 用户历史登录过的 IP 列表，默认空数组
```

---

## 4. 审计事件埋点

### 4.1 记录 helper

`backend/src/utils/auditLogger.ts`（新增）：

```ts
async function recordAuditEvent(params: {
  user?: ObjectId | string | null;
  action: AuditAction;
  success: boolean;
  req: Request;
  detail?: string;
  isAnomaly?: boolean;
  anomalyType?: 'new_ip' | 'brute_force';
}): Promise<void>
```

从 `req` 提取 `ip`（`req.ip`）和 `userAgent`（`req.get('user-agent')`）。写入 AuditLog，失败时 `console.error` 但不抛出（审计日志不能阻断业务流程）。

### 4.2 埋点位置

| Controller 函数 | action | 记录时机 |
|---|---|---|
| `loginUser` | `login` | 成功和失败都记 |
| `logoutUser` | `logout` | 成功 |
| `registerUser` | `register` | 成功和失败 |
| `refreshToken` | `refresh_token` | 成功和失败 |
| `forgotPassword` | `forgot_password` | 成功（不暴露邮箱是否存在） |
| `resetPassword` | `reset_password` | 成功和失败 |
| `changePassword` | `change_password` | 成功和失败 |
| `deleteAccount` | `delete_account` | 成功 |
| `createShare` | `share_create` | 成功 |
| `deleteShare` | `share_revoke` | 成功 |

---

## 5. 异常检测逻辑

### 5.1 新 IP 登录检测（在 `loginUser` 成功路径）

```ts
const clientIp = req.ip;
if (!user.knownIps.includes(clientIp)) {
  // 标记异常
  await recordAuditEvent({
    user: user._id, action: 'login', success: true, req,
    detail: `新 IP 登录: ${clientIp}`,
    isAnomaly: true, anomalyType: 'new_ip',
  });
  user.knownIps.push(clientIp);
  await user.save();
} else {
  // 正常登录
  await recordAuditEvent({
    user: user._id, action: 'login', success: true, req,
  });
}
```

### 5.2 暴力破解检测（在 `loginUser` 失败路径）

```ts
// 登录失败（密码错误或用户不存在）
await recordAuditEvent({
  user: user?._id ?? null,  // null 如果邮箱不存在
  action: 'login', success: false, req,
  detail: user ? '密码错误' : `邮箱不存在: ${email}`,
});

// 检查同一 IP 最近 5 次 login 是否全部失败
const recentFails = await AuditLog.countDocuments({
  ip: clientIp,
  action: 'login',
  success: false,
  createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }  // 15 分钟内
});
if (recentFails >= 5) {
  await recordAuditEvent({
    user: user?._id ?? null,
    action: 'login', success: false, req,
    detail: `检测到暴力破解尝试: ${clientIp} 15 分钟内 ${recentFails} 次失败`,
    isAnomaly: true, anomalyType: 'brute_force',
  });
}
```

> 注意：现有的 `authLimiter`（5 req/min/IP，`skipSuccessfulRequests: true`）会在第 6 次请求时返回 429，阻止进一步尝试。审计日志记录前 5 次到达 controller 的失败，第 5 次触发 brute_force 标记。6 次以上被限流拦截不会到 controller，但暴力破解已被检测到。

---

## 6. API 设计

### 6.1 `GET /api/auth/audit-logs` - 查看当前用户安全日志

**挂载**：`authRoutes`，`protect` 中间件后。

**查询参数**：无（固定返回最近 50 条）。

**Response 200**：
```ts
{
  success: true,
  data: Array<{
    _id: string;
    action: string;
    success: boolean;
    ip: string;
    userAgent: string;
    detail?: string;
    isAnomaly: boolean;
    anomalyType?: string;
    createdAt: string;
  }>
}
```

> 只返回当前用户的日志（`user: req.user._id`），按 `createdAt` 降序，limit 50。

---

## 7. 前端

### 7.1 Settings 新增「安全日志」tab

在现有 Settings 的 tab 列表中新增第 4 个 tab「安全日志」，与「个人资料 / 通知 / 数据与隐私」并列。

### 7.2 AuditLogSection 组件

`frontend/src/pages/settings/components/AuditLogSection.tsx`（新增）：
- 调用 `auditLogService.getLogs()` 加载最近 50 条
- 时间线列表展示，每条显示：时间、操作类型、成功/失败、IP、详情
- 异常事件（`isAnomaly: true`）用红色背景高亮 + ⚠️ 图标
- 操作类型中文化：login->登录、logout->登出、register->注册、change_password->修改密码、delete_account->删除账户、share_create->创建分享、share_revoke->撤销分享 等

### 7.3 auditLogService

`frontend/src/services/auth/auditLogService.ts`（新增）：
```ts
getLogs(): Promise<{ success: boolean; data: AuditLogEntry[] }>
```

走现有 `apiClient`（带 Bearer）。

### 7.4 contracts / types

`contracts/index.ts` + `frontend/src/types/index.ts` 新增：
```ts
export type AuditAction = 'login' | 'logout' | 'register' | 'refresh_token'
  | 'forgot_password' | 'reset_password' | 'change_password' | 'delete_account'
  | 'share_create' | 'share_revoke';

export interface AuditLogEntry {
  _id: string;
  action: AuditAction;
  success: boolean;
  ip: string;
  userAgent: string;
  detail?: string;
  isAnomaly: boolean;
  anomalyType?: 'new_ip' | 'brute_force';
  createdAt: string;
}
```

---

## 8. 隐私考量

| 关注点 | 处理 |
|---|---|
| IP 和 userAgent 是 PII | 仅用于安全审计，用户只能看自己的日志，不暴露给其他用户 |
| 失败登录记录邮箱不存在 | detail 里记录尝试的邮箱仅用于排查，不对外（用户看不到别人的日志） |
| 审计日志不能阻断业务 | `recordAuditEvent` 内部 try/catch，失败只 console.error 不抛 |
| TTL 自动清理 | 90 天后自动删除，无需手动维护 |

---

## 9. 测试计划

### 后端测试

新增 `backend/src/__tests__/integration/auditLog.integration.test.ts`：
- 登录成功 -> 生成 login 审计日志
- 登录失败 -> 生成失败日志
- 新 IP 登录 -> isAnomaly=true, anomalyType=new_ip, knownIps 更新
- 同一 IP 5 次失败 -> 第 5 次生成 brute_force 异常日志
- 旧 IP 再登录 -> 不标记异常
- change-password / delete-account / share create/revoke 各生成对应日志
- GET /api/auth/audit-logs 只返回当前用户日志，按时间降序，limit 50
- TTL 索引存在（验证 schema 配置，不实际等 90 天）

### 前端测试

`frontend/src/pages/settings/__tests__/Settings.test.tsx` 扩展：
- 「安全日志」tab 渲染
- 切到该 tab 调用 auditLogService.getLogs
- 异常条目红色高亮

---

## 10. 工作量预估

| 模块 | 估时 |
|---|---|
| AuditLog Model + TTL 索引 | 0.2 d |
| auditLogger helper + 10 处埋点 | 0.3 d |
| 异常检测（新 IP + 暴力破解） | 0.3 d |
| GET /api/auth/audit-logs 端点 | 0.1 d |
| 后端集成测试 | 0.3 d |
| contracts/types + auditLogService | 0.1 d |
| Settings 安全日志 tab + AuditLogSection | 0.3 d |
| 前端测试 | 0.2 d |
| 全量门禁 + DEVLOG | 0.2 d |
| **总计** | **约 2 天** |
