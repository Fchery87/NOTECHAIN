'use client';

import { encryptedSyncService } from '@/lib/sync/encryptedSyncService';
import {
  listLocalNoteOperations,
  upsertLocalNoteOperation,
  type LocalNoteOperationType,
} from '@/lib/sync/noteSyncLocalStore';

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

export interface PortableMarkdownNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  version: number;
}

export interface MarkdownExportFile {
  filename: string;
  content: string;
}

export interface MarkdownCryptoAdapter {
  encrypt(data: unknown): Promise<string>;
  decrypt(payload: string): Promise<unknown>;
}

export interface ImportMarkdownNoteInput {
  filename: string;
  content: string;
}

export interface ImportMarkdownNotesResult {
  imported: number;
  skipped: number;
}

function isDeleteOperation(
  value: SyncNoteOperation | SyncDeleteOperation
): value is SyncDeleteOperation {
  return 'deleted' in value && value.deleted === true;
}

function escapeYamlString(value: string): string {
  return JSON.stringify(value);
}

function unquoteYamlString(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }

  return trimmed;
}

export function sanitizeMarkdownFilename(title: string, fallbackId: string): string {
  const base = (title || fallbackId || 'note')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s._-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 80);

  return `${base || fallbackId || 'note'}.md`;
}

export function serializeNoteToMarkdown(note: PortableMarkdownNote): string {
  const title = note.title || 'Untitled';
  const updatedAt = note.updatedAt || new Date().toISOString();
  const version = Math.max(1, Math.floor(note.version || 1));

  return [
    '---',
    `id: ${escapeYamlString(note.id)}`,
    `title: ${escapeYamlString(title)}`,
    `updatedAt: ${escapeYamlString(updatedAt)}`,
    `version: ${version}`,
    'source: "notechain"',
    '---',
    '',
    `# ${title}`,
    '',
    note.content || '',
    '',
  ].join('\n');
}

function parseFrontmatter(markdown: string): { metadata: Record<string, string>; body: string } {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { metadata: {}, body: markdown };
  }

  const metadata: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) metadata[key] = unquoteYamlString(value);
  }

  return { metadata, body: markdown.slice(match[0].length) };
}

function noteIdFromFilename(filename: string): string {
  const normalized = filename
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized) return `imported-${normalized}`;

  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `imported-${Date.now()}`;
}

export function parseMarkdownNote(
  markdown: string,
  filename = 'imported-note.md'
): PortableMarkdownNote {
  const { metadata, body } = parseFrontmatter(markdown);
  const bodyLines = body.replace(/^\uFEFF/, '').split(/\r?\n/);
  const firstHeadingIndex = bodyLines.findIndex(line => /^#\s+/.test(line));
  const headingTitle =
    firstHeadingIndex >= 0 ? bodyLines[firstHeadingIndex].replace(/^#\s+/, '').trim() : '';

  const contentLines = [...bodyLines];
  if (firstHeadingIndex >= 0) {
    contentLines.splice(firstHeadingIndex, 1);
    if (contentLines[firstHeadingIndex] === '') {
      contentLines.splice(firstHeadingIndex, 1);
    }
  }

  while (contentLines[0] === '') {
    contentLines.shift();
  }

  const id = metadata.id || noteIdFromFilename(filename);
  const title = metadata.title || headingTitle || filename.replace(/\.[^.]+$/, '') || 'Untitled';
  const updatedAt = metadata.updatedAt || new Date().toISOString();
  const parsedVersion = Number.parseInt(metadata.version || '1', 10);

  return {
    id,
    title,
    content: contentLines.join('\n').trimEnd(),
    updatedAt,
    version: Number.isFinite(parsedVersion) && parsedVersion > 0 ? parsedVersion : 1,
  };
}

export async function exportMarkdownNotes(
  userId: string,
  cryptoAdapter: MarkdownCryptoAdapter = encryptedSyncService
): Promise<MarkdownExportFile[]> {
  if (!userId) {
    throw new Error('Cannot export Markdown without a user id');
  }

  const records = await listLocalNoteOperations(userId);
  const files: MarkdownExportFile[] = [];

  for (const record of records) {
    if (record.isDeleted || record.operationType === 'delete') continue;

    const decrypted = (await cryptoAdapter.decrypt(record.encryptedPayload)) as
      | SyncNoteOperation
      | SyncDeleteOperation;
    if (isDeleteOperation(decrypted)) continue;

    const note: PortableMarkdownNote = {
      id: decrypted.id || record.noteId,
      title: decrypted.title || 'Untitled',
      content: decrypted.content || '',
      updatedAt: decrypted.updatedAt || new Date(record.updatedAt).toISOString(),
      version: decrypted.version || record.version,
    };

    files.push({
      filename: sanitizeMarkdownFilename(note.title, note.id),
      content: serializeNoteToMarkdown(note),
    });
  }

  return files;
}

export async function importMarkdownNotes(
  userId: string,
  markdownFiles: ImportMarkdownNoteInput[],
  cryptoAdapter: MarkdownCryptoAdapter = encryptedSyncService
): Promise<ImportMarkdownNotesResult> {
  if (!userId) {
    throw new Error('Cannot import Markdown without a user id');
  }

  let imported = 0;
  let skipped = 0;

  for (const file of markdownFiles) {
    if (!file.content.trim()) {
      skipped++;
      continue;
    }

    const note = parseMarkdownNote(file.content, file.filename);
    const operationType: LocalNoteOperationType = 'create';
    const encryptedPayload = await cryptoAdapter.encrypt({
      id: note.id,
      title: note.title,
      content: note.content,
      updatedAt: note.updatedAt,
      version: note.version,
    } satisfies SyncNoteOperation);

    await upsertLocalNoteOperation({
      userId,
      noteId: note.id,
      encryptedPayload,
      operationType,
      version: note.version,
      updatedAt: Date.parse(note.updatedAt) || Date.now(),
    });
    imported++;
  }

  return { imported, skipped };
}
