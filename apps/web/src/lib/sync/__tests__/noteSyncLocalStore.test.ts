import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllNoteSyncLocalStoreData,
  getLocalSyncCursor,
  listLocalNoteOperations,
  setLocalSyncCursor,
  upsertLocalNoteOperation,
} from '../noteSyncLocalStore';

describe('noteSyncLocalStore', () => {
  beforeEach(async () => {
    await clearAllNoteSyncLocalStoreData();
  });

  afterEach(async () => {
    await clearAllNoteSyncLocalStoreData();
  });

  it('stores the newest encrypted operation per note', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: 'cipher:v1',
      operationType: 'create',
      version: 1,
      updatedAt: 100,
    });

    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: 'cipher:v2',
      operationType: 'update',
      version: 2,
      updatedAt: 200,
    });

    const records = await listLocalNoteOperations('user-1');

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: 'cipher:v2',
      operationType: 'update',
      version: 2,
      isDeleted: false,
    });
  });

  it('ignores stale operations', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: 'cipher:v3',
      operationType: 'update',
      version: 3,
    });

    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: 'cipher:v2',
      operationType: 'update',
      version: 2,
    });

    const records = await listLocalNoteOperations('user-1');

    expect(records).toHaveLength(1);
    expect(records[0].encryptedPayload).toBe('cipher:v3');
    expect(records[0].version).toBe(3);
  });

  it('stores delete operations as tombstones', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: 'cipher:delete',
      operationType: 'delete',
      version: 4,
    });

    const records = await listLocalNoteOperations('user-1');

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      operationType: 'delete',
      isDeleted: true,
      version: 4,
    });
  });

  it('keeps sync cursor monotonic', async () => {
    await setLocalSyncCursor('user-1', 10);
    await setLocalSyncCursor('user-1', 8);
    await setLocalSyncCursor('user-1', 12);

    await setLocalSyncCursor('user-2', 4);

    expect(await getLocalSyncCursor('user-1')).toBe(12);
    expect(await getLocalSyncCursor('user-2')).toBe(4);
  });
});
