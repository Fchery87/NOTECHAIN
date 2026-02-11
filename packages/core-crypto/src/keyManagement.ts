import nacl from 'tweetnacl';
import { StorageAdapter, defaultStorage } from './storage';

/**
 * KeyManager handles the storage and derivation of encryption keys
 * Keys are stored as comma-separated strings via the storage adapter
 */
export class KeyManager {
  static readonly MASTER_KEY_STORAGE_KEY = 'notechain_master_key';
  private static storage: StorageAdapter = defaultStorage;

  /**
   * Set a custom storage adapter (useful for testing or React Native)
   */
  static setStorageAdapter(adapter: StorageAdapter): void {
    this.storage = adapter;
  }

  /**
   * Stores the master key in storage
   * @param key The master key as Uint8Array
   */
  static async storeMasterKey(key: Uint8Array): Promise<void> {
    const keyString = Array.from(key).join(',');
    await this.storage.setItem(this.MASTER_KEY_STORAGE_KEY, keyString);
  }

  /**
   * Retrieves the master key from storage
   * @returns The master key as Uint8Array, or null if not found
   */
  static async getMasterKey(): Promise<Uint8Array | null> {
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
   */
  static async clearMasterKey(): Promise<void> {
    await this.storage.removeItem(this.MASTER_KEY_STORAGE_KEY);
  }

  /**
   * Checks if the master key has been stored
   * @returns True if the master key exists in storage
   */
  static async hasMasterKey(): Promise<boolean> {
    const key = await this.storage.getItem(this.MASTER_KEY_STORAGE_KEY);
    return key !== null;
  }
}
