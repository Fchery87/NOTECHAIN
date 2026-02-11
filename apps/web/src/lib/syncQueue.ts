// @ts-nocheck
import { SyncService } from '@notechain/sync-engine';
import type { SyncOperation } from '@notechain/sync-engine';

/**
 * SyncQueue manages offline-first data synchronization
 * Operations are queued when offline and processed when network is available
 */

export interface QueuedOperation extends SyncOperation {
  retryCount: number;
  nextRetryTime: number;
  createdAt: number;
}

const MAX_QUEUE_SIZE = 1000;
const MAX_RETRY_COUNT = 5;
const RETRY_DELAY_MS = 5000; // 5 seconds

class SyncQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private isOnline = true;
  private listeners: Set<() => void> = new Set();

  /**
   * Adds an operation to the sync queue
   * @param operation The sync operation to queue
   */
  async enqueue(operation: Omit<SyncOperation, 'id'>): Promise<void> {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: this.generateId(),
      retryCount: 0,
      nextRetryTime: 0,
      createdAt: Date.now(),
    };

    if (this.queue.length >= MAX_QUEUE_SIZE) {
      throw new Error('Sync queue full');
    }

    this.queue.push(queuedOp);
    await this.persistQueue();

    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Processes queued sync operations
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.notifyListeners();

    while (this.queue.length > 0 && this.isOnline) {
      const operation = this.queue[0];

      if (operation.nextRetryTime > Date.now()) {
        // This operation needs to wait for retry delay
        break;
      }

      try {
        await this.executeOperation(operation);

        // Remove from queue on success
        this.queue.shift();
        await this.persistQueue();

        // Reset retry count
        operation.retryCount = 0;
        operation.nextRetryTime = 0;
      } catch (error) {
        operation.retryCount++;

        if (operation.retryCount >= MAX_RETRY_COUNT) {
          // Max retries reached, remove from queue
          this.queue.shift();
          await this.persistQueue();
          console.error('Sync operation failed after max retries:', operation.id, error);
        } else {
          // Schedule retry with exponential backoff
          const delay = RETRY_DELAY_MS * Math.pow(2, operation.retryCount);
          operation.nextRetryTime = Date.now() + delay;

          // Move to end of queue for fairness
          this.queue.shift();
          this.queue.push(operation);
          await this.persistQueue();

          console.warn(`Sync operation failed, will retry in ${delay}ms:`, operation.id, error);
        }
      }
    }

    this.isProcessing = false;
    this.notifyListeners();
  }

  /**
   * Executes a single sync operation
   * @param operation The operation to execute
   */
  private async executeOperation(operation: QueuedOperation): Promise<void> {
    const syncService = new SyncService();

    switch (operation.type) {
      case 'upload':
        await syncService.uploadBlob(operation.blobId, operation.data);
        break;
      case 'download':
        await syncService.downloadBlob(operation.blobId);
        break;
      case 'delete':
        await syncService.deleteBlob(operation.blobId);
        break;
      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }

    // Log successful sync operation
    await this.logSyncSuccess(operation);
  }

  /**
   * Logs successful sync operation to database
   */
  private async logSyncSuccess(operation: QueuedOperation): Promise<void> {
    // Import dynamically to avoid circular dependency
    const { createSyncLog } = await import('../lib/db').then(m => m);
    await createSyncLog({
      operation: operation.type,
      blobId: operation.blobId,
      timestamp: Date.now(),
      success: true,
    });
  }

  /**
   * Marks connection as offline
   */
  setOffline(): void {
    this.isOnline = false;
    console.log('Network offline - operations will be queued');
  }

  /**
   * Marks connection as online and resumes processing
   */
  setOnline(): void {
    this.isOnline = true;
    console.log('Network online - resuming sync queue');
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Registers a listener for sync status changes
   * @param listener Function to call when sync status changes
   */
  addListener(listener: () => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifies all registered listeners of status changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Persists the current queue to IndexedDB
   */
  private async persistQueue(): Promise<void> {
    const { setItem } = await import('../lib/storage').then(m => m);
    await setItem('sync-queue', JSON.stringify(this.queue));
  }

  /**
   * Loads persisted queue from IndexedDB
   */
  async loadQueue(): Promise<void> {
    const { getItem } = await import('../lib/storage').then(m => m);
    const stored = await getItem('sync-queue');

    if (stored) {
      this.queue = JSON.parse(stored as string) as QueuedOperation[];
    }
  }

  /**
   * Gets current sync status
   */
  getStatus(): { isOnline: boolean; queueLength: number; isProcessing: boolean } {
    return {
      isOnline: this.isOnline,
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Clears all queued operations
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
  }

  /**
   * Generates a unique operation ID
   */
  private generateId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
const syncQueue = new SyncQueue();

// Initialize queue on startup
syncQueue.loadQueue().catch(error => {
  console.error('Failed to load sync queue:', error);
});

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => syncQueue.setOnline());
  window.addEventListener('offline', () => syncQueue.setOffline());

  // Set initial online status
  syncQueue.setOnline();
}

export { syncQueue };
