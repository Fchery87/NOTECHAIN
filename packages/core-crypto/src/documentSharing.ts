import { EncryptionService } from './encryption';

export const DOCUMENT_CONTENT_KEY_BYTES = 32;
export const KEY_PACKAGE_FORMAT = 'notechain.document-key-package';
export const KEY_PACKAGE_VERSION = 1;

export interface EncryptedDocumentPayload {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  authTag: Uint8Array;
}

export interface RecipientKeyPackage {
  format: typeof KEY_PACKAGE_FORMAT;
  version: typeof KEY_PACKAGE_VERSION;
  documentId: string;
  recipientId: string;
  recipientDeviceId: string;
  wrappedKey: {
    ciphertext: Uint8Array;
    nonce: Uint8Array;
    authTag: Uint8Array;
  };
  createdAt: string;
  revokedAt?: string;
}

export interface SerializableRecipientKeyPackage {
  format: typeof KEY_PACKAGE_FORMAT;
  version: typeof KEY_PACKAGE_VERSION;
  documentId: string;
  recipientId: string;
  recipientDeviceId: string;
  wrappedKey: {
    ciphertext: string;
    nonce: string;
    authTag: string;
  };
  createdAt: string;
  revokedAt?: string;
}

function assertKeyLength(key: Uint8Array, label: string): void {
  if (key.length !== DOCUMENT_CONTENT_KEY_BYTES) {
    throw new Error(`${label} must be ${DOCUMENT_CONTENT_KEY_BYTES} bytes`);
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  if (typeof Buffer === 'function') {
    return Buffer.from(bytes).toString('base64');
  }

  throw new Error('No base64 encoder available');
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  if (typeof Buffer === 'function') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  throw new Error('No base64 decoder available');
}

export async function generateDocumentContentKey(): Promise<Uint8Array> {
  return EncryptionService.generateKey();
}

export async function encryptDocumentPayload(
  plaintext: Uint8Array,
  documentContentKey: Uint8Array
): Promise<EncryptedDocumentPayload> {
  assertKeyLength(documentContentKey, 'Document content key');
  return EncryptionService.encrypt(plaintext, documentContentKey);
}

export async function decryptDocumentPayload(
  payload: EncryptedDocumentPayload,
  documentContentKey: Uint8Array
): Promise<Uint8Array> {
  assertKeyLength(documentContentKey, 'Document content key');
  return EncryptionService.decrypt(
    payload.ciphertext,
    payload.nonce,
    payload.authTag,
    documentContentKey
  );
}

export async function wrapDocumentContentKeyForRecipient(input: {
  documentId: string;
  recipientId: string;
  recipientDeviceId: string;
  documentContentKey: Uint8Array;
  recipientWrappingKey: Uint8Array;
  createdAt?: string;
}): Promise<RecipientKeyPackage> {
  assertKeyLength(input.documentContentKey, 'Document content key');
  assertKeyLength(input.recipientWrappingKey, 'Recipient wrapping key');

  const wrappedKey = await EncryptionService.encrypt(
    input.documentContentKey,
    input.recipientWrappingKey
  );

  return {
    format: KEY_PACKAGE_FORMAT,
    version: KEY_PACKAGE_VERSION,
    documentId: input.documentId,
    recipientId: input.recipientId,
    recipientDeviceId: input.recipientDeviceId,
    wrappedKey,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export async function unwrapDocumentContentKeyForRecipient(
  keyPackage: RecipientKeyPackage,
  recipientWrappingKey: Uint8Array
): Promise<Uint8Array> {
  if (keyPackage.revokedAt) {
    throw new Error('Recipient key package has been revoked');
  }
  if (keyPackage.format !== KEY_PACKAGE_FORMAT || keyPackage.version !== KEY_PACKAGE_VERSION) {
    throw new Error('Unsupported recipient key package format');
  }
  assertKeyLength(recipientWrappingKey, 'Recipient wrapping key');

  const documentContentKey = await EncryptionService.decrypt(
    keyPackage.wrappedKey.ciphertext,
    keyPackage.wrappedKey.nonce,
    keyPackage.wrappedKey.authTag,
    recipientWrappingKey
  );
  assertKeyLength(documentContentKey, 'Unwrapped document content key');
  return documentContentKey;
}

export function revokeRecipientKeyPackage(
  keyPackage: RecipientKeyPackage,
  revokedAt = new Date().toISOString()
): RecipientKeyPackage {
  return { ...keyPackage, revokedAt };
}

export function activeRecipientKeyPackages(
  keyPackages: RecipientKeyPackage[],
  options: { recipientId?: string; recipientDeviceId?: string } = {}
): RecipientKeyPackage[] {
  return keyPackages.filter(keyPackage => {
    if (keyPackage.revokedAt) return false;
    if (options.recipientId && keyPackage.recipientId !== options.recipientId) return false;
    if (options.recipientDeviceId && keyPackage.recipientDeviceId !== options.recipientDeviceId) {
      return false;
    }
    return true;
  });
}

export function serializeRecipientKeyPackage(
  keyPackage: RecipientKeyPackage
): SerializableRecipientKeyPackage {
  return {
    ...keyPackage,
    wrappedKey: {
      ciphertext: bytesToBase64(keyPackage.wrappedKey.ciphertext),
      nonce: bytesToBase64(keyPackage.wrappedKey.nonce),
      authTag: bytesToBase64(keyPackage.wrappedKey.authTag),
    },
  };
}

export function deserializeRecipientKeyPackage(
  keyPackage: SerializableRecipientKeyPackage
): RecipientKeyPackage {
  if (keyPackage.format !== KEY_PACKAGE_FORMAT || keyPackage.version !== KEY_PACKAGE_VERSION) {
    throw new Error('Unsupported recipient key package format');
  }

  return {
    ...keyPackage,
    wrappedKey: {
      ciphertext: base64ToBytes(keyPackage.wrappedKey.ciphertext),
      nonce: base64ToBytes(keyPackage.wrappedKey.nonce),
      authTag: base64ToBytes(keyPackage.wrappedKey.authTag),
    },
  };
}
