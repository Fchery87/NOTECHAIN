import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiters, bruteForceProtection } from '../lib/security/rateLimiter';

/**
 * Rate Limiting Middleware
 * Prevents abuse and brute force attacks
 */
export async function middleware(request: NextRequest) {
  // Skip rate limiting for static assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get client identifier
  const clientId = getClientIdentifier(request);

  // Check brute force protection for auth endpoints
  if (isAuthEndpoint(request.nextUrl.pathname)) {
    if (bruteForceProtection.isLockedOut(clientId)) {
      const remaining = bruteForceProtection.getLockoutTimeRemaining(clientId);

      return NextResponse.json(
        {
          error: 'Too many failed attempts',
          retryAfter: remaining,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(remaining),
          },
        }
      );
    }

    // Apply strict rate limiting
    const result = await rateLimiters.auth.check(clientId);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimiters.auth['config']?.maxRequests || 5),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          },
        }
      );
    }

    // Add rate limit headers
    const response = NextResponse.next();
    response.headers.set(
      'X-RateLimit-Limit',
      String(rateLimiters.auth['config']?.maxRequests || 5)
    );
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

    return response;
  }

  // Apply general rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const result = await rateLimiters.api.check(clientId);

    if (!result.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const response = NextResponse.next();
    response.headers.set(
      'X-RateLimit-Limit',
      String(rateLimiters.api['config']?.maxRequests || 100)
    );
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

    return response;
  }

  return NextResponse.next();
}

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
  // Use IP address if available
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : undefined;

  if (ip) {
    return `ip:${ip}`;
  }

  // Fallback to user agent + path hash
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `client:${hashString(userAgent)}`;
}

/**
 * Simple hash function for strings
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Check if the request is to an authentication endpoint
 */
function isAuthEndpoint(path: string): boolean {
  const authPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/password-reset',
  ];

  return authPaths.some(authPath => path === authPath || path.startsWith(`${authPath}/`));
}

/**
 * Configure middleware to run on specific paths
 */
export const config = {
  matcher: ['/api/:path*', '/auth/:path*'],
};
