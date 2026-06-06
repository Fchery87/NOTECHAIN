import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const adr = readFileSync(
  join(process.cwd(), '../../docs/adr/ADR-cryptographic-sharing.md'),
  'utf8'
);

describe('cryptographic sharing ADR', () => {
  it('requires per-document content keys and recipient key wrapping', () => {
    expect(adr).toContain('per-document content keys');
    expect(adr).toContain('recipient-specific key wrapping');
    expect(adr).toContain('Document content key');
    expect(adr).toContain('Recipient key package');
  });

  it('documents share-link cryptographic packages', () => {
    expect(adr).toContain('Share links must use explicit cryptographic packages');
    expect(adr).toContain('expiration timestamp');
    expect(adr).toContain('optional max-use count');
    expect(adr).toContain('optional passphrase-derived wrapping key');
  });

  it('documents revocation guarantees and limitations', () => {
    expect(adr).toContain('Revocation guarantees are forward-looking');
    expect(adr).toContain('Already-downloaded plaintext cannot be clawed back');
    expect(adr).toContain('Document content key is rotated for future versions');
  });

  it('requires server-side authorization and durable realtime', () => {
    expect(adr).toContain('Unauthorized websocket joins must be rejected');
    expect(adr).toContain('Realtime collaboration must be durable');
    expect(adr).toContain('Volatile broadcast-only collaboration is not production-acceptable');
  });
});
