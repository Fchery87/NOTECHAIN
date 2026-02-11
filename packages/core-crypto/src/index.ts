// packages/core-crypto/src/index.ts
import { EncryptionService, encryptData, decryptData, type EncryptedData } from './encryption';
import { KeyManager } from './keyManagement';
import {
  StorageAdapter,
  BrowserStorageAdapter,
  MemoryStorageAdapter,
  detectStorage,
  defaultStorage,
} from './storage';

export { EncryptionService, KeyManager, encryptData, decryptData };
export type { EncryptedData };

// Storage exports
export {
  StorageAdapter,
  BrowserStorageAdapter,
  MemoryStorageAdapter,
  detectStorage,
  defaultStorage,
};
