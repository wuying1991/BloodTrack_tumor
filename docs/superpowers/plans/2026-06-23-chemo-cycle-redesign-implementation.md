# M-P7 化疗周期重新设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把化疗周期从「起止日期 + 扁平药物列表」重构为「方案名称 + 周期边界 + 可选药物起止日期」，并在血常规录入时加入周期提醒。

**Architecture:** 后端保持现有 `/api/chemo-cycles` endpoint 不变，但更新 ChemoCycle schema/request/response 形状，并在 create/update/delete 后统一执行 `reconcileCycleBoundaries(userId)`。前端重构 `chemoCycleService` 与 `ChemoCycles.tsx` 表单/列表，并在 `BloodTests` 添加保存前提醒逻辑。

**Tech Stack:** TypeScript + Express + Mongoose + express-validator + Jest/supertest/mongodb-memory-server / React 18 + React Testing Library

**Spec:** `docs/superpowers/specs/2026-06-23-chemo-cycle-redesign-design.md`

---

## File Map

### Backend
- Modify `contracts/index.ts`: ChemoCycle / ChemoMedication request/response types.
- Modify `backend/src/models/ChemoCycle.ts`: schema: `regimenName`, medication optional fields + dates + notes, legacy `schedule` compatibility in interface tolerated.
- Modify `backend/src/middlewares/validationMiddleware.ts`: `validateChemoCycle` / `validateChemoCycleUpdate`.
- Modify `backend/src/controllers/chemoCycleController.ts`: normalize legacy docs, default endDate, `reconcileCycleBoundaries`, create/update/delete behavior.
- Modify `backend/src/controllers/bloodTestController.ts`: no schema change; ensure existing matching `[startDate,endDate]` remains valid.
- Modify backend tests:
  - `backend/src/__tests__/contracts/chemoCycle.contract.test.ts`
  - `backend/src/__tests__/integration/chemoCycle.integration.test.ts`
  - possibly `backend/src/__tests__/integration/auth.integration.test.ts` unaffected unless shared helpers fail.
- Modify `backend/scripts/contract-validator.js`: ChemoCycle field sanity check if currently absent (optional, but add to prevent regression).

### Frontend
- Modify `frontend/src/types/index.ts`: ChemoCycle / ChemoMedication types.
- Modify `frontend/src/services/chemoCycle/chemoCycleService.ts`: types + form/api conversion + legacy schedule→notes compatibility.
- Modify `frontend/src/pages/chemoCycles/ChemoCycles.tsx`: new form/list UX.
- Modify `frontend/src/pages/bloodTests/BloodTests.tsx`: pre-save reminder flow wrapper.
- Modify `frontend/src/components/bloodTest/BloodTestForm.tsx` only if needed to pass cycle status data/callback; prefer keeping it unchanged.
- Modify tests:
  - `frontend/src/pages/chemoCycles/__tests__/ChemoCycles.test.tsx`
  - `frontend/src/pages/bloodTests/__tests__/BloodTests.test.tsx`

---

## Task 1: Contracts and frontend types

**Files:**
- Modify: `contracts/index.ts`
- Modify: `frontend/src/types/index.ts`

- [ ] Replace old ChemoMedication shape:
```ts
export interface ChemoMedication {
  name?: string;
  dosage?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  /** legacy only: old records used schedule; normalize to notes when read */
  schedule?: string;
}
```

- [ ] Replace ChemoCycle shape with:
```ts
export interface ChemoCycle {
  _id: string;
  user: string;
  regimenName: string;
  startDate: string;
  endDate: string;
  medications: ChemoMedication[];
  doctorNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChemoCycleCreateRequest {
  regimenName: string;
  startDate: string;
  endDate?: string;
  medications?: ChemoMedication[];
  doctorNotes?: string;
}

export type ChemoCycleUpdateRequest = Partial<ChemoCycleCreateRequest>;
```

- [ ] Run:
```bash
cd D:/vibe_program/BloodTrack_tumor/backend && npx tsc --noEmit
cd D:/vibe_program/BloodTrack_tumor/frontend && npx tsc --noEmit
```

- [ ] Commit:
```bash
git add contracts/index.ts frontend/src/types/index.ts
git -c core.autocrlf=false commit -m "feat(M-P7): contracts/types 重构 ChemoCycle 结构"
```

---

## Task 2: Backend ChemoCycle model

**Files:**
- Modify: `backend/src/models/ChemoCycle.ts`

- [ ] Replace `IMedication` with optional fields:
```ts
export interface IMedication {
  name?: string;
  dosage?: string;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
  schedule?: string; // legacy old data only
}
```

- [ ] Replace `IChemoCycle` to include `regimenName: string`.

- [ ] Update medication schema:
```ts
const medicationSchema = new Schema<IMedication>(
  {
    name: { type: String, trim: true },
    dosage: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    notes: { type: String, trim: true, maxlength: 1000 },
    schedule: { type: String, trim: true }, // legacy; not emitted by new UI
  },
  { _id: false }
);
```

