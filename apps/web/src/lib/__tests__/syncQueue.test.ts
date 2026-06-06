import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { syncQueue } from '../syncQueue';

const createOperation = (i = 1) => ({
  operationType: 'create' as const,
  entityType: 'note',
  entityId: `note-${i}`,
  encryptedPayload: `encrypted-payload-${i}`,
  userId: 'test-user',
  sessionId: 'test-session',
  version: 1,
});

const waitForQueueTick = () => new Promise(resolve => setTimeout(resolve, 25));

const waitForQueueLength = async (expectedLength: number) => {
  for (let i = 0; i < 20; i++) {
    if (syncQueue.getStatus().queueLength === expectedLength) return;
    await waitForQueueTick();
  }
};

describe('Sync Queue', () => {
  beforeEach(async () => {
    localStorage.clear();
    syncQueue.destroy();
    syncQueue.initialize('test-user', 'test-session');
    syncQueue.setOffline();
    await syncQueue.clearQueue();
  });

  afterEach(async () => {
    await syncQueue.clearQueue();
    syncQueue.destroy();
  });

  describe('Queue Operations', () => {
    test('should add operation to queue while offline', async () => {
      await syncQueue.enqueue(createOperation());

      const status = syncQueue.getStatus();
      expect(status.queueLength).toBe(1);
    });

    test('should process queued operations when online', async () => {
      await syncQueue.enqueue(createOperation());
      expect(syncQueue.getStatus().queueLength).toBe(1);

      syncQueue.setOnline();
      await waitForQueueLength(0);

      expect(syncQueue.getStatus().queueLength).toBe(0);
    });

    test('should accept repository-backed operations for processing', async () => {
      const repository = {
        pushOperations: async (operations: Array<{ id: string }>) =>
          operations.map(operation => ({ operationId: operation.id, success: true })),
        pullChanges: async () => [],
        getLatestVersion: async () => 0,
        getSyncMetadata: async () => null,
        upsertSyncMetadata: async () => {},
        subscribeToChanges: () => () => {},
      };

      syncQueue.destroy();
      syncQueue.initialize('test-user', 'test-session', repository);
      syncQueue.setOnline();
      await syncQueue.clearQueue();

      await syncQueue.enqueue(createOperation());
      await waitForQueueLength(0);

      expect(syncQueue.getStatus().queueLength).toBe(0);
    });
  });

  describe('Online/Offline State', () => {
    test('should mark as offline and stop processing', async () => {
      syncQueue.setOffline();

      await syncQueue.enqueue(createOperation());

      const status = syncQueue.getStatus();
      expect(status.isOnline).toBe(false);
      expect(status.queueLength).toBe(1);
    });

    test('should resume processing when online', async () => {
      syncQueue.setOffline();

      await syncQueue.enqueue(createOperation());
      expect(syncQueue.getStatus().queueLength).toBe(1);

      syncQueue.setOnline();
      await waitForQueueLength(0);

      const status = syncQueue.getStatus();
      expect(status.isOnline).toBe(true);
      expect(status.queueLength).toBe(0);
    });
  });

  describe('Queue Limits', () => {
    test('should handle multiple queued operations', async () => {
      for (let i = 0; i < 10; i++) {
        await syncQueue.enqueue(createOperation(i));
      }

      const status = syncQueue.getStatus();
      expect(status.queueLength).toBe(10);
    });
  });
});
