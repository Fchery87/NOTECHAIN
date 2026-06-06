import { useState } from 'react';
import { exportJsonWorkspace, importJsonWorkspace } from '@/lib/backup/jsonWorkspacePortability';
import { downloadTextFile } from '@/lib/browser/downloadFile';

interface JsonWorkspacePortabilitySectionProps {
  userId?: string;
  isEncryptionReady: boolean;
}

export function JsonWorkspacePortabilitySection({
  userId,
  isEncryptionReady,
}: JsonWorkspacePortabilitySectionProps) {
  const [jsonWorkspaceFile, setJsonWorkspaceFile] = useState<File | null>(null);
  const [jsonWorkspaceStatus, setJsonWorkspaceStatus] = useState<string | null>(null);
  const [jsonWorkspaceError, setJsonWorkspaceError] = useState<string | null>(null);
  const [isJsonWorkspaceBusy, setIsJsonWorkspaceBusy] = useState(false);

  const handleExportJsonWorkspace = async () => {
    setJsonWorkspaceError(null);
    setJsonWorkspaceStatus(null);
    setIsJsonWorkspaceBusy(true);

    try {
      if (!userId) throw new Error('Sign in before exporting JSON workspace');
      if (!isEncryptionReady) throw new Error('Unlock encryption before exporting JSON workspace');

      const workspaceJson = await exportJsonWorkspace(userId);
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile({
        filename: `notechain-workspace-${date}.json`,
        content: workspaceJson,
        mimeType: 'application/json',
      });
      setJsonWorkspaceStatus(
        'JSON workspace downloaded. This file contains readable note content.'
      );
    } catch (error) {
      setJsonWorkspaceError(
        error instanceof Error ? error.message : 'Failed to export JSON workspace'
      );
    } finally {
      setIsJsonWorkspaceBusy(false);
    }
  };

  const handleImportJsonWorkspace = async () => {
    setJsonWorkspaceError(null);
    setJsonWorkspaceStatus(null);
    setIsJsonWorkspaceBusy(true);

    try {
      if (!userId) throw new Error('Sign in before importing JSON workspace');
      if (!isEncryptionReady) throw new Error('Unlock encryption before importing JSON workspace');
      if (!jsonWorkspaceFile) throw new Error('Choose a NoteChain JSON workspace file first');

      const result = await importJsonWorkspace(userId, await jsonWorkspaceFile.text());
      setJsonWorkspaceFile(null);
      setJsonWorkspaceStatus(
        `Imported ${result.imported} JSON workspace note${result.imported === 1 ? '' : 's'}${result.skipped ? ` and skipped ${result.skipped} empty note${result.skipped === 1 ? '' : 's'}` : ''}. Refresh Notes to load imported encrypted notes.`
      );
    } catch (error) {
      setJsonWorkspaceError(
        error instanceof Error ? error.message : 'Failed to import JSON workspace'
      );
    } finally {
      setIsJsonWorkspaceBusy(false);
    }
  };

  return (
    <div className="mb-8">
      <label className="block text-sm font-medium text-stone-700 mb-3">JSON Workspace</label>
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-4">
        <div>
          <p className="font-medium text-stone-900">Export JSON workspace</p>
          <p className="text-sm text-stone-500 mt-1">
            Exports a versioned, readable JSON workspace with decrypted note content. Use encrypted
            backup for private backup storage.
          </p>
          <button
            onClick={handleExportJsonWorkspace}
            disabled={isJsonWorkspaceBusy || !userId || !isEncryptionReady}
            className="mt-3 px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isJsonWorkspaceBusy ? 'Working…' : 'Download JSON Workspace'}
          </button>
        </div>

        <div className="pt-4 border-t border-stone-200">
          <p className="font-medium text-stone-900">Import JSON workspace</p>
          <p className="text-sm text-stone-500 mt-1">
            Imports a NoteChain JSON workspace into the encrypted local note cache.
          </p>
          <input
            type="file"
            accept="application/json,.json"
            onChange={event => setJsonWorkspaceFile(event.target.files?.[0] ?? null)}
            className="mt-3 block w-full text-sm text-stone-600 file:mr-4 file:rounded-lg file:border-0 file:bg-stone-200 file:px-4 file:py-2 file:text-stone-700 hover:file:bg-stone-300"
            aria-label="JSON workspace file"
          />
          <button
            onClick={handleImportJsonWorkspace}
            disabled={isJsonWorkspaceBusy || !jsonWorkspaceFile || !isEncryptionReady}
            className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Import JSON Workspace
          </button>
        </div>

        {jsonWorkspaceStatus && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {jsonWorkspaceStatus}
          </p>
        )}
        {jsonWorkspaceError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {jsonWorkspaceError}
          </p>
        )}
      </div>
    </div>
  );
}
