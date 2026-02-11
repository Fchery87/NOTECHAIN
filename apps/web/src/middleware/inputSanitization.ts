import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { InputValidator } from '../lib/security/inputValidator';

/**
 * Input Sanitization Middleware
 * Sanitizes and validates all incoming requests
 */
export async function middleware(request: NextRequest) {
  // Only process POST, PUT, PATCH requests with bodies
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
    return NextResponse.next();
  }

  // Check content type
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      // Clone request to read body
      const clonedRequest = request.clone();
      const body = await clonedRequest.json();

      // Sanitize the body
      const sanitizedBody = sanitizeObject(body);

      // Check for injection attempts
      if (containsInjection(sanitizedBody)) {
        return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 });
      }

      // Check request size
      const bodyString = JSON.stringify(body);
      if (bodyString.length > 10 * 1024 * 1024) {
        // 10MB limit
        return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
      }
    } catch {
      // Invalid JSON
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  }

  // Sanitize query parameters
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  for (const [_key, value] of searchParams.entries()) {
    if (InputValidator.detectInjection(value)) {
      return NextResponse.json({ error: 'Invalid query parameter' }, { status: 400 });
    }
  }

  return NextResponse.next();
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize keys too
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize a string value
 */
function sanitizeString(value: string): string {
  if (!value) return value;

  // Remove null bytes and control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  let sanitized = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Check if object contains injection attempts
 */
function containsInjection(obj: unknown): boolean {
  if (typeof obj === 'string') {
    return InputValidator.detectInjection(obj);
  }

  if (Array.isArray(obj)) {
    return obj.some(item => containsInjection(item));
  }

  if (obj && typeof obj === 'object') {
    return Object.values(obj).some(value => containsInjection(value));
  }

  return false;
}

/**
 * Configure middleware to run on API routes
 */
export const config = {
  matcher: ['/api/:path*'],
};
