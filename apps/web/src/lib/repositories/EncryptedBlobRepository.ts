// src/lib/repositories/EncryptedBlobRepository.ts
import { BaseRepository } from './BaseRepository';
import { EncryptedBlob } from '@notechain/data-models';
import { sql } from '../neonClient';

export class EncryptedBlobRepository extends BaseRepository<EncryptedBlob> {
  constructor() {
    super('encrypted_blobs');
  }

  async findByUserId(userId: string): Promise<EncryptedBlob[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE user_id = $1 ORDER BY created_at DESC`;
    const result = await sql(query, [userId]);

    return result as EncryptedBlob[];
  }

  async findByUserIdAndType(userId: string, blobType: string): Promise<EncryptedBlob[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE user_id = $1 AND blob_type = $2 ORDER BY created_at DESC`;
    const result = await sql(query, [userId, blobType]);

    return result as EncryptedBlob[];
  }

  async createEncryptedBlob(
    userId: string,
    sessionId: string,
    blobType: string,
    encryptedData: string,
    nonce: string,
    authTag: string,
    metadata?: Record<string, any>
  ): Promise<EncryptedBlob> {
    const query = `
      INSERT INTO ${this.tableName} 
      (user_id, session_id, blob_type, encrypted_data, nonce, auth_tag, metadata) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `;
    const result = await sql(query, [
      userId,
      sessionId,
      blobType,
      encryptedData,
      nonce,
      authTag,
      metadata || {},
    ]);

    return result[0] as EncryptedBlob;
  }

  async updateEncryptedBlob(
    id: string,
    encryptedData: string,
    nonce: string,
    authTag: string,
    metadata?: Record<string, any>
  ): Promise<EncryptedBlob | null> {
    const query = `
      UPDATE ${this.tableName} 
      SET encrypted_data = $2, nonce = $3, auth_tag = $4, metadata = $5, updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `;
    const result = await sql(query, [id, encryptedData, nonce, authTag, metadata || {}]);

    return result.length > 0 ? (result[0] as EncryptedBlob) : null;
  }

  async markAsDeleted(id: string): Promise<boolean> {
    const query = `UPDATE ${this.tableName} SET is_deleted = true WHERE id = $1 RETURNING *`;
    const result = await sql(query, [id]);

    return result.length > 0;
  }
}
