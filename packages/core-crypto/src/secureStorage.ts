/**
 * Secure Storage Implementation for NoteChain
 *
 * Uses IndexedDB with encryption at rest for storing sensitive key material.
 * This addresses the security concern of storing master keys in localStorage.
 *
 * Security Features:
 * - Encryption at rest using AES-GCM via Web Crypto API
 * - The wrapping key is a random non-extractable CryptoKey persisted in
 *   IndexedDB, so its bytes are never available to JavaScript
 * - Keys are never stored in plaintext
 * - Automatic cleanup on logout
 */

/**
 * Interface for secure storage operations
 */
export interface SecureStorageAdapter {
  /** Store encrypted data */
  setItem(key: string, value: Uint8Array): Promise<void>;
  /** Retrieve and decrypt data */
  getItem(key: string): Promise<Uint8Array | null>;
  /** Remove data */
  removeItem(key: string): Promise<void>;
  /** Clear all stored data */
  clear(): Promise<void>;
}

/**
 * IndexedDB database configuration
 */
const DB_CONFIG = {
  name: 'notechain_secure_storage',
  version: 1,
  storeName: 'encrypted_keys',
} as const;

/**
 * localStorage key of the legacy wrapping-key seed. Read only to migrate old
 * entries, then deleted; never written.
 */
const WRAPPING_KEY_SEED_KEY = 'notechain_wrapping_key_seed';

/**
 * Reserved record in the key store that holds the non-extractable wrapping key.
 */
const WRAPPING_KEY_RECORD = '__notechain_wrapping_key_v3__';

export class SecureStorageDecryptionError extends Error {
  cause?: unknown;

  constructor(key: string, cause?: unknown) {
    super(
      `Stored encrypted key "${key}" could not be decrypted. Import your recovery key to restore access.`
    );
    this.name = 'SecureStorageDecryptionError';
    this.cause = cause;
  }
}

/**
 * Generate the legacy browser fingerprint previously used for key wrapping.
 * Kept only so existing entries can be decrypted once and migrated to the
 * current wrapping key. Do not use for newly stored data: these
 * browser characteristics can change and lock web users out of local keys.
 */
async function getLegacyDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // User agent
  components.push(navigator.userAgent);

  // Screen characteristics
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  if (navigator.platform) {
    components.push(navigator.platform);
  }

  // Hardware concurrency (if available)
  if (navigator.hardwareConcurrency) {
    components.push(String(navigator.hardwareConcurrency));
  }

  // Device memory (if available)
  const navWithMemory = navigator as Navigator & { deviceMemory?: number };
  if (navWithMemory.deviceMemory) {
    components.push(String(navWithMemory.deviceMemory));
  }

  return components.join('|');
}

/**
 * Derive the v2 seed-only wrapping key. Kept only to migrate entries written
 * while the seed lived in localStorage.
 */
async function deriveLegacySeedWrappingKey(seed: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    seed.slice().buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return deriveAesGcmWrappingKey(keyMaterial, 'notechain-key-wrapping-v2');
}

/**
 * Derive the v1 fingerprint+seed wrapping key for one-time migration.
 */
async function deriveLegacyWrappingKey(seed: Uint8Array): Promise<CryptoKey> {
  const fingerprint = await getLegacyDeviceFingerprint();
  const fingerprintBytes = new TextEncoder().encode(fingerprint);

  // Combine fingerprint with seed
  const combined = new Uint8Array(fingerprintBytes.length + seed.length);
  combined.set(fingerprintBytes);
  combined.set(seed, fingerprintBytes.length);

  // Hash to get consistent length
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const keyMaterial = await crypto.subtle.importKey('raw', hashBuffer, 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ]);

  return deriveAesGcmWrappingKey(keyMaterial, 'notechain-key-wrapping-v1');
}

async function deriveAesGcmWrappingKey(
  keyMaterial: CryptoKey,
  saltLabel: string
): Promise<CryptoKey> {
  // Use a fixed salt derived from app identifier and storage version
  const salt = new TextEncoder().encode(saltLabel);

  // Derive the final wrapping key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using the wrapping key
 */
async function encryptWithWrappingKey(
  data: Uint8Array,
  wrappingKey: CryptoKey
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as unknown as ArrayBuffer },
    wrappingKey,
    data.buffer as unknown as ArrayBuffer
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv,
  };
}

/**
 * Decrypt data using the wrapping key
 */
async function decryptWithWrappingKey(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  wrappingKey: CryptoKey
): Promise<Uint8Array> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
    wrappingKey,
    ciphertext.buffer as ArrayBuffer
  );

  return new Uint8Array(plaintext);
}

