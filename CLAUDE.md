# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**化疗血常规追踪器 (Chemotherapy Blood Tracker)** — a full-stack TypeScript app for chemotherapy patients to track blood test results, chemo cycles, medication reminders, and trend analytics.

- **Backend**: Express + Mongoose + JWT (dual token) in `backend/`
- **Frontend**: React 18 + React Router 6 + Chart.js + Axios in `frontend/`
- **Shared contracts**: `contracts/index.ts` — single source of truth for API types (CI validates both sides against it)

## Common Commands

### Backend (`cd backend`)

| Task | Command |
|---|---|
| TypeScript check | `npx tsc --noEmit` |
| All tests | `npx jest --no-coverage` |
| Contract tests | `npm run test:contract` |
| Integration tests | `npx jest --testPathPatterns='integration'` |
| Single test file | `npx jest --testPathPatterns='<keyword>'` |
| Contract consistency | `npm run contract:check` |
| Start dev server | `npm run dev` (nodemon, requires MongoDB) |

### Frontend (`cd frontend`)

| Task | Command |
|---|---|
| TypeScript check | `npx tsc --noEmit` |
| All tests | `CI=true npx react-scripts test --watchAll=false` |
| Single test suite | `CI=true npx react-scripts test --watchAll=false --testPathPattern='<name>'` |
| ESLint | `npm run lint` |
| Start dev server | `npm start` |

## Architecture

### Backend (`backend/src/`)

```
server.ts          → entry point (loads .env, connects DB, starts express)
app.ts             → express app assembly (middleware, routes, error handlers)
config/
  db.ts            → mongoose.connect (MONGODB_URI env)
  secrets.ts       → JWT_SECRET / JWT_REFRESH_SECRET loader (prod requires env ≥16 chars; dev/test falls back to random per-process value)
models/            → Mongoose schemas: User, BloodTest, ChemoCycle, Reminder
controllers/       → route handlers (thin — call models, return JSON)
routes/            → express routers (protect middleware + validation chains)
middlewares/
  authMiddleware.ts    → `protect`: Bearer JWT verify, attaches `req.user`
  validationMiddleware.ts → express-validator chains + `validate()` runner
  errorMiddleware.ts   → global error handler (ApiError, Mongoose, JWT → standard JSON)
utils/
  ApiError.ts      → error class with static factories (badRequest, unauthorized, notFound, conflict, validation, internal)
  asyncHandler.ts  → wraps async route handlers to forward rejections to next()
```

**Key patterns**:
- Controllers use `asyncHandler` to catch promise rejections automatically
- All protected routes pass through `protect` middleware which verifies JWT and looks up the user
- Validation uses `express-validator` chains wrapped in `runValidation([...])`. Errors are collected via `validationResult()` and thrown as `ApiError.validation()` with a per-field map
- **Route ordering matters**: `/export` (bloodTests) and `/upcoming` (reminders) must be registered before `/:id` patterns, otherwise `validateId` (mongoId regex) intercepts them

### Frontend (`frontend/src/`)

```
App.tsx            → route definitions (ProtectedRoute / PublicOnlyRoute wrappers)
context/
  AuthContext.tsx  → auth state, JWT dual-token with auto-refresh, 30-min inactivity logout
components/
  Layout/Layout.tsx → sidebar nav + header + <Outlet> for nested routes
  auth/ProtectedRoute.tsx → route guards
pages/
  dashboard/       → stats cards + recent tests table + upcoming reminders
  auth/            → Login, Register, ForgotPassword, ResetPassword
  bloodTests/      → CRUD with list/add/edit views + CSV export
  chemoCyles/      → CRUD for chemo cycles
  Analytics/       → Chart.js trend lines + summary cards + time range filter
  reminders/       → CRUD with type/recurrence filters + complete/rollover
  settings/        → 3-tab (profile, notifications, data) + change password + delete account
services/
  api/apiClient.ts     → Axios singleton with interceptors (auto-attach Bearer, 401 → refresh → retry queue)
  auth/authService.ts  → login, register, profile, settings, changePassword, deleteAccount
  bloodTest/, reminder/ → entity-specific API wrappers
utils/
  myelosuppression.ts  → calculates ANC myelosuppression grade (0-4) and guidelines
types/index.ts     → frontend type definitions (mirrors contracts/index.ts)
```

**Key patterns**:
- `apiClient.ts` has a token-refresh queue: concurrent 401 responses wait on a single refresh call, then all retry with the new token
- `AuthContext` provides `login()`, `logout()`, `refreshUser()`, and `refreshAccessToken()`
- Routes use `ProtectedRoute` (redirects to login if unauthenticated) and `PublicOnlyRoute` (redirects to dashboard if already logged in)
- Page components follow a pattern: list/add/edit views with local state, API call via service layer, ApiError handling with field-level form errors

### Data Contracts (`contracts/index.ts`)

Shared TypeScript interfaces for API request/response shapes. Both backend controllers and frontend types must conform. CI runs `contract:check` (a custom Node script at `backend/scripts/contract-validator.js`) that validates:
1. Backend BloodTest Model fields
2. Validation middleware fields against Model
3. Frontend `types/index.ts` BloodTest fields

When adding or changing API fields, update **all three** locations: `contracts/index.ts`, backend model/validation, and `frontend/src/types/index.ts`.

### Authentication Flow

- **Dual JWT**: access token (15min) + refresh token (7 days)
- Backend `secrets.ts` loads from env in production (hard-fails if missing/short); dev/test uses per-process random strings
- Login endpoints have separate rate limiting (`app.ts`: 5 req/min/IP, `skipSuccessfulRequests: true`)
- Global rate limit: 100 req/15min/IP (skipped in test env)
- Frontend `apiClient` interceptor handles 401 → refresh → retry transparently
- Frontend `AuthContext` refreshes proactively when token <5min from expiry, auto-logout after 30min inactivity

### Testing

- **Backend**: Jest + ts-jest + supertest + mongodb-memory-server. Tests live in `src/__tests__/` — `contracts/` for API shape tests, `integration/` for full request-through-middleware tests
- **Frontend**: React Testing Library + jest. Components are tested via `render()` + `screen.getBy*()` + `userEvent`
- Mock pattern: `jest.mock()` for service modules; use `mockResolvedValueOnce()` per test, reset with `jest.clearAllMocks()` in `beforeEach`
- When `clearAllMocks` clears a jest.mock factory default, re-set it in `beforeEach` (e.g., `reminderService.getUpcoming` defaults to `{ success: true, data: [] }`)
- `useAuth` mock user object must be a module-level constant (hoisted) to avoid useEffect infinite re-render from reference changes
