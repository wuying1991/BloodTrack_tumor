# L-P5 i18n 国际化 (zh-CN + en-US) 实现计划

> **For agentic workers:** 本计划由主 agent 直接执行（非 subagent handoff），故各 Task 列出文件清单、关键改动点、校验门禁与 commit 模板，但不内联全部代码（实现时按 spec §3-§6 写）。Steps 使用 checkbox (`- [ ]`) 语法跟踪。

**Goal:** 端到端国际化 - 前端 UI 经 i18next 切换 zh-CN/en-US；后端错误发 `code`、前端映射翻译；审计日志 `detail` 迁移 `detailCode+detailParams`（历史向后兼容）；语言偏好持久化 `User.settings.language` + `lang` localStorage。

**Architecture:** 后端 `ApiError` 加 `code?` 字段 + 平行 `errorCodes` map，约 18 个 ApiError code + 25 个 validation code + 6 个 audit detailCode + 4 个限流 code；前端 i18next + react-i18next，13 命名空间资源 JSON，`initImmediate:false` 同步初始化，`errorMapper.ts` 做 code->翻译，`formatDate.ts` 随 i18n.language 本地化日期，`myelosuppression.ts` 重构返回 `gradeKey` 由调用方翻译。

**Tech Stack:** TypeScript + Express + Mongoose + Jest + supertest / React 18 + CRA + react-i18next + i18next + Jest + RTL

**Spec:** `docs/superpowers/specs/2026-07-17-i18n-design.md`

---

## 文件结构

**新增**
- `frontend/src/i18n/index.ts`
- `frontend/src/i18n/locales/zh-CN/{auth,common,layout,dashboard,bloodTest,chemoCycle,analytics,reminders,settings,share,myelosuppression,errors,audit}.json` (13)
- `frontend/src/i18n/locales/en-US/*.json` (13，Phase 6 填全)
- `frontend/src/setupTests.ts`
- `frontend/src/services/api/errorMapper.ts`
- `frontend/src/components/Layout/LanguageSwitcher.tsx`
- `frontend/src/utils/formatDate.ts`

**修改**
- `contracts/index.ts` - `UserSettings.language` + `ApiErrorResponse.code?`/`errorCodes?` + `AuditLogEntry.detailCode?`/`detailParams?`
- `frontend/src/types/index.ts` - 同步上述类型
- `backend/src/models/User.ts` - settings.language schema
- `backend/src/models/AuditLog.ts` - detailCode/detailParams schema
- `backend/src/utils/ApiError.ts` - code? 字段 + 工厂参数
- `backend/src/utils/auditLogger.ts` - 透传 detailCode/detailParams
- `backend/src/middlewares/errorMiddleware.ts` - 透传 code + 5 个兜底分支加 code
- `backend/src/middlewares/validationMiddleware.ts` - validateSettingsUpdate 加 language + 各 chain withMessage 保留（errorCodes 由 validate() 注入）
- `backend/src/controllers/{authController,bloodTestController,chemoCycleController,reminderController,shareController,publicShareController}.ts` - 每个 ApiError throw 加 code + 6 个 authController 审计点加 detailCode/detailParams
- `backend/src/app.ts` - 4 个限流 message 对象加 code
- `backend/scripts/contract-validator.js` - 第 6 项 UserSettings.language 四处对齐
- `frontend/src/index.tsx` - import './i18n'
- `frontend/src/services/api/apiClient.ts` - ApiError 加 code?/errorCodes?/params? + handleError 读取
- `frontend/src/context/AuthContext.tsx` - login/refreshUser 后应用 user.settings.language
- `frontend/src/components/Layout/Layout.tsx` - 嵌入 LanguageSwitcher + 字符串抽取
- `frontend/src/pages/**` + `frontend/src/components/**` - 全部字符串抽到 t()（11 子块）
- `frontend/src/utils/myelosuppression.ts` - 返回 gradeKey，去文案
- `frontend/src/services/chemoCycle/chemoCycleService.ts` - '未命名方案' fallback 抽 key
- `DEVLOG.md` - L-P5 changelog + 进度 99->100%

