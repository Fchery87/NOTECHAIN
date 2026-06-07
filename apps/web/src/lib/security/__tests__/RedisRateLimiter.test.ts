import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

interface MockRedisEntry {
  count: number;
  expiresAt: number;
}

const mockRedisStore = new Map<string, MockRedisEntry>();

vi.mock('ioredis', () => {
  class MockRedis {
    private transactionKey: string | null = null;
    private transactionWindowMs = 0;

    multi() {
      this.transactionKey = null;
      this.transactionWindowMs = 0;
      return this;
    }

    incr(key: string) {
      this.transactionKey = key;
      return this;
    }

    pexpire(key: string, windowMs: number) {
      this.transactionKey = key;
      this.transactionWindowMs = windowMs;
      return this;
    }

    async exec() {
      if (!this.transactionKey) return null;
      const now = Date.now();
      const existing = mockRedisStore.get(this.transactionKey);
      const count = existing && existing.expiresAt > now ? existing.count + 1 : 1;
      mockRedisStore.set(this.transactionKey, {
        count,
        expiresAt: now + this.transactionWindowMs,
      });
      return [
        [null, count],
        [null, 1],
      ];
    }

    async get(key: string) {
      const entry = mockRedisStore.get(key);
      if (!entry || entry.expiresAt <= Date.now()) {
        mockRedisStore.delete(key);
        return null;
      }
      return String(entry.count);
    }

    async pttl(key: string) {
      const entry = mockRedisStore.get(key);
      if (!entry) return -2;
      const ttl = entry.expiresAt - Date.now();
      if (ttl <= 0) {
        mockRedisStore.delete(key);
        return -2;
      }
      return ttl;
    }

    async quit() {
      return 'OK';
    }
  }

  return { default: MockRedis };
});

import { RedisStore, HybridStore } from '../RedisRateLimiter';

describe('RedisStore', () => {
  let redisStore: RedisStore;

  beforeEach(() => {
    redisStore = new RedisStore('redis://localhost:6379');
  });

  afterEach(async () => {
    await redisStore.close();
  });

  test('should increment and get rate limit entries', async () => {
    const id = 'test-1';
    const windowMs = 60000;

    const result1 = await redisStore.increment(id, windowMs);
    expect(result1.count).toBe(1);
    expect(result1.resetTime).toBeGreaterThan(Date.now());

    const get1 = await redisStore.get(id);
    expect(get1).toBeDefined();
    expect(get1?.count).toBe(1);
    expect(get1?.resetTime).toBeGreaterThan(Date.now());
    expect(get1?.resetTime).toBeLessThanOrEqual(result1.resetTime + 50);

    const result2 = await redisStore.increment(id, windowMs);
    expect(result2.count).toBe(2);
    expect(result2.resetTime).toBeGreaterThanOrEqual(result1.resetTime - 5);

    const get2 = await redisStore.get(id);
    expect(get2).toBeDefined();
    expect(get2?.count).toBe(2);
  });

  test('should expire entries after window', async () => {
    const id = 'test-expire';
    const windowMs = 100;

    const result1 = await redisStore.increment(id, windowMs);
    expect(result1.count).toBe(1);

    await new Promise(resolve => setTimeout(resolve, 150));

    const result2 = await redisStore.increment(id, windowMs);
    expect(result2.count).toBe(1);
    expect(result2.resetTime).toBeGreaterThan(result1.resetTime);
  });
});

describe('HybridStore', () => {
  let hybridStore: HybridStore;

  beforeEach(() => {
    hybridStore = new HybridStore('redis://localhost:6379');
  });

  afterEach(async () => {
    await hybridStore.close();
  });

  test('should increment and get rate limit entries', async () => {
    const id = 'hybrid-1';
    const windowMs = 60000;

    const result1 = await hybridStore.increment(id, windowMs);
    expect(result1.count).toBe(1);
    expect(result1.resetTime).toBeGreaterThan(Date.now());

    const get1 = await hybridStore.get(id);
    expect(get1).toBeDefined();
    expect(get1?.count).toBe(1);

    const result2 = await hybridStore.increment(id, windowMs);
    expect(result2.count).toBe(2);

    const get2 = await hybridStore.get(id);
    expect(get2).toBeDefined();
    expect(get2?.count).toBe(2);
  });

  test('should use memory fallback when Redis unavailable', async () => {
    const hybridStoreFallback = new HybridStore('redis://invalid-host:9999');
    const id = 'fallback';
    const windowMs = 60000;

    const result1 = await hybridStoreFallback.increment(id, windowMs);
    expect(result1.count).toBe(1);

    const get1 = await hybridStoreFallback.get(id);
    expect(get1).toBeDefined();
    expect(get1?.count).toBe(1);

    const result2 = await hybridStoreFallback.increment(id, windowMs);
    expect(result2.count).toBe(2);

    await hybridStoreFallback.close();
  });

  test('should work without Redis URL (pure memory mode)', async () => {
    const hybridStoreNoRedis = new HybridStore();
    const id = 'no-redis';
    const windowMs = 60000;

    const result = await hybridStoreNoRedis.increment(id, windowMs);
    expect(result.count).toBe(1);

    const get = await hybridStoreNoRedis.get(id);
    expect(get).toBeDefined();
    expect(get?.count).toBe(1);

    await hybridStoreNoRedis.close();
  });
});

describe('HybridStore Memory Mode', () => {
  test('should expire entries after window in memory mode', async () => {
    const hybridStore = new HybridStore();
    const id = 'memory-expire';
    const windowMs = 100;

    const result1 = await hybridStore.increment(id, windowMs);
    expect(result1.count).toBe(1);

    await new Promise(resolve => setTimeout(resolve, 150));

    const result2 = await hybridStore.increment(id, windowMs);
    expect(result2.count).toBe(1);
    expect(result2.resetTime).toBeGreaterThan(result1.resetTime);

    await hybridStore.close();
  });
});
