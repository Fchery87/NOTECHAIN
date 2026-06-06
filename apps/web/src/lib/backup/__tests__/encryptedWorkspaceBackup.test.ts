import { afterEach, describe, expect, it } from 'vitest';
import {
  createEncryptedWorkspaceBackup,
  exportEncryptedWorkspaceBackupJson,
  importEncryptedWorkspaceBackupJson,
  ENCRYPTED_WORKSPACE_BACKUP_FORMAT,
  ENCRYPTED_WORKSPACE_BACKUP_VERSION,
} from '../encryptedWorkspaceBackup';
import {
  clearAllNoteSyncLocalStoreData,
  getLocalSyncCursor,
  listLocalNoteOperations,
  setLocalSyncCursor,
  upsertLocalNoteOperation,
} from '@/lib/sync/noteSyncLocalStore';

describe('encrypted workspace backup', () => {
  afterEach(async () => {
    await clearAllNoteSyncLocalStoreData();
  });

  it('exports a versioned encrypted backup without plaintext note fields', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: 'ciphertext:nonce:tag',
      operationType: 'create',
      version: 3,
      updatedAt: 1000,
    });
    await setLocalSyncCursor('user-1', 42);

    const backup = await createEncryptedWorkspaceBackup('user-1');

    expect(backup.format).toBe(ENCRYPTED_WORKSPACE_BACKUP_FORMAT);
    expect(backup.version).toBe(ENCRYPTED_WORKSPACE_BACKUP_VERSION);
    expect(backup.encryption).toEqual({
      payloads: 'encrypted-note-sync-payloads',
      recoveryKeyRequired: true,
    });
    expect(backup.data.noteOperations).toEqual([
      {
        noteId: 'note-1',
        encryptedPayload: 'ciphertext:nonce:tag',
        operationType: 'create',
        version: 3,
        updatedAt: 1000,
        isDeleted: false,
      },
    ]);
    expect(backup.data.syncCursor.lastSyncVersion).toBe(42);

    const serialized = JSON.stringify(backup);
    expect(serialized).not.toContain('title');
    expect(serialized).not.toContain('content');
  });

  it('imports a backup and restores encrypted note operations and cursor', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: 'ciphertext-v5:nonce:tag',
      operationType: 'update',
      version: 5,
      updatedAt: 2000,
    });
    await setLocalSyncCursor('user-1', 99);
    const backupJson = await exportEncryptedWorkspaceBackupJson('user-1');

    await clearAllNoteSyncLocalStoreData();

    const result = await importEncryptedWorkspaceBackupJson(backupJson, 'user-1', {
      replaceExisting: true,
    });

    expect(result).toEqual({ importedNoteOperations: 1, lastSyncVersion: 99 });
    expect(await listLocalNoteOperations('user-1')).toMatchObject([
      {
        userId: 'user-1',
        noteId: 'note-1',
        encryptedPayload: 'ciphertext-v5:nonce:tag',
        operationType: 'update',
        version: 5,
        updatedAt: 2000,
        isDeleted: false,
      },
    ]);
    expect(await getLocalSyncCursor('user-1')).toBe(99);
  });

  it('rejects a backup whose integrity checksum no longer matches', async () => {
    await upsertLocalNoteOperation({
      userId: 'user-1',
      noteId: 'note-1',
      encryptedPayload: 'ciphertext:nonce:tag',
      operationType: 'create',
      version: 1,
      updatedAt: 1000,
    });
    const backup = JSON.parse(await exportEncryptedWorkspaceBackupJson('user-1'));
    backup.data.noteOperations[0].encryptedPayload = 'tampered:nonce:tag';

    await expect(
      importEncryptedWorkspaceBackupJson(JSON.stringify(backup), 'user-1')
    ).rejects.toThrow('Encrypted backup integrity check failed');
  });

  it('rejects a backup for a different user', async () => {
    const backupJson = await exportEncryptedWorkspaceBackupJson('user-1');

    await expect(importEncryptedWorkspaceBackupJson(backupJson, 'user-2')).rejects.toThrow(
      'Backup belongs to a different user'
    );
  });
});
