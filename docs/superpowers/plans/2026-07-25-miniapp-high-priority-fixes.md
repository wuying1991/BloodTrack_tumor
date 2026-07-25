# Miniapp High-Priority Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the four approved high-priority miniapp issues: complete blood abnormality detection, lossless calendar date-range loading, fail-fast production configuration, and per-device refresh-token revocation.

**Architecture:** Keep the existing REST endpoints and add reusable backend date-range validation/filter helpers. Move refresh-token issuance and rotation into a focused session service backed by a TTL-indexed MongoDB model. Keep the miniapp API envelope stable while adding date filters, paged month loading, development-only diagnostics, and refresh-token-based logout.

**Tech Stack:** Express, Mongoose, JWT, Jest/Supertest, uni-app, Vue 3, TypeScript, Vite, Vitest.

---

## File Map

### Backend

- Create `backend/src/constants/bloodRanges.ts`: canonical backend blood ranges and abnormality helper.
- Create `backend/src/utils/dateRange.ts`: build MongoDB date and overlap filters from validated query values.
- Create `backend/src/models/RefreshSession.ts`: hashed per-device refresh sessions with TTL cleanup.
- Create `backend/src/services/auth/refreshSessionService.ts`: issue, rotate, and revoke token pairs.
- Create `backend/src/__tests__/unit/bloodRanges.test.ts`: abnormality unit tests.
- Create `backend/src/__tests__/unit/dateRange.test.ts`: query-filter unit tests.
- Modify `backend/src/models/BloodTest.ts`: delegate `isAbnormal` to the canonical helper.
- Modify `backend/src/middlewares/validationMiddleware.ts`: validate optional query date boundaries.
- Modify four route files: attach date-range validation to list routes.
- Modify four controllers: apply server-side date filtering.
- Modify `backend/src/__tests__/integration/*.test.ts`: date-range behavior and refresh-session flows.
- Modify `backend/src/controllers/authController.ts`: use the refresh-session service.
- Modify `backend/src/routes/authRoutes.ts`: make logout refresh-token authenticated rather than access-token protected.

### Miniapp

- Create `miniapp/src/utils/pagination.ts`: read all pages from an existing paginated endpoint.
- Create `miniapp/src/utils/__tests__/calendar.test.ts`: month-boundary tests.
- Create `miniapp/src/utils/__tests__/pagination.test.ts`: multi-page aggregation tests.
- Create `miniapp/scripts/validate-production-env.mjs`: reject missing/insecure production configuration.
- Create `miniapp/scripts/finalize-weixin-build.mjs`: inject AppID and enable URL checks in the production output.
- Modify `miniapp/src/utils/calendar.ts`: expose ISO month boundaries.
- Modify three paginated API modules and reminder API: accept date filters.
- Modify `miniapp/src/pages/records/calendar.vue`: range-filtered, all-page, last-request-wins loading.
- Modify `miniapp/src/api/auth.ts` and `miniapp/src/stores/auth.ts`: submit the current refresh token on logout without access-token refresh.
- Modify `miniapp/src/config/env.ts`, `miniapp/src/api/http.ts`, and login page: production-safe network behavior.
- Modify `miniapp/vite.config.ts`, `miniapp/package.json`, `miniapp/package-lock.json`, and `miniapp/src/env.d.ts`: test/config support.
- Create `miniapp/.env.production.example`: documented production inputs.

---

### Task 1: Canonical blood abnormality detection

**Files:**
- Create: `backend/src/constants/bloodRanges.ts`
- Create: `backend/src/__tests__/unit/bloodRanges.test.ts`
- Modify: `backend/src/models/BloodTest.ts`

- [ ] **Step 1: Write the failing unit tests**

Create table-driven tests that exercise the desired pure helper:

