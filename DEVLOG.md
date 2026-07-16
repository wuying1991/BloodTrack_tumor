# 开发日志 — 化疗血常规追踪器 (Chemotherapy Blood Tracker)

> 用于跟踪项目开发进度、已完成/未完成功能、质量指标。

---

## 📊 进度概览

| 维度 | 完成 | 总数 | 占比 |
|------|------|------|------|
| 后端 API 模块 | 7 / 7 | 7 | 100% |
| 后端基础设施 | 6 / 6 | 6 | 100% |
| 前端页面 | 11 / 11 | 11 | 100% |
| 后端测试 | 122 | 122 | ✅ 全绿 |
| 前端测试 | 77 | 77 | ✅ 全绿 |
| E2E 测试 | 12 | 12 | ✅ 全绿 (Playwright) |

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
| ~~M-P7~~ | ~~化疗周期重新设计：方案(regimen) → 药物(含起止日期)~~ | 2-3天 | ✅ |
| ~~M-P8~~ | ~~AuthContext 启动 refreshToken 超时兜底（避免无限 loading）~~ | 0.3天 | ✅ |

> **M-P8 AuthContext 启动超时兜底**（2026-06-23 Docker 验证发现）：
> 现状 `AuthContext` 启动时若 localStorage 有旧 token 会调 `refreshToken` API 验证；如果网络层挂掉（代理拦截、后端无响应、超时），请求永远 pending，应用永远显示「加载中」，用户体验差且无法自救（只能 F12 清 localStorage）。
> 方案：给启动期的 token refresh 加 timeout（如 10s），失败则视作未登录、清 token、跳登录页。同时 `apiClient` 的 axios 实例增加 `timeout` 默认值兜底其它请求。需走小型 brainstorm。

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
| ~~L-P1~~ | ~~PWA 离线支持~~ | 3天 | ✅ |
| ~~L-P2~~ | ~~安全审计日志 (异常登录检测)~~ | 2天 | ✅ |
| ~~L-P3~~ | ~~CI/CD + Docker~~ | 3天 | ✅ |
| ~~L-P4~~ | ~~E2E 测试 (Playwright，原 Cypress)~~ | 3天 | ✅ |
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
| 后端契约测试 | `cd backend && npm run test:contract` | ✅ 34/34 |
| 后端集成测试 | `cd backend && npx jest --testPathPatterns='integration'` | ✅ 72/72 |
| 后端全部测试 | `cd backend && npx jest` | ✅ 122/122 |
| 前端单元测试 | `cd frontend && npm test` | ✅ 77/77 |
| 契约一致性检查 | `cd backend && npm run contract:check` | ✅ 5/5 |

---

## 📅 变更日志

