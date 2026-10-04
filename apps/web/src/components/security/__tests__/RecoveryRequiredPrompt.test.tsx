import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RecoveryRequiredPrompt from '../RecoveryRequiredPrompt';

const mockPush = vi.fn();
const mockSignOut = vi.fn();
const mockImportRecoveryKey = vi.fn();
const mockUnlockWithPassphrase = vi.fn();
const mockResetEncryptedVault = vi.fn();
const mockUseNotesSync = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/supabase/UserProvider', () => ({
  useUser: () => ({ signOut: mockSignOut }),
}));

vi.mock('@/lib/sync/useNotesSync', () => ({
  useNotesSync: () => mockUseNotesSync(),
}));

describe('RecoveryRequiredPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotesSync.mockReturnValue({
      encryptionError: 'Unable to load your encryption key',
      hasVaultPassphrase: false,
      importRecoveryKey: mockImportRecoveryKey,
      unlockWithPassphrase: mockUnlockWithPassphrase,
      resetEncryptedVault: mockResetEncryptedVault,
      isEncryptionReady: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a blocking restore prompt when encryption recovery is required', () => {
    render(<RecoveryRequiredPrompt />);

    expect(screen.getByRole('dialog', { name: /enter your recovery key/i })).toBeTruthy();
    expect(screen.getByText(/Unlock your vault/i)).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /^recovery key$/i })).toBeTruthy();
  });

  it('does not render when encryption is ready', () => {
    mockUseNotesSync.mockReturnValue({
      encryptionError: null,
      importRecoveryKey: mockImportRecoveryKey,
      resetEncryptedVault: mockResetEncryptedVault,
      isEncryptionReady: true,
    });

    render(<RecoveryRequiredPrompt />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('imports the pasted recovery key', async () => {
    mockImportRecoveryKey.mockResolvedValue(undefined);
    render(<RecoveryRequiredPrompt />);

    fireEvent.change(screen.getByRole('textbox', { name: /^recovery key$/i }), {
      target: { value: 'NC-RK1:test-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^unlock$/i }));

    await waitFor(() => {
      expect(mockImportRecoveryKey).toHaveBeenCalledWith('NC-RK1:test-key');
    });
  });

  it('asks for the vault passphrase when the account has one', async () => {
    mockUseNotesSync.mockReturnValue({
      encryptionError: 'This device has not unlocked your vault yet.',
      hasVaultPassphrase: true,
      importRecoveryKey: mockImportRecoveryKey,
      unlockWithPassphrase: mockUnlockWithPassphrase,
      resetEncryptedVault: mockResetEncryptedVault,
      isEncryptionReady: false,
    });
    mockUnlockWithPassphrase.mockResolvedValue(undefined);
    render(<RecoveryRequiredPrompt />);

    expect(screen.getByRole('dialog', { name: /enter your vault passphrase/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^vault passphrase$/i), {
      target: { value: 'correct horse battery staple' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^unlock$/i }));

    await waitFor(() => {
      expect(mockUnlockWithPassphrase).toHaveBeenCalledWith('correct horse battery staple');
    });
    expect(mockImportRecoveryKey).not.toHaveBeenCalled();
  });

  it('still accepts a recovery key when the account has a passphrase', async () => {
    mockUseNotesSync.mockReturnValue({
      encryptionError: 'This device has not unlocked your vault yet.',
      hasVaultPassphrase: true,
      importRecoveryKey: mockImportRecoveryKey,
      unlockWithPassphrase: mockUnlockWithPassphrase,
      resetEncryptedVault: mockResetEncryptedVault,
      isEncryptionReady: false,
    });
    mockImportRecoveryKey.mockResolvedValue(undefined);
    render(<RecoveryRequiredPrompt />);

    fireEvent.click(screen.getByRole('button', { name: /use recovery key/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /^recovery key$/i }), {
      target: { value: 'NC-RK1:test-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^unlock$/i }));

    await waitFor(() => {
      expect(mockImportRecoveryKey).toHaveBeenCalledWith('NC-RK1:test-key');
    });
  });

  it('allows signing out as an escape path', async () => {
    mockSignOut.mockResolvedValue(undefined);
    render(<RecoveryRequiredPrompt />);

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('requires typed confirmation before resetting the encrypted vault', async () => {
    mockResetEncryptedVault.mockResolvedValue(undefined);
    render(<RecoveryRequiredPrompt />);

    fireEvent.click(screen.getByRole('button', { name: /can't unlock it/i }));

    const resetButton = screen.getByRole('button', { name: /reset and create new vault/i });
    expect(resetButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/type reset/i), {
      target: { value: 'RESET' },
    });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockResetEncryptedVault).toHaveBeenCalledTimes(1);
    });
  });
});