```ts
import { isBloodTestAbnormal } from '../../constants/bloodRanges';

const normal = { wbc: 5, rbc: 4.5, hgb: 130, plt: 180, neu: 3, lym: 2, crp: 2 };

describe('isBloodTestAbnormal', () => {
  test.each([
    ['NEU low', { neu: 1.7 }],
    ['NEU high', { neu: 6.4 }],
    ['LYM low', { lym: 0.9 }],
    ['LYM high', { lym: 4.9 }],
  ])('%s marks the record abnormal', (_label, override) => {
    expect(isBloodTestAbnormal({ ...normal, ...override })).toBe(true);
  });

  test('optional NEU/LYM are ignored when absent', () => {
    const { neu, lym, ...withoutOptional } = normal;
    expect(isBloodTestAbnormal(withoutOptional)).toBe(false);
  });

  test('inclusive boundaries remain normal', () => {
    expect(isBloodTestAbnormal({ ...normal, neu: 1.8, lym: 4.8 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd backend
npx jest --runInBand src/__tests__/unit/bloodRanges.test.ts
```

Expected: FAIL because `constants/bloodRanges` does not exist.

- [ ] **Step 3: Implement the canonical helper**

Create a typed range map and test only defined values:

```ts
export const BLOOD_NORMAL_RANGES = {
  wbc: { min: 4, max: 10 },
  rbc: { min: 3.5, max: 5.8 },
  hgb: { min: 110, max: 165 },
  plt: { min: 100, max: 300 },
  neu: { min: 1.8, max: 6.3 },
  lym: { min: 1, max: 4.8 },
  crp: { min: 0, max: 10 },
} as const;

export type BloodMetricValues = Partial<Record<keyof typeof BLOOD_NORMAL_RANGES, number>>;

export function isBloodTestAbnormal(values: BloodMetricValues): boolean {
  return Object.entries(BLOOD_NORMAL_RANGES).some(([key, range]) => {
    const value = values[key as keyof BloodMetricValues];
    return value != null && (value < range.min || value > range.max);
  });
}
```

Update the Mongoose pre-save hook to pass WBC/RBC/HGB/PLT/NEU/LYM/CRP into the helper.

- [ ] **Step 4: Verify GREEN and model integration**

Run:

```bash
cd backend
npx jest --runInBand src/__tests__/unit/bloodRanges.test.ts src/__tests__/contracts/bloodTest.contract.test.ts
```

Expected: both suites PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/constants/bloodRanges.ts backend/src/models/BloodTest.ts backend/src/__tests__/unit/bloodRanges.test.ts
git commit -m "fix: include neutrophils and lymphocytes in blood abnormality"
```

### Task 2: Date-range validation and backend filtering

**Files:**
- Create: `backend/src/utils/dateRange.ts`
- Create: `backend/src/__tests__/unit/dateRange.test.ts`
- Modify: `backend/src/middlewares/validationMiddleware.ts`
- Modify: `backend/src/routes/bloodTestRoutes.ts`
- Modify: `backend/src/routes/biochemTestRoutes.ts`
- Modify: `backend/src/routes/chemoCycleRoutes.ts`
- Modify: `backend/src/routes/reminderRoutes.ts`
- Modify: `backend/src/controllers/bloodTestController.ts`
- Modify: `backend/src/controllers/biochemTestController.ts`
- Modify: `backend/src/controllers/chemoCycleController.ts`
- Modify: `backend/src/controllers/reminderController.ts`
- Test: existing integration suites for the four resources

- [ ] **Step 1: Write failing filter-helper tests**

Test the exact Mongo shapes:

```ts
import { buildDateFilter, buildOverlapFilter } from '../../utils/dateRange';

test('buildDateFilter creates an inclusive range', () => {
  expect(buildDateFilter('2026-07-01T00:00:00.000Z', '2026-07-31T23:59:59.999Z')).toEqual({
    $gte: new Date('2026-07-01T00:00:00.000Z'),
    $lte: new Date('2026-07-31T23:59:59.999Z'),
  });
});

