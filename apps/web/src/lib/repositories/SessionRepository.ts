// src/lib/repositories/SessionRepository.ts
import { BaseRepository } from './BaseRepository';
import { Session } from '@notechain/data-models';
import { sql } from '../neonClient';

export class SessionRepository extends BaseRepository<Session> {
  constructor() {
    super('sessions');
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE user_id = $1 AND is_active = true ORDER BY last_accessed_at DESC`;
    const result = await sql(query, [userId]);

    return result as unknown as Session[];
  }

  async findBySessionId(sessionId: string): Promise<Session | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE session_id = $1 AND is_active = true`;
    const result = await sql(query, [sessionId]);

    return result.length > 0 ? (result[0] as unknown as Session) : null;
  }

  async createSession(
    userId: string,
    sessionId: string,
    deviceInfo?: string,
    browserInfo?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session> {
    const query = `
      INSERT INTO ${this.tableName} 
      (user_id, session_id, device_info, browser_info, ip_address, user_agent) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;
    const result = await sql(query, [
      userId,
      sessionId,
      deviceInfo,
      browserInfo,
      ipAddress,
      userAgent,
    ]);

    return result[0] as unknown as Session;
  }

  async updateLastAccessed(sessionId: string): Promise<Session | null> {
    const query = `
      UPDATE ${this.tableName} 
      SET last_accessed_at = NOW()
      WHERE session_id = $1 AND is_active = true
      RETURNING *
    `;
    const result = await sql(query, [sessionId]);

    return result.length > 0 ? (result[0] as unknown as Session) : null;
  }

  async deactivateSession(sessionId: string): Promise<boolean> {
    const query = `
      UPDATE ${this.tableName} 
      SET is_active = false
      WHERE session_id = $1
      RETURNING *
    `;
    const result = await sql(query, [sessionId]);

    return result.length > 0;
  }
}
