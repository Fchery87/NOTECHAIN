import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCSRFToken, verifyCSRFToken } from '../csrf';

describe('csrf expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('rejects expired tokens', () => {
    const token = generateCSRFToken();

    vi.setSystemTime(new Date('2026-01-02T00:00:01.000Z'));
    expect(verifyCSRFToken(token)).toBe(false);
  });

  it('keeps production secret enforcement on the runtime path rather than module evaluation', () => {
    expect(() => generateCSRFToken()).not.toThrow();
  });
});
