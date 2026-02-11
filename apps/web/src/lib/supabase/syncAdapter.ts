// apps/web/src/lib/supabase/syncAdapter.ts
import { createClient } from './client';
import type { SyncRepositoryAdapter, SyncOperation } from '@notechain/sync-engine';

/**
 * Parse encrypted payload from sync operation
 * Expected format: base64(ciphertext):base64(nonce):base64(authTag)
 */
function parseEncryptedPayload(payload: string): {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  authTag: Uint8Array;
} {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  return {
    ciphertext: Uint8Array.from(Buffer.from(parts[0], 'base64')),
    nonce: Uint8Array.from(Buffer.from(parts[1], 'base64')),
    authTag: Uint8Array.from(Buffer.from(parts[2], 'base64')),
  };
}

/**
 * Supabase adapter for the sync engine
 * Implements SyncRepositoryAdapter interface for Supabase backend
 */
export class SupabaseSyncAdapter implements SyncRepositoryAdapter {
  private supabase = createClient();

  /**
   * Push local operations to Supabase
   */
  async pushOperations(
    operations: SyncOperation[]
  ): Promise<Array<{ operationId: string; success: boolean; error?: string }>> {
    const results: Array<{ operationId: string; success: boolean; error?: string }> = [];

    for (const op of operations) {
      try {
        // Parse encrypted payload
        const { ciphertext, nonce, authTag } = parseEncryptedPayload(op.encryptedPayload);

        // Call the RPC function to insert/update
        const { error } = await this.supabase.rpc('insert_sync_operation', {
          p_user_id: op.userId,
          p_entity_id: op.entityId,
          p_entity_type: op.entityType,
          p_operation_type: op.operationType,
          p_version: op.version,
          p_session_id: op.sessionId,
          p_ciphertext: Array.from(ciphertext),
          p_nonce: Array.from(nonce),
          p_auth_tag: Array.from(authTag),
          p_key_id: '00000000-0000-0000-0000-000000000000', // Placeholder - should come from op
          p_metadata_hash: Array.from(new Uint8Array(32)), // Placeholder - should be computed
        });

        if (error) {
          results.push({ operationId: op.id, success: false, error: error.message });
        } else {
          results.push({ operationId: op.id, success: true });
        }
      } catch (err) {
        results.push({
          operationId: op.id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Pull changes from Supabase since a specific version
   */
  async pullChanges(
    userId: string,
    sinceVersion: number,
    limit: number = 100
  ): Promise<SyncOperation[]> {
    const { data, error } = await this.supabase
      .from('sync_operations')
      .select('*')
      .eq('user_id', userId)
      .gt('version', sinceVersion)
      .order('version', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error pulling changes:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: `${row.user_id}:${row.entity_id}:${row.version}`,
      userId: row.user_id,
      sessionId: row.session_id,
      operationType: row.operation_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      encryptedPayload: row.encrypted_payload,
      timestamp: new Date(row.timestamp).getTime(),
      version: row.version,
    }));
  }

  /**
   * Get the latest version for a user
   */
  async getLatestVersion(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('encrypted_blobs')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.version;
  }

  /**
   * Get sync metadata for a user
   */
  async getSyncMetadata(userId: string): Promise<{ last_sync_version: number } | null> {
    const latestVersion = await this.getLatestVersion(userId);
    return { last_sync_version: latestVersion };
  }

  /**
   * Update sync metadata
   */
  async upsertSyncMetadata(
    userId: string,
    _status: string,
    lastSyncVersion?: number
  ): Promise<void> {
    console.log(`Sync metadata updated for ${userId}: version ${lastSyncVersion}`);
  }

  /**
   * Subscribe to real-time changes
   */
  subscribeToChanges(userId: string, onChange: (operation: SyncOperation) => void): () => void {
    const channel = this.supabase
      .channel(`sync:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'encrypted_blobs',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            onChange({
              id: `${row.user_id}:${row.blob_uuid}:${row.version}`,
              userId: row.user_id,
              sessionId: row.session_id,
              operationType: row.operation_type,
              entityType: row.blob_type,
              entityId: row.blob_uuid,
              encryptedPayload: `${Buffer.from(row.ciphertext).toString('base64')}:${Buffer.from(row.nonce).toString('base64')}:${Buffer.from(row.auth_tag).toString('base64')}`,
              timestamp: new Date(row.created_at).getTime(),
              version: row.version,
            });
          }
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}
