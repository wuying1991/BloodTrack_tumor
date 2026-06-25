import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '../utils/ApiError';

/**
 * Validation Middleware
 * Handles request validation using express-validator
 */

// Middleware to check validation results
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMap: Record<string, string> = {};
    errors.array().forEach((error: any) => {
      if (error.path) {
        errorMap[error.path] = error.msg;
      }
    });

    const error = ApiError.validation('Validation failed', errorMap);
    return next(error);
  }

  next();
};

// Helper to run validations
export const runValidation = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    validate(req, res, next);
  };
};

/**
 * Common Validation Rules
 */

// User registration validation
export const validateRegister = runValidation([
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址 (Please enter a valid email)'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少需要6个字符 (Password must be at least 6 characters)')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字 (Password must contain uppercase, lowercase and number)'),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('请输入姓名 (Full name is required)')
    .isLength({ max: 50 })
    .withMessage('姓名不能超过50个字符 (Full name cannot exceed 50 characters)'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('请输入有效的日期格式 (Please enter a valid date)'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
    .withMessage('请选择有效的性别选项 (Please select a valid gender option)'),
]);

// User login validation
export const validateLogin = runValidation([
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址 (Please enter a valid email)'),
  body('password')
    .notEmpty()
    .withMessage('请输入密码 (Password is required)'),
]);

// Password reset request validation
export const validateForgotPassword = runValidation([
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址 (Please enter a valid email)'),
]);

// Password reset validation
export const validateResetPassword = runValidation([
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少需要6个字符 (Password must be at least 6 characters)')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字 (Password must contain uppercase, lowercase and number)'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('两次输入的密码不一致 (Passwords do not match)');
      }
      return true;
    }),
]);

// Blood test data validation
// Fields MUST match BloodTest model schema exactly
export const validateBloodTest = runValidation([
  body('date')
    .notEmpty()
    .withMessage('检测日期是必需的 (Test date is required)')
    .isISO8601()
    .withMessage('请输入有效的日期格式 (Please enter a valid date)'),
  body('wbc')
    .notEmpty()
    .withMessage('白细胞计数是必需的 (WBC is required)')
    .isFloat({ min: 0 })
    .withMessage('白细胞计数必须为正数 (WBC must be a positive number)'),
  body('rbc')
    .notEmpty()
    .withMessage('红细胞计数是必需的 (RBC is required)')
    .isFloat({ min: 0 })
    .withMessage('红细胞计数必须为正数 (RBC must be a positive number)'),
  body('hgb')
    .notEmpty()
    .withMessage('血红蛋白是必需的 (Hemoglobin is required)')
    .isFloat({ min: 0 })
    .withMessage('血红蛋白必须为正数 (Hemoglobin must be a positive number)'),
  body('plt')
    .notEmpty()
    .withMessage('血小板计数是必需的 (Platelets is required)')
    .isFloat({ min: 0 })
    .withMessage('血小板计数必须为正数 (Platelets must be a positive number)'),
  body('neu')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('中性粒细胞计数必须为正数 (Neutrophils must be a positive number)'),
  body('lym')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('淋巴细胞计数必须为正数 (Lymphocytes must be a positive number)'),
  body('notes')
    .optional()
    .isString()
    .withMessage('备注必须是文本 (Notes must be text)'),
  body('chemoCycleId')
    .optional({ nullable: true })
    .custom(value => {
      if (value === null || value === '') return true;
      if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
        throw new Error('无效的化疗周期ID (Invalid chemo cycle id)');
      }
      return true;
    }),
]);

// Update validation - all fields optional (partial update)
export const validateBloodTestUpdate = runValidation([
  body('date')
    .optional()
    .isISO8601()
    .withMessage('请输入有效的日期格式 (Please enter a valid date)'),
  body('wbc')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('白细胞计数必须为正数 (WBC must be a positive number)'),
  body('rbc')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('红细胞计数必须为正数 (RBC must be a positive number)'),
  body('hgb')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('血红蛋白必须为正数 (Hemoglobin must be a positive number)'),
  body('plt')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('血小板计数必须为正数 (Platelets must be a positive number)'),
  body('neu')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('中性粒细胞计数必须为正数 (Neutrophils must be a positive number)'),
  body('lym')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('淋巴细胞计数必须为正数 (Lymphocytes must be a positive number)'),
  body('notes')
    .optional()
    .isString()
    .withMessage('备注必须是文本 (Notes must be text)'),
  body('chemoCycleId')
    .optional({ nullable: true })
    .custom(value => {
      if (value === null || value === '') return true;
      if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
        throw new Error('无效的化疗周期ID (Invalid chemo cycle id)');
      }
      return true;
    }),
]);

// Pagination validation
export const validatePagination = runValidation([
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数 (Page must be a positive integer)')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间 (Limit must be between 1-100)')
    .toInt(),
]);

// ID parameter validation
export const validateId = runValidation([
  param('id')
    .isMongoId()
    .withMessage('无效的资源ID (Invalid resource ID)'),
]);

// Chemo cycle validation
const hasMedicationContent = (m: Record<string, unknown> | undefined): boolean => {
  if (!m) return false;
  return ['name', 'dosage', 'startDate', 'endDate', 'notes'].some(key => {
    const value = m[key];
    return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
  });
};

const validateMedicationDateRange = (value: unknown, { req, path }: any) => {
  const match = path.match(/^medications\.(\d+)\.endDate$/);
  if (!match || !value) return true;
  const idx = Number(match[1]);
  const start = req.body?.medications?.[idx]?.startDate;
  if (start && new Date(value as string) < new Date(start)) {
    throw new Error('用药结束日期必须晚于开始日期');
  }
  return true;
};

