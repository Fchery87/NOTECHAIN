import { HybridStore } from '@/lib/security/RedisRateLimiter';

export type PrdBuilderRateLimitBucket = 'generate' | 'research';

const RATE_LIMITS: Record<PrdBuilderRateLimitBucket, { windowMs: number; max: number }> = {
  generate: { windowMs: 10 * 60_000, max: 5 },
  research: { windowMs: 10 * 60_000, max: 10 },
};

const store = new HybridStore(process.env.REDIS_URL);

export async function checkPrdBuilderRateLimit(
  userId: string,
  bucket: PrdBuilderRateLimitBucket
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    return { allowed: false, retryAfterSeconds: 600 };
  }

  const limit = RATE_LIMITS[bucket];
  const key = `prd-builder:${bucket}:${userId}`;
  const { count, resetTime } = await store.increment(key, limit.windowMs);

  if (count <= limit.max) return { allowed: true };

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((resetTime - Date.now()) / 1000)),
  };
}

export async function resetPrdBuilderRateLimitsForTests(): Promise<void> {
  await store.close();
}
