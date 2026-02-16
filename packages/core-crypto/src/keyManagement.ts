import nacl from 'tweetnacl';
import { StorageAdapter, defaultStorage } from './storage';
import { SecureStorageAdapter, defaultSecureStorage } from './secureStorage';

/**
 * KeyManager handles the storage and derivation of encryption keys
 *
 * SECURITY UPDATE (Sprint 2):
 * - Now uses secure IndexedDB storage with encryption at rest by default
 * - Falls back to legacy localStorage for backward compatibility during migration
 * - Keys are never stored in plaintext in the new implementation
 */
export class KeyManager {
  static readonly MASTER_KEY_STORAGE_KEY = 'notechain_master_key';
  private static storage: StorageAdapter = defaultStorage;
  private static secureStorage: SecureStorageAdapter = defaultSecureStorage;
  private static useSecureStorage: boolean = true;

  /**
   * Set a custom storage adapter (useful for testing or React Native)
   * @deprecated Use setSecureStorageAdapter for secure storage
   */
  static setStorageAdapter(adapter: StorageAdapter): void {
    this.storage = adapter;
  }

  /**
   * Set a custom secure storage adapter
   */
  static setSecureStorageAdapter(adapter: SecureStorageAdapter): void {
    this.secureStorage = adapter;
  }

  /**
   * Enable or disable secure storage (for testing or migration)
   */
  static setUseSecureStorage(use: boolean): void {
    this.useSecureStorage = use;
  }

  /**
   * Stores the master key in secure storage
   * Uses IndexedDB with encryption at rest instead of localStorage
   * @param key The master key as Uint8Array
   */
  static async storeMasterKey(key: Uint8Array): Promise<void> {
    if (this.useSecureStorage) {
      // Store in secure IndexedDB storage (encrypted at rest)
      await this.secureStorage.setItem(this.MASTER_KEY_STORAGE_KEY, key);
      // Also clear any legacy localStorage entry for security
      try {
        localStorage.removeItem(this.MASTER_KEY_STORAGE_KEY);
      } catch {
        // Ignore if localStorage is not available
      }
    } else {
      // Legacy fallback for backward compatibility
      const keyString = Array.from(key).join(',');
      await this.storage.setItem(this.MASTER_KEY_STORAGE_KEY, keyString);
    }
  }

  /**
   * Retrieves the master key from secure storage
   * Automatically migrates from legacy localStorage if found
   * @returns The master key as Uint8Array, or null if not found
   */
  static async getMasterKey(): Promise<Uint8Array | null> {
    if (this.useSecureStorage) {
      // Try secure storage first
      const secureKey = await this.secureStorage.getItem(this.MASTER_KEY_STORAGE_KEY);
      if (secureKey) {
        return secureKey;
      }

      // Migration: Check for legacy localStorage key and migrate
      try {
        const legacyKeyString = localStorage.getItem(this.MASTER_KEY_STORAGE_KEY);
        if (legacyKeyString) {
          const legacyKey = new Uint8Array(legacyKeyString.split(',').map(Number));
          // Migrate to secure storage
          await this.secureStorage.setItem(this.MASTER_KEY_STORAGE_KEY, legacyKey);
          // Clear legacy storage
          localStorage.removeItem(this.MASTER_KEY_STORAGE_KEY);
          return legacyKey;
        }
      } catch {
        // localStorage not available, continue
      }

      return null;
    }

    // Legacy fallback
    const keyString = await this.storage.getItem(this.MASTER_KEY_STORAGE_KEY);
    if (!keyString) {
      return null;
    }
    return new Uint8Array(keyString.split(',').map(Number));
  }

  /**
   * Derives a device-specific key from the master key
   * Uses HMAC-like construction with SHA-512
   * @param deviceId The device identifier
   * @param masterKey The master key
   * @returns A derived device key as Uint8Array
   */
  static async deriveDeviceKey(deviceId: string, masterKey: Uint8Array): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const deviceIdBytes = encoder.encode(deviceId);

    // Create a simple HMAC-like derivation: hash(masterKey || deviceId)
    const combined = new Uint8Array(masterKey.length + deviceIdBytes.length);
    combined.set(masterKey);
    combined.set(deviceIdBytes, masterKey.length);

    const hash = nacl.hash(combined);

    // Take first 32 bytes as the device key
    return hash.slice(0, 32);
  }

  /**
   * Clears the stored master key (for logout)
   * Clears both secure storage and any legacy localStorage entries
   */
  static async clearMasterKey(): Promise<void> {
    if (this.useSecureStorage) {
      await this.secureStorage.removeItem(this.MASTER_KEY_STORAGE_KEY);
    }
    // Also clear legacy storage for complete cleanup
    try {
      localStorage.removeItem(this.MASTER_KEY_STORAGE_KEY);
    } catch {
      // Ignore if localStorage is not available
    }
    await this.storage.removeItem(this.MASTER_KEY_STORAGE_KEY);
  }

  /**
   * Checks if the master key has been stored
   * @returns True if the master key exists in storage
   */
  static async hasMasterKey(): Promise<boolean> {
    if (this.useSecureStorage) {
      const secureKey = await this.secureStorage.getItem(this.MASTER_KEY_STORAGE_KEY);
      if (secureKey) {
        return true;
      }
      // Check legacy storage for migration
      try {
        return localStorage.getItem(this.MASTER_KEY_STORAGE_KEY) !== null;
      } catch {
        return false;
      }
    }
    const key = await this.storage.getItem(this.MASTER_KEY_STORAGE_KEY);
    return key !== null;
  }

  /**
   * Clear all stored keys and reset storage
   * Use this for complete logout or account deletion
   */
  static async clearAll(): Promise<void> {
    if (this.useSecureStorage) {
      await this.secureStorage.clear();
    }
    try {
      localStorage.removeItem(this.MASTER_KEY_STORAGE_KEY);
    } catch {
      // Ignore if localStorage is not available
    }
  }
}