test('buildOverlapFilter finds cycles intersecting the range', () => {
  expect(buildOverlapFilter('2026-07-01T00:00:00.000Z', '2026-07-31T23:59:59.999Z')).toEqual({
    startDate: { $lte: new Date('2026-07-31T23:59:59.999Z') },
    endDate: { $gte: new Date('2026-07-01T00:00:00.000Z') },
  });
});
```

- [ ] **Step 2: Run and verify RED**

```bash
cd backend
npx jest --runInBand src/__tests__/unit/dateRange.test.ts
```

Expected: FAIL because `utils/dateRange` does not exist.

- [ ] **Step 3: Implement pure date-filter builders**

Implement:

```ts
export function buildDateFilter(startDate?: string, endDate?: string) {
  const filter: { $gte?: Date; $lte?: Date } = {};
  if (startDate) filter.$gte = new Date(startDate);
  if (endDate) filter.$lte = new Date(endDate);
  return Object.keys(filter).length ? filter : undefined;
}

export function buildOverlapFilter(startDate?: string, endDate?: string) {
  return {
    ...(endDate ? { startDate: { $lte: new Date(endDate) } } : {}),
    ...(startDate ? { endDate: { $gte: new Date(startDate) } } : {}),
  };
}
```

- [ ] **Step 4: Add failing route validation and integration cases**

Add integration assertions for:

```ts
const filtered = await request(app)
  .get('/api/blood-tests?startDate=2026-07-01T00:00:00.000Z&endDate=2026-07-31T23:59:59.999Z')
  .set('Authorization', `Bearer ${token}`);
expect(filtered.body.data.every((x: any) => x.date.startsWith('2026-07'))).toBe(true);

const invalid = await request(app)
  .get('/api/blood-tests?startDate=not-a-date')
  .set('Authorization', `Bearer ${token}`);
expect(invalid.status).toBe(422);

const reversed = await request(app)
  .get('/api/blood-tests?startDate=2026-08-01&endDate=2026-07-01')
  .set('Authorization', `Bearer ${token}`);
expect(reversed.status).toBe(422);
```

Add these explicit cases:

- `GET /api/biochem-tests` with a July range returns the July record and excludes the June record.
- `GET /api/reminders` with a July range returns the reminder due July 31 and excludes the one due August 1.
- `GET /api/chemo-cycles` with a July range returns a cycle spanning June 20 through August 5.
- Each of the four list endpoints returns 422 for `startDate=not-a-date`.

- [ ] **Step 5: Run integration tests and verify RED**

```bash
cd backend
npx jest --runInBand \
  src/__tests__/contracts/bloodTest.contract.test.ts \
  src/__tests__/integration/biochemTest.integration.test.ts \
  src/__tests__/integration/chemoCycle.integration.test.ts \
  src/__tests__/integration/reminder.integration.test.ts
```

Expected: new filtering or validation assertions FAIL.

- [ ] **Step 6: Add shared validation and controller filters**

Add `validateDateRangeQuery` using `query('startDate').optional().isISO8601()`, the matching end-date rule, and a custom comparison rejecting `startDate > endDate`. Attach it after `validatePagination` where pagination applies.

Build controller filters before querying:

```ts
const filter: Record<string, unknown> = { user: req.user?._id };
const date = buildDateFilter(req.query.startDate as string | undefined, req.query.endDate as string | undefined);
if (date) filter.date = date;
```

For reminders use `filter.dueDate = date`. For cycles merge `buildOverlapFilter(...)` into `{ user }`. Use the same filter for list and `countDocuments` so pagination metadata remains accurate.

- [ ] **Step 7: Verify GREEN**

Re-run the command from Step 5. Expected: all selected suites PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/utils/dateRange.ts backend/src/__tests__/unit/dateRange.test.ts backend/src/middlewares/validationMiddleware.ts backend/src/routes backend/src/controllers backend/src/__tests__
git commit -m "fix: filter calendar resources by date range"
```

### Task 3: Miniapp test harness and lossless calendar loading

