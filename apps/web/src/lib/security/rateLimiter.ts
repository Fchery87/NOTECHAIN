/**
 * Rate Limiting Implementation
 * Prevents abuse and brute force attacks
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export interface RateLimitState {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  totalRequests: number;
}

/**
 * Rate Limiter using sliding window algorithm
 */
export class RateLimiter {
  private storage: Map<string, RateLimitState>;
  private config: RateLimitConfig;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'rl:',
      ...config,
    };
    this.storage = new Map();

    // Cleanup expired entries every minute
    this.cleanupIntervalId = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Destroy the rate limiter and clean up resources
   * Should be called when the rate limiter is no longer needed
   */
  destroy(): void {
    if (this.isDestroyed) return;

    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    this.storage.clear();
    this.isDestroyed = true;
  }

  /**
   * Check if the rate limiter has been destroyed
   */
  get destroyed(): boolean {
    return this.isDestroyed;
  }

  /**
   * Check if a request is allowed
   */
  async check(identifier: string): Promise<RateLimitResult> {
    if (this.isDestroyed) {
      throw new Error('RateLimiter has been destroyed and cannot be used');
    }

    const key = `${this.config.keyPrefix}${identifier}`;
    const now = Date.now();

    let state = this.storage.get(key);

    if (!state || now > state.resetTime) {
      // New window
      state = {
        count: 1,
        resetTime: now + this.config.windowMs,
        firstRequest: now,
      };
      this.storage.set(key, state);

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: state.resetTime,
        totalRequests: 1,
      };
    }

    // Existing window
    if (state.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: state.resetTime,
        retryAfter: Math.ceil((state.resetTime - now) / 1000),
        totalRequests: state.count,
      };
    }

    state.count++;

    return {
      allowed: true,
      remaining: this.config.maxRequests - state.count,
      resetTime: state.resetTime,
      totalRequests: state.count,
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    const key = `${this.config.keyPrefix}${identifier}`;
    this.storage.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, state] of this.storage.entries()) {
      if (now > state.resetTime) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Get current state for an identifier
   */
  getState(identifier: string): RateLimitState | undefined {
    const key = `${this.config.keyPrefix}${identifier}`;
    return this.storage.get(key);
  }
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const rateLimiters = {
  /**
   * Strict rate limiting for authentication endpoints
   * 5 requests per minute
   */
  auth: new RateLimiter({
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'auth:',
  }),

  /**
   * Standard API rate limiting
   * 100 requests per minute
   */
  api: new RateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'api:',
  }),

  /**
   * Lenient rate limiting for general operations
   * 1000 requests per 10 minutes
   */
  general: new RateLimiter({
    maxRequests: 1000,
    windowMs: 10 * 60 * 1000, // 10 minutes
    keyPrefix: 'general:',
  }),

  /**
   * Strict limiting for password reset
   * 3 requests per hour
   */
  passwordReset: new RateLimiter({
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'reset:',
  }),

  /**
   * Rate limiting for search operations
   * 30 requests per minute
   */
  search: new RateLimiter({
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'search:',
  }),
};

/**
 * Exponential backoff for failed requests
 */
export class ExponentialBackoff {
  private attempts: Map<string, number> = new Map();
  private baseDelay: number;
  private maxDelay: number;
  private maxAttempts: number;

  constructor(
    options: {
      baseDelay?: number;
      maxDelay?: number;
      maxAttempts?: number;
    } = {}
  ) {
    this.baseDelay = options.baseDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 60000; // 1 minute
    this.maxAttempts = options.maxAttempts || 10;
  }

  /**
   * Calculate delay for the next attempt
   */
  getDelay(identifier: string): number {
    const attempts = this.attempts.get(identifier) || 0;

    if (attempts >= this.maxAttempts) {
      return -1; // Max attempts exceeded
    }

    // Exponential backoff with jitter
    const delay = Math.min(this.baseDelay * Math.pow(2, attempts), this.maxDelay);

    // Add jitter (±25%)
    const jitter = delay * 0.25;
    return delay + (Math.random() * jitter * 2 - jitter);
  }

  /**
   * Record a failed attempt
   */
  recordFailure(identifier: string): void {
    const current = this.attempts.get(identifier) || 0;
    this.attempts.set(identifier, current + 1);
  }

  /**
   * Record a successful attempt (reset counter)
   */
  recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Get number of attempts
   */
  getAttempts(identifier: string): number {
    return this.attempts.get(identifier) || 0;
  }

  /**
   * Check if max attempts exceeded
   */
  isLocked(identifier: string): boolean {
    return (this.attempts.get(identifier) || 0) >= this.maxAttempts;
  }

