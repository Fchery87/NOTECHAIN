'use client';

import { decodeRecoveryKey, EncryptionService, KeyManager } from '@notechain/core-crypto';

export class EncryptionRecoveryRequiredError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'EncryptionRecoveryRequiredError';
    this.cause = cause;
  }
}

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

    try {
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
    } catch (error) {
      console.error('[EncryptedSyncService] Failed to initialize:', error);
      this.encryptionKey = null;
      this.isInitialized = false;
      throw new EncryptionRecoveryRequiredError(
        'Unable to load your encryption key. Enter your recovery key to restore access instead of generating a new incompatible key.',
        error
      );
    }
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

    // Convert to base64 strings (browser-compatible)
    const ciphertextB64 = btoa(String.fromCharCode(...ciphertext));
    const nonceB64 = btoa(String.fromCharCode(...nonce));
    const authTagB64 = btoa(String.fromCharCode(...authTag));

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
      console.error('[EncryptedSyncService] Invalid payload format:', payload.substring(0, 50));
      throw new Error('Invalid encrypted payload format');
    }

    // Browser-compatible base64 decoding
    const base64ToUint8Array = (base64: string): Uint8Array => {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    };

    try {
      const ciphertext = base64ToUint8Array(parts[0]);
      const nonce = base64ToUint8Array(parts[1]);
      const authTag = base64ToUint8Array(parts[2]);

      // Validate lengths before attempting decryption
      if (nonce.length !== 24) {
        console.warn(
          `[EncryptedSyncService] Invalid nonce length: ${nonce.length} (expected 24). Data may be corrupted.`
        );
      }
      if (authTag.length !== 16) {
        console.warn(
          `[EncryptedSyncService] Invalid authTag length: ${authTag.length} (expected 16). Data may be corrupted.`
        );
      }

      // Debug logging
      console.log('[EncryptedSyncService] Decrypting:', {
        ciphertextLength: ciphertext.length,
        nonceLength: nonce.length,
        authTagLength: authTag.length,
        expectedNonceLength: 24,
        expectedAuthTagLength: 16,
      });

      const plaintext = await EncryptionService.decrypt(
        ciphertext,
        nonce,
        authTag,
        this.encryptionKey
      );

      const jsonString = new TextDecoder().decode(plaintext);
      return JSON.parse(jsonString);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Provide helpful context based on error type
      if (errorMessage.includes('invalid key')) {
        console.error('[EncryptedSyncService] Decryption failed: Key mismatch detected.', {
          note: 'This usually means the note was encrypted with a different key than the one currently in use.',
          possibleCauses: [
            'Browser data was cleared',
            'Logged in on a new device',
            'App was reinstalled',
            'Encryption key was reset',
          ],
          payloadLength: payload.length,
          error: errorMessage,
        });
      } else {
        console.error('[EncryptedSyncService] Decryption failed:', {
          payloadLength: payload.length,
          part0Length: parts[0].length,
          part1Length: parts[1].length,
          part2Length: parts[2].length,
          error: errorMessage,
        });
      }
      throw error;
    }
  }

  /**
   * Export the current master key as a user-held recovery key.
   */
  async exportRecoveryKey(): Promise<string> {
    return KeyManager.exportRecoveryKey();
  }

  /**
   * Restore the master key from a user-held recovery key and mark encryption ready.
   */
  async importRecoveryKey(recoveryKey: string): Promise<void> {
    const masterKey = await KeyManager.importRecoveryKey(recoveryKey);
    this.encryptionKey = masterKey;
    this.isInitialized = true;
  }

  /**
   * Verify a user-entered recovery key matches the currently loaded encryption key.
   */
  verifyRecoveryKey(recoveryKey: string): boolean {
    if (!this.isReady() || !this.encryptionKey) {
      throw new Error('Encryption service not initialized');
    }

    const decoded = decodeRecoveryKey(recoveryKey);
    if (decoded.length !== this.encryptionKey.length) {
      return false;
    }

    let difference = 0;
    for (let i = 0; i < decoded.length; i++) {
      difference |= decoded[i] ^ this.encryptionKey[i];
    }

    return difference === 0;
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
