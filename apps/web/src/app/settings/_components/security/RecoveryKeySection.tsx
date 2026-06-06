import { useState } from 'react';
import { downloadTextFile } from '@/lib/browser/downloadFile';

interface RecoveryKeySectionProps {
  isEncryptionReady: boolean;
  exportRecoveryKey: () => Promise<string>;
  importRecoveryKey: (recoveryKey: string) => Promise<void>;
}

export function RecoveryKeySection({
  isEncryptionReady,
  exportRecoveryKey,
  importRecoveryKey,
}: RecoveryKeySectionProps) {
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveryKeyToImport, setRecoveryKeyToImport] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecoveryBusy, setIsRecoveryBusy] = useState(false);

  const handleExportRecoveryKey = async () => {
    setRecoveryError(null);
    setRecoveryStatus(null);
    setIsRecoveryBusy(true);

    try {
      const exported = await exportRecoveryKey();
      setRecoveryKey(exported);
      setRecoveryStatus(
        'Recovery key exported. Store it somewhere safe; NoteChain cannot recover it for you.'
      );
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : 'Failed to export recovery key');
    } finally {
      setIsRecoveryBusy(false);
    }
  };

  const handleCopyRecoveryKey = async () => {
    if (!recoveryKey) return;

    try {
      await navigator.clipboard.writeText(recoveryKey);
      setRecoveryStatus('Recovery key copied to clipboard.');
      setRecoveryError(null);
    } catch {
      setRecoveryError('Could not copy recovery key. Select and copy it manually.');
    }
  };

  const handleDownloadRecoveryKey = () => {
    if (!recoveryKey) return;

    downloadTextFile({
      filename: 'notechain-recovery-key.txt',
      mimeType: 'text/plain',
      content: [
        'NoteChain Recovery Key',
        'Keep this key private. Anyone with this key can decrypt your NoteChain data.',
        '',
        recoveryKey,
        '',
      ].join('\n'),
    });
    setRecoveryStatus('Recovery key downloaded. Store it in a password manager or secure vault.');
  };

  const handleImportRecoveryKey = async () => {
    setRecoveryError(null);
    setRecoveryStatus(null);
    setIsRecoveryBusy(true);

    try {
      await importRecoveryKey(recoveryKeyToImport);
      setRecoveryKeyToImport('');
      setRecoveryStatus('Recovery key imported. Encryption is ready on this device.');
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : 'Failed to import recovery key');
    } finally {
      setIsRecoveryBusy(false);
    }
  };

  return (
    <div className="mb-8">
      <label className="block text-sm font-medium text-stone-700 mb-3">Recovery Key</label>
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-4">
        <div>
          <p className="font-medium text-stone-900">Export recovery key</p>
          <p className="text-sm text-stone-500 mt-1">
            Store this in a password manager or secure vault. Anyone with this key can decrypt your
            NoteChain data.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportRecoveryKey}
            disabled={isRecoveryBusy || !isEncryptionReady}
            className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRecoveryBusy ? 'Working…' : 'Export Recovery Key'}
          </button>
          <button
            onClick={handleCopyRecoveryKey}
            disabled={!recoveryKey}
            className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Copy
          </button>
          <button
            onClick={handleDownloadRecoveryKey}
            disabled={!recoveryKey}
            className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Download
          </button>
        </div>

        {recoveryKey && (
          <textarea
            readOnly
            value={recoveryKey}
            rows={3}
            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg font-mono text-xs text-stone-700"
            aria-label="Exported recovery key"
          />
        )}

        <div className="pt-4 border-t border-stone-200">
          <p className="font-medium text-stone-900">Import recovery key</p>
          <p className="text-sm text-stone-500 mt-1">
            Use this when setting up a new device or when encrypted data cannot be opened with the
            current local key.
          </p>
          <textarea
            value={recoveryKeyToImport}
            onChange={event => setRecoveryKeyToImport(event.target.value)}
            rows={3}
            placeholder="NC-RK1:..."
            className="mt-3 w-full px-3 py-2 bg-white border border-stone-200 rounded-lg font-mono text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            aria-label="Recovery key to import"
          />
          <button
            onClick={handleImportRecoveryKey}
            disabled={isRecoveryBusy || recoveryKeyToImport.trim().length === 0}
            className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Import Recovery Key
          </button>
        </div>

        {recoveryStatus && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {recoveryStatus}
          </p>
        )}
        {recoveryError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {recoveryError}
          </p>
        )}
      </div>
    </div>
  );
}
