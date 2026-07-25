# Miniapp Medium-Priority Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate stale miniapp data writes, harden production-only behavior and image handling, restore refresh-token-only sessions, and add a safe account-deletion flow.

**Architecture:** Keep the existing page-local data flows and add one framework-free request epoch primitive plus one pagination merge helper. Refactor token refresh into a shared single-flight operation used by both HTTP retries and app bootstrap; implement the remaining production and account controls surgically in their existing pages.

**Tech Stack:** Vue 3, Pinia, uni-app/WeChat Mini Program APIs, TypeScript, Vitest, Express/Jest integration tests.

---

## File Map

**New files**

- `miniapp/src/utils/requestEpoch.ts` — creates monotonic request generations and checks whether an async result is still current.
- `miniapp/src/utils/__tests__/requestEpoch.test.ts` — verifies request invalidation semantics.
- `miniapp/src/utils/labImage.ts` — defines the client image-size ceiling and wraps file-size validation.
- `miniapp/src/utils/__tests__/labImage.test.ts` — verifies allowed, oversized, and unknown-size image handling.
- `miniapp/src/utils/devFeatures.ts` — centralizes development-only value/feature gating.
- `miniapp/src/utils/__tests__/devFeatures.test.ts` — verifies production never exposes returned development values.
- `miniapp/src/stores/__tests__/auth.test.ts` — verifies refresh-only bootstrap and local session clearing.

**Modified files**

- `miniapp/src/utils/pagination.ts` and `miniapp/src/utils/__tests__/pagination.test.ts` — add stable `_id` deduplication for appended pages.
- `miniapp/src/pages/analytics/index.vue` — apply latest-request-wins and remove duplicate watcher/onShow loads.
- `miniapp/src/pages/records/reminder-list.vue` — prevent stale status-filter responses from overwriting the current selection.
- `miniapp/src/pages/records/blood-list.vue` — make reload, pull-to-refresh, and pagination generation-safe.
- `miniapp/src/pages/records/biochem-list.vue` — add the same generation protection and missing busy guard.
- `miniapp/src/pages/records/cycle-list.vue` — add the same generation protection and missing busy guard.
- `miniapp/src/api/http.ts` — expose one shared single-flight refresh operation.
- `miniapp/src/stores/auth.ts` — restore sessions from refresh token alone and add local-only session clearing.
- `miniapp/src/pages/auth/register.vue` — gate development SMS codes.
- `miniapp/src/pages/settings/account.vue` — gate development SMS codes and add account deletion.
- `miniapp/src/pages/records/blood-form.vue` — hide the Mock demo in production and reject oversized files before Base64 conversion.
- `miniapp/src/api/auth.ts` and `miniapp/src/api/__tests__/auth.test.ts` — add and verify the delete-account request.
- `DEVLOG.md` — record the medium-priority fixes and verification evidence.

## Task 1: Add Request Epoch and Pagination Merge Primitives

**Files:**

- Create: `miniapp/src/utils/requestEpoch.ts`
- Create: `miniapp/src/utils/__tests__/requestEpoch.test.ts`
- Modify: `miniapp/src/utils/pagination.ts`
- Modify: `miniapp/src/utils/__tests__/pagination.test.ts`

- [ ] **Step 1: Write the failing request epoch tests**

Create `miniapp/src/utils/__tests__/requestEpoch.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { createRequestEpoch } from '../requestEpoch';

describe('createRequestEpoch', () => {
  test('a newer replacement invalidates an older request', () => {
    const epoch = createRequestEpoch();
    const first = epoch.begin();
    const second = epoch.begin();

    expect(epoch.isCurrent(first)).toBe(false);
    expect(epoch.isCurrent(second)).toBe(true);
  });

  test('capture shares the current generation with load-more work', () => {
    const epoch = createRequestEpoch();
    const replacement = epoch.begin();

    expect(epoch.capture()).toBe(replacement);
    expect(epoch.isCurrent(epoch.capture())).toBe(true);
  });

  test('invalidate prevents page-destroyed work from committing', () => {
    const epoch = createRequestEpoch();
    const request = epoch.begin();

    epoch.invalidate();

    expect(epoch.isCurrent(request)).toBe(false);
  });
});
```

- [ ] **Step 2: Extend pagination tests with deduplication cases**

Append to `miniapp/src/utils/__tests__/pagination.test.ts`:

```ts
import { appendUniqueById, collectAllPages } from '../pagination';

describe('appendUniqueById', () => {
  test('keeps existing order and appends only unseen records', () => {
    expect(
      appendUniqueById(
        [{ _id: 'a', value: 1 }],
        [{ _id: 'a', value: 9 }, { _id: 'b', value: 2 }]
      )
    ).toEqual([
      { _id: 'a', value: 1 },
      { _id: 'b', value: 2 },
    ]);
  });
});
```

Replace the existing single import of `collectAllPages` rather than adding a duplicate import.

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/utils/__tests__/requestEpoch.test.ts src/utils/__tests__/pagination.test.ts
```

Expected: FAIL because `requestEpoch.ts` and `appendUniqueById` do not exist.

- [ ] **Step 4: Implement the minimal primitives**

Create `miniapp/src/utils/requestEpoch.ts`:

```ts
export interface RequestEpoch {
  begin(): number;
  capture(): number;
  isCurrent(epoch: number): boolean;
  invalidate(): void;
}

