# M-P4 数据共享（只读链接）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在化疗血常规追踪器中实现 M-P4 数据共享 —— 用户可生成只读 token 链接（可选 PIN + 范围 + 过期），分享给医生/家属查看；分享者可随时硬撤销，token 仅创建时返回一次。

**Architecture:** 后端新增独立 `Share` Mongoose 集合 + 一对受保护 API（`/api/shares`，`protect` 中间件）+ 一组公开 API（`/api/public/shares`，无 JWT，单独限流）。前端在 Settings 增加「我的分享」区，新增独立公开路由 `/share/:token` 的 viewer 页面（不在 ProtectedRoute / PublicOnlyRoute 包裹下，使用独立 axios 实例避免误带 Authorization）。

**Tech Stack:** TypeScript + Express + Mongoose 8 + bcryptjs + express-rate-limit + crypto.randomBytes + Jest + supertest + mongodb-memory-server / React 18 + React Router 6 + axios + react-scripts + RTL

**Spec:** `docs/superpowers/specs/2026-06-19-data-sharing-design.md`

---

## 文件结构（决策已锁定）

**新增**
- `backend/src/models/Share.ts`
- `backend/src/controllers/shareController.ts` — 受保护：list / create / delete
- `backend/src/controllers/publicShareController.ts` — 公开：meta / verify / blood-tests / chemo-cycles / analytics
- `backend/src/routes/shareRoutes.ts`
- `backend/src/routes/publicShareRoutes.ts`
- `backend/src/__tests__/contracts/share.contract.test.ts`
- `backend/src/__tests__/integration/share.integration.test.ts`
- `frontend/src/services/share/publicApiClient.ts` — 不带任何拦截器的干净 axios 实例
- `frontend/src/services/share/shareService.ts` — 受保护
- `frontend/src/services/share/publicShareService.ts` — 公开
- `frontend/src/pages/share/SharedView.tsx`
- `frontend/src/pages/share/ShareExpired.tsx`
- `frontend/src/pages/share/ShareNotFound.tsx`
- `frontend/src/pages/share/components/PinPrompt.tsx`
- `frontend/src/pages/share/components/SharedBloodTestList.tsx`
- `frontend/src/pages/share/components/SharedChemoCycleList.tsx`
- `frontend/src/pages/share/components/SharedAnalytics.tsx`
- `frontend/src/pages/share/SharedView.css`
- `frontend/src/pages/settings/components/SharesSection.tsx`
- `frontend/src/pages/settings/components/CreateShareDialog.tsx`
- `frontend/src/pages/share/__tests__/SharedView.test.tsx`

**修改**
- `contracts/index.ts` — 加 Share 系列类型
- `frontend/src/types/index.ts` — 同步类型
- `backend/src/utils/ApiError.ts` — 加 `gone()` 静态工厂
- `backend/src/middlewares/validationMiddleware.ts` — 加 `validateShareCreate`
- `backend/src/app.ts` — 挂载新路由 + 限流
- `backend/src/controllers/authController.ts` — `deleteAccount` 级联删除 Share
- `backend/scripts/contract-validator.js` — 加第 4 项 Share 字段对齐校验
- `frontend/src/App.tsx` — 注册 3 个公开路由
- `frontend/src/pages/settings/Settings.tsx` — 在数据 tab 嵌入 `<SharesSection />`
- `frontend/src/pages/settings/__tests__/Settings.test.tsx` — 扩展用例
- `DEVLOG.md` — M-P4 标记完成

---

## 工作进度门禁

每个任务完成后，应在该任务的 commit 之前执行其指定的本地校验。最终全量校验在 Task 22 执行。

```bash
# 后端单层校验
cd backend && npx tsc --noEmit                               # 必须 0 错误
cd backend && npx jest --no-coverage                         # 必须 81 + 新增 全部通过
cd backend && npm run contract:check                         # 必须 全部通过 (Task 5 后从 3/3 → 4/4)

# 前端单层校验
cd frontend && npx tsc --noEmit                              # 必须 0 错误
cd frontend && CI=true npx react-scripts test --watchAll=false  # 必须 64 + 新增 全部通过
cd frontend && npm run lint                                  # 必须 0 错误
```

---

# 阶段一：契约 & 后端基础（Task 1-7）

### Task 1: 在 contracts/index.ts 增加 Share 类型定义

**Files:**
- Modify: `contracts/index.ts`（追加在文件末尾）
- Modify: `frontend/src/types/index.ts`（追加在文件末尾，保持双侧一致）

- [ ] **Step 1: 追加 Share 类型到 `contracts/index.ts`**

在文件末尾（`BLOOD_TEST_NORMAL_RANGES` 之后）追加：

```ts
// ============================================================
// 数据共享 (Data Sharing) — M-P4
// ============================================================

export interface ShareScope {
  bloodTests: boolean;
  chemoCycles: boolean;
  analytics: boolean;
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

export interface ShareCreateResponseData {
  _id: string;
  scope: ShareScope;
  expiresAt: string | null;
  hasPin: boolean;
  token: string;       // 64-char hex，仅本次返回
  shareUrl: string;
  createdAt: string;
}

export type ShareListResponse = ApiResponse<Share[]>;
export type ShareCreateResponse = ApiResponse<ShareCreateResponseData>;
export type ShareDeleteResponse = ApiResponse<{ message: string }>;

// 公开端
export interface PublicShareMeta {
  ownerName: string;        // "<firstName> <lastName>"
  scope: ShareScope;
  expiresAt: string | null;
  requiresPin: boolean;
}

export type PublicShareMetaResponse = ApiResponse<PublicShareMeta>;
export type PublicSharePinVerifyResponse = ApiResponse<{ message: string }>;
```

- [ ] **Step 2: 同步追加到 `frontend/src/types/index.ts`**

复制 Step 1 的全部 export（除 `ApiResponse` 已存在）追加到文件末尾。前端不导入 contracts，types/index.ts 是镜像。

- [ ] **Step 3: 双侧 tsc 校验通过**

运行：
```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx tsc --noEmit
cd D:/vibe_program/BloodTrack_tumor/frontend && npx tsc --noEmit
```
预期：两侧均无错误输出。

- [ ] **Step 4: 提交**

```bash
cd D:/vibe_program/BloodTrack_tumor
git add contracts/index.ts frontend/src/types/index.ts
git commit -m "feat(M-P4): contracts/types 加 Share 类型定义

- ShareScope / ShareExpiresIn / Share / ShareCreateRequest
- ShareCreateResponseData (含一次性 token + shareUrl)
- PublicShareMeta (受邀者侧 owner 姓名 + scope + requiresPin)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: ApiError 加 410 Gone 静态工厂

**Files:**
- Modify: `backend/src/utils/ApiError.ts`
- Test: 没有独立的 ApiError 单元测试，留待 Task 7 集成测试覆盖 410 路径

- [ ] **Step 1: 在 `validation()` 之前加入 `gone()` 工厂**

在 `backend/src/utils/ApiError.ts` 的 `static notFound(...)` 和 `static conflict(...)` 之间添加（保持按状态码升序）：

将原来的：
```ts
  /**
   * Conflict Error (409)
   */
  static conflict(message: string = 'Conflict'): ApiError {
    return new ApiError(409, message, true);
  }
```

替换为：
```ts
  /**
   * Conflict Error (409)
   */
  static conflict(message: string = 'Conflict'): ApiError {
    return new ApiError(409, message, true);
  }

  /**
   * Gone Error (410) — 资源曾经存在但已永久消失（如已过期的分享链接）
   */
  static gone(message: string = 'Gone'): ApiError {
    return new ApiError(410, message, true);
  }
```

- [ ] **Step 2: 后端 tsc 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx tsc --noEmit
```
预期：无输出。

- [ ] **Step 3: 提交**

