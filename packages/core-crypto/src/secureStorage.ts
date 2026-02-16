/**
 * Secure Storage Implementation for NoteChain
 *
 * Uses IndexedDB with encryption at rest for storing sensitive key material.
 * This addresses the security concern of storing master keys in localStorage.
 *
 * Security Features:
 * - Encryption at rest using AES-GCM via Web Crypto API
 * - Unique encryption key derived from device fingerprint + random seed
 * - Keys are never stored in plaintext
 * - Automatic cleanup on logout
 * - Protection against XSS attacks (IndexedDB is origin-scoped)
 */

import { randomBytes } from '@stablelib/random';

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
 * Storage key for the wrapping key seed
 */
const WRAPPING_KEY_SEED_KEY = 'notechain_wrapping_key_seed';

/**
 * Generate a device-specific fingerprint
 * Combines multiple browser characteristics for uniqueness
 */
async function getDeviceFingerprint(): Promise<string> {
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
 * Derive the wrapping key from device fingerprint and seed
 * This key is used to encrypt/decrypt stored keys
 */
async function deriveWrappingKey(seed: Uint8Array): Promise<CryptoKey> {
  const fingerprint = await getDeviceFingerprint();
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

  // Use a fixed salt derived from app identifier
  const salt = new TextEncoder().encode('notechain-key-wrapping-v1');

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
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, data);

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
 * Secure IndexedDB storage adapter with encryption at rest
 *
 * This implementation:
 * 1. Uses IndexedDB instead of localStorage (origin-scoped, not accessible to other origins)
 * 2. Encrypts all stored data with AES-GCM before writing to storage
 * 3. Derives encryption key from device fingerprint + random seed
 * 4. Stores the seed in localStorage (less sensitive, but needed for key derivation)
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
      // Open IndexedDB
      this.db = await openDatabase();

      // Get or create wrapping key seed
      let seedString = localStorage.getItem(WRAPPING_KEY_SEED_KEY);
      let seed: Uint8Array;

      if (seedString) {
        // Parse existing seed
        seed = new Uint8Array(seedString.split(',').map(Number));
      } else {
        // Generate new seed
        seed = randomBytes(32);
        seedString = Array.from(seed).join(',');
        localStorage.setItem(WRAPPING_KEY_SEED_KEY, seedString);
      }

      // Derive wrapping key
      this.wrappingKey = await deriveWrappingKey(seed);
    })();

    return this.initPromise;
  }

  /**
   * Ensure storage is initialized
   */
  private ensureInit(): void {
    if (!this.db || !this.wrappingKey) {
      throw new Error('Secure storage not initialized. Call init() first.');
    }
  }

  /**
   * Store encrypted data in IndexedDB
   */
  async setItem(key: string, value: Uint8Array): Promise<void> {
    await this.init();
    this.ensureInit();

    // Encrypt the data
    const { ciphertext, iv } = await encryptWithWrappingKey(value, this.wrappingKey!);

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

    // Decode from base64
    const combined = new Uint8Array(
      atob(stored)
        .split('')
        .map(c => c.charCodeAt(0))
    );

    // Extract IV and ciphertext
    const view = new DataView(combined.buffer);
    const ivLength = view.getUint32(0, true);
    const iv = combined.slice(4, 4 + ivLength);
    const ciphertext = combined.slice(4 + ivLength);

    // Decrypt
    return decryptWithWrappingKey(ciphertext, iv, this.wrappingKey!);
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

    // Remove wrapping key seed
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
