// packages/core-crypto/src/index.ts
import {
  EncryptionService,
  encryptData,
  decryptData,
  type EncryptedData,
  PBKDF2_CONFIG,
} from './encryption';
import { KeyManager } from './keyManagement';
import { encodeRecoveryKey, decodeRecoveryKey, isValidRecoveryKey } from './recoveryKey';
import {
  activeRecipientKeyPackages,
  decryptDocumentPayload,
  deserializeRecipientKeyPackage,
  DOCUMENT_CONTENT_KEY_BYTES,
  encryptDocumentPayload,
  generateDocumentContentKey,
  KEY_PACKAGE_FORMAT,
  KEY_PACKAGE_VERSION,
  revokeRecipientKeyPackage,
  serializeRecipientKeyPackage,
  unwrapDocumentContentKeyForRecipient,
  wrapDocumentContentKeyForRecipient,
} from './documentSharing';
import type {
  EncryptedDocumentPayload,
  RecipientKeyPackage,
  SerializableRecipientKeyPackage,
} from './documentSharing';
import {
  BrowserStorageAdapter,
  MemoryStorageAdapter,
  detectStorage,
  defaultStorage,
} from './storage';
import type { StorageAdapter } from './storage';
import {
  SecureIndexedDBStorage,
  SecureMemoryStorage,
  SecureStorageDecryptionError,
  detectSecureStorage,
  defaultSecureStorage,
} from './secureStorage';
import type { SecureStorageAdapter } from './secureStorage';

export {
  EncryptionService,
  KeyManager,
  encryptData,
  decryptData,
  PBKDF2_CONFIG,
  encodeRecoveryKey,
  decodeRecoveryKey,
  isValidRecoveryKey,
  activeRecipientKeyPackages,
  decryptDocumentPayload,
  deserializeRecipientKeyPackage,
  DOCUMENT_CONTENT_KEY_BYTES,
  encryptDocumentPayload,
  generateDocumentContentKey,
  KEY_PACKAGE_FORMAT,
  KEY_PACKAGE_VERSION,
  revokeRecipientKeyPackage,
  serializeRecipientKeyPackage,
  unwrapDocumentContentKeyForRecipient,
  wrapDocumentContentKeyForRecipient,
};
export type {
  EncryptedData,
  EncryptedDocumentPayload,
  RecipientKeyPackage,
  SerializableRecipientKeyPackage,
};

// Storage exports
export { BrowserStorageAdapter, MemoryStorageAdapter, detectStorage, defaultStorage };
export type { StorageAdapter };

// Secure storage exports
export {
  SecureIndexedDBStorage,
  SecureMemoryStorage,
  SecureStorageDecryptionError,
  detectSecureStorage,
  defaultSecureStorage,
};
export type { SecureStorageAdapter };
