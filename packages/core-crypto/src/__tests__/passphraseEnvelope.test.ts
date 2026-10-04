import { describe, expect, test } from 'bun:test';
import { openMasterKey, sealMasterKey, vaultKeyId, WrongVaultPassphraseError } from '../index';

describe('Vault passphrase envelope', () => {
  const masterKey = new Uint8Array(Array.from({ length: 32 }, (_, index) => index + 1));
  const passphrase = 'correct horse battery staple';

  test('opens with the passphrase it was sealed with', async () => {
    const envelope = await sealMasterKey(masterKey, passphrase);
    const opened = await openMasterKey(envelope, passphrase);

    expect(Array.from(opened)).toEqual(Array.from(masterKey));
  });

  test('survives a JSON round trip, as it does through the database', async () => {
    const envelope = await sealMasterKey(masterKey, passphrase);
    const stored = JSON.parse(JSON.stringify(envelope));

    expect(Array.from(await openMasterKey(stored, passphrase))).toEqual(Array.from(masterKey));
  });

  test('does not contain the master key in the clear', async () => {
    const envelope = await sealMasterKey(masterKey, passphrase);
    const masterKeyBase64 = btoa(String.fromCharCode(...masterKey));

    expect(JSON.stringify(envelope)).not.toContain(masterKeyBase64);
  });

  test('carries a fingerprint that matches only its own master key', async () => {
    const envelope = await sealMasterKey(masterKey, passphrase);
    const otherKey = new Uint8Array(32).fill(7);

    expect(envelope.keyId).toBe(vaultKeyId(masterKey));
    expect(vaultKeyId(otherKey)).not.toBe(envelope.keyId);
  });

  test('rejects the wrong passphrase', async () => {
    const envelope = await sealMasterKey(masterKey, passphrase);

    await expect(openMasterKey(envelope, 'wrong horse battery staple')).rejects.toBeInstanceOf(
      WrongVaultPassphraseError
    );
  });

  test('refuses an envelope with an inflated iteration count', async () => {
    const envelope = await sealMasterKey(masterKey, passphrase);

    await expect(
      openMasterKey({ ...envelope, iterations: 4_000_000_000 }, passphrase)
    ).rejects.toThrow('Vault envelope iteration count is out of range.');
  });

  test('refuses passphrases shorter than 12 characters', async () => {
    await expect(sealMasterKey(masterKey, 'short')).rejects.toThrow(
      'Vault passphrases must be at least 12 characters.'
    );
  });
});