/**
 * Open or create the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DB_CONFIG.storeName)) {
        db.createObjectStore(DB_CONFIG.storeName);
      }
    };
  });
}

/**
 * Split a stored base64 payload into its IV and ciphertext.
 */
function decodeStoredValue(stored: string): { iv: Uint8Array; ciphertext: Uint8Array } {
  const combined = new Uint8Array(
    atob(stored)
      .split('')
      .map(c => c.charCodeAt(0))
  );
  const ivLength = new DataView(combined.buffer).getUint32(0, true);

  return {
    iv: combined.slice(4, 4 + ivLength),
    ciphertext: combined.slice(4 + ivLength),
  };
}

function requestResult<T>(request: IDBRequest<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(new Error(message));
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Secure IndexedDB storage adapter with encryption at rest
 *
 * This implementation:
 * 1. Uses IndexedDB instead of localStorage (origin-scoped, not accessible to other origins)
 * 2. Encrypts all stored data with AES-GCM before writing to storage
 * 3. Wraps with a random non-extractable CryptoKey persisted in the same
 *    IndexedDB database, so no key bytes are ever kept in web storage
 * 4. On first use, re-wraps entries written under the legacy localStorage seed
 *    and deletes the seed once every entry has migrated
 */
export class SecureIndexedDBStorage implements SecureStorageAdapter {
  private db: IDBDatabase | null = null;
  private wrappingKey: CryptoKey | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the storage - must be called before other operations
   */
  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      this.db = await openDatabase();
      this.wrappingKey = await this.loadOrCreateWrappingKey();
      await this.migrateLegacyEntries();
    })();

    return this.initPromise;
  }

  /**
   * Return the persisted wrapping key, creating it if this is the first run.
   * Creation uses add-if-absent so concurrent tabs converge on a single key
   * instead of each wrapping data with a key the other overwrites.
   */
  private async loadOrCreateWrappingKey(): Promise<CryptoKey> {
    const readExisting = () =>
      requestResult<CryptoKey | undefined>(
        this.db!.transaction(DB_CONFIG.storeName, 'readonly')
          .objectStore(DB_CONFIG.storeName)
          .get(WRAPPING_KEY_RECORD),
        'Failed to read wrapping key'
      );

    const existing = await readExisting();
    if (existing) {
      return existing;
    }

    const candidate = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);

    try {
      await requestResult(
        this.db!.transaction(DB_CONFIG.storeName, 'readwrite')
          .objectStore(DB_CONFIG.storeName)
          .add(candidate, WRAPPING_KEY_RECORD),
        'Failed to store wrapping key'
      );
      return candidate;
    } catch (error) {
      const winner = await readExisting();
      if (!winner) {
        throw error;
      }
      return winner;
    }
  }

  /**
   * Re-wrap entries written under the legacy seed-derived keys with the
   * current wrapping key. The legacy seed is deleted only when no entry is
   * left that it might still be needed for, so a failed migration never
   * destroys the ability to retry.
   */
  private async migrateLegacyEntries(): Promise<void> {
    const seedString = localStorage.getItem(WRAPPING_KEY_SEED_KEY);
    if (!seedString) {
      return;
    }

    const seed = new Uint8Array(seedString.split(',').map(Number));
    const legacyKeys: CryptoKey[] = [];
    try {
      legacyKeys.push(await deriveLegacySeedWrappingKey(seed));
      legacyKeys.push(await deriveLegacyWrappingKey(seed));
    } catch {
      // Fall through with whatever legacy keys could be derived.
    }

    const keys = await requestResult(
      this.db!.transaction(DB_CONFIG.storeName, 'readonly')
        .objectStore(DB_CONFIG.storeName)
        .getAllKeys(),
      'Failed to list stored keys'
    );

    let allMigrated = true;
    for (const key of keys) {
      if (key === WRAPPING_KEY_RECORD || typeof key !== 'string') {
        continue;
      }

      const stored = await requestResult<string | undefined>(
        this.db!.transaction(DB_CONFIG.storeName, 'readonly')
          .objectStore(DB_CONFIG.storeName)
          .get(key),
        `Failed to retrieve item: ${key}`
      );
      if (typeof stored !== 'string') {
        continue;
      }

      const { iv, ciphertext } = decodeStoredValue(stored);
      const plaintext = await this.decryptWithAny(ciphertext, iv, [
        this.wrappingKey!,
        ...legacyKeys,
      ]);

      if (!plaintext) {
        allMigrated = false;
      } else if (plaintext.usedKey !== this.wrappingKey) {
        await this.writeEncryptedValue(key, plaintext.value, this.wrappingKey!);
      }
    }

    if (allMigrated) {
      localStorage.removeItem(WRAPPING_KEY_SEED_KEY);
    }
  }

  private async decryptWithAny(
    ciphertext: Uint8Array,
    iv: Uint8Array,
    candidates: CryptoKey[]
  ): Promise<{ value: Uint8Array; usedKey: CryptoKey } | null> {
    for (const candidate of candidates) {
      try {
        return {
          value: await decryptWithWrappingKey(ciphertext, iv, candidate),
          usedKey: candidate,
        };
      } catch {
        // Try the next candidate key.
      }
    }
    return null;
  }

  /**
   * Ensure storage is initialized
   */
  private ensureInit(): void {
    if (!this.db || !this.wrappingKey) {
      throw new Error('Secure storage not initialized. Call init() first.');
    }
  }

  private async writeEncryptedValue(
    key: string,
    value: Uint8Array,
    wrappingKey: CryptoKey
  ): Promise<void> {
    // Encrypt the data
    const { ciphertext, iv } = await encryptWithWrappingKey(value, wrappingKey);

    // Combine IV and ciphertext for storage
    const combined = new Uint8Array(4 + iv.length + ciphertext.length);
    const view = new DataView(combined.buffer);
    view.setUint32(0, iv.length, true); // Store IV length
    combined.set(iv, 4);
    combined.set(ciphertext, 4 + iv.length);

    // Convert to base64 for storage
    const stored = btoa(String.fromCharCode(...combined));

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(DB_CONFIG.storeName, 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.storeName);
      const request = store.put(stored, key);

      request.onerror = () => {
        reject(new Error(`Failed to store item: ${key}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Store encrypted data in IndexedDB
   */
  async setItem(key: string, value: Uint8Array): Promise<void> {
    await this.init();
    this.ensureInit();

    return this.writeEncryptedValue(key, value, this.wrappingKey!);
  }

  /**
   * Retrieve and decrypt data from IndexedDB
   */
  async getItem(key: string): Promise<Uint8Array | null> {
    await this.init();
    this.ensureInit();

    const stored = await new Promise<string | null>((resolve, reject) => {
      const transaction = this.db!.transaction(DB_CONFIG.storeName, 'readonly');
      const store = transaction.objectStore(DB_CONFIG.storeName);
      const request = store.get(key);

      request.onerror = () => {
        reject(new Error(`Failed to retrieve item: ${key}`));
      };

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
    });

    if (!stored) {
      return null;
    }

    const { iv, ciphertext } = decodeStoredValue(stored);

    try {
      return await decryptWithWrappingKey(ciphertext, iv, this.wrappingKey!);
    } catch (error) {
      throw new SecureStorageDecryptionError(key, error);
    }
  }

  /**
   * Remove an item from storage
   */
  async removeItem(key: string): Promise<void> {
    await this.init();
    this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(DB_CONFIG.storeName, 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.storeName);
      const request = store.delete(key);

      request.onerror = () => {
        reject(new Error(`Failed to remove item: ${key}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Clear all stored data and reset the wrapping key
   */
  async clear(): Promise<void> {
    await this.init();
    this.ensureInit();

    // Clear IndexedDB store
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(DB_CONFIG.storeName, 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error('Failed to clear storage'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });

    // Remove any legacy wrapping key seed
    localStorage.removeItem(WRAPPING_KEY_SEED_KEY);

    // Reset state
    this.wrappingKey = null;
    this.initPromise = null;
  }

  /**
   * Check if a key exists in storage
   */
  async hasItem(key: string): Promise<boolean> {
    await this.init();
    this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(DB_CONFIG.storeName, 'readonly');
      const store = transaction.objectStore(DB_CONFIG.storeName);
      const request = store.get(key);

      request.onerror = () => {
        reject(new Error(`Failed to check item: ${key}`));
      };

      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };
    });
  }
}

/**
 * Memory-only storage adapter for testing or ephemeral sessions
 */
export class SecureMemoryStorage implements SecureStorageAdapter {
  private store: Map<string, Uint8Array> = new Map();

  async setItem(key: string, value: Uint8Array): Promise<void> {
    this.store.set(key, value);
  }

  async getItem(key: string): Promise<Uint8Array | null> {
    return this.store.get(key) ?? null;
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

/**
 * Detect and return the appropriate secure storage adapter
 */
export function detectSecureStorage(): SecureStorageAdapter {
  // Check for IndexedDB availability
  if (typeof indexedDB !== 'undefined') {
    return new SecureIndexedDBStorage();
  }
  // Fallback to memory storage (not persistent)
  return new SecureMemoryStorage();
}

/** Default secure storage instance */
export const defaultSecureStorage = detectSecureStorage();
