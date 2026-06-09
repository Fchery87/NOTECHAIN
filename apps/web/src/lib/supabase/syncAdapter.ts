// apps/web/src/lib/supabase/syncAdapter.ts
import { createClient, isSupabaseConfigured } from './client';
import { getLocalSyncCursor, setLocalSyncCursor } from '@/lib/sync/noteSyncLocalStore';
import type { SyncRepositoryAdapter, SyncOperation } from '@notechain/sync-engine';

/**
 * Browser-compatible base64 to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Browser-compatible Uint8Array to hex string
 */
function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Browser-compatible Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Supabase Realtime may return BYTEA columns as Uint8Array-like values or as
 * Postgres hex strings (\\x...). Normalize either shape to the payload format
 * expected by EncryptedSyncService.
 */
function byteaToBase64(value: unknown): string {
  if (value instanceof Uint8Array) {
    return uint8ArrayToBase64(value);
  }

  if (Array.isArray(value)) {
    return uint8ArrayToBase64(new Uint8Array(value));
  }

  if (typeof value === 'string') {
    if (value.startsWith('\\x')) {
      const hex = value.slice(2);
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
      }
      return uint8ArrayToBase64(bytes);
    }

    // Already base64 or a binary string, depending on client serialization.
    return value;
  }

  throw new Error('Unsupported BYTEA payload shape from Supabase Realtime');
}

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
    ciphertext: base64ToUint8Array(parts[0]),
    nonce: base64ToUint8Array(parts[1]),
    authTag: base64ToUint8Array(parts[2]),
  };
}

/**
 * Supabase adapter for the sync engine
 * Implements SyncRepositoryAdapter interface for Supabase backend
 */
export class SupabaseSyncAdapter implements SyncRepositoryAdapter {
  private supabase: ReturnType<typeof createClient> | null = null;
  private initializationError: string | null = null;

  constructor() {
    try {
      if (!isSupabaseConfigured()) {
        this.initializationError = 'Supabase is not configured';
        console.warn('[SupabaseSyncAdapter] Supabase is not configured');
        return;
      }
      this.supabase = createClient();
    } catch (error) {
      this.initializationError =
        error instanceof Error ? error.message : 'Failed to initialize Supabase client';
      console.error('[SupabaseSyncAdapter] Failed to create Supabase client:', error);
    }
  }

  /**
   * Check if the adapter is ready to use
   */
  isReady(): boolean {
    return this.supabase !== null;
  }

  /**
   * Get initialization error if any
   */
  getInitializationError(): string | null {
    return this.initializationError;
  }