```bash
git add backend/src/utils/ApiError.ts
git commit -m "feat(M-P4): ApiError 加 410 Gone 静态工厂

为分享链接过期场景准备 — 语义比 404 更准确。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Share Mongoose Model

**Files:**
- Create: `backend/src/models/Share.ts`

- [ ] **Step 1: 创建 Share Model**

```ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IShare extends Document {
  user: mongoose.Types.ObjectId;
  token: string;
  pinHash: string | null;
  scope: {
    bloodTests: boolean;
    chemoCycles: boolean;
    analytics: boolean;
  };
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const shareSchema = new Schema<IShare>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    token: { type: String, required: true, unique: true, index: true },
    pinHash: { type: String, default: null },
    scope: {
      bloodTests:  { type: Boolean, required: true, default: false },
      chemoCycles: { type: Boolean, required: true, default: false },
      analytics:   { type: Boolean, required: true, default: false },
    },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// 拉某个用户的分享列表 (按 createdAt desc)
shareSchema.index({ user: 1, createdAt: -1 });

// 至少有一项 scope 为 true 才能创建
shareSchema.pre('validate', function (next) {
  const s = (this as IShare).scope;
  if (!s || (!s.bloodTests && !s.chemoCycles && !s.analytics)) {
    return next(new Error('至少需要选择一项分享内容 (At least one scope must be enabled)'));
  }
  next();
});

export const Share = mongoose.model<IShare>('Share', shareSchema);
```

- [ ] **Step 2: 后端 tsc 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx tsc --noEmit
```
预期：无输出。

- [ ] **Step 3: 跑现有测试，确保 Model 注册不破坏其它**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx jest --no-coverage
```
预期：81 个用例全绿。

- [ ] **Step 4: 提交**

```bash
git add backend/src/models/Share.ts
git commit -m "feat(M-P4): Share Mongoose Model

- token 唯一索引（命中查询）
- {user, createdAt:-1} 复合索引（列表分页）
- pre-validate: scope.* 至少一项为 true
- expiresAt 可空（永不过期）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: validateShareCreate 校验链

**Files:**
- Modify: `backend/src/middlewares/validationMiddleware.ts`（追加在文件末尾）

- [ ] **Step 1: 加入 Share 校验链**

在 `validateReminderUpdate` 之后、`export default validate;` 之前追加：

```ts
// ============================================================
// Share validation (M-P4 数据共享)
// ============================================================

const SHARE_EXPIRES_IN = ['1d', '7d', '30d', '90d', 'never'] as const;

export const validateShareCreate = runValidation([
  body('scope').isObject().withMessage('scope 必须为对象 (scope must be an object)'),
  body('scope.bloodTests')
    .isBoolean()
    .withMessage('scope.bloodTests 必须为布尔值'),
  body('scope.chemoCycles')
    .isBoolean()
    .withMessage('scope.chemoCycles 必须为布尔值'),
  body('scope.analytics')
    .isBoolean()
    .withMessage('scope.analytics 必须为布尔值'),
  body('scope').custom((s) => {
    if (!s || (!s.bloodTests && !s.chemoCycles && !s.analytics)) {
      throw new Error('至少需要选择一项分享内容 (At least one scope item must be enabled)');
    }
    return true;
  }),
  body('expiresIn')
    .isIn(SHARE_EXPIRES_IN)
    .withMessage('有效期必须为 1d/7d/30d/90d/never 之一'),
  body('pin')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^\d{4,6}$/)
    .withMessage('PIN 必须为 4–6 位数字'),
]);
```

- [ ] **Step 2: tsc + jest 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx tsc --noEmit && npx jest --no-coverage
```
预期：无 tsc 错误；81 用例全绿。

- [ ] **Step 3: 提交**

```bash
git add backend/src/middlewares/validationMiddleware.ts
git commit -m "feat(M-P4): validateShareCreate 校验链

- scope.* 三个布尔字段必填
- scope 至少一项为 true
- expiresIn 枚举 1d/7d/30d/90d/never
- pin 可选, 4-6 位数字

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: contract-validator 加第 4 项 Share 字段对齐校验

**Files:**
- Modify: `backend/scripts/contract-validator.js`

- [ ] **Step 1: 在第 3 项之后、输出报告之前追加第 4 项**

定位 `// 检查 3: 前端 types/index.ts 字段` 这块的 `check(...)` 闭合（`return errors;` 后跟 `});`），在其下方、`// 输出报告` 注释之前插入：

```js
// ============================================================
// 检查 4: Share 字段三处一致 (M-P4)
// ============================================================
check('Share 类型定义三处一致 (M-P4)', () => {
  const errors = [];

  // 4a. 后端 Share Model
  const modelPath = path.join(ROOT, 'src', 'models', 'Share.ts');
  if (!fs.existsSync(modelPath)) {
    errors.push('找不到 backend/src/models/Share.ts');
  } else {
    const content = fs.readFileSync(modelPath, 'utf-8');
    const required = ['user:', 'token:', 'pinHash', 'scope', 'bloodTests:', 'chemoCycles:', 'analytics:', 'expiresAt'];
    for (const f of required) {
      if (!content.includes(f)) errors.push(`Share Model 缺少字段: ${f}`);
    }
  }

  // 4b. 后端 validation
  const valPath = path.join(ROOT, 'src', 'middlewares', 'validationMiddleware.ts');
  const valContent = fs.readFileSync(valPath, 'utf-8');
  const valSection = valContent.substring(valContent.indexOf('export const validateShareCreate ='));
  if (!valSection || valSection.length < 50) {
    errors.push('validationMiddleware.ts 找不到 validateShareCreate');
  } else {
    for (const f of ['scope.bloodTests', 'scope.chemoCycles', 'scope.analytics', 'expiresIn', 'pin']) {
      if (!valSection.includes(`'${f}'`)) {
        errors.push(`validateShareCreate 缺少字段: ${f}`);
      }
    }
  }

  // 4c. 前端 types/index.ts
  const typesPath = path.join(ROOT, '..', 'frontend', 'src', 'types', 'index.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf-8');
  for (const f of ['ShareScope', 'ShareExpiresIn', 'ShareCreateRequest', 'PublicShareMeta', 'bloodTests:', 'chemoCycles:', 'analytics:']) {
    if (!typesContent.includes(f)) {
      errors.push(`前端 types/index.ts 缺少 Share 相关定义: ${f}`);
    }
  }

  return errors;
});
```

- [ ] **Step 2: 跑 contract:check**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npm run contract:check
```
预期：4/4 全部通过。

- [ ] **Step 3: 提交**

```bash
git add backend/scripts/contract-validator.js
git commit -m "feat(M-P4): contract-validator 加第 4 项 Share 字段对齐

校验 Model / validation / 前端 types 三处的 Share 字段保持一致。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: 受保护 Share Controller + Routes（POST/GET/DELETE）

**Files:**
- Create: `backend/src/controllers/shareController.ts`
- Create: `backend/src/routes/shareRoutes.ts`
- Modify: `backend/src/app.ts` — 挂载路由

- [ ] **Step 1: 创建 shareController.ts**

```ts
import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Share, IShare } from '../models/Share';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

const MAX_ACTIVE_SHARES = 50;

const EXPIRES_IN_MS: Record<string, number> = {
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

function expiresInToDate(expiresIn: string): Date | null {
  if (expiresIn === 'never') return null;
  const ms = EXPIRES_IN_MS[expiresIn];
  if (!ms) throw ApiError.badRequest('无效的有效期 (Invalid expiresIn)');
  return new Date(Date.now() + ms);
}

function buildShareUrl(token: string): string {
  const base = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/share/${token}`;
}

function publicView(s: IShare) {
  return {
    _id: s._id,
    scope: s.scope,
    expiresAt: s.expiresAt,
    hasPin: !!s.pinHash,
    createdAt: s.createdAt,
  };
}

// @desc    Create a new share link
// @route   POST /api/shares
// @access  Private
export const createShare = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?._id;

    // 业务前置 1: 总开关
    if (!req.user?.settings?.dataSharing?.enabled) {
      throw ApiError.validation('请先在设置→数据中开启数据共享 (Enable data sharing first)');
    }

    // 业务前置 2: 软上限
    const count = await Share.countDocuments({ user: userId });
    if (count >= MAX_ACTIVE_SHARES) {
      throw ApiError.validation(
        `每个用户最多 ${MAX_ACTIVE_SHARES} 条活跃分享链接 (Max ${MAX_ACTIVE_SHARES} active shares per user)`
      );
    }

    const { scope, expiresIn, pin } = req.body as {
      scope: { bloodTests: boolean; chemoCycles: boolean; analytics: boolean };
      expiresIn: string;
      pin?: string;
    };

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = expiresInToDate(expiresIn);
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

    const share = await Share.create({
      user: userId,
      token,
      pinHash,
      scope,
      expiresAt,
    });

    res.status(201).json({
      success: true,
      data: {
        ...publicView(share),
        token,
        shareUrl: buildShareUrl(token),
      },
    });
  }
);

// @desc    List current user's active shares
// @route   GET /api/shares
// @access  Private
export const listShares = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const shares = await Share.find({ user: req.user?._id }).sort('-createdAt');
    res.json({
      success: true,
      data: shares.map(publicView),
    });
  }
);

// @desc    Delete (revoke) a share
// @route   DELETE /api/shares/:id
// @access  Private
export const deleteShare = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await Share.findOneAndDelete({
      _id: req.params.id,
      user: req.user?._id,
    });

    if (!result) {
      throw ApiError.notFound('分享未找到 (Share not found)');
    }

    res.json({
      success: true,
      message: '分享已撤销 (Share revoked)',
    });
  }
);
```

- [ ] **Step 2: 创建 shareRoutes.ts**

```ts
import express from 'express';
import {
  createShare,
  listShares,
  deleteShare,
} from '../controllers/shareController';
import { protect } from '../middlewares/authMiddleware';
import {
  validateShareCreate,
  validateId,
} from '../middlewares/validationMiddleware';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(listShares)
  .post(validateShareCreate, createShare);

router.delete('/:id', validateId, deleteShare);

export default router;
```

- [ ] **Step 3: 在 app.ts 挂载受保护路由**

`backend/src/app.ts` 中：

1. 在 `import reminderRoutes from './routes/reminderRoutes';` 之后追加：
   ```ts
   import shareRoutes from './routes/shareRoutes';
   ```

2. 在 `app.use('/api/reminders', reminderRoutes);` 之后追加：
   ```ts
   app.use('/api/shares', shareRoutes);
   ```

- [ ] **Step 4: tsc + jest 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx tsc --noEmit && npx jest --no-coverage
```
预期：无 tsc 错误；81 用例全绿。

- [ ] **Step 5: 提交**