### 2026-07-16（L-P4 E2E 测试 - Playwright）
- **工具决策**：DEVLOG 原写 Cypress，实际改用 **Playwright**。理由：本会话已用 Playwright + 系统 Edge 验证 PWA 离线（`setOffline`/`fromServiceWorker` 对 PWA 应用更合适），零额外浏览器依赖。已回写待办表 L-P4 行。
- **结构**：新建顶层 `e2e/` 包（独立 `package.json`/`tsconfig`，与前端 CRA / 后端 jest 解耦）。`playwright.config.ts`（baseURL :3000、chromium、workers 1、60s 超时、html+list 报告）；`helpers/api.ts`（注册/建血常规/建分享/开数据共享，唯一邮箱隔离）；`fixtures/auth.ts`（`authenticatedPage` fixture：API 注册 + 注入 4 个 localStorage key 实现确定性登录，`beforeEach` 屏蔽 Google Fonts）；`run.sh`（建栈+等健康+跑测试+拆栈）。
- **12 个用例**：auth（注册/登录/错密码/登出 4）、blood-tests CRUD（增/异常标记/改/删 4）、share（viewer 无 PIN 跨 fresh context / Settings UI 创建 2）、offline（离线 reload 缓存回源+指示器 / 断网指示器 2）。全链路 `run.sh` 实跑 16.3s 全绿。
- **顺带修一个应用 bug**：E2E 发现错密码登录时 `apiClient` 的 401 拦截器把所有 401 当「token 过期」处理 -> 无 refreshToken（未登录态）时重定向 `/login?expired=1` 显示「会话已过期」而非「邮箱或密码错误」。修复：无 refreshToken 时直接抛原始错误给调用方（Login 表单显示正确错误），不重定向。前端 tsc ✅、jest 77/77 ✅。
- **E2E 基础设施**：后端 `app.ts` 加 `RATE_LIMIT_DISABLED` env 开关（E2E 单 IP 高并发+CI 重试会打爆 100/15min 全局限流）；`e2e/docker-compose.e2e.yml` override 设置该开关；`run.sh` 用 `docker compose -f docker-compose.yml -f e2e/docker-compose.e2e.yml up --build`。`fixtures/auth.ts` beforeEach 屏蔽 Google Fonts（跨源、慢网络下挂起拖慢 page load 事件）。
- **CI**：`.github/workflows/ci.yml` 加 `e2e` job（`npm ci` + `playwright install --with-deps chromium` + `bash e2e/run.sh` + 失败上传 `playwright-report` artifact）。GitHub runner 自带 Docker、Docker Hub 可达。
- **质量门禁**：E2E 12/12 ✅、后端 tsc ✅ + jest 122/122 ✅、前端 tsc ✅ + jest 77/77 ✅ + lint 0 错误、e2e tsc ✅。
- **未做**：未在真实 GitHub Actions 跑过 e2e job（本机无 push 权限验证），配置语法靠本地 `run.sh` 实跑验证；首次 push 后 CI 会实跑。

### 2026-07-16（L-P1 PWA 离线支持收尾）
- **Service Worker** (`public/sw.js`)：自定义 SW，零额外依赖。install 缓存 app shell（`/`、`/index.html`、`/manifest.json`）+ `skipWaiting`；activate 清旧缓存 + `clients.claim`；fetch 分流——同源 GET 才处理，`/api/` 走 network-first（失败回退缓存，成功响应 clone 入缓存），静态资源走 cache-first 回退网络。
- **SW 注册** (`src/index.tsx`)：仅 `production` 注册（CRA dev server HMR 与 SW 冲突），`load` 事件后 `navigator.serviceWorker.register('/sw.js')`。
- **Manifest** (`public/manifest.json`)：`start_url: /`、`display: standalone`、`theme_color: #2563eb`、`background_color: #f8f9fa`；图标用单一 `icon.svg`（`sizes: "any"` + `purpose: "any maskable"`）。
  - **偏离 spec §4**：原计划放 `logo192.png` / `logo512.png` 占位 PNG，实际改用 SVG。理由：现代 Chrome 接受 SVG 即可满足可安装性，零二进制文件，用户后续会换真 logo。取舍：iOS Safari 对 SVG 图标支持弱、Lighthouse PWA 可安装审计倾向 PNG 192+512，后续如需再补。已回写 spec §4。
- **离线指示器** (`components/common/OfflineIndicator.tsx`)：监听 `window` 的 `online`/`offline` 事件，断网时顶部黄色提示条「⚠️ 您当前处于离线状态，仅可查看已缓存的数据」。
  - **修复既存 bug**：PWA 提交 (`390971b`) 只在 `Layout.tsx` 加了 `import OfflineIndicator`，**从未在 JSX 渲染 `<OfflineIndicator />`**，导致组件不生效且 lint 报 `no-unused-vars`。本次在 `<div className="layout">` 内、`<header>` 之前补上渲染（spec §5.2）。
