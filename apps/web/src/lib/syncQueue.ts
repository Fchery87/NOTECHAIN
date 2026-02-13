import {
  SyncService,
  type SyncOperation,
  type SyncRepositoryAdapter,
} from '@notechain/sync-engine';

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

/**
 * Sync log entry for database storage
 */
interface SyncLogEntry {
  operation: string;
  entityId: string;
  entityType: string;
  timestamp: number;
  success: boolean;
  errorMessage?: string;
}

class SyncQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private isOnline = true;
  private listeners: Set<() => void> = new Set();
  private syncService: SyncService | null = null;
  private userId: string | null = null;
  private sessionId: string | null = null;

  /**
   * Initialize the sync queue with user context
   */
  initialize(userId: string, sessionId: string, repository?: SyncRepositoryAdapter): void {
    this.userId = userId;
    this.sessionId = sessionId;
    this.syncService = new SyncService(userId, sessionId, repository ?? null);

    // Set up network listeners
    this.syncService.setupNetworkListeners();

    // Set up real-time subscription if repository exists
    if (repository) {
      this.syncService.setupRealtimeSubscription();
    }
  }

  /**
   * Adds an operation to the sync queue
   * @param operation The sync operation to queue
   */
  async enqueue(operation: Omit<SyncOperation, 'id' | 'timestamp'>): Promise<void> {
    if (!this.userId || !this.sessionId) {
      throw new Error('SyncQueue not initialized. Call initialize() first.');
    }

    const queuedOp: QueuedOperation = {
      ...operation,
      id: this.generateId(),
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
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
    if (this.isProcessing || this.queue.length === 0 || !this.syncService) {
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
        // Use the sync service to process the operation
        await this.syncService.enqueueOperation({
          userId: operation.userId,
          sessionId: operation.sessionId,
          operationType: operation.operationType,
          entityType: operation.entityType,
          entityId: operation.entityId,
          encryptedPayload: operation.encryptedPayload,
          version: operation.version,
        });

        // Remove from queue on success
        this.queue.shift();
        await this.persistQueue();

        // Log success
        await this.logSyncSuccess(operation);

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

          // Log failure
          await this.logSyncFailure(operation, error);
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
   * Logs successful sync operation to database
   */
  private async logSyncSuccess(operation: QueuedOperation): Promise<void> {
    try {
      const logEntry: SyncLogEntry = {
        operation: operation.operationType,
        entityId: operation.entityId,
        entityType: operation.entityType,
        timestamp: Date.now(),
        success: true,
      };

      // Store in local storage for now
      const logs = this.getStoredLogs();
      logs.push(logEntry);
      this.storeLogs(logs);
    } catch (error) {
      console.error('Failed to log sync success:', error);
    }
  }

  /**
   * Logs failed sync operation
   */
  private async logSyncFailure(operation: QueuedOperation, error: unknown): Promise<void> {
    try {
      const logEntry: SyncLogEntry = {
        operation: operation.operationType,
        entityId: operation.entityId,
        entityType: operation.entityType,
        timestamp: Date.now(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };

      const logs = this.getStoredLogs();
      logs.push(logEntry);
      this.storeLogs(logs);
    } catch (err) {
      console.error('Failed to log sync failure:', err);
    }
  }

  /**
   * Get stored logs from local storage
   */
  private getStoredLogs(): SyncLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('sync-logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Store logs in local storage
   */
  private storeLogs(logs: SyncLogEntry[]): void {
    if (typeof window === 'undefined') return;
    try {
      // Keep only last 100 logs
      const trimmedLogs = logs.slice(-100);
      localStorage.setItem('sync-logs', JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('Failed to store logs:', error);
    }
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
   * Persists the current queue to storage
   */
  private async persistQueue(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('sync-queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist sync queue:', error);
    }
  }

  /**
   * Loads persisted queue from storage
   */
  async loadQueue(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('sync-queue');
      if (stored) {
        this.queue = JSON.parse(stored) as QueuedOperation[];
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
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
    return `op-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.syncService) {
      this.syncService.destroy();
    }
    this.listeners.clear();
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
