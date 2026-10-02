import { KeyManager } from '@notechain/core-crypto';

const MEETING_STORAGE_KEY_CONTEXT = 'notechain-meeting-storage-v1';
const RECOVERY_REQUIRED_MESSAGE =
  'No local encryption key was found for this existing encrypted vault. Enter your recovery key or start a new vault.';

/**
 * Return the stable local encryption key used for meeting transcripts.
 *
 * Meeting storage is local-first and encrypted at rest. Components must derive
 * a stable, domain-separated meeting key from the user's existing master key.
 * Meeting access must not silently create a new vault key because that would
 * bypass the app's recovery contract and make existing encrypted data
 * incompatible on this device.
 */
export async function getMeetingEncryptionKey(): Promise<Uint8Array> {
  const masterKey = await KeyManager.getMasterKey();

  if (!masterKey) {
    throw new Error(RECOVERY_REQUIRED_MESSAGE);
  }

  return KeyManager.deriveDeviceKey(MEETING_STORAGE_KEY_CONTEXT, masterKey);
}
