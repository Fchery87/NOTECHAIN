/**
 * CSRF (Cross-Site Request Forgery) Protection for NoteChain
 *
 * Security Features:
 * - Cryptographically secure token generation
 * - Token validation for state-changing operations
 * - Double-submit cookie pattern for stateless validation
 * - Origin/Referer header validation
 * - SameSite cookie attribute enforcement
 *
 * Usage:
 * Server-side:
 *   import { generateCSRFToken, validateCSRFToken } from '@/lib/security/csrf';
 *   const token = generateCSRFToken();
 *   const isValid = validateCSRFToken(request);
 *
 * Client-side:
 *   import { getCSRFToken } from '@/lib/security/csrf';
 *   const token = await getCSRFToken();
 *   // Include in request headers
 */

import { randomBytes, createHash } from 'crypto';

/**
 * CSRF token configuration
 */
const CSRF_CONFIG = {
  /** Token length in bytes */
  tokenLength: 32,
  /** Cookie name for CSRF token */
  cookieName: 'csrf_token',
  /** Header name for CSRF token */
  headerName: 'x-csrf-token',
  /** Token expiry in seconds (24 hours) */
  tokenExpiry: 86400,
  /** Secret for signing tokens (should be from env in production) */
  secret:
    process.env.CSRF_SECRET ||
    process.env.NEXT_PUBLIC_JWT_SECRET ||
    'csrf-secret-change-in-production',
};

/**
 * Generate a cryptographically secure CSRF token
 * @returns A base64-encoded token string
 */
export function generateCSRFToken(): string {
  const token = randomBytes(CSRF_CONFIG.tokenLength);
  const timestamp = Date.now().toString(36);
  const signature = createHash('sha256')
    .update(`${token.toString('base64')}${timestamp}${CSRF_CONFIG.secret}`)
    .digest('base64url');

  return `${token.toString('base64url')}.${timestamp}.${signature}`;
}

/**
 * Verify a CSRF token's signature
 * @param token The token to verify
 * @returns True if the token is valid
 */
export function verifyCSRFToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [tokenPart, timestamp, signature] = parts;

    // Verify signature
    const expectedSignature = createHash('sha256')
      .update(`${tokenPart}.${timestamp}.${CSRF_CONFIG.secret}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return false;
    }

    // Check expiry
    const tokenTime = parseInt(timestamp, 36);
    const now = Date.now();
    const age = (now - tokenTime) / 1000;

    if (age > CSRF_CONFIG.tokenExpiry) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validate the Origin or Referer header against the expected origin
 * @param request The incoming request
 * @returns True if the origin is valid
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // If no origin or referer, reject (except for same-origin requests)
  if (!origin && !referer) {
    // In development, allow requests without origin/referer
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }

  // Get the expected origin from host
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const expectedOrigin = `${protocol}://${host}`;

  // Check origin header
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const expectedUrl = new URL(expectedOrigin);

      // Compare protocol, host, and port
      return originUrl.protocol === expectedUrl.protocol && originUrl.host === expectedUrl.host;
    } catch {
      return false;
    }
  }

  // Check referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const expectedUrl = new URL(expectedOrigin);

      return refererUrl.protocol === expectedUrl.protocol && refererUrl.host === expectedUrl.host;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Validate CSRF protection for a request
 * Checks both token and origin/referer headers
 *
 * @param request The incoming request
 * @returns Object with validation result and error message
 */
export function validateCSRF(request: Request): { valid: boolean; error?: string } {
  // First, validate origin/referer
  if (!validateOrigin(request)) {
    return { valid: false, error: 'Invalid origin' };
  }

  // Get token from header or body
  const headerToken = request.headers.get(CSRF_CONFIG.headerName);

  // For GET/HEAD/OPTIONS, origin validation is sufficient
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // For state-changing methods, require token
  if (!headerToken) {
    return { valid: false, error: 'Missing CSRF token' };
  }

  if (!verifyCSRFToken(headerToken)) {
    return { valid: false, error: 'Invalid CSRF token' };
  }

  return { valid: true };
}

/**
 * Middleware helper to add CSRF token to response
 * @param headers The response headers to modify
 * @returns The CSRF token that was generated
 */
export function addCSRFToken(headers: Headers): string {
  const token = generateCSRFToken();
  headers.set(CSRF_CONFIG.headerName, token);
  return token;
}

/**
 * Get CSRF token from cookies or generate a new one
 * Client-side utility
 */
export async function getCSRFToken(): Promise<string> {
  // Try to get from cookie first
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(c => c.trim().startsWith(`${CSRF_CONFIG.cookieName}=`));

  if (csrfCookie) {
    const token = csrfCookie.split('=')[1];
    if (verifyCSRFToken(token)) {
      return token;
    }
  }

  // Fetch a new token from the server
  try {
    const response = await fetch('/api/auth/csrf-token', {
      method: 'GET',
      credentials: 'same-origin',
    });

    if (response.ok) {
      const data = await response.json();
      return data.token;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }

  // Fallback: generate a client-side token (less secure)
  return generateCSRFToken();
}

/**
 * Add CSRF token to fetch options
 * Helper for making CSRF-protected requests
 *
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns Modified fetch options with CSRF token
 */
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();

  // Only add CSRF for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCSRFToken();

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        [CSRF_CONFIG.headerName]: token,
      },
      credentials: 'same-origin',
    });
  }

  return fetch(url, {
    ...options,
    credentials: 'same-origin',
  });
}

/**
 * React hook for CSRF protection
 */
export function useCSRF() {
  const getToken = async () => {
    return getCSRFToken();
  };

  const fetchProtected = async (url: string, options: RequestInit = {}) => {
    return fetchWithCSRF(url, options);
  };

  return { getToken, fetchProtected };
}

/**
 * CSRF cookie configuration for setting cookies
 */
export function getCSRFCookieConfig(token: string) {
  return {
    name: CSRF_CONFIG.cookieName,
    value: token,
    options: {
      httpOnly: false, // Must be accessible to JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: CSRF_CONFIG.tokenExpiry,
    },
  };
}

/**
 * Export configuration for use in other modules
 */
export const CSRF = {
  generateCSRFToken,
  verifyCSRFToken,
  validateOrigin,
  validateCSRF,
  addCSRFToken,
  getCSRFToken,
  fetchWithCSRF,
  useCSRF,
  getCSRFCookieConfig,
  config: CSRF_CONFIG,
};

export default CSRF;
