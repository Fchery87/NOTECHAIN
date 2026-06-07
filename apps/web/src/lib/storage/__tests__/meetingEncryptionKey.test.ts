import { beforeEach, describe, expect, it, vi } from 'vitest';

const keyMocks = vi.hoisted(() => ({
  getMasterKey: vi.fn(),
  storeMasterKey: vi.fn(),
  deriveDeviceKey: vi.fn(),
  generateKey: vi.fn(),
}));

vi.mock('@notechain/core-crypto', () => ({
  KeyManager: {
    getMasterKey: keyMocks.getMasterKey,
    storeMasterKey: keyMocks.storeMasterKey,
    deriveDeviceKey: keyMocks.deriveDeviceKey,
  },
  EncryptionService: {
    generateKey: keyMocks.generateKey,
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

    expect(keyMocks.generateKey).not.toHaveBeenCalled();
    expect(keyMocks.storeMasterKey).not.toHaveBeenCalled();
    expect(keyMocks.deriveDeviceKey).toHaveBeenCalledWith(
      'notechain-meeting-storage-v1',
      masterKey
    );
    expect(Array.from(key)).toEqual(Array.from(new Uint8Array(32).fill(248)));
  });

  it('creates and stores a master key before deriving when none exists', async () => {
    const generatedMasterKey = new Uint8Array(32).fill(3);
    keyMocks.getMasterKey.mockResolvedValue(null);
    keyMocks.generateKey.mockResolvedValue(generatedMasterKey);

    await getMeetingEncryptionKey();

    expect(keyMocks.generateKey).toHaveBeenCalledTimes(1);
    expect(keyMocks.storeMasterKey).toHaveBeenCalledWith(generatedMasterKey);
    expect(keyMocks.deriveDeviceKey).toHaveBeenCalledWith(
      'notechain-meeting-storage-v1',
      generatedMasterKey
    );
  });
});
