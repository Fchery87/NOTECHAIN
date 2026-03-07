'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useSync } from './SyncProvider';
import { useUser } from '@/lib/supabase/UserProvider';
import { encryptedSyncService } from './encryptedSyncService';
import { offlineQueue } from './offlineQueue';
import { SupabaseSyncAdapter } from '@/lib/supabase/syncAdapter';
import { v4 as uuidv4 } from 'uuid';

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
  version?: number;
}

interface SyncNoteOperation {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  version: number;
}

/**
 * Hook to sync note operations with E2E encryption and offline support
 */
export function useNotesSync() {
  const { syncService, isInitialized } = useSync();
  const { user } = useUser();
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const versionRef = useRef<Record<string, number>>({});
  const adapterRef = useRef<SupabaseSyncAdapter | null>(null);

  // Lazily create adapter
  const getAdapter = useCallback(() => {
    if (!adapterRef.current) {
      adapterRef.current = new SupabaseSyncAdapter();
    }
    return adapterRef.current;
  }, []);

  // Initialize encryption on mount
  useEffect(() => {
    encryptedSyncService.initialize().then(() => {
      setIsEncryptionReady(true);
    });
  }, []);

  const getNextVersion = useCallback((noteId: string): number => {
    const currentVersion = versionRef.current[noteId] || 0;
    versionRef.current[noteId] = currentVersion + 1;
    return versionRef.current[noteId];
  }, []);

  /**
   * Load all notes from Supabase, decrypt, and return
   */
  const loadNotes = useCallback(async (): Promise<Note[]> => {
    if (!user?.id) {
      console.warn('[useNotesSync] No user ID available for loading notes');
      return [];
    }

    if (!isEncryptionReady) {
      console.warn('[useNotesSync] Encryption not ready, cannot decrypt notes');
      return [];
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const adapter = getAdapter();
      const rawNotes = await adapter.fetchUserNotes(user.id);

      if (rawNotes.length === 0) {
        return [];
      }

      const notes: Note[] = [];
      for (const raw of rawNotes) {
        // Skip deleted notes
        if (raw.operationType === 'delete') {
          console.log(`[useNotesSync] Skipping deleted note ${raw.entityId}`);
          continue;
        }

        try {
          const decrypted = (await encryptedSyncService.decrypt(
            raw.encryptedPayload
          )) as SyncNoteOperation;
          notes.push({
            id: decrypted.id || raw.entityId,
            title: decrypted.title || 'Untitled',
            content: decrypted.content || '',
            updatedAt: decrypted.updatedAt ? new Date(decrypted.updatedAt) : new Date(),
            version: raw.version,
          });
          // Track version for subsequent updates
          versionRef.current[raw.entityId] = raw.version;
        } catch (decryptErr) {
          const errorMessage =
            decryptErr instanceof Error ? decryptErr.message : String(decryptErr);

          // Check if this is a key mismatch issue
          if (errorMessage.includes('invalid key')) {
            console.warn(
              `[useNotesSync] Key mismatch for note ${raw.entityId}. ` +
                `This note was encrypted with a different key. ` +
                `Possible causes: cleared browser data, new device, or reinstalled app.`
            );
            // Add a "locked" note placeholder so user knows it exists but can't be read
            notes.push({
              id: raw.entityId,
              title: '🔒 Encrypted Note (Key Mismatch)',
              content:
                'This note cannot be decrypted with the current encryption key. ' +
                'It may have been created on a different device or before a key reset.',
              updatedAt: new Date(),
              version: raw.version,
            });
          } else {
            console.error(`[useNotesSync] Failed to decrypt note ${raw.entityId}:`, decryptErr);
          }
        }
      }

      return notes;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notes';
      setLoadError(message);
      console.error('[useNotesSync] Error loading notes:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isEncryptionReady, getAdapter]);

  /**
   * Encrypt and sync a note operation
   */
  const syncNoteOperation = useCallback(
    async (
      operationType: 'create' | 'update' | 'delete',
      noteId: string,
      noteData?: SyncNoteOperation
    ): Promise<void> => {
      const version = noteData?.version || 1;

      // Handle offline queue for all operations including deletions
      if (!syncService || !isInitialized || !isEncryptionReady) {
        console.warn(
          `[useNotesSync] ${!syncService || !isInitialized ? 'Sync service not available' : 'Encryption not ready'}, queuing ${operationType} for later`
        );

        let encryptedPayload: string;
        if (operationType === 'delete') {
          // For deletions, use a special marker that won't be decrypted
          encryptedPayload = 'DELETE_OPERATION';
        } else if (noteData && isEncryptionReady) {
          encryptedPayload = await encryptedSyncService.encrypt(noteData);
        } else if (noteData) {
          encryptedPayload = JSON.stringify(noteData);
        } else {
          console.error(`[useNotesSync] Cannot queue ${operationType} - no data available`);
          return;
        }

        await offlineQueue.enqueue({
          id: uuidv4(),
          userId: user?.id || '',
          sessionId: '',
          operationType,
          entityType: 'note',
          entityId: noteId,
          encryptedPayload,
          timestamp: Date.now(),
          version,
        });
        return;
      }

      try {
        let encryptedPayload: string;

        if (operationType === 'delete') {
          // For deletions, create a minimal encrypted payload
          // We encrypt a deletion marker instead of using placeholder text
          const deletionMarker = {
            id: noteId,
            deleted: true,
            deletedAt: new Date().toISOString(),
          };
          encryptedPayload = await encryptedSyncService.encrypt(deletionMarker as any);
        } else if (noteData) {
          encryptedPayload = await encryptedSyncService.encrypt(noteData);
        } else {
          throw new Error(`Cannot sync ${operationType} - no data available`);
        }

        await syncService.enqueueOperation({
          operationType,
          entityType: 'note',
          entityId: noteId,
          encryptedPayload,
          version,
        });
      } catch (_error) {
        console.error(`[useNotesSync] Failed to sync ${operationType}:`, _error);

        // Queue for retry on error
        let encryptedPayload: string;
        if (operationType === 'delete') {
          encryptedPayload = 'DELETE_OPERATION';
        } else if (noteData) {
          encryptedPayload = await encryptedSyncService.encrypt(noteData);
        } else {
          return;
        }

        await offlineQueue.enqueue({
          id: uuidv4(),
          userId: user?.id || '',
          sessionId: '',
          operationType,
          entityType: 'note',
          entityId: noteId,
          encryptedPayload,
          timestamp: Date.now(),
          version,
        });
      }
    },
    [syncService, isInitialized, isEncryptionReady, user?.id]
  );

  /**
   * Sync a note creation
   */
  const syncCreateNote = useCallback(
    async (note: Omit<Note, 'id' | 'updatedAt'>): Promise<string> => {
      const noteId = uuidv4();
      const version = 1;
      versionRef.current[noteId] = version;

      const noteData: SyncNoteOperation = {
        id: noteId,
        title: note.title,
        content: note.content,
        updatedAt: new Date().toISOString(),
        version,
      };

      await syncNoteOperation('create', noteId, noteData);
      return noteId;
    },
    [syncNoteOperation]
  );

  /**
   * Sync a note update
   */
  const syncUpdateNote = useCallback(
    async (note: Note): Promise<void> => {
      const version = getNextVersion(note.id);

      const noteData: SyncNoteOperation = {
        id: note.id,
        title: note.title,
        content: note.content,
        updatedAt: new Date().toISOString(),
        version,
      };

      await syncNoteOperation('update', note.id, noteData);
    },
    [syncNoteOperation, getNextVersion]
  );

  /**
   * Sync a note deletion
   */
  const syncDeleteNote = useCallback(
    async (noteId: string): Promise<void> => {
      const _version = getNextVersion(noteId);
      await syncNoteOperation('delete', noteId);
    },
    [syncNoteOperation, getNextVersion]
  );

  /**
   * Process offline queue
   */
  const processOfflineQueue = useCallback(async (): Promise<void> => {
    if (!syncService || !isInitialized || !isEncryptionReady) return;

    const pending = await offlineQueue.getRetryable();

    for (const queued of pending) {
      try {
        await syncService.enqueueOperation(queued.operation as any);
        await offlineQueue.remove(queued.id);
      } catch (error) {
        await offlineQueue.markFailed(
          queued.id,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  }, [syncService, isInitialized, isEncryptionReady]);

  /**
   * Permanently delete locked/undecryptable notes from Supabase
   * @param noteIds Array of note IDs to delete
   * @returns Success status and error message if failed
   */
  const deleteLockedNotes = useCallback(
    async (noteIds: string[]): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) {
        console.warn('[useNotesSync] No user ID available for deleting locked notes');
        return { success: false, error: 'No user ID' };
      }

      if (noteIds.length === 0) {
        return { success: true };
      }

      const adapter = getAdapter();
      if (!adapter.isReady()) {
        console.warn('[useNotesSync] Adapter not ready for deleting locked notes');
        return { success: false, error: 'Adapter not initialized' };
      }

      try {
        const result = await adapter.deleteNotesByEntityIds(user.id, noteIds);
        if (result.success) {
          console.log(`[useNotesSync] Successfully deleted ${noteIds.length} locked notes`);
        } else {
          console.error('[useNotesSync] Failed to delete locked notes:', result.error);
        }
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[useNotesSync] Exception deleting locked notes:', errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [user?.id, getAdapter]
  );

  return {
    loadNotes,
    syncCreateNote,
    syncUpdateNote,
    syncDeleteNote,
    processOfflineQueue,
    deleteLockedNotes,
    isSyncEnabled: isInitialized && !!syncService,
    isEncryptionReady,
    isLoading,
    loadError,
  };
}
