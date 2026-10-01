import { beforeEach, describe, expect, test } from 'bun:test';
import { SecureIndexedDBStorage, SecureStorageDecryptionError } from '../secureStorage';

const WRAPPING_KEY_SEED_KEY = 'notechain_wrapping_key_seed';
const MASTER_KEY_STORAGE_KEY = 'notechain_master_key';
const STORE_NAME = 'encrypted_keys';
const WRAPPING_KEY_RECORD = '__notechain_wrapping_key_v3__';

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
  stores = new Map<string, Map<string, unknown>>();

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
          const store = this.stores.get(storeName) ?? new Map<string, unknown>();
          this.stores.set(storeName, store);

          return {
            get: (key: string) => {
              const request: { result?: unknown; onsuccess?: () => void; onerror?: () => void } =
                {};
              queueMicrotask(() => {
                request.result = store.get(key);
                request.onsuccess?.();
              });
              return request;
            },
            getAllKeys: () => {
              const request: { result?: string[]; onsuccess?: () => void; onerror?: () => void } =
                {};
              queueMicrotask(() => {
                request.result = Array.from(store.keys());
                request.onsuccess?.();
              });
              return request;
            },
            add: (value: unknown, key: string) => {
              const request: { onsuccess?: () => void; onerror?: () => void } = {};
              queueMicrotask(() => {
                if (store.has(key)) {
                  request.onerror?.();
                  return;
                }
                store.set(key, value);
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

async function seedEncrypt(value: Uint8Array, seed: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    seed.slice().buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('notechain-key-wrapping-v2'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    value.buffer as ArrayBuffer
  );
  return combineEncryptedPayload(iv, new Uint8Array(ciphertext));
}

function entries(fake: FakeIndexedDB): Map<string, unknown> {
  return fake.stores.get(STORE_NAME) ?? new Map();
}

function simulateBrowserRestart() {
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: new FakeLocalStorage(),
  });
}

describe('SecureIndexedDBStorage', () => {
  let fakeIndexedDB: FakeIndexedDB;
  const seed = new Uint8Array(Array.from({ length: 32 }, (_, index) => index + 1));
  const otherSeed = new Uint8Array(Array.from({ length: 32 }, (_, index) => 100 + index));
  const masterKey = new Uint8Array(Array.from({ length: 32 }, (_, index) => 255 - index));
  const secondKey = new Uint8Array(Array.from({ length: 32 }, (_, index) => index * 3));

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
    simulateBrowserRestart();
    setBrowserFingerprint('one');
  });

  test('round-trips a key without persisting any wrapping material in web storage', async () => {
    const storage = new SecureIndexedDBStorage();
    await storage.setItem(MASTER_KEY_STORAGE_KEY, masterKey);

    expect(Array.from((await storage.getItem(MASTER_KEY_STORAGE_KEY)) ?? [])).toEqual(
      Array.from(masterKey)
    );
    expect(localStorage.getItem(WRAPPING_KEY_SEED_KEY)).toBeNull();
    expect(sessionStorage.getItem(WRAPPING_KEY_SEED_KEY)).toBeNull();
  });

  test('wraps with a non-extractable key that never exists as bytes', async () => {
    await new SecureIndexedDBStorage().setItem(MASTER_KEY_STORAGE_KEY, masterKey);

    const record = entries(fakeIndexedDB).get(WRAPPING_KEY_RECORD) as CryptoKey;
    expect(record.type).toBe('secret');
    expect(record.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', record)).rejects.toThrow();
  });

  test('restores the key after a browser restart that clears session and local storage', async () => {
    await new SecureIndexedDBStorage().setItem(MASTER_KEY_STORAGE_KEY, masterKey);

    simulateBrowserRestart();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new FakeLocalStorage(),
    });

    const restored = await new SecureIndexedDBStorage().getItem(MASTER_KEY_STORAGE_KEY);
    expect(Array.from(restored ?? [])).toEqual(Array.from(masterKey));
  });

  test('is unaffected by browser fingerprint changes', async () => {
    await new SecureIndexedDBStorage().setItem(MASTER_KEY_STORAGE_KEY, masterKey);
    setBrowserFingerprint('two');

    const restored = await new SecureIndexedDBStorage().getItem(MASTER_KEY_STORAGE_KEY);
    expect(Array.from(restored ?? [])).toEqual(Array.from(masterKey));
  });

  test('two instances initializing at once converge on one wrapping key', async () => {
    const a = new SecureIndexedDBStorage();
    const b = new SecureIndexedDBStorage();

    await Promise.all([
      a.setItem(MASTER_KEY_STORAGE_KEY, masterKey),
      b.setItem('other_key', secondKey),
    ]);

    expect(Array.from((await b.getItem(MASTER_KEY_STORAGE_KEY)) ?? [])).toEqual(
      Array.from(masterKey)
    );
    expect(Array.from((await a.getItem('other_key')) ?? [])).toEqual(Array.from(secondKey));
  });

  test('migrates seed-wrapped entries, then removes the plaintext seed', async () => {
    localStorage.setItem(WRAPPING_KEY_SEED_KEY, bytesToStorageString(seed));
    fakeIndexedDB.stores.set(
      STORE_NAME,
      new Map([[MASTER_KEY_STORAGE_KEY, await seedEncrypt(masterKey, seed)]])
    );

    const restored = await new SecureIndexedDBStorage().getItem(MASTER_KEY_STORAGE_KEY);
    expect(Array.from(restored ?? [])).toEqual(Array.from(masterKey));
    expect(localStorage.getItem(WRAPPING_KEY_SEED_KEY)).toBeNull();

    const afterRestart = await new SecureIndexedDBStorage().getItem(MASTER_KEY_STORAGE_KEY);
    expect(Array.from(afterRestart ?? [])).toEqual(Array.from(masterKey));
  });

  test('migrates legacy fingerprint-wrapped entries and survives a fingerprint change', async () => {
    localStorage.setItem(WRAPPING_KEY_SEED_KEY, bytesToStorageString(seed));
    fakeIndexedDB.stores.set(
      STORE_NAME,
      new Map([[MASTER_KEY_STORAGE_KEY, await legacyEncrypt(masterKey, seed)]])
    );

    const restored = await new SecureIndexedDBStorage().getItem(MASTER_KEY_STORAGE_KEY);
    expect(Array.from(restored ?? [])).toEqual(Array.from(masterKey));
    expect(localStorage.getItem(WRAPPING_KEY_SEED_KEY)).toBeNull();

    setBrowserFingerprint('two');
    const afterChange = await new SecureIndexedDBStorage().getItem(MASTER_KEY_STORAGE_KEY);
    expect(Array.from(afterChange ?? [])).toEqual(Array.from(masterKey));
  });

  test('finishes an interrupted migration without losing already-migrated entries', async () => {
    await new SecureIndexedDBStorage().setItem('already_migrated', secondKey);
    entries(fakeIndexedDB).set(MASTER_KEY_STORAGE_KEY, await seedEncrypt(masterKey, seed));
    localStorage.setItem(WRAPPING_KEY_SEED_KEY, bytesToStorageString(seed));

    const storage = new SecureIndexedDBStorage();
    expect(Array.from((await storage.getItem(MASTER_KEY_STORAGE_KEY)) ?? [])).toEqual(
      Array.from(masterKey)
    );
    expect(Array.from((await storage.getItem('already_migrated')) ?? [])).toEqual(
      Array.from(secondKey)
    );
    expect(localStorage.getItem(WRAPPING_KEY_SEED_KEY)).toBeNull();
  });

  test('keeps the legacy seed when an entry cannot be migrated, and still migrates the rest', async () => {
    localStorage.setItem(WRAPPING_KEY_SEED_KEY, bytesToStorageString(seed));
    fakeIndexedDB.stores.set(
      STORE_NAME,
      new Map([
        [MASTER_KEY_STORAGE_KEY, await seedEncrypt(masterKey, seed)],
        ['wrapped_by_other_seed', await seedEncrypt(secondKey, otherSeed)],
      ])
    );

    const storage = new SecureIndexedDBStorage();
    expect(Array.from((await storage.getItem(MASTER_KEY_STORAGE_KEY)) ?? [])).toEqual(
      Array.from(masterKey)
    );
    expect(localStorage.getItem(WRAPPING_KEY_SEED_KEY)).not.toBeNull();
    await expect(storage.getItem('wrapped_by_other_seed')).rejects.toThrow(
      SecureStorageDecryptionError
    );
  });

  test('clear() removes entries and the wrapping key, and storage works again afterwards', async () => {
    const storage = new SecureIndexedDBStorage();
    await storage.setItem(MASTER_KEY_STORAGE_KEY, masterKey);
    await storage.clear();

    expect(entries(fakeIndexedDB).size).toBe(0);
    expect(await storage.getItem(MASTER_KEY_STORAGE_KEY)).toBeNull();

    await storage.setItem(MASTER_KEY_STORAGE_KEY, secondKey);
    expect(Array.from((await storage.getItem(MASTER_KEY_STORAGE_KEY)) ?? [])).toEqual(
      Array.from(secondKey)
    );
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