**Files:**
- Modify: `miniapp/package.json`
- Modify: `miniapp/package-lock.json`
- Modify: `miniapp/vite.config.ts`
- Create: `miniapp/src/utils/pagination.ts`
- Create: `miniapp/src/utils/__tests__/calendar.test.ts`
- Create: `miniapp/src/utils/__tests__/pagination.test.ts`
- Modify: `miniapp/src/utils/calendar.ts`
- Modify: `miniapp/src/api/bloodTest.ts`
- Modify: `miniapp/src/api/biochem.ts`
- Modify: `miniapp/src/api/chemoCycle.ts`
- Modify: `miniapp/src/api/reminder.ts`
- Modify: `miniapp/src/pages/records/calendar.vue`

- [ ] **Step 1: Install and configure Vitest**

Run:

```bash
cd miniapp
npm install --save-dev vitest@^2.1.9
```

Add `"test": "vitest run"` and configure the `@` alias in `vite.config.ts` with `fileURLToPath(new URL('./src', import.meta.url))`.

- [ ] **Step 2: Write failing month-range and pagination tests**

```ts
import { monthIsoRange } from '../calendar';
import { collectAllPages } from '../pagination';

test('monthIsoRange covers leap-year February in local time', () => {
  const range = monthIsoRange(2028, 1);
  expect(new Date(range.startDate).getDate()).toBe(1);
  expect(new Date(range.endDate).getDate()).toBe(29);
  expect(new Date(range.endDate).getHours()).toBe(23);
});

test('collectAllPages concatenates every server page', async () => {
  const fetcher = vi.fn(async (page: number) => ({
    data: page === 1 ? ['a'] : ['b'],
    pagination: { page, pages: 2, limit: 100, total: 2 },
  }));
  await expect(collectAllPages(fetcher)).resolves.toEqual(['a', 'b']);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 3: Run and verify RED**

```bash
cd miniapp
npm test
```

Expected: FAIL because `monthIsoRange` and `collectAllPages` do not exist.

- [ ] **Step 4: Implement the pure utilities**

```ts
export function monthIsoRange(year: number, monthIndex: number) {
  return {
    startDate: new Date(year, monthIndex, 1, 0, 0, 0, 0).toISOString(),
    endDate: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).toISOString(),
  };
}

export async function collectAllPages<T>(
  fetchPage: (page: number) => Promise<{ data: T[]; pagination: { page: number; pages: number } }>
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page += 1) {
    const result = await fetchPage(page);
    items.push(...result.data);
    if (result.pagination.page >= result.pagination.pages) return items;
  }
}
```

- [ ] **Step 5: Extend API parameters and update calendar loading**

Use a shared shape:

```ts
interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}
```

Pass these fields through GET `data`. In `calendar.vue`, snapshot `year/month`, compute the range, increment `loadSequence`, and call:

```ts
const [blood, biochem, cycles, reminderRes] = await Promise.all([
  collectAllPages((page) => bloodApi.listBloodTests(page, 100, range)),
  collectAllPages((page) => biochemApi.listBiochemTests(page, 100, range)),
  collectAllPages((page) => cycleApi.listChemoCycles(page, 100, range)),
  reminderApi.listReminders({ status: 'all', ...range }),
]);
if (sequence !== loadSequence) return;
```

Build the day map from those arrays. In `catch` and `finally`, mutate error/loading only when the sequence is still current.

- [ ] **Step 6: Verify GREEN**

```bash
cd miniapp
npm test
npm run type-check
```

Expected: unit tests and type-check PASS.

- [ ] **Step 7: Commit**

```bash
git add miniapp/package.json miniapp/package-lock.json miniapp/vite.config.ts miniapp/src/utils miniapp/src/api miniapp/src/pages/records/calendar.vue
git commit -m "fix: load complete calendar months by date range"
```

### Task 4: Per-device refresh sessions

**Files:**
- Create: `backend/src/models/RefreshSession.ts`
- Create: `backend/src/services/auth/refreshSessionService.ts`
- Modify: `backend/src/controllers/authController.ts`
- Modify: `backend/src/routes/authRoutes.ts`
- Modify: `backend/src/__tests__/integration/auth.integration.test.ts`
- Modify: `backend/src/__tests__/integration/smsAuth.integration.test.ts`

- [ ] **Step 1: Write failing per-device integration tests**

Add isolated logins A and B and assert:

```ts
const loginA = await request(app).post('/api/auth/login').send(credentials);
const loginB = await request(app).post('/api/auth/login').send(credentials);

