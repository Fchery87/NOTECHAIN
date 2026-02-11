// packages/sync-engine/src/index.ts
export { LWWElementSet } from './crdt';
export { SyncService } from './syncService';
export type { SyncOperation, SyncStatus, SyncRepositoryAdapter } from './syncService';

// Platform adapter exports
export {
  PlatformAdapter,
  BrowserPlatformAdapter,
  NodePlatformAdapter,
  TestPlatformAdapter,
  detectPlatform,
  defaultPlatform,
} from './platform';
export type { NetworkStatus } from './platform';

// Sync queue exports
export { SyncQueue } from './queue/sync-queue';
export type {
  SyncQueueConfig,
  SendOperationCallback,
  PersistQueueCallback,
} from './queue/sync-queue';

// Enhanced CRDT exports
export type { LWWEntry } from './crdt/lww-element-set';
