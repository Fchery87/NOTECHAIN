import { describe, expect, test } from 'bun:test';
import {
  assertDocumentAccess,
  InMemoryCollaborationOperationHistoryStore,
  type DocumentAccessValidator,
} from '../CollaborationGuards';

describe('collaboration guards and operation history', () => {
  test('rejects unauthorized document access', async () => {
    const denyAll: DocumentAccessValidator = () => false;

    await expect(
      assertDocumentAccess(denyAll, {
        userId: 'user-1',
        documentId: 'doc-1',
        action: 'join',
      })
    ).rejects.toThrow('Not authorized to join document');
  });

  test('stores and replays operations after vector clock', async () => {
    const store = new InMemoryCollaborationOperationHistoryStore();

    await store.append({
      documentId: 'doc-1',
      userId: 'user-1',
      timestamp: 1000,
      vectorClock: { 'user-1': 1 },
      operation: {
        type: 'insert',
        nodeId: 'user-1',
        timestamp: 1000,
        position: 0,
        value: 'A',
      },
    });
    await store.append({
      documentId: 'doc-1',
      userId: 'user-1',
      timestamp: 2000,
      vectorClock: { 'user-1': 2 },
      operation: {
        type: 'insert',
        nodeId: 'user-1',
        timestamp: 2000,
        position: 1,
        value: 'B',
      },
    });

    const replay = await store.getOperations('doc-1', { 'user-1': 1 });

    expect(replay).toHaveLength(1);
    expect(replay[0].operation.value).toBe('B');
    expect(await store.getCurrentVectorClock('doc-1')).toEqual({ 'user-1': 2 });
  });

  test('separates operation history by document id', async () => {
    const store = new InMemoryCollaborationOperationHistoryStore();

    await store.append({
      documentId: 'doc-1',
      userId: 'user-1',
      timestamp: 1000,
      vectorClock: { 'user-1': 1 },
      operation: { type: 'insert', nodeId: 'user-1', timestamp: 1000, value: 'doc1' },
    });
    await store.append({
      documentId: 'doc-2',
      userId: 'user-1',
      timestamp: 1000,
      vectorClock: { 'user-1': 1 },
      operation: { type: 'insert', nodeId: 'user-1', timestamp: 1000, value: 'doc2' },
    });

    expect((await store.getOperations('doc-1'))[0].operation.value).toBe('doc1');
    expect((await store.getOperations('doc-2'))[0].operation.value).toBe('doc2');
  });
});
