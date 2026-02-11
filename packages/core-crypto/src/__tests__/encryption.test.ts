import { describe, test, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import { EncryptionService } from '../encryption';
import { KeyManager } from '../keyManagement';
import { MemoryStorageAdapter } from '../storage';

describe('EncryptionService', () => {
  beforeAll(async () => {
    await EncryptionService.ready();
  });

  describe('generateKey', () => {
    test('should generate a 32-byte key', async () => {
      const key = await EncryptionService.generateKey();
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });

    test('should generate unique keys', async () => {
      const key1 = await EncryptionService.generateKey();
      const key2 = await EncryptionService.generateKey();

      const keysEqual = key1.every((byte, index) => byte === key2[index]);
      expect(keysEqual).toBe(false);
    });
  });

  describe('deriveKey', () => {
    test('should derive consistent keys from same password and salt', async () => {
      const password = new TextEncoder().encode('test-password');
      const salt = new Uint8Array(32);

      const key1 = await EncryptionService.deriveKey(password, salt, 3);
      const key2 = await EncryptionService.deriveKey(password, salt, 3);

      expect(key1).toEqual(key2);
    });

    test('should derive different keys from different salts', async () => {
      const password = new TextEncoder().encode('test-password');
      const salt1 = new Uint8Array(32);
      const salt2 = new Uint8Array(32);
      salt2[0] = 1; // Make different

      const key1 = await EncryptionService.deriveKey(password, salt1, 3);
      const key2 = await EncryptionService.deriveKey(password, salt2, 3);

      expect(key1).not.toEqual(key2);
    });
  });

  describe('encrypt and decrypt roundtrip', () => {
    test('should encrypt and decrypt data correctly', async () => {
      const originalData = new TextEncoder().encode('Hello, NoteChain!');
      const key = await EncryptionService.generateKey();

      const { ciphertext, nonce, authTag } = await EncryptionService.encrypt(originalData, key);

      expect(ciphertext).toBeInstanceOf(Uint8Array);
      expect(ciphertext.length).toBeGreaterThan(0);
      expect(nonce).toBeInstanceOf(Uint8Array);
      expect(nonce.length).toBeGreaterThan(0);
      expect(authTag).toBeInstanceOf(Uint8Array);
      expect(authTag.length).toBe(16);

      const decrypted = await EncryptionService.decrypt(ciphertext, nonce, authTag, key);
      const decryptedText = new TextDecoder().decode(decrypted);

      expect(decryptedText).toBe('Hello, NoteChain!');
    });

    test('should fail to decrypt with wrong key', async () => {
      const originalData = new TextEncoder().encode('Secret message');
      const key1 = await EncryptionService.generateKey();
      const key2 = await EncryptionService.generateKey();

      const { ciphertext, nonce, authTag } = await EncryptionService.encrypt(originalData, key1);

      expect(EncryptionService.decrypt(ciphertext, nonce, authTag, key2)).rejects.toThrow();
    });
  });
});

// Use MemoryStorageAdapter for KeyManager tests
const testStorage = new MemoryStorageAdapter();

describe('KeyManager', () => {
  beforeEach(() => {
    testStorage.clear();
    KeyManager.setStorageAdapter(testStorage);
  });

  afterEach(() => {
    testStorage.clear();
  });

  describe('storeMasterKey', () => {
    test('should store master key in storage', async () => {
      const key = new Uint8Array(32);
      await KeyManager.storeMasterKey(key);

      const stored = await testStorage.getItem(KeyManager.MASTER_KEY_STORAGE_KEY);
      expect(stored).toBeTruthy();
      expect(stored?.split(',').length).toBe(32);
    });
  });

  describe('getMasterKey', () => {
    test('should retrieve stored master key', async () => {
      const originalKey = new Uint8Array([1, 2, 3, 4, 5]);
      await KeyManager.storeMasterKey(originalKey);

      const retrievedKey = await KeyManager.getMasterKey();

      expect(retrievedKey).toBeInstanceOf(Uint8Array);
      expect(retrievedKey?.length).toBe(5);
      expect(retrievedKey).toEqual(originalKey);
    });

    test('should return null when no key is stored', async () => {
      const retrievedKey = await KeyManager.getMasterKey();
      expect(retrievedKey).toBeNull();
    });
  });

  describe('deriveDeviceKey', () => {
    test('should derive device-specific keys', async () => {
      const masterKey = await EncryptionService.generateKey();
      const deviceId1 = 'device-1';
      const deviceId2 = 'device-2';

      const deviceKey1 = await KeyManager.deriveDeviceKey(deviceId1, masterKey);
      const deviceKey2 = await KeyManager.deriveDeviceKey(deviceId2, masterKey);

      expect(deviceKey1).toBeInstanceOf(Uint8Array);
      expect(deviceKey2).toBeInstanceOf(Uint8Array);
      expect(deviceKey1).not.toEqual(deviceKey2);
    });

    test('should derive consistent keys for same device', async () => {
      const masterKey = await EncryptionService.generateKey();
      const deviceId = 'test-device';

      const key1 = await KeyManager.deriveDeviceKey(deviceId, masterKey);
      const key2 = await KeyManager.deriveDeviceKey(deviceId, masterKey);

      expect(key1).toEqual(key2);
    });
  });

  describe('hasMasterKey', () => {
    test('should return true when key is stored', async () => {
      const key = new Uint8Array(32);
      await KeyManager.storeMasterKey(key);

      expect(await KeyManager.hasMasterKey()).toBe(true);
    });

    test('should return false when no key is stored', async () => {
      expect(await KeyManager.hasMasterKey()).toBe(false);
    });
  });

  describe('clearMasterKey', () => {
    test('should clear stored master key', async () => {
      const key = new Uint8Array(32);
      await KeyManager.storeMasterKey(key);

      expect(await KeyManager.hasMasterKey()).toBe(true);

      await KeyManager.clearMasterKey();

      expect(await KeyManager.hasMasterKey()).toBe(false);
    });
  });
});
