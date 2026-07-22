import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { redactErrorMessage } from '../utils/redact';

/**
 * Error Response Interface
 */
interface ErrorResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  errorCodes?: Record<string, string>;
  code?: string;
  stack?: string;
  statusCode: number;
}

/**
 * Global Error Handler Middleware
 * Handles all errors in a standardized format
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = err;
  let statusCode = 500;

  // Check if it's an ApiError
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
  }

  // Mongoose bad ObjectId
  if (error.name === 'CastError') {
    const message = '资源未找到 (Resource not found)';
    error = ApiError.notFound(message, 'MONGOSE_CAST');
    statusCode = 404;
  }

  // Mongoose duplicate key
  if ((error as any).code === 11000) {
    const field = Object.keys((error as any).keyValue)[0];
    const message = `${field} 已被使用 (${field} is already taken)`;
    error = ApiError.conflict(message, 'MONGOSE_DUPLICATE');
    statusCode = 409;
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors: Record<string, string> = {};
    Object.values((error as any).errors).forEach((val: any) => {
      errors[val.path] = val.message;
    });
    const message = '数据验证失败 (Data validation failed)';
    error = ApiError.validation(message, errors, undefined, 'MONGOSE_VALIDATION');
    statusCode = 422;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    const message = '无效的认证令牌 (Invalid authentication token)';
    error = ApiError.unauthorized(message, 'JWT_INVALID');
    statusCode = 401;
  }

  if (error.name === 'TokenExpiredError') {
    const message = '认证令牌已过期 (Authentication token has expired)';
    error = ApiError.unauthorized(message, 'JWT_EXPIRED');
    statusCode = 401;
  }

  // Prepare error response (never leak raw secrets via message)
  const safeMessage = redactErrorMessage(
    error.message || '服务器错误 (Server Error)'
  );
  const response: ErrorResponse = {
    success: false,
    message: safeMessage,
    statusCode,
  };

  // Add validation errors + code if present (ApiError)
  if (error instanceof ApiError) {
    if (error.errors) response.errors = error.errors;
    if (error.errorCodes) response.errorCodes = error.errorCodes;
    if (error.code) response.code = error.code;
  }

  // Add stack trace in development mode only (also redact long blobs)
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = redactErrorMessage(error.stack);
  }

  // Log error for debugging — message only, avoid dumping full request bodies
  if (statusCode >= 500) {
    console.error('Server Error:', redactErrorMessage(error));
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found Handler
 * Handles requests to undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = ApiError.notFound(`找不到路径: ${req.originalUrl} (Route not found)`, 'ROUTE_NOT_FOUND');
  next(error);
};

/**
 * Async Error Wrapper
 * Wraps async functions to catch errors automatically
 */
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
