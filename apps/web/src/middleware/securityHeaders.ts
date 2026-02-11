import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSecurityHeaders } from '../lib/security/csp';

/**
 * Security Headers Middleware
 * Adds comprehensive security headers to all responses
 */
export function middleware(_request: NextRequest) {
  // Get response
  const response = NextResponse.next();

  // Determine if we're in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Add security headers
  const securityHeaders = getSecurityHeaders(isDevelopment);

  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    }
  });

  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Frame options - prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // XSS protection (legacy but still useful)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

/**
 * Configure middleware to run on specific paths
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
