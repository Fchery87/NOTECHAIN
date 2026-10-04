'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/supabase/UserProvider';
import { useNotesSync } from '@/lib/sync/useNotesSync';

export default function RecoveryRequiredPrompt() {
  const router = useRouter();
  const { signOut } = useUser();
  const {
    encryptionError,
    hasVaultPassphrase,
    importRecoveryKey,
    isEncryptionReady,
    resetEncryptedVault,
    unlockWithPassphrase,
  } = useNotesSync();
  const [passphrase, setPassphrase] = useState('');
  const [useRecoveryKey, setUseRecoveryKey] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');

  if (isEncryptionReady || !encryptionError) {
    return null;
  }

  const showPassphrase = hasVaultPassphrase && !useRecoveryKey;

  const handleRestore = async () => {
    setIsBusy(true);
    setError(null);
    setStatus(null);

    try {
      if (showPassphrase) {
        await unlockWithPassphrase(passphrase);
        setPassphrase('');
      } else {
        await importRecoveryKey(recoveryKey.trim());
        setRecoveryKey('');
      }
      setStatus('Your encrypted vault is unlocked on this device.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock your vault');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const handleResetVault = async () => {
    if (resetConfirmation !== 'RESET') return;

    setIsBusy(true);
    setError(null);
    setStatus(null);

    try {
      await resetEncryptedVault();
      setResetConfirmation('');
      setStatus('Old encrypted vault reset. A new vault was created; choose its passphrase next.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset encrypted vault');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/80 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-required-title"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="bg-stone-900 px-6 py-5 text-stone-50">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Unlock your vault</p>
          <h2 id="recovery-required-title" className="mt-2 font-serif text-2xl font-medium">
            {showPassphrase ? 'Enter your vault passphrase' : 'Enter your recovery key'}
          </h2>
          <p className="mt-2 text-sm text-stone-300">
            Your notes are encrypted with a key only you can open. This device needs it once, then
            it stays unlocked here.
          </p>
        </div>

        <form
          className="space-y-5 p-6"
          onSubmit={event => {
            event.preventDefault();
            void handleRestore();
          }}
        >
          {showPassphrase ? (
            <div className="space-y-2">
              <label
                htmlFor="vault-unlock-passphrase"
                className="block text-sm font-medium text-stone-800"
              >
                Vault passphrase
              </label>
              <input
                id="vault-unlock-passphrase"
                type="password"
                value={passphrase}
                onChange={event => setPassphrase(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="recovery-required-key"
                className="block text-sm font-medium text-stone-800"
              >
                Recovery key
              </label>
              <textarea
                id="recovery-required-key"
                value={recoveryKey}
                onChange={event => setRecoveryKey(event.target.value)}
                rows={4}
                placeholder="NC-RK1:..."
                className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs text-stone-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                autoFocus
              />
              {!hasVaultPassphrase && (
                <p className="text-xs text-stone-500">
                  This account has no vault passphrase yet. After unlocking you can set one, and
                  other devices will only need that.
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-stone-500">{encryptionError}</p>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={
                isBusy ||
                (showPassphrase ? passphrase.length === 0 : recoveryKey.trim().length === 0)
              }
              className="rounded-lg bg-stone-900 px-4 py-2 text-stone-50 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? 'Unlocking…' : 'Unlock'}
            </button>
            {hasVaultPassphrase && (
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryKey(current => !current);
                  setError(null);
                }}
                className="rounded-lg bg-stone-100 px-4 py-2 text-stone-800 hover:bg-stone-200"
              >
                {useRecoveryKey ? 'Use passphrase' : 'Use recovery key'}
              </button>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg bg-stone-200 px-4 py-2 text-stone-700 hover:bg-stone-300"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => setShowReset(current => !current)}
              className="rounded-lg border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50"
            >
              I can't unlock it
            </button>
          </div>

          {showReset && (
            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <div>
                <strong>Start over with a new encrypted vault?</strong>
                <p className="mt-1">
                  This is destructive. NoteChain will delete old encrypted synced notes for this
                  account, clear queued/local encrypted note cache, and create a new vault with a
                  new passphrase. Old notes cannot be recovered unless you later remember the
                  passphrase or find the original recovery key.
                </p>
              </div>
              <label htmlFor="reset-vault-confirmation" className="block font-medium">
                Type RESET to permanently reset this encrypted vault
              </label>
              <input
                id="reset-vault-confirmation"
                value={resetConfirmation}
                onChange={event => setResetConfirmation(event.target.value)}
                className="w-full rounded-lg border border-red-300 px-3 py-2 font-mono text-sm text-red-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                placeholder="RESET"
              />
              <button
                type="button"
                onClick={handleResetVault}
                disabled={isBusy || resetConfirmation !== 'RESET'}
                className="rounded-lg bg-red-700 px-4 py-2 text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? 'Resetting…' : 'Reset and create new vault'}
              </button>
            </div>
          )}

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

          <p className="text-xs text-stone-500">
            NoteChain never sees your passphrase, so it cannot reset it for you. A device where your
            vault is still unlocked can export a recovery key from Settings.
          </p>
        </form>
      </div>
    </div>
  );
}