export function createRequestEpoch(): RequestEpoch {
  let current = 0;
  return {
    begin() {
      current += 1;
      return current;
    },
    capture() {
      return current;
    },
    isCurrent(epoch) {
      return epoch === current;
    },
    invalidate() {
      current += 1;
    },
  };
}
```

Add to `miniapp/src/utils/pagination.ts`:

```ts
export function appendUniqueById<T extends { _id: string }>(
  current: T[],
  incoming: T[]
): T[] {
  const seen = new Set(current.map((item) => item._id));
  return [
    ...current,
    ...incoming.filter((item) => {
      if (seen.has(item._id)) return false;
      seen.add(item._id);
      return true;
    }),
  ];
}
```

- [ ] **Step 5: Run focused tests and type-check**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/utils/__tests__/requestEpoch.test.ts src/utils/__tests__/pagination.test.ts
npm run type-check
```

Expected: both test files PASS and `vue-tsc` exits 0.

- [ ] **Step 6: Commit**

```bash
git add miniapp/src/utils/requestEpoch.ts miniapp/src/utils/__tests__/requestEpoch.test.ts miniapp/src/utils/pagination.ts miniapp/src/utils/__tests__/pagination.test.ts
git commit -m "test: add miniapp request lifecycle primitives"
```

## Task 2: Make Analytics and Reminder Filters Latest-Request-Wins

**Files:**

- Modify: `miniapp/src/pages/analytics/index.vue`
- Modify: `miniapp/src/pages/records/reminder-list.vue`
- Test: `miniapp/src/utils/__tests__/requestEpoch.test.ts`

- [ ] **Step 1: Add an async stale-result test**

Append to `miniapp/src/utils/__tests__/requestEpoch.test.ts`:

```ts
test('only the newest out-of-order response is eligible to commit', async () => {
  const epoch = createRequestEpoch();
  const committed: string[] = [];
  let resolveOld!: (value: string) => void;
  let resolveNew!: (value: string) => void;

  const run = async (promise: Promise<string>) => {
    const request = epoch.begin();
    const value = await promise;
    if (epoch.isCurrent(request)) committed.push(value);
  };

  const oldWork = run(new Promise((resolve) => { resolveOld = resolve; }));
  const newWork = run(new Promise((resolve) => { resolveNew = resolve; }));
  resolveNew('new');
  await newWork;
  resolveOld('old');
  await oldWork;

  expect(committed).toEqual(['new']);
});
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/utils/__tests__/requestEpoch.test.ts
```

Expected: PASS; this characterizes the primitive before page wiring.

- [ ] **Step 3: Wire the epoch into analytics**

In `miniapp/src/pages/analytics/index.vue`:

- Remove `watch` from the Vue import.
- Import `onUnload` from `@dcloudio/uni-app`.
- Import `createRequestEpoch`.
- Create `const loadEpoch = createRequestEpoch();`.
- Make selection handlers trigger exactly one load:

```ts
function setRange(next: AnalyticsRange) {
  if (range.value === next) return;
  range.value = next;
  void load();
}

function setPanel(next: TrendPanel) {
  if (panel.value === next) return;
  panel.value = next;
  metric.value = defaultMetricForPanel(next);
  void load();
}
```

- Replace `load()` with a snapshot-based implementation:

```ts
async function load() {
  const request = loadEpoch.begin();
  const requestedPanel = panel.value;
  const requestedRange = range.value;
  error.value = '';
  loading.value = true;
  try {
    if (isBloodPanel(requestedPanel)) {
      const [trends, sum] = await Promise.all([
        analyticsApi.getBloodTrends(requestedRange),
        analyticsApi.getAnalyticsSummary(),
      ]);
      if (!loadEpoch.isCurrent(request)) return;
      bloodTrends.value = trends;
      summary.value = sum;
    } else {
      const trends = await analyticsApi.getBiochemTrends(requestedRange);
      if (!loadEpoch.isCurrent(request)) return;
      biochemTrends.value = trends;
    }
  } catch (err) {
    if (loadEpoch.isCurrent(request)) {
      error.value = getErrorMessage(err, '加载趋势失败');
    }
  } finally {
    if (loadEpoch.isCurrent(request)) loading.value = false;
  }
}
```

- Delete both existing watchers. Keep `onShow` as the single initial/re-entry load and call `void load()` once after applying the cached panel.
- Add `onUnload(() => loadEpoch.invalidate());`.

- [ ] **Step 4: Wire the epoch into reminder filtering**

In `miniapp/src/pages/records/reminder-list.vue`:

```ts
import { onShow, onUnload } from '@dcloudio/uni-app';
import { createRequestEpoch } from '@/utils/requestEpoch';

const loadEpoch = createRequestEpoch();

async function reload() {
  const request = loadEpoch.begin();
  const requestedStatus = status.value;
  error.value = '';
  loading.value = true;
  try {
    const res = await reminderApi.listReminders({ status: requestedStatus });
    if (loadEpoch.isCurrent(request)) items.value = res.data || [];
  } catch (err) {
    if (loadEpoch.isCurrent(request)) error.value = getErrorMessage(err);
  } finally {
    if (loadEpoch.isCurrent(request)) loading.value = false;
  }
}
```