- **测试**：新增 `OfflineIndicator.test.tsx` 3 用例（联网不渲染 / 断网渲染提示 / 恢复联网后消失），dispatchEvent 用 `act()` 包裹确保状态 flush。
- **顺手修既存 lint**：`npm run lint:fix` 修掉 `AuditLogSection.tsx` / `Settings.tsx` / `index.tsx` 的 prettier 格式错误（长行未折行 + `arrowParens`），lint 从 10 errors 降到 0 errors（剩 15 个既存 `no-explicit-any` 警告，exit 0）。
- **质量门禁**：前端 tsc ✅ / lint 0 错误 / jest 77/77（74+3）✅；后端 tsc ✅ / jest 122/122 ✅。
- **Docker 验证（2026-07-16 补，原「未做」项）**：用户装好 Docker Desktop + WSL 后补验。本机 Docker Hub 不通（国内网络），改从 DaoCloud 镜像 (`docker.m.daocloud.io`) 拉取 `mongo:7` / `node:20-alpine` / `nginx:alpine` 三张基础镜像并 `docker tag` 回标准名，compose / Dockerfile `FROM` 无需改动即可本地解析。
  - **首次本地构建成功**（此前 DEVLOG 多次标注「未本地验证 docker build」）：`docker compose up --build -d` 三服务全部 Up，mongo healthy，backend 日志「MongoDB Connected Successfully / Server running in production mode on port 5000」。
  - **服务端可程序化验证项（全部 ✅）**：① `/api/health` 200；② 前端 `/` 200 (text/html)；③ **`/sw.js` 200 且 MIME=`application/javascript`**（SW 注册必需，1811 字节）；④ `/manifest.json` 200 (application/json)，`start_url:/` + `display:standalone` + `theme_color:#2563eb` + `icon.svg` `any maskable`；⑤ `/icon.svg` 200 (image/svg+xml)；⑥ SPA fallback：`/dashboard` 等深路径回退 index.html 200；⑦ 生产 JS bundle 含 SW 注册代码（`serviceWorker in navigator` 守卫 + `load` 事件 + `register("/sw.js").catch(...)`）；⑧ 全链路 API：注册(签发 JWT) -> 建血常规(`isAbnormal` 自动判定生效) -> 列表(带分页) -> 登录 -> 无 token 401；⑨ **中文 UTF-8 完整性**：`fullName:"张三丰"` 以 UTF-8 文件 `--data-binary @file` 发送，响应字节原样回显 `e5bc a0e4 b889 e4b8 b0`，DB 存储无损（inline `-d` 中文在 Git Bash/中文 Windows 下会被本地代码页破坏，属测试工具链问题非应用 bug）。
  - **spec §6 浏览器点验（2026-07-16 Playwright 自动化）**：在隔离临时目录装 Playwright（npmmirror 源，跳过浏览器下载），用系统自带 Edge（`channel:'msedge'`）headless 驱动。API 注册账号 + 注入 localStorage（`authToken/refreshToken/user/tokenExpiry`）实现确定性登录（`apiClient` 直接读 `localStorage.authToken`，无需 UI 表单）。结果：
    - ✅ **SW 注册并激活**：scope `http://localhost:3000/`，state `activated`，`navigator.serviceWorker.controller=true`。
    - ✅ **离线 app shell 由 SW 缓存回源**：断网 reload `/blood-tests`，文档请求 `response.fromServiceWorker()=true`，页面渲染出完整外壳（侧边栏 仪表板/血常规记录/化疗周期/数据分析/提醒管理/设置 + 用户名 + 登出）。
    - ✅ **离线指示器渲染**：`.offline-indicator` 出现，文案「⚠️ 您当前处于离线状态，仅可查看已缓存的数据」。
    - ❌ **离线 API 数据未缓存**：`http://localhost:5000/api/blood-tests?page=1&limit=10` 断网后 `net::ERR_INTERNET_DISCONNECTED`，列表区显示「Network error. Please check your connection. 重试」。
  - **根因（重要发现）**：`sw.js` fetch handler 显式只处理同源 GET（`url.origin !== self.location.origin` 直接 return）。Docker standalone 部署前端 `:3000`、后端 `:5000` 跨源，bundle 内 `REACT_APP_API_URL=http://localhost:5000/api`，故 SW 从不拦截/缓存 API 响应（在线时 `api.fromServiceWorker()=false` 亦印证）。结果：离线只有 app shell 可用，API 数据全部失败。生产部署走反向代理（DEPLOY.md §3，`/api` 同源 → backend）时 API 即同源，SW 会缓存 GET，离线数据可用--即 PWA 离线数据承诺在生产架构下成立，仅 Docker standalone 跨源配置下不成立。
  - **已修复（同会话，用户选「nginx /api 反代」方案）**：① `frontend/nginx.conf` 加 `location /api/ { proxy_pass http://backend:5000; ... }` 反代 + 转发 `X-Forwarded-For/X-Real-IP/Host`；② `backend/src/app.ts` 加 `app.set('trust proxy', production?1:false)`，使 `req.ip` 在 nginx 后仍取真实客户端 IP（全局/登录限流按 IP 计数、审计日志新 IP 检测不退化）；③ `docker-compose.yml` + `frontend/Dockerfile` 的 `REACT_APP_API_URL` 默认改 `/api`（同源相对）。本地 dev（`npm start`，无 nginx）仍用 `.env.example` 的 `http://localhost:5000/api` 直连后端，不受影响。
  - **修复后复验（Playwright 重跑，全 4 项 PASS）**：SW 注册激活 ✅ / 离线 app shell 由 SW 缓存回源 ✅ / **离线 API 数据由 SW 缓存回源 ✅**（`/api/blood-tests` 断网 reload `fromServiceWorker()=true`、status 200，列表区渲染出缓存数据「2026/07/15 异常 3.20↓ 4.10 110.00 120.00」，不再是「Network error」）/ 离线指示器 ✅。后端 tsc ✅、jest 122/122 ✅（trust proxy 仅 production 生效，test 环境不受影响）。

