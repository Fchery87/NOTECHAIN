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
          console.error(`[useNotesSync] Failed to decrypt note ${raw.entityId}:`, decryptErr);
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
      if (!syncService || !isInitialized) {
        console.warn('Sync service not available, queuing for later');
        if (noteData) {
          await offlineQueue.enqueue({
            id: uuidv4(),
            userId: '',
            sessionId: '',
            operationType,
            entityType: 'note',
            entityId: noteId,
            encryptedPayload: await encryptedSyncService.encrypt(noteData),
            timestamp: Date.now(),
            version: noteData.version,
          });
        }
        return;
      }

      if (!isEncryptionReady) {
        console.warn('Encryption not ready, queuing for later');
        if (noteData) {
          await offlineQueue.enqueue({
            id: uuidv4(),
            userId: '',
            sessionId: '',
            operationType,
            entityType: 'note',
            entityId: noteId,
            encryptedPayload: JSON.stringify(noteData),
            timestamp: Date.now(),
            version: noteData.version,
          });
        }
        return;
      }

      try {
        const version = noteData?.version || 1;
        const encryptedPayload = noteData
          ? await encryptedSyncService.encrypt(noteData)
          : 'deleted:nonce:authTag';

        await syncService.enqueueOperation({
          operationType,
          entityType: 'note',
          entityId: noteId,
          encryptedPayload,
          version,
        });
      } catch (_error) {
        console.error('Failed to sync note:', _error);
        if (noteData) {
          await offlineQueue.enqueue({
            id: uuidv4(),
            userId: '',
            sessionId: '',
            operationType,
            entityType: 'note',
            entityId: noteId,
            encryptedPayload: await encryptedSyncService.encrypt(noteData),
            timestamp: Date.now(),
            version: noteData.version,
          });
        }
      }
    },
    [syncService, isInitialized, isEncryptionReady]
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

  return {
    loadNotes,
    syncCreateNote,
    syncUpdateNote,
    syncDeleteNote,
    processOfflineQueue,
    isSyncEnabled: isInitialized && !!syncService,
    isEncryptionReady,
    isLoading,
    loadError,
  };
}
