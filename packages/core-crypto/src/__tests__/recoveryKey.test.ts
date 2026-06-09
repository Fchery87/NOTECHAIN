import { describe, expect, test, beforeEach } from 'bun:test';
import { decodeRecoveryKey, encodeRecoveryKey, isValidRecoveryKey, KeyManager } from '../index';
import { SecureMemoryStorage } from '../secureStorage';
import { MemoryStorageAdapter } from '../storage';

describe('Recovery key helpers', () => {
  const masterKey = new Uint8Array(Array.from({ length: 32 }, (_, index) => index + 1));

  test('encodes and decodes a 32-byte master key', () => {
    const recoveryKey = encodeRecoveryKey(masterKey);
    const decoded = decodeRecoveryKey(recoveryKey);

    expect(recoveryKey.startsWith('NC-RK1:')).toBe(true);
    expect(Array.from(decoded)).toEqual(Array.from(masterKey));
  });

  test('rejects malformed recovery keys', () => {
    expect(isValidRecoveryKey('not-a-key')).toBe(false);
    expect(() => decodeRecoveryKey('not-a-key')).toThrow('Invalid NoteChain recovery key format');
  });

  test('rejects recovery keys with tampered checksums', () => {
    const recoveryKey = encodeRecoveryKey(masterKey);
    const tampered = recoveryKey.replace(/.$/, char => (char === 'A' ? 'B' : 'A'));

    expect(isValidRecoveryKey(tampered)).toBe(false);
    expect(() => decodeRecoveryKey(tampered)).toThrow('Invalid NoteChain recovery key checksum');
  });

  test('rejects invalid master key length', () => {
    expect(() => encodeRecoveryKey(new Uint8Array(16))).toThrow('Recovery keys require');
  });
});

describe('KeyManager recovery key import/export', () => {
  beforeEach(async () => {
    KeyManager.setStorageAdapter(new MemoryStorageAdapter());
    KeyManager.setSecureStorageAdapter(new SecureMemoryStorage());
    KeyManager.setUseSecureStorage(true);
    await KeyManager.clearAll();
    KeyManager.setKeyNamespace(null);
  });

  test('exports and restores a stored master key', async () => {
    const masterKey = new Uint8Array(Array.from({ length: 32 }, (_, index) => 255 - index));

    await KeyManager.storeMasterKey(masterKey);
    const recoveryKey = await KeyManager.exportRecoveryKey();

    await KeyManager.clearMasterKey();
    expect(await KeyManager.getMasterKey()).toBeNull();

    const restored = await KeyManager.importRecoveryKey(recoveryKey);
    const stored = await KeyManager.getMasterKey();

    expect(Array.from(restored)).toEqual(Array.from(masterKey));
    expect(Array.from(stored ?? [])).toEqual(Array.from(masterKey));
  });

  test('keeps browser-stored master keys scoped per account', async () => {
    const userOneKey = new Uint8Array(Array.from({ length: 32 }, (_, index) => index + 1));
    const userTwoKey = new Uint8Array(Array.from({ length: 32 }, (_, index) => 255 - index));

    KeyManager.setKeyNamespace('user-one');
    await KeyManager.storeMasterKey(userOneKey);

    KeyManager.setKeyNamespace('user-two');
    expect(await KeyManager.getMasterKey()).toBeNull();
    await KeyManager.storeMasterKey(userTwoKey);

    expect(Array.from((await KeyManager.getMasterKey()) ?? [])).toEqual(Array.from(userTwoKey));

    KeyManager.setKeyNamespace('user-one');
    expect(Array.from((await KeyManager.getMasterKey()) ?? [])).toEqual(Array.from(userOneKey));
  });
});