### 2026-07-15（L-P2 安全审计日志 + 异常登录检测）
- **AuditLog Model**: `user/action/success/ip/userAgent/detail/isAnomaly/anomalyType`，TTL 索引 90 天自动清理；`{user,createdAt}` + `{ip,action,createdAt}` 复合索引
- **User.knownIps**: 新增 `knownIps: string[]` 跟踪用户历史登录 IP，首次登录自动标记新 IP
- **auditLogger helper**: `recordAuditEvent()` 从 req 提取 ip/userAgent，try/catch 不阻断业务
- **10 处埋点**: login(含新IP/暴力破解检测)/logout/register/refresh_token/forgot_password/reset_password/change_password/delete_account/share_create/share_revoke
- **异常检测**: 新 IP 登录 -> `isAnomaly=true, anomalyType=new_ip`；同一 IP 15 分钟内 5 次失败 -> `anomalyType=brute_force`
- **GET /api/auth/audit-logs**: 返回当前用户最近 50 条审计日志，按 createdAt 降序，不含 user 字段
- **前端**: Settings 新增第 4 个 tab「🛡️ 安全日志」+ `AuditLogSection` 组件，时间线列表展示，异常事件红底高亮 + ⚠️ + 红色 badge
- **测试**: 后端集成测试 9 用例（登录日志/新IP/旧IP/暴力破解/change-password/share/GET端点/401），全后端 122/122，前端 74/74


### 2026-06-28（UI 视觉深度重构 + 三大核心产品功能演进完成）
- **UI 视觉与交互体验深度重构**：
  - 重设了全局色彩（温和的 Teal-Blue 蓝绿调色盘）与字体排版（Inter/Noto Sans SC），全面美化了按钮、卡片、阴影和动效。
  - 重构侧边栏导航，集成 SVG 矢量图标并采用 `<NavLink>` 修复了当前激活项高亮，添加悬停微动效。
  - 优化仪表盘、血常规、化疗周期、数据分析、提醒管理、设置中心（重写 iOS 滑动开关）和只读分享页的精细样式，降低高饱和度警示红以舒缓化疗患者焦虑。
  - Dashboard 点击“添加记录”可自动路由传参，联动 BloodTest 页面自动展开录入表单。
