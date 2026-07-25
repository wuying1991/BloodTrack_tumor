# 小程序高优先级问题修复设计

## 目标

修复代码审查中确认的四项高优先级问题：

1. 血常规 NEU/LYM 异常未计入后端 `isAbnormal`。
2. 月历仅加载最近 100 条记录，导致历史月份漏数据。
3. 小程序生产构建可能静默使用本机 API、空 AppID 和开发调试配置。
4. refresh token 无法按当前设备撤销，退出后旧 token 仍然有效。

本轮保持现有 REST API、MongoDB、JWT、uni-app 技术路线，不扩展无关功能。

## 一、血常规异常判定

### 设计

- 后端建立唯一的血常规参考范围常量，覆盖 WBC、RBC、HGB、PLT、NEU、LYM、CRP。
- `BloodTest` 的保存钩子使用该常量计算 `isAbnormal`。
- NEU、LYM 仍是可选字段；未填写时不参与判断。
- 小程序现有展示范围与后端范围保持一致，不改变当前阈值。

### 行为

- 任一已填写指标低于最小值或高于最大值，`isAbnormal` 为 `true`。
- 所有已填写指标均处于范围内，`isAbnormal` 为 `false`。
- 边界值视为正常。

### 测试

- 新增 NEU 偏低、NEU 偏高、LYM 偏低、LYM 偏高用例。
- 保留并验证既有必填指标及 CRP 的异常行为。
- 验证缺少 NEU/LYM 不会误判。

## 二、月历按日期范围查询

### 后端接口

为以下列表接口增加可选查询参数：

```text
startDate=<ISO8601>
endDate=<ISO8601>
```

- `GET /api/blood-tests`
- `GET /api/biochem-tests`
- `GET /api/chemo-cycles`
- `GET /api/reminders`

查询语义：

- 血常规、生化：记录日期位于闭区间 `[startDate, endDate]`。
- 提醒：`dueDate` 位于闭区间 `[startDate, endDate]`。
- 化疗周期：周期与查询区间相交，即 `startDate <= 查询结束` 且 `endDate >= 查询开始`。
- 只传一个边界时按单侧条件过滤。
- 同时传入两个边界且 `startDate > endDate` 时返回 422。
- 日期参数非法时返回 422，不执行数据库查询。
- 原有未传日期参数的列表行为保持不变。

### 小程序

- 月历加载时计算当前月第一天 00:00:00 和最后一天 23:59:59.999 的本地时间，再转换为 ISO8601。
- 四个列表请求都携带该日期范围。
- 血常规、生化、化疗周期继续使用现有分页响应，但月历会逐页读取该月全部结果，直到 `page === pages`；不再把单次 `limit=100` 当作全量。
- 月份快速切换时使用请求序号，只允许最后一次请求更新页面状态。

### 测试

- 后端分别验证区间内、区间外、边界值和非法日期。
- 化疗周期验证“完全覆盖当前月”和“部分相交当前月”。
- 小程序将月范围计算提取为纯函数，并测试跨年月份与闰年二月。

## 三、生产配置 fail-fast

### 环境规则

- 开发模式可以继续使用 `http://127.0.0.1:5001/api` 默认值。
- 生产模式必须显式提供 `VITE_API_BASE_URL`。
- 生产 API 必须使用 `https://`，否则构建失败。
- 微信生产构建必须显式提供 `VITE_WEIXIN_APP_ID`，否则构建失败。
- `manifest.json` 通过环境变量注入 AppID；开发时可使用空值或开发者工具测试 AppID。
- 生产配置启用合法域名校验，开发配置保留关闭能力。

### 页面行为

- 登录页的 API 地址和“代理绕过 127.0.0.1”提示仅在开发模式显示。
- 用户可见错误信息不再固定提示检查本机后端；开发环境保留详细本地提示，生产环境只显示通用网络提示。

### 验证

- 开发构建在现有 `.env.development` 下成功。
- 缺少生产 API 或 AppID 时，生产微信构建以非零状态失败并给出明确错误。
- 使用 HTTPS API 和测试 AppID 时生产微信构建成功。

## 四、当前设备 refresh session

### 数据模型

新增 `RefreshSession` 集合：

```text
user            ObjectId
jti             string, unique
tokenHash       string
expiresAt       Date, TTL index
revokedAt       Date | null
replacedByJti   string | null
createdAt       Date
updatedAt       Date
```

数据库只保存 refresh token 的 SHA-256 哈希，不保存明文 token。

### Token 内容

refresh JWT 包含：

```text
id      用户 ID
type    "refresh"
jti     会话唯一 ID
```

access token 保持现有结构。

### 登录与注册

- 邮箱注册、密码登录、短信登录成功后创建独立 refresh session。
- 每次登录代表一个设备会话。
- 返回格式仍为 `{ accessToken, refreshToken }`，小程序接口契约不变。

### 刷新轮换

收到 refresh token 时依次验证：

1. JWT 签名、过期时间、`type` 和 `jti`。
2. 对应 session 存在、未撤销、未过期。
3. 请求 token 的 SHA-256 哈希与 session 中的哈希一致。
4. 用户仍然存在。

验证通过后：

- 在一个数据库操作序列中撤销旧 session；
- 创建新 `jti` 和新 session；
- 记录 `replacedByJti`；
- 返回新的 token 对。

旧 token 再次使用时返回 401，不影响同一账号的其他设备。

### 当前设备退出

- 小程序调用 `/auth/logout` 时在请求体提交当前 refresh token。
- `/auth/logout` 改为由 refresh token 自身鉴权，不依赖 access token，避免 access token 过期触发自动刷新后拿旧 refresh token 撤销错误会话。
- 后端校验 token 后，只撤销对应 `jti` 的 session；无效或已撤销 token 仍返回幂等成功，避免暴露会话状态。
- 小程序发送退出请求时使用 `skipAuth`，不会触发 access token 自动刷新。
- 客户端无论退出接口成功或失败，最终都清除本地 token。
- 其他设备的 session 保持有效。

### 兼容性

上线前已签发但没有 `jti` 的旧 refresh token 不再接受，用户需要重新登录一次。

### 测试

- 登录创建 session。
- refresh 后旧 token 立即失效，新 token 可用。
- 同一用户两次登录产生两个独立 session。
- 退出设备 A 后，A 的 refresh token 失效，设备 B 仍可刷新。
- 数据库只保存 token 哈希。
- 过期或已撤销 session 返回 401。

## 错误处理与审计

- 日期查询错误沿用标准验证错误结构。
- refresh 失败统一返回鉴权错误，不向客户端暴露 session 是否存在或哈希是否匹配。
- refresh 成功、失败和退出继续写入现有审计日志。
- 不在日志中记录 refresh token、哈希或完整 `jti`。

## 非目标

- 不实现“退出所有设备”。
- 不改为微信原生登录。
- 不重做 access token 鉴权。
- 不调整医学参考范围数值，只解决前后端判定不一致。
- 不实现新的月历聚合资源；本轮通过现有四个列表接口的日期过滤完成修复。

## 完成标准

- NEU/LYM 异常能够稳定令记录整体标记为异常。
- 任意历史月份的月历结果不再受最近 100 条限制。
- 错误生产配置无法生成可误发布的小程序包。
- 退出当前设备后，其 refresh token 无法继续刷新，其他设备不受影响。
- 后端测试、契约检查、小程序类型检查和微信构建全部通过。