---

## 工作进度门禁

每个 Task 完成后，commit 前执行其指定校验。最终全量校验在 Phase 6。

```bash
# 后端
cd backend && npx tsc --noEmit
cd backend && npm run contract:check          # Phase 1 后从 5/5 -> 6/6
cd backend && npx jest --no-coverage

# 前端
cd frontend && npx tsc --noEmit
cd frontend && npm run lint
cd frontend && CI=true npx react-scripts test --watchAll=false
```

---

# 阶段一：契约 & 后端 language 字段（Task 1-2）

### Task 1: contracts + 前端 types + backend model + validation 加 language

**Files:** `contracts/index.ts`, `frontend/src/types/index.ts`, `backend/src/models/User.ts`, `backend/src/middlewares/validationMiddleware.ts`, `frontend/src/services/auth/authService.ts`

- [ ] **Step 1:** `contracts/index.ts` `UserSettings` 加 `language: 'zh-CN' | 'en-US'`（required，因后端 default 'zh-CN'）
- [ ] **Step 2:** `frontend/src/types/index.ts` 镜像 `UserSettings.language`
- [ ] **Step 3:** `backend/src/models/User.ts` settings 子文档加 `language: { type: String, enum: ['zh-CN','en-US'], default: 'zh-CN' }`
- [ ] **Step 4:** `validationMiddleware.ts` `validateSettingsUpdate` 加 `body('language').optional().isIn(['zh-CN','en-US']).withMessage('language 必须为 zh-CN 或 en-US')`
- [ ] **Step 5:** `authService.ts` `updateSettings` 签名加 `language?`（若类型是 Partial<UserSettings> 则自动覆盖，确认即可）
- [ ] **Step 6:** 校验 `cd backend && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit`
- [ ] **Step 7:** commit

```bash
git add contracts/index.ts frontend/src/types/index.ts backend/src/models/User.ts backend/src/middlewares/validationMiddleware.ts frontend/src/services/auth/authService.ts
git commit -m "feat(L-P5): UserSettings.language 字段 (4 处契约同步)

- contracts / 前端 types / User model / validation 四处对齐
- enum zh-CN|en-US, default zh-CN

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 2: contract-validator 第 6 项 + 后端门禁

**Files:** `backend/scripts/contract-validator.js`

- [ ] **Step 1:** 在第 5 项之后追加第 6 项 `UserSettings.language 四处一致 (L-P5)`：校验 contracts/index.ts、frontend/src/types/index.ts、backend/src/models/User.ts、validationMiddleware.ts 四处均含 `language`
- [ ] **Step 2:** `cd backend && npm run contract:check` 预期 6/6
- [ ] **Step 3:** `cd backend && npx tsc --noEmit && npx jest --no-coverage` 预期 122/122（既有测试 mockUser.settings 不含 language 不影响，因 default 生效；若断言精确匹配 settings 对象失败，改用 `expect.objectContaining`）
- [ ] **Step 4:** commit

```bash
git add backend/scripts/contract-validator.js
# 如有测试修复一并 add
git commit -m "feat(L-P5): contract-validator 第 6 项 UserSettings.language 对齐

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

# 阶段二：后端 error code（Task 3-5）

### Task 3: ApiError 加 code 字段 + AuditLog 加 detailCode

**Files:** `backend/src/utils/ApiError.ts`, `backend/src/models/AuditLog.ts`, `backend/src/utils/auditLogger.ts`, `contracts/index.ts`, `frontend/src/types/index.ts`