- **中性粒细胞绝对值（ANC）骨髓抑制评级**：
  - 新增 `utils/myelosuppression.ts` 工具，编写 WHO 骨髓抑制分级判定算法。
  - 血常规录入表单（`BloodTestForm`）支持实时级别判定并气泡展示防感染、安全无菌饮食与异常发热就医防护指引。
  - 用户端与医生只读分享端的血常规列表（`BloodTestList`, `SharedBloodTestList`）增加骨髓抑制级别药丸（1-4 级，重度亮红闪烁）。
- **Nadir 低谷期图表高亮与科普**：
  - 数据分析（`Analytics`）增加对化疗周期数据的读取，判定并高亮标示出化疗后第 7-14 天的数据点（变为橙色旋转方块 `rectRot`）。
  - 图表 Tooltip 联动显示 `[⚠️ Nadir期 Day X]`，并在图表下方配以通俗易懂的低谷期常识科普面板。
- **移动端自适应“卡片式折叠列表”重构**：
  - 为用户列表和医生分享列表的所有 `<td>` 添加 `data-label`。
  - CSS 重写响应式媒体查询，在屏幕宽度 `< 768px` 时将表格无缝重构为卡片堆叠，彻底消除横向滚动条。
- **验证与打包部署**：
  - 前端 ESLint 配置中忽略 test 目录报错，支持 Windows CRLF，保证本地构建和 Docker 容器打包全部通过。
  - 修复 `BloodTests.test.tsx` router mock 缺失问题，前端 74/74 单元测试全部全绿通过。
  - Docker Compose 成功重建并部署，MongoDB 历史数据完整保留。

### 2026-06-28（M-P7/M-P8 Docker 验证 + UI 问题记录）
- **Docker 版重建验证**：多次 `docker compose up --build -d` 成功，backend/frontend/mongo 均健康；`/api/health` 200，frontend 200。
- **M-P7 化疗周期页面已可运行**：化疗周期新结构（方案名、周期起止、药物可选起止日期）已经在 Docker 版中验证进入页面；血常规保存前提醒逻辑也已进入构建。
- **M-P8 生效**：普通窗口 localStorage 留旧 token 时，页面不再永久 loading；`apiClient` timeout + AuthContext finally 兜底已合入。
- **Auth UX 修复**：注册页新增密码规则提前提示；登录/注册密码框新增显示/隐藏按钮；前端测试 74/74 通过。
- **遗留问题——按钮动作区视觉对齐** ~已修复~ ✅：
  - 根本原因：`Auth.css` 的裸选择器 `.btn-primary` 和 `.submit-button` 没有作用域限定，在 CRA 的全局 CSS bundle 中被注入到所有页面，用 `margin-top: 0.5rem` 和 `padding: 0.75rem` 覆盖了全局按钮规则。
  - 修复方式 (`df843c1`)：将 Auth.css 的所有裸选择器（`.form-group`、`.form-row`、`.btn-primary`、`.submit-button`、`.error-text`、`.field-error`、`.btn-block`）改为 `.auth-card` 作用域内限定；同时回退 `index.css` 之前为强行对抗而加的 `!important` 暴力覆盖。
  - 验证：curl Docker 容器实际 serve 的 CSS bundle，确认不再有裸的 `.btn-primary { margin-top: 0.5rem }` 泄漏到全局。

### 2026-06-23（M-P8 AuthContext 启动兜底）
- **apiClient timeout**：Axios 实例新增默认 `timeout: 10000`，避免网络层挂起导致请求永远 pending。
- **AuthContext 初始化兜底**：`initAuth()` 加 `try/catch/finally`，无论 token refresh 成功、失败还是异常，最终都会 `setIsLoading(false)`；异常时 `performLogout()` 清理 localStorage，避免页面永久停留在「加载中」。
- **触发场景**：Docker 验证时普通窗口 localStorage 留旧 token，refresh 请求被代理/网络卡住，隐身窗口正常；本修复使普通窗口也能自动恢复到未登录状态。
- **验证**：frontend tsc ✅、frontend jest 74/74 ✅

