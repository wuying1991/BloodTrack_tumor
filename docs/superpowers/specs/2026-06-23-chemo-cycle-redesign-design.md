# M-P7 化疗周期重新设计 — 设计文档

> 状态：用户已确认设计
> 日期：2026-06-23
> 关联：DEVLOG.md M-P7，预估 2-3 天

---

## 1. 目标

把当前「化疗周期 = 起止日期 + 扁平药物列表」改成更贴近真实治疗记录的结构：

- 先记录**化疗方案名称**，如 `VAC方案`
- 每个周期有用户填写的开始日期
- 周期结束日期默认估算，但可由后续周期自动校正
- 药物信息可选，病人不知道具体药名/剂量时也能保存
- 药物有自己的用药起止日期，而不是自由文本「时间表」
- 血常规页在缺少/过期周期时提醒，但不阻止保存

不在本次范围内：方案字典维护、药物字典维护、复杂给药日多选（D1/D8/D15）、批量重算历史 BloodTest.chemoCycleId。

---

## 2. 用户决策汇总

| # | 问题 | 决策 |
|---|---|---|
| Q1 | 新建周期最低必填 | 方案名称 + 周期开始日期；endDate 默认 start+21；药物可后补 |
| Q2 | endDate 语义 | 周期边界结束日，可自动修正，不是药物用药结束日 |
| Q3 | 方案名称 | `regimenName` 必填自由文本 |
| Q4 | 药物列表最低要求 | medications 可为空；若添加药物，name/dosage/startDate/endDate/notes 至少填一项 |
| Q5 | 药物用药时间 | 每个药物用 `startDate/endDate` 日期范围 |
| Q6 | 血常规页提醒 | 无周期或最近周期超过 21 天时提醒，但不阻止保存 |
| Q7 | 新周期修正哪个上一周期 | 找 `startDate < 新周期.startDate` 的最近周期；更通用地在每次 create/update/delete 后全量 reconcile |
| Q8 | 编辑 startDate 是否重算边界 | 是。create/update/delete 后统一重算当前用户所有周期边界 |
| Q9 | 是否覆盖用户手动 endDate | 非最后周期总是由下一个周期 startDate - 1 天决定；最后周期保留用户填写 endDate，没填则 start+21 |
| Q10 | 药物起止日期默认 | 新增药物默认等于周期起止日期，用户可改 |
| Q11 | 历史 BloodTest 关联 | 本轮不批量重算历史 BloodTest.chemoCycleId；只保证新增/编辑 BloodTest 使用最新边界 |
| Q12 | 旧 ChemoCycle 数据 | 兼容迁移逻辑：旧 schedule → notes；旧 name/dosage 保留；缺 regimenName 显示「未命名方案」 |

---

## 3. 新数据结构

### 3.1 ChemoCycle

```ts
interface ChemoCycle {
  _id: string;
  user: string;

  regimenName: string; // 必填，如 "VAC方案"

  startDate: string;   // 必填，用户填写
  endDate: string;     // 默认 startDate + 21 天，可被自动边界重算覆盖

  medications: ChemoMedication[]; // 可为空

  doctorNotes?: string;

  createdAt?: string;
  updatedAt?: string;
}
```

### 3.2 ChemoMedication

```ts
interface ChemoMedication {
  name?: string;       // 可选
  dosage?: string;     // 可选
  startDate?: string;  // 可选，新增药物默认 cycle.startDate
  endDate?: string;    // 可选，新增药物默认 cycle.endDate
  notes?: string;      // 可选，用于保存旧 schedule 或其它说明
}
```

### 3.3 旧字段兼容

旧数据里可能有：

```ts
medications: [{ name, dosage, schedule }]
```

兼容转换为：

```ts
medications: [{
  name,
  dosage,
  startDate: cycle.startDate,
  endDate: cycle.endDate,
  notes: schedule
}]
```

缺 `regimenName` 的旧数据显示为「未命名方案」。

---

## 4. 周期边界规则

后端新增 helper：

```ts
reconcileCycleBoundaries(userId)
```

每次 `create / update / delete` 化疗周期后执行：

```ts
cycles = 当前用户所有周期，按 startDate 升序排列

for each cycle[i]:
  if cycle[i + 1] exists:
    cycle[i].endDate = cycle[i + 1].startDate - 1 天
  else:
    cycle[i].endDate = 用户填写值 || cycle[i].startDate + 21 天
```

### 行为结果

- 新周期必须由用户主动创建
- 新周期的 `startDate` 由用户填写
- 创建新周期后，上一个周期自动结束在新周期开始前一天
- 编辑周期 `startDate` 后，也重新计算相邻周期边界
- 删除中间周期后，也重新计算边界
- 非最后周期的 `endDate` 会被自动覆盖
- 最后一个周期保留用户填写的 `endDate`，若未填则默认 `startDate + 21 天`

### 4.1 Date 计算规则

- 以本地日期字符串 `YYYY-MM-DD` 为输入
- 后端用 Date 对象存储，但只按日粒度比较
- `startDate + 21 天`：例如 2026-06-01 → 2026-06-22
- `next.startDate - 1 天`：例如 next 2026-06-22 → prev end 2026-06-21

---

## 5. 后端 API 设计

现有 endpoint 不变：

```txt
GET    /api/chemo-cycles
POST   /api/chemo-cycles
GET    /api/chemo-cycles/:id
PUT    /api/chemo-cycles/:id
DELETE /api/chemo-cycles/:id
```

但 request/response shape 改为新结构。

