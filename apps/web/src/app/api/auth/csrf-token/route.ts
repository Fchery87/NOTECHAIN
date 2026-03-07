/**
 * CSRF Token API Endpoint
 *
 * GET: Returns a new CSRF token for the client to use
 * This endpoint should be called when the client needs a fresh CSRF token
 */

import { NextResponse } from 'next/server';
import { generateCSRFToken, getCSRFCookieConfig } from '@/lib/security/csrf';
import { withRateLimit } from '@/lib/security/serverRateLimiter';

async function handler() {
  const token = generateCSRFToken();
  const cookieConfig = getCSRFCookieConfig(token);

  const response = NextResponse.json({
    token,
    expiresIn: cookieConfig.options.maxAge,
  });

  // Set CSRF token as a cookie for double-submit pattern
  response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig.options);

  return response;
}

export const GET = withRateLimit(handler, 'api');
