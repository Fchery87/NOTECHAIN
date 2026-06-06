import { useState } from 'react';
import {
  exportEncryptedWorkspaceBackupJson,
  importEncryptedWorkspaceBackupJson,
} from '@/lib/backup/encryptedWorkspaceBackup';
import { downloadTextFile } from '@/lib/browser/downloadFile';

interface EncryptedBackupSectionProps {
  userId?: string;
  isEncryptionReady: boolean;
}

export function EncryptedBackupSection({ userId, isEncryptionReady }: EncryptedBackupSectionProps) {
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [replaceExistingBackupData, setReplaceExistingBackupData] = useState(false);

  const handleExportEncryptedBackup = async () => {
    setBackupError(null);
    setBackupStatus(null);
    setIsBackupBusy(true);

    try {
      if (!userId) throw new Error('Sign in before exporting an encrypted backup');

      const backupJson = await exportEncryptedWorkspaceBackupJson(userId);
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile({
        filename: `notechain-encrypted-backup-${date}.json`,
        content: backupJson,
        mimeType: 'application/json',
      });
      setBackupStatus(
        'Encrypted backup downloaded. Restore requires this account and your recovery key.'
      );
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Failed to export encrypted backup');
    } finally {
      setIsBackupBusy(false);
    }
  };

  const handleImportEncryptedBackup = async () => {
    setBackupError(null);
    setBackupStatus(null);
    setIsBackupBusy(true);

    try {
      if (!userId) throw new Error('Sign in before importing an encrypted backup');
      if (!isEncryptionReady)
        throw new Error('Import your recovery key before restoring an encrypted backup');
      if (!backupFile) throw new Error('Choose a NoteChain encrypted backup file first');

      const result = await importEncryptedWorkspaceBackupJson(await backupFile.text(), userId, {
        replaceExisting: replaceExistingBackupData,
      });
      setBackupFile(null);
      setBackupStatus(
        `Encrypted backup restored: ${result.importedNoteOperations} note operation${result.importedNoteOperations === 1 ? '' : 's'}, sync cursor ${result.lastSyncVersion}. Refresh Notes to load restored cache.`
      );
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Failed to import encrypted backup');
    } finally {
      setIsBackupBusy(false);
    }
  };

  return (
    <div className="mb-8">
      <label className="block text-sm font-medium text-stone-700 mb-3">Encrypted Backup</label>
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-4">
        <div>
          <p className="font-medium text-stone-900">Export encrypted workspace backup</p>
          <p className="text-sm text-stone-500 mt-1">
            Downloads the local encrypted note cache and sync cursor. The backup does not contain
            plaintext notes and requires your recovery key to restore.
          </p>
          <button
            onClick={handleExportEncryptedBackup}
            disabled={isBackupBusy || !userId}
            className="mt-3 px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isBackupBusy ? 'Working…' : 'Download Encrypted Backup'}
          </button>
        </div>

        <div className="pt-4 border-t border-stone-200">
          <p className="font-medium text-stone-900">Import encrypted workspace backup</p>
          <p className="text-sm text-stone-500 mt-1">
            Restore into this signed-in account after importing the matching recovery key. Existing
            local cache can be merged or replaced.
          </p>
          <input
            type="file"
            accept="application/json,.json"
            onChange={event => setBackupFile(event.target.files?.[0] ?? null)}
            className="mt-3 block w-full text-sm text-stone-600 file:mr-4 file:rounded-lg file:border-0 file:bg-stone-200 file:px-4 file:py-2 file:text-stone-700 hover:file:bg-stone-300"
            aria-label="Encrypted backup file"
          />
          <label className="mt-3 flex items-start gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={replaceExistingBackupData}
              onChange={event => setReplaceExistingBackupData(event.target.checked)}
              className="mt-1"
            />
            Replace existing local encrypted cache before importing
          </label>
          <button
            onClick={handleImportEncryptedBackup}
            disabled={isBackupBusy || !backupFile || !isEncryptionReady}
            className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Import Encrypted Backup
          </button>
        </div>

        {backupStatus && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {backupStatus}
          </p>
        )}
        {backupError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {backupError}
          </p>
        )}
      </div>
    </div>
  );
}
