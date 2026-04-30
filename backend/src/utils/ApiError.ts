/**
 * API Error Class
 * Standardized error handling for the API
 */

export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: Record<string, string>;

  constructor(
    statusCode: number,
    message: string,
    isOperational: boolean = true,
    errors?: Record<string, string>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Bad Request Error (400)
   */
  static badRequest(message: string = 'Bad Request', errors?: Record<string, string>): ApiError {
    return new ApiError(400, message, true, errors);
  }

  /**
   * Unauthorized Error (401)
   */
  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(401, message, true);
  }

  /**
   * Forbidden Error (403)
   */
  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(403, message, true);
  }

  /**
   * Not Found Error (404)
   */
  static notFound(message: string = 'Resource not found'): ApiError {
    return new ApiError(404, message, true);
  }

  /**
   * Conflict Error (409)
   */
  static conflict(message: string = 'Conflict'): ApiError {
    return new ApiError(409, message, true);
  }

  /**
   * Validation Error (422)
   */
  static validation(message: string = 'Validation Error', errors?: Record<string, string>): ApiError {
    return new ApiError(422, message, true, errors);
  }

  /**
   * Internal Server Error (500)
   */
  static internal(message: string = 'Internal Server Error'): ApiError {
    return new ApiError(500, message, false);
  }
}

export default ApiError;
