// src/lib/repositories/UserRepository.ts
import { BaseRepository } from './BaseRepository';
import { User } from '@notechain/data-models';
import { sql } from '../neonClient';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE email = $1`;
    const result = await sql(query, [email]);

    return result.length > 0 ? (result[0] as User) : null;
  }

  async createUser(email: string): Promise<User> {
    const query = `INSERT INTO ${this.tableName} (email) VALUES ($1) RETURNING *`;
    const result = await sql(query, [email]);

    return result[0] as User;
  }

  async updateUserProfile(userId: string, encryptedProfile: string): Promise<void> {
    const query = `
      INSERT INTO user_profiles (user_id, encrypted_profile_data) 
      VALUES ($1, $2) 
      ON CONFLICT (user_id) 
      DO UPDATE SET encrypted_profile_data = $2, updated_at = NOW()
    `;
    await sql(query, [userId, encryptedProfile]);
  }

  async getUserProfile(userId: string): Promise<string | null> {
    const query = `SELECT encrypted_profile_data FROM user_profiles WHERE user_id = $1`;
    const result = await sql(query, [userId]);

    return result.length > 0 ? result[0].encrypted_profile_data : null;
  }
}
