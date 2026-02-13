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

// Multi-user CRDT exports
export { VectorClock, OperationTransformer, MultiUserCRDT } from './crdt';
export type {
  CRDTOperation,
  VectorClockMap,
  DocumentState,
  CursorPosition,
  SyncMessage,
  Conflict,
  CRDTEventMap,
  CRDTOptions,
  VectorClockComparison,
  TransformResult,
} from './crdt/types';
export { CRDTOperationType } from './crdt/types';

// Server exports
export { WebSocketServer } from './server/WebSocketServer';
export { ConnectionManager } from './server/ConnectionManager';
export type {
  UserConnection,
  DocumentRoom,
  BaseMessage,
  JoinDocumentMessage,
  LeaveDocumentMessage,
  OperationMessage,
  CursorPositionMessage,
  SelectionMessage,
  PresenceMessage,
  SyncRequestMessage,
  SyncResponseMessage,
  CollaborationMessage,
} from './server/types';
export { MessageType } from './server/types';
