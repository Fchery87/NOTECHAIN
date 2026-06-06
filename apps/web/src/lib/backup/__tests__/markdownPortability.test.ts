import { afterEach, describe, expect, it } from 'vitest';
import {
  exportMarkdownNotes,
  importMarkdownNotes,
  parseMarkdownNote,
  sanitizeMarkdownFilename,
  serializeNoteToMarkdown,
  type MarkdownCryptoAdapter,
} from '../markdownPortability';
import {
  clearAllNoteSyncLocalStoreData,
  listLocalNoteOperations,
  upsertLocalNoteOperation,
} from '@/lib/sync/noteSyncLocalStore';

const jsonCryptoAdapter: MarkdownCryptoAdapter = {
  encrypt: async data => JSON.stringify(data),
  decrypt: async payload => JSON.parse(payload),
};

describe('markdown portability', () => {
  afterEach(async () => {
    await clearAllNoteSyncLocalStoreData();
  });

  it('serializes and parses NoteChain Markdown frontmatter', () => {
    const markdown = serializeNoteToMarkdown({
      id: 'note-1',
      title: 'Hello World',
      content: 'Body text\n\n- item',
      updatedAt: '2026-01-01T00:00:00.000Z',
      version: 7,
    });

    expect(markdown).toContain('source: "notechain"');
    expect(parseMarkdownNote(markdown)).toEqual({
      id: 'note-1',
      title: 'Hello World',
      content: 'Body text\n\n- item',
      updatedAt: '2026-01-01T00:00:00.000Z',
      version: 7,
    });
  });

  it('sanitizes filenames for Markdown export', () => {
    expect(sanitizeMarkdownFilename('Hello / Weird: Note!?', 'note-1')).toBe('hello-weird-note.md');
  });

  it('exports decrypted local encrypted cache as Markdown files', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: JSON.stringify({
        id: 'note-1',
        title: 'Readable Note',
        content: '# Inner heading\nBody',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 2,
      }),
      operationType: 'update',
      version: 2,
      updatedAt: 1000,
    });

    const files = await exportMarkdownNotes('user-1', jsonCryptoAdapter);

    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('readable-note.md');
    expect(files[0].content).toContain('title: "Readable Note"');
    expect(files[0].content).toContain('# Readable Note');
    expect(files[0].content).toContain('# Inner heading\nBody');
  });

  it('imports Markdown files into encrypted local cache', async () => {
    const result = await importMarkdownNotes(
      'user-1',
      [
        {
          filename: 'imported.md',
          content: [
            '---',
            'id: "note-imported"',
            'title: "Imported Note"',
            'updatedAt: "2026-02-01T00:00:00.000Z"',
            'version: 4',
            '---',
            '',
            '# Imported Note',
            '',
            'Imported body',
          ].join('\n'),
        },
      ],
      jsonCryptoAdapter
    );

    expect(result).toEqual({ imported: 1, skipped: 0 });
    const records = await listLocalNoteOperations('user-1');
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      userId: 'user-1',
      noteId: 'note-imported',
      operationType: 'create',
      version: 4,
      isDeleted: false,
    });
    expect(JSON.parse(records[0].encryptedPayload)).toMatchObject({
      id: 'note-imported',
      title: 'Imported Note',
      content: 'Imported body',
      updatedAt: '2026-02-01T00:00:00.000Z',
      version: 4,
    });
  });
});
