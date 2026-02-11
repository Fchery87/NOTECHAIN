declare module 'libsodium-wrappers' {
  // Core types
  const _default: any;
  export default _default;

  // Random bytes
  export function randombytes_buf(length: number): Uint8Array;

  // String conversion
  export function from_string(str: string): Uint8Array;
  export function to_string(bytes: Uint8Array): string;
  export function from_hex(hex: string): Uint8Array;
  export function to_hex(bytes: Uint8Array): string;
  export function from_base64(str: string): Uint8Array;
  export function to_base64(bytes: Uint8Array): string;

  // Secret box (XChaCha20-Poly1305)
  export function crypto_secretbox_easy(
    message: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array
  ): Uint8Array;
  export function crypto_secretbox_open_easy(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array
  ): Uint8Array | null;
  export const crypto_secretbox_KEYBYTES: number;
  export const crypto_secretbox_NONCEBYTES: number;

  // AEAD ChaCha20-Poly1305
  export function crypto_aead_chacha20poly1305_ietf_encrypt(
    message: Uint8Array,
    additionalData: Uint8Array | null,
    secretNonce: Uint8Array | null,
    publicNonce: Uint8Array,
    key: Uint8Array
  ): Uint8Array;

  export function crypto_aead_chacha20poly1305_ietf_decrypt(
    outputBuffer: Uint8Array | null,
    ciphertext: Uint8Array,
    additionalData: Uint8Array | null,
    publicNonce: Uint8Array,
    key: Uint8Array
  ): Uint8Array;

  export const crypto_aead_chacha20poly1305_ietf_NPUBBYTES: number;
  export const crypto_aead_chacha20poly1305_ietf_KEYBYTES: number;

  // Password hashing (Argon2)
  export function crypto_pwhash(
    outputLength: number,
    password: Uint8Array,
    salt: Uint8Array,
    opsLimit: number,
    memLimit: number,
    algorithm: number
  ): Uint8Array;

  export const crypto_pwhash_SALTBYTES: number;
  export const crypto_pwhash_OPSLIMIT_MODERATE: number;
  export const crypto_pwhash_MEMLIMIT_MODERATE: number;
  export const crypto_pwhash_ALG_DEFAULT: number;

  // Generic hashing
  export function crypto_generichash(message: Uint8Array, key?: Uint8Array): Uint8Array;
}