export const validateChemoCycle = runValidation([
  body('regimenName')
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('方案名称必须为 1-120 字符'),
  body('startDate')
    .notEmpty()
    .withMessage('开始日期是必需的 (Start date is required)')
    .isISO8601()
    .withMessage('请输入有效的日期格式'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('请输入有效的日期格式')
    .custom((value, { req }) => {
      if (value && req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
        throw new Error('结束日期必须晚于开始日期');
      }
      return true;
    }),
  body('medications')
    .optional()
    .isArray()
    .withMessage('药物列表必须为数组'),
  body('medications.*')
    .optional()
    .custom(value => {
      if (!hasMedicationContent(value)) {
        throw new Error('药物信息至少需要填写一项');
      }
      return true;
    }),
  body('medications.*.name')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('药物名称必须是文本'),
  body('medications.*.dosage')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('药物剂量必须是文本'),
  body('medications.*.startDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('请输入有效的用药开始日期'),
  body('medications.*.endDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('请输入有效的用药结束日期')
    .custom(validateMedicationDateRange),
  body('medications.*.notes')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('药物备注最多 1000 字符'),
  body('doctorNotes')
    .optional()
    .isString()
    .withMessage('医生备注必须是文本'),
]);

// Update validation - all fields optional
export const validateChemoCycleUpdate = runValidation([
  body('regimenName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('方案名称必须为 1-120 字符'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('请输入有效的日期格式'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('请输入有效的日期格式')
    .custom((value, { req }) => {
      if (value && req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
        throw new Error('结束日期必须晚于开始日期');
      }
      return true;
    }),
  body('medications')
    .optional()
    .isArray()
    .withMessage('药物列表必须为数组'),
  body('medications.*')
    .optional()
    .custom(value => {
      if (!hasMedicationContent(value)) {
        throw new Error('药物信息至少需要填写一项');
      }
      return true;
    }),
  body('medications.*.name')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('药物名称必须是文本'),
  body('medications.*.dosage')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('药物剂量必须是文本'),
  body('medications.*.startDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('请输入有效的用药开始日期'),
  body('medications.*.endDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('请输入有效的用药结束日期')
    .custom(validateMedicationDateRange),
  body('medications.*.notes')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('药物备注最多 1000 字符'),
  body('doctorNotes')
    .optional()
    .isString()
    .withMessage('医生备注必须是文本'),
]);

// Profile update validation
export const validateProfileUpdate = runValidation([
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('姓名不能为空 (Full name cannot be empty)'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('请输入有效的日期格式'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
    .withMessage('请选择有效的性别选项'),
]);

// Settings update validation
export const validateSettingsUpdate = runValidation([
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('邮件通知设置必须为布尔值'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('推送通知设置必须为布尔值'),
  body('dataSharing.enabled')
    .optional()
    .isBoolean()
    .withMessage('数据共享设置必须为布尔值'),
  body('dataSharing.sharedWith')
    .optional()
    .isArray()
    .withMessage('共享用户列表必须为数组'),
]);

// Change password validation
export const validateChangePassword = runValidation([
  body('currentPassword')
    .notEmpty()
    .withMessage('请输入当前密码 (Current password is required)'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('密码至少需要6个字符 (Password must be at least 6 characters)')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字 (Password must contain uppercase, lowercase and number)'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('两次输入的新密码不一致 (Passwords do not match)');
      }
      return true;
    }),
]);

// Delete account validation - 仅需密码二次确认
export const validateDeleteAccount = runValidation([
  body('password')
    .notEmpty()
    .withMessage('请输入密码以确认删除 (Password is required to confirm deletion)'),
]);

// ============================================================
// Reminder validation
// ============================================================

const REMINDER_TYPES = [
  'blood-test',
  'chemo-cycle',
  'medication',
  'follow-up',
  'custom',
];
const REMINDER_RECURRENCES = ['none', 'daily', 'weekly', 'monthly'];

export const validateReminderCreate = runValidation([
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('标题必须为 1-120 字符 (Title must be 1-120 chars)'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('备注最多 1000 字符 (Description must be ≤1000 chars)'),
  body('type')
    .optional()
    .isIn(REMINDER_TYPES)
    .withMessage('提醒类型不合法 (Invalid reminder type)'),
  body('dueDate')
    .isISO8601()
    .withMessage('请输入合法的到期日期 (Invalid due date)'),
  body('recurrence')
    .optional()
    .isIn(REMINDER_RECURRENCES)
    .withMessage('循环类型不合法 (Invalid recurrence)'),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('enabled 必须为布尔值'),
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('邮件通知必须为布尔值'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('推送通知必须为布尔值'),
]);

// Update: 全部字段 optional
export const validateReminderUpdate = runValidation([
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('标题必须为 1-120 字符 (Title must be 1-120 chars)'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('备注最多 1000 字符 (Description must be ≤1000 chars)'),
  body('type')
    .optional()
    .isIn(REMINDER_TYPES)
    .withMessage('提醒类型不合法 (Invalid reminder type)'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('请输入合法的到期日期 (Invalid due date)'),
  body('recurrence')
    .optional()
    .isIn(REMINDER_RECURRENCES)
    .withMessage('循环类型不合法 (Invalid recurrence)'),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('enabled 必须为布尔值'),
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('completed 必须为布尔值'),
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('邮件通知必须为布尔值'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('推送通知必须为布尔值'),
]);

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

export default validate;
