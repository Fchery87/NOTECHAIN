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

async function addNote(note: {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  version?: number;
}) {
  await upsertLocalNoteOperation({
    userId: 'user-1',
    noteId: note.id,
    encryptedPayload: JSON.stringify({ ...note, version: note.version ?? 1 }),
    operationType: 'create',
    version: note.version ?? 1,
    updatedAt: Date.parse(note.updatedAt),
  });
}

describe('hybrid local search', () => {
  afterEach(async () => {
    await clearAllLocalSearchIndexData();
    await clearAllNoteSyncLocalStoreData();
  });

  it('finds typo-tolerant fuzzy matches', async () => {
    await addNote({
      id: 'note-1',
      title: 'Recovery Planning',
      content: 'Key backup and restore checklist',
      updatedAt: '2026-05-01T00:00:00.000Z',
    });
    await rebuildLocalNoteSearchIndex('user-1', jsonCryptoAdapter);

    const results = await searchLocalIndex('user-1', 'recovry');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ entityId: 'note-1', matchType: 'fuzzy' });
  });

  it('can disable fuzzy matching for exact-only search', async () => {
    await addNote({
      id: 'note-1',
      title: 'Recovery Planning',
      content: 'Key backup and restore checklist',
      updatedAt: '2026-05-01T00:00:00.000Z',
    });
    await rebuildLocalNoteSearchIndex('user-1', jsonCryptoAdapter);

    expect(await searchLocalIndex('user-1', 'recovry', { fuzzy: false })).toHaveLength(0);
  });

  it('filters by updatedAt range', async () => {
    await addNote({
      id: 'old-note',
      title: 'Recovery Old',
      content: 'old',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await addNote({
      id: 'new-note',
      title: 'Recovery New',
      content: 'new',
      updatedAt: '2026-06-01T00:00:00.000Z',
    });
    await rebuildLocalNoteSearchIndex('user-1', jsonCryptoAdapter);

    const results = await searchLocalIndex('user-1', 'recovery', {
      updatedAfter: Date.parse('2026-05-01T00:00:00.000Z'),
    });

    expect(results.map(result => result.entityId)).toEqual(['new-note']);
  });
});
