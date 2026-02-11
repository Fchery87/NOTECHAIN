import nacl from 'tweetnacl';
import { randomBytes } from '@stablelib/random';

/**
 * EncryptionService provides client-side encryption using TweetNaCl
 * Uses XSalsa20-Poly1305 (secretbox) - the same as libsodium's crypto_secretbox
 */
export class EncryptionService {
  /**
   * Ensures the crypto service is ready (no-op for tweetnacl)
   */
  static async ready(): Promise<void> {
    // TweetNaCl is synchronous and doesn't need initialization
  }

  /**
   * Encrypts data using XSalsa20-Poly1305 (secretbox)
   * @param data The plaintext data to encrypt as Uint8Array
   * @param key The encryption key (32 bytes)
   * @returns Object containing ciphertext, nonce, and authTag
   */
  static async encrypt(
    data: Uint8Array,
    key: Uint8Array
  ): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array; authTag: Uint8Array }> {
    const nonce = randomBytes(nacl.secretbox.nonceLength);
    const encrypted = nacl.secretbox(data, nonce, key);

    if (!encrypted) {
      throw new Error('Encryption failed');
    }

    // secretbox returns ciphertext with 16-byte auth tag prepended
    const authTag = encrypted.slice(0, 16);
    const ciphertext = encrypted.slice(16);

    return { ciphertext, nonce, authTag };
  }

  /**
   * Decrypts data using XSalsa20-Poly1305 (secretbox)
   * @param ciphertext The encrypted data
   * @param nonce The nonce used during encryption
   * @param authTag The authentication tag (16 bytes)
   * @param key The encryption key (32 bytes)
   * @returns The decrypted plaintext as Uint8Array
   */
  static async decrypt(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    authTag: Uint8Array,
    key: Uint8Array
  ): Promise<Uint8Array> {
    // Reconstruct the full encrypted message (auth tag + ciphertext)
    const combined = new Uint8Array(authTag.length + ciphertext.length);
    combined.set(authTag);
    combined.set(ciphertext, authTag.length);

    const plaintext = nacl.secretbox.open(combined, nonce, key);

    if (!plaintext) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }

    return plaintext;
  }

  /**
   * Generates a random encryption key
   * @returns A 32-byte encryption key
   */
  static async generateKey(): Promise<Uint8Array> {
    return randomBytes(nacl.secretbox.keyLength);
  }

  /**
   * Derives a key from a password using Argon2id
   * Note: For browser environments, this should use Web Crypto API's PBKDF2
   * or a WASM-based Argon2 implementation
   * @param password The password as Uint8Array
   * @param salt The salt for key derivation
   * @param iterations The number of iterations
   * @returns A derived key as Uint8Array
   */
  static async deriveKey(
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number
  ): Promise<Uint8Array> {
    // Simple hash-based KDF for development
    // TODO: Replace with proper Argon2id in production
    const combined = new Uint8Array(password.length + salt.length + 4);
    combined.set(password);
    combined.set(salt, password.length);

    // Add iteration count as little-endian uint32
    const view = new DataView(combined.buffer);
    view.setUint32(password.length + salt.length, iterations, true);

    // Use multiple rounds of hashing to derive the key
    let key = new Uint8Array(32);
    const data = combined;

    for (let i = 0; i < Math.max(1, Math.floor(iterations / 1000)); i++) {
      const hash = nacl.hash(new Uint8Array([...key, ...data]));
      key = hash.slice(0, 32);
    }

    return key;
  }
}

/**
 * Helper interface for encrypted data with string encoding
 */
export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  nonce: string; // Base64 encoded
  authTag: string; // Base64 encoded
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  return Buffer.from(base64, 'base64');
}

/**
 * Encrypt data and return as base64-encoded strings
 * @param data The plaintext string to encrypt
 * @param key The encryption key (32 bytes)
 * @returns EncryptedData with base64-encoded fields
 */
export async function encryptData(data: string, key: Uint8Array): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(data);

  const { ciphertext, nonce, authTag } = await EncryptionService.encrypt(plaintext, key);

  return {
    ciphertext: uint8ArrayToBase64(ciphertext),
    nonce: uint8ArrayToBase64(nonce),
    authTag: uint8ArrayToBase64(authTag),
  };
}

/**
 * Decrypt base64-encoded encrypted data
 * @param encrypted The encrypted data with base64-encoded fields
 * @param key The encryption key (32 bytes)
 * @returns The decrypted plaintext string
 */
export async function decryptData(encrypted: EncryptedData, key: Uint8Array): Promise<string> {
  const ciphertext = base64ToUint8Array(encrypted.ciphertext);
  const nonce = base64ToUint8Array(encrypted.nonce);
  const authTag = base64ToUint8Array(encrypted.authTag);

  const plaintext = await EncryptionService.decrypt(ciphertext, nonce, authTag, key);

  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}
