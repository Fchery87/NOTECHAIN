// src/lib/repositories/BaseRepository.ts

import { sql } from '../neonClient';

export abstract class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    const result = await sql(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);

    return (result as any[]).length > 0 ? ((result as any[])[0] as T) : null;
  }

  async findAll(): Promise<T[]> {
    const result = await sql(`SELECT * FROM ${this.tableName}`);

    return result as T[];
  }

  async create(data: Partial<T>): Promise<T> {
    // Extract keys and values for insertion
    const keys = Object.keys(data).filter(key => key !== 'id'); // Exclude id for auto-generation
    const values = Object.values(data).filter((_, index) => Object.keys(data)[index] !== 'id');

    if (keys.length === 0) {
      throw new Error('No data provided for creation');
    }

    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const columns = keys.join(', ');

    const result = await sql(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    return (result as any[])[0] as T;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      throw new Error('No data provided for update');
    }

    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(data);

    const result = await sql(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );

    return (result as any[]).length > 0 ? ((result as any[])[0] as T) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await sql(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);

    return (result as any).rowCount > 0;
  }
}
