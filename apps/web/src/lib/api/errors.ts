/**
 * Standardized API Error Handling
 *
 * Provides consistent error responses across all API routes with:
 * - Standardized error codes
 * - Consistent response structure
 * - Error logging with correlation IDs
 * - Helper functions for common error scenarios
 */

import { NextResponse } from 'next/server';

/**
 * Standard error codes for API responses
 */
export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  ADMIN_REQUIRED = 'ADMIN_REQUIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Resource errors (404)
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  RESOURCE_EXISTS = 'RESOURCE_EXISTS',

  // Rate limiting (429)
  RATE_LIMITED = 'RATE_LIMITED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Service unavailable (503)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
}

/**
 * Standard error response structure
 */
export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
    timestamp: string;
  };
}

/**
 * HTTP status code mapping for error codes
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,

  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.ADMIN_REQUIRED]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,

  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,

  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,

  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.DUPLICATE_ENTRY]: 409,
  [ErrorCode.RESOURCE_EXISTS]: 409,

  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,

  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 500,

  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.MAINTENANCE]: 503,
};

/**
 * Default messages for error codes
 */
const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: 'Authentication required',
  [ErrorCode.INVALID_TOKEN]: 'Invalid authentication token',
  [ErrorCode.TOKEN_EXPIRED]: 'Authentication token has expired',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired',

  [ErrorCode.FORBIDDEN]: 'Access denied',
  [ErrorCode.ADMIN_REQUIRED]: 'Admin access required',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions for this action',

  [ErrorCode.VALIDATION_ERROR]: 'Validation failed',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ErrorCode.INVALID_FORMAT]: 'Invalid format provided',

  [ErrorCode.NOT_FOUND]: 'Resource not found',
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource was not found',

  [ErrorCode.CONFLICT]: 'Resource conflict',
  [ErrorCode.DUPLICATE_ENTRY]: 'This entry already exists',
  [ErrorCode.RESOURCE_EXISTS]: 'Resource already exists',

  [ErrorCode.RATE_LIMITED]: 'Too many requests',
  [ErrorCode.TOO_MANY_REQUESTS]: 'Rate limit exceeded, please try again later',

  [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred',
  [ErrorCode.DATABASE_ERROR]: 'Database operation failed',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service unavailable',

  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ErrorCode.MAINTENANCE]: 'Service under maintenance',
};

/**
 * Generate a unique request ID for error tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Log error with context (only in development or for critical errors)
 */
function logError(
  code: ErrorCode,
  message: string,
  requestId: string,
  error?: unknown,
  details?: Record<string, unknown>
): void {
  const isDev = process.env.NODE_ENV === 'development';
  const isCritical = [
    ErrorCode.INTERNAL_ERROR,
    ErrorCode.DATABASE_ERROR,
    ErrorCode.EXTERNAL_SERVICE_ERROR,
  ].includes(code);

  if (isDev || isCritical) {
    console.error('[API Error]', {
      code,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      details,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message?: string,
  options?: {
    details?: Record<string, unknown>;
    error?: unknown;
  }
): NextResponse<ApiErrorResponse> {
  const requestId = generateRequestId();
  const errorMessage = message || DEFAULT_MESSAGES[code];
  const status = ERROR_STATUS_MAP[code];

  logError(code, errorMessage, requestId, options?.error, options?.details);

  return NextResponse.json(
    {
      error: {
        code,
        message: errorMessage,
        details: options?.details,
        requestId,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Helper functions for common error scenarios
 */
export const ApiErrors = {
  unauthorized: (message?: string) => createErrorResponse(ErrorCode.UNAUTHORIZED, message),

  invalidToken: (message?: string) => createErrorResponse(ErrorCode.INVALID_TOKEN, message),

  forbidden: (message?: string) => createErrorResponse(ErrorCode.FORBIDDEN, message),

  adminRequired: () => createErrorResponse(ErrorCode.ADMIN_REQUIRED),

  notFound: (resource?: string) =>
    createErrorResponse(ErrorCode.NOT_FOUND, resource ? `${resource} not found` : undefined),

  userNotFound: () => createErrorResponse(ErrorCode.USER_NOT_FOUND),

  validationError: (details?: Record<string, unknown>) =>
    createErrorResponse(ErrorCode.VALIDATION_ERROR, undefined, { details }),

  invalidInput: (field: string, reason?: string) =>
    createErrorResponse(ErrorCode.INVALID_INPUT, undefined, {
      details: { field, reason },
    }),

  missingField: (field: string) =>
    createErrorResponse(ErrorCode.MISSING_REQUIRED_FIELD, undefined, {
      details: { field },
    }),

  conflict: (message?: string) => createErrorResponse(ErrorCode.CONFLICT, message),

  rateLimited: (retryAfter?: number) =>
    createErrorResponse(ErrorCode.RATE_LIMITED, undefined, {
      details: { retryAfter },
    }),

  internalError: (error?: unknown) =>
    createErrorResponse(ErrorCode.INTERNAL_ERROR, undefined, { error }),

  databaseError: (error?: unknown) =>
    createErrorResponse(ErrorCode.DATABASE_ERROR, undefined, { error }),

  serviceUnavailable: (service?: string) =>
    createErrorResponse(
      ErrorCode.SERVICE_UNAVAILABLE,
      service ? `${service} is unavailable` : undefined
    ),
};

/**
 * Type guard for checking if a response is an API error
 */
export function isApiErrorResponse(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ApiErrorResponse).error === 'object' &&
    'code' in (response as ApiErrorResponse).error &&
    'message' in (response as ApiErrorResponse).error
  );
}

/**
 * Wrap an async handler with standardized error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch(error => {
    if (error instanceof ApiError) {
      return createErrorResponse(error.code, error.message, { details: error.details });
    }
    return ApiErrors.internalError(error);
  });
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message || DEFAULT_MESSAGES[code]);
    this.name = 'ApiError';
  }

  toResponse(): NextResponse<ApiErrorResponse> {
    return createErrorResponse(this.code, this.message, { details: this.details });
  }
}