- [ ] **Step 1:** `ApiError.ts` 加 `code?: string` 字段 + `errorCodes?: Record<string,string>` 字段；所有静态工厂（badRequest/unauthorized/forbidden/notFound/conflict/gone/validation）增加末位 `code?` 参数；`validation` 增加 `errorCodes?` 参数。构造函数签名对应扩展
- [ ] **Step 2:** `AuditLog.ts` 加 `detailCode?: string` + `detailParams?: Schema.Types.Mixed`（或 `Object`）
- [ ] **Step 3:** `auditLogger.ts` `recordAuditEvent` 参数加 `detailCode?: string` + `detailParams?: Record<string,unknown>`，透传到 AuditLog.create
- [ ] **Step 4:** `contracts/index.ts` `ApiErrorResponse` 加 `code?: string` + `errorCodes?: Record<string,string>`；`AuditLogEntry` 加 `detailCode?: string` + `detailParams?: Record<string, unknown>`
- [ ] **Step 5:** `frontend/src/types/index.ts` 镜像
- [ ] **Step 6:** `cd backend && npx tsc --noEmit && npx jest --no-coverage` 预期全绿（code 为附加可选字段，既有断言不破坏）
- [ ] **Step 7:** commit

```bash
git add backend/src/utils/ApiError.ts backend/src/models/AuditLog.ts backend/src/utils/auditLogger.ts contracts/index.ts frontend/src/types/index.ts
git commit -m "feat(L-P5): ApiError.code + AuditLog.detailCode 字段

- ApiError 加 code?/errorCodes? + 所有工厂增加 code 参数
- AuditLog 加 detailCode?/detailParams?
- ApiErrorResponse/AuditLogEntry 契约同步

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 4: 全部 controller + errorMiddleware + 限流注入 code

**Files:** `backend/src/controllers/{authController,bloodTestController,chemoCycleController,reminderController,shareController,publicShareController}.ts`, `backend/src/middlewares/errorMiddleware.ts`, `backend/src/app.ts`

- [ ] **Step 1:** `authController.ts` 每个 `ApiError.*` throw 加对应 code（按 spec §4.1 表）；6 个审计点 `recordAuditEvent` 加 `detailCode`+`detailParams`（按 spec §4.3 表），保留原 `detail` 文本（向后兼容）
- [ ] **Step 2:** `bloodTestController.ts` / `chemoCycleController.ts` / `reminderController.ts` 的 notFound throw 加 `RESOURCE_NOT_FOUND`
- [ ] **Step 3:** `shareController.ts` / `publicShareController.ts` 的 throw 加 SHARE_* code（按 spec §4.1 表）
- [ ] **Step 4:** `errorMiddleware.ts` 透传 `err.code` 与 `err.errorCodes` 到响应；5 个 Mongoose/JWT 兜底分支（CastError/Duplicate/ValidationError/JsonWebTokenError/TokenExpiredError）加对应 `MONGOSE_*`/`JWT_*` code
- [ ] **Step 5:** `app.ts` 4 个限流 `message` 对象加 `code`（`RATE_LIMIT_GLOBAL`/`RATE_LIMIT_AUTH`/`RATE_LIMIT_SHARE`/`RATE_LIMIT_PIN`）
- [ ] **Step 6:** `validationMiddleware.ts` 的 `validate()` runner：在收集 `errors` map 时，平行构建 `errorCodes` map（每个 chain 的 code 从 withMessage 旁的元数据取，或为每个 chain 追加 `.custom()` 注入 code）。实现细节：扩展 `runValidation` 让每个 chain 可选绑 code，`validationResult` 映射时同时产出 errors + errorCodes
- [ ] **Step 7:** `cd backend && npx tsc --noEmit && npx jest --no-coverage` 预期 122/122 全绿（message 不变，code 附加）
- [ ] **Step 8:** commit

```bash
git add backend/src/controllers/ backend/src/middlewares/errorMiddleware.ts backend/src/app.ts backend/src/middlewares/validationMiddleware.ts
git commit -m "feat(L-P5): 后端 error code 全量注入

