import { EncryptionService, KeyManager } from '@notechain/core-crypto';

const MEETING_STORAGE_KEY_CONTEXT = 'notechain-meeting-storage-v1';

/**
 * Return the stable local encryption key used for meeting transcripts.
 *
 * Meeting storage is local-first and encrypted at rest. Components must not
 * generate ad-hoc random keys per read/write; doing so makes saved meetings
 * impossible to decrypt after navigation or reload. We derive a stable,
 * domain-separated meeting key from the user's master key, creating and
 * storing a local master key if this browser has not initialized one yet.
 */
export async function getMeetingEncryptionKey(): Promise<Uint8Array> {
  let masterKey = await KeyManager.getMasterKey();

  if (!masterKey) {
    masterKey = await EncryptionService.generateKey();
    await KeyManager.storeMasterKey(masterKey);
  }

  return KeyManager.deriveDeviceKey(MEETING_STORAGE_KEY_CONTEXT, masterKey);
}
