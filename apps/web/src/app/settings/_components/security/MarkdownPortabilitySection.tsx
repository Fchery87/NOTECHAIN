import { useState } from 'react';
import { exportMarkdownNotes, importMarkdownNotes } from '@/lib/backup/markdownPortability';
import { downloadTextFile } from '@/lib/browser/downloadFile';

interface MarkdownPortabilitySectionProps {
  userId?: string;
  isEncryptionReady: boolean;
}

export function MarkdownPortabilitySection({
  userId,
  isEncryptionReady,
}: MarkdownPortabilitySectionProps) {
  const [markdownFiles, setMarkdownFiles] = useState<File[]>([]);
  const [markdownStatus, setMarkdownStatus] = useState<string | null>(null);
  const [markdownError, setMarkdownError] = useState<string | null>(null);
  const [isMarkdownBusy, setIsMarkdownBusy] = useState(false);

  const handleExportMarkdown = async () => {
    setMarkdownError(null);
    setMarkdownStatus(null);
    setIsMarkdownBusy(true);

    try {
      if (!userId) throw new Error('Sign in before exporting Markdown');
      if (!isEncryptionReady) throw new Error('Unlock encryption before exporting Markdown');

      const files = await exportMarkdownNotes(userId);
      if (files.length === 0) {
        setMarkdownStatus('No local notes are available to export.');
        return;
      }

      for (const file of files) {
        downloadTextFile({
          filename: file.filename,
          content: file.content,
          mimeType: 'text/markdown',
        });
      }

      setMarkdownStatus(
        `Downloaded ${files.length} Markdown file${files.length === 1 ? '' : 's'}.`
      );
    } catch (error) {
      setMarkdownError(error instanceof Error ? error.message : 'Failed to export Markdown');
    } finally {
      setIsMarkdownBusy(false);
    }
  };

  const handleImportMarkdown = async () => {
    setMarkdownError(null);
    setMarkdownStatus(null);
    setIsMarkdownBusy(true);

    try {
      if (!userId) throw new Error('Sign in before importing Markdown');
      if (!isEncryptionReady) throw new Error('Unlock encryption before importing Markdown');
      if (markdownFiles.length === 0) throw new Error('Choose one or more Markdown files first');

      const fileInputs = await Promise.all(
        markdownFiles.map(async file => ({ filename: file.name, content: await file.text() }))
      );
      const result = await importMarkdownNotes(userId, fileInputs);
      setMarkdownFiles([]);
      setMarkdownStatus(
        `Imported ${result.imported} Markdown note${result.imported === 1 ? '' : 's'}${result.skipped ? ` and skipped ${result.skipped} empty file${result.skipped === 1 ? '' : 's'}` : ''}. Refresh Notes to load imported encrypted notes.`
      );
    } catch (error) {
      setMarkdownError(error instanceof Error ? error.message : 'Failed to import Markdown');
    } finally {
      setIsMarkdownBusy(false);
    }
  };

  return (
    <div className="mb-8">
      <label className="block text-sm font-medium text-stone-700 mb-3">Markdown Portability</label>
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-4">
        <div>
          <p className="font-medium text-stone-900">Export readable Markdown</p>
          <p className="text-sm text-stone-500 mt-1">
            Decrypts your local encrypted note cache in this browser and downloads readable Markdown
            files with NoteChain frontmatter.
          </p>
          <button
            onClick={handleExportMarkdown}
            disabled={isMarkdownBusy || !userId || !isEncryptionReady}
            className="mt-3 px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isMarkdownBusy ? 'Working…' : 'Download Markdown Files'}
          </button>
        </div>

        <div className="pt-4 border-t border-stone-200">
          <p className="font-medium text-stone-900">Import Markdown</p>
          <p className="text-sm text-stone-500 mt-1">
            Imports Markdown files into the encrypted local note cache. Files with NoteChain
            frontmatter preserve note IDs and versions.
          </p>
          <input
            type="file"
            accept="text/markdown,text/plain,.md,.markdown"
            multiple
            onChange={event => setMarkdownFiles(Array.from(event.target.files ?? []))}
            className="mt-3 block w-full text-sm text-stone-600 file:mr-4 file:rounded-lg file:border-0 file:bg-stone-200 file:px-4 file:py-2 file:text-stone-700 hover:file:bg-stone-300"
            aria-label="Markdown files"
          />
          <button
            onClick={handleImportMarkdown}
            disabled={isMarkdownBusy || markdownFiles.length === 0 || !isEncryptionReady}
            className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Import Markdown Files
          </button>
        </div>

        {markdownStatus && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {markdownStatus}
          </p>
        )}
        {markdownError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {markdownError}
          </p>
        )}
      </div>
    </div>
  );
}