Replace pull-to-refresh with:

```ts
async function onPull() {
  if (loading.value || refreshing.value) return;
  const request = loadEpoch.begin();
  const requestedStatus = status.value;
  refreshing.value = true;
  error.value = '';
  try {
    const res = await reminderApi.listReminders({ status: requestedStatus });
    if (loadEpoch.isCurrent(request)) items.value = res.data || [];
  } catch (err) {
    if (loadEpoch.isCurrent(request)) error.value = getErrorMessage(err);
  } finally {
    if (loadEpoch.isCurrent(request)) refreshing.value = false;
  }
}

function setStatus(next: ReminderStatusFilter) {
  if (status.value === next) return;
  status.value = next;
  void reload();
}
```

Add:

```ts
onUnload(() => loadEpoch.invalidate());
```

- [ ] **Step 5: Run tests and type-check**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/utils/__tests__/requestEpoch.test.ts
npm run type-check
```

Expected: tests PASS and type-check exits 0.

- [ ] **Step 6: Commit**

```bash
git add miniapp/src/pages/analytics/index.vue miniapp/src/pages/records/reminder-list.vue miniapp/src/utils/__tests__/requestEpoch.test.ts
git commit -m "fix: ignore stale miniapp filter responses"
```

## Task 3: Protect Paginated Lists From Refresh/Append Races

**Files:**

- Modify: `miniapp/src/pages/records/blood-list.vue`
- Modify: `miniapp/src/pages/records/biochem-list.vue`
- Modify: `miniapp/src/pages/records/cycle-list.vue`
- Test: `miniapp/src/utils/__tests__/pagination.test.ts`

- [ ] **Step 1: Add a pagination-generation characterization test**

Append to `miniapp/src/utils/__tests__/pagination.test.ts`:

```ts
test('an old append can be rejected after a replacement load begins', () => {
  const epoch = createRequestEpoch();
  epoch.begin();
  const appendGeneration = epoch.capture();
  epoch.begin();

  expect(epoch.isCurrent(appendGeneration)).toBe(false);
});
```

Import `createRequestEpoch` from `../requestEpoch`.

- [ ] **Step 2: Run the pagination tests**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/utils/__tests__/pagination.test.ts
```

Expected: PASS; the test defines the generation rule pages must use.

- [ ] **Step 3: Update the blood-test list**

In `miniapp/src/pages/records/blood-list.vue`:

```ts
import { onShow, onUnload } from '@dcloudio/uni-app';
import { appendUniqueById } from '@/utils/pagination';
import { createRequestEpoch } from '@/utils/requestEpoch';

const listEpoch = createRequestEpoch();
```

Replace the shared `fetchPage` mutation with a fetch-only function:

```ts
function fetchPage(page: number) {
  return bloodApi.listBloodTests(page, pagination.value.limit);
}
```

Replace blood-list reload and pull-to-refresh with:

```ts
async function reload() {
  const generation = listEpoch.begin();
  loadingMore.value = false;
  error.value = '';
  loading.value = true;
  try {
    const res = await fetchPage(1);
    if (!listEpoch.isCurrent(generation)) return;
    items.value = res.data;
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) {
      error.value = getErrorMessage(err, '加载失败');
    }
  } finally {
    if (listEpoch.isCurrent(generation)) loading.value = false;
  }
}

async function onPullRefresh() {
  if (loading.value || refreshing.value) return;
  const generation = listEpoch.begin();
  loadingMore.value = false;
  refreshing.value = true;
  error.value = '';
  try {
    const res = await fetchPage(1);
    if (!listEpoch.isCurrent(generation)) return;
    items.value = res.data;
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) {
      error.value = getErrorMessage(err, '刷新失败');
    }
  } finally {
    if (listEpoch.isCurrent(generation)) refreshing.value = false;
  }
}
```

The explicit `loadingMore.value = false` is required because an invalidated append is not allowed to run its `finally`.

Replace `onLoadMore` with:

```ts
async function onLoadMore() {
  if (
    !hasMore.value ||
    loadingMore.value ||
    loading.value ||
    refreshing.value
  ) return;
  const generation = listEpoch.capture();
  const targetPage = pagination.value.page + 1;
  loadingMore.value = true;
  try {
    const res = await fetchPage(targetPage);
    if (
      !listEpoch.isCurrent(generation) ||
      pagination.value.page + 1 !== targetPage
    ) return;
    items.value = appendUniqueById(items.value, res.data);
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) {
      uni.showToast({ title: getErrorMessage(err, '加载更多失败'), icon: 'none' });
    }
  } finally {
    if (listEpoch.isCurrent(generation)) loadingMore.value = false;
  }
}
```

Add `onUnload(() => listEpoch.invalidate());`.

- [ ] **Step 4: Apply generation-safe state transitions to the biochem list**

