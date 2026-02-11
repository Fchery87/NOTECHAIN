// apps/web/src/lib/repositories/SyncRepository.ts
import { supabase, SupabaseClient } from '../supabaseClient';
import type { SyncOperation } from '@notechain/sync-engine';

/**
 * Encrypted blob row from database (used for sync)
 */
interface EncryptedBlobRow {
  id: string;
  user_id: string;
  blob_type: string;
  ciphertext: string;
  nonce: string;
  auth_tag: string;
  key_id: string;
  metadata_hash: string;
  version: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Sync metadata row from database
 */
interface SyncMetadataRow {
  id: string;
  user_id: string;
  device_id: string;
  last_sync_version: number;
  sync_status: 'idle' | 'syncing' | 'conflict' | 'error';
  last_synced_at: string;
}

/**
 * Result of a sync operation
 */
export interface SyncOperationResult {
  operationId: string;
  success: boolean;
  error?: string;
}

/**
 * Repository for managing sync operations and metadata
 * Uses encrypted_blobs table as the source of truth for sync
 */
export class SyncRepository {
  private client: SupabaseClient;
  private deviceId: string;

  constructor(deviceId: string, client?: SupabaseClient) {
    this.deviceId = deviceId;
    this.client = client ?? supabase;
  }

  /**
   * Get sync metadata for a user/device combination
   */
  async getSyncMetadata(userId: string): Promise<SyncMetadataRow | null> {
    const { data, error } = await this.client
      .from('sync_metadata')
      .select('*')
      .eq('user_id', userId)
      .eq('device_id', this.deviceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  }

  /**
   * Create or update sync metadata
   */
  async upsertSyncMetadata(
    userId: string,
    status: 'idle' | 'syncing' | 'conflict' | 'error' = 'idle',
    lastSyncVersion?: number
  ): Promise<SyncMetadataRow> {
    await this.getSyncMetadata(userId);

    const updateData: Record<string, unknown> = {
      user_id: userId,
      device_id: this.deviceId,
      sync_status: status,
      last_synced_at: new Date().toISOString(),
    };

    if (lastSyncVersion !== undefined) {
      updateData.last_sync_version = lastSyncVersion;
    }

    const { data, error } = await this.client
      .from('sync_metadata')
      .upsert(updateData, { onConflict: 'user_id,device_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Push sync operations to the server by updating encrypted_blobs
   */
  async pushOperations(operations: SyncOperation[]): Promise<SyncOperationResult[]> {
    const results: SyncOperationResult[] = [];

    for (const op of operations) {
      try {
        // Parse the encrypted payload to get blob data
        const payload = JSON.parse(op.encryptedPayload);

        if (op.operationType === 'delete') {
          // Soft delete
          const { error } = await this.client
            .from('encrypted_blobs')
            .update({
              is_deleted: true,
              updated_at: new Date().toISOString(),
              version: op.version,
            })
            .eq('id', op.entityId)
            .eq('user_id', op.userId);

          results.push({
            operationId: op.id,
            success: !error,
            error: error?.message,
          });
        } else {
          // Create or update
          const blobData = {
            id: op.entityId,
            user_id: op.userId,
            blob_type: op.entityType,
            ciphertext: payload.ciphertext,
            nonce: payload.nonce,
            auth_tag: payload.authTag,
            key_id: payload.keyId || op.id,
            metadata_hash: payload.metadataHash || '',
            version: op.version,
            is_deleted: false,
          };

          const { error } = await this.client
            .from('encrypted_blobs')
            .upsert(blobData, { onConflict: 'id' });

          results.push({
            operationId: op.id,
            success: !error,
            error: error?.message,
          });
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
   * Pull remote changes since a given version
   */
  async pullChanges(
    userId: string,
    sinceVersion: number,
    limit: number = 100
  ): Promise<SyncOperation[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', userId)
      .gt('version', sinceVersion)
      .order('version', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(row => this.blobRowToOperation(row as EncryptedBlobRow));
  }

  /**
   * Get the latest version number for a user
   */
  async getLatestVersion(userId: string): Promise<number> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return 0; // No records
      throw error;
    }

    return data?.version ?? 0;
  }

  /**
   * Get pending changes count for a user
   */
  async getPendingCount(userId: string, sinceVersion: number): Promise<number> {
    const { count, error } = await this.client
      .from('encrypted_blobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('version', sinceVersion);

    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Subscribe to real-time changes on encrypted_blobs
   */
  subscribeToChanges(userId: string, onChange: (operation: SyncOperation) => void): () => void {
    const channel = this.client
      .channel(`encrypted_blobs:${userId}`)
      .on<EncryptedBlobRow>(
        'postgres_changes' as any,
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'encrypted_blobs',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const operation = this.handleChangeEvent({
            eventType: payload.eventType,
            new: payload.new as EncryptedBlobRow | null,
            old: payload.old as EncryptedBlobRow | null,
          });
          if (operation) {
            onChange(operation);
          }
        }
      )
      .subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }

  /**
   * Handle real-time change events
   */
  private handleChangeEvent(payload: {
    eventType: string;
    new: EncryptedBlobRow | null;
    old: EncryptedBlobRow | null;
  }): SyncOperation | null {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'DELETE' && oldRecord) {
      return {
        id: `${oldRecord.id}_delete`,
        userId: oldRecord.user_id,
        sessionId: '', // Not applicable for real-time events
        operationType: 'delete',
        entityType: oldRecord.blob_type,
        entityId: oldRecord.id,
        encryptedPayload: '',
        timestamp: Date.now(),
        version: oldRecord.version,
      };
    }

    if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord) {
      return this.blobRowToOperation(newRecord);
    }

    return null;
  }

  /**
   * Convert encrypted_blob row to SyncOperation
   */
  private blobRowToOperation(row: EncryptedBlobRow): SyncOperation {
    const payload = JSON.stringify({
      ciphertext: row.ciphertext,
      nonce: row.nonce,
      authTag: row.auth_tag,
      keyId: row.key_id,
      metadataHash: row.metadata_hash,
    });

    return {
      id: row.id,
      userId: row.user_id,
      sessionId: '', // Source device not tracked in blob
      operationType: row.is_deleted ? 'delete' : 'update',
      entityType: row.blob_type,
      entityId: row.id,
      encryptedPayload: payload,
      timestamp: new Date(row.updated_at).getTime(),
      version: row.version,
    };
  }
}

/**
 * Factory function to create a SyncRepository instance
 */
export function createSyncRepository(deviceId: string, client?: SupabaseClient): SyncRepository {
  return new SyncRepository(deviceId, client);
}