const rotatedA = await request(app)
  .post('/api/auth/refresh-token')
  .send({ refreshToken: loginA.body.data.refreshToken });
expect(rotatedA.status).toBe(200);

const replayA = await request(app)
  .post('/api/auth/refresh-token')
  .send({ refreshToken: loginA.body.data.refreshToken });
expect(replayA.status).toBe(401);

const logoutA = await request(app)
  .post('/api/auth/logout')
  .send({ refreshToken: rotatedA.body.data.refreshToken });
expect(logoutA.status).toBe(200);

expect((await request(app).post('/api/auth/refresh-token')
  .send({ refreshToken: rotatedA.body.data.refreshToken })).status).toBe(401);
expect((await request(app).post('/api/auth/refresh-token')
  .send({ refreshToken: loginB.body.data.refreshToken })).status).toBe(200);
```

Also decode a login token to obtain `jti`, load the session, and assert `tokenHash !== refreshToken`.

- [ ] **Step 2: Run and verify RED**

```bash
cd backend
npx jest --runInBand src/__tests__/integration/auth.integration.test.ts src/__tests__/integration/smsAuth.integration.test.ts
```

Expected: old refresh tokens and logged-out tokens remain valid, or the session model is missing.

- [ ] **Step 3: Implement the session model**

Create a schema with `user`, unique `jti`, `tokenHash`, `expiresAt`, nullable `revokedAt` and `replacedByJti`, timestamps, plus:

```ts
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshSessionSchema.index({ user: 1, revokedAt: 1 });
```

- [ ] **Step 4: Implement issue, rotate, and revoke**

Use `crypto.randomUUID()` for `jti` and SHA-256 for the stored token hash. The public service API is:

```ts
export async function issueTokenPair(userId: string): Promise<TokenPair>;
export async function rotateTokenPair(refreshToken: string): Promise<{ userId: string; tokens: TokenPair }>;
export async function revokeRefreshToken(refreshToken: string): Promise<string | null>;
```

Rotation must use a conditional update:

```ts
const revoked = await RefreshSession.findOneAndUpdate(
  { jti: decoded.jti, tokenHash: hashToken(token), revokedAt: null, expiresAt: { $gt: new Date() } },
  { $set: { revokedAt: new Date(), replacedByJti: nextJti } },
  { new: true }
);
if (!revoked) throw ApiError.unauthorized('无效的刷新令牌', 'AUTH_INVALID_REFRESH_TOKEN');
```

Then persist the next session and return the pair. If next-session creation fails, surface an authentication error and require re-login; never reactivate the consumed token.

- [ ] **Step 5: Wire every login path and public idempotent logout**

Await `issueTokenPair` in registration, password login, and SMS login. Replace controller refresh verification with `rotateTokenPair`.

Move the logout route to the public section. It must require a body token for useful revocation but return 200 for invalid/already-revoked tokens:

```ts
router.post('/logout', logoutUser);
```

Continue audit logging using the returned user ID when available; never log token material or full `jti`.

- [ ] **Step 6: Verify GREEN**

Re-run Step 2. Then run:

```bash
cd backend
npx jest --runInBand --no-coverage
npx tsc --noEmit
```

Expected: all suites and TypeScript PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/RefreshSession.ts backend/src/services/auth/refreshSessionService.ts backend/src/controllers/authController.ts backend/src/routes/authRoutes.ts backend/src/__tests__/integration
git commit -m "fix: revoke refresh tokens per device session"
```

