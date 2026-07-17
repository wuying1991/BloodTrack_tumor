# E2E Tests (Playwright)

End-to-end tests for the chemotherapy blood tracker, run against the full Docker stack
(frontend nginx + backend + mongo). Covers the critical paths: auth, blood-tests CRUD,
share/viewer, and PWA offline.

## Prerequisites

- Docker (Docker Desktop + WSL on Windows)
- Node 20+ (for Playwright)

## Run the whole suite

From the repo root:

```bash
bash e2e/run.sh
```

`run.sh` builds + starts the Docker stack with **rate limiting disabled** (the test volume
from one IP would otherwise trip the 100/15min global limit), waits for backend health,
runs Playwright, and tears the stack down.

- Run a single spec: `bash e2e/run.sh tests/auth.spec.ts` (args forwarded to `playwright test`)
- Keep the stack up after: `KEEP_STACK=1 bash e2e/run.sh`
- View the HTML report: `cd e2e && npx playwright show-report`

## Iterate against an already-running stack

If the stack is already up with rate limiting disabled, skip `run.sh` and run directly:

```bash
cd e2e
npx playwright test
```

## Browser

Uses Playwright's bundled chromium by default. If the chromium download is blocked
(e.g. China network), drive the system Edge instead (no download):

```bash
E2E_BROWSER_CHANNEL=msedge npx playwright test
```

## What's covered (12 tests)

| Spec | Tests |
|---|---|
| `auth.spec.ts` | register → dashboard / login → dashboard / wrong password → error / logout |
| `blood-tests.spec.ts` | add → list / abnormal marker / edit / delete |
| `share.spec.ts` | open a no-PIN share link in a fresh context / create via Settings UI |
| `offline.spec.ts` | offline reload serves cached data + indicator / indicator on network drop |

## Notes

- Auth is deterministic: the `authenticatedPage` fixture registers a user via API and
  injects the 4 localStorage keys `AuthContext` reads, so non-auth specs skip the UI login.
- Google Fonts (cross-origin, hangs on slow networks) are blocked in a `beforeEach` so page
  `load` fires promptly; tests assert on DOM, not font rendering.
