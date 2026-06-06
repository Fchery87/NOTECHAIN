import { afterEach, describe, expect, it } from 'vitest';
import { answerFromLocalSearch } from '../localAnswer';
import { clearAllLocalSearchIndexData, rebuildLocalNoteSearchIndex } from '../localSearchIndex';
import {
  clearAllNoteSyncLocalStoreData,
  upsertLocalNoteOperation,
} from '@/lib/sync/noteSyncLocalStore';

const jsonCryptoAdapter = {
  decrypt: async (payload: string) => JSON.parse(payload),
};

describe('local answer with citations', () => {
  afterEach(async () => {
    await clearAllLocalSearchIndexData();
    await clearAllNoteSyncLocalStoreData();
  });

  it('creates extractive answers with citations from user-scoped local notes', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: JSON.stringify({
        id: 'note-1',
        title: 'Recovery Plan',
        content: 'The recovery key should be stored in a password manager. Do not share it.',
        updatedAt: '2026-06-01T00:00:00.000Z',
        version: 1,
      }),
      operationType: 'create',
      version: 1,
      updatedAt: 1000,
    });
    await upsertLocalNoteOperation({
      userId: 'user-2',
      noteId: 'other-user-note',
      encryptedPayload: JSON.stringify({
        id: 'other-user-note',
        title: 'Recovery Plan',
        content: 'Other user secret should not appear.',
        updatedAt: '2026-06-01T00:00:00.000Z',
        version: 1,
      }),
      operationType: 'create',
      version: 1,
      updatedAt: 1000,
    });

    await rebuildLocalNoteSearchIndex('user-1', jsonCryptoAdapter);
    await rebuildLocalNoteSearchIndex('user-2', jsonCryptoAdapter);

    const answer = await answerFromLocalSearch('user-1', 'where store recovery key');

    expect(answer.answer).toContain('password manager');
    expect(answer.answer).toContain('[1]');
    expect(answer.citations).toHaveLength(1);
    expect(answer.citations[0]).toMatchObject({
      entityId: 'note-1',
      title: 'Recovery Plan',
    });
    expect(answer.answer).not.toContain('Other user secret');
  });

  it('returns empty citations when no local source matches', async () => {
    const answer = await answerFromLocalSearch('user-1', 'missing query');

    expect(answer.answer).toBe('No matching local sources were found for this question.');
    expect(answer.citations).toEqual([]);
  });
});
