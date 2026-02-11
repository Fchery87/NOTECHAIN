import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { syncQueue } from '../syncQueue';

describe('Sync Queue', () => {
  beforeEach(() => {
    // Clear queue before each test
    syncQueue.clearQueue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Queue Operations', () => {
    it('should add operation to queue', async () => {
      await syncQueue.enqueue({
        type: 'upload',
        blobId: 'blob-1',
        data: new Uint8Array([1, 2, 3]),
      });

      const status = syncQueue.getStatus();
      expect(status.queueLength).toBe(1);
    });

    it('should process queued operations when online', async () => {
      let uploadCalled = false;

      // Mock sync service
      jest.mock('@notechain/sync-engine', () => ({
        SyncService: class {
          async uploadBlob() {
            uploadCalled = true;
          }
        },
      }));

      await syncQueue.enqueue({
        type: 'upload',
        blobId: 'blob-1',
        data: new Uint8Array([1, 2, 3]),
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(uploadCalled).toBe(true);
      expect(syncQueue.getStatus().queueLength).toBe(0);
    });

    it('should retry failed operations', async () => {
      let attemptCount = 0;

      jest.mock('@notechain/sync-engine', () => ({
        SyncService: class {
          async uploadBlob() {
            attemptCount++;
            if (attemptCount < 3) {
              throw new Error('Network error');
            }
          }
        },
      }));

      await syncQueue.enqueue({
        type: 'upload',
        blobId: 'blob-1',
        data: new Uint8Array([1, 2, 3]),
      });

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 5000));

      expect(attemptCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Online/Offline State', () => {
    it('should mark as offline and stop processing', async () => {
      syncQueue.setOffline();

      await syncQueue.enqueue({
        type: 'upload',
        blobId: 'blob-1',
        data: new Uint8Array([1, 2, 3]),
      });

      const status = syncQueue.getStatus();
      expect(status.isOnline).toBe(false);
      expect(status.queueLength).toBe(1);
    });

    it('should resume processing when online', async () => {
      syncQueue.setOffline();

      await syncQueue.enqueue({
        type: 'upload',
        blobId: 'blob-1',
        data: new Uint8Array([1, 2, 3]),
      });

      syncQueue.setOnline();

      await new Promise(resolve => setTimeout(resolve, 100));

      const status = syncQueue.getStatus();
      expect(status.isOnline).toBe(true);
    });
  });

  describe('Queue Limits', () => {
    it('should reject operations when queue is full', async () => {
      // Fill queue to max (1000)
      for (let i = 0; i < 1000; i++) {
        await syncQueue.enqueue({
          type: 'upload',
          blobId: `blob-${i}`,
          data: new Uint8Array([i]),
        });
      }

      await expect(
        syncQueue.enqueue({
          type: 'upload',
          blobId: 'blob-1001',
          data: new Uint8Array([1001]),
        })
      ).rejects.toThrow('Sync queue full');
    });
  });
});