In `miniapp/src/pages/records/biochem-list.vue`, change the lifecycle import and add the utility imports:

```ts
import { onShow, onUnload } from '@dcloudio/uni-app';
import { appendUniqueById } from '@/utils/pagination';
import { createRequestEpoch } from '@/utils/requestEpoch';
```

Create `const listEpoch = createRequestEpoch();` and use:

```ts
function fetchPage(page: number) {
  return biochemApi.listBiochemTests(page, pagination.value.limit);
}

async function reload() {
  const generation = listEpoch.begin();
  loadingMore.value = false;
  error.value = '';
  loading.value = true;
  try {
    const res = await fetchPage(1);
    if (!listEpoch.isCurrent(generation)) return;
    items.value = res.data;
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) error.value = getErrorMessage(err);
  } finally {
    if (listEpoch.isCurrent(generation)) loading.value = false;
  }
}

async function onPull() {
  if (loading.value || refreshing.value) return;
  const generation = listEpoch.begin();
  loadingMore.value = false;
  refreshing.value = true;
  error.value = '';
  try {
    const res = await fetchPage(1);
    if (!listEpoch.isCurrent(generation)) return;
    items.value = res.data;
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) error.value = getErrorMessage(err);
  } finally {
    if (listEpoch.isCurrent(generation)) refreshing.value = false;
  }
}

async function onMore() {
  if (!hasMore.value || loadingMore.value || loading.value || refreshing.value) {
    return;
  }
  const generation = listEpoch.capture();
  const targetPage = pagination.value.page + 1;
  loadingMore.value = true;
  try {
    const res = await fetchPage(targetPage);
    if (
      !listEpoch.isCurrent(generation) ||
      pagination.value.page + 1 !== targetPage
    ) return;
    items.value = appendUniqueById(items.value, res.data);
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) {
      uni.showToast({ title: getErrorMessage(err), icon: 'none' });
    }
  } finally {
    if (listEpoch.isCurrent(generation)) loadingMore.value = false;
  }
}

onUnload(() => listEpoch.invalidate());
```

- [ ] **Step 5: Apply generation-safe state transitions to the cycle list**

In `miniapp/src/pages/records/cycle-list.vue`, import `onUnload`, `appendUniqueById`, and `createRequestEpoch`, create `const listEpoch = createRequestEpoch();`, and use:

```ts
import { onShow, onUnload } from '@dcloudio/uni-app';
import { appendUniqueById } from '@/utils/pagination';
import { createRequestEpoch } from '@/utils/requestEpoch';

function fetchPage(page: number) {
  return cycleApi.listChemoCycles(page, pagination.value.limit);
}

async function reload() {
  const generation = listEpoch.begin();
  loadingMore.value = false;
  error.value = '';
  loading.value = true;
  try {
    const res = await fetchPage(1);
    if (!listEpoch.isCurrent(generation)) return;
    items.value = res.data;
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) error.value = getErrorMessage(err);
  } finally {
    if (listEpoch.isCurrent(generation)) loading.value = false;
  }
}

async function onPull() {
  if (loading.value || refreshing.value) return;
  const generation = listEpoch.begin();
  loadingMore.value = false;
  refreshing.value = true;
  error.value = '';
  try {
    const res = await fetchPage(1);
    if (!listEpoch.isCurrent(generation)) return;
    items.value = res.data;
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) error.value = getErrorMessage(err);
  } finally {
    if (listEpoch.isCurrent(generation)) refreshing.value = false;
  }
}

async function onMore() {
  if (!hasMore.value || loadingMore.value || loading.value || refreshing.value) {
    return;
  }
  const generation = listEpoch.capture();
  const targetPage = pagination.value.page + 1;
  loadingMore.value = true;
  try {
    const res = await fetchPage(targetPage);
    if (
      !listEpoch.isCurrent(generation) ||
      pagination.value.page + 1 !== targetPage
    ) return;
    items.value = appendUniqueById(items.value, res.data);
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) {
      uni.showToast({ title: getErrorMessage(err), icon: 'none' });
    }
  } finally {
    if (listEpoch.isCurrent(generation)) loadingMore.value = false;
  }
}

onUnload(() => listEpoch.invalidate());
```

- [ ] **Step 6: Run pagination tests and type-check**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/utils/__tests__/pagination.test.ts
npm run type-check
```

Expected: tests PASS and type-check exits 0.

- [ ] **Step 7: Commit**

```bash
git add miniapp/src/pages/records/blood-list.vue miniapp/src/pages/records/biochem-list.vue miniapp/src/pages/records/cycle-list.vue miniapp/src/utils/__tests__/pagination.test.ts
git commit -m "fix: serialize miniapp list pagination"
```

## Task 4: Restore Refresh-Token-Only Sessions

**Files:**

- Modify: `miniapp/src/api/http.ts`
- Modify: `miniapp/src/stores/auth.ts`
- Create: `miniapp/src/stores/__tests__/auth.test.ts`

- [ ] **Step 1: Write failing auth-store bootstrap tests**

Create `miniapp/src/stores/__tests__/auth.test.ts` with a mocked `uni` storage map, active Pinia, mocked `authApi.getProfile`, and mocked `refreshSession`:

```ts
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import * as authApi from '@/api/auth';
import { refreshSession } from '@/api/http';
import { useAuthStore } from '../auth';

