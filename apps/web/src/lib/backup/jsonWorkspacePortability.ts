'use client';

import {
  importMarkdownNotes,
  type MarkdownCryptoAdapter,
  type PortableMarkdownNote,
} from './markdownPortability';
import { encryptedSyncService } from '@/lib/sync/encryptedSyncService';
import { listLocalNoteOperations } from '@/lib/sync/noteSyncLocalStore';

export const JSON_WORKSPACE_FORMAT = 'notechain.workspace';
export const JSON_WORKSPACE_VERSION = 1;

interface SyncNoteOperation {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  version: number;
}

interface SyncDeleteOperation {
  id: string;
  deleted: true;
  deletedAt: string;
  version: number;
}

export interface JsonWorkspaceV1 {
  format: typeof JSON_WORKSPACE_FORMAT;
  version: typeof JSON_WORKSPACE_VERSION;
  exportedAt: string;
  data: {
    notes: PortableMarkdownNote[];
  };
}

export interface ImportJsonWorkspaceResult {
  imported: number;
  skipped: number;
}

function isDeleteOperation(
  value: SyncNoteOperation | SyncDeleteOperation
): value is SyncDeleteOperation {
  return 'deleted' in value && value.deleted === true;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeNote(value: unknown, index: number): PortableMarkdownNote {
  if (!isObject(value)) {
    throw new Error(`Workspace note at index ${index} is invalid`);
  }

  const id =
    typeof value.id === 'string' && value.id.trim() ? value.id : `imported-json-${index + 1}`;
  const title = typeof value.title === 'string' && value.title.trim() ? value.title : 'Untitled';
  const content = typeof value.content === 'string' ? value.content : '';
  const updatedAt =
    typeof value.updatedAt === 'string' && value.updatedAt.trim()
      ? value.updatedAt
      : new Date().toISOString();
  const versionValue =
    typeof value.version === 'number' ? value.version : Number(value.version || 1);
  const version = Number.isFinite(versionValue) && versionValue > 0 ? Math.floor(versionValue) : 1;

  return { id, title, content, updatedAt, version };
}

function parseJsonWorkspace(workspaceJson: string): JsonWorkspaceV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(workspaceJson);
  } catch {
    throw new Error('Invalid JSON workspace file');
  }

  if (!isObject(parsed)) {
    throw new Error('Invalid JSON workspace file');
  }
  if (parsed.format !== JSON_WORKSPACE_FORMAT) {
    throw new Error('Unsupported JSON workspace format');
  }
  if (parsed.version !== JSON_WORKSPACE_VERSION) {
    throw new Error(`Unsupported JSON workspace version: ${String(parsed.version)}`);
  }
  if (!isObject(parsed.data) || !Array.isArray(parsed.data.notes)) {
    throw new Error('JSON workspace is missing notes');
  }

  return {
    format: JSON_WORKSPACE_FORMAT,
    version: JSON_WORKSPACE_VERSION,
    exportedAt:
      typeof parsed.exportedAt === 'string' && parsed.exportedAt.trim()
        ? parsed.exportedAt
        : new Date().toISOString(),
    data: {
      notes: parsed.data.notes.map(normalizeNote),
    },
  };
}

export async function createJsonWorkspaceExport(
  userId: string,
  cryptoAdapter: MarkdownCryptoAdapter = encryptedSyncService
): Promise<JsonWorkspaceV1> {
  if (!userId) {
    throw new Error('Cannot export JSON workspace without a user id');
  }

  const records = await listLocalNoteOperations(userId);
  const notes: PortableMarkdownNote[] = [];

  for (const record of records) {
    if (record.isDeleted || record.operationType === 'delete') continue;

    const decrypted = (await cryptoAdapter.decrypt(record.encryptedPayload)) as
      | SyncNoteOperation
      | SyncDeleteOperation;
    if (isDeleteOperation(decrypted)) continue;

    notes.push({
      id: decrypted.id || record.noteId,
      title: decrypted.title || 'Untitled',
      content: decrypted.content || '',
      updatedAt: decrypted.updatedAt || new Date(record.updatedAt).toISOString(),
      version: decrypted.version || record.version,
    });
  }

  return {
    format: JSON_WORKSPACE_FORMAT,
    version: JSON_WORKSPACE_VERSION,
    exportedAt: new Date().toISOString(),
    data: { notes },
  };
}

export async function exportJsonWorkspace(userId: string): Promise<string> {
  return `${JSON.stringify(await createJsonWorkspaceExport(userId), null, 2)}\n`;
}

export async function importJsonWorkspace(
  userId: string,
  workspaceJson: string,
  cryptoAdapter: MarkdownCryptoAdapter = encryptedSyncService
): Promise<ImportJsonWorkspaceResult> {
  if (!userId) {
    throw new Error('Cannot import JSON workspace without a user id');
  }

  const workspace = parseJsonWorkspace(workspaceJson);
  return importMarkdownNotes(
    userId,
    workspace.data.notes.map(note => ({
      filename: `${note.id}.md`,
      content: [
        '---',
        `id: ${JSON.stringify(note.id)}`,
        `title: ${JSON.stringify(note.title)}`,
        `updatedAt: ${JSON.stringify(note.updatedAt)}`,
        `version: ${note.version}`,
        '---',
        '',
        `# ${note.title}`,
        '',
        note.content,
      ].join('\n'),
    })),
    cryptoAdapter
  );
}
