import { describe, expect, it } from 'vitest';
import { checkPrdBuilderRateLimit, resetPrdBuilderRateLimitsForTests } from '../ai/rateLimit';

describe('PRD Builder provider rate limits', () => {
  it('limits expensive AI generation by authenticated user', async () => {
    await resetPrdBuilderRateLimitsForTests();

    for (let i = 0; i < 5; i += 1) {
      expect((await checkPrdBuilderRateLimit('user-1', 'generate')).allowed).toBe(true);
    }

    const blocked = await checkPrdBuilderRateLimit('user-1', 'generate');
    expect(blocked.allowed).toBe(false);
  });
});