```bash
git add backend/src/controllers/shareController.ts backend/src/routes/shareRoutes.ts backend/src/app.ts
git commit -m "feat(M-P4): 受保护 Share API (POST/GET/DELETE)

- POST /api/shares: 业务前置（总开关/50 上限）+ 生成 32-byte token + bcrypt PIN + 一次性返回 token+shareUrl
- GET /api/shares: 列表不含 token（避免泄露）
- DELETE /api/shares/:id: 硬撤销，跨用户隔离

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Share 受保护 API 集成测试

**Files:**
- Create: `backend/src/__tests__/contracts/share.contract.test.ts`
- Create: `backend/src/__tests__/integration/share.integration.test.ts`

- [ ] **Step 1: 写契约测试 — `share.contract.test.ts`**

```ts
/**
 * 契约测试 - Share API
 *
 * 验证后端 API 响应与 contracts/index.ts 的 Share / ShareCreateResponseData 定义一致。
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import app from '../../app';
import { User } from '../../models/User';

let mongoServer: MongoMemoryServer;
let accessToken: string;

const testUser = {
  email: 'share-contract@example.com',
  password: 'TestPass123',
  firstName: 'Share',
  lastName: 'Contract',
  dateOfBirth: '1990-01-01',
  gender: 'male',
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(testUser.password, salt);
  await User.create({
    email: testUser.email,
    passwordHash,
    firstName: testUser.firstName,
    lastName: testUser.lastName,
    dateOfBirth: new Date(testUser.dateOfBirth),
    gender: testUser.gender,
    settings: {
      notifications: { email: true, push: true },
      dataSharing: { enabled: true, sharedWith: [] },
    },
  });

  const res = await request(app).post('/api/auth/login').send({
    email: testUser.email,
    password: testUser.password,
  });
  accessToken = res.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

const SHARE_LIST_SHAPE = {
  _id: 'string',
  scope: 'object',
  expiresAt: 'string|object',  // ISO string 或 null (typeof null === 'object')
  hasPin: 'boolean',
  createdAt: 'string',
};

const SHARE_CREATE_SHAPE = {
  ...SHARE_LIST_SHAPE,
  token: 'string',
  shareUrl: 'string',
};

function validateShape(obj: any, shape: Record<string, string>) {
  const errors: string[] = [];
  for (const [k, expected] of Object.entries(shape)) {
    const allowed = expected.split('|');
    if (!(k in obj)) {
      errors.push(`Missing field: ${k}`);
      continue;
    }
    const v = obj[k];
    if (v === null) {
      if (!allowed.includes('object')) errors.push(`Field ${k} is null`);
      continue;
    }
    if (!allowed.includes(typeof v)) {
      errors.push(`Field ${k} expected ${expected}, got ${typeof v}`);
    }
  }
  return errors;
}

describe('Share API 契约测试', () => {
  describe('POST /api/shares - 创建分享', () => {
    it('响应数据形状必须匹配契约（含 token + shareUrl）', async () => {
      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: true },
          expiresIn: '7d',
          pin: '1234',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const errors = validateShape(res.body.data, SHARE_CREATE_SHAPE);
      expect(errors).toEqual([]);
      expect(res.body.data.token).toMatch(/^[a-f0-9]{64}$/);
      expect(res.body.data.shareUrl).toContain('/share/');
      expect(res.body.data.hasPin).toBe(true);
    });

    it('总开关关闭时返回 422', async () => {
      // 临时关掉
      await User.updateOne(
        { email: testUser.email },
        { $set: { 'settings.dataSharing.enabled': false } }
      );
      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: false },
          expiresIn: '7d',
        });
      expect(res.status).toBe(422);
      // 恢复
      await User.updateOne(
        { email: testUser.email },
        { $set: { 'settings.dataSharing.enabled': true } }
      );
    });

    it('scope 全 false 返回 422', async () => {
      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scope: { bloodTests: false, chemoCycles: false, analytics: false },
          expiresIn: '7d',
        });
      expect(res.status).toBe(422);
    });

    it('pin 非数字返回 422', async () => {
      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: false },
          expiresIn: '7d',
          pin: 'abcd',
        });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/shares - 列表', () => {
    it('响应不含 token 字段', async () => {
      const res = await request(app)
        .get('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const errors = validateShape(res.body.data[0], SHARE_LIST_SHAPE);
      expect(errors).toEqual([]);
      expect(res.body.data[0]).not.toHaveProperty('token');
      expect(res.body.data[0]).not.toHaveProperty('pinHash');
    });
  });

  describe('DELETE /api/shares/:id', () => {
    it('删除成功返回 message', async () => {
      const created = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: false },
          expiresIn: 'never',
        });
      const id = created.body.data._id;

      const res = await request(app)
        .delete(`/api/shares/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('未认证访问', () => {
    it('无 token 时返回 401', async () => {
      const res = await request(app).get('/api/shares');
      expect(res.status).toBe(401);
    });
  });
});
```

- [ ] **Step 2: 跑契约测试，预期通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx jest --testPathPatterns='share.contract' --no-coverage
```
预期：6 用例全绿。

- [ ] **Step 3: 写集成测试 — `share.integration.test.ts`**

```ts
/**
 * 集成测试 - Share (受保护 API 部分)
 *
 * 覆盖：CRUD / 50 上限 / 总开关关闭 / 跨用户隔离 / deleteAccount 级联
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { Share } from '../../models/Share';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

const userA = {
  email: 'share-a@example.com',
  password: 'Test1234!',
  firstName: 'Share',
  lastName: 'AlphaUser',
  dateOfBirth: '1990-01-01',
  gender: 'female',
};
const userB = {
  email: 'share-b@example.com',
  password: 'Test1234!',
  firstName: 'Share',
  lastName: 'BetaUser',
  dateOfBirth: '1991-02-02',
  gender: 'male',
};

async function enableSharing(token: string) {
  await request(app)
    .put('/api/auth/settings')
    .set('Authorization', `Bearer ${token}`)
    .send({ dataSharing: { enabled: true } });
}

describe('Share 集成测试 (受保护 API)', () => {
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const a = await request(app).post('/api/auth/register').send(userA);
    tokenA = a.body.data.accessToken;
    const b = await request(app).post('/api/auth/register').send(userB);
    tokenB = b.body.data.accessToken;
    await enableSharing(tokenA);
    await enableSharing(tokenB);
  });

  it('创建 → 列表（无 token）→ 撤销 → 列表为空', async () => {
    const created = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresIn: '7d',
      });
    expect(created.status).toBe(201);
    const id = created.body.data._id;

    const list = await request(app)
      .get('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(list.status).toBe(200);
    expect(list.body.data.find((s: any) => s._id === id)).toBeDefined();
    expect(list.body.data[0]).not.toHaveProperty('token');

    const del = await request(app)
      .delete(`/api/shares/${id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(del.status).toBe(200);

    const after = await request(app)
      .get('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(after.body.data.find((s: any) => s._id === id)).toBeUndefined();
  });

  it('总开关关闭时拒绝创建', async () => {
    await request(app)
      .put('/api/auth/settings')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ dataSharing: { enabled: false } });
    const r = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresIn: '7d',
      });
    expect(r.status).toBe(422);
    await enableSharing(tokenB);
  });

  it('50 条上限', async () => {
    // 直接 batch insert 50 条
    const aRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userA.email, password: userA.password });
    const aId = aRes.body.data._id;
    const docs = Array.from({ length: 50 }, () => ({
      user: aId,
      token: require('crypto').randomBytes(32).toString('hex'),
      pinHash: null,
      scope: { bloodTests: true, chemoCycles: false, analytics: false },
      expiresAt: null,
    }));
    await Share.insertMany(docs);

    const r = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresIn: '7d',
      });
    expect(r.status).toBe(422);
    expect(r.body.message).toMatch(/50/);

    // 清理
    await Share.deleteMany({ user: aId });
  });

  it('跨用户隔离：B 不能撤销 A 的链接', async () => {
    const created = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresIn: 'never',
      });
    const id = created.body.data._id;

    const r = await request(app)
      .delete(`/api/shares/${id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(r.status).toBe(404);

    // 清理
    await request(app)
      .delete(`/api/shares/${id}`)
      .set('Authorization', `Bearer ${tokenA}`);
  });

  it('expiresIn=never 时 expiresAt 为 null', async () => {
    const r = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresIn: 'never',
      });
    expect(r.body.data.expiresAt).toBeNull();
  });
});
```

- [ ] **Step 4: 跑集成测试**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx jest --testPathPatterns='share.integration' --no-coverage
```
预期：5 用例全绿。

- [ ] **Step 5: 跑全量后端测试**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx jest --no-coverage
```
预期：92 用例（原 81 + 6 契约 + 5 集成）全绿。

- [ ] **Step 6: 提交**

```bash
git add backend/src/__tests__/contracts/share.contract.test.ts backend/src/__tests__/integration/share.integration.test.ts
git commit -m "test(M-P4): Share 受保护 API 契约 + 集成测试 (11 用例)

契约 6 用例: 创建响应形状/列表无 token/总开关关闭/scope 全 false/PIN 校验/未认证 401
集成 5 用例: CRUD/总开关/50 上限/跨用户隔离/never 过期为 null

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

# 阶段二：公开 viewer API（Task 8-12）

### Task 8: 公开 Share Controller — meta + verify + helper

**Files:**
- Create: `backend/src/controllers/publicShareController.ts`

- [ ] **Step 1: 创建 publicShareController.ts，先包含 helper 与 meta + verify 两个 handler**

```ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Share, IShare } from '../models/Share';
import { User, IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * 公开端 helper: token → share + owner，含 expiresAt 与 PIN 校验。
 * scope 校验由各资源 handler 自己做（因为 verify 端点不需要 scope 校验）。
 *
 * @param checkPin true 时校验 X-Share-Pin header；false 仅做 token 与过期校验
 */
export async function loadShareWithPin(
  req: Request,
  checkPin: boolean = true
): Promise<{ share: IShare; owner: IUser }> {
  const { token } = req.params;
  const share = await Share.findOne({ token });
  if (!share) {
    throw ApiError.notFound('链接不存在 (Share not found)');
  }

  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    throw ApiError.gone('链接已过期 (Share expired)');
  }

  if (checkPin && share.pinHash) {
    const headerPin = req.header('X-Share-Pin');
    if (!headerPin) {
      throw ApiError.unauthorized('请输入访问密码 (PIN required)');
    }
    const ok = await bcrypt.compare(headerPin, share.pinHash);
    if (!ok) {
      throw ApiError.unauthorized('密码错误 (Wrong PIN)');
    }
  }

  const owner = await User.findById(share.user).select('firstName lastName');
  if (!owner) {
    // owner 已被删除（理论上 deleteAccount 会级联清理 share，这里是兜底）
    throw ApiError.notFound('链接不存在 (Share not found)');
  }

  return { share, owner };
}

// @desc    Get share metadata (no PIN required)
// @route   GET /api/public/shares/:token
// @access  Public
export const getShareMeta = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { share, owner } = await loadShareWithPin(req, false);

  res.json({
    success: true,
    data: {
      ownerName: `${owner.firstName} ${owner.lastName}`,
      scope: share.scope,
      expiresAt: share.expiresAt,
      requiresPin: !!share.pinHash,
    },
  });
});

// @desc    Verify PIN (no-op for shares without PIN)
// @route   POST /api/public/shares/:token/verify
// @access  Public
export const verifySharePin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { share } = await loadShareWithPin(req, false);

  if (!share.pinHash) {
    res.json({ success: true, message: '无需密码' });
    return;
  }

  const { pin } = req.body as { pin?: string };
  if (!pin) {
    throw ApiError.unauthorized('请输入访问密码 (PIN required)');
  }
  const ok = await bcrypt.compare(pin, share.pinHash);
  if (!ok) {
    throw ApiError.unauthorized('密码错误 (Wrong PIN)');
  }

  res.json({ success: true, message: 'PIN 验证成功' });
});
```

- [ ] **Step 2: tsc 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx tsc --noEmit
```
预期：无错误。

- [ ] **Step 3: 提交**

```bash
git add backend/src/controllers/publicShareController.ts
git commit -m "feat(M-P4): publicShareController 加 meta + verify + helper

- loadShareWithPin: token→share+owner, 含 expiresAt + 可选 PIN 校验
- GET /:token: 返回 ownerName/scope/expiresAt/requiresPin
- POST /:token/verify: 校验 PIN，无 PIN 链接直接成功
- 410 用 ApiError.gone

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: 公开 Share Controller — blood-tests + chemo-cycles + analytics

**Files:**
- Modify: `backend/src/controllers/publicShareController.ts` — 追加 3 个 handler

- [ ] **Step 1: 在 publicShareController.ts 末尾追加资源 handler**

需要的 import 在文件顶部追加：

```ts
import { BloodTest } from '../models/BloodTest';
import { ChemoCycle } from '../models/ChemoCycle';
```

在文件末尾追加：

```ts
type RangeKey = '1m' | '3m' | '6m' | '1y' | 'all';
const RANGE_DAYS: Record<Exclude<RangeKey, 'all'>, number> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};
function buildDateFilter(range: unknown): { date?: { $gte: Date } } {
  const r = (typeof range === 'string' ? range : 'all') as RangeKey;
  if (r === 'all' || !(r in RANGE_DAYS)) return {};
  const days = RANGE_DAYS[r as Exclude<RangeKey, 'all'>];
  return { date: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } };
}

// @desc    Get blood tests via share token
// @route   GET /api/public/shares/:token/blood-tests
// @access  Public (token + optional PIN via X-Share-Pin header)
export const getSharedBloodTests = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { share } = await loadShareWithPin(req);
  if (!share.scope.bloodTests) {
    throw ApiError.forbidden('该资源未在此分享中开启 (Resource not in scope)');
  }
  const tests = await BloodTest.find({ user: share.user }).sort('-date').lean();
  res.json({ success: true, data: tests });
});

// @desc    Get chemo cycles via share token
// @route   GET /api/public/shares/:token/chemo-cycles
// @access  Public
export const getSharedChemoCycles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { share } = await loadShareWithPin(req);
  if (!share.scope.chemoCycles) {
    throw ApiError.forbidden('该资源未在此分享中开启 (Resource not in scope)');
  }
  const cycles = await ChemoCycle.find({ user: share.user }).sort('-startDate').lean();
  res.json({ success: true, data: cycles });
});

// @desc    Get analytics (trends + summary) via share token
// @route   GET /api/public/shares/:token/analytics?range=1m|3m|6m|1y|all
// @access  Public
export const getSharedAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { share } = await loadShareWithPin(req);
  if (!share.scope.analytics) {
    throw ApiError.forbidden('该资源未在此分享中开启 (Resource not in scope)');
  }

  const dateFilter = buildDateFilter(req.query.range);
  const tests = await BloodTest.find({ user: share.user, ...dateFilter })
    .sort('date')
    .select('date wbc rbc hgb plt neu lym isAbnormal')
    .lean();

  const trends = tests.map((t: any) => ({
    date: t.date.toISOString().split('T')[0],
    wbc: t.wbc, rbc: t.rbc, hgb: t.hgb, plt: t.plt,
    neu: t.neu, lym: t.lym,
    isAbnormal: t.isAbnormal,
  }));

  // 简版 summary（不含趋势箭头计算 — 受邀者不需要那么细）
  const totalTests = await BloodTest.countDocuments({ user: share.user });
  const abnormalCount = await BloodTest.countDocuments({ user: share.user, isAbnormal: true });

  res.json({
    success: true,
    data: {
      trends,
      summary: {
        totalTests,
        abnormalRate: totalTests > 0 ? Math.round((abnormalCount / totalTests) * 100) : 0,
      },
    },
  });
});
```

- [ ] **Step 2: tsc 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx tsc --noEmit
```
预期：无错误。

