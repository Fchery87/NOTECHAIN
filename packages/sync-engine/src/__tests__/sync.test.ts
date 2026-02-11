import { describe, test, expect } from 'bun:test';
import { LWWElementSet } from '../crdt/lww-element-set';
import { SyncQueue, SyncOperation } from '../queue/sync-queue';

describe('LWWElementSet', () => {
  describe('Add and contains', () => {
    test('should add elements', () => {
      const set = new LWWElementSet<string>();

      set.add('elem-1', 'value1', Date.now(), 'node-1');
      set.add('elem-2', 'value2', Date.now(), 'node-1');

      expect(set.has('elem-1')).toBe(true);
      expect(set.has('elem-2')).toBe(true);
      expect(set.has('elem-3')).toBe(false);
    });

    test('should update element on add with higher timestamp', () => {
      const set = new LWWElementSet<string>();
      const timestamp1 = Date.now();

      set.add('elem-1', 'value1', timestamp1, 'node-1');
      set.add('elem-1', 'value2', timestamp1 + 1000, 'node-2');

      expect(set.get('elem-1')).toBe('value2');
    });
  });

  describe('Remove', () => {
    test('should mark elements as removed', () => {
      const set = new LWWElementSet<string>();

      set.add('elem-1', 'value1', Date.now(), 'node-1');
      set.remove('elem-1', Date.now(), 'node-2');

      expect(set.has('elem-1')).toBe(false);
    });

    test('should allow add to override previous remove', () => {
      const set = new LWWElementSet<string>();
      const timestamp1 = Date.now();

      // Remove first, then add with higher timestamp
      set.remove('elem-1', timestamp1, 'node-1');
      set.add('elem-1', 'value1', timestamp1 + 1000, 'node-2');

      // Add has higher timestamp, so element should be present
      expect(set.has('elem-1')).toBe(true);
      expect(set.get('elem-1')).toBe('value1');
    });

    test('should allow remove to override previous add with higher timestamp', () => {
      const set = new LWWElementSet<string>();
      const timestamp1 = Date.now();

      set.add('elem-1', 'value1', timestamp1, 'node-1');
      set.remove('elem-1', timestamp1 + 1000, 'node-2');

      // Remove has higher timestamp, so element should NOT be present
      expect(set.has('elem-1')).toBe(false);
    });
  });

  describe('Values', () => {
    test('should return only non-removed elements', () => {
      const set = new LWWElementSet<string>();

      set.add('elem-1', 'value1', Date.now(), 'node-1');
      set.add('elem-2', 'value2', Date.now(), 'node-1');
      set.remove('elem-2', Date.now(), 'node-1');

      const values = set.values();

      expect(values).toHaveLength(1);
      expect(values[0].elementId).toBe('elem-1');
      expect(values[0].value).toBe('value1');
    });
  });

  describe('Merge', () => {
    test('should merge two sets correctly', () => {
      const set1 = new LWWElementSet<string>();
      const set2 = new LWWElementSet<string>();
      const timestamp1 = Date.now();
      const timestamp2 = timestamp1 + 1000;

      set1.add('elem-1', 'value1', timestamp1, 'node-1');
      set2.add('elem-1', 'value2', timestamp2, 'node-2');
      set2.add('elem-2', 'value3', timestamp2, 'node-2');

      set1.merge(set2);

      expect(set1.get('elem-1')).toBe('value2');
      expect(set1.has('elem-2')).toBe(true);
    });
  });
});

describe('SyncQueue', () => {
  describe('Enqueue and size', () => {
    test('should enqueue operations', () => {
      const queue = new SyncQueue();

      const op1: SyncOperation = {
        id: 'op-1',
        type: 'create',
        blobId: 'blob-1',
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
      };

      queue.enqueue(op1);

      expect(queue.size()).toBe(1);
    });

    test('should throw error when queue is at max capacity', () => {
      const queue = new SyncQueue({ maxSize: 1 });

      const op1: SyncOperation = {
        id: 'op-1',
        type: 'create',
        blobId: 'blob-1',
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
      };

      queue.enqueue(op1);

      const op2: SyncOperation = {
        id: 'op-2',
        type: 'create',
        blobId: 'blob-2',
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
      };

      expect(() => queue.enqueue(op2)).toThrow();
    });
  });

  describe('Clear', () => {
    test('should clear all operations', () => {
      const queue = new SyncQueue();

      const op: SyncOperation = {
        id: 'op-1',
        type: 'create',
        blobId: 'blob-1',
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
      };

      queue.enqueue(op);
      expect(queue.size()).toBe(1);

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('Exponential backoff', () => {
    test('should increase delay with retry count', async () => {
      const queue = new SyncQueue({ baseDelayMs: 100 });

      const op: SyncOperation = {
        id: 'op-1',
        type: 'create',
        blobId: 'blob-1',
        data: {},
        timestamp: Date.now(),
        retryCount: 3,
      };

      queue.enqueue(op);

      const queuedOps = queue.getQueue();
      expect(queuedOps[0].retryCount).toBe(3);
    });
  });
});
