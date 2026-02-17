// packages/sync-engine/src/syncService.ts
import { v4 as uuidv4 } from 'uuid';

import { EventEmitter } from 'eventemitter3';
import { PlatformAdapter, defaultPlatform } from './platform';

export interface SyncOperation {
  id: string;
  userId: string;
  sessionId: string;
  operationType: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  encryptedPayload: string;
  timestamp: number;
  version: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  syncErrors: number;
  lastSyncVersion: number;
}

export interface SyncRepositoryAdapter {
  pushOperations(
    operations: SyncOperation[]
  ): Promise<Array<{ operationId: string; success: boolean; error?: string }>>;
  pullChanges(userId: string, sinceVersion: number, limit?: number): Promise<SyncOperation[]>;
  getLatestVersion(userId: string): Promise<number>;
  getSyncMetadata(userId: string): Promise<{ last_sync_version: number } | null>;
  upsertSyncMetadata(userId: string, status: string, lastSyncVersion?: number): Promise<void>;
  subscribeToChanges(userId: string, onChange: (operation: SyncOperation) => void): () => void;
}

export class SyncService extends EventEmitter {
  private userId: string;
  private sessionId: string;
  private syncQueue: SyncOperation[];
  private repository: SyncRepositoryAdapter | null;
  private isSyncing: boolean;
  private status: SyncStatus;
  private conflictResolver: (local: any, remote: any) => any;
  private platform: PlatformAdapter;
  private unsubscribeNetwork?: () => void;
  private unsubscribeRealtime?: () => void;

  constructor(
    userId: string,
    sessionId: string,
    repository?: SyncRepositoryAdapter | null,
    conflictResolver?: (local: any, remote: any) => any,
    platform?: PlatformAdapter
  ) {
    super();
    this.userId = userId;
    this.sessionId = sessionId;
    this.syncQueue = [];
    this.repository = repository ?? null;
    this.isSyncing = false;
    this.platform = platform ?? defaultPlatform;
    this.status = {
      isSyncing: false,
      lastSyncTime: null,
      pendingOperations: 0,
      syncErrors: 0,
      lastSyncVersion: 0,
    };
    this.conflictResolver = conflictResolver || (local => local);
  }

  /**
   * Adds an operation to the sync queue
   */
  async enqueueOperation(
    operation: Omit<SyncOperation, 'id' | 'timestamp' | 'userId' | 'sessionId'>
  ): Promise<void> {
    const syncOp: SyncOperation = {
      ...operation,
      id: uuidv4(),
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      version: operation.version || 1,
    };

    this.syncQueue.push(syncOp);
    this.updateStatus();

    // Emit event for UI updates
    this.emit('operationQueued', syncOp);

    // Trigger sync if connection is available
    if (this.platform.getNetworkStatus().isOnline) {
      await this.performSync();
    }
  }

  /**
   * Performs the actual sync operation
   */
  async performSync(): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.updateStatus();