- [ ] **Step 3: 提交**

```bash
git add backend/src/controllers/publicShareController.ts
git commit -m "feat(M-P4): publicShareController 加 3 个资源 handler

- GET /:token/blood-tests: 受 scope.bloodTests 限定
- GET /:token/chemo-cycles: 受 scope.chemoCycles 限定
- GET /:token/analytics: 受 scope.analytics 限定，trends + 简版 summary

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: 公开路由 + 限流挂载 + deleteAccount 级联删除

**Files:**
- Create: `backend/src/routes/publicShareRoutes.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/src/controllers/authController.ts`

- [ ] **Step 1: 创建 publicShareRoutes.ts**

```ts
import express from 'express';
import {
  getShareMeta,
  verifySharePin,
  getSharedBloodTests,
  getSharedChemoCycles,
  getSharedAnalytics,
} from '../controllers/publicShareController';

const router = express.Router();

router.get('/:token', getShareMeta);
router.post('/:token/verify', verifySharePin);
router.get('/:token/blood-tests', getSharedBloodTests);
router.get('/:token/chemo-cycles', getSharedChemoCycles);
router.get('/:token/analytics', getSharedAnalytics);

export default router;
```

- [ ] **Step 2: 在 app.ts 挂载公开路由 + 限流**

`backend/src/app.ts`：

1. 在 `import shareRoutes from './routes/shareRoutes';` 后追加：
   ```ts
   import publicShareRoutes from './routes/publicShareRoutes';
   ```

2. 在 `const authLimiter = rateLimit({...});` 之后、`app.use('/api/', limiter);` 之前追加两个限流：

```ts
// 公开 share API 限流: 30 次/分钟/IP（meta + verify + 3 资源 = 5 个请求/次访问，余量充足）
const publicShareLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, message: '请求过于频繁 (Too many requests)' },
});

// PIN verify 端点单独限流: 5 次/分钟/IP+token, 跳过成功
const pinVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.params?.token ?? 'no-token'}`,
  skip: () => isTest,
  message: { success: false, message: '尝试过多，请稍后再试 (Too many attempts)' },
});
```

3. 在 `app.use('/api/auth/reset-password', authLimiter);` 之后、`app.use(cors());` 之前追加：

```ts
// 公开 share API 必须在 /api/ 全局限流之外（不需要 cors 之前？需要 cors，所以插在 cors 之后挂载路由）
// 这两条 limiter 紧贴在 publicShareRoutes 挂载之前生效
app.use('/api/public/shares', publicShareLimiter);
app.use('/api/public/shares/:token/verify', pinVerifyLimiter);
```

4. 在 `app.use('/api/shares', shareRoutes);` 之后追加：

```ts
// 公开路由（无 protect 中间件）
app.use('/api/public/shares', publicShareRoutes);
```

> 注意：受保护 `/api/shares` 与公开 `/api/public/shares` 路径前缀不同，express 路由解析互不干扰。

- [ ] **Step 3: deleteAccount 加 Share 级联删除**

`backend/src/controllers/authController.ts`：

1. 在文件顶部 import 加：
   ```ts
   import { Share } from '../models/Share';
   ```

2. 找到 `deleteAccount` 内的 Promise.all：
   ```ts
   const [bloodTestsRes, chemoCyclesRes, remindersRes] = await Promise.all([
     BloodTest.deleteMany({ user: userId }),
     ChemoCycle.deleteMany({ user: userId }),
     Reminder.deleteMany({ user: userId }),
   ]);
   ```

   替换为：
   ```ts
   const [bloodTestsRes, chemoCyclesRes, remindersRes, sharesRes] = await Promise.all([
     BloodTest.deleteMany({ user: userId }),
     ChemoCycle.deleteMany({ user: userId }),
     Reminder.deleteMany({ user: userId }),
     Share.deleteMany({ user: userId }),
   ]);
   ```

3. 找到 response：
   ```ts
   data: {
     bloodTests: bloodTestsRes.deletedCount,
     chemoCycles: chemoCyclesRes.deletedCount,
     reminders: remindersRes.deletedCount,
   },
   ```

   替换为：
   ```ts
   data: {
     bloodTests: bloodTestsRes.deletedCount,
     chemoCycles: chemoCyclesRes.deletedCount,
     reminders: remindersRes.deletedCount,
     shares: sharesRes.deletedCount,
   },
   ```

- [ ] **Step 4: tsc + jest 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx tsc --noEmit && npx jest --no-coverage
```
预期：无 tsc 错误；92 用例（含 Task 7 的 11 用例）全绿。

> 已有 deleteAccount 集成测试可能因为返回数据多了 `shares: 0` 而失败，需要观察。如果有失败，修复方式：在那条断言里加 `shares: 0` 字段或改用 `expect.objectContaining`。先跑测试看结果。

- [ ] **Step 5: 如果 deleteAccount 集成测试因 `shares` 字段失败，修复**

打开报错的测试文件（`backend/src/__tests__/integration/deleteAccount.integration.test.ts` 或 `auth.integration.test.ts`，根据失败输出定位），把对 `data` 的精确匹配改为 `expect.objectContaining({ bloodTests: ..., chemoCycles: ..., reminders: ... })`，让 `shares` 字段不参与精确匹配。再跑 jest。

- [ ] **Step 6: 提交**

```bash
git add backend/src/routes/publicShareRoutes.ts backend/src/app.ts backend/src/controllers/authController.ts
# 如有 deleteAccount 测试修复:
# git add backend/src/__tests__/integration/<修复的文件>
git commit -m "feat(M-P4): 公开 share 路由 + 限流 + deleteAccount 级联

- /api/public/shares 整体限流 30/min/IP
- /verify 端点 5/min/IP+token, 跳过成功
- deleteAccount 加 Share.deleteMany 级联

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: 公开 API 集成测试（核心 happy path + 错误码）

**Files:**
- Modify: `backend/src/__tests__/integration/share.integration.test.ts` — 追加测试

- [ ] **Step 1: 在文件末尾、最后一个 `});` 之前追加新 describe**

```ts
  describe('公开 viewer API', () => {
    let publicToken: string;
    let publicTokenWithPin: string;
    let expiredToken: string;
    let userAId: string;

    beforeAll(async () => {
      const aLogin = await request(app).post('/api/auth/login').send({
        email: userA.email,
        password: userA.password,
      });
      userAId = aLogin.body.data._id;

      // 给 A 录一些数据：1 条血常规 + 1 个化疗周期
      await request(app)
        .post('/api/blood-tests')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          date: '2026-06-01',
          wbc: 5.0, rbc: 4.5, hgb: 130, plt: 200,
        });
      await request(app)
        .post('/api/chemo-cycles')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          startDate: '2026-05-01',
          endDate: '2026-05-08',
          medications: [{ name: 'A', dosage: '50mg', schedule: 'qd' }],
        });

      // 创建 3 个 share：无 PIN / 有 PIN / 已过期
      const noPin = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          scope: { bloodTests: true, chemoCycles: true, analytics: true },
          expiresIn: '7d',
        });
      publicToken = noPin.body.data.token;

      const withPin = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: false },
          expiresIn: '7d',
          pin: '4321',
        });
      publicTokenWithPin = withPin.body.data.token;

      // 已过期：直接 insertOne 写一个过去的 expiresAt
      const expDoc = await Share.create({
        user: userAId,
        token: require('crypto').randomBytes(32).toString('hex'),
        pinHash: null,
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresAt: new Date(Date.now() - 1000),
      });
      expiredToken = expDoc.token;
    });

    it('GET /:token 返回 owner 姓名 + scope + requiresPin', async () => {
      const res = await request(app).get(`/api/public/shares/${publicToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.ownerName).toBe(`${userA.firstName} ${userA.lastName}`);
      expect(res.body.data.requiresPin).toBe(false);
      expect(res.body.data.scope).toEqual({
        bloodTests: true, chemoCycles: true, analytics: true,
      });
      // 不应泄露 email/dateOfBirth/_id
      expect(res.body.data).not.toHaveProperty('email');
      expect(res.body.data).not.toHaveProperty('dateOfBirth');
    });

    it('GET /:token 不存在返回 404', async () => {
      const fakeToken = 'a'.repeat(64);
      const res = await request(app).get(`/api/public/shares/${fakeToken}`);
      expect(res.status).toBe(404);
    });

    it('GET /:token 已过期返回 410', async () => {
      const res = await request(app).get(`/api/public/shares/${expiredToken}`);
      expect(res.status).toBe(410);
    });

    it('POST /:token/verify 无 PIN 链接直接 200', async () => {
      const res = await request(app)
        .post(`/api/public/shares/${publicToken}/verify`)
        .send({});
      expect(res.status).toBe(200);
    });

    it('POST /:token/verify 正确 PIN 返回 200', async () => {
      const res = await request(app)
        .post(`/api/public/shares/${publicTokenWithPin}/verify`)
        .send({ pin: '4321' });
      expect(res.status).toBe(200);
    });

    it('POST /:token/verify 错误 PIN 返回 401', async () => {
      const res = await request(app)
        .post(`/api/public/shares/${publicTokenWithPin}/verify`)
        .send({ pin: '0000' });
      expect(res.status).toBe(401);
    });

    it('GET /:token/blood-tests 无 PIN 链接返回数据', async () => {
      const res = await request(app).get(`/api/public/shares/${publicToken}/blood-tests`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /:token/blood-tests 有 PIN 缺 header 返回 401', async () => {
      const res = await request(app).get(`/api/public/shares/${publicTokenWithPin}/blood-tests`);
      expect(res.status).toBe(401);
    });

    it('GET /:token/blood-tests 有 PIN 正确 header 返回数据', async () => {
      const res = await request(app)
        .get(`/api/public/shares/${publicTokenWithPin}/blood-tests`)
        .set('X-Share-Pin', '4321');
      expect(res.status).toBe(200);
    });

    it('GET /:token/chemo-cycles 不在 scope 中返回 403', async () => {
      const res = await request(app)
        .get(`/api/public/shares/${publicTokenWithPin}/chemo-cycles`)
        .set('X-Share-Pin', '4321');
      expect(res.status).toBe(403);
    });

    it('GET /:token/analytics 返回 trends + summary', async () => {
      const res = await request(app).get(`/api/public/shares/${publicToken}/analytics?range=all`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('trends');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data.summary).toHaveProperty('totalTests');
      expect(res.body.data.summary).toHaveProperty('abnormalRate');
    });

    it('deleteAccount 后 share 级联删除（旧 token → 404）', async () => {
      // 注册一个临时用户 + 创建 share + 删账户 + 检查 token 失效
      const tmp = await request(app).post('/api/auth/register').send({
        email: 'share-cascade@example.com',
        password: 'Test1234!',
        firstName: 'Cascade',
        lastName: 'User',
        dateOfBirth: '1992-01-01',
        gender: 'male',
      });
      const tmpToken = tmp.body.data.accessToken;
      await enableSharing(tmpToken);
      const created = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${tmpToken}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: false },
          expiresIn: 'never',
        });
      const orphanToken = created.body.data.token;

      // 删账户
      const del = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${tmpToken}`)
        .send({ password: 'Test1234!' });
      expect(del.status).toBe(200);
      expect(del.body.data.shares).toBe(1);

      const r = await request(app).get(`/api/public/shares/${orphanToken}`);
      expect(r.status).toBe(404);
    });
  });
```

