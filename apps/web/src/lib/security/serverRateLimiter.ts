/**
 * Server-Side Rate Limiting Implementation
 *
 * This module provides rate limiting for server-side operations (middleware, API routes).
 * It uses a hybrid store with Redis backing for production and automatic memory fallback.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
 */

import { NextResponse, type NextRequest } from 'next/server';
import { HybridStore } from './RedisRateLimiter';

/**
 * Rate limit configuration
 */
export interface ServerRateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing */
  keyPrefix?: string;
  /** Message to return when rate limited */
  message?: string;
  /** Whether to include rate limit headers in response */
  includeHeaders?: boolean;
  /** Skip rate limiting for certain conditions */
  skip?: (req: NextRequest) => boolean;
}

/**
 * Rate limit state stored in memory (legacy interface for backward compatibility)
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// Global store instance with Redis backing and automatic memory fallback
const globalStore = new HybridStore(process.env.REDIS_URL);

/**
 * Extract client identifier from request
 * Uses X-Forwarded-For header (from proxy/load balancer) or falls back to IP
 */
export function getClientIdentifier(req: NextRequest): string {
  // Check for forwarded header (from nginx, cloudflare, etc.)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(',')[0].trim();
  }

  // Fall back to the request IP
  // Note: In Next.js, this may be available via req.ip or similar
  const ip = req.headers.get('x-real-ip');
  if (ip) {
    return ip;
  }

  // Last resort: use a hash of available headers
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const acceptLanguage = req.headers.get('accept-language') || '';
  return `fallback:${userAgent}:${acceptLanguage}`.slice(0, 64);
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(config: ServerRateLimitConfig) {
  const {
    maxRequests,
    windowMs,
    keyPrefix = 'rl:',
    message = 'Too many requests, please try again later.',
    includeHeaders = true,
    skip,
  } = config;

  return async function rateLimiter(req: NextRequest): Promise<NextResponse | null> {
    // Skip if condition is met
    if (skip?.(req)) {
      return null;
    }

    const clientId = getClientIdentifier(req);
    const key = `${keyPrefix}${clientId}`;

    const { count, resetTime } = await globalStore.increment(key, windowMs);
    const remaining = Math.max(0, maxRequests - count);
    const isLimited = count > maxRequests;

    // Create response with rate limit headers
    const headers = new Headers();
    if (includeHeaders) {
      headers.set('X-RateLimit-Limit', maxRequests.toString());
      headers.set('X-RateLimit-Remaining', remaining.toString());
      headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
    }

    if (isLimited) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      headers.set('Retry-After', retryAfter.toString());

      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message,
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(headers),
          },
        }
      );
    }

    // Not rate limited - return null to continue
    return null;
  };
}

/**
 * Pre-configured rate limiters for different endpoint types
 */
export const serverRateLimiters = {
  /**
   * Strict rate limiting for authentication endpoints
   * 5 requests per minute - prevents brute force
   */
  auth: createRateLimiter({
    maxRequests: 5,
    windowMs: 60 * 1000,
    keyPrefix: 'auth:',
    message: 'Too many authentication attempts. Please try again later.',
  }),

  /**
   * Standard API rate limiting
   * 100 requests per minute
   */
  api: createRateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000,
    keyPrefix: 'api:',
    message: 'API rate limit exceeded. Please slow down.',
  }),

  /**
   * Strict rate limiting for password reset
   * 3 requests per hour - prevents email abuse
   */
  passwordReset: createRateLimiter({
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'reset:',
    message: 'Too many password reset requests. Please try again later.',
  }),

  /**
   * Rate limiting for search operations
   * 30 requests per minute - prevents scraping
   */
  search: createRateLimiter({
    maxRequests: 30,
    windowMs: 60 * 1000,
    keyPrefix: 'search:',
    message: 'Too many search requests. Please try again later.',
  }),

  /**
   * Lenient rate limiting for general operations
   * 1000 requests per 10 minutes
   */
  general: createRateLimiter({
    maxRequests: 1000,
    windowMs: 10 * 60 * 1000,
    keyPrefix: 'general:',
    message: 'Rate limit exceeded. Please try again later.',
  }),
};

/**
 * Apply rate limiting to a request
 * Returns a 429 response if rate limited, null otherwise
 */
export async function applyRateLimit(
  req: NextRequest,
  limiter: keyof typeof serverRateLimiters
): Promise<NextResponse | null> {
  return serverRateLimiters[limiter](req);
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limiter: keyof typeof serverRateLimiters
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await serverRateLimiters[limiter](req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(req);
  };
}

/**
 * Higher-order function to wrap API route handlers with dynamic params and rate limiting
 * For routes like /api/admin/users/[id]/role
 */
export function withRateLimitAndParams<T extends { params: Promise<Record<string, string>> }>(
  handler: (req: NextRequest, context: T) => Promise<NextResponse>,
  limiter: keyof typeof serverRateLimiters
) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    const rateLimitResponse = await serverRateLimiters[limiter](req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(req, context);
  };
}

/**
 * Cleanup function for graceful shutdown
 */
export async function cleanupRateLimiter(): Promise<void> {
  await globalStore.close();
}

export default {
  createRateLimiter,
  serverRateLimiters,
  applyRateLimit,
  withRateLimit,
  withRateLimitAndParams,
  getClientIdentifier,
  cleanupRateLimiter,
};
