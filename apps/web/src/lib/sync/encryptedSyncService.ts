'use client';

import { EncryptionService, KeyManager } from '@notechain/core-crypto';

/**
 * Service for encrypted sync operations
 * Wraps the sync engine with E2E encryption using XSalsa20-Poly1305
 */
export class EncryptedSyncService {
  private static instance: EncryptedSyncService;
  private encryptionKey: Uint8Array | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): EncryptedSyncService {
    if (!EncryptedSyncService.instance) {
      EncryptedSyncService.instance = new EncryptedSyncService();
    }
    return EncryptedSyncService.instance;
  }

  /**
   * Initialize encryption with a master key
   * Generates a new key if none exists
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Try to get existing key
    let masterKey = await KeyManager.getMasterKey();

    if (!masterKey) {
      // Generate new master key for this device
      masterKey = await EncryptionService.generateKey();
      await KeyManager.storeMasterKey(masterKey);
      console.log('Generated new encryption key');
    }

    this.encryptionKey = masterKey;
    this.isInitialized = true;
    console.log('Encryption service initialized');
  }

  /**
   * Check if encryption is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.encryptionKey !== null;
  }

  /**
   * Encrypt data for sync
   * @param data Plaintext data object
   * @returns Encrypted payload string: base64(ciphertext):base64(nonce):base64(authTag)
   */
  async encrypt(data: unknown): Promise<string> {
    if (!this.isReady() || !this.encryptionKey) {
      throw new Error('Encryption service not initialized');
    }

    const jsonString = JSON.stringify(data);
    const plaintext = new TextEncoder().encode(jsonString);

    const { ciphertext, nonce, authTag } = await EncryptionService.encrypt(
      plaintext,
      this.encryptionKey
    );

    // Convert to base64 strings
    const ciphertextB64 = Buffer.from(ciphertext).toString('base64');
    const nonceB64 = Buffer.from(nonce).toString('base64');
    const authTagB64 = Buffer.from(authTag).toString('base64');

    return `${ciphertextB64}:${nonceB64}:${authTagB64}`;
  }

  /**
   * Decrypt data from sync
   * @param payload Encrypted payload string: base64(ciphertext):base64(nonce):base64(authTag)
   * @returns Decrypted data object
   */
  async decrypt(payload: string): Promise<unknown> {
    if (!this.isReady() || !this.encryptionKey) {
      throw new Error('Encryption service not initialized');
    }

    const parts = payload.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format');
    }

    const ciphertext = Buffer.from(parts[0], 'base64');
    const nonce = Buffer.from(parts[1], 'base64');
    const authTag = Buffer.from(parts[2], 'base64');

    const plaintext = await EncryptionService.decrypt(
      new Uint8Array(ciphertext),
      new Uint8Array(nonce),
      new Uint8Array(authTag),
      this.encryptionKey
    );

    const jsonString = new TextDecoder().decode(plaintext);
    return JSON.parse(jsonString);
  }

  /**
   * Clear encryption key (for logout)
   */
  async clear(): Promise<void> {
    await KeyManager.clearMasterKey();
    this.encryptionKey = null;
    this.isInitialized = false;
    console.log('Encryption service cleared');
  }
}

// Export singleton instance
export const encryptedSyncService = EncryptedSyncService.getInstance();
