import type { SyncOperation } from '@notechain/sync-engine';
import { encryptedSyncService } from './encryptedSyncService';
import { listLocalNoteOperations, type LocalSyncedNoteRecord } from './noteSyncLocalStore';
import type { Note, RemoteNoteChange } from './noteSyncTypes';

export type SyncOperationDraft = Omit<SyncOperation, 'id' | 'timestamp' | 'userId' | 'sessionId'>;

export function toSyncOperationDraft(operation: SyncOperation): SyncOperationDraft {
  return {
    operationType: operation.operationType,
    entityType: operation.entityType,
    entityId: operation.entityId,
    encryptedPayload: operation.encryptedPayload,
    version: operation.version,
  };
}

export interface SyncNoteOperation {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  version: number;
}

export interface SyncDeleteOperation {
  id: string;
  deleted: true;
  deletedAt: string;
  version: number;
}

export function isSyncDeleteOperation(
  value: SyncNoteOperation | SyncDeleteOperation
): value is SyncDeleteOperation {
  return 'deleted' in value && value.deleted === true;
}

export function createDeleteMarker(noteId: string, version: number): SyncDeleteOperation {
  return {
    id: noteId,
    deleted: true,
    deletedAt: new Date().toISOString(),
    version,
  };
}

export const LOCKED_NOTE_TITLE = '🔒 Encrypted Note (Key Mismatch)';

export function noteOperationToNote(
  operation: SyncNoteOperation,
  fallback: { noteId: string; version: number; updatedAt?: string | number }
): Note {
  return {
    id: operation.id || fallback.noteId,
    title: operation.title || 'Untitled',
    content: operation.content || '',
    updatedAt: operation.updatedAt
      ? new Date(operation.updatedAt)
      : new Date(fallback.updatedAt ?? Date.now()),
    version: fallback.version,
  };
}

export async function decryptCachedNoteRecords(
  records: LocalSyncedNoteRecord[],
  onVersion: (noteId: string, version: number) => void
): Promise<Note[]> {
  const notes: Note[] = [];

  for (const record of records) {
    onVersion(record.noteId, record.version);

    if (record.isDeleted || record.operationType === 'delete') continue;

    try {
      const decrypted = (await encryptedSyncService.decrypt(record.encryptedPayload)) as
        | SyncNoteOperation
        | SyncDeleteOperation;

      if (!isSyncDeleteOperation(decrypted)) {
        notes.push(noteOperationToNote(decrypted, record));
      }
    } catch (decryptErr) {
      const errorMessage = decryptErr instanceof Error ? decryptErr.message : String(decryptErr);

      if (errorMessage.includes('invalid key')) {
        notes.push({
          id: record.noteId,
          title: LOCKED_NOTE_TITLE,
          content:
            'This locally cached note cannot be decrypted with the current encryption key. ' +
            'It may have been created on a different device or before a key reset.',
          updatedAt: new Date(record.updatedAt),
          version: record.version,
        });
      } else {
        console.error(`[useNotesSync] Failed to decrypt cached note ${record.noteId}:`, decryptErr);
      }
    }
  }

  return notes;
}

/**
 * Decrypted notes from this device's encrypted note cache, the same store the
 * Notes page reads. Empty until the encryption session for a user is ready.
 * Notes that cannot be decrypted with the current key are left out.
 */
export async function listLocalDecryptedNotes(): Promise<Note[]> {
  const userId = encryptedSyncService.getSessionUserId();
  if (!userId) return [];

  const records = await listLocalNoteOperations(userId);
  const notes = await decryptCachedNoteRecords(records, () => {});
  return notes.filter(note => note.title !== LOCKED_NOTE_TITLE);
}

export async function syncOperationToRemoteNoteChange(
  operation: SyncOperation
): Promise<RemoteNoteChange> {
  if (operation.operationType === 'delete') {
    return {
      operationType: 'delete',
      noteId: operation.entityId,
      version: operation.version,
    };
  }

  const decrypted = (await encryptedSyncService.decrypt(operation.encryptedPayload)) as
    | SyncNoteOperation
    | SyncDeleteOperation;

  if (isSyncDeleteOperation(decrypted)) {
    return {
      operationType: 'delete',
      noteId: decrypted.id || operation.entityId,
      version: operation.version,
    };
  }

  return {
    operationType: operation.operationType,
    noteId: decrypted.id || operation.entityId,
    version: operation.version,
    note: noteOperationToNote(decrypted, {
      noteId: operation.entityId,
      version: operation.version,
      updatedAt: operation.timestamp,
    }),
  };
}
