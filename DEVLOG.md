# 开发日志 — 化疗血常规追踪器 (Chemotherapy Blood Tracker)

> 用于跟踪项目开发进度、已完成/未完成功能、质量指标。

---

## 📊 进度概览

| 维度 | 完成 | 总数 | 占比 |
|------|------|------|------|
| 后端 API 模块 | 6 / 6 | 6 | 100% |
| 后端基础设施 | 6 / 6 | 6 | 100% |
| 前端页面 | 10 / 10 | 10 | 100% |
| 后端测试 | 73 | TBD | — |
| 前端测试 | 56 | TBD | — |

**项目总进度**: ████████████████████░ 96%

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
| M-P4 | 数据共享 (生成只读链接 + 撤销) | 2天 | ❌ |
| M-P5 | 账户删除 (DELETE /api/auth/account, GDPR) | 0.5天 | ✅ |

### 🟢 低优先级

| ID | 功能 | 预估 | 状态 |
|----|------|------|------|
| L-P1 | PWA 离线支持 | 3天 | ❌ |
| L-P2 | 安全审计日志 (异常登录检测) | 2天 | ❌ |
| L-P3 | CI/CD + Docker | 3天 | ❌ |
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
| 前端 ESLint | `cd frontend && npm run lint` | ✅ 0 错误 |
| 后端契约测试 | `cd backend && npm run test:contract` | ✅ 26/26 |
| 后端集成测试 | `cd backend && npx jest --testPathPatterns='integration'` | ✅ 47/47 |
| 后端全部测试 | `cd backend && npx jest` | ✅ 81/81 |
| 前端单元测试 | `cd frontend && npm test` | ✅ 64/64 |
| 契约一致性检查 | `cd backend && npm run contract:check` | ✅ 3/3 |

---

## 📅 变更日志

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
*最后更新: 2026-06-18*
