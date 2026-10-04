import { useState } from 'react';
import { MIN_VAULT_PASSPHRASE_LENGTH } from '@notechain/core-crypto';

interface VaultPassphraseSectionProps {
  isEncryptionReady: boolean;
  hasVaultPassphrase: boolean;
  setVaultPassphrase: (passphrase: string) => Promise<void>;
}

export function VaultPassphraseSection({
  isEncryptionReady,
  hasVaultPassphrase,
  setVaultPassphrase,
}: VaultPassphraseSectionProps) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleSave = async () => {
    setIsBusy(true);
    setError(null);
    setStatus(null);

    try {
      await setVaultPassphrase(passphrase);
      setPassphrase('');
      setConfirmation('');
      setStatus('Vault passphrase updated. Use the new one on your next device.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update your vault passphrase');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="mb-8">
      <label className="block text-sm font-medium text-stone-700 mb-3">Vault Passphrase</label>
      <form
        className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-4"
        onSubmit={event => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <div>
          <p className="font-medium text-stone-900">
            {hasVaultPassphrase ? 'Change vault passphrase' : 'Set vault passphrase'}
          </p>
          <p className="text-sm text-stone-500 mt-1">
            Unlocks your notes when you sign in on a new device. Devices that are already unlocked
            stay unlocked.
          </p>
        </div>
        <input
          type="password"
          value={passphrase}
          onChange={event => setPassphrase(event.target.value)}
          autoComplete="new-password"
          placeholder={`New passphrase (${MIN_VAULT_PASSPHRASE_LENGTH}+ characters)`}
          aria-label="New vault passphrase"
          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        />
        <input
          type="password"
          value={confirmation}
          onChange={event => setConfirmation(event.target.value)}
          autoComplete="new-password"
          placeholder="Confirm new passphrase"
          aria-label="Confirm new vault passphrase"
          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={
            isBusy ||
            !isEncryptionReady ||
            passphrase.length < MIN_VAULT_PASSPHRASE_LENGTH ||
            confirmation !== passphrase
          }
          className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isBusy ? 'Saving…' : 'Save Passphrase'}
        </button>

        {status && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {status}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