需要在 `import` 区追加：

```ts
import { Share } from '../../models/Share';
```

（如果文件顶部还没 import Share。）

- [ ] **Step 2: 跑全量后端测试**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx jest --no-coverage
```
预期：92 + 12 = 104 用例全绿。

- [ ] **Step 3: 跑 contract:check 确认 4/4 仍通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npm run contract:check
```
预期：4/4 全部通过。

- [ ] **Step 4: 提交**

```bash
git add backend/src/__tests__/integration/share.integration.test.ts
git commit -m "test(M-P4): 公开 share API 集成测试 (12 用例)

- meta: 200/404/410, 不泄露敏感字段
- verify: 无 PIN/正确 PIN/错误 PIN
- blood-tests: 无 PIN 直查/有 PIN 缺 header 401/正确 header 200
- chemo-cycles: scope 未授权 403
- analytics: trends + summary 形状
- deleteAccount 级联: 旧 token 立刻 404

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: 后端阶段二门禁

**Files:** 无（仅校验）

- [ ] **Step 1: 跑后端全部门禁**

```bash
cd D:/vibe_program/BloodTrack_tumor/backend
npx tsc --noEmit
npm run contract:check
npx jest --no-coverage
```

预期输出：
- tsc：无错误
- contract:check：4/4 全部通过
- jest：104 个用例全绿（原 81 + 11 受保护 + 12 公开）

- [ ] **Step 2: 如果有失败，先修复，再继续**

不要进入前端阶段直到后端 100% 通过。如果有失败，回到对应任务修复。

---

# 阶段三：前端 Settings 我的分享（Task 13-16）

### Task 13: 前端独立 publicApiClient

**Files:**
- Create: `frontend/src/services/share/publicApiClient.ts`

- [ ] **Step 1: 写干净的 axios 实例**

```ts
/**
 * 公开 API 客户端 — 用于 viewer 页面
 *
 * 关键差异：不挂任何拦截器，绝不带 Authorization header
 * （避免登录用户在打开 /share/:token 时把自己的 JWT 误带过去）。
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export class PublicApiError extends Error {
  public statusCode: number;
  public errors?: Record<string, string>;

  constructor(statusCode: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = 'PublicApiError';
  }
}

class PublicApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });
    // 一个简单 response 拦截器，把 axios error 标准化成 PublicApiError
    this.client.interceptors.response.use(
      (r) => r,
      (error: AxiosError) => this.handleError(error)
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      const { status, data } = error.response as AxiosResponse<any>;
      throw new PublicApiError(status, data?.message || 'Error', data?.errors);
    }
    if (error.request) {
      throw new PublicApiError(0, 'Network error');
    }
    throw new PublicApiError(0, error.message || 'Unexpected error');
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const r: AxiosResponse<T> = await this.client.get(url, config);
    return r.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const r: AxiosResponse<T> = await this.client.post(url, data, config);
    return r.data;
  }
}

const publicApiClient = new PublicApiClient();
export default publicApiClient;
```

- [ ] **Step 2: tsc 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/frontend && npx tsc --noEmit
```
预期：无错误。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/services/share/publicApiClient.ts
git commit -m "feat(M-P4): 前端独立 publicApiClient

不挂任何拦截器，避免登录用户在 viewer 页误带 Authorization。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: 前端 share services（受保护 + 公开）

**Files:**
- Create: `frontend/src/services/share/shareService.ts`
- Create: `frontend/src/services/share/publicShareService.ts`

- [ ] **Step 1: shareService.ts（受保护）**

```ts
import apiClient from '../api/apiClient';

export interface ShareScope {
  bloodTests: boolean;
  chemoCycles: boolean;
  analytics: boolean;
}

export type ShareExpiresIn = '1d' | '7d' | '30d' | '90d' | 'never';

export interface ShareListItem {
  _id: string;
  scope: ShareScope;
  expiresAt: string | null;
  hasPin: boolean;
  createdAt: string;
}

export interface ShareCreatePayload {
  scope: ShareScope;
  expiresIn: ShareExpiresIn;
  pin?: string;
}

export interface ShareCreated extends ShareListItem {
  token: string;
  shareUrl: string;
}

export interface ShareListResponse {
  success: boolean;
  data: ShareListItem[];
}

export interface ShareCreateResponse {
  success: boolean;
  data: ShareCreated;
}

export interface ShareDeleteResponse {
  success: boolean;
  message: string;
}

class ShareService {
  async listShares(): Promise<ShareListResponse> {
    return apiClient.get<ShareListResponse>('/shares');
  }

  async createShare(data: ShareCreatePayload): Promise<ShareCreateResponse> {
    return apiClient.post<ShareCreateResponse>('/shares', data);
  }

  async deleteShare(id: string): Promise<ShareDeleteResponse> {
    return apiClient.delete<ShareDeleteResponse>(`/shares/${id}`);
  }
}

const shareService = new ShareService();
export default shareService;
```

- [ ] **Step 2: publicShareService.ts**

```ts
import publicApiClient from './publicApiClient';
import type { ShareScope } from './shareService';

export interface PublicShareMeta {
  ownerName: string;
  scope: ShareScope;
  expiresAt: string | null;
  requiresPin: boolean;
}

export interface PublicMetaResponse {
  success: boolean;
  data: PublicShareMeta;
}

export interface PublicVerifyResponse {
  success: boolean;
  message: string;
}

export interface PublicBloodTest {
  _id: string;
  date: string;
  wbc: number; rbc: number; hgb: number; plt: number;
  neu?: number; lym?: number;
  notes?: string;
  isAbnormal: boolean;
}

export interface PublicChemoCycle {
  _id: string;
  startDate: string;
  endDate: string;
  medications: Array<{ name: string; dosage: string; schedule: string }>;
  doctorNotes?: string;
}

export interface PublicAnalyticsTrend {
  date: string;
  wbc: number; rbc: number; hgb: number; plt: number;
  neu?: number; lym?: number;
  isAbnormal: boolean;
}

export interface PublicAnalytics {
  trends: PublicAnalyticsTrend[];
  summary: { totalTests: number; abnormalRate: number };
}

function pinHeader(pin?: string) {
  return pin ? { headers: { 'X-Share-Pin': pin } } : undefined;
}

class PublicShareService {
  async getMeta(token: string): Promise<PublicMetaResponse> {
    return publicApiClient.get<PublicMetaResponse>(`/public/shares/${token}`);
  }
  async verifyPin(token: string, pin: string): Promise<PublicVerifyResponse> {
    return publicApiClient.post<PublicVerifyResponse>(
      `/public/shares/${token}/verify`,
      { pin }
    );
  }
  async getBloodTests(token: string, pin?: string): Promise<{ success: boolean; data: PublicBloodTest[] }> {
    return publicApiClient.get(`/public/shares/${token}/blood-tests`, pinHeader(pin));
  }
  async getChemoCycles(token: string, pin?: string): Promise<{ success: boolean; data: PublicChemoCycle[] }> {
    return publicApiClient.get(`/public/shares/${token}/chemo-cycles`, pinHeader(pin));
  }
  async getAnalytics(token: string, range = 'all', pin?: string): Promise<{ success: boolean; data: PublicAnalytics }> {
    return publicApiClient.get(
      `/public/shares/${token}/analytics?range=${range}`,
      pinHeader(pin)
    );
  }
}

const publicShareService = new PublicShareService();
export default publicShareService;
```

- [ ] **Step 3: tsc 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/frontend && npx tsc --noEmit
```
预期：无错误。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/services/share/shareService.ts frontend/src/services/share/publicShareService.ts
git commit -m "feat(M-P4): 前端 share services（受保护 + 公开）

- shareService: list / create / delete (走 apiClient, 自动带 Bearer)
- publicShareService: getMeta / verifyPin / 三资源端点 (走 publicApiClient, 不带 Authorization)
- pin 通过 X-Share-Pin header 传递

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Settings 我的分享区组件 — SharesSection + CreateShareDialog

**Files:**
- Create: `frontend/src/pages/settings/components/SharesSection.tsx`
- Create: `frontend/src/pages/settings/components/CreateShareDialog.tsx`

- [ ] **Step 1: CreateShareDialog（创建对话框）**

```tsx
import React, { useState } from 'react';
import shareService, {
  ShareCreatePayload,
  ShareExpiresIn,
  ShareScope,
} from '../../../services/share/shareService';
import { ApiError } from '../../../services/api/apiClient';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EXPIRES_LABELS: Array<{ value: ShareExpiresIn; label: string }> = [
  { value: '1d', label: '1 天' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
  { value: '90d', label: '90 天' },
  { value: 'never', label: '永不过期' },
];

const CreateShareDialog: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [scope, setScope] = useState<ShareScope>({
    bloodTests: true,
    chemoCycles: false,
    analytics: false,
  });
  const [expiresIn, setExpiresIn] = useState<ShareExpiresIn>('7d');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState('');

  if (!open) return null;

  const reset = () => {
    setScope({ bloodTests: true, chemoCycles: false, analytics: false });
    setExpiresIn('7d');
    setPin('');
    setErrors({});
    setCreatedUrl(null);
    setCopyMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!scope.bloodTests && !scope.chemoCycles && !scope.analytics) {
      next.scope = '请至少选择一项分享内容';
    }
    if (pin && !/^\d{4,6}$/.test(pin)) {
      next.pin = 'PIN 必须为 4–6 位数字';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      const payload: ShareCreatePayload = {
        scope,
        expiresIn,
        ...(pin ? { pin } : {}),
      };
      const res = await shareService.createShare(payload);
      const url = res.data.shareUrl;
      setCreatedUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setCopyMessage('链接已复制到剪贴板');
      } catch {
        setCopyMessage('请手动复制链接');
      }
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ form: err.message });
      } else {
        setErrors({ form: '创建失败，请重试' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {createdUrl ? (
          <div>
            <h3>✓ 创建成功</h3>
            <p>{copyMessage}</p>
            <pre style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 8 }}>
              {createdUrl}
            </pre>
            <p style={{ color: '#c33' }}>⚠ 此链接仅本次显示。请妥善保管，无法再次查看完整链接。</p>
            <button onClick={handleClose}>完成</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>创建分享链接</h3>

            <fieldset>
              <legend>分享内容（至少选一项）</legend>
              <label>
                <input
                  type="checkbox"
                  checked={scope.bloodTests}
                  onChange={(e) => setScope({ ...scope, bloodTests: e.target.checked })}
                /> 血常规记录
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={scope.chemoCycles}
                  onChange={(e) => setScope({ ...scope, chemoCycles: e.target.checked })}
                /> 化疗周期
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={scope.analytics}
                  onChange={(e) => setScope({ ...scope, analytics: e.target.checked })}
                /> 趋势分析
              </label>
              {errors.scope && <span style={{ color: '#c33' }}>{errors.scope}</span>}
            </fieldset>

            <fieldset>
              <legend>有效期</legend>
              {EXPIRES_LABELS.map((opt) => (
                <label key={opt.value}>
                  <input
                    type="radio"
                    name="expiresIn"
                    value={opt.value}
                    checked={expiresIn === opt.value}
                    onChange={() => setExpiresIn(opt.value)}
                  /> {opt.label}
                </label>
              ))}
            </fieldset>

            <label>
              访问密码（可选，4–6 位数字）
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
                inputMode="numeric"
                pattern="\d*"
              />
              {errors.pin && <span style={{ color: '#c33' }}>{errors.pin}</span>}
            </label>

            {errors.form && <p style={{ color: '#c33' }}>{errors.form}</p>}

            <div style={{ marginTop: 12 }}>
              <button type="button" onClick={handleClose} disabled={isSubmitting}>取消</button>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '创建中…' : '创建并复制链接'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateShareDialog;
```

- [ ] **Step 2: SharesSection（列表 + 撤销 + 总开关感知）**

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import shareService, { ShareListItem } from '../../../services/share/shareService';
import { ApiError } from '../../../services/api/apiClient';
import CreateShareDialog from './CreateShareDialog';

interface Props {
  /** 总开关 (settings.dataSharing.enabled) */
  sharingEnabled: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function describeExpiresAt(expiresAt: string | null): string {
  if (!expiresAt) return '永不过期';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return `已过期 (${formatDate(expiresAt)})`;
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return `${days} 天后过期 (${formatDate(expiresAt)})`;
}