### 5.1 Create request

```ts
interface ChemoCycleCreateRequest {
  regimenName: string;
  startDate: string;
  endDate?: string;
  medications?: ChemoMedication[];
  doctorNotes?: string;
}
```

### 5.2 Update request

```ts
type ChemoCycleUpdateRequest = Partial<ChemoCycleCreateRequest>;
```

### 5.3 Validation

- `regimenName` 必填，1–120 字符
- `startDate` 必填，ISO 日期
- `endDate` 可选，ISO 日期
- 若 `endDate` 存在，必须 `>= startDate`
- `medications` 可为空数组
- 如果 medication 对象存在，`name / dosage / startDate / endDate / notes` 至少填一项
- `medication.startDate/endDate` 若同时存在，必须 `endDate >= startDate`
- `dosage` 可选
- `name` 可选
- `notes` 可选，最多 1000 字符

---

## 6. 前端 ChemoCycles 页面设计

### 6.1 列表卡片

```txt
VAC方案
周期：2026-06-01 → 2026-06-22

药物：
- 环磷酰胺 500mg   2026-06-01 → 2026-06-05
- 长春新碱          2026-06-01 → 2026-06-01

医生备注：
...
```

如果没有药物：

```txt
药物信息：未填写
```

### 6.2 新增/编辑表单

字段：

1. **方案名称**（必填）
   - placeholder：`例如：VAC方案、CHOP方案、TC方案`

2. **周期开始日期**（必填）

3. **周期结束日期**
   - 默认：开始日期 + 21 天
   - 用户可修改
   - 如果该周期后面已有下一个周期，保存后后端可能自动改为下一个周期开始前一天

4. **药物列表**（可为空）
   - 添加药物按钮
   - 每条药物包含：
     - 药物名称（可选）
     - 剂量（可选）
     - 用药开始日期（默认周期开始日期）
     - 用药结束日期（默认周期结束日期）
     - 备注（可选）

5. **医生备注**（可选）

### 6.3 新增药物默认值

用户点击「添加药物」时：

```ts
medication.startDate = form.startDate
medication.endDate = form.endDate
```

用户可清空或修改。

---

## 7. 血常规页面提醒逻辑

在用户保存血常规记录前检查化疗周期状态。

### 7.1 情况 1：没有任何化疗周期

弹窗：

```txt
建议先添加化疗周期记录，以便关联血常规数据。
```

按钮语义：

- 「去添加周期」→ 跳转 `/chemo-cycles`
- 「仍然保存」→ 继续保存血常规

### 7.2 情况 2：最近周期已超过 21 天

判断逻辑：

```ts
bloodTest.date - latestCycle.startDate > 21 天
```

弹窗：

```txt
距离上一个化疗周期开始已超过 21 天，是否需要添加新的化疗周期？
```

按钮：

- 「去添加周期」
- 「仍然保存」

### 7.3 注意

提醒不阻止保存。用户仍可保存血常规，因为血常规可能是非周期内复查。

---

## 8. 血常规 ↔ 化疗周期自动关联影响

当前后端 BloodTest 创建/更新时会按 `date` 自动匹配所在周期。

M-P7 后继续保留这个逻辑，匹配依据为新的自动边界：

```ts
cycle.startDate <= bloodTest.date <= cycle.endDate
```

本轮**不批量重算历史 BloodTest.chemoCycleId**，只保证：

- 新增/编辑 BloodTest 时按最新周期边界自动关联
- ChemoCycle 删除时，已有级联逻辑保持/补充解除关联

历史重新关联可以以后做单独 maintenance 操作，避免 M-P7 过大。

---

## 9. 测试计划

### 9.1 后端测试

新增/修改：

- ChemoCycle 契约测试
  - create response 包含 `regimenName`
  - medication 字段可选
  - medication schedule → notes 兼容
  - medications 可为空

- ChemoCycle 集成测试
  - create 只填 regimenName + startDate，endDate 默认 +21
  - create 新周期后，上一周期 endDate 自动变成新周期 startDate - 1
  - update startDate 后重算边界
  - delete 中间周期后重算边界
  - medications 为空可保存
  - medication 只填 notes 可保存
  - medication startDate > endDate 返回 422
  - regimenName 缺失返回 422

### 9.2 前端测试

- ChemoCycles 页面：
  - 新表单渲染方案名称/周期日期/药物日期
  - 只填方案名称 + 开始日期可保存
  - 添加药物但全空 → 前端过滤掉或提示
  - 药物名称/剂量可选
  - 周期开始日期改变后，结束日期默认 +21
  - 新建/编辑/删除流程不破坏现有测试

- BloodTests 页面：
  - 没有周期时保存前提示
  - 周期超过 21 天时保存前提示
  - 用户选择「仍然保存」会继续调用保存接口

---

## 10. 实现顺序建议

1. contracts/index.ts + frontend/src/types/index.ts 更新 ChemoCycle / ChemoMedication 类型
2. backend ChemoCycle Model 改 schema + 兼容旧 schedule
3. validationMiddleware 改 validateChemoCycle / validateChemoCycleUpdate
4. chemoCycleController 加 normalize + reconcileCycleBoundaries helper；create/update/delete 后调用
5. 后端 contract/integration 测试修复并新增边界重算用例
6. chemoCycleService 类型 + form/api 转换函数更新
7. ChemoCycles.tsx 表单和列表 UI 重构
8. BloodTests 页面保存前提醒逻辑
9. 前端测试修复/新增
10. 全量门禁 + DEVLOG 更新
