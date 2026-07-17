/**
 * 数据契约一致性校验脚本 (CI 阶段自动执行)
 * 运行: node scripts/contract-validator.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const results = [];

function check(name, fn) {
  const details = fn();
  results.push({ name, passed: details.length === 0, details });
}

// ============================================================
// 检查 1: 后端 BloodTest Model 字段
// ============================================================
check('后端 BloodTest Model 字段规范', () => {
  const errors = [];
  const content = fs.readFileSync(
    path.join(ROOT, 'src', 'models', 'BloodTest.ts'),
    'utf-8'
  );

  const requiredFields = ['user:', 'date:', 'wbc:', 'rbc:', 'hgb:', 'plt:'];
  const optionalFields = ['neu?', 'lym?', 'notes?', 'isAbnormal', 'chemoCycleId?'];

  for (const f of requiredFields) {
    if (!content.includes(f)) errors.push(`Model 缺少必选字段: ${f}`);
  }
  for (const f of optionalFields) {
    if (!content.includes(f)) errors.push(`Model 缺少可选字段: ${f}`);
  }

  const bannedNames = ['testDate:', 'userId:', 'platelets:', 'hemoglobin:', 'neutrophils:', 'lymphocytes:', 'values:'];
  for (const name of bannedNames) {
    if (content.includes(name)) errors.push(`Model 包含废弃字段名: ${name}`);
  }

  return errors;
});

// ============================================================
// 检查 2: Validation 中间件字段 vs Model
// ============================================================
check('Validation 中间件字段对齐 Model', () => {
  const errors = [];
  const content = fs.readFileSync(
    path.join(ROOT, 'src', 'middlewares', 'validationMiddleware.ts'),
    'utf-8'
  );

  const section = content.substring(
    content.indexOf('export const validateBloodTest ='),
    content.indexOf('export const validateBloodTestUpdate =')
  );

  const expectedFields = ['date', 'wbc', 'rbc', 'hgb', 'plt', 'neu', 'lym', 'notes', 'chemoCycleId'];
  for (const f of expectedFields) {
    if (!section.includes(`body('${f}')`)) {
      errors.push(`validateBloodTest 缺少字段校验: ${f}`);
    }
  }

  const bannedNames = ['testDate', 'hemoglobin', 'hematocrit', 'platelets', 'neutrophils', 'lymphocytes'];
  for (const name of bannedNames) {
    if (section.includes(`body('${name}')`)) {
      errors.push(`validateBloodTest 包含废弃字段名: ${name}`);
    }
  }

  return errors;
});

// ============================================================
// 检查 3: 前端 types/index.ts 字段
// ============================================================
check('前端 types/index.ts 字段规范', () => {
  const errors = [];
  const typesPath = path.join(ROOT, '..', 'frontend', 'src', 'types', 'index.ts');

  if (!fs.existsSync(typesPath)) {
    errors.push('找不到 frontend/src/types/index.ts');
    return errors;
  }

  const content = fs.readFileSync(typesPath, 'utf-8');

  const contractFields = [
    '_id:', 'user:', 'date:', 'wbc:', 'rbc:', 'hgb:', 'plt:',
    'neu?:', 'lym?:', 'notes?:', 'isAbnormal?:', 'chemoCycleId?:', 'createdAt?:', 'updatedAt?:',
  ];

  const bloodTestSection = content.substring(
    content.indexOf('export interface BloodTest {'),
    content.indexOf('export interface BloodTestCreateRequest')
  );

  for (const f of contractFields) {
    if (!bloodTestSection.includes(f)) {
      errors.push(`前端 BloodTest 缺少字段: ${f}`);
    }
  }

  const bannedNames = ['values:', 'testDate:', 'userId:'];
  for (const name of bannedNames) {
    if (bloodTestSection.includes(name)) {
      errors.push(`前端包含废弃结构: ${name}`);
    }
  }

  return errors;
});

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

// ============================================================
// 检查 5: ChemoCycle 字段三处一致 (M-P7)
// ============================================================
check('ChemoCycle 类型定义三处一致 (M-P7)', () => {
  const errors = [];

  const modelPath = path.join(ROOT, 'src', 'models', 'ChemoCycle.ts');
  const modelContent = fs.readFileSync(modelPath, 'utf-8');
  for (const f of ['regimenName', 'startDate', 'endDate', 'medications', 'notes', 'schedule']) {
    if (!modelContent.includes(f)) {
      errors.push(`ChemoCycle Model 缺少字段/兼容项: ${f}`);
    }
  }
  const bannedRequired = ['name: { type: String, required: true', 'dosage: { type: String, required: true', 'schedule: { type: String, required: true'];
  for (const f of bannedRequired) {
    if (modelContent.includes(f)) {
      errors.push(`ChemoCycle Model 仍包含旧必填药物字段: ${f}`);
    }
  }

  const valPath = path.join(ROOT, 'src', 'middlewares', 'validationMiddleware.ts');
  const valContent = fs.readFileSync(valPath, 'utf-8');
  const valSection = valContent.substring(
    valContent.indexOf('export const validateChemoCycle ='),
    valContent.indexOf('export const validateChemoCycleUpdate =')
  );
  for (const f of ['regimenName', 'medications.*.startDate', 'medications.*.endDate', 'medications.*.notes']) {
    if (!valSection.includes(`'${f}'`)) {
      errors.push(`validateChemoCycle 缺少字段校验: ${f}`);
    }
  }

  const typesPath = path.join(ROOT, '..', 'frontend', 'src', 'types', 'index.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf-8');
  for (const f of ['regimenName:', 'startDate?:', 'endDate?:', 'notes?:']) {
    if (!typesContent.includes(f)) {
      errors.push(`前端 ChemoCycle/ChemoMedication 缺少字段: ${f}`);
    }
  }

  return errors;
});

// ============================================================
// 检查 6: UserSettings.language 四处一致 (L-P5)
// ============================================================
check('UserSettings.language 四处一致 (L-P5)', () => {
  const errors = [];

  // 6a. contracts/index.ts UserSettings
  const contractsPath = path.join(ROOT, '..', 'contracts', 'index.ts');
  const contractsContent = fs.readFileSync(contractsPath, 'utf-8');
  const contractsSection = contractsContent.substring(
    contractsContent.indexOf('export interface UserSettings {'),
    contractsContent.indexOf('export type RegisterResponse')
  );
  if (!contractsSection.includes('language') || !contractsSection.includes("'zh-CN'") || !contractsSection.includes("'en-US'")) {
    errors.push('contracts/index.ts UserSettings 缺少 language 字段 (zh-CN|en-US)');
  }

  // 6b. 前端 types/index.ts User.settings
  const typesPath = path.join(ROOT, '..', 'frontend', 'src', 'types', 'index.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf-8');
  if (!typesContent.includes("language?: 'zh-CN' | 'en-US'")) {
    errors.push('前端 types/index.ts User.settings 缺少 language 字段');
  }

  // 6c. 后端 User Model schema
  const modelPath = path.join(ROOT, 'src', 'models', 'User.ts');
  const modelContent = fs.readFileSync(modelPath, 'utf-8');
  if (!modelContent.includes("language: { type: String, enum: ['zh-CN', 'en-US'], default: 'zh-CN' }")) {
    errors.push('backend/src/models/User.ts settings 缺少 language schema');
  }

  // 6d. 后端 validation
  const valPath = path.join(ROOT, 'src', 'middlewares', 'validationMiddleware.ts');
  const valContent = fs.readFileSync(valPath, 'utf-8');
  const valSection = valContent.substring(valContent.indexOf('export const validateSettingsUpdate ='));
  if (!valSection.includes("'language'") || !valSection.includes("'zh-CN'")) {
    errors.push('validateSettingsUpdate 缺少 language 校验');
  }

  return errors;
});

// ============================================================
// 输出报告
// ============================================================
console.log('========================================');
console.log('  数据契约一致性校验报告');
console.log('========================================\n');

let allPassed = true;
for (const r of results) {
  const icon = r.passed ? '✅' : '❌';
  console.log(`${icon} ${r.name}`);
  if (!r.passed) {
    allPassed = false;
    for (const d of r.details) console.log(`   ⮑ ${d}`);
  }
}

console.log('\n========================================');
console.log(allPassed ? '✅ 全部契约检查通过' : '❌ 存在契约不一致');
console.log('========================================\n');

process.exit(allPassed ? 0 : 1);