vi.mock('@/api/auth', () => ({
  getProfile: vi.fn(),
}));
vi.mock('@/api/http', () => ({
  refreshSession: vi.fn(),
}));

const storage = new Map<string, string>();
vi.stubGlobal('uni', {
  getStorageSync: (key: string) => storage.get(key) || '',
  setStorageSync: (key: string, value: string) => storage.set(key, value),
  removeStorageSync: (key: string) => storage.delete(key),
});

describe('auth store bootstrap', () => {
  beforeEach(() => {
    storage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  test('refreshes before loading profile when only refresh token exists', async () => {
    storage.set('bt_refresh_token', 'refresh-only');
    vi.mocked(refreshSession).mockResolvedValue('new-access');
    vi.mocked(authApi.getProfile).mockResolvedValue({
      _id: 'u1',
      fullName: 'User',
    });

    const auth = useAuthStore();
    await auth.bootstrap();

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(auth.user?._id).toBe('u1');
  });

  test('clears the session when refresh recovery is rejected', async () => {
    storage.set('bt_refresh_token', 'expired-refresh');
    vi.mocked(refreshSession).mockResolvedValue(null);

    const auth = useAuthStore();
    await auth.bootstrap();

    expect(auth.user).toBeNull();
    expect(storage.size).toBe(0);
  });

  test('skips network work when no token exists', async () => {
    const auth = useAuthStore();
    await auth.bootstrap();

    expect(refreshSession).not.toHaveBeenCalled();
    expect(authApi.getProfile).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the auth-store tests and verify failure**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/stores/__tests__/auth.test.ts
```

Expected: FAIL because `refreshSession` is not exported and bootstrap does not recover from refresh token alone.

- [ ] **Step 3: Refactor refresh into one shared promise**

In `miniapp/src/api/http.ts`, replace the boolean/waiter refresh coordination with:

```ts
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await rawRequest({
      url: '/auth/refresh-token',
      method: 'POST',
      data: { refreshToken },
      skipAuth: true,
    });
    if (res.statusCode < 200 || res.statusCode >= 300) {
      clearTokens();
      return null;
    }
    const body = res.data as {
      success?: boolean;
      data?: { accessToken: string; refreshToken: string };
    };
    if (!body?.success || !body.data?.accessToken || !body.data?.refreshToken) {
      clearTokens();
      return null;
    }
    setTokens(body.data.accessToken, body.data.refreshToken);
    return body.data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

export function refreshSession(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
```

For a 401 retry, call `const newToken = await refreshSession()`. If it returns null, redirect and throw `AUTH_SESSION_EXPIRED`; otherwise retry once with `_retry: true`. Delete `isRefreshing`, `refreshWaiters`, and `notifyRefreshWaiters`.

- [ ] **Step 4: Update store bootstrap and add local-only clearing**

In `miniapp/src/stores/auth.ts`:

```ts
import { refreshSession } from '@/api/http';

async bootstrap() {
  if (this.bootstrapped) return;
  try {
    let token = getAccessToken();
    if (!token && getRefreshToken()) {
      token = (await refreshSession()) || '';
    }
    if (!token) {
      this.clearLocalSession();
      return;
    }
    this.user = await authApi.getProfile();
  } catch {
    this.clearLocalSession();
  } finally {
    this.bootstrapped = true;
  }
},

clearLocalSession() {
  clearTokens();
  this.user = null;
},
```

Use `this.clearLocalSession()` in the existing logout `finally`.

- [ ] **Step 5: Add local clearing assertions and run verification**

Extend the store test:

```ts
test('clearLocalSession removes tokens and user state', () => {
  storage.set('bt_access_token', 'access');
  storage.set('bt_refresh_token', 'refresh');
  const auth = useAuthStore();
  auth.user = { _id: 'u1', fullName: 'User' };

  auth.clearLocalSession();

  expect(auth.user).toBeNull();
  expect(storage.size).toBe(0);
});
```

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/stores/__tests__/auth.test.ts
npm run type-check
```

Expected: tests PASS and type-check exits 0.

- [ ] **Step 6: Commit**

```bash
git add miniapp/src/api/http.ts miniapp/src/stores/auth.ts miniapp/src/stores/__tests__/auth.test.ts
git commit -m "fix: recover miniapp sessions from refresh tokens"
```

## Task 5: Gate Development-Only SMS and Mock Features

**Files:**

- Create: `miniapp/src/utils/devFeatures.ts`
- Create: `miniapp/src/utils/__tests__/devFeatures.test.ts`
- Modify: `miniapp/src/pages/auth/register.vue`
- Modify: `miniapp/src/pages/settings/account.vue`
- Modify: `miniapp/src/pages/records/blood-form.vue`

- [ ] **Step 1: Write failing development-feature tests**

Create `miniapp/src/utils/__tests__/devFeatures.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { devOnlyValue, isDevFeatureEnabled } from '../devFeatures';

describe('development-only features', () => {
  test('production discards a server-returned development code', () => {
    expect(devOnlyValue('123456', false)).toBe('');
  });

  test('development keeps a returned development code', () => {
    expect(devOnlyValue('123456', true)).toBe('123456');
  });

  test('Mock demo is disabled in production', () => {
    expect(isDevFeatureEnabled(false)).toBe(false);
    expect(isDevFeatureEnabled(true)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/utils/__tests__/devFeatures.test.ts
```

Expected: FAIL because `devFeatures.ts` does not exist.

- [ ] **Step 3: Implement the pure development gate**

Create `miniapp/src/utils/devFeatures.ts`:

```ts
export function devOnlyValue(
  value: string | undefined,
  isDevelopment: boolean
): string {
  return isDevelopment ? value || '' : '';
}

export function isDevFeatureEnabled(isDevelopment: boolean): boolean {
  return isDevelopment;
}
```

- [ ] **Step 4: Apply the gate to registration and account SMS flows**

In both `register.vue` and `account.vue`:

```ts
import { IS_DEVELOPMENT } from '@/config/env';
import { devOnlyValue } from '@/utils/devFeatures';

const isDevelopment = IS_DEVELOPMENT;
```

Use `v-if="isDevelopment && devCode"` (or `devNew`/`devOld`) in templates. Replace direct assignment with:

```ts
devCode.value = devOnlyValue(res.devCode, isDevelopment);
```

In `register.vue`, use:

```vue
<view v-if="isDevelopment && devCode" class="dev-banner">
```

In `account.vue`, use:

```vue
<view
  v-if="isDevelopment && devNew"
  class="dev"
  @click="phoneCode = devNew"
>Mock：{{ devNew }}</view>
<view
  v-if="isDevelopment && devOld"
  class="dev"
  @click="oldPhoneCode = devOld"
>Mock：{{ devOld }}</view>
```

Replace the two account assignments with:

```ts
devNew.value = devOnlyValue(res.devCode, isDevelopment);
devOld.value = devOnlyValue(res.devCode, isDevelopment);
```

- [ ] **Step 5: Hide the no-image Mock demo in production**

In `miniapp/src/pages/records/blood-form.vue`, import `IS_DEVELOPMENT` and `isDevFeatureEnabled`, create:

```ts
const showMockDemo = isDevFeatureEnabled(IS_DEVELOPMENT);
```

Add `v-if="showMockDemo"` to the “演示识别” button. Do not change the server-controlled provider override list.

- [ ] **Step 6: Run tests, type-check, and production build**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/utils/__tests__/devFeatures.test.ts
npm run type-check
npm run build:mp-weixin:production
```

Expected: tests PASS, type-check exits 0, and production build completes.

- [ ] **Step 7: Commit**

```bash
git add miniapp/src/utils/devFeatures.ts miniapp/src/utils/__tests__/devFeatures.test.ts miniapp/src/pages/auth/register.vue miniapp/src/pages/settings/account.vue miniapp/src/pages/records/blood-form.vue
git commit -m "fix: hide miniapp development helpers in production"
```

## Task 6: Reject Oversized Lab Images Before Base64 Conversion

**Files:**

- Create: `miniapp/src/utils/labImage.ts`
- Create: `miniapp/src/utils/__tests__/labImage.test.ts`
- Modify: `miniapp/src/pages/records/blood-form.vue`

- [ ] **Step 1: Write failing size-policy tests**

Create `miniapp/src/utils/__tests__/labImage.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import {
  MAX_LAB_IMAGE_BYTES,
  validateLabImageSize,
} from '../labImage';

describe('validateLabImageSize', () => {
  test('accepts an image at the limit', () => {
    expect(validateLabImageSize(MAX_LAB_IMAGE_BYTES)).toBe(true);
  });

  test('rejects an image over the limit', () => {
    expect(validateLabImageSize(MAX_LAB_IMAGE_BYTES + 1)).toBe(false);
  });

  test('allows unknown size for server-side fallback validation', () => {
    expect(validateLabImageSize(undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/utils/__tests__/labImage.test.ts
```

Expected: FAIL because `labImage.ts` does not exist.

- [ ] **Step 3: Implement the image-size helper**

Create `miniapp/src/utils/labImage.ts`:

```ts
export const MAX_LAB_IMAGE_BYTES = Math.floor(4.5 * 1024 * 1024);

export function validateLabImageSize(size: number | undefined): boolean {
  return size == null || size <= MAX_LAB_IMAGE_BYTES;
}

export function getLocalFileSize(filePath: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    uni.getFileInfo({
      filePath,
      success: (res) => resolve(res.size),
      fail: () => resolve(undefined),
    });
  });
}
```

- [ ] **Step 4: Check size before reading Base64**

In the `chooseImage` success callback in `blood-form.vue`, before `readFileBase64(path)`:

```ts
const size = await getLocalFileSize(path);
if (!validateLabImageSize(size)) {
  error.value = '图片过大，请压缩或重新拍摄（建议 4.5MB 以内）';
  return;
}
```

Import both helpers from `@/utils/labImage`. Do not change the server-side 413 guard.

- [ ] **Step 5: Run tests and type-check**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/utils/__tests__/labImage.test.ts
npm run type-check
```

Expected: tests PASS and type-check exits 0.

- [ ] **Step 6: Commit**

```bash
git add miniapp/src/utils/labImage.ts miniapp/src/utils/__tests__/labImage.test.ts miniapp/src/pages/records/blood-form.vue
git commit -m "fix: validate miniapp lab image size early"
```

## Task 7: Add Safe Miniapp Account Deletion

**Files:**

- Modify: `miniapp/src/api/auth.ts`
- Modify: `miniapp/src/api/__tests__/auth.test.ts`
- Modify: `miniapp/src/stores/auth.ts`
- Modify: `miniapp/src/stores/__tests__/auth.test.ts`
- Modify: `miniapp/src/pages/settings/account.vue`

- [ ] **Step 1: Write the failing API test**

Extend `miniapp/src/api/__tests__/auth.test.ts` so the mocked HTTP object also has `delete: vi.fn()`, then add:

```ts
import { deleteAccount, logout } from '@/api/auth';

test('submits the current password to account deletion', async () => {
  vi.mocked(http.delete).mockResolvedValue({
    success: true,
    data: {},
  });

  await deleteAccount('current-password');

  expect(http.delete).toHaveBeenCalledWith('/auth/account', {
    password: 'current-password',
  });
});
```

Reset both mocked methods in `beforeEach`.

- [ ] **Step 2: Run the API test and verify failure**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/api/__tests__/auth.test.ts
```

Expected: FAIL because `deleteAccount` is not exported.

- [ ] **Step 3: Implement the API method**

Add to `miniapp/src/api/auth.ts`:

```ts
export async function deleteAccount(password: string): Promise<void> {
  await http.delete<ApiSuccess<Record<string, number>>>('/auth/account', {
    password,
  });
}
```

- [ ] **Step 4: Put success-only session clearing in the auth store**

Add this action to `miniapp/src/stores/auth.ts`:

```ts
async deleteAccount(password: string) {
  await authApi.deleteAccount(password);
  this.clearLocalSession();
},
```

Extend `miniapp/src/stores/__tests__/auth.test.ts`. Add `deleteAccount: vi.fn()` to the `@/api/auth` mock, then add:

```ts
test('deleteAccount clears the local session only after API success', async () => {
  storage.set('bt_access_token', 'access');
  storage.set('bt_refresh_token', 'refresh');
  vi.mocked(authApi.deleteAccount).mockResolvedValue(undefined);
  const auth = useAuthStore();
  auth.user = { _id: 'u1', fullName: 'User' };

  await auth.deleteAccount('correct-password');

  expect(authApi.deleteAccount).toHaveBeenCalledWith('correct-password');
  expect(auth.user).toBeNull();
  expect(storage.size).toBe(0);
});

test('deleteAccount preserves the session when the API rejects', async () => {
  storage.set('bt_access_token', 'access');
  storage.set('bt_refresh_token', 'refresh');
  vi.mocked(authApi.deleteAccount).mockRejectedValue(new Error('wrong password'));
  const auth = useAuthStore();
  auth.user = { _id: 'u1', fullName: 'User' };

  await expect(auth.deleteAccount('wrong-password')).rejects.toThrow(
    'wrong password'
  );

  expect(auth.user?._id).toBe('u1');
  expect(storage.get('bt_access_token')).toBe('access');
  expect(storage.get('bt_refresh_token')).toBe('refresh');
});
```

- [ ] **Step 5: Add the danger-zone UI**

At the bottom of `miniapp/src/pages/settings/account.vue`, before page-level error/success text, add:

```vue
<view class="card danger-zone">
  <text class="card-title danger-title">危险操作</text>
  <text class="hint">
    删除后，血检、生化、化疗周期、提醒和分享数据均不可恢复。
  </text>
  <template v-if="auth.user?.hasPassword">
    <input
      class="input"
      password
      v-model="deletePassword"
      placeholder="输入当前密码"
    />
    <button
      class="danger delete-account"
      :disabled="deleteBusy"
      :loading="deleteBusy"
      @click="onDeleteAccount"
    >
      永久删除账户
    </button>
  </template>
  <text v-else class="hint">请先在本页设置登录密码，再删除账户。</text>
</view>
```

Add state:

```ts
const deletePassword = ref('');
const deleteBusy = ref(false);
```

Add a promise wrapper:

```ts
function confirmAccountDeletion(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: '永久删除账户',
      content: '所有健康记录、提醒和分享数据将永久删除且无法恢复。确定继续吗？',
      confirmText: '永久删除',
      confirmColor: '#c0392b',
      success: (res) => resolve(res.confirm),
      fail: () => resolve(false),
    });
  });
}
```

Implement the action:

```ts
async function onDeleteAccount() {
  error.value = '';
  okMsg.value = '';
  const password = deletePassword.value;
  if (!password) {
    error.value = '请输入当前密码';
    return;
  }
  if (!(await confirmAccountDeletion())) return;

  deleteBusy.value = true;
  try {
    await auth.deleteAccount(password);
    uni.showToast({ title: '账户已删除', icon: 'success' });
    uni.reLaunch({ url: '/pages/auth/login' });
  } catch (err) {
    error.value = getErrorMessage(err, '删除账户失败');
  } finally {
    deleteBusy.value = false;
  }
}
```

Add scoped styles that visually separate the danger zone without changing other card/button styles:

```scss
.danger-zone {
  border: 1rpx solid #f1c7c2;
}
.danger-title {
  color: #a93226;
}
.delete-account {
  margin-top: 16rpx;
}
```

- [ ] **Step 6: Run miniapp API/store tests and type-check**

Run:

```bash
cd miniapp
npx vitest run --config vitest.config.ts src/api/__tests__/auth.test.ts src/stores/__tests__/auth.test.ts
npm run type-check
```

Expected: tests PASS and type-check exits 0.

- [ ] **Step 7: Run the existing backend deletion integration test**

Run:

```bash
cd backend
npm test -- --runInBand src/__tests__/integration/deleteAccount.integration.test.ts
```

Expected: the delete-account integration suite passes, including cascade cleanup and wrong-password rejection.

- [ ] **Step 8: Commit**

```bash
git add miniapp/src/api/auth.ts miniapp/src/api/__tests__/auth.test.ts miniapp/src/stores/auth.ts miniapp/src/stores/__tests__/auth.test.ts miniapp/src/pages/settings/account.vue
git commit -m "feat: add safe miniapp account deletion"
```

## Task 8: Full Regression, Manual Race Checks, and Documentation

**Files:**

- Modify: `DEVLOG.md`

- [ ] **Step 1: Run all miniapp tests**

Run:

```bash
cd miniapp
npm test
```

Expected: all Vitest suites pass with no unhandled errors.

- [ ] **Step 2: Run miniapp type-check and production build**

Run:

```bash
cd miniapp
npm run type-check
npm run build:mp-weixin:production
```

Expected: `vue-tsc` exits 0 and the production WeChat build completes with validated HTTPS API/AppID configuration.

- [ ] **Step 3: Run the full backend regression**

Run:

```bash
cd backend
npm test -- --runInBand
```

Expected: all backend suites pass. If the existing audit-log integration flake reappears, rerun that exact suite once and record both outputs rather than silently treating the first failure as success.

- [ ] **Step 4: Perform focused interaction checks in WeChat DevTools**

Use the production build output and verify:

1. Rapidly switch analytics between blood/liver/kidney and `1m/3m/6m`; the final chart matches the final controls.
2. Trigger list refresh near the bottom while a load-more response is pending; no duplicate or wrong-page records appear.
3. Confirm registration, account settings, and blood-form pages do not display development SMS codes or “演示识别”.
4. Select an image larger than 4.5 MB; the page rejects it before showing an OCR loading state.
5. Enter a wrong deletion password; the account stays logged in and shows an error.
6. Cancel the deletion modal; no API request is sent.
7. Confirm deletion with the correct password on a disposable test account; all local tokens are removed and the login page opens.

Expected: all seven checks match the stated behavior. If WeChat DevTools is unavailable, record these as the only outstanding manual checks and do not claim they were run.

- [ ] **Step 5: Update DEVLOG with exact evidence**

Insert this entry near the top of `DEVLOG.md`, replacing the quality-gate sentence only if an executed command produced a different result:

```md
### 2026-07-25（小程序中优先级可靠性与隐私修复）
- **异步可靠性**：趋势页和提醒筛选采用 latest-request-wins；血常规、生化、周期列表用请求代际隔离刷新与加载更多，分页追加按 `_id` 去重。
- **会话恢复**：HTTP 刷新改为共享单飞 Promise；仅剩 refresh token 时，启动流程可刷新令牌后恢复用户资料。
- **生产收口**：注册与账号页的开发验证码在生产环境不赋值、不展示；无图 Mock 演示仅开发环境可见。
- **图片保护**：化验单图片在读取 Base64 前检查 4.5MB 客户端上限，取不到文件信息时保留服务端 413 兜底。
- **账户删除**：账号与安全页增加密码输入、不可恢复提示和二次确认；API 成功后才清理本机令牌并返回登录页，失败保留会话。
- **质量门禁**：小程序 Vitest、TypeScript 检查、微信生产构建及后端删号集成测试通过。
```

If WeChat DevTools was unavailable, append this exact line:

```md
- **待人工验证**：当前环境未提供微信开发者工具，快速筛选、刷新/分页交错、超限图片与一次性测试账户删号仍需真机或开发者工具复核。
```

Do not alter or normalize unrelated historical entries.

- [ ] **Step 6: Check the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat HEAD~7..HEAD
```

Expected: no whitespace errors; only planned source, tests, docs, and pre-existing unrelated `backend/node_modules` changes appear.

- [ ] **Step 7: Commit the verification log**

```bash
git add DEVLOG.md
git commit -m "docs: record miniapp medium-priority fixes"
```

- [ ] **Step 8: Final verification from the committed tree**

Run:

```bash
cd miniapp
npm test
npm run type-check
cd ../backend
npm test -- --runInBand src/__tests__/integration/deleteAccount.integration.test.ts
```

Expected: miniapp tests and type-check pass; backend deletion integration tests pass. Record the final command results in the handoff.
