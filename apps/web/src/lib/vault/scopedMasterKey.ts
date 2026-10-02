import { KeyManager } from '@notechain/core-crypto';
import { createClient, isSupabaseConfigured } from '../supabase/client';

/**
 * The master key is stored per user, under a namespace that sync sets when it
 * starts. A feature that asks for the key first would otherwise read the
 * unscoped entry, which can be stale from an earlier account and fail to
 * decrypt. Scope the vault to the signed-in user before every read.
 */
async function scopeVaultToSignedInUser(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const { data } = await createClient().auth.getSession();
    const userId = data.session?.user.id;
    if (userId) KeyManager.setKeyNamespace(userId);
  } catch {
    // Keep the current namespace and read the key as before.
  }
}

export async function getScopedMasterKey(): Promise<Uint8Array | null> {
  await scopeVaultToSignedInUser();
  return KeyManager.getMasterKey();
}
