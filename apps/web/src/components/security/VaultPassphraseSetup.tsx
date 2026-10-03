'use client';

import { useState } from 'react';
import { MIN_VAULT_PASSPHRASE_LENGTH } from '@notechain/core-crypto';
import { useNotesSync } from '@/lib/sync/useNotesSync';

export default function VaultPassphraseSetup() {
  const { setVaultPassphrase, requiresVaultPassphrase } = useNotesSync();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  if (!requiresVaultPassphrase) {
    return null;
  }

  const isTooShort = passphrase.length < MIN_VAULT_PASSPHRASE_LENGTH;
  const isMismatched = confirmation.length > 0 && confirmation !== passphrase;

  const handleSubmit = async () => {
    setIsBusy(true);
    setError(null);

    try {
      await setVaultPassphrase(passphrase);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your vault passphrase');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-passphrase-setup-title"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="bg-stone-900 px-6 py-5 text-stone-50">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">One-time setup</p>
          <h2 id="vault-passphrase-setup-title" className="mt-2 font-serif text-2xl font-medium">
            Choose a vault passphrase
          </h2>
          <p className="mt-2 text-sm text-stone-300">
            When you sign in on another device, this passphrase unlocks your notes there. It never
            leaves this device, so NoteChain still cannot read your notes.
          </p>
        </div>

        <form
          className="space-y-5 p-6"
          onSubmit={event => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="space-y-2">
            <label htmlFor="vault-passphrase" className="block text-sm font-medium text-stone-800">
              Passphrase
            </label>
            <input
              id="vault-passphrase"
              type="password"
              value={passphrase}
              onChange={event => setPassphrase(event.target.value)}
              autoComplete="new-password"
              aria-describedby="vault-passphrase-hint"
              className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              autoFocus
            />
            <p id="vault-passphrase-hint" className="text-xs text-stone-500">
              At least {MIN_VAULT_PASSPHRASE_LENGTH} characters. A few unrelated words are easy to
              remember and hard to guess.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="vault-passphrase-confirm"
              className="block text-sm font-medium text-stone-800"
            >
              Confirm passphrase
            </label>
            <input
              id="vault-passphrase-confirm"
              type="password"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            {isMismatched && <p className="text-xs text-red-700">The passphrases do not match.</p>}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            NoteChain cannot reset this passphrase. If you forget it, the recovery key in Settings
            is the only other way back in, so keep it in a password manager too.
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isBusy || isTooShort || confirmation !== passphrase}
            className="rounded-lg bg-stone-900 px-5 py-2.5 font-medium text-stone-50 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? 'Saving…' : 'Save passphrase'}
          </button>
        </form>
      </div>
    </div>
  );
}
