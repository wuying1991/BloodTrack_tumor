/**
 * API Error Class
 * Standardized error handling for the API
 *
 * L-P5: 新增 `code` (稳定错误码，前端映射翻译) + `errorCodes` (校验字段 -> code 平行 map)。
 * `message` 保留作双语/EN 兜底 + curl 调试，code 永不替代 message。
 */

export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: Record<string, string>;
  public errorCodes?: Record<string, string>;
  public code?: string;

  constructor(
    statusCode: number,
    message: string,
    isOperational: boolean = true,
    errors?: Record<string, string>,
    code?: string,
    errorCodes?: Record<string, string>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    this.code = code;
    this.errorCodes = errorCodes;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Bad Request Error (400)
   */
  static badRequest(
    message: string = 'Bad Request',
    errors?: Record<string, string>,
    code?: string
  ): ApiError {
    return new ApiError(400, message, true, errors, code);
  }

  /**
   * Unauthorized Error (401)
   */
  static unauthorized(message: string = 'Unauthorized', code?: string): ApiError {
    return new ApiError(401, message, true, undefined, code);
  }

  /**
   * Forbidden Error (403)
   */
  static forbidden(message: string = 'Forbidden', code?: string): ApiError {
    return new ApiError(403, message, true, undefined, code);
  }

  /**
   * Not Found Error (404)
   */
  static notFound(message: string = 'Resource not found', code?: string): ApiError {
    return new ApiError(404, message, true, undefined, code);
  }

  /**
   * Conflict Error (409)
   */
  static conflict(message: string = 'Conflict', code?: string): ApiError {
    return new ApiError(409, message, true, undefined, code);
  }

  /**
   * Gone Error (410) - 资源曾经存在但已永久消失（如已过期的分享链接）
   */
  static gone(message: string = 'Gone', code?: string): ApiError {
    return new ApiError(410, message, true, undefined, code);
  }

  /**
   * Validation Error (422)
   */
  static validation(
    message: string = 'Validation Error',
    errors?: Record<string, string>,
    errorCodes?: Record<string, string>,
    code?: string
  ): ApiError {
    return new ApiError(422, message, true, errors, code, errorCodes);
  }

  /**
   * Internal Server Error (500)
   */
  static internal(message: string = 'Internal Server Error'): ApiError {
    return new ApiError(500, message, false);
  }
}

export default ApiError;
