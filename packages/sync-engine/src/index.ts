export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface ConflictResolution {
  strategy: 'server-wins' | 'client-wins' | 'manual';
  resolvedData?: unknown;
}

export interface SyncState {
  lastSyncVersion: number;
  pendingChanges: number;
  isOnline: boolean;
  isSyncing: boolean;
}

export declare function initializeSync(userId: string): Promise<void>;
export declare function queueOperation(item: SyncQueueItem): Promise<void>;
export declare function processSyncQueue(): Promise<ConflictResolution[]>;
export declare function pullChanges(sinceVersion: number): Promise<unknown[]>;
export declare function pushChanges(): Promise<void>;
export declare function getSyncState(): SyncState;
export declare function subscribeToChanges(callback: (changes: unknown[]) => void): void;
