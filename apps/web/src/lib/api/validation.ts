/**
 * API Input Validation Utilities
 *
 * Provides comprehensive input validation using Zod schemas with:
 * - Request body validation
 * - Query parameter validation
 * - Path parameter validation
 * - File upload validation
 * - Sanitization helpers
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiErrors } from './errors';

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: NextResponse };

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: ApiErrors.validationError({
          issues: result.error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      error: ApiErrors.invalidInput('body', 'Invalid JSON body'),
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): ValidationResult<z.infer<T>> {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string | string[]> = {};

  // Convert searchParams to object, handling arrays
  searchParams.forEach((value, key) => {
    const existing = params[key];
    if (existing) {
      params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      params[key] = value;
    }
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: ApiErrors.validationError({
        issues: result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      }),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Validate path parameters against a Zod schema
 */
export async function validateParams<T extends z.ZodType>(
  params: Promise<Record<string, string>>,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  const resolvedParams = await params;
  const result = schema.safeParse(resolvedParams);

  if (!result.success) {
    return {
      success: false,
      error: ApiErrors.validationError({
        issues: result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      }),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Common validation schemas
 */
export const schemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  }),

  // Sorting
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  // User status
  userStatus: z.enum(['active', 'suspended', 'inactive']),

  // User role
  userRole: z.enum(['user', 'moderator', 'admin']),

  // Email
  email: z.string().email('Invalid email format').max(255),

  // Password (minimum security requirements)
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  // Display name
  displayName: z.string().min(1).max(100),

  // Content (for notes, todos, etc.)
  content: z.string().max(1000000, 'Content exceeds maximum length'), // 1MB limit

  // Title
  title: z.string().min(1).max(500),

  // Search query
  searchQuery: z.string().max(200),

  // File size (in bytes)
  fileSize: z.number().max(50 * 1024 * 1024, 'File size exceeds 50MB limit'), // 50MB

  // MIME type
  mimeType: z.string().max(100),

  // Priority
  priority: z.enum(['high', 'medium', 'low']),

  // Todo status
  todoStatus: z.enum(['pending', 'completed']),
};

/**
 * Request size limit validation
 */
export async function validateRequestSize(
  request: NextRequest,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): Promise<ValidationResult<void>> {
  const contentLength = request.headers.get('content-length');

  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > maxSizeBytes) {
      return {
        success: false,
        error: ApiErrors.validationError({
          maxSize: maxSizeBytes,
          actualSize: size,
          message: `Request body exceeds maximum size of ${maxSizeBytes} bytes`,
        }),
      };
    }
  }

  return { success: true, data: undefined };
}

/**
 * Content-Type validation
 */
export function validateContentType(
  request: NextRequest,
  allowedTypes: string[] = ['application/json']
): ValidationResult<string> {
  const contentType = request.headers.get('content-type');

  if (!contentType) {
    return {
      success: false,
      error: ApiErrors.missingField('Content-Type header'),
    };
  }

  const baseContentType = contentType.split(';')[0].trim();

  if (!allowedTypes.includes(baseContentType)) {
    return {
      success: false,
      error: ApiErrors.validationError({
        allowedTypes,
        actualType: baseContentType,
        message: 'Invalid Content-Type',
      }),
    };
  }

  return { success: true, data: baseContentType };
}

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export function sanitizeString(input: string): string {
  return (
    input
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/gu, '')
      .trim()
  );
}

/**
 * Sanitize HTML content (basic - for production use a library like DOMPurify)
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/javascript:/gi, ''); // Remove javascript: URLs
}

/**
 * Create a validated API handler wrapper
 */
export function withValidation<TBody extends z.ZodType, TQuery extends z.ZodType>(
  bodySchema: TBody | null,
  querySchema: TQuery | null,
  handler: (context: {
    body: z.infer<TBody> | undefined;
    query: z.infer<TQuery> | undefined;
    request: NextRequest;
  }) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Validate body if schema provided
    let body: z.infer<TBody> | undefined;
    if (bodySchema) {
      const bodyResult = await validateBody(request, bodySchema);
      if (!bodyResult.success) {
        return bodyResult.error;
      }
      body = bodyResult.data;
    }

    // Validate query if schema provided
    let query: z.infer<TQuery> | undefined;
    if (querySchema) {
      const queryResult = validateQuery(request, querySchema);
      if (!queryResult.success) {
        return queryResult.error;
      }
      query = queryResult.data;
    }

    return handler({ body, query, request });
  };
}

/**
 * Combined validation for common API patterns
 */
export const validate = {
  body: validateBody,
  query: validateQuery,
  params: validateParams,
  requestSize: validateRequestSize,
  contentType: validateContentType,
  schemas,
  sanitizeString,
  sanitizeHtml,
  withValidation,
};
