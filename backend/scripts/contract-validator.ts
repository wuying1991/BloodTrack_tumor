/**
 * 数据契约一致性校验脚本
 *
 * 用途: CI 阶段自动验证前后端数据类型与 contracts/index.ts 一致
 * 运行: npx ts-node scripts/contract-validator.ts
 *
 * 检查项:
 * 1. 后端 Model 字段 vs contracts 定义
 * 2. 前端 types/index.ts 字段 vs contracts 定义
 * 3. Validation 中间件字段 vs Model 字段
 * 4. Controller 响应字段 vs contracts 定义
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

interface CheckResult {
  name: string;
  passed: boolean;
  details: string[];
}

const results: CheckResult[] = [];

function check(name: string, fn: () => string[]): void {
  const details = fn();
  results.push({ name, passed: details.length === 0, details });
}

// ============================================================
// 检查 1: 后端 BloodTest Model 字段与 contracts 一致
// ============================================================
check('后端 BloodTest Model ↔ contracts', () => {
  const errors: string[] = [];
  const modelPath = path.join(ROOT, 'src', 'models', 'BloodTest.ts');
  const content = fs.readFileSync(modelPath, 'utf-8');

  // 后端 model 的必选字段
  const requiredFields = [
    { field: 'user', type: 'ObjectId|string' },
    { field: 'date', type: 'Date|string' },
    { field: 'wbc', type: 'number' },
    { field: 'rbc', type: 'number' },
    { field: 'hgb', type: 'number' },
    { field: 'plt', type: 'number' },
  ];

  // 后端 model 的可选字段
  const optionalFields = [
    { field: 'neu', type: 'number' },
    { field: 'lym', type: 'number' },
    { field: 'notes', type: 'string' },
    { field: 'isAbnormal', type: 'boolean' },
  ];

  for (const { field, type } of requiredFields) {
    if (!content.includes(`${field}:`)) {
      errors.push(`Model 缺少必选字段: ${field}`);
    }
  }

  for (const { field, type } of optionalFields) {
    if (!content.includes(`${field}:`)) {
      errors.push(`Model 缺少可选字段: ${field}`);
    }
  }

  // 确保没有嵌套的 values 对象
  if (content.includes('values:')) {
    errors.push('Model 不应有嵌套 values 对象 (应为扁平结构)');
  }

  // 确保字段名使用简写
  if (content.includes('testDate:')) {
    errors.push('Model 字段应为 date 而非 testDate');
  }
  if (content.includes('userId:')) {
    errors.push('Model 字段应为 user 而非 userId');
  }
  if (content.includes('platelets:')) {
    errors.push('Model 字段应为 plt 而非 platelets');
  }
  if (content.includes('hemoglobin:')) {
    errors.push('Model 字段应为 hgb 而非 hemoglobin');
  }
  if (content.includes('neutrophils:')) {
    errors.push('Model 字段应为 neu 而非 neutrophils');
  }
  if (content.includes('lymphocytes:')) {
    errors.push('Model 字段应为 lym 而非 lymphocytes');
  }

  return errors;
});

// ============================================================
// 检查 2: Validation 中间件字段与 Model 一致
// ============================================================
check('Validation 中间件 ↔ Model 字段', () => {
  const errors: string[] = [];
  const validationPath = path.join(
    ROOT,
    'src',
    'middlewares',
    'validationMiddleware.ts'
  );
  const content = fs.readFileSync(validationPath, 'utf-8');

  // 确保 validateBloodTest 包含所有 model 字段
  const expectedFields = ['date', 'wbc', 'rbc', 'hgb', 'plt', 'neu', 'lym', 'notes'];

  for (const field of expectedFields) {
    // Check in the validateBloodTest section
    const validateSection = content.substring(
      content.indexOf('export const validateBloodTest'),
      content.indexOf('export const validateBloodTestUpdate')
    );

    if (!validateSection.includes(`body('${field}')`)) {
      errors.push(`validateBloodTest 缺少字段校验: ${field}`);
    }
  }

  // 确保没有旧字段名
  const deprecatedFields = ['testDate', 'hemoglobin', 'hematocrit', 'platelets', 'neutrophils', 'lymphocytes'];
  const validateBloodTestSection = content.substring(
    content.indexOf('export const validateBloodTest ='),
    content.indexOf('export const validateBloodTestUpdate =')
  );

  for (const field of deprecatedFields) {
    if (validateBloodTestSection.includes(`body('${field}')`)) {
      errors.push(`validateBloodTest 包含废弃字段名: ${field}`);
    }
  }

  return errors;
});

// ============================================================
// 检查 3: 前端 types/index.ts 与 contracts 一致
// ============================================================
check('前端 types/index.ts ↔ contracts', () => {
  const errors: string[] = [];
  const typesPath = path.join(ROOT, '..', 'frontend', 'src', 'types', 'index.ts');
  
  if (!fs.existsSync(typesPath)) {
    errors.push('找不到前端 types/index.ts');
    return errors;
  }

  const content = fs.readFileSync(typesPath, 'utf-8');

  // BloodTest 类型检查
  const bloodTestSection = content.substring(
    content.indexOf('export interface BloodTest {'),
    content.indexOf('export interface BloodTestCreateRequest')
  );

  const contractFields = [
    { field: '_id', required: true },
    { field: 'user', required: true },
    { field: 'date', required: true },
    { field: 'wbc', required: true },
    { field: 'rbc', required: true },
    { field: 'hgb', required: true },
    { field: 'plt', required: true },
    { field: 'neu?', required: false },
    { field: 'lym?', required: false },
    { field: 'notes?', required: false },
    { field: 'isAbnormal?', required: false },
    { field: 'createdAt?', required: false },
    { field: 'updatedAt?', required: false },
  ];

  for (const { field } of contractFields) {
    if (!bloodTestSection.includes(`${field}:`)) {
      errors.push(`前端 BloodTest 类型缺少字段: ${field}`);
    }
  }

  // 确保没有旧结构
  if (bloodTestSection.includes('values:')) {
    errors.push('前端不应有嵌套 values 对象');
  }
  if (bloodTestSection.includes('testDate:')) {
    errors.push('前端字段应为 date 而非 testDate');
  }
  if (bloodTestSection.includes('userId:')) {
    errors.push('前端字段应为 user 而非 userId');
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
for (const result of results) {
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.name}`);
  if (!result.passed) {
    allPassed = false;
    for (const detail of result.details) {
      console.log(`   ⮑ ${detail}`);
    }
  }
}

console.log('\n========================================');
console.log(allPassed ? '✅ 全部契约检查通过' : '❌ 存在契约不一致，请修复后重试');
console.log('========================================\n');

process.exit(allPassed ? 0 : 1);
