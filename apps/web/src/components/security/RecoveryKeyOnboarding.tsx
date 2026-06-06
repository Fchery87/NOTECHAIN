'use client';

import { useState } from 'react';
import { useNotesSync } from '@/lib/sync/useNotesSync';

export default function RecoveryKeyOnboarding() {
  const {
    exportRecoveryKey,
    verifyRecoveryKeyBackup,
    bypassRecoveryKeyBackup,
    requiresRecoveryBackup,
    isEncryptionReady,
    encryptionError,
  } = useNotesSync();
  const [recoveryKey, setRecoveryKey] = useState('');
  const [verificationInput, setVerificationInput] = useState('');
  const [hasAcknowledgedRisk, setHasAcknowledgedRisk] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [showUnsafeBypass, setShowUnsafeBypass] = useState(false);

  if (!isEncryptionReady || encryptionError || !requiresRecoveryBackup) {
    return null;
  }

  const handleExport = async () => {
    setIsBusy(true);
    setError(null);
    setStatus(null);

    try {
      const exported = await exportRecoveryKey();
      setRecoveryKey(exported);
      setStatus('Recovery key generated. Copy or download it, then paste it below to verify.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export recovery key');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!recoveryKey) return;

    try {
      await navigator.clipboard.writeText(recoveryKey);
      setStatus('Recovery key copied to clipboard.');
      setError(null);
    } catch {
      setError('Could not copy recovery key. Select and copy it manually.');
    }
  };

  const handleDownload = () => {
    if (!recoveryKey) return;

    const blob = new Blob(
      [
        'NoteChain Recovery Key\n',
        'Keep this key private. Anyone with this key can decrypt your NoteChain data.\n\n',
        recoveryKey,
        '\n',
      ],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'notechain-recovery-key.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Recovery key downloaded. Store it in a password manager or secure vault.');
  };

  const handleVerify = async () => {
    setIsBusy(true);
    setError(null);
    setStatus(null);

    try {
      const verified = await verifyRecoveryKeyBackup(verificationInput.trim());
      if (!verified) {
        setError('That recovery key does not match this encrypted vault. Check it and try again.');
        return;
      }

      setStatus('Recovery key verified. Encrypted cloud sync is now enabled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify recovery key');
    } finally {
      setIsBusy(false);
    }
  };

  const handleUnsafeBypass = () => {
    if (!hasAcknowledgedRisk) return;

    bypassRecoveryKeyBackup();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-key-onboarding-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 px-6 py-5 text-stone-50">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">
            Required security step
          </p>
          <h2 id="recovery-key-onboarding-title" className="mt-2 text-2xl font-semibold">
            Save your NoteChain recovery key
          </h2>
          <p className="mt-2 text-sm text-stone-300">
            NoteChain cannot decrypt your data for you. If this browser is cleared or you set up a
            new device, this key is how you restore access.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Encrypted cloud sync is paused until this is verified.</strong> You can keep
            using local encrypted notes, but NoteChain will not upload them until your recovery path
            is confirmed.
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExport}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {recoveryKey ? 'Regenerate display' : 'Show Recovery Key'}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!recoveryKey}
                className="px-4 py-2 rounded-lg bg-stone-200 text-stone-700 hover:bg-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!recoveryKey}
                className="px-4 py-2 rounded-lg bg-stone-200 text-stone-700 hover:bg-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download
              </button>
            </div>

            {recoveryKey && (
              <textarea
                readOnly
                value={recoveryKey}
                rows={3}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-700"
                aria-label="Recovery key"
              />
            )}
          </div>

          <div className="space-y-3 border-t border-stone-200 pt-5">
            <label className="block text-sm font-medium text-stone-800" htmlFor="recovery-verify">
              Paste the recovery key here to verify your backup
            </label>
            <textarea
              id="recovery-verify"
              value={verificationInput}
              onChange={event => setVerificationInput(event.target.value)}
              rows={3}
              placeholder="NC-RK1:..."
              className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs text-stone-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={isBusy || verificationInput.trim().length === 0}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verify and Enable Sync
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

          <div className="border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={() => setShowUnsafeBypass(value => !value)}
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              I understand the risk and need to continue without verifying
            </button>

            {showUnsafeBypass && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 space-y-3">
                <label className="flex gap-2 text-sm text-red-800">
                  <input
                    type="checkbox"
                    checked={hasAcknowledgedRisk}
                    onChange={event => setHasAcknowledgedRisk(event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I understand that if I lose this local key before saving a recovery key, my
                    encrypted synced data may be unrecoverable.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleUnsafeBypass}
                  disabled={!hasAcknowledgedRisk}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue without verified backup
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
