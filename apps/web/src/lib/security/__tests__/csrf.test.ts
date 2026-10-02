import { describe, expect, it } from 'vitest';
import { generateCSRFToken, verifyCSRFToken } from '../csrf';

describe('csrf', () => {
  it('round-trips a freshly issued token', () => {
    const token = generateCSRFToken();
    expect(verifyCSRFToken(token)).toBe(true);
  });

  it('rejects tampered tokens', () => {
    const token = generateCSRFToken();
    const tampered = token.replace(/.$/, token.endsWith('a') ? 'b' : 'a');
    expect(verifyCSRFToken(tampered)).toBe(false);
  });

  it('rejects malformed tokens', () => {
    expect(verifyCSRFToken('not-a-token')).toBe(false);
  });
});
