import { beforeEach, describe, expect, it, vi } from 'vitest';

const keyMocks = vi.hoisted(() => ({
  getMasterKey: vi.fn(),
  deriveDeviceKey: vi.fn(),
}));

vi.mock('@notechain/core-crypto', () => ({
  KeyManager: {
    getMasterKey: keyMocks.getMasterKey,
    deriveDeviceKey: keyMocks.deriveDeviceKey,
  },
}));

import { getMeetingEncryptionKey } from '../meetingEncryptionKey';

describe('getMeetingEncryptionKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    keyMocks.deriveDeviceKey.mockImplementation(async (_context: string, masterKey: Uint8Array) =>
      new Uint8Array(masterKey.map(value => value ^ 0xff)).slice(0, 32)
    );
  });

  it('derives a stable meeting storage key from the existing master key', async () => {
    const masterKey = new Uint8Array(32).fill(7);
    keyMocks.getMasterKey.mockResolvedValue(masterKey);

    const key = await getMeetingEncryptionKey();

    expect(keyMocks.deriveDeviceKey).toHaveBeenCalledWith(
      'notechain-meeting-storage-v1',
      masterKey
    );
    expect(Array.from(key)).toEqual(Array.from(new Uint8Array(32).fill(248)));
  });

  it('requires an existing master key instead of creating a new one implicitly', async () => {
    keyMocks.getMasterKey.mockResolvedValue(null);

    await expect(getMeetingEncryptionKey()).rejects.toThrow(
      'No local encryption key was found for this existing encrypted vault. Enter your recovery key or start a new vault.'
    );
    expect(keyMocks.deriveDeviceKey).not.toHaveBeenCalled();
  });
});
