import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * Error Response Interface
 */
interface ErrorResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
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
    error = ApiError.notFound(message);
    statusCode = 404;
  }

  // Mongoose duplicate key
  if ((error as any).code === 11000) {
    const field = Object.keys((error as any).keyValue)[0];
    const message = `${field} 已被使用 (${field} is already taken)`;
    error = ApiError.conflict(message);
    statusCode = 409;
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors: Record<string, string> = {};
    Object.values((error as any).errors).forEach((val: any) => {
      errors[val.path] = val.message;
    });
    const message = '数据验证失败 (Data validation failed)';
    error = ApiError.validation(message, errors);
    statusCode = 422;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    const message = '无效的认证令牌 (Invalid authentication token)';
    error = ApiError.unauthorized(message);
    statusCode = 401;
  }

  if (error.name === 'TokenExpiredError') {
    const message = '认证令牌已过期 (Authentication token has expired)';
    error = ApiError.unauthorized(message);
    statusCode = 401;
  }

  // Prepare error response
  const response: ErrorResponse = {
    success: false,
    message: error.message || '服务器错误 (Server Error)',
    statusCode,
  };

  // Add validation errors if present
  if (error instanceof ApiError && error.errors) {
    response.errors = error.errors;
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  // Log error for debugging
  if (statusCode >= 500) {
    console.error('Server Error:', error);
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found Handler
 * Handles requests to undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = ApiError.notFound(`找不到路径: ${req.originalUrl} (Route not found)`);
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
