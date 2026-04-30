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
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('请输入名字 (First name is required)')
    .isLength({ max: 50 })
    .withMessage('名字不能超过50个字符 (First name cannot exceed 50 characters)'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('请输入姓氏 (Last name is required)')
    .isLength({ max: 50 })
    .withMessage('姓氏不能超过50个字符 (Last name cannot exceed 50 characters)'),
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

export default validate;
