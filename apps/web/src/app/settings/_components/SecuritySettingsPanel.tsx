'use client';

import { useUser } from '@/lib/supabase/UserProvider';
import { useNotesSync } from '@/lib/sync/useNotesSync';
import { EncryptedBackupSection } from './security/EncryptedBackupSection';
import { JsonWorkspacePortabilitySection } from './security/JsonWorkspacePortabilitySection';
import { MarkdownPortabilitySection } from './security/MarkdownPortabilitySection';
import { RecoveryKeySection } from './security/RecoveryKeySection';

function EncryptionStatus({
  isEncryptionReady,
  encryptionError,
}: {
  isEncryptionReady: boolean;
  encryptionError: string | null;
}) {
  return (
    <div
      className={`mb-8 p-4 rounded-lg border ${
        isEncryptionReady ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isEncryptionReady ? 'bg-green-100' : 'bg-amber-100'
          }`}
        >
          <svg
            className={`w-5 h-5 ${isEncryptionReady ? 'text-green-600' : 'text-amber-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div>
          <p className={`font-medium ${isEncryptionReady ? 'text-green-900' : 'text-amber-900'}`}>
            {isEncryptionReady ? 'End-to-End Encryption Active' : 'Recovery Key Required'}
          </p>
          <p className={`text-sm ${isEncryptionReady ? 'text-green-700' : 'text-amber-700'}`}>
            {isEncryptionReady
              ? 'Your data is encrypted with XSalsa20-Poly1305.'
              : encryptionError ||
                'Import your recovery key to restore encrypted data on this device.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function TwoFactorSection() {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
        <div>
          <p className="font-medium text-stone-900">Two-Factor Authentication</p>
          <p className="text-sm text-stone-500">Add an extra layer of security</p>
        </div>
        <button className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors">
          Enable
        </button>
      </div>
    </div>
  );
}

function ActiveSessionsSection() {
  return (
    <div>
      <h3 className="font-medium text-stone-900 mb-3">Active Sessions</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-stone-900">Current Session</p>
              <p className="text-sm text-stone-500">MacBook Pro • Chrome • Now</p>
            </div>
          </div>
          <span className="text-xs text-green-600 font-medium">Active</span>
        </div>
      </div>
    </div>
  );
}

export function SecuritySettingsPanel() {
  const { user } = useUser();
  const { exportRecoveryKey, importRecoveryKey, isEncryptionReady, encryptionError } =
    useNotesSync();
  const userId = user?.id;

  return (
    <div className="p-6">
      <h2 className="text-xl font-medium text-stone-900 mb-6">Security Settings</h2>
      <EncryptionStatus isEncryptionReady={isEncryptionReady} encryptionError={encryptionError} />
      <RecoveryKeySection
        isEncryptionReady={isEncryptionReady}
        exportRecoveryKey={exportRecoveryKey}
        importRecoveryKey={importRecoveryKey}
      />
      <EncryptedBackupSection userId={userId} isEncryptionReady={isEncryptionReady} />
      <MarkdownPortabilitySection userId={userId} isEncryptionReady={isEncryptionReady} />
      <JsonWorkspacePortabilitySection userId={userId} isEncryptionReady={isEncryptionReady} />
      <TwoFactorSection />
      <ActiveSessionsSection />
    </div>
  );
}