- 6 controller ApiError throw 加 code (18 code)
- 6 审计点加 detailCode/detailParams
- errorMiddleware 透传 code + 5 兜底分支加 code
- 限流 message 对象加 code
- validation 平行 errorCodes map (25 code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 5: 后端阶段二门禁 + 新增 code 形状测试

**Files:** `backend/src/__tests__/contracts/`（扩展现有或新增）

- [ ] **Step 1:** 新增/扩展契约测试：错误响应含 `code` 字段形状校验（登录失败 -> `AUTH_INVALID_CREDENTIALS`）；validateSettingsUpdate 接受 language / 拒绝非法值 422；audit-logs 返回 detailCode/detailParams 形状
- [ ] **Step 2:** `cd backend && npx tsc --noEmit && npm run contract:check && npx jest --no-coverage` 预期 6/6 + 全测试绿
- [ ] **Step 3:** commit

```bash
git add backend/src/__tests__/
git commit -m "test(L-P5): error code + language + audit detailCode 契约测试

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

# 阶段三：前端 i18n 基础设施（Task 6-7）

### Task 6: i18n 配置 + setupTests + 依赖

**Files:** `frontend/package.json`, `frontend/src/i18n/index.ts`, `frontend/src/i18n/locales/zh-CN/*.json`, `frontend/src/i18n/locales/en-US/*.json`(stub), `frontend/src/setupTests.ts`, `frontend/src/index.tsx`

- [ ] **Step 1:** `npm install i18next react-i18next`（在 frontend/）
- [ ] **Step 2:** 建 13 个 zh-CN JSON（先填全 zh 文案，从现有组件抽取）+ 13 个 en-US JSON（stub，key 同 zh，值留空字符串或临时复制 zh，Phase 6 填真翻译）
- [ ] **Step 3:** `frontend/src/i18n/index.ts` 按 spec §6.1 实现（detectLanguage + init `initImmediate:false`）
- [ ] **Step 4:** `frontend/src/setupTests.ts` 按 spec §7.1 实现（import jest-dom + import './i18n'）
- [ ] **Step 5:** `frontend/src/index.tsx` 顶部加 `import './i18n';`
- [ ] **Step 6:** `cd frontend && npx tsc --noEmit && CI=true npx react-scripts test --watchAll=false` 预期 77/77（setupTests 让既有中文选择器继续工作 - 此时组件尚未用 t()，仍渲染硬编码中文，所以测试暂时仍过；setupTests 本身不破坏）
- [ ] **Step 7:** commit

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/i18n/ frontend/src/setupTests.ts frontend/src/index.tsx
git commit -m "feat(L-P5): i18n 基础设施 + setupTests

- i18next + react-i18next 依赖
- 13 命名空间 zh-CN 资源 (en-US stub 待 Phase 6)
- i18n/index.ts 同步初始化 (initImmediate:false)
- setupTests.ts 修复 46 中文选择器

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 7: apiClient + errorMapper

**Files:** `frontend/src/services/api/apiClient.ts`, `frontend/src/services/api/errorMapper.ts`

- [ ] **Step 1:** `apiClient.ts` `ApiError` class 加 `code?: string` + `errorCodes?: Record<string,string>` + `params?: Record<string,unknown>`；`handleError` 从 `data.code`/`data.errorCodes`/`data.params` 读取并附到抛出的 ApiError
- [ ] **Step 2:** `errorMapper.ts` 按 spec §6.5 实现 `translateApiError` + `translateFieldError`
- [ ] **Step 3:** `cd frontend && npx tsc --noEmit && CI=true npx react-scripts test --watchAll=false` 预期 77/77
- [ ] **Step 4:** commit

```bash
git add frontend/src/services/api/apiClient.ts frontend/src/services/api/errorMapper.ts
git commit -m "feat(L-P5): apiClient 读 code + errorMapper 翻译

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

# 阶段四：前端字符串抽取（Task 8，11 子块）

### Task 8: 按命名空间逐块抽取 t()

每子块结束绿：`cd frontend && npx tsc --noEmit && npm run lint && CI=true npx react-scripts test --watchAll=false`

- [ ] **(a) layout + common:** `Layout.tsx`（标题 + nav）, `OfflineIndicator.tsx`, `LanguageSwitcher.tsx`（Phase 5 建，此处先抽 Layout）
- [ ] **(b) auth:** `Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`
- [ ] **(c) dashboard:** `Dashboard.tsx`（含 `${user.fullName}，您好` 插值 + `${diff} 天` 复数）
- [ ] **(d) bloodTest:** `BloodTestForm.tsx`（含 `正常范围: {{min}}-{{max}} {{unit}}` 插值 + 异常警告）, `BloodTestList.tsx`, `BloodTests.tsx`（删除 confirm + '删除失败: ' + msg）
- [ ] **(e) chemoCycle:** `ChemoCycles.tsx`（confirm 对话框）+ `chemoCycleService.ts:127` `'未命名方案'` -> 抽 key（service 不调 t()，返回 key 或 sentinel，由调用方翻译；或 service 接收 t 函数 - 选前者：返回 `__CHEMO_UNNAMED_REGIMEN__` sentinel，调用方 t('chemoCycle:unnamedRegimen')）
- [ ] **(f) analytics:** `Analytics.tsx`（含 Nadir `Day {{day}}` 插值 + 复数）
- [ ] **(g) reminders:** `Reminders.tsx`（含 `确定要删除提醒 "{{title}}" 吗？` 插值 confirm）
- [ ] **(h) settings:** `Settings.tsx` + `SharesSection.tsx`（含 `${days} 天后过期` 复数）+ `CreateShareDialog.tsx`
- [ ] **(i) share:** `SharedView.tsx`（含 `链接将于 {{date}} 过期` 改用 formatDate）, `PinPrompt.tsx`, `SharedBloodTestList.tsx`, `SharedChemoCycleList.tsx`, `SharedAnalytics.tsx`, `ShareNotFound.tsx`, `ShareExpired.tsx`
- [ ] **(j) myelosuppression:** 重构 `myelosuppression.ts` 返回 `gradeKey`（去 label/description/guidelines 文案）；调用方（BloodTestForm/BloodTestList/SharedBloodTestList）用 `t('myelosuppression:grade{{n}}.label')` / `.description` / `.guidelines`（`returnObjects:true`）翻译
- [ ] **(k) audit:** `AuditLogSection.tsx` ACTION_LABELS map -> `t('audit:action.{{action}}')`；detail 按 detailCode 翻译（spec §6.6）
- [ ] **每个子块单独 commit:** `git commit -m "feat(L-P5): 抽取 {{namespace}} 字符串到 i18n"`

> 关键模式：动态插值用 `t('key', { var: value })`；复数用 i18next `_one`/`_other` 后缀（en-US 需，zh-CN 无复数变化但 key 仍建）；confirm/alert 文案用 t()。组件错误展示从 `err.message` 改 `translateApiError(err)`，字段错误改 `translateFieldError(err, field)`。

---

# 阶段五：语言切换器 + 持久化 + 本地化日期（Task 9）

### Task 9: LanguageSwitcher + AuthContext 联动 + formatDate

**Files:** `frontend/src/components/Layout/LanguageSwitcher.tsx`, `frontend/src/components/Layout/Layout.tsx`, `frontend/src/pages/settings/Settings.tsx`, `frontend/src/context/AuthContext.tsx`, `frontend/src/utils/formatDate.ts`

- [ ] **Step 1:** `LanguageSwitcher.tsx`（spec §6.3）：下拉，changeLanguage + localStorage + updateSettings fire-and-forget
- [ ] **Step 2:** `Layout.tsx` header 嵌入 `<LanguageSwitcher />`
- [ ] **Step 3:** `Settings.tsx` profile tab 加 `<select>` 选语言（复用同一逻辑）
- [ ] **Step 4:** `AuthContext.tsx` login/refreshUser 后：若 `user.settings.language` 与 `i18n.language` 不同且无 `lang` localStorage（未手动覆盖），`i18n.changeLanguage(user.settings.language)`
- [ ] **Step 5:** `formatDate.ts`（spec §6.7）；替换 SharedView/AuditLogSection/SharesSection/SharedBloodTestList/SharedChemoCycleList 所有 `toLocaleString('zh-CN')`/`toLocaleDateString('zh-CN')`
- [ ] **Step 6:** `cd frontend && npx tsc --noEmit && npm run lint && CI=true npx react-scripts test --watchAll=false` 预期全绿 + 新增语言切换测试
- [ ] **Step 7:** commit

```bash
git add frontend/src/components/Layout/LanguageSwitcher.tsx frontend/src/components/Layout/Layout.tsx frontend/src/pages/settings/Settings.tsx frontend/src/context/AuthContext.tsx frontend/src/utils/formatDate.ts frontend/src/pages/share/ frontend/src/pages/settings/components/AuditLogSection.tsx frontend/src/pages/settings/components/SharesSection.tsx
git commit -m "feat(L-P5): 语言切换器 + 持久化 + 本地化日期

- LanguageSwitcher (Layout header + Settings profile)
- AuthContext 应用 user.settings.language
- formatDate.ts 随 i18n.language 本地化

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

# 阶段六：en-US 翻译 + 文档 + 全量门禁（Task 10）

### Task 10: en-US 填全 + 医学复核 + DEVLOG + 全量门禁

**Files:** `frontend/src/i18n/locales/en-US/*.json`, `DEVLOG.md`

- [ ] **Step 1:** 填全 13 个 en-US JSON（非医学部分直接翻译）
- [ ] **Step 2:** `myelosuppression` en-US 医学内容翻译，标记待母语英语医学复核（在 JSON 顶部加 `"_reviewNote": "medical content pending native-English clinical review"` 注释）
- [ ] **Step 3:** `DEVLOG.md` 加 `### 2026-07-17（L-P5 i18n 国际化）` changelog；L-P5 行（line 141）`❌` -> `~~✅~~`（strikethrough + ✅，与其它完成项一致）；进度 99% -> 100%；更新「最后更新」日期
- [ ] **Step 4:** 全量门禁：
  ```bash
  cd backend && npx tsc --noEmit && npm run contract:check && npx jest --no-coverage   # 6/6 + 全测试
  cd ../frontend && npx tsc --noEmit && npm run lint && CI=true npx react-scripts test --watchAll=false  # 0 lint + 全测试
  ```
- [ ] **Step 5:** commit

```bash
git add frontend/src/i18n/locales/en-US/ DEVLOG.md
git commit -m "feat(L-P5): en-US 翻译填全 + DEVLOG 标记完成

- 13 命名空间 en-US 资源
- myelosuppression 医学内容待临床复核 (标记 _reviewNote)
- DEVLOG: L-P5 ✅, 进度 99->100%

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Spec 覆盖自检

| Spec 章节 | 实现位置 |
|---|---|
| §3.1 User.settings.language | Task 1 |
| §3.2 AuditLog detailCode/detailParams | Task 3 |
| §3.3 ApiError.code + 工厂 | Task 3 |
| §4.1 ApiError code (18) | Task 4 |
| §4.2 validation errorCodes (25) | Task 4 Step 6 |
| §4.3 audit detailCode (6) | Task 4 Step 1 |
| §5.1 ApiErrorResponse.code/errorCodes | Task 3 |
| §5.2 PUT settings language 校验 | Task 1 |
| §5.3 audit-logs 返回 detailCode | Task 3 + Task 5 |
| §6.1 i18n 配置 | Task 6 |
| §6.2 index.tsx 接入 | Task 6 |
| §6.3 LanguageSwitcher | Task 9 |
| §6.4 AuthContext 联动 | Task 9 |
| §6.5 errorMapper | Task 7 |
| §6.6 审计日志渲染 | Task 8(k) |
| §6.7 formatDate | Task 9 |
| §6.8 myelosuppression 重构 | Task 8(j) |
| §7.1 setupTests | Task 6 |
| §7.2 后端测试 | Task 2 + Task 5 |
| §7.3 前端测试 | Task 6-9 各步门禁 |
| §9 风险缓解 | 各 Task 门禁 + Phase 6 医学标记 |
