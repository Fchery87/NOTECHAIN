/**
 * Repository utilities for handling Supabase BYTEA data
 * Supabase returns BYTEA columns as Uint8Array, not base64 strings
 */

/**
 * Convert Supabase BYTEA (Uint8Array) to base64 string
 * The encryption service expects base64-encoded strings
 */
export function byteaToBase64(value: string | Uint8Array | null | undefined): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  // Convert Uint8Array to base64
  if (value instanceof Uint8Array) {
    let binary = '';
    for (let i = 0; i < value.length; i++) {
      binary += String.fromCharCode(value[i]);
    }
    return btoa(binary);
  }

  return String(value);
}

/**
 * Database row interface for encrypted blobs
 * Supabase returns BYTEA as Uint8Array
 */
export interface EncryptedBlobRow {
  id: string;
  user_id: string;
  blob_type: string;
  ciphertext: string | Uint8Array;
  nonce: string | Uint8Array;
  auth_tag: string | Uint8Array;
  key_id: string;
  metadata_hash: string | Uint8Array;
  version: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}
