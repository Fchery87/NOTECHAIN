'use client';

import {
  clearLocalNoteOperations,
  clearLocalSyncCursor,
  getLocalSyncCursor,
  listLocalNoteOperations,
  setLocalSyncCursor,
  upsertLocalNoteOperation,
  type LocalNoteOperationType,
  type LocalSyncedNoteRecord,
} from '@/lib/sync/noteSyncLocalStore';

export const ENCRYPTED_WORKSPACE_BACKUP_FORMAT = 'notechain.encrypted-workspace-backup';
export const ENCRYPTED_WORKSPACE_BACKUP_VERSION = 1;

export interface EncryptedBackupNoteOperation {
  noteId: string;
  encryptedPayload: string;
  operationType: LocalNoteOperationType;
  version: number;
  updatedAt: number;
  isDeleted: boolean;
}

export interface EncryptedWorkspaceBackupV1 {
  format: typeof ENCRYPTED_WORKSPACE_BACKUP_FORMAT;
  version: typeof ENCRYPTED_WORKSPACE_BACKUP_VERSION;
  exportedAt: string;
  userId: string;
  encryption: {
    payloads: 'encrypted-note-sync-payloads';
    recoveryKeyRequired: true;
  };
  data: {
    noteOperations: EncryptedBackupNoteOperation[];
    syncCursor: {
      lastSyncVersion: number;
    };
  };
  integrity: {
    algorithm: 'SHA-256';
    checksum: string;
  };
}

export interface ImportEncryptedWorkspaceBackupOptions {
  replaceExisting?: boolean;
}

export interface ImportEncryptedWorkspaceBackupResult {
  importedNoteOperations: number;
  lastSyncVersion: number;
}

function assertBrowserCrypto(): Crypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto is required to create or verify encrypted backups');
  }

  return crypto;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => canonicalize(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map(key => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(',')}}`;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Base64Url(content: string): Promise<string> {
  const digest = await assertBrowserCrypto().subtle.digest(
    'SHA-256',
    new TextEncoder().encode(content)
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

function withoutIntegrity(
  backup: Omit<EncryptedWorkspaceBackupV1, 'integrity'> | EncryptedWorkspaceBackupV1
): Omit<EncryptedWorkspaceBackupV1, 'integrity'> {
  const { integrity: _integrity, ...rest } = backup as EncryptedWorkspaceBackupV1;
  return rest;
}

async function checksumBackup(
  backup: Omit<EncryptedWorkspaceBackupV1, 'integrity'> | EncryptedWorkspaceBackupV1
): Promise<string> {
  return sha256Base64Url(canonicalize(withoutIntegrity(backup)));
}

function normalizeNoteOperation(record: LocalSyncedNoteRecord): EncryptedBackupNoteOperation {
  return {
    noteId: record.noteId,
    encryptedPayload: record.encryptedPayload,
    operationType: record.operationType,
    version: Math.max(0, Math.floor(record.version || 0)),
    updatedAt: Math.max(0, Math.floor(record.updatedAt || 0)),
    isDeleted: Boolean(record.isDeleted),
  };
}

function isValidOperationType(value: unknown): value is LocalNoteOperationType {
  return value === 'create' || value === 'update' || value === 'delete';
}

function parseBackup(backupJson: string): EncryptedWorkspaceBackupV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(backupJson);
  } catch {
    throw new Error('Invalid encrypted backup JSON');
  }

  const backup = parsed as EncryptedWorkspaceBackupV1;
  if (backup?.format !== ENCRYPTED_WORKSPACE_BACKUP_FORMAT) {
    throw new Error('Unsupported backup format');
  }
  if (backup.version !== ENCRYPTED_WORKSPACE_BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${String(backup.version)}`);
  }
  if (!backup.userId || typeof backup.userId !== 'string') {
    throw new Error('Backup is missing user id');
  }
  if (!Array.isArray(backup.data?.noteOperations)) {
    throw new Error('Backup is missing note operations');
  }
  if (!backup.integrity?.checksum || backup.integrity.algorithm !== 'SHA-256') {
    throw new Error('Backup is missing integrity metadata');
  }

  for (const operation of backup.data.noteOperations) {
    if (!operation.noteId || typeof operation.noteId !== 'string') {
      throw new Error('Backup contains a note operation without a note id');
    }
    if (!operation.encryptedPayload || typeof operation.encryptedPayload !== 'string') {
      throw new Error('Backup contains a note operation without encrypted payload');
    }
    if (!isValidOperationType(operation.operationType)) {
      throw new Error('Backup contains an invalid note operation type');
    }
    if (!Number.isFinite(operation.version) || operation.version < 0) {
      throw new Error('Backup contains an invalid note operation version');
    }
    if (!Number.isFinite(operation.updatedAt) || operation.updatedAt < 0) {
      throw new Error('Backup contains an invalid note operation timestamp');
    }
  }

  return backup;
}

export async function createEncryptedWorkspaceBackup(
  userId: string
): Promise<EncryptedWorkspaceBackupV1> {
  if (!userId) {
    throw new Error('Cannot export encrypted backup without a user id');
  }

  const [noteOperations, lastSyncVersion] = await Promise.all([
    listLocalNoteOperations(userId),
    getLocalSyncCursor(userId),
  ]);

  const backupWithoutIntegrity: Omit<EncryptedWorkspaceBackupV1, 'integrity'> = {
    format: ENCRYPTED_WORKSPACE_BACKUP_FORMAT,
    version: ENCRYPTED_WORKSPACE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    userId,
    encryption: {
      payloads: 'encrypted-note-sync-payloads',
      recoveryKeyRequired: true,
    },
    data: {
      noteOperations: noteOperations.map(normalizeNoteOperation),
      syncCursor: {
        lastSyncVersion,
      },
    },
  };

  return {
    ...backupWithoutIntegrity,
    integrity: {
      algorithm: 'SHA-256',
      checksum: await checksumBackup(backupWithoutIntegrity),
    },
  };
}

export async function exportEncryptedWorkspaceBackupJson(userId: string): Promise<string> {
  const backup = await createEncryptedWorkspaceBackup(userId);
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export async function importEncryptedWorkspaceBackupJson(
  backupJson: string,
  userId: string,
  options: ImportEncryptedWorkspaceBackupOptions = {}
): Promise<ImportEncryptedWorkspaceBackupResult> {
  if (!userId) {
    throw new Error('Cannot import encrypted backup without a user id');
  }

  const backup = parseBackup(backupJson);
  if (backup.userId !== userId) {
    throw new Error('Backup belongs to a different user');
  }

  const expectedChecksum = await checksumBackup(backup);
  if (expectedChecksum !== backup.integrity.checksum) {
    throw new Error('Encrypted backup integrity check failed');
  }

  if (options.replaceExisting) {
    await clearLocalNoteOperations(userId);
    await clearLocalSyncCursor(userId);
  }

  for (const operation of backup.data.noteOperations) {
    await upsertLocalNoteOperation({
      userId,
      noteId: operation.noteId,
      encryptedPayload: operation.encryptedPayload,
      operationType: operation.operationType,
      version: operation.version,
      updatedAt: operation.updatedAt,
    });
  }

  const lastSyncVersion = Math.max(0, Math.floor(backup.data.syncCursor?.lastSyncVersion || 0));
  await setLocalSyncCursor(userId, lastSyncVersion);

  return {
    importedNoteOperations: backup.data.noteOperations.length,
    lastSyncVersion,
  };
}
