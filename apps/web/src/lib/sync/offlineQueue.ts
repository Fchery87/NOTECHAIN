// apps/web/src/lib/sync/offlineQueue.ts
import Dexie from 'dexie';
import type { SyncOperation } from '@notechain/sync-engine';

/**
 * Offline queue database schema
 */
interface QueuedOperation {
  id: string;
  operation: SyncOperation;
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * IndexedDB database for offline queue persistence
 */
class OfflineQueueDB extends Dexie {
  operations!: Dexie.Table<QueuedOperation, string>;

  constructor() {
    super('NoteChainSyncQueue');
    this.version(1).stores({
      operations: 'id, createdAt, updatedAt',
    });
  }
}

const db = new OfflineQueueDB();

/**
 * Offline queue manager
 * Persists sync operations to IndexedDB for offline support
 */
export class OfflineQueue {
  private maxRetries = 5;
  private baseDelayMs = 1000;

  /**
   * Add an operation to the queue
   */
  async enqueue(operation: SyncOperation): Promise<void> {
    await db.operations.put({
      id: operation.id,
      operation,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Get all pending operations
   */
  async getPending(): Promise<QueuedOperation[]> {
    return await db.operations.toArray();
  }

  /**
   * Get operations ready for retry
   * (retry count < max and not recently failed)
   */
  async getRetryable(): Promise<QueuedOperation[]> {
    const all = await this.getPending();
    const now = Date.now();

    return all.filter(op => {
      if (op.retryCount >= this.maxRetries) return false;

      // Calculate exponential backoff delay
      const delay = this.baseDelayMs * Math.pow(2, op.retryCount);
      const nextRetryTime = op.updatedAt.getTime() + delay;

      return now >= nextRetryTime;
    });
  }

  /**
   * Mark an operation as successfully synced
   */
  async remove(id: string): Promise<void> {
    await db.operations.delete(id);
  }

  /**
   * Mark an operation as failed and increment retry count
   */
  async markFailed(id: string, error: string): Promise<void> {
    const operation = await db.operations.get(id);
    if (operation) {
      await db.operations.update(id, {
        retryCount: operation.retryCount + 1,
        lastError: error,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Clear all operations (e.g., after successful bulk sync)
   */
  async clear(): Promise<void> {
    await db.operations.clear();
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number;
    retryable: number;
    failed: number;
    maxRetriesReached: number;
  }> {
    const all = await this.getPending();
    const retryable = await this.getRetryable();

    return {
      total: all.length,
      retryable: retryable.length,
      failed: all.filter(op => op.lastError).length,
      maxRetriesReached: all.filter(op => op.retryCount >= this.maxRetries).length,
    };
  }

  /**
   * Get failed operations for display
   */
  async getFailed(): Promise<QueuedOperation[]> {
    const all = await this.getPending();
    return all.filter(op => op.lastError && op.retryCount < this.maxRetries);
  }

  /**
   * Get permanently failed operations (max retries reached)
   */
  async getPermanentlyFailed(): Promise<QueuedOperation[]> {
    const all = await this.getPending();
    return all.filter(op => op.retryCount >= this.maxRetries);
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();