function describeScope(s: ShareListItem['scope']): string {
  const parts: string[] = [];
  if (s.bloodTests) parts.push('血常规');
  if (s.chemoCycles) parts.push('化疗周期');
  if (s.analytics) parts.push('趋势分析');
  return parts.join('、');
}

const SharesSection: React.FC<Props> = ({ sharingEnabled }) => {
  const [shares, setShares] = useState<ShareListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await shareService.listShares();
      setShares(res.data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevoke = async (id: string) => {
    if (!window.confirm('撤销后链接将立即失效，无法恢复。继续？')) return;
    try {
      await shareService.deleteShare(id);
      await load();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('撤销失败');
    }
  };

  return (
    <section style={{ marginTop: 24 }}>
      <h3>我的分享链接</h3>

      <button
        type="button"
        onClick={() => setShowDialog(true)}
        disabled={!sharingEnabled}
        title={!sharingEnabled ? '请先开启数据共享' : ''}
      >
        + 创建分享链接
      </button>

      {loading && <p>加载中…</p>}
      {error && <p style={{ color: '#c33' }}>{error}</p>}

      {!loading && shares.length === 0 && <p style={{ color: '#888' }}>还没有创建过分享链接。</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {shares.map((s) => (
          <li key={s._id} style={{ border: '1px solid #ddd', borderRadius: 4, padding: 12, marginTop: 8 }}>
            <div>范围: {describeScope(s.scope)}{s.hasPin ? '   PIN: 已设置' : ''}</div>
            <div>有效期: {describeExpiresAt(s.expiresAt)}</div>
            <div>创建于: {formatDate(s.createdAt)}</div>
            <button onClick={() => handleRevoke(s._id)} style={{ marginTop: 8 }}>撤销</button>
          </li>
        ))}
      </ul>

      <CreateShareDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onCreated={load}
      />
    </section>
  );
};

export default SharesSection;
```

- [ ] **Step 3: 在 Settings.tsx 的"数据"tab 嵌入 SharesSection**

打开 `frontend/src/pages/settings/Settings.tsx`，在文件顶部 import 加：

```tsx
import SharesSection from './components/SharesSection';
```

找到数据 tab 的渲染区域（约第 530 行附近，含 `dataSharing.enabled` checkbox 的那块）。在该 checkbox 包裹 div 之后、tab 内容容器结束之前，追加：

```tsx
<SharesSection sharingEnabled={dataSharing.enabled} />
```

> 用 grep 定位精确插入点：
> ```bash
> grep -n "checked={dataSharing.enabled}" frontend/src/pages/settings/Settings.tsx
> ```
> 在该行所在的最近父级 `</div>` 之后、tab 容器收尾之前插入。具体行号可能因前面任务的格式微调而变化，按上下文判断即可。

- [ ] **Step 4: tsc + lint 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/frontend && npx tsc --noEmit && npm run lint
```
预期：tsc 无错误；ESLint 0 错误（warning 可接受）。

- [ ] **Step 5: 跑现有 Settings 测试，确认未破坏**

```bash
cd D:/vibe_program/BloodTrack_tumor/frontend && CI=true npx react-scripts test --watchAll=false --testPathPattern='Settings'
```
预期：18 用例全绿（数据 tab 改动不影响现有测试，因测试用 `getByLabelText` / 区段定位）。

> 如果有失败，最常见原因是 `getByText('启用数据共享')` 之类匹配到了新增 SharesSection 内的 "数据共享" 文本——把 SharesSection 标题用 "我的分享链接" 而非 "数据共享" 已规避此风险。如确实失败，把失败的断言改用更精确选择器（例如 `getByRole('checkbox', { name: /启用数据共享/ })`）。

- [ ] **Step 6: 提交**

```bash
git add frontend/src/pages/settings/components/SharesSection.tsx frontend/src/pages/settings/components/CreateShareDialog.tsx frontend/src/pages/settings/Settings.tsx
git commit -m "feat(M-P4): Settings 我的分享区 + 创建对话框

- SharesSection: 列表 + 撤销 confirm + 总开关感知
- CreateShareDialog: scope 至少一项校验 / PIN 4-6 位 / 一次性显示完整 URL + 自动复制
- 嵌入 Settings 数据 tab

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Settings.test.tsx 扩展用例

**Files:**
- Modify: `frontend/src/pages/settings/__tests__/Settings.test.tsx`

- [ ] **Step 1: 在文件末尾、最后一个 `});` 之前追加 SharesSection 测试**

```tsx
  describe('我的分享 (M-P4)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('总开关关闭时创建按钮 disabled', async () => {
      // 默认 mockUser 的 dataSharing.enabled = false
      const { container } = render(<Settings />);
      // 切到 "数据" tab
      fireEvent.click(screen.getByRole('button', { name: /数据/ }));
      const createBtn = await screen.findByRole('button', { name: /创建分享链接/ });
      expect(createBtn).toBeDisabled();
    });
  });
```

> ⚠ 这个 case 需要 jest.mock 的 shareService 不被实际调用 —— `SharesSection` 在 mount 时会调 `shareService.listShares()`，所以即使 disabled 测试也需 mock。在文件顶部的 jest.mock 区追加：
>
> ```ts
> jest.mock('../../../services/share/shareService', () => ({
>   __esModule: true,
>   default: {
>     listShares: jest.fn().mockResolvedValue({ success: true, data: [] }),
>     createShare: jest.fn(),
>     deleteShare: jest.fn(),
>   },
> }));
> ```
>
> 用 `await waitFor(...)` 等加载完成。如果断言在 listShares promise 解析前就跑了，先 `await screen.findByText(/还没有创建过/)` 再断言按钮。

- [ ] **Step 2: 跑这一个测试**

```bash
cd D:/vibe_program/BloodTrack_tumor/frontend && CI=true npx react-scripts test --watchAll=false --testPathPattern='Settings'
```
预期：原 18 + 新 1 = 19 用例全绿。

> 实际 case 数取决于 mock 的稳定性。这一个案例够覆盖"总开关守门"这个最关键的状态。后续如需更多 case（创建流程 / 撤销 confirm），在专门的 `pages/settings/__tests__/SharesSection.test.tsx` 里写更精细的测试，可避开 Settings.tsx 整体的 mock 复杂度。本计划暂以此一个用例为准 — 主要保护的回归就是"总开关守门"。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/pages/settings/__tests__/Settings.test.tsx
git commit -m "test(M-P4): Settings 数据 tab 加 1 个用例 — 总开关关闭时创建按钮 disabled

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

# 阶段四：viewer 页面（Task 17-21）

### Task 17: viewer 错误页 — ShareNotFound + ShareExpired

**Files:**
- Create: `frontend/src/pages/share/ShareNotFound.tsx`
- Create: `frontend/src/pages/share/ShareExpired.tsx`
- Create: `frontend/src/pages/share/SharedView.css`

- [ ] **Step 1: ShareNotFound.tsx**

```tsx
import React from 'react';

const ShareNotFound: React.FC = () => (
  <div className="shared-error-page">
    <h1>链接不存在</h1>
    <p>这个分享链接无效，可能已被撤销。</p>
  </div>
);

export default ShareNotFound;
```

- [ ] **Step 2: ShareExpired.tsx**

```tsx
import React from 'react';

const ShareExpired: React.FC = () => (
  <div className="shared-error-page">
    <h1>链接已过期</h1>
    <p>这个分享链接已超过有效期。请联系分享者获取新链接。</p>
  </div>
);

export default ShareExpired;
```

- [ ] **Step 3: SharedView.css（极简样式）**

```css
.shared-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.shared-view-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid #eee;
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.shared-view-readonly-badge {
  font-size: 14px;
  color: #888;
}

.shared-view-section {
  margin-top: 24px;
}

.shared-view-section h2 {
  border-left: 4px solid #4080ff;
  padding-left: 8px;
}

