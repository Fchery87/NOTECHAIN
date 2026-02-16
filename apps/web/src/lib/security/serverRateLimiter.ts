/**
 * Server-Side Rate Limiting Implementation
 *
 * This module provides rate limiting for server-side operations (middleware, API routes).
 * It uses an in-memory store by default, but can be extended to use Redis or database.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
 */

import { NextResponse, type NextRequest } from 'next/server';

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
 * Rate limit state stored in memory
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

/**
 * In-memory store for rate limit state
 * Note: In production with multiple instances, use Redis or database
 */
class MemoryStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  set(key: string, value: RateLimitEntry): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now,
      };
      this.store.set(key, entry);
      return { count: 1, resetTime: entry.resetTime };
    }

    entry.count++;
    return { count: entry.count, resetTime: entry.resetTime };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Global store instance
const globalStore = new MemoryStore();

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

    const { count, resetTime } = globalStore.increment(key, windowMs);
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
 * Cleanup function for graceful shutdown
 */
export function cleanupRateLimiter(): void {
  globalStore.destroy();
}

export default {
  createRateLimiter,
  serverRateLimiters,
  applyRateLimit,
  withRateLimit,
  getClientIdentifier,
  cleanupRateLimiter,
};