### Task 5: Miniapp logout uses the current refresh token

**Files:**
- Modify: `miniapp/src/api/auth.ts`
- Modify: `miniapp/src/stores/auth.ts`
- Test: `miniapp/src/api/__tests__/logout.test.ts`

- [ ] **Step 1: Write a failing API test**

Mock `uni.request`, set a refresh token in storage, call logout, and assert the request body contains the token and no Authorization header:

```ts
expect(uni.request).toHaveBeenCalledWith(expect.objectContaining({
  url: expect.stringContaining('/auth/logout'),
  data: { refreshToken: 'device-refresh-token' },
  header: expect.not.objectContaining({ Authorization: expect.anything() }),
}));
```

- [ ] **Step 2: Run and verify RED**

```bash
cd miniapp
npm test -- src/api/__tests__/logout.test.ts
```

Expected: FAIL because logout sends `{}` as an authenticated request.

- [ ] **Step 3: Implement minimal logout behavior**

Change the API signature:

```ts
export async function logout(refreshToken: string): Promise<void> {
  await http.post('/auth/logout', { refreshToken }, true);
}
```

In the store, snapshot `getRefreshToken()` before the request, submit it, and preserve the existing `finally` token clearing.

- [ ] **Step 4: Verify GREEN**

```bash
cd miniapp
npm test -- src/api/__tests__/logout.test.ts
npm run type-check
```

- [ ] **Step 5: Commit**

```bash
git add miniapp/src/api/auth.ts miniapp/src/stores/auth.ts miniapp/src/api/__tests__/logout.test.ts
git commit -m "fix: revoke the current miniapp session on logout"
```

### Task 6: Fail-fast production miniapp configuration

**Files:**
- Create: `miniapp/scripts/validate-production-env.mjs`
- Create: `miniapp/scripts/finalize-weixin-build.mjs`
- Create: `miniapp/.env.production.example`
- Create: `miniapp/scripts/__tests__/production-config.test.mjs`
- Modify: `miniapp/package.json`
- Modify: `miniapp/src/config/env.ts`
- Modify: `miniapp/src/env.d.ts`
- Modify: `miniapp/src/api/http.ts`
- Modify: `miniapp/src/pages/auth/login.vue`
- Modify: `miniapp/src/manifest.json`

- [ ] **Step 1: Write failing Node configuration tests**

Use `node:test` to import pure exported helpers:

```js
test('rejects a missing production API URL', () => {
  assert.throws(() => validateProductionEnv({ VITE_WEIXIN_APP_ID: 'wx1234567890123456' }), /VITE_API_BASE_URL/);
});

test('rejects a non-HTTPS production API URL', () => {
  assert.throws(() => validateProductionEnv({
    VITE_API_BASE_URL: 'http://api.example.com/api',
    VITE_WEIXIN_APP_ID: 'wx1234567890123456',
  }), /https/);
});

test('rejects a missing Weixin AppID', () => {
  assert.throws(() => validateProductionEnv({ VITE_API_BASE_URL: 'https://api.example.com/api' }), /VITE_WEIXIN_APP_ID/);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
cd miniapp
node --test scripts/__tests__/production-config.test.mjs
```

Expected: FAIL because the validation script does not exist.

- [ ] **Step 3: Implement validation and output finalization**

The validation script must read `.env.production` without printing values, overlay explicit process environment variables, and require:

```text
VITE_API_BASE_URL=https://...
VITE_WEIXIN_APP_ID=wx...
```

The finalizer must validate again, load `dist/build/mp-weixin/project.config.json`, set:

```js
config.appid = env.VITE_WEIXIN_APP_ID;
config.setting.urlCheck = true;
```

and write formatted JSON. It must target only that explicit build file.