.shared-error-page {
  max-width: 480px;
  margin: 80px auto;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal {
  background: white;
  border-radius: 8px;
  padding: 24px;
  min-width: 400px;
  max-width: 90vw;
}

.shared-blood-row.is-abnormal { color: #c33; font-weight: 500; }
```

- [ ] **Step 4: tsc 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/frontend && npx tsc --noEmit
```
预期：无错误。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/pages/share/ShareNotFound.tsx frontend/src/pages/share/ShareExpired.tsx frontend/src/pages/share/SharedView.css
git commit -m "feat(M-P4): viewer 错误页 + 共享样式

- ShareNotFound: 404 跳转目的地
- ShareExpired: 410 跳转目的地
- SharedView.css: viewer 与 modal 通用样式

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: viewer 展示组件 — PinPrompt / SharedBloodTestList / SharedChemoCycleList / SharedAnalytics

**Files:**
- Create: `frontend/src/pages/share/components/PinPrompt.tsx`
- Create: `frontend/src/pages/share/components/SharedBloodTestList.tsx`
- Create: `frontend/src/pages/share/components/SharedChemoCycleList.tsx`
- Create: `frontend/src/pages/share/components/SharedAnalytics.tsx`

- [ ] **Step 1: PinPrompt.tsx**

```tsx
import React, { useState } from 'react';

interface Props {
  onSubmit: (pin: string) => Promise<void>;
}

const PinPrompt: React.FC<Props> = ({ onSubmit }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) {
      setError('请输入 4–6 位数字 PIN');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(pin);
    } catch (err: any) {
      if (err?.statusCode === 429) {
        setError('尝试过多，请稍后再试');
      } else {
        setError('密码错误');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="shared-error-page">
      <h2>请输入访问密码</h2>
      <input
        type="text"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        maxLength={6}
        inputMode="numeric"
        pattern="\d*"
        autoFocus
      />
      {error && <p style={{ color: '#c33' }}>{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? '验证中…' : '查看'}
      </button>
    </form>
  );
};

export default PinPrompt;
```

- [ ] **Step 2: SharedBloodTestList.tsx**

```tsx
import React from 'react';
import type { PublicBloodTest } from '../../../services/share/publicShareService';

interface Props {
  tests: PublicBloodTest[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN');
}

const SharedBloodTestList: React.FC<Props> = ({ tests }) => {
  if (tests.length === 0) return <p>还没有血常规记录。</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>日期</th>
          <th>WBC</th><th>RBC</th><th>HGB</th><th>PLT</th>
          <th>NEU</th><th>LYM</th>
        </tr>
      </thead>
      <tbody>
        {tests.map((t) => (
          <tr
            key={t._id}
            className={`shared-blood-row${t.isAbnormal ? ' is-abnormal' : ''}`}
          >
            <td>{fmtDate(t.date)}</td>
            <td>{t.wbc}</td>
            <td>{t.rbc}</td>
            <td>{t.hgb}</td>
            <td>{t.plt}</td>
            <td>{t.neu ?? '-'}</td>
            <td>{t.lym ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SharedBloodTestList;
```

- [ ] **Step 3: SharedChemoCycleList.tsx**

```tsx
import React from 'react';
import type { PublicChemoCycle } from '../../../services/share/publicShareService';

interface Props {
  cycles: PublicChemoCycle[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN');
}

const SharedChemoCycleList: React.FC<Props> = ({ cycles }) => {
  if (cycles.length === 0) return <p>还没有化疗周期记录。</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {cycles.map((c) => (
        <li key={c._id} style={{ border: '1px solid #ddd', borderRadius: 4, padding: 12, marginBottom: 8 }}>
          <div><strong>{fmtDate(c.startDate)}</strong> → {fmtDate(c.endDate)}</div>
          <div>药物:
            <ul>
              {c.medications.map((m, i) => (
                <li key={i}>{m.name} · {m.dosage} · {m.schedule}</li>
              ))}
            </ul>
          </div>
          {c.doctorNotes && <div>医生备注: {c.doctorNotes}</div>}
        </li>
      ))}
    </ul>
  );
};

export default SharedChemoCycleList;
```

- [ ] **Step 4: SharedAnalytics.tsx（极简表格替代 Chart.js — 不引入额外依赖到 viewer 页）**

> 决策：viewer 端不引入 Chart.js。一是减小 viewer 包体；二是 SharedAnalytics 只需展示数据点 + 摘要，表格已足够。如果以后要加图表，扩展此组件即可。

```tsx
import React from 'react';
import type { PublicAnalytics } from '../../../services/share/publicShareService';

interface Props {
  data: PublicAnalytics;
}

const SharedAnalytics: React.FC<Props> = ({ data }) => {
  const { trends, summary } = data;
  return (
    <div>
      <p>
        共 {summary.totalTests} 次检测，异常率 {summary.abnormalRate}%
      </p>
      {trends.length === 0 ? (
        <p>没有可用的趋势数据。</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>日期</th><th>WBC</th><th>RBC</th><th>HGB</th><th>PLT</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((t, i) => (
              <tr key={i} className={t.isAbnormal ? 'shared-blood-row is-abnormal' : ''}>
                <td>{t.date}</td>
                <td>{t.wbc}</td><td>{t.rbc}</td><td>{t.hgb}</td><td>{t.plt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SharedAnalytics;
```

- [ ] **Step 5: tsc + lint 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/frontend && npx tsc --noEmit && npm run lint
```
预期：tsc 无错误；ESLint 0 错误。

- [ ] **Step 6: 提交**

```bash
git add frontend/src/pages/share/components/
git commit -m "feat(M-P4): viewer 4 个展示组件

- PinPrompt: 4-6 位数字校验 + 429 提示
- SharedBloodTestList: 异常红字行
- SharedChemoCycleList: 周期 + 药物列表
- SharedAnalytics: 数值表 + 摘要 (不引入 Chart.js, 减小包体)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: SharedView 顶层状态机

**Files:**
- Create: `frontend/src/pages/share/SharedView.tsx`

- [ ] **Step 1: 实现状态机**

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import publicShareService, {
  PublicShareMeta,
  PublicBloodTest,
  PublicChemoCycle,
  PublicAnalytics,
} from '../../services/share/publicShareService';
import { PublicApiError } from '../../services/share/publicApiClient';
import PinPrompt from './components/PinPrompt';
import SharedBloodTestList from './components/SharedBloodTestList';
import SharedChemoCycleList from './components/SharedChemoCycleList';
import SharedAnalytics from './components/SharedAnalytics';
import './SharedView.css';

type Phase = 'loading' | 'meta-error' | 'pin' | 'data';

const SharedView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [meta, setMeta] = useState<PublicShareMeta | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [bloodTests, setBloodTests] = useState<PublicBloodTest[] | null>(null);
  const [chemoCycles, setChemoCycles] = useState<PublicChemoCycle[] | null>(null);
  const [analytics, setAnalytics] = useState<PublicAnalytics | null>(null);
  const [dataError, setDataError] = useState('');

  const loadData = useCallback(
    async (m: PublicShareMeta, pinValue: string | null) => {
      const calls: Promise<void>[] = [];
      if (m.scope.bloodTests) {
        calls.push(
          publicShareService
            .getBloodTests(token!, pinValue ?? undefined)
            .then((r) => setBloodTests(r.data))
        );
      }
      if (m.scope.chemoCycles) {
        calls.push(
          publicShareService
            .getChemoCycles(token!, pinValue ?? undefined)
            .then((r) => setChemoCycles(r.data))
        );
      }
      if (m.scope.analytics) {
        calls.push(
          publicShareService
            .getAnalytics(token!, 'all', pinValue ?? undefined)
            .then((r) => setAnalytics(r.data))
        );
      }
      try {
        await Promise.all(calls);
        setPhase('data');
      } catch (err) {
        setDataError(
          err instanceof PublicApiError ? err.message : '加载数据失败'
        );
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    publicShareService
      .getMeta(token)
      .then((res) => {
        const m = res.data;
        setMeta(m);
        if (m.requiresPin) {
          // 检查 sessionStorage 是否已有该 token 的 PIN
          const cached = sessionStorage.getItem(`share-pin-${token}`);
          if (cached) {
            setPin(cached);
            void loadData(m, cached);
          } else {
            setPhase('pin');
          }
        } else {
          void loadData(m, null);
        }
      })
      .catch((err) => {
        if (err instanceof PublicApiError) {
          if (err.statusCode === 404) navigate('/share/not-found');
          else if (err.statusCode === 410) navigate(`/share/${token}/expired`);
          else setPhase('meta-error');
        } else {
          setPhase('meta-error');
        }
      });
  }, [token, navigate, loadData]);

  const handlePinSubmit = async (input: string) => {
    if (!token || !meta) return;
    await publicShareService.verifyPin(token, input);
    sessionStorage.setItem(`share-pin-${token}`, input);
    setPin(input);
    await loadData(meta, input);
  };

  if (phase === 'loading') return <div className="shared-error-page">加载中…</div>;
  if (phase === 'meta-error') return <div className="shared-error-page">加载失败，请刷新页面或联系分享者。</div>;
  if (phase === 'pin') return <PinPrompt onSubmit={handlePinSubmit} />;
  if (!meta) return null;

  const expiryLabel = meta.expiresAt
    ? `链接将于 ${new Date(meta.expiresAt).toLocaleString('zh-CN')} 过期`
    : '链接长期有效';

  return (
    <div className="shared-view">
      <header className="shared-view-header">
        <div>
          <h1>化疗血常规追踪器</h1>
          <h2>{meta.ownerName} 的健康数据</h2>
        </div>
        <span className="shared-view-readonly-badge">🔒 只读视图</span>
      </header>

      {dataError && <p style={{ color: '#c33' }}>{dataError}</p>}

      {meta.scope.analytics && analytics && (
        <section className="shared-view-section">
          <h2>趋势分析</h2>
          <SharedAnalytics data={analytics} />
        </section>
      )}

      {meta.scope.chemoCycles && chemoCycles && (
        <section className="shared-view-section">
          <h2>化疗周期</h2>
          <SharedChemoCycleList cycles={chemoCycles} />
        </section>
      )}

      {meta.scope.bloodTests && bloodTests && (
        <section className="shared-view-section">
          <h2>血常规记录</h2>
          <SharedBloodTestList tests={bloodTests} />
        </section>
      )}

      <footer style={{ marginTop: 32, textAlign: 'center', color: '#888' }}>
        <p>{expiryLabel}</p>
        <p>Powered by 化疗血常规追踪器</p>
      </footer>
    </div>
  );
};

export default SharedView;
```

> 注意：sessionStorage 缓存的 PIN 在用户关闭页面后丢失。如果 PIN 被改/share 被撤销，缓存的 PIN 在下次请求时会得到 401，前端逻辑此时会因 `loadData` 抛错落到 `dataError` —— 用户刷新即可。

- [ ] **Step 2: tsc + lint 通过**

```bash
cd D:/vibe_program/BloodTrack_tumor/frontend && npx tsc --noEmit && npm run lint
```
预期：无错误。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/pages/share/SharedView.tsx
git commit -m "feat(M-P4): SharedView 顶层状态机

- loading → meta(GET) → pin? → data(并行三资源)
- 404 → /share/not-found, 410 → /share/:token/expired
- sessionStorage 缓存 PIN, 关页即失效
- 按 scope 条件渲染三个区段

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 20: 注册 viewer 路由 + SharedView 测试

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/share/__tests__/SharedView.test.tsx`

- [ ] **Step 1: App.tsx 注册三条公开路由**

打开 `frontend/src/App.tsx`：

1. 顶部 import 区追加：
   ```tsx
   import SharedView from './pages/share/SharedView';
   import ShareNotFound from './pages/share/ShareNotFound';
   import ShareExpired from './pages/share/ShareExpired';
   ```

2. 找到 `<Routes>` 内 `<Route path="/forgot-password" element={<ForgotPassword />} />` 这块（第 49 行附近），在其后追加：

   ```tsx
   {/* 公开 viewer 路由 - 不在任何 Route guard 包裹下 */}
   <Route path="/share/not-found" element={<ShareNotFound />} />
   <Route path="/share/:token/expired" element={<ShareExpired />} />
   <Route path="/share/:token" element={<SharedView />} />
   ```

   > 注意路由优先级：React Router 6 按顺序匹配，把更具体的 `/share/not-found` 与 `/share/:token/expired` 写在 `/share/:token` 前面。

- [ ] **Step 2: SharedView 测试**

`frontend/src/pages/share/__tests__/SharedView.test.tsx`：

```tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SharedView from '../SharedView';
import publicShareService from '../../../services/share/publicShareService';
import { PublicApiError } from '../../../services/share/publicApiClient';

jest.mock('../../../services/share/publicShareService', () => ({
  __esModule: true,
  default: {
    getMeta: jest.fn(),
    verifyPin: jest.fn(),
    getBloodTests: jest.fn(),
    getChemoCycles: jest.fn(),
    getAnalytics: jest.fn(),
  },
}));

const mocked = publicShareService as jest.Mocked<typeof publicShareService>;

function renderAt(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/share/${token}`]}>
      <Routes>
        <Route path="/share/:token" element={<SharedView />} />
        <Route path="/share/not-found" element={<div>NOT_FOUND_PAGE</div>} />
        <Route path="/share/:token/expired" element={<div>EXPIRED_PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

describe('SharedView', () => {
  it('无 PIN 链接：直接显示数据', async () => {
    mocked.getMeta.mockResolvedValue({
      success: true,
      data: {
        ownerName: '张 三',
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresAt: null,
        requiresPin: false,
      },
    });
    mocked.getBloodTests.mockResolvedValue({
      success: true,
      data: [
        {
          _id: 'b1', date: '2026-06-01',
          wbc: 5, rbc: 4.5, hgb: 130, plt: 200,
          isAbnormal: false,
        },
      ],
    });

    renderAt('aabb');

    await waitFor(() => {
      expect(screen.getByText(/张 三 的健康数据/)).toBeInTheDocument();
    });
    expect(screen.getByText('血常规记录')).toBeInTheDocument();
    expect(screen.queryByText('化疗周期')).not.toBeInTheDocument();
  });

  it('有 PIN 链接：先显示 PIN 表单', async () => {
    mocked.getMeta.mockResolvedValue({
      success: true,
      data: {
        ownerName: '张 三',
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresAt: null,
        requiresPin: true,
      },
    });
    renderAt('cc');
    await waitFor(() => {
      expect(screen.getByText(/请输入访问密码/)).toBeInTheDocument();
    });
    expect(mocked.getBloodTests).not.toHaveBeenCalled();
  });

  it('PIN 输入正确后加载数据', async () => {
    mocked.getMeta.mockResolvedValue({
      success: true,
      data: {
        ownerName: '张 三',
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresAt: null,
        requiresPin: true,
      },
    });
    mocked.verifyPin.mockResolvedValue({ success: true, message: 'ok' });
    mocked.getBloodTests.mockResolvedValue({ success: true, data: [] });

    renderAt('dd');
    await waitFor(() => {
      expect(screen.getByText(/请输入访问密码/)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '4321' } });
    fireEvent.click(screen.getByRole('button', { name: /查看/ }));

    await waitFor(() => {
      expect(screen.getByText(/张 三 的健康数据/)).toBeInTheDocument();
    });
    expect(mocked.verifyPin).toHaveBeenCalledWith('dd', '4321');
    expect(sessionStorage.getItem('share-pin-dd')).toBe('4321');
  });

  it('PIN 错误显示提示', async () => {
    mocked.getMeta.mockResolvedValue({
      success: true,
      data: {
        ownerName: '张 三',
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresAt: null,
        requiresPin: true,
      },
    });
    mocked.verifyPin.mockRejectedValue(new PublicApiError(401, 'wrong'));

    renderAt('ee');
    await waitFor(() => {
      expect(screen.getByText(/请输入访问密码/)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: /查看/ }));

    await waitFor(() => {
      expect(screen.getByText(/密码错误/)).toBeInTheDocument();
    });
  });

  it('404 跳到 not-found 页', async () => {
    mocked.getMeta.mockRejectedValue(new PublicApiError(404, 'not found'));
    renderAt('ff');
    await waitFor(() => {
      expect(screen.getByText('NOT_FOUND_PAGE')).toBeInTheDocument();
    });
  });

  it('410 跳到 expired 页', async () => {
    mocked.getMeta.mockRejectedValue(new PublicApiError(410, 'expired'));
    renderAt('gg');
    await waitFor(() => {
      expect(screen.getByText('EXPIRED_PAGE')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: 跑这一组测试**

```bash
cd D:/vibe_program/BloodTrack_tumor/frontend && CI=true npx react-scripts test --watchAll=false --testPathPattern='SharedView'
```
预期：6 用例全绿。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/App.tsx frontend/src/pages/share/__tests__/SharedView.test.tsx
git commit -m "feat(M-P4): 注册 viewer 路由 + SharedView 单测 (6 用例)

- 三条公开路由 not-found/expired/:token (顺序保证更具体的优先匹配)
- 测试覆盖：无 PIN 直接展示/有 PIN 表单/PIN 正确/PIN 错误/404/410

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 21: 前端阶段三门禁

**Files:** 无（仅校验）

- [ ] **Step 1: 跑前端全部门禁**

```bash
cd D:/vibe_program/BloodTrack_tumor/frontend
npx tsc --noEmit
npm run lint
CI=true npx react-scripts test --watchAll=false
```

预期：
- tsc：无错误
- ESLint：0 错误
- Jest：64 + 1 (Settings 扩展) + 6 (SharedView) = 71 用例全绿

- [ ] **Step 2: 修复任何失败**

不要继续到 Task 22 直到前端 100% 通过。

---

# 阶段五：端到端验证 + 文档（Task 22）

### Task 22: 全量门禁 + DEVLOG 更新 + 端到端手动验证

**Files:**
- Modify: `DEVLOG.md`

- [ ] **Step 1: 跑双侧全部门禁**

```bash
cd D:/vibe_program/BloodTrack_tumor

# 后端
cd backend
npx tsc --noEmit
npm run contract:check
npx jest --no-coverage
cd ..

# 前端
cd frontend
npx tsc --noEmit
npm run lint
CI=true npx react-scripts test --watchAll=false
cd ..
```

预期全部通过：
- 后端 tsc / contract:check (4/4) / jest 104+ 用例
- 前端 tsc / ESLint 0 / jest 71+ 用例

- [ ] **Step 2: 端到端手动验证（需要本地 MongoDB）**

> 如果当前环境没有 MongoDB，跳过此步并在 commit message 注明「自动化测试覆盖完整，端到端手动验证待用户在有 MongoDB 的环境运行」。

启动后端 + 前端：
```bash
# 终端 1
cd D:/vibe_program/BloodTrack_tumor/backend && npm run dev

# 终端 2
cd D:/vibe_program/BloodTrack_tumor/frontend && npm start
```

走流程：
1. 注册账户、录入 1 条血常规、1 个化疗周期
2. 进 Settings → 数据 tab，开启「启用数据共享」总开关，保存
3. 点「+ 创建分享链接」，勾选血常规 + 趋势分析，选 7 天，填 PIN `1234`
4. 复制链接到隐身窗口打开 → 应看到 PIN 表单 → 输入 `1234` → 看到只读视图（含分享者姓名 + 血常规表 + 趋势分析，无化疗周期区段）
5. 回到原窗口，撤销该链接 → 隐身窗口刷新 → 应跳到 not-found 页

- [ ] **Step 3: DEVLOG.md 更新 M-P4 状态**

`DEVLOG.md` 第 108 行：
```
| M-P4 | 数据共享 (生成只读链接 + 撤销) | 2天 | ❌ |
```
改为：
```
| ~~M-P4~~ | ~~数据共享 (生成只读链接 + 撤销)~~ | 2天 | ✅ |
```

进度概览（第 8 行）行从 `**项目总进度**: ████████████████████░ 96%` 改为：
```
**项目总进度**: █████████████████████ 99%
```

测试数（第 14、15 行）：
- `| 后端测试 | 73 | TBD | — |` → `| 后端测试 | 104+ | TBD | — |`
- `| 前端测试 | 56 | TBD | — |` → `| 前端测试 | 71+ | TBD | — |`

在「📅 变更日志」最顶部（紧贴 `### 2026-06-18（第三轮：...）` 之上）追加：

```md
### 2026-06-19（M-P4 数据共享只读链接）
- **后端 Model**: `Share.ts` — `user(ref)/token(64-hex unique)/pinHash(bcrypt nullable)/scope{bloodTests,chemoCycles,analytics}/expiresAt(nullable)`，pre-validate 至少一项 scope
- **受保护 API** (`/api/shares`):
  - `POST` — 业务前置（总开关开/<50 上限）+ 32-byte token + bcrypt PIN + 一次性返回 `{token, shareUrl}`
  - `GET` — 列表不含 token / pinHash
  - `DELETE /:id` — 硬撤销，跨用户隔离
- **公开 API** (`/api/public/shares`，无 JWT):
  - `GET /:token` — owner 姓名 + scope + requiresPin (不暴露 email/生日/_id)
  - `POST /:token/verify` — bcrypt PIN 校验
  - `GET /:token/{blood-tests, chemo-cycles, analytics}` — 受 scope.* 限定，PIN 通过 `X-Share-Pin` header 传递
  - 错误码: 404/410/403/401，新增 `ApiError.gone()`
  - 限流: 整体 30/min/IP，verify 端点 5/min/IP+token (skipSuccessfulRequests)
- **deleteAccount 级联**: 加 `Share.deleteMany({user})`
- **contracts**: `ShareScope/ShareExpiresIn/Share/ShareCreateRequest/ShareCreateResponseData/PublicShareMeta`
- **contract-validator**: 加第 4 项 Share 三处对齐校验 (4/4)
- **前端 services**: `publicApiClient` 干净 axios 实例 (不带 Authorization) / `shareService` / `publicShareService`
- **前端 Settings**: `SharesSection` (列表 + 撤销 confirm + 总开关 disabled) + `CreateShareDialog` (scope 至少一项校验 / PIN 4-6 位 / 一次性显示完整 URL + clipboard)
- **前端 viewer**: 公开路由 `/share/:token` 不在 ProtectedRoute 包裹下；`SharedView` 状态机 loading→meta→pin?→data；4 个展示组件 PinPrompt/SharedBloodTestList/SharedChemoCycleList/SharedAnalytics (不引入 Chart.js)；ShareNotFound + ShareExpired 错误页
- **测试**: 后端契约 +6 / 集成 +12 / 前端 SharedView +6 / Settings 扩展 +1，门禁全绿
```

把文件末尾「最后更新」行改为：
```
*最后更新: 2026-06-19*
```

- [ ] **Step 4: 提交**

```bash
git add DEVLOG.md
git commit -m "docs(M-P4): DEVLOG 标记 M-P4 完成 + 测试数更新

- 项目总进度 96% → 99%
- 后端测试 73 → 104+, 前端测试 56 → 71+
- 详细变更日志（Model/API/前端/测试）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: 终态汇总**

```bash
cd D:/vibe_program/BloodTrack_tumor && git log --oneline -25
```

应看到 M-P4 相关的 22+ 个 commit 序列，其中 spec 在最早。

---

## Spec 覆盖自检（计划完成时）

| Spec 章节 | 实现位置 |
|---|---|
| §4.1 Share Model | Task 3 |
| §4.2 dataSharing 总开关保留 | Task 6 业务前置 |
| §4.2 contracts 增补 | Task 1 |
| §4.2 deleteAccount 级联 | Task 10 |
| §4.2 contract-validator 第 4 项 | Task 5 |
| §5 受保护 API | Task 6 + 7 |
| §5 50 上限 / 总开关守门 / FRONTEND_URL | Task 6 controller |
| §6.1 公开 5 端点 | Task 8（meta+verify）+ Task 9（3 资源）+ Task 10（路由） |
| §6.2 sessionStorage + X-Share-Pin | Task 14 service + Task 19 viewer |
| §6.3 loadShareWithPin helper | Task 8 |
| §6.4 错误码 404/410/403/401 | Task 2 (gone) + Task 8 + Task 9 + 测试 Task 11 |
| §6.5 限流 30/min + 5/min/IP+token | Task 10 |
| §7.1 Settings 我的分享 | Task 15 |
| §7.2 SharedView 状态机 | Task 19 |
| §7.3 新增文件清单 | Task 13–20 全覆盖 |
| §7.4 受邀者已登录边缘情况 | Task 13 publicApiClient (隔离 axios 实例) |
| §7.5 contracts 增补 | Task 1 |
| §8 测试矩阵 | Task 7 + 11 + 16 + 20 |
| §9 安全考量 | 全部并入实现 |
| §11 实现先后 10 步 | 22 个 task 顺序对齐 |
