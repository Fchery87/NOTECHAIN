'use client';

import Dexie, { type Table } from 'dexie';

export type LocalNoteOperationType = 'create' | 'update' | 'delete';

export interface LocalSyncedNoteRecord {
  cacheKey: string;
  userId: string;
  noteId: string;
  encryptedPayload: string;
  operationType: LocalNoteOperationType;
  version: number;
  updatedAt: number;
  isDeleted: boolean;
}

interface UpsertLocalNoteOperationInput {
  userId: string;
  noteId: string;
  encryptedPayload: string;
  operationType: LocalNoteOperationType;
  version: number;
  updatedAt?: number;
}

export interface LocalSyncCursorRecord {
  userId: string;
  lastSyncVersion: number;
  updatedAt: number;
}

class NoteSyncLocalStoreDatabase extends Dexie {
  noteOperations!: Table<LocalSyncedNoteRecord, string>;
  syncCursors!: Table<LocalSyncCursorRecord, string>;

  constructor() {
    super('notechain-note-sync-cache');

    this.version(1).stores({
      noteOperations: 'cacheKey, userId, noteId, version, updatedAt, isDeleted, [userId+noteId]',
    });

    this.version(2).stores({
      noteOperations: 'cacheKey, userId, noteId, version, updatedAt, isDeleted, [userId+noteId]',
      syncCursors: 'userId, lastSyncVersion, updatedAt',
    });
  }
}

const db = new NoteSyncLocalStoreDatabase();

function createCacheKey(userId: string, noteId: string): string {
  return `${userId}:${noteId}`;
}

/**
 * Store only encrypted sync payloads locally. The cache is the local-first
 * canonical copy of the newest operation per note, but it never stores note
 * plaintext.
 */
export async function upsertLocalNoteOperation(
  input: UpsertLocalNoteOperationInput
): Promise<void> {
  if (!input.userId || !input.noteId) return;

  const cacheKey = createCacheKey(input.userId, input.noteId);
  const existing = await db.noteOperations.get(cacheKey);

  // Ignore stale operations; equal versions may be replays from realtime/pull.
  if (existing && existing.version > input.version) {
    return;
  }

  await db.noteOperations.put({
    cacheKey,
    userId: input.userId,
    noteId: input.noteId,
    encryptedPayload: input.encryptedPayload,
    operationType: input.operationType,
    version: input.version,
    updatedAt: input.updatedAt ?? Date.now(),
    isDeleted: input.operationType === 'delete',
  });
}

export async function listLocalNoteOperations(userId: string): Promise<LocalSyncedNoteRecord[]> {
  if (!userId) return [];

  const records = await db.noteOperations.where('userId').equals(userId).toArray();

  return records.sort((a, b) => b.updatedAt - a.updatedAt || b.version - a.version);
}

export async function deleteLocalNoteOperation(userId: string, noteId: string): Promise<void> {
  if (!userId || !noteId) return;
  await db.noteOperations.delete(createCacheKey(userId, noteId));
}

export async function clearLocalNoteOperations(userId: string): Promise<void> {
  if (!userId) return;

  const records = await db.noteOperations.where('userId').equals(userId).toArray();
  await db.noteOperations.bulkDelete(records.map(record => record.cacheKey));
}

export async function getLocalSyncCursor(userId: string): Promise<number> {
  if (!userId) return 0;

  const record = await db.syncCursors.get(userId);
  return record?.lastSyncVersion ?? 0;
}

export async function setLocalSyncCursor(userId: string, lastSyncVersion: number): Promise<void> {
  if (!userId) return;

  const normalizedVersion = Math.max(0, Math.floor(lastSyncVersion || 0));
  const existing = await db.syncCursors.get(userId);

  if (existing && existing.lastSyncVersion >= normalizedVersion) {
    return;
  }

  await db.syncCursors.put({
    userId,
    lastSyncVersion: normalizedVersion,
    updatedAt: Date.now(),
  });
}

export async function clearLocalSyncCursor(userId: string): Promise<void> {
  if (!userId) return;
  await db.syncCursors.delete(userId);
}

/** Test-only escape hatch so focused store tests can reset IndexedDB state. */
export async function clearAllNoteSyncLocalStoreData(): Promise<void> {
  await db.noteOperations.clear();
  await db.syncCursors.clear();
}