    try {
      // Load last sync version from metadata
      if (this.repository && this.status.lastSyncVersion === 0) {
        const metadata = await this.repository.getSyncMetadata(this.userId);
        if (metadata) {
          this.status.lastSyncVersion = metadata.last_sync_version;
        }
      }

      // Pull remote changes first
      await this.pullRemoteChanges();

      // Process local operations in batches
      if (this.syncQueue.length > 0) {
        const batchSize = 10;
        const operationsToSync = this.syncQueue.splice(0, batchSize);

        // Send operations to server
        const results = await this.sendOperationsToServer(operationsToSync);

        // Handle results
        for (const result of results) {
          if (result.success) {
            this.emit('operationSynced', result.operationId);
          } else {
            // Put failed operations back in queue
            const failedOp = operationsToSync.find(op => op.id === result.operationId);
            if (failedOp) {
              this.syncQueue.unshift(failedOp);
            }
            this.status.syncErrors++;
          }
        }

        // Update sync metadata
        if (this.repository) {
          const latestVersion = await this.repository.getLatestVersion(this.userId);
          this.status.lastSyncVersion = latestVersion;
          await this.repository.upsertSyncMetadata(this.userId, 'idle', latestVersion);
        }
      }

      this.status.lastSyncTime = new Date();
    } catch (error) {
      console.error('Sync error:', error);
      this.status.syncErrors++;
    } finally {
      this.isSyncing = false;
      this.updateStatus();
      this.emit('syncComplete');
    }
  }

  /**
   * Sends operations to the server
   */
  private async sendOperationsToServer(
    operations: SyncOperation[]
  ): Promise<Array<{ operationId: string; success: boolean }>> {
    if (!this.repository) {
      // Mock mode for testing - simulate success
      await new Promise(resolve => setTimeout(resolve, 100));
      return operations.map(op => ({
        operationId: op.id,
        success: true,
      }));
    }

    const results = await this.repository.pushOperations(operations);
    return results.map(r => ({
      operationId: r.operationId,
      success: r.success,
    }));
  }

  /**
   * Pulls remote changes from the server
   */
  private async pullRemoteChanges(): Promise<void> {
    if (!this.repository) {
      return; // No repository, skip pulling
    }

    try {
      const remoteOperations = await this.repository.pullChanges(
        this.userId,
        this.status.lastSyncVersion
      );

      // Apply remote operations locally
      for (const op of remoteOperations) {
        await this.applyRemoteOperation(op);
      }

      // Update last sync version
      if (remoteOperations.length > 0) {
        const latestVersion = Math.max(...remoteOperations.map(op => op.version));
        this.status.lastSyncVersion = latestVersion;
        await this.repository.upsertSyncMetadata(this.userId, 'idle', latestVersion);
      }
    } catch (error) {
      console.error('Error pulling remote changes:', error);
      this.status.syncErrors++;
    }
  }

  /**
   * Fetches remote operations from the server
   */
  private async fetchRemoteOperations(): Promise<SyncOperation[]> {
    if (!this.repository) {
      return [];
    }

    return this.repository.pullChanges(this.userId, this.status.lastSyncVersion);
  }

  /**
   * Applies a remote operation locally
   */
  private async applyRemoteOperation(operation: SyncOperation): Promise<void> {
    // In a real implementation, this would decrypt the payload,
    // apply the operation to local storage, and handle conflicts
    this.emit('remoteOperationApplied', operation);
  }

  /**
   * Gets the current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Updates the sync status
   */
  private updateStatus(): void {
    this.status.isSyncing = this.isSyncing;
    this.status.pendingOperations = this.syncQueue.length;
    this.emit('statusChanged', this.getStatus());
  }

  /**
   * Handles offline/online events
   */
  setupNetworkListeners(): void {
    // Clean up any existing subscription
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
    }

    this.unsubscribeNetwork = this.platform.subscribeToNetworkChanges(isOnline => {
      if (isOnline) {
        // Automatically sync when connection is restored
        this.performSync().catch(console.error);
      }
    });
  }

  /**
   * Sets up real-time subscription for remote changes
   */
  setupRealtimeSubscription(): void {
    if (!this.repository) {
      return;
    }

    // Clean up any existing subscription
    if (this.unsubscribeRealtime) {
      this.unsubscribeRealtime();
    }

    this.unsubscribeRealtime = this.repository.subscribeToChanges(this.userId, operation => {
      // Emit the remote operation for handling
      this.emit('remoteOperationReceived', operation);
      // Auto-apply the remote operation
      this.applyRemoteOperation(operation).catch(console.error);
    });
  }

  /**
   * Cleanup network listeners and resources
   */
  destroy(): void {
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
      this.unsubscribeNetwork = undefined;
    }
    if (this.unsubscribeRealtime) {
      this.unsubscribeRealtime();
      this.unsubscribeRealtime = undefined;
    }
    this.removeAllListeners();
  }

  /**
   * Manually triggers a sync
   */
  async syncNow(): Promise<void> {
    await this.performSync();
  }

  /**
   * Gets the current sync version
   */
  getLastSyncVersion(): number {
    return this.status.lastSyncVersion;
  }

  /**
   * Initializes sync state from server
   */
  async initialize(): Promise<void> {
    if (!this.repository) {
      return;
    }

    // Load sync metadata
    const metadata = await this.repository.getSyncMetadata(this.userId);
    if (metadata) {
      this.status.lastSyncVersion = metadata.last_sync_version;
    }

    // Set up real-time subscription
    this.setupRealtimeSubscription();

    // Perform initial sync
    await this.performSync();
  }
}
