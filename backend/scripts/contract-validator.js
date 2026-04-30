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
  const optionalFields = ['neu?', 'lym?', 'notes?', 'isAbnormal'];

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

  const expectedFields = ['date', 'wbc', 'rbc', 'hgb', 'plt', 'neu', 'lym', 'notes'];
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
    'neu?:', 'lym?:', 'notes?:', 'isAbnormal?:', 'createdAt?:', 'updatedAt?:',
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