  /**
   * Reset attempts for an identifier
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Global exponential backoff instance for authentication
export const authBackoff = new ExponentialBackoff({
  baseDelay: 1000,
  maxDelay: 30000,
  maxAttempts: 5,
});

/**
 * Circuit breaker pattern for external services
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  successThreshold: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private nextAttempt = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 3,
      ...config,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private onSuccess(): void {
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
      }
    }
  }

  /**
   * Record a failed call
   */
  private onFailure(): void {
    this.failures++;

    if (this.failures >= this.config.failureThreshold || this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      this.failures = 0;
      this.successes = 0;
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failures;
  }
}

/**
 * Suspicious activity detector
 */
export interface SuspiciousActivity {
  type: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  details: Record<string, unknown>;
}

export class SuspiciousActivityDetector {
  private activities: SuspiciousActivity[] = [];
  private threshold: number;

  constructor(threshold = 5) {
    this.threshold = threshold;
  }

  /**
   * Record suspicious activity
   */
  record(
    type: string,
    severity: 'low' | 'medium' | 'high',
    details: Record<string, unknown>
  ): void {
    this.activities.push({
      type,
      severity,
      timestamp: Date.now(),
      details,
    });

    // Keep only last 100 activities
    if (this.activities.length > 100) {
      this.activities = this.activities.slice(-100);
    }
  }

  /**
   * Check if activity should trigger CAPTCHA
   */
  shouldTriggerCaptcha(_identifier: string): boolean {
    const recentActivities = this.getRecentActivities(5 * 60 * 1000); // 5 minutes
    const highSeverityCount = recentActivities.filter(a => a.severity === 'high').length;
    const mediumSeverityCount = recentActivities.filter(a => a.severity === 'medium').length;

    return highSeverityCount >= 2 || mediumSeverityCount >= this.threshold;
  }

  /**
   * Get recent activities within time window
   */
  getRecentActivities(windowMs: number): SuspiciousActivity[] {
    const cutoff = Date.now() - windowMs;
    return this.activities.filter(a => a.timestamp > cutoff);
  }

  /**
   * Get activity summary
   */
  getSummary(): { low: number; medium: number; high: number } {
    return {
      low: this.activities.filter(a => a.severity === 'low').length,
      medium: this.activities.filter(a => a.severity === 'medium').length,
      high: this.activities.filter(a => a.severity === 'high').length,
    };
  }

  /**
   * Clear all activities
   */
  clear(): void {
    this.activities = [];
  }
}

// Global suspicious activity detector
export const suspiciousActivityDetector = new SuspiciousActivityDetector();

/**
 * Request size limiter
 */
export function checkRequestSize(
  size: number,
  maxSize: number = 10 * 1024 * 1024 // 10MB default
): { allowed: boolean; exceededBy?: number } {
  if (size <= maxSize) {
    return { allowed: true };
  }

  return {
    allowed: false,
    exceededBy: size - maxSize,
  };
}

/**
 * Brute force protection
 */
export class BruteForceProtection {
  private attempts: Map<string, { count: number; lockoutEnd: number | null }> = new Map();
  private maxAttempts: number;
  private lockoutDuration: number;

  constructor(maxAttempts = 5, lockoutDuration = 15 * 60 * 1000) {
    // 15 minutes
    this.maxAttempts = maxAttempts;
    this.lockoutDuration = lockoutDuration;
  }

  /**
   * Check if an identifier is locked out
   */
  isLockedOut(identifier: string): boolean {
    const record = this.attempts.get(identifier);
    if (!record) return false;

    if (record.lockoutEnd && Date.now() < record.lockoutEnd) {
      return true;
    }

    // Lockout expired, reset
    if (record.lockoutEnd && Date.now() >= record.lockoutEnd) {
      this.attempts.delete(identifier);
      return false;
    }

    return false;
  }

  /**
   * Record a failed attempt
   */
  recordFailure(identifier: string): void {
    const record = this.attempts.get(identifier) || { count: 0, lockoutEnd: null };
    record.count++;

    if (record.count >= this.maxAttempts) {
      record.lockoutEnd = Date.now() + this.lockoutDuration;
    }

    this.attempts.set(identifier, record);
  }

  /**
   * Record a successful attempt (reset counter)
   */
  recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Get remaining attempts before lockout
   */
  getRemainingAttempts(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return this.maxAttempts;
    return Math.max(0, this.maxAttempts - record.count);
  }

  /**
   * Get lockout time remaining in seconds
   */
  getLockoutTimeRemaining(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record?.lockoutEnd) return 0;
    return Math.max(0, Math.ceil((record.lockoutEnd - Date.now()) / 1000));
  }
}

// Global brute force protection
export const bruteForceProtection = new BruteForceProtection();

/**
 * Rate limit by IP address
 */
export function getClientIdentifier(_req: Request): string {
  // In a real implementation, this would extract IP from headers
  // For client-side, we use a combination of user agent and timestamp
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  return `client:${userAgent}`;
}

/**
 * Export all rate limiting utilities
 */
export const RateLimit = {
  RateLimiter,
  rateLimiters,
  ExponentialBackoff,
  authBackoff,
  CircuitBreaker,
  CircuitState,
  SuspiciousActivityDetector,
  suspiciousActivityDetector,
  checkRequestSize,
  BruteForceProtection,
  bruteForceProtection,
  getClientIdentifier,
};

export default RateLimit;
