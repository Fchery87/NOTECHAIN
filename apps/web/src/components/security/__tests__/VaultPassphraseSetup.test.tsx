import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VaultPassphraseSetup from '../VaultPassphraseSetup';

const mockSetVaultPassphrase = vi.fn();
const mockUseNotesSync = vi.fn();

vi.mock('@/lib/sync/useNotesSync', () => ({
  useNotesSync: () => mockUseNotesSync(),
}));

describe('VaultPassphraseSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotesSync.mockReturnValue({
      requiresVaultPassphrase: true,
      setVaultPassphrase: mockSetVaultPassphrase,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render once the account has a passphrase', () => {
    mockUseNotesSync.mockReturnValue({
      requiresVaultPassphrase: false,
      setVaultPassphrase: mockSetVaultPassphrase,
    });

    render(<VaultPassphraseSetup />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps save disabled until the passphrase is long enough and confirmed', () => {
    render(<VaultPassphraseSetup />);
    const save = screen.getByRole('button', { name: /save passphrase/i });

    fireEvent.change(screen.getByLabelText(/^passphrase$/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/confirm passphrase/i), { target: { value: 'short' } });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^passphrase$/i), {
      target: { value: 'correct horse battery staple' },
    });
    expect(save).toBeDisabled();
    expect(screen.getByText(/do not match/i)).toBeTruthy();
  });

  it('saves a confirmed passphrase', async () => {
    mockSetVaultPassphrase.mockResolvedValue(undefined);
    render(<VaultPassphraseSetup />);

    fireEvent.change(screen.getByLabelText(/^passphrase$/i), {
      target: { value: 'correct horse battery staple' },
    });
    fireEvent.change(screen.getByLabelText(/confirm passphrase/i), {
      target: { value: 'correct horse battery staple' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save passphrase/i }));

    await waitFor(() => {
      expect(mockSetVaultPassphrase).toHaveBeenCalledWith('correct horse battery staple');
    });
  });
});
