/**
 * Redis-Backed Rate Limiting Store
 *
 * This module provides Redis-backed rate limiting for production deployments
 * with automatic fallback to in-memory storage when Redis is unavailable.
 *
 * @see https://www.npmjs.com/package/ioredis
 */

import Redis from 'ioredis';

/**
 * Rate limit entry stored in Redis or memory
 */
export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Interface for rate limit storage backends
 */
export interface RateLimitStore {
  /**
   * Increment the counter for a key
   * @param key - The rate limit key (e.g., user ID, IP address)
   * @param windowMs - Time window in milliseconds
   * @returns The count and reset time
   */
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;

  /**
   * Get the current rate limit entry for a key
   * @param key - The rate limit key
   * @returns The rate limit entry or undefined if not found
   */
  get(key: string): Promise<RateLimitEntry | undefined>;

  /**
   * Close the store and release resources
   */
  close(): Promise<void>;
}

/**
 * Redis-based rate limit store
 * Uses atomic operations with MULTI/EXEC to ensure consistency
 */
export class RedisStore implements RateLimitStore {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null; // Don't retry after 3 attempts
        }
        return Math.min(times * 50, 200); // Exponential backoff
      },
    });
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const result = await this.redis.multi().incr(key).pexpire(key, windowMs).exec();

    if (!result) {
      throw new Error('Redis transaction failed');
    }

    const [[incrError, count], [expireError]] = result;

    if (incrError) {
      throw incrError;
    }

    if (expireError) {
      throw expireError;
    }

    const resetTime = Date.now() + windowMs;

    return {
      count: count as number,
      resetTime,
    };
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    const [count, ttl] = await Promise.all([this.redis.get(key), this.redis.pttl(key)]);

    if (count === null) {
      return undefined;
    }

    // TTL is -1 if no expiration set, -2 if key doesn't exist
    if (ttl === -2) {
      return undefined;
    }

    const resetTime = ttl > 0 ? Date.now() + ttl : Date.now() + 60000; // Default to 1min if no TTL

    return {
      count: parseInt(count, 10),
      resetTime,
    };
  }

  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      // Ignore errors if connection is already closed
      // This is safe and expected during cleanup
    }
  }
}

/**
 * In-memory rate limit store for fallback
 * Used when Redis is unavailable
 */
class MemoryStore implements RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.store.set(key, entry);
      return entry;
    }

    entry.count++;
    this.store.set(key, entry);
    return entry;
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}

/**
 * Hybrid rate limit store with automatic Redis-to-memory fallback
 * Tries Redis first, falls back to in-memory storage if Redis is unavailable
 */
export class HybridStore implements RateLimitStore {
  private redisStore: RedisStore | null = null;
  private memoryStore: MemoryStore;
  private useRedis: boolean = false;

  constructor(redisUrl?: string) {
    this.memoryStore = new MemoryStore();

    if (redisUrl) {
      try {
        this.redisStore = new RedisStore(redisUrl);
        this.useRedis = true;
      } catch (error) {
        // If Redis fails to initialize, use memory store
        console.warn('Redis unavailable, using in-memory rate limiting:', error);
        this.redisStore = null;
        this.useRedis = false;
      }
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    if (this.useRedis && this.redisStore) {
      try {
        return await this.redisStore.increment(key, windowMs);
      } catch (error) {
        // If Redis fails during operation, log and fall back to memory
        console.warn('Redis increment failed, falling back to memory:', error);
        this.useRedis = false;
        // Close the Redis store to prevent further attempts
        try {
          await this.redisStore.close();
        } catch (closeError) {
          // Ignore close errors
        }
        this.redisStore = null;
      }
    }

    // Always have memory fallback
    return await this.memoryStore.increment(key, windowMs);
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    if (this.useRedis && this.redisStore) {
      try {
        return await this.redisStore.get(key);
      } catch (error) {
        // If Redis fails during get, fall back to memory
        console.warn('Redis get failed, falling back to memory:', error);
        this.useRedis = false;
        // Close the Redis store to prevent further attempts
        try {
          await this.redisStore.close();
        } catch (closeError) {
          // Ignore close errors
        }
        this.redisStore = null;
      }
    }

    // Always have memory fallback
    return await this.memoryStore.get(key);
  }

  async close(): Promise<void> {
    if (this.redisStore) {
      try {
        await this.redisStore.close();
      } catch (error) {
        // Ignore errors if connection is already closed
      }
    }
    await this.memoryStore.close();
  }
}
