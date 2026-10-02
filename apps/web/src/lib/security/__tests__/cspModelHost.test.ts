import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDevelopmentCSP, buildStrictCSP } from '../csp';

describe('CSP connect-src for the on-device model host', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('adds the configured model host origin to production and development policies', () => {
    vi.stubEnv('NEXT_PUBLIC_MODEL_HOST', 'https://models.example.com/path');

    expect(buildStrictCSP()['connect-src']).toContain('https://models.example.com');
    expect(buildDevelopmentCSP()['connect-src']).toContain('https://models.example.com');
  });

  it('adds nothing for an unset or invalid host', () => {
    vi.stubEnv('NEXT_PUBLIC_MODEL_HOST', 'http://models.example.com');
    expect(buildStrictCSP()['connect-src']).not.toContain('http://models.example.com');

    vi.stubEnv('NEXT_PUBLIC_MODEL_HOST', '');
    expect(buildStrictCSP()['connect-src']).not.toContain('');
  });
});