  /**
   * Push local operations to Supabase
   */
  async pushOperations(
    operations: SyncOperation[]
  ): Promise<Array<{ operationId: string; success: boolean; error?: string }>> {
    // Handle uninitialized client
    if (!this.supabase) {
      return operations.map(op => ({
        operationId: op.id,
        success: false,
        error: this.initializationError || 'Supabase client not initialized',
      }));
    }

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
          p_ciphertext: `\\x${uint8ArrayToHex(ciphertext)}`,
          p_nonce: `\\x${uint8ArrayToHex(nonce)}`,
          p_auth_tag: `\\x${uint8ArrayToHex(authTag)}`,
          p_key_id: '00000000-0000-0000-0000-000000000000', // Placeholder - should come from op
          p_metadata_hash: `\\x${uint8ArrayToHex(new Uint8Array(32))}`, // Placeholder - should be computed
        });

        if (error) {
          console.error('[SupabaseSyncAdapter] RPC error:', JSON.stringify(error, null, 2));
          console.error('[SupabaseSyncAdapter] Operation context:', {
            userId: op.userId,
            entityId: op.entityId,
            entityType: op.entityType,
            operationType: op.operationType,
            version: op.version,
            sessionId: op.sessionId,
          });
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
    if (!this.supabase) {
      console.warn('[SupabaseSyncAdapter] Cannot pull changes - client not initialized');
      return [];
    }

    const { data, error } = await this.supabase
      .from('sync_operations')
      .select('*')
      .eq('user_id', userId)
      .gt('version', sinceVersion)
      .order('version', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[SupabaseSyncAdapter] Error pulling changes:', error);
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
   * Check whether this user already has encrypted remote data.
   * Used before encryption initialization so existing vaults do not silently
   * generate a new incompatible key when this browser lacks the old key.
   */
  async hasEncryptedDataForUser(
    userId: string
  ): Promise<{ success: boolean; hasData: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: true, hasData: false };
    }

    const { data: syncRows, error: syncError } = await this.supabase
      .from('sync_operations')
      .select('entity_id')
      .eq('user_id', userId)
      .limit(1);

    if (syncError) {
      return { success: false, hasData: false, error: syncError.message };
    }

    if ((syncRows?.length ?? 0) > 0) {
      return { success: true, hasData: true };
    }

    const { data: blobRows, error: blobError } = await this.supabase
      .from('encrypted_blobs')
      .select('blob_uuid')
      .eq('user_id', userId)
      .limit(1);

    if (blobError) {
      return { success: false, hasData: false, error: blobError.message };
    }

    return { success: true, hasData: (blobRows?.length ?? 0) > 0 };
  }

  /**
   * Fetch all note-type blobs for a user (for loading notes on mount)
   */
  async fetchUserNotes(userId: string): Promise<
    Array<{
      entityId: string;
      encryptedPayload: string;
      version: number;
      operationType: string;
      isDeleted: boolean;
    }>
  > {
    if (!this.supabase) {
      console.warn('[SupabaseSyncAdapter] Cannot fetch notes - client not initialized');
      return [];
    }

    const { data, error } = await this.supabase
      .from('sync_operations')
      .select('entity_id, encrypted_payload, version, operation_type, is_deleted')
      .eq('user_id', userId)
      .eq('entity_type', 'note')
      .order('version', { ascending: false });

    if (error) {
      console.error('[SupabaseSyncAdapter] Error fetching notes:', JSON.stringify(error));
      return [];
    }

    // The sync table is an append-only operation log. Keep only the newest
    // operation per note so older creates/updates do not render as duplicates.
    const latestByEntity = new Map<string, NonNullable<typeof data>[number]>();
    for (const row of data || []) {
      if (!latestByEntity.has(row.entity_id)) {
        latestByEntity.set(row.entity_id, row);
      }
    }

    return Array.from(latestByEntity.values()).map(row => ({
      entityId: row.entity_id,
      encryptedPayload: row.encrypted_payload,
      version: row.version,
      operationType: row.operation_type,
      isDeleted: row.is_deleted,
    }));
  }

  /**
   * Get the latest version for a user
   */
  async getLatestVersion(userId: string): Promise<number> {
    if (!this.supabase) {
      console.warn('[SupabaseSyncAdapter] Cannot get latest version - client not initialized');
      return 0;
    }

    const { data, error } = await this.supabase
      .from('encrypted_blobs')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseSyncAdapter] Error getting latest version:', error);
      return 0;
    }

    return data?.version ?? 0;
  }

  /**
   * Get sync metadata for a user
   */
  async getSyncMetadata(userId: string): Promise<{ last_sync_version: number } | null> {
    const localCursor = await getLocalSyncCursor(userId);
    return { last_sync_version: localCursor };
  }

  /**
   * Update sync metadata
   */
  async upsertSyncMetadata(
    userId: string,
    _status: string,
    lastSyncVersion?: number
  ): Promise<void> {
    if (typeof lastSyncVersion === 'number') {
      await setLocalSyncCursor(userId, lastSyncVersion);
    }

    console.log(
      `[SupabaseSyncAdapter] Sync metadata updated for ${userId}: version ${lastSyncVersion}`
    );
  }

  /**
   * Permanently delete all encrypted note/sync data for a user.
   * Used by the explicit encrypted vault reset path when the user does not
   * have the old recovery key and accepts that old encrypted notes are lost.
   */
  async deleteAllEncryptedDataForUser(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      console.warn('[SupabaseSyncAdapter] Cannot reset vault - client not initialized');
      return { success: false, error: 'Supabase client not initialized' };
    }

    try {
      const errors: string[] = [];

      const { error: syncOperationsError } = await this.supabase
        .from('sync_operations')
        .delete()
        .eq('user_id', userId);

      if (syncOperationsError) {
        errors.push(`sync_operations: ${syncOperationsError.message}`);
      }

      const { error: encryptedBlobsError } = await this.supabase
        .from('encrypted_blobs')
        .delete()
        .eq('user_id', userId);

      if (encryptedBlobsError) {
        errors.push(`encrypted_blobs: ${encryptedBlobsError.message}`);
      }

      if (errors.length > 0) {
        const error = errors.join('; ');
        console.error('[SupabaseSyncAdapter] Failed to reset encrypted vault:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SupabaseSyncAdapter] Exception resetting encrypted vault:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Permanently delete notes from Supabase by entity IDs
   * This is for cleanup of undecryptable/locked notes
   */
  async deleteNotesByEntityIds(
    userId: string,
    entityIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      console.warn('[SupabaseSyncAdapter] Cannot delete notes - client not initialized');
      return { success: false, error: 'Supabase client not initialized' };
    }

    if (entityIds.length === 0) {
      return { success: true };
    }

    try {
      const { error } = await this.supabase
        .from('encrypted_blobs')
        .delete()
        .eq('user_id', userId)
        .in('blob_uuid', entityIds);

      if (error) {
        console.error('[SupabaseSyncAdapter] Error deleting notes:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SupabaseSyncAdapter] Exception deleting notes:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Subscribe to real-time changes
   */
  subscribeToChanges(userId: string, onChange: (operation: SyncOperation) => void): () => void {
    if (!this.supabase) {
      console.warn('[SupabaseSyncAdapter] Cannot subscribe to changes - client not initialized');
      return () => {};
    }

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
              encryptedPayload: `${byteaToBase64(row.ciphertext)}:${byteaToBase64(row.nonce)}:${byteaToBase64(row.auth_tag)}`,
              timestamp: new Date(row.created_at).getTime(),
              version: row.version,
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (this.supabase) {
        this.supabase.removeChannel(channel);
      }
    };
  }
}
