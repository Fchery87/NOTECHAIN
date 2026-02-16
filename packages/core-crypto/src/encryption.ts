import nacl from 'tweetnacl';
import { randomBytes } from '@stablelib/random';

/**
 * PBKDF2 configuration following OWASP recommendations
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
export const PBKDF2_CONFIG = {
  /** Minimum 600,000 iterations for PBKDF2-SHA256 as per OWASP 2023 guidelines */
  MIN_ITERATIONS: 600000,
  /** Default iterations - can be increased for higher security */
  DEFAULT_ITERATIONS: 600000,
  /** Salt length in bytes (16 bytes = 128 bits) */
  SALT_LENGTH: 16,
  /** Derived key length in bytes (32 bytes = 256 bits) */
  KEY_LENGTH: 32,
  /** Hash algorithm */
  HASH: 'SHA-256',
} as const;

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
   * Generates a cryptographically secure salt for key derivation
   * @returns A 16-byte random salt
   */
  static generateSalt(): Uint8Array {
    return randomBytes(PBKDF2_CONFIG.SALT_LENGTH);
  }

  /**
   * Derives a key from a password using PBKDF2-SHA256
   * Uses Web Crypto API for secure, browser-native key derivation
   *
   * @param password The password as string or Uint8Array
   * @param salt The salt for key derivation (16 bytes recommended)
   * @param iterations Number of iterations (minimum 600,000 per OWASP)
   * @returns A derived 32-byte key as Uint8Array
   * @throws Error if iterations is below minimum or crypto API unavailable
   */
  static async deriveKey(
    password: Uint8Array | string,
    salt: Uint8Array,
    iterations: number = PBKDF2_CONFIG.DEFAULT_ITERATIONS
  ): Promise<Uint8Array> {
    // Validate iterations meet OWASP minimum
    if (iterations < PBKDF2_CONFIG.MIN_ITERATIONS) {
      throw new Error(
        `Iterations must be at least ${PBKDF2_CONFIG.MIN_ITERATIONS} per OWASP guidelines. ` +
          `Received: ${iterations}`
      );
    }

    // Validate salt length
    if (salt.length < 8) {
      throw new Error(
        `Salt must be at least 8 bytes. Received: ${salt.length} bytes. ` +
          `Recommended: ${PBKDF2_CONFIG.SALT_LENGTH} bytes.`
      );
    }

    // Convert password to Uint8Array if string
    const passwordBytes =
      typeof password === 'string' ? new TextEncoder().encode(password) : password;

    // Check for Web Crypto API availability
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error(
        'Web Crypto API is not available. PBKDF2 requires a secure context (HTTPS or localhost).'
      );
    }

    try {
      // Import the password as a raw key for PBKDF2
      // Note: Using .buffer to get ArrayBuffer for TypeScript compatibility
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        passwordBytes.buffer as ArrayBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      // Derive bits using PBKDF2-SHA256
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt.buffer as ArrayBuffer,
          iterations: iterations,
          hash: PBKDF2_CONFIG.HASH,
        },
        passwordKey,
        PBKDF2_CONFIG.KEY_LENGTH * 8 // Convert bytes to bits
      );

      return new Uint8Array(derivedBits);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`PBKDF2 key derivation failed: ${message}`, { cause: error });
    }
  }

  /**
   * Verifies a password against a derived key
   * Performs constant-time comparison to prevent timing attacks
   *
   * @param password The password to verify
   * @param salt The salt used during key derivation
   * @param expectedKey The expected derived key
   * @param iterations The number of iterations used
   * @returns true if password matches, false otherwise
   */
  static async verifyPassword(
    password: Uint8Array | string,
    salt: Uint8Array,
    expectedKey: Uint8Array,
    iterations: number = PBKDF2_CONFIG.DEFAULT_ITERATIONS
  ): Promise<boolean> {
    try {
      const derivedKey = await this.deriveKey(password, salt, iterations);

      // Constant-time comparison to prevent timing attacks
      if (derivedKey.length !== expectedKey.length) {
        return false;
      }

      let result = 0;
      for (let i = 0; i < derivedKey.length; i++) {
        result |= derivedKey[i] ^ expectedKey[i];
      }

      return result === 0;
    } catch {
      return false;
    }
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
 * Base64 character set for encoding
 */
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Convert Uint8Array to base64 string (browser-compatible)
 * Works in browser, Node.js, and other JavaScript environments
 * Priority: btoa > Buffer > pure JS implementation
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Primary: Use btoa in browser environments
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Fallback 1: Use Buffer in Node.js environments

  if (typeof Buffer === 'function') {
    return Buffer.from(bytes).toString('base64');
  }

  // Fallback 2: Pure JavaScript implementation for edge cases
  // This handles environments where neither btoa nor Buffer is available
  let result = '';
  let i = 0;
  const len = bytes.length;

  while (i < len) {
    const byte1 = bytes[i++];
    const byte2 = i < len ? bytes[i++] : 0;
    const byte3 = i < len ? bytes[i++] : 0;

    const triplet = (byte1 << 16) | (byte2 << 8) | byte3;

    result += BASE64_CHARS[(triplet >> 18) & 0x3f];
    result += BASE64_CHARS[(triplet >> 12) & 0x3f];
    result += i - 2 < len ? BASE64_CHARS[(triplet >> 6) & 0x3f] : '=';
    result += i - 1 < len ? BASE64_CHARS[triplet & 0x3f] : '=';
  }

  return result;
}

/**
 * Convert base64 string to Uint8Array (browser-compatible)
 * Works in browser, Node.js, and other JavaScript environments
 * Priority: atob > Buffer > pure JS implementation
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Primary: Use atob in browser environments
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Fallback 1: Use Buffer in Node.js environments

  if (typeof Buffer === 'function') {
    return Buffer.from(base64, 'base64');
  }

  // Fallback 2: Pure JavaScript implementation for edge cases
  // Remove any whitespace and padding
  const cleanBase64 = base64.replace(/[\s=]/g, '');

  // Create reverse lookup map
  const lookup: Record<string, number> = {};
  for (let i = 0; i < BASE64_CHARS.length; i++) {
    lookup[BASE64_CHARS[i]] = i;
  }

  const len = cleanBase64.length;
  const bytesLength = (len * 3) >> 2;
  const bytes = new Uint8Array(bytesLength);

  let byteIndex = 0;
  for (let i = 0; i < len; i += 4) {
    const enc1 = lookup[cleanBase64[i]] ?? 0;
    const enc2 = lookup[cleanBase64[i + 1]] ?? 0;
    const enc3 = lookup[cleanBase64[i + 2]] ?? 0;
    const enc4 = lookup[cleanBase64[i + 3]] ?? 0;

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    bytes[byteIndex++] = chr1;
    if (byteIndex < bytesLength) bytes[byteIndex++] = chr2;
    if (byteIndex < bytesLength) bytes[byteIndex++] = chr3;
  }

  return bytes;
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
