import { afterEach, describe, expect, it } from 'vitest';
import {
  clearAllLocalSearchIndexData,
  rebuildLocalNoteSearchIndex,
  searchLocalIndex,
} from '../localSearchIndex';
import {
  clearAllNoteSyncLocalStoreData,
  upsertLocalNoteOperation,
} from '@/lib/sync/noteSyncLocalStore';

const jsonCryptoAdapter = {
  decrypt: async (payload: string) => JSON.parse(payload),
};

describe('local search index', () => {
  afterEach(async () => {
    await clearAllLocalSearchIndexData();
    await clearAllNoteSyncLocalStoreData();
  });

  it('indexes decrypted local notes and returns scoped search results', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: JSON.stringify({
        id: 'note-1',
        title: 'Project Alpha',
        content: 'Launch checklist and recovery plan',
        updatedAt: '2026-05-01T00:00:00.000Z',
        version: 1,
      }),
      operationType: 'create',
      version: 1,
      updatedAt: 1000,
    });
    await upsertLocalNoteOperation({
      userId: 'user-2',
      noteId: 'note-2',
      encryptedPayload: JSON.stringify({
        id: 'note-2',
        title: 'Project Alpha private other user',
        content: 'Should not appear',
        updatedAt: '2026-05-01T00:00:00.000Z',
        version: 1,
      }),
      operationType: 'create',
      version: 1,
      updatedAt: 1000,
    });

    expect(await rebuildLocalNoteSearchIndex('user-1', jsonCryptoAdapter)).toBe(1);
    expect(await rebuildLocalNoteSearchIndex('user-2', jsonCryptoAdapter)).toBe(1);

    const results = await searchLocalIndex('user-1', 'alpha recovery');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      userId: 'user-1',
      entityType: 'note',
      entityId: 'note-1',
      title: 'Project Alpha',
    });
    expect(results[0].snippet).toContain('recovery');
  });

  it('removes deleted notes on rebuild', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: JSON.stringify({
        id: 'note-1',
        title: 'Delete Me',
        content: 'temporary searchable text',
        updatedAt: '2026-05-01T00:00:00.000Z',
        version: 1,
      }),
      operationType: 'create',
      version: 1,
      updatedAt: 1000,
    });
    await rebuildLocalNoteSearchIndex('user-1', jsonCryptoAdapter);
    expect(await searchLocalIndex('user-1', 'temporary')).toHaveLength(1);

    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: JSON.stringify({
        id: 'note-1',
        deleted: true,
        deletedAt: '2026-05-02T00:00:00.000Z',
        version: 2,
      }),
      operationType: 'delete',
      version: 2,
      updatedAt: 2000,
    });
    await rebuildLocalNoteSearchIndex('user-1', jsonCryptoAdapter);

    expect(await searchLocalIndex('user-1', 'temporary')).toHaveLength(0);
  });

  it('ranks title matches above content-only matches', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'title-match',
      encryptedPayload: JSON.stringify({
        id: 'title-match',
        title: 'Recovery',
        content: 'short',
        updatedAt: '2026-05-03T00:00:00.000Z',
        version: 1,
      }),
      operationType: 'create',
      version: 1,
      updatedAt: 1000,
    });
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'content-match',
      encryptedPayload: JSON.stringify({
        id: 'content-match',
        title: 'Other',
        content: 'This mentions recovery many times recovery recovery',
        updatedAt: '2026-05-04T00:00:00.000Z',
        version: 1,
      }),
      operationType: 'create',
      version: 1,
      updatedAt: 2000,
    });
    await rebuildLocalNoteSearchIndex('user-1', jsonCryptoAdapter);

    const results = await searchLocalIndex('user-1', 'recovery');

    expect(results[0].entityId).toBe('title-match');
  });
});
