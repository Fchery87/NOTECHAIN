import { afterEach, describe, expect, it } from 'vitest';
import {
  createJsonWorkspaceExport,
  exportJsonWorkspace,
  importJsonWorkspace,
  JSON_WORKSPACE_FORMAT,
  JSON_WORKSPACE_VERSION,
} from '../jsonWorkspacePortability';
import type { MarkdownCryptoAdapter } from '../markdownPortability';
import {
  clearAllNoteSyncLocalStoreData,
  listLocalNoteOperations,
  upsertLocalNoteOperation,
} from '@/lib/sync/noteSyncLocalStore';

const jsonCryptoAdapter: MarkdownCryptoAdapter = {
  encrypt: async data => JSON.stringify(data),
  decrypt: async payload => JSON.parse(payload),
};

describe('json workspace portability', () => {
  afterEach(async () => {
    await clearAllNoteSyncLocalStoreData();
  });

  it('exports a versioned readable JSON workspace from decrypted local cache', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: JSON.stringify({
        id: 'note-1',
        title: 'JSON Note',
        content: 'Readable content',
        updatedAt: '2026-03-01T00:00:00.000Z',
        version: 3,
      }),
      operationType: 'update',
      version: 3,
      updatedAt: 1000,
    });

    const workspace = await createJsonWorkspaceExport('user-1', jsonCryptoAdapter);

    expect(workspace.format).toBe(JSON_WORKSPACE_FORMAT);
    expect(workspace.version).toBe(JSON_WORKSPACE_VERSION);
    expect(workspace.data.notes).toEqual([
      {
        id: 'note-1',
        title: 'JSON Note',
        content: 'Readable content',
        updatedAt: '2026-03-01T00:00:00.000Z',
        version: 3,
      },
    ]);
  });

  it('imports a versioned JSON workspace into encrypted local cache', async () => {
    const workspaceJson = JSON.stringify({
      format: JSON_WORKSPACE_FORMAT,
      version: JSON_WORKSPACE_VERSION,
      exportedAt: '2026-03-01T00:00:00.000Z',
      data: {
        notes: [
          {
            id: 'json-note-1',
            title: 'Imported JSON Note',
            content: 'Imported body',
            updatedAt: '2026-03-02T00:00:00.000Z',
            version: 5,
          },
        ],
      },
    });

    const result = await importJsonWorkspace('user-1', workspaceJson, jsonCryptoAdapter);

    expect(result).toEqual({ imported: 1, skipped: 0 });
    const records = await listLocalNoteOperations('user-1');
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      noteId: 'json-note-1',
      operationType: 'create',
      version: 5,
    });
    expect(JSON.parse(records[0].encryptedPayload)).toMatchObject({
      id: 'json-note-1',
      title: 'Imported JSON Note',
      content: 'Imported body',
      updatedAt: '2026-03-02T00:00:00.000Z',
      version: 5,
    });
  });

  it('rejects unsupported JSON workspace formats', async () => {
    await expect(
      importJsonWorkspace(
        'user-1',
        JSON.stringify({ format: 'other', version: JSON_WORKSPACE_VERSION, data: { notes: [] } }),
        jsonCryptoAdapter
      )
    ).rejects.toThrow('Unsupported JSON workspace format');
  });

  it('exports JSON text with the expected schema', async () => {
    const exported = JSON.parse(await exportJsonWorkspace('user-1'));

    expect(exported).toMatchObject({
      format: JSON_WORKSPACE_FORMAT,
      version: JSON_WORKSPACE_VERSION,
      data: { notes: [] },
    });
  });
});
