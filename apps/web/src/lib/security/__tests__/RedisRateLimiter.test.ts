import { describe, test, expect, beforeEach, afterEach } from 'vitest';
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
    expect(get1?.resetTime).toBe(result1.resetTime);

    const result2 = await redisStore.increment(id, windowMs);
    expect(result2.count).toBe(2);
    expect(result2.resetTime).toBe(result1.resetTime);

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
