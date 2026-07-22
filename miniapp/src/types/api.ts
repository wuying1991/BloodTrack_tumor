/** Mirrors backend ApiError / success envelope shapes used by the web client. */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiFailureBody {
  success?: false;
  message?: string;
  code?: string;
  errors?: Record<string, string>;
  errorCodes?: Record<string, string>;
}

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  errors?: Record<string, string>;
  errorCodes?: Record<string, string>;

  constructor(
    statusCode: number,
    message: string,
    options?: {
      code?: string;
      errors?: Record<string, string>;
      errorCodes?: Record<string, string>;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = options?.code;
    this.errors = options?.errors;
    this.errorCodes = options?.errorCodes;
  }
}
