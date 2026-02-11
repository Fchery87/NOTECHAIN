// packages/sync-engine/src/queue/sync-queue.ts

/**
 * Represents a single sync operation in the queue
 */
export interface SyncOperation {
  /** Unique identifier for this operation */
  id: string;
  /** Type of operation: 'create', 'update', or 'delete' */
  type: 'create' | 'update' | 'delete';
  /** ID of the blob being synced */
  blobId: string;
  /** Operation data payload */
  data: Record<string, unknown>;
  /** Unix timestamp in milliseconds when operation was created */
  timestamp: number;
  /** Number of retry attempts made */
  retryCount: number;
}

/**
 * Configuration options for SyncQueue
 */
export interface SyncQueueConfig {
  /** Maximum number of operations in queue (default: 1000) */
  maxSize?: number;
  /** Maximum number of retry attempts (default: 5) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 5000) */
  baseDelayMs?: number;
}

/**
 * Callback type for sending operations to server
 */
export type SendOperationCallback = (operation: SyncOperation) => Promise<boolean>;

/**
 * Callback type for persisting queue to storage
 */
export type PersistQueueCallback = (queue: SyncOperation[]) => Promise<void>;

/**
 * SyncQueue manages pending sync operations with retry logic
 *
 * Features:
 * - Enqueue operations with automatic persistence
 * - Exponential backoff retry logic
 * - Max retry handling (moves to end of queue after max retries)
 * - Queue size limiting
 * - Async processing
 */
export class SyncQueue {
  private queue: SyncOperation[] = [];
  private processing: boolean = false;
  private readonly maxSize: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private sendCallback?: SendOperationCallback;
  private persistCallback?: PersistQueueCallback;

  constructor(config: SyncQueueConfig = {}) {
    this.maxSize = config.maxSize ?? 1000;
    this.maxRetries = config.maxRetries ?? 5;
    this.baseDelayMs = config.baseDelayMs ?? 5000;
  }

  /**
   * Sets the callback for sending operations to the server
   */
  setSendCallback(callback: SendOperationCallback): void {
    this.sendCallback = callback;
  }

  /**
   * Sets the callback for persisting the queue to storage
   */
  setPersistCallback(callback: PersistQueueCallback): void {
    this.persistCallback = callback;
  }

  /**
   * Gets the current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Checks if the queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Gets all operations in the queue (for debugging/inspection)
   */
  getQueue(): ReadonlyArray<SyncOperation> {
    return [...this.queue];
  }

  /**
   * Clears all operations from the queue
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Adds an operation to the queue and triggers processing
   * @param operation The sync operation to enqueue
   * @throws Error if queue is at max capacity
   */
  async enqueue(operation: SyncOperation): Promise<void> {
    if (this.queue.length >= this.maxSize) {
      throw new Error(`Sync queue is at maximum capacity (${this.maxSize})`);
    }

    this.queue.push(operation);
    await this.persistQueue();

    // Trigger queue processing (don't await to avoid blocking)
    this.processQueue().catch(error => {
      console.error('Error processing sync queue:', error);
    });
  }

  /**
   * Processes operations in the queue
   * Handles retry logic with exponential backoff
   */
  private async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const operation = this.queue[0];

        try {
          const success = await this.sendOperation(operation);

          if (success) {
            // Remove from queue on success
            this.queue.shift();
            await this.persistQueue();
          } else {
            // Handle failure
            await this.handleOperationFailure(operation);
          }
        } catch (error) {
          console.error(`Error sending operation ${operation.id}:`, error);
          await this.handleOperationFailure(operation);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Handles a failed operation - implements retry logic
   */
  private async handleOperationFailure(operation: SyncOperation): Promise<void> {
    operation.retryCount++;

    if (operation.retryCount >= this.maxRetries) {
      // Max retries reached - move to end of queue
      this.queue.shift();

      // Reset retry count when moving to end
      operation.retryCount = 0;
      this.queue.push(operation);

      console.warn(`Operation ${operation.id} exceeded max retries, moved to end of queue`);
    } else {
      // Calculate exponential backoff delay
      const delayMs = this.calculateBackoffDelay(operation.retryCount);

      // Move to end of queue with delay
      this.queue.shift();
      this.queue.push(operation);

      // Wait before continuing
      await this.delay(delayMs);
    }

    await this.persistQueue();
  }

  /**
   * Calculates exponential backoff delay
   * Formula: delayMs = baseDelayMs * 2^retryCount
   */
  private calculateBackoffDelay(retryCount: number): number {
    return this.baseDelayMs * Math.pow(2, retryCount);
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sends an operation to the server
   * Placeholder method that can be overridden or use callback
   * @param operation The operation to send
   * @returns true if successful, false otherwise
   */
  private async sendOperation(operation: SyncOperation): Promise<boolean> {
    if (this.sendCallback) {
      return await this.sendCallback(operation);
    }

    // Default implementation - just log and return true
    console.log('Sending operation:', operation);
    return true;
  }

  /**
   * Persists the queue to storage
   * Placeholder method that can be overridden or use callback
   */
  private async persistQueue(): Promise<void> {
    if (this.persistCallback) {
      await this.persistCallback(this.queue);
    }

    // Default: no-op (data stays in memory)
  }

  /**
   * Manually triggers queue processing
   * Useful for resuming after app startup
   */
  async startProcessing(): Promise<void> {
    await this.processQueue();
  }

  /**
   * Loads a queue from persisted data
   * @param operations Array of operations to load
   */
  loadQueue(operations: SyncOperation[]): void {
    this.queue = [...operations];
  }
}
