'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import type { SyncOperation } from '@notechain/sync-engine';
import { useSync } from './SyncProvider';
import { useUser } from '@/lib/supabase/UserProvider';
import { encryptedSyncService } from './encryptedSyncService';
import { offlineQueue } from './offlineQueue';
import { SupabaseSyncAdapter } from '@/lib/supabase/syncAdapter';
import {
  listLocalNoteOperations,
  setLocalSyncCursor,
  upsertLocalNoteOperation,
} from './noteSyncLocalStore';
import {
  getRecoveryBackupState,
  isRecoveryBackupSatisfied,
  markRecoveryBackupBypassed,
  markRecoveryBackupVerified,
  RECOVERY_BACKUP_STATE_CHANGED,
  type RecoveryBackupState,
} from './recoveryBackupState';
import {
  createDeleteMarker,
  decryptCachedNoteRecords,
  syncOperationToRemoteNoteChange,
  toSyncOperationDraft,
  type SyncNoteOperation,
  type SyncOperationDraft,
} from './noteSyncOperations';
import type { Note, RemoteNoteChange } from './noteSyncTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook to sync note operations with E2E encryption and offline support
 */
export function useNotesSync() {
  const { syncService, isInitialized } = useSync();
  const { user } = useUser();
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);
  const [recoveryBackupState, setRecoveryBackupState] = useState<RecoveryBackupState>({});
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
    encryptedSyncService
      .initialize()
      .then(() => {
        setEncryptionError(null);
        setIsEncryptionReady(true);
      })
      .catch(error => {
        const message = error instanceof Error ? error.message : 'Encryption recovery required';
        setEncryptionError(message);
        setLoadError(message);
        setIsEncryptionReady(false);
      });
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setRecoveryBackupState({});
      return;
    }

    const refreshRecoveryBackupState = () => {
      setRecoveryBackupState(getRecoveryBackupState(user.id));
    };

    refreshRecoveryBackupState();
    window.addEventListener(RECOVERY_BACKUP_STATE_CHANGED, refreshRecoveryBackupState);
    window.addEventListener('storage', refreshRecoveryBackupState);

    return () => {
      window.removeEventListener(RECOVERY_BACKUP_STATE_CHANGED, refreshRecoveryBackupState);
      window.removeEventListener('storage', refreshRecoveryBackupState);
    };
  }, [user?.id]);

  const getNextVersion = useCallback((noteId: string): number => {
    const currentVersion = versionRef.current[noteId] || 0;
    versionRef.current[noteId] = currentVersion + 1;
    return versionRef.current[noteId];
  }, []);

  const trackRemoteVersion = useCallback((noteId: string, version: number): void => {
    versionRef.current[noteId] = Math.max(versionRef.current[noteId] || 0, version);
  }, []);

  const decryptLocalRecords = useCallback(
    (records: Parameters<typeof decryptCachedNoteRecords>[0]): Promise<Note[]> =>
      decryptCachedNoteRecords(records, trackRemoteVersion),
    [trackRemoteVersion]
  );

  /**
   * Load encrypted notes from the local sync cache. This is the local-first
   * fast path used before refreshing from Supabase.
   */
  const loadCachedNotes = useCallback(async (): Promise<Note[]> => {
    if (!user?.id || !isEncryptionReady) return [];

    const records = await listLocalNoteOperations(user.id);
    return decryptLocalRecords(records);
  }, [user?.id, isEncryptionReady, decryptLocalRecords]);

  /**
   * Load all notes from Supabase, update the encrypted local cache, decrypt,
   * and return the local canonical view.
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

      let maxRemoteVersion = 0;
      for (const raw of rawNotes) {
        maxRemoteVersion = Math.max(maxRemoteVersion, raw.version);
        await upsertLocalNoteOperation({
          userId: user.id,
          noteId: raw.entityId,
          encryptedPayload: raw.encryptedPayload,
          operationType: raw.operationType === 'delete' || raw.isDeleted ? 'delete' : 'update',
          version: raw.version,
        });
      }

      if (maxRemoteVersion > 0) {
        await setLocalSyncCursor(user.id, maxRemoteVersion);
      }

      const cachedRecords = await listLocalNoteOperations(user.id);
      return decryptLocalRecords(cachedRecords);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notes';
      setLoadError(message);
      console.error('[useNotesSync] Error loading notes:', err);

      const cachedRecords = await listLocalNoteOperations(user.id);
      return decryptLocalRecords(cachedRecords);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isEncryptionReady, getAdapter, decryptLocalRecords]);

  /**
   * Encrypt and sync a note operation
   */
  const syncNoteOperation = useCallback(
    async (
      operationType: 'create' | 'update' | 'delete',
      noteId: string,
      noteData?: SyncNoteOperation,
      versionOverride?: number
    ): Promise<void> => {
      const version = versionOverride ?? noteData?.version ?? 1;

      const buildEncryptedPayload = async (): Promise<string> => {
        if (!isEncryptionReady) {
          throw new Error('Encryption not ready; cannot create a sync payload');
        }

        if (operationType === 'delete') {
          return encryptedSyncService.encrypt(createDeleteMarker(noteId, version));
        }

        if (!noteData) {
          throw new Error(`Cannot sync ${operationType} - no data available`);
        }

        return encryptedSyncService.encrypt(noteData);
      };

      const persistLocalPayload = async (encryptedPayload: string): Promise<void> => {
        if (!user?.id) return;

        await upsertLocalNoteOperation({
          userId: user.id,
          noteId,
          encryptedPayload,
          operationType,
          version,
        });
      };

      const buildOperationDraft = (encryptedPayload: string): SyncOperationDraft => ({
        operationType,
        entityType: 'note',
        entityId: noteId,
        encryptedPayload,
        version,
      });

      const queueEncryptedOperation = async (encryptedPayload: string): Promise<void> => {
        await offlineQueue.enqueue({
          id: uuidv4(),
          userId: user?.id || '',
          sessionId: '',
          timestamp: Date.now(),
          ...buildOperationDraft(encryptedPayload),
        });
      };

      if (user?.id && !isRecoveryBackupSatisfied(user.id)) {
        try {
          const encryptedPayload = await buildEncryptedPayload();
          await persistLocalPayload(encryptedPayload);
          setLoadError(
            'Recovery key backup required before cloud sync. Verify your recovery key to enable encrypted sync.'
          );
        } catch (localPersistError) {
          console.error(
            `[useNotesSync] Failed to save ${operationType} locally:`,
            localPersistError
          );
        }

        console.warn('[useNotesSync] Cloud sync blocked until recovery key backup is verified', {
          operationType,
          noteId,
          version,
        });
        return;
      }

      // Handle offline queue for all operations, including encrypted deletions.
      if (!syncService || !isInitialized) {
        console.warn('[useNotesSync] Sync service not available, queuing operation for later', {
          operationType,
          noteId,
          version,
        });

        try {
          const encryptedPayload = await buildEncryptedPayload();
          await persistLocalPayload(encryptedPayload);

          await queueEncryptedOperation(encryptedPayload);
        } catch (queueError) {
          console.error(`[useNotesSync] Cannot queue ${operationType}:`, queueError);
        }
        return;
      }

      try {
        const encryptedPayload = await buildEncryptedPayload();
        await persistLocalPayload(encryptedPayload);

        await syncService.enqueueOperation(buildOperationDraft(encryptedPayload));
      } catch (_error) {
        console.error(`[useNotesSync] Failed to sync ${operationType}:`, _error);

        // Queue for retry on transient sync errors. Do not queue plaintext or marker
        // placeholders; the Supabase adapter expects encrypted payloads only.
        try {
          const encryptedPayload = await buildEncryptedPayload();
          await persistLocalPayload(encryptedPayload);

          await queueEncryptedOperation(encryptedPayload);
        } catch (queueError) {
          console.error(`[useNotesSync] Failed to queue ${operationType}:`, queueError);
        }
      }
    },
    [syncService, isInitialized, isEncryptionReady, user?.id]
  );

  /**
   * Sync a note creation
   */
  const syncCreateNote = useCallback(
    async (note: Omit<Note, 'id' | 'updatedAt'>, existingNoteId?: string): Promise<string> => {
      const noteId = existingNoteId ?? uuidv4();
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
      const version = getNextVersion(noteId);
      await syncNoteOperation('delete', noteId, undefined, version);
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
        await syncService.enqueueOperation(toSyncOperationDraft(queued.operation));
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

  /**
   * Subscribe to decrypted note changes that arrive from another session/device.
   * The sync engine is intentionally storage-agnostic, so UI/local-store code
   * decides how to apply these changes.
   */
  const subscribeToRemoteNoteChanges = useCallback(
    (onChange: (change: RemoteNoteChange) => void): (() => void) => {
      if (!syncService || !isInitialized || !isEncryptionReady) {
        return () => {};
      }

      const handleRemoteOperation = (operation: SyncOperation) => {
        if (operation.entityType !== 'note') return;

        void (async () => {
          try {
            trackRemoteVersion(operation.entityId, operation.version);

            await upsertLocalNoteOperation({
              userId: operation.userId,
              noteId: operation.entityId,
              encryptedPayload: operation.encryptedPayload,
              operationType: operation.operationType,
              version: operation.version,
              updatedAt: operation.timestamp,
            });
            await setLocalSyncCursor(operation.userId, operation.version);

            onChange(await syncOperationToRemoteNoteChange(operation));
          } catch (error) {
            console.error('[useNotesSync] Failed to apply remote note operation:', error);
          }
        })();
      };

      syncService.on('remoteOperationApplied', handleRemoteOperation);

      return () => {
        syncService.off('remoteOperationApplied', handleRemoteOperation);
      };
    },
    [syncService, isInitialized, isEncryptionReady, trackRemoteVersion]
  );

  const recoveryBackupVerified = Boolean(recoveryBackupState.verifiedAt);
  const recoveryBackupBypassed = Boolean(recoveryBackupState.bypassedAt);
  const requiresRecoveryBackup = Boolean(
    user?.id && isEncryptionReady && !recoveryBackupVerified && !recoveryBackupBypassed
  );

  return {
    loadCachedNotes,
    loadNotes,
    syncCreateNote,
    syncUpdateNote,
    syncDeleteNote,
    processOfflineQueue,
    deleteLockedNotes,
    subscribeToRemoteNoteChanges,
    exportRecoveryKey: () => encryptedSyncService.exportRecoveryKey(),
    importRecoveryKey: async (recoveryKey: string) => {
      await encryptedSyncService.importRecoveryKey(recoveryKey);
      if (user?.id) {
        setRecoveryBackupState(markRecoveryBackupVerified(user.id));
      }
      setEncryptionError(null);
      setLoadError(null);
      setIsEncryptionReady(true);
    },
    verifyRecoveryKeyBackup: async (recoveryKey: string): Promise<boolean> => {
      if (!user?.id) {
        throw new Error('No signed-in user available for recovery-key verification');
      }

      const matchesCurrentKey = encryptedSyncService.verifyRecoveryKey(recoveryKey);
      if (!matchesCurrentKey) {
        return false;
      }

      const state = markRecoveryBackupVerified(user.id);
      setRecoveryBackupState(state);
      setLoadError(null);
      return true;
    },
    bypassRecoveryKeyBackup: (): void => {
      if (!user?.id) {
        throw new Error('No signed-in user available for recovery-key bypass');
      }

      const state = markRecoveryBackupBypassed(user.id);
      setRecoveryBackupState(state);
    },
    recoveryBackupState,
    recoveryBackupVerified,
    recoveryBackupBypassed,
    requiresRecoveryBackup,
    isSyncEnabled: isInitialized && !!syncService,
    isCloudSyncBlockedByRecoveryBackup: requiresRecoveryBackup,
    isEncryptionReady,
    encryptionError,
    isLoading,
    loadError,
  };
}
