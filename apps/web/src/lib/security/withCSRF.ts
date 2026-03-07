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
 * Higher-order function to wrap Next.js App Router handlers with CSRF protection
 * Supports routes with params (e.g., /api/users/[id]/role)
 *
 * @param handler The API route handler to protect
 * @returns A protected handler that validates CSRF before calling the original
 *
 * @example
 * ```typescript
 * export const POST = withCSRFWithParams(
 *   async (request: NextRequest, { params }: { params: { id: string } }) => {
 *     const body = await request.json();
 *     // Process the request
 *     return NextResponse.json({ success: true });
 *   }
 * );
 * ```
 */
export function withCSRFWithParams<T extends NextRequest, P extends Record<string, string>>(
  handler: (request: T, context: { params: Promise<P> }) => Promise<NextResponse> | NextResponse
): (request: T, context: { params: Promise<P> }) => Promise<NextResponse> {
  return async (request: T, context: { params: Promise<P> }) => {
    const validation = validateCSRF(request);

    if (!validation.valid) {
      return csrfErrorResponse(validation.error || 'Unknown error');
    }

    return handler(request, context);
  };
}