- [ ] Update cycle schema fields:
```ts
regimenName: { type: String, required: true, trim: true, maxlength: 120, default: '未命名方案' },
startDate: { type: Date, required: true },
endDate: { type: Date, required: true },
medications: { type: [medicationSchema], default: [] },
doctorNotes: { type: String },
```

- [ ] Add index:
```ts
chemoCycleSchema.index({ user: 1, startDate: 1 });
```

- [ ] Run backend tsc.

- [ ] Commit.

---

## Task 3: Validation middleware

**Files:**
- Modify: `backend/src/middlewares/validationMiddleware.ts`

- [ ] Replace `validateChemoCycle` rules:
  - `regimenName`: required string 1-120 chars.
  - `startDate`: required ISO8601.
  - `endDate`: optional ISO8601; if present, must be >= startDate.
  - `medications`: optional array.
  - `medications.*.name/dosage/notes`: optional string; notes max 1000.
  - `medications.*.startDate/endDate`: optional ISO8601; if both present, end >= start.
  - custom medication object: if object exists, at least one of `name/dosage/startDate/endDate/notes` is truthy.

- [ ] Replace `validateChemoCycleUpdate` similarly but all top-level fields optional; if `regimenName` present, must not be empty.

- [ ] Run backend tsc.

- [ ] Commit.

---

## Task 4: Backend controller normalize + boundaries

**Files:**
- Modify: `backend/src/controllers/chemoCycleController.ts`

- [ ] Add helpers:
```ts
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CYCLE_DAYS = 21;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function normalizeMedication(m: any, cycleStart: Date, cycleEnd: Date) {
  return {
    name: m.name || undefined,
    dosage: m.dosage || undefined,
    startDate: m.startDate || cycleStart,
    endDate: m.endDate || cycleEnd,
    notes: m.notes || m.schedule || undefined,
  };
}

function normalizeCycle(cycle: any) {
  const obj = typeof cycle.toObject === 'function' ? cycle.toObject() : cycle;
  const start = new Date(obj.startDate);
  const end = new Date(obj.endDate || addDays(start, DEFAULT_CYCLE_DAYS));
  return {
    ...obj,
    regimenName: obj.regimenName || '未命名方案',
    endDate: end,
    medications: (obj.medications || []).map((m: any) => normalizeMedication(m, start, end)),
  };
}
```

- [ ] Add `sanitizeMedications(meds, cycleStart, cycleEnd)` to remove completely empty rows and default medication dates to cycle dates.

- [ ] Add `reconcileCycleBoundaries(userId)`:
  - `const cycles = await ChemoCycle.find({user:userId}).sort('startDate')`
  - for each non-last, set `endDate = addDays(next.startDate, -1)`
  - for last, if no endDate, set start+21
  - save modified docs.

- [ ] Update `getChemoCycles` / `getChemoCycleById` to return normalized cycles.

- [ ] Update `createChemoCycle`:
  - derive `startDate`, `endDate = body.endDate || addDays(startDate, 21)`
  - `regimenName`, sanitized medications, doctorNotes
  - create, then `await reconcileCycleBoundaries(userId)`
  - refetch created cycle and return normalized.

- [ ] Update `updateChemoCycle`:
  - sanitize incoming body; if startDate/endDate/medications change handle defaults.
  - update, then reconcile, then refetch updated cycle and return normalized.

- [ ] Update `deleteChemoCycle`:
  - delete one, then `await reconcileCycleBoundaries(userId)`.

- [ ] Run backend tsc.

- [ ] Commit.

---

## Task 5: Backend tests

**Files:**
- Modify: `backend/src/__tests__/contracts/chemoCycle.contract.test.ts`
- Modify: `backend/src/__tests__/integration/chemoCycle.integration.test.ts`

- [ ] Update all payloads to include `regimenName`.

- [ ] Update expected medication shape from `schedule` to `startDate/endDate/notes`.

- [ ] Add integration cases:
  1. create with only `regimenName + startDate` returns endDate=start+21 and medications=[].
  2. create second cycle later updates first endDate to second startDate - 1.
  3. update second cycle startDate triggers first boundary update.
  4. delete second cycle leaves first as last cycle and preserves/sets endDate appropriately.
  5. medications=[] accepted.
  6. medication with only notes accepted.
  7. medication startDate > endDate returns 422.
  8. missing regimenName returns 422.

- [ ] Run:
```bash
cd backend
npx jest --testPathPatterns='chemoCycle' --no-coverage
npx jest --no-coverage
```

- [ ] Commit.

---

## Task 6: Frontend chemoCycleService

**Files:**
- Modify: `frontend/src/services/chemoCycle/chemoCycleService.ts`

- [ ] Update service types to new structure.

- [ ] `ChemoCycleFormData`:
```ts
interface ChemoCycleFormData {
  regimenName: string;
  startDate: string;
  endDate: string;
  medications: ChemoMedication[];
  doctorNotes: string;
}
```

- [ ] Add date helper `addDaysLocal(dateInput: string, days: number): string` returning `YYYY-MM-DD`.

- [ ] `convertFormToApiData`:
  - send regimenName/startDate/endDate/doctorNotes
  - filter medications where at least one field is truthy.