### 2026-06-23（M-P7 化疗周期重新设计）
- **设计文档 + 实现计划**：新增 `docs/superpowers/specs/2026-06-23-chemo-cycle-redesign-design.md` 与 `docs/superpowers/plans/2026-06-23-chemo-cycle-redesign-implementation.md`，锁定方案名称、药物起止日期、周期边界自动重算、血常规页提醒、旧数据兼容等规则。
- **数据契约** (`contracts/index.ts` + `frontend/src/types/index.ts`): 新增/更新 `ChemoMedication` 与 `ChemoCycle*` 类型，`ChemoCycle` 增 `regimenName`，药物字段改为 `name?/dosage?/startDate?/endDate?/notes?`，保留 `schedule?` 仅作旧数据兼容。
- **后端 Model** (`ChemoCycle.ts`):
  - `regimenName` 必填（默认 `未命名方案` 兼容旧数据）
  - `medications` 可为空数组
  - 药物字段全部可选，新增 `startDate/endDate/notes`，保留 legacy `schedule`
  - 新增 `{ user, startDate }` 索引用于周期边界重算
- **后端 Validation**: `validateChemoCycle` / `validateChemoCycleUpdate` 改为：方案名称必填；`endDate` 可选且 >= `startDate`；`medications` 可空；药物每项至少填一项信息；药物 `endDate >= startDate`。
- **后端 Controller** (`chemoCycleController.ts`):
  - `normalizeCycle`：旧数据缺 `regimenName` 显示为 `未命名方案`；旧 `schedule` 映射到 `notes`
  - `sanitizeMedications`：过滤空药物行，默认药物起止日期为周期起止日期
  - `create`：只填 `regimenName + startDate` 可创建；`endDate` 默认 `startDate + 21 天`
  - `create/update/delete` 后统一 `reconcileCycleBoundaries(userId)`：非最后周期 `endDate = 下一个周期 startDate - 1 天`，最后周期保留自身 endDate
- **前端 service** (`chemoCycleService.ts`): 新类型 + `addDaysLocal()` + form/api 转换；提交前过滤空药物行；旧 `schedule` 兼容到 `notes`。
- **前端 ChemoCycles UI**:
  - 表单新增「方案名称」必填
  - 周期开始/结束日期，结束日期默认开始 +21 天
  - 药物列表可为空；添加药物时默认继承周期起止日期；药名/剂量/起止日期/备注均可选
  - 列表卡片显示方案名、周期边界、药物起止日期/备注；无药物时显示「药物信息：未填写」
- **BloodTests 保存前提醒**:
  - `BloodTestForm` 新增 `beforeSubmit` hook
  - `BloodTests` 保存新增记录前检查化疗周期：无周期或最近周期距血常规日期超过 21 天时 confirm 提醒；用户可选择去 `/chemo-cycles` 或继续保存；编辑历史记录不弹提醒
- **测试**:
  - 后端新增 `chemoCycle.integration.test.ts` 8 用例：默认 +21、边界重算、update/startDate、delete、空药物、仅 notes 药物、药物日期错误 422、缺 regimenName 422
  - ChemoCycle 契约测试更新 response shape（regimenName + 药物日期/notes）
  - 前端 ChemoCycles/BloodTests 测试更新，新增 3 个 BloodTests 提醒用例
  - contract-validator 新增第 5 项 `ChemoCycle 类型定义三处一致 (M-P7)`
- **质量门禁**: 后端 tsc ✅、contract:check 5/5 ✅、后端 jest 113/113 ✅、前端 tsc ✅、前端 jest 74/74 ✅

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
*最后更新: 2026-07-16*
