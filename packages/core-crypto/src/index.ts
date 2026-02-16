// packages/core-crypto/src/index.ts
import {
  EncryptionService,
  encryptData,
  decryptData,
  type EncryptedData,
  PBKDF2_CONFIG,
} from './encryption';
import { KeyManager } from './keyManagement';
import {
  StorageAdapter,
  BrowserStorageAdapter,
  MemoryStorageAdapter,
  detectStorage,
  defaultStorage,
} from './storage';
import {
  SecureStorageAdapter,
  SecureIndexedDBStorage,
  SecureMemoryStorage,
  detectSecureStorage,
  defaultSecureStorage,
} from './secureStorage';

export { EncryptionService, KeyManager, encryptData, decryptData, PBKDF2_CONFIG };
export type { EncryptedData };

// Storage exports
export {
  StorageAdapter,
  BrowserStorageAdapter,
  MemoryStorageAdapter,
  detectStorage,
  defaultStorage,
};

// Secure storage exports
export {
  SecureStorageAdapter,
  SecureIndexedDBStorage,
  SecureMemoryStorage,
  detectSecureStorage,
  defaultSecureStorage,
};