- [ ] `convertApiToFormData`:
  - fallback regimenName `未命名方案`
  - medication notes from `notes || schedule` for legacy.

- [ ] Run frontend tsc.

- [ ] Commit.

---

## Task 7: ChemoCycles page UI rewrite

**Files:**
- Modify: `frontend/src/pages/chemoCycles/ChemoCycles.tsx`
- Modify: `frontend/src/pages/chemoCycles/ChemoCycles.css` if needed.

- [ ] Update empty form:
  - `regimenName: ''`
  - `startDate: today`
  - `endDate: start+21`
  - `medications: []`

- [ ] Add form fields:
  - 方案名称 required.
  - 周期开始日期 required.
  - 周期结束日期 optional/visible, auto updated when start changes if user has not manually edited it.

- [ ] Update medication row:
  - name optional
  - dosage optional
  - startDate default cycle start
  - endDate default cycle end
  - notes optional

- [ ] Add medication button inserts row with default dates.

- [ ] Validation:
  - regimenName required.
  - startDate required.
  - endDate >= startDate.
  - if med row exists and all fields empty, either filter it out or show error. Use filter-out before submit to avoid annoying user.
  - med date range if both dates present.

- [ ] List cards show regimenName first, then cycle dates, then medications or `药物信息：未填写`.

- [ ] Run frontend tsc.

- [ ] Commit.

---

## Task 8: BloodTests pre-save reminders

**Files:**
- Modify: `frontend/src/pages/bloodTests/BloodTests.tsx`
- Possibly modify: `frontend/src/components/bloodTest/BloodTestForm.tsx` only if needed.

- [ ] Add helper in `BloodTests.tsx`:
  - fetch chemo cycles via `chemoCycleService.getChemoCycles(1, 100)` before showing add form or before submit.

- [ ] Preferred implementation: wrap `onSubmitSuccess` is too late; reminder must happen before API save. Therefore pass a new optional prop to `BloodTestForm`: `beforeSubmit?: (formData) => Promise<'continue' | 'cancel'>`.

- [ ] In `BloodTestForm`, before calling `bloodTestService.create/update`, call `beforeSubmit` if provided.

- [ ] In `BloodTests.tsx`, implement `beforeBloodTestSubmit(data)`:
  - if no cycles: `window.confirm('建议先添加化疗周期记录... 点击确定去添加周期，取消则仍然保存')`
  - if confirm true: navigate('/chemo-cycles'); return 'cancel'
  - if latestCycle and testDate - latestCycle.startDate > 21 days: similar confirm.
  - otherwise continue.

- [ ] Note: Native confirm only has OK/Cancel; map OK = 去添加周期, Cancel = 仍然保存. This is acceptable for first iteration.

- [ ] Run frontend tsc.

- [ ] Commit.

---

## Task 9: Frontend tests

**Files:**
- Modify: `frontend/src/pages/chemoCycles/__tests__/ChemoCycles.test.tsx`
- Modify: `frontend/src/pages/bloodTests/__tests__/BloodTests.test.tsx`

- [ ] Update ChemoCycles test mocks to new shape.

- [ ] Update assertions for rendered labels: 方案名称, 周期开始日期, 周期结束日期, 用药开始日期, 用药结束日期.

- [ ] Add or update case: only regimenName + startDate can submit.

- [ ] Add BloodTests cases:
  - no cycles + add blood test + confirm true navigates to chemo-cycles and does not save.
  - no cycles + confirm false continues saving.
  - latest cycle older than 21 days triggers confirm.

- [ ] Run:
```bash
cd frontend
CI=true npx react-scripts test --watchAll=false --testPathPattern='ChemoCycles|BloodTests'
CI=true npx react-scripts test --watchAll=false
```

- [ ] Commit.

---

## Task 10: Contract validator + full gate + DEVLOG

**Files:**
- Modify: `backend/scripts/contract-validator.js`
- Modify: `DEVLOG.md`

- [ ] Add ChemoCycle field check to contract-validator:
  - backend model has `regimenName`, med `startDate/endDate/notes`, no required `schedule`.
  - frontend types has `regimenName`.

- [ ] Run full gate:
```bash
cd backend
npx tsc --noEmit
npm run contract:check
npx jest --no-coverage
cd ../frontend
npx tsc --noEmit
CI=true npx react-scripts test --watchAll=false
```

- [ ] Update DEVLOG:
  - Mark M-P7 ✅
  - Add changelog section with data model, boundary reconcile, UI, BloodTests reminder, tests.

- [ ] Commit.

---

## Acceptance Criteria

- User can create a ChemoCycle with only regimenName + startDate.
- System defaults endDate to startDate + 21 days for the last cycle.
- Adding/updating/deleting cycles reconciles non-last endDate to next.startDate - 1 day.
- Medications are optional; if present all individual fields are optional, with empty rows filtered.
- Old data with `schedule` still displays as notes.
- BloodTests warns when no cycles or latest cycle is older than 21 days, but allows continue.
- Full backend/frontend test suites pass.
