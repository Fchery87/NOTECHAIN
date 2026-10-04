import { beforeEach, describe, expect, it } from 'vitest';
import {
  encodeRecoveryKey,
  KeyManager,
  SecureMemoryStorage,
  type PassphraseEnvelope,
} from '@notechain/core-crypto';
import { EncryptedSyncService, EncryptionRecoveryRequiredError } from '../encryptedSyncService';

const userId = 'user-123';
const passphrase = 'correct horse battery staple';
const note = { id: 'note-1', title: 'Plans', content: 'Ship the passphrase unlock.' };

// Each device has its own browser storage; only the sealed envelope and
// ciphertext travel through the server.
function switchToDevice(): void {
  KeyManager.setSecureStorageAdapter(new SecureMemoryStorage());
  EncryptedSyncService.getInstance().resetSession();
}

describe('signing in on a second device with the vault passphrase', () => {
  let envelopeOnServer: PassphraseEnvelope;
  let ciphertextOnServer: string;

  beforeEach(async () => {
    switchToDevice();
    const laptop = EncryptedSyncService.getInstance();
    await laptop.initialize(userId, { allowCreate: true });
    envelopeOnServer = await laptop.sealWithPassphrase(passphrase);
    ciphertextOnServer = await laptop.encrypt(note);
  });

  it('cannot read notes before it is unlocked', async () => {
    switchToDevice();
    const desktop = EncryptedSyncService.getInstance();

    await expect(desktop.initialize(userId, { allowCreate: false })).rejects.toBeInstanceOf(
      EncryptionRecoveryRequiredError
    );
  });

  it('reads notes from the first device after entering the passphrase', async () => {
    switchToDevice();
    const desktop = EncryptedSyncService.getInstance();
    await desktop.initialize(userId, { allowCreate: false }).catch(() => undefined);

    await desktop.unlockWithEnvelope(envelopeOnServer, passphrase);

    expect(await desktop.decrypt(ciphertextOnServer)).toEqual(note);
  });

  it('stays unlocked on that device after a reload', async () => {
    switchToDevice();
    const desktop = EncryptedSyncService.getInstance();
    await desktop.unlockWithEnvelope(envelopeOnServer, passphrase);

    desktop.resetSession();
    await desktop.initialize(userId, { allowCreate: false });

    expect(await desktop.decrypt(ciphertextOnServer)).toEqual(note);
  });

  it('rejects the wrong passphrase and stays locked', async () => {
    switchToDevice();
    const desktop = EncryptedSyncService.getInstance();

    await expect(
      desktop.unlockWithEnvelope(envelopeOnServer, 'wrong horse battery staple')
    ).rejects.toThrow('That passphrase does not unlock this vault.');
    expect(desktop.isReady()).toBe(false);
  });

  it('locks a device whose key was replaced elsewhere, until the passphrase is entered', async () => {
    switchToDevice();
    const staleDevice = EncryptedSyncService.getInstance();
    await staleDevice.initialize(userId, { allowCreate: true });
    staleDevice.resetSession();

    await expect(
      staleDevice.initialize(userId, { allowCreate: false, envelope: envelopeOnServer })
    ).rejects.toThrow('This device has an outdated key for your vault.');

    await staleDevice.unlockWithEnvelope(envelopeOnServer, passphrase);
    staleDevice.resetSession();
    await staleDevice.initialize(userId, { allowCreate: false, envelope: envelopeOnServer });

    expect(await staleDevice.decrypt(ciphertextOnServer)).toEqual(note);
  });

  it('rejects a recovery key from an older vault', async () => {
    switchToDevice();
    const desktop = EncryptedSyncService.getInstance();
    const olderVaultKey = encodeRecoveryKey(new Uint8Array(32).fill(7));

    await expect(desktop.importRecoveryKey(olderVaultKey, envelopeOnServer)).rejects.toThrow(
      'That recovery key belongs to an older vault.'
    );
    expect(desktop.isReady()).toBe(false);
  });
});
