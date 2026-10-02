import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  setKeyNamespace: vi.fn(),
  getMasterKey: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@notechain/core-crypto', () => ({
  KeyManager: {
    setKeyNamespace: mocks.setKeyNamespace,
    getMasterKey: mocks.getMasterKey,
  },
}));

vi.mock('../../supabase/client', () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
  createClient: () => ({ auth: { getSession: mocks.getSession } }),
}));

import { getScopedMasterKey } from '../scopedMasterKey';

const masterKey = new Uint8Array(32).fill(9);

describe('getScopedMasterKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.getMasterKey.mockResolvedValue(masterKey);
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } } });
  });

  it('scopes the vault to the signed-in user before it reads the master key', async () => {
    await getScopedMasterKey();

    expect(mocks.setKeyNamespace).toHaveBeenCalledWith('user-123');
    expect(mocks.setKeyNamespace.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getMasterKey.mock.invocationCallOrder[0]
    );
  });

  it('returns the master key', async () => {
    expect(await getScopedMasterKey()).toBe(masterKey);
  });

  it('leaves the namespace alone when nobody is signed in', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });

    expect(await getScopedMasterKey()).toBe(masterKey);
    expect(mocks.setKeyNamespace).not.toHaveBeenCalled();
  });

  it('does not touch Supabase when it is not configured', async () => {
    mocks.isSupabaseConfigured.mockReturnValue(false);

    expect(await getScopedMasterKey()).toBe(masterKey);
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.setKeyNamespace).not.toHaveBeenCalled();
  });

  it('still reads the key when the session lookup fails', async () => {
    mocks.getSession.mockRejectedValue(new Error('storage blocked'));

    expect(await getScopedMasterKey()).toBe(masterKey);
    expect(mocks.setKeyNamespace).not.toHaveBeenCalled();
  });
});
