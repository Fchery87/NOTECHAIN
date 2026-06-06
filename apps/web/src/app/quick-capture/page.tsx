'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useNotesSync } from '@/lib/sync/useNotesSync';
import { createQuickCaptureDraft, quickCaptureSearchParams } from '@/lib/quickCapture/quickCapture';

function QuickCaptureForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { syncCreateNote, isEncryptionReady, encryptionError } = useNotesSync();
  const initialDraft = useMemo(
    () => createQuickCaptureDraft(quickCaptureSearchParams(searchParams)),
    [searchParams]
  );
  const [title, setTitle] = useState(initialDraft.title);
  const [content, setContent] = useState(initialDraft.content);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(initialDraft.title);
    setContent(initialDraft.content);
  }, [initialDraft]);

  const handleSave = async () => {
    setStatus(null);
    setError(null);
    setIsSaving(true);

    try {
      if (!isEncryptionReady) {
        throw new Error(encryptionError || 'Unlock encryption before quick capture');
      }

      await syncCreateNote({ title: title.trim() || 'Inbox Capture', content });
      setStatus('Captured to your encrypted inbox.');
      setTimeout(() => router.push('/notes'), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quick capture');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout pageTitle="Quick Capture">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-600 font-medium">Inbox</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">Quick capture</h1>
          <p className="mt-2 text-sm text-stone-500">
            Save a thought, link, or shared text into the encrypted local note cache.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="quick-title" className="block text-sm font-medium text-stone-700">
                Title
              </label>
              <input
                id="quick-title"
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label htmlFor="quick-content" className="block text-sm font-medium text-stone-700">
                Content
              </label>
              <textarea
                id="quick-content"
                value={content}
                onChange={event => setContent(event.target.value)}
                rows={10}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || !isEncryptionReady}
                className="rounded-lg bg-stone-900 px-4 py-2 text-stone-50 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save to Inbox'}
              </button>
              <button
                onClick={() => router.push('/notes')}
                className="rounded-lg bg-stone-200 px-4 py-2 text-stone-700 hover:bg-stone-300"
              >
                Open Notes
              </button>
            </div>

            {status && (
              <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {status}
              </p>
            )}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {!isEncryptionReady && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {encryptionError ||
                  'Encryption is not ready yet. Restore or verify your recovery key first.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function QuickCapturePage() {
  return (
    <Suspense fallback={<div className="p-6 text-stone-600">Loading quick capture…</div>}>
      <QuickCaptureForm />
    </Suspense>
  );
}
