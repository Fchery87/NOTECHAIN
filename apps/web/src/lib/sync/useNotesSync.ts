'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import type { SyncOperation } from '@notechain/sync-engine';
import { useSync } from './SyncProvider';
import { useUser } from '@/lib/supabase/UserProvider';
import { encryptedSyncService } from './encryptedSyncService';
import { offlineQueue } from './offlineQueue';
import { SupabaseSyncAdapter } from '@/lib/supabase/syncAdapter';
import {
  clearLocalNoteOperations,
  clearLocalSyncCursor,
  listLocalNoteOperations,
  setLocalSyncCursor,
  upsertLocalNoteOperation,
} from './noteSyncLocalStore';
import type { PassphraseEnvelope } from '@notechain/core-crypto';
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

const VAULT_CHANGED = 'notechain:vault-changed';

interface VaultChangedDetail {
  userId: string;
  envelope?: PassphraseEnvelope | null;
}

// Every component that calls useNotesSync holds its own copy of vault state, so
// unlocking or setting a passphrase in one dialog has to reach the others.
function announceVaultChange(detail: VaultChangedDetail): void {
  window.dispatchEvent(new CustomEvent<VaultChangedDetail>(VAULT_CHANGED, { detail }));
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
  const [encryptionError, setEncryptionError] = useState<string | null>(null);
  // undefined until the server has been asked; null means no passphrase is set yet.
  const [vaultEnvelope, setVaultEnvelope] = useState<PassphraseEnvelope | null | undefined>(
    undefined
  );
  const versionRef = useRef<Record<string, number>>({});
  const adapterRef = useRef<SupabaseSyncAdapter | null>(null);

  // Lazily create adapter
  const getAdapter = useCallback(() => {
    if (!adapterRef.current) {
      adapterRef.current = new SupabaseSyncAdapter();
    }
    return adapterRef.current;
  }, []);

  // Initialize encryption after auth is known. The local master key is scoped
  // by user ID so stale key material from a previous account cannot lock a
  // brand-new account into the recovery flow.
  useEffect(() => {
    if (!user?.id) {
      encryptedSyncService.resetSession();
      setEncryptionError(null);
      setLoadError(null);
      setIsEncryptionReady(false);
      setVaultEnvelope(undefined);
      return;
    }

    let isCancelled = false;

    (async () => {
      try {
        const adapter = getAdapter();
        const [remoteVaultState, envelopeResult] = await Promise.all([
          adapter.hasEncryptedDataForUser(user.id),
          adapter.getVaultEnvelope(user.id),
        ]);
        if (!remoteVaultState.success) {
          throw new Error(
            `Could not check existing encrypted vault data: ${remoteVaultState.error}`
          );
        }
        if (!envelopeResult.success) {
          throw new Error(`Could not load your vault: ${envelopeResult.error}`);
        }

        if (isCancelled) return;
        setVaultEnvelope(envelopeResult.envelope);

        await encryptedSyncService.initialize(user.id, {
          allowCreate: !remoteVaultState.hasData && !envelopeResult.envelope,
        });

        if (isCancelled) return;
        setEncryptionError(null);
        setLoadError(null);
        setIsEncryptionReady(true);
      } catch (error) {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : 'Encryption recovery required';
        setEncryptionError(message);
        setLoadError(message);
        setIsEncryptionReady(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [user?.id, getAdapter]);

  useEffect(() => {
    if (!user?.id) return;

    const handleVaultChange = (event: Event) => {
      const detail = (event as CustomEvent<VaultChangedDetail>).detail;
      if (detail.userId !== user.id) return;

      if ('envelope' in detail) {
        setVaultEnvelope(detail.envelope);
      }
      if (encryptedSyncService.getSessionUserId() === user.id) {
        setEncryptionError(null);
        setLoadError(null);
        setIsEncryptionReady(true);
      }
    };

    window.addEventListener(VAULT_CHANGED, handleVaultChange);
    return () => window.removeEventListener(VAULT_CHANGED, handleVaultChange);
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

      if (user?.id && !vaultEnvelope) {
        try {
          const encryptedPayload = await buildEncryptedPayload();
          await persistLocalPayload(encryptedPayload);
          setLoadError('Set a vault passphrase to turn on encrypted cloud sync.');
        } catch (localPersistError) {
          console.error(
            `[useNotesSync] Failed to save ${operationType} locally:`,
            localPersistError
          );
        }

        console.warn('[useNotesSync] Cloud sync blocked until a vault passphrase is set', {
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
    [syncService, isInitialized, isEncryptionReady, user?.id, vaultEnvelope]
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
   * Destructively reset the current user's encrypted vault.
   *
   * This is only for users who do not have the old recovery key. Existing
   * encrypted notes and the old passphrase envelope are deleted, a fresh local
   * master key is created, and the user is asked to set a new vault passphrase.
   */
  const resetEncryptedVault = useCallback(async (): Promise<void> => {
    if (!user?.id) {
      throw new Error('No signed-in user available for vault reset');
    }

    const adapter = getAdapter();
    const remoteReset = await adapter.deleteAllEncryptedDataForUser(user.id);
    if (!remoteReset.success) {
      throw new Error(remoteReset.error || 'Failed to delete old encrypted vault data');
    }

    await offlineQueue.clearForUser(user.id);
    await clearLocalNoteOperations(user.id);
    await clearLocalSyncCursor(user.id);

    await encryptedSyncService.resetVault(user.id);

    announceVaultChange({ userId: user.id, envelope: null });
  }, [user?.id, getAdapter]);

  const unlockWithPassphrase = useCallback(
    async (passphrase: string): Promise<void> => {
      if (!user?.id || !vaultEnvelope) {
        throw new Error('This account has no vault passphrase yet. Use your recovery key.');
      }

      await encryptedSyncService.unlockWithEnvelope(vaultEnvelope, passphrase);
      announceVaultChange({ userId: user.id });
    },
    [user?.id, vaultEnvelope]
  );

  const setVaultPassphrase = useCallback(
    async (passphrase: string): Promise<void> => {
      if (!user?.id) {
        throw new Error('No signed-in user available to set a vault passphrase');
      }

      const envelope = await encryptedSyncService.sealWithPassphrase(passphrase);
      const saved = await getAdapter().saveVaultEnvelope(user.id, envelope);
      if (!saved.success) {
        throw new Error(saved.error || 'Failed to save your vault passphrase');
      }

      announceVaultChange({ userId: user.id, envelope });
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

  const requiresVaultPassphrase = Boolean(user?.id && isEncryptionReady && vaultEnvelope === null);

  return {
    loadCachedNotes,
    loadNotes,
    syncCreateNote,
    syncUpdateNote,
    syncDeleteNote,
    processOfflineQueue,
    deleteLockedNotes,
    resetEncryptedVault,
    subscribeToRemoteNoteChanges,
    exportRecoveryKey: () => encryptedSyncService.exportRecoveryKey(),
    importRecoveryKey: async (recoveryKey: string) => {
      await encryptedSyncService.importRecoveryKey(recoveryKey);
      if (user?.id) {
        announceVaultChange({ userId: user.id });
      }
    },
    unlockWithPassphrase,
    setVaultPassphrase,
    hasVaultPassphrase: Boolean(vaultEnvelope),
    requiresVaultPassphrase,
    isSyncEnabled: isInitialized && !!syncService,
    isEncryptionReady,
    encryptionError,
    isLoading,
    loadError,
  };
}
