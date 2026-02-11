'use client';

import React, { useState } from 'react';
import type { ReactElement } from 'react';

interface PrivacySettingsState {
  autoLock: boolean;
  autoLockMinutes: number;
  biometricAuth: boolean;
  analyticsEnabled: boolean;
  crashReporting: boolean;
  syncEnabled: boolean;
  twoFactorAuth: boolean;
}

/**
 * Privacy Settings Component
 * User-facing privacy and security controls
 */
export function PrivacySettings(): ReactElement {
  const [settings, setSettings] = useState<PrivacySettingsState>({
    autoLock: true,
    autoLockMinutes: 5,
    biometricAuth: true,
    analyticsEnabled: false,
    crashReporting: true,
    syncEnabled: true,
    twoFactorAuth: false,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = <K extends keyof PrivacySettingsState>(
    key: K,
    value: PrivacySettingsState[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = () => {
    // In a real implementation, this would save to the backend
    localStorage.setItem('@notechain/privacySettings', JSON.stringify(settings));
    setHasChanges(false);
    setSaved(true);

    setTimeout(() => setSaved(false), 3000);
  };

  const handleExportData = () => {
    // Placeholder for data export functionality
    alert('Data export functionality would download all your encrypted notes');
  };

  const handleDeleteAccount = () => {
    // Placeholder for account deletion
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      alert('Account deletion would be processed here');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-medium text-stone-900">Privacy & Security</h2>
          <p className="text-stone-600 mt-1">Manage your security preferences and data</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-stone-900 text-stone-50 rounded-xl hover:bg-stone-800 transition-colors font-medium"
          >
            Save Changes
          </button>
        )}
      </div>

      {saved && (
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <p className="text-green-700 text-sm">✓ Settings saved successfully</p>
        </div>
      )}

      {/* Security Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200">
          <h3 className="font-medium text-stone-900">Security</h3>
        </div>

        <div className="divide-y divide-stone-100">
          {/* Auto Lock */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-900">Auto-lock</p>
              <p className="text-sm text-stone-500">Lock the app after inactivity</p>
            </div>
            <div className="flex items-center gap-4">
              {settings.autoLock && (
                <select
                  value={settings.autoLockMinutes}
                  onChange={e => handleChange('autoLockMinutes', parseInt(e.target.value))}
                  className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              )}
              <Toggle
                checked={settings.autoLock}
                onChange={checked => handleChange('autoLock', checked)}
              />
            </div>
          </div>

          {/* Biometric Auth */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-900">Biometric Authentication</p>
              <p className="text-sm text-stone-500">Use fingerprint or face recognition</p>
            </div>
            <Toggle
              checked={settings.biometricAuth}
              onChange={checked => handleChange('biometricAuth', checked)}
            />
          </div>

          {/* Two Factor Auth */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-900">Two-Factor Authentication</p>
              <p className="text-sm text-stone-500">Add an extra layer of security</p>
            </div>
            <button
              onClick={() => handleChange('twoFactorAuth', !settings.twoFactorAuth)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                settings.twoFactorAuth
                  ? 'bg-green-100 text-green-700'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {settings.twoFactorAuth ? 'Enabled' : 'Enable'}
            </button>
          </div>

          {/* Sync */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-900">Sync Across Devices</p>
              <p className="text-sm text-stone-500">Keep your notes synchronized</p>
            </div>
            <Toggle
              checked={settings.syncEnabled}
              onChange={checked => handleChange('syncEnabled', checked)}
            />
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200">
          <h3 className="font-medium text-stone-900">Privacy</h3>
        </div>

        <div className="divide-y divide-stone-100">
          {/* Analytics */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-900">Analytics</p>
              <p className="text-sm text-stone-500">Help us improve by sharing usage data</p>
            </div>
            <Toggle
              checked={settings.analyticsEnabled}
              onChange={checked => handleChange('analyticsEnabled', checked)}
            />
          </div>

          {/* Crash Reporting */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-900">Crash Reporting</p>
              <p className="text-sm text-stone-500">Automatically send error reports</p>
            </div>
            <Toggle
              checked={settings.crashReporting}
              onChange={checked => handleChange('crashReporting', checked)}
            />
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200">
          <h3 className="font-medium text-stone-900">Data Management</h3>
        </div>

        <div className="divide-y divide-stone-100">
          {/* Export Data */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-900">Export Your Data</p>
              <p className="text-sm text-stone-500">Download all your notes and data</p>
            </div>
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium"
            >
              Export
            </button>
          </div>

          {/* Delete Account */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-rose-700">Delete Account</p>
              <p className="text-sm text-stone-500">Permanently delete your account and data</p>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors text-sm font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-stone-50 rounded-2xl p-6">
        <h3 className="font-medium text-stone-900 mb-4">Security Information</h3>
        <div className="space-y-3 text-sm text-stone-600">
          <p>
            <span className="font-medium text-stone-900">Encryption:</span> All your notes are
            encrypted locally using XSalsa20-Poly1305 (equivalent to AES-256-GCM) before being
            stored or synced.
          </p>
          <p>
            <span className="font-medium text-stone-900">Zero-Knowledge:</span> We cannot access
            your notes or decryption keys. Only you have access to your data.
          </p>
          <p>
            <span className="font-medium text-stone-900">Key Derivation:</span> Your password is
            transformed into an encryption key using 100,000 iterations of our key derivation
            function.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Toggle Switch Component
 */
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps): ReactElement {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-amber-500' : 'bg-stone-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default PrivacySettings;
