import { beforeEach, describe, expect, test } from 'bun:test';
import { SecureIndexedDBStorage, SecureStorageDecryptionError } from '../secureStorage';

const WRAPPING_KEY_SEED_KEY = 'notechain_wrapping_key_seed';
const MASTER_KEY_STORAGE_KEY = 'notechain_master_key';
const STORE_NAME = 'encrypted_keys';

class FakeLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

class FakeIndexedDB {
  stores = new Map<string, Map<string, string>>();

  open() {
    const db = {
      objectStoreNames: {
        contains: (name: string) => this.stores.has(name),
      },
      createObjectStore: (name: string) => {
        if (!this.stores.has(name)) {
          this.stores.set(name, new Map());
        }
      },
      transaction: (storeName: string) => ({
        objectStore: () => {
          const store = this.stores.get(storeName) ?? new Map<string, string>();
          this.stores.set(storeName, store);

          return {
            get: (key: string) => {
              const request: { result?: string; onsuccess?: () => void; onerror?: () => void } = {};
              queueMicrotask(() => {
                request.result = store.get(key);
                request.onsuccess?.();
              });
              return request;
            },
            put: (value: string, key: string) => {
              const request: { onsuccess?: () => void; onerror?: () => void } = {};
              queueMicrotask(() => {
                store.set(key, value);
                request.onsuccess?.();
              });
              return request;
            },
            delete: (key: string) => {
              const request: { onsuccess?: () => void; onerror?: () => void } = {};
              queueMicrotask(() => {
                store.delete(key);
                request.onsuccess?.();
              });
              return request;
            },
            clear: () => {
              const request: { onsuccess?: () => void; onerror?: () => void } = {};
              queueMicrotask(() => {
                store.clear();
                request.onsuccess?.();
              });
              return request;
            },
          };
        },
      }),
    };

    const request: {
      result: typeof db;
      onsuccess?: () => void;
      onerror?: () => void;
      onupgradeneeded?: (event: { target: { result: typeof db } }) => void;
    } = { result: db };

    queueMicrotask(() => {
      if (!this.stores.has(STORE_NAME)) {
        request.onupgradeneeded?.({ target: { result: db } });
      }
      request.onsuccess?.();
    });

    return request;
  }
}

function setBrowserFingerprint(label: string) {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      userAgent: `NoteChain Test Browser ${label}`,
      language: `en-${label}`,
      platform: `test-${label}`,
      hardwareConcurrency: label === 'one' ? 4 : 8,
      deviceMemory: label === 'one' ? 8 : 16,
    },
  });

  Object.defineProperty(globalThis, 'screen', {
    configurable: true,
    value: {
      width: label === 'one' ? 1280 : 1920,
      height: label === 'one' ? 720 : 1080,
      colorDepth: 24,
    },
  });
}

function bytesToStorageString(bytes: Uint8Array): string {
  return Array.from(bytes).join(',');
}

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function combineEncryptedPayload(iv: Uint8Array, ciphertext: Uint8Array): string {
  const combined = new Uint8Array(4 + iv.length + ciphertext.length);
  new DataView(combined.buffer).setUint32(0, iv.length, true);
  combined.set(iv, 4);
  combined.set(ciphertext, 4 + iv.length);
  return base64(combined);
}

async function deriveLegacyWrappingKey(seed: Uint8Array): Promise<CryptoKey> {
  const navWithMemory = navigator as Navigator & { deviceMemory?: number };
  const fingerprint = [
    navigator.userAgent,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.platform,
    String(navigator.hardwareConcurrency),
    String(navWithMemory.deviceMemory),
  ].join('|');

  const fingerprintBytes = new TextEncoder().encode(fingerprint);
  const combined = new Uint8Array(fingerprintBytes.length + seed.length);
  combined.set(fingerprintBytes);
  combined.set(seed, fingerprintBytes.length);

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const keyMaterial = await crypto.subtle.importKey('raw', hashBuffer, 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ]);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('notechain-key-wrapping-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function legacyEncrypt(value: Uint8Array, seed: Uint8Array): Promise<string> {
  const key = await deriveLegacyWrappingKey(seed);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    value.buffer as ArrayBuffer
  );
  return combineEncryptedPayload(iv, new Uint8Array(ciphertext));
}

describe('SecureIndexedDBStorage', () => {
  let fakeIndexedDB: FakeIndexedDB;
  const seed = new Uint8Array(Array.from({ length: 32 }, (_, index) => index + 1));
  const masterKey = new Uint8Array(Array.from({ length: 32 }, (_, index) => 255 - index));

  beforeEach(() => {
    fakeIndexedDB = new FakeIndexedDB();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: fakeIndexedDB,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new FakeLocalStorage(),
    });
    localStorage.setItem(WRAPPING_KEY_SEED_KEY, bytesToStorageString(seed));
    setBrowserFingerprint('one');
  });

  test('stores keys with a stable seed-only wrapping key independent of browser fingerprint changes', async () => {
    const storage = new SecureIndexedDBStorage();
    await storage.setItem(MASTER_KEY_STORAGE_KEY, masterKey);

    setBrowserFingerprint('two');

    const storageAfterFingerprintChange = new SecureIndexedDBStorage();
    const restored = await storageAfterFingerprintChange.getItem(MASTER_KEY_STORAGE_KEY);

    expect(Array.from(restored ?? [])).toEqual(Array.from(masterKey));
  });

  test('reads legacy fingerprint-wrapped keys and migrates them to stable wrapping', async () => {
    fakeIndexedDB.stores.set(
      STORE_NAME,
      new Map([[MASTER_KEY_STORAGE_KEY, await legacyEncrypt(masterKey, seed)]])
    );

    const storage = new SecureIndexedDBStorage();
    const restored = await storage.getItem(MASTER_KEY_STORAGE_KEY);

    expect(Array.from(restored ?? [])).toEqual(Array.from(masterKey));

    setBrowserFingerprint('two');

    const migratedStorage = new SecureIndexedDBStorage();
    const restoredAfterFingerprintChange = await migratedStorage.getItem(MASTER_KEY_STORAGE_KEY);

    expect(Array.from(restoredAfterFingerprintChange ?? [])).toEqual(Array.from(masterKey));
  });

  test('throws a recovery-focused error when an existing encrypted key cannot be decrypted', async () => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const bogusCiphertext = crypto.getRandomValues(new Uint8Array(32));
    fakeIndexedDB.stores.set(
      STORE_NAME,
      new Map([[MASTER_KEY_STORAGE_KEY, combineEncryptedPayload(iv, bogusCiphertext)]])
    );

    const storage = new SecureIndexedDBStorage();

    await expect(storage.getItem(MASTER_KEY_STORAGE_KEY)).rejects.toThrow(
      SecureStorageDecryptionError
    );
    await expect(storage.getItem(MASTER_KEY_STORAGE_KEY)).rejects.toThrow(
      'Import your recovery key to restore access'
    );
  });
});