- [ ] **Step 4: Make the production build pipeline fail-fast**

Change the script to:

```json
"build:mp-weixin": "node scripts/validate-production-env.mjs && uni build -p mp-weixin && node scripts/finalize-weixin-build.mjs"
```

Keep `dev:mp-weixin` unchanged. Add `VITE_WEIXIN_APP_ID` to `env.d.ts`. Set source `manifest.json` URL checking to true; add a developer-only `project.private.config.json` workflow to the README rather than shipping production defaults with checks disabled.

- [ ] **Step 5: Make runtime diagnostics mode-aware**

In `env.ts` export `IS_DEVELOPMENT = import.meta.env.DEV`. Production must throw if the API is absent or non-HTTPS; development may retain the localhost fallback.

In `http.ts`, use the local-backend hint only when `IS_DEVELOPMENT`; otherwise show `网络异常，请检查网络后重试`.

Wrap login diagnostics:

```vue
<view v-if="isDevelopment" class="hint">
  ...
</view>
```

- [ ] **Step 6: Verify tests and both build outcomes**

```bash
cd miniapp
node --test scripts/__tests__/production-config.test.mjs
npm run type-check
env -u VITE_API_BASE_URL -u VITE_WEIXIN_APP_ID npm run build:mp-weixin
```

Expected for the last command: non-zero exit with a clear missing-variable error.

Then verify success without using a real production secret:

```bash
cd miniapp
VITE_API_BASE_URL=https://api.example.test/api \
VITE_WEIXIN_APP_ID=wx1234567890123456 \
npm run build:mp-weixin
```

Expected: PASS, and `dist/build/mp-weixin/project.config.json` contains the supplied AppID and `"urlCheck": true`.

- [ ] **Step 7: Commit**

```bash
git add miniapp/scripts miniapp/.env.production.example miniapp/package.json miniapp/src/config/env.ts miniapp/src/env.d.ts miniapp/src/api/http.ts miniapp/src/pages/auth/login.vue miniapp/src/manifest.json miniapp/README.md
git commit -m "fix: fail production miniapp builds with unsafe config"
```

### Task 7: Full verification and handoff

**Files:**
- Modify: `miniapp/README.md`
- Modify: `DEVLOG.md`

- [ ] **Step 1: Run backend verification**

```bash
cd backend
npx tsc --noEmit
npx jest --runInBand --no-coverage
npm run contract:check
```

Expected: zero TypeScript errors, all Jest suites PASS, contract validator PASS.

Record the exact suite/test counts and commands in `DEVLOG.md`.

- [ ] **Step 2: Run miniapp verification**

```bash
cd miniapp
npm test
npm run type-check
VITE_API_BASE_URL=https://api.example.test/api \
VITE_WEIXIN_APP_ID=wx1234567890123456 \
npm run build:mp-weixin
```

Expected: all tests PASS, type-check PASS, build PASS.

Update `miniapp/README.md` with the required production variables, the fail-fast build behavior, and the one-time re-login note for pre-session refresh tokens.

- [ ] **Step 3: Inspect the production artifact**

Confirm:

```bash
node -e "const p=require('./miniapp/dist/build/mp-weixin/project.config.json'); if(p.appid!=='wx1234567890123456'||p.setting.urlCheck!==true) process.exit(1)"
rg -n \"127\\.0\\.0\\.1|代理绕过\" miniapp/dist/build/mp-weixin
```

Expected: first command exits 0; second command finds no user-visible production diagnostics.

- [ ] **Step 4: Review the final diff**

```bash
git diff --check
git status --short
git diff --stat HEAD~6..HEAD
```

Confirm only scoped source, test, lockfile, and documentation changes are included. Ignore the pre-existing tracked `backend/node_modules` worktree noise and never stage it.

- [ ] **Step 5: Final commit if verification required documentation-only changes**

```bash
git add miniapp/README.md DEVLOG.md
git commit -m "docs: record miniapp high-priority fix verification"
```
