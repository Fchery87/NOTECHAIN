/**
 * CSRF Protection Wrapper for API Routes
 *
 * This module provides utilities for protecting API routes with CSRF validation.
 * Use these wrappers to automatically validate CSRF tokens on state-changing operations.
 *
 * Usage:
 * ```typescript
 * import { withCSRF } from '@/lib/security/withCSRF';
 *
 * export const POST = withCSRF(async (request: NextRequest) => {
 *   // Your protected handler
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */

import { NextResponse, type NextRequest } from 'next/server';
import { validateCSRF } from './csrf';

/**
 * Response for CSRF validation failure
 */
function csrfErrorResponse(error: string): NextResponse {
  return NextResponse.json(
    {
      error: 'CSRF validation failed',
      message: error,
      code: 'CSRF_ERROR',
    },
    { status: 403 }
  );
}

/**
 * Higher-order function to wrap API handlers with CSRF protection
 *
 * @param handler The API route handler to protect
 * @returns A protected handler that validates CSRF before calling the original
 *
 * @example
 * ```typescript
 * export const POST = withCSRF(async (request: NextRequest) => {
 *   const body = await request.json();
 *   // Process the request
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCSRF<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse> | NextResponse
): (request: T) => Promise<NextResponse> {
  return async (request: T) => {
    const validation = validateCSRF(request);

    if (!validation.valid) {
      return csrfErrorResponse(validation.error || 'Unknown error');
    }

    return handler(request);
  };
}

/**
 * Higher-order function that adds optional CSRF protection
 * Use this for routes that should have CSRF but need to maintain backward compatibility
 *
 * @param handler The API route handler to protect
 * @param options Configuration options
 * @returns A protected handler
 */
export function withOptionalCSRF<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse> | NextResponse,
  options: {
    /** Skip CSRF in development mode */
    skipInDevelopment?: boolean;
    /** Custom error handler */
    onError?: (error: string, request: T) => NextResponse | Promise<NextResponse>;
  } = {}
): (request: T) => Promise<NextResponse> {
  const { skipInDevelopment = true, onError } = options;

  return async (request: T) => {
    // Skip in development if configured
    if (skipInDevelopment && process.env.NODE_ENV === 'development') {
      return handler(request);
    }

    const validation = validateCSRF(request);

    if (!validation.valid) {
      if (onError) {
        return onError(validation.error || 'Unknown error', request);
      }
      return csrfErrorResponse(validation.error || 'Unknown error');
    }

    return handler(request);
  };
}

/**
 * Create a CSRF-protected API route object for Next.js App Router
 * This provides a convenient way to protect multiple HTTP methods
 *
 * @param handlers Object mapping HTTP methods to handlers
 * @returns Object with protected handlers
 *
 * @example
 * ```typescript
 * export const { GET, POST, PUT, DELETE } = createProtectedRoute({
 *   GET: async (request) => { ... },
 *   POST: async (request) => { ... },
 *   PUT: async (request) => { ... },
 *   DELETE: async (request) => { ... },
 * });
 * ```
 */
export function createProtectedRoute<T extends NextRequest>(handlers: {
  GET?: (request: T) => Promise<NextResponse> | NextResponse;
  POST?: (request: T) => Promise<NextResponse> | NextResponse;
  PUT?: (request: T) => Promise<NextResponse> | NextResponse;
  PATCH?: (request: T) => Promise<NextResponse> | NextResponse;
  DELETE?: (request: T) => Promise<NextResponse> | NextResponse;
}): Record<string, (request: T) => Promise<NextResponse>> {
  const protectedHandlers: Record<string, (request: T) => Promise<NextResponse>> = {};

  // Methods that require CSRF protection
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  for (const [method, handler] of Object.entries(handlers)) {
    if (handler) {
      if (protectedMethods.includes(method)) {
        protectedHandlers[method] = withCSRF(handler);
      } else {
        // GET and HEAD don't need CSRF protection - wrap to ensure Promise return
        protectedHandlers[method] = async (request: T) => {
          const result = handler(request);
          return result instanceof Promise ? result : Promise.resolve(result);
        };
      }
    }
  }

  return protectedHandlers;
}

/**
 * Middleware-style CSRF validation for use in route handlers
 * Returns null if validation passes, or an error response if it fails
 *
 * @param request The incoming request
 * @returns Error response if validation fails, null if it passes
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const csrfError = await validateCSRFMiddleware(request);
 *   if (csrfError) return csrfError;
 *
 *   // Continue with handler
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
export function validateCSRFMiddleware(request: NextRequest): NextResponse | null {
  const validation = validateCSRF(request);

  if (!validation.valid) {
    return csrfErrorResponse(validation.error || 'Unknown error');
  }

  return null;
}

/**
 * Export all CSRF protection utilities
 */
export const CSRFProtection = {
  withCSRF,
  withOptionalCSRF,
  createProtectedRoute,
  validateCSRFMiddleware,
};

export default CSRFProtection;
