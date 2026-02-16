// src/lib/repositories/BaseRepository.ts

import { sql, QueryResultRow } from '../neonClient';

/**
 * Whitelist of allowed table names to prevent SQL injection
 * Only these table names can be used in repository queries
 */
const ALLOWED_TABLES = [
  'notes',
  'todos',
  'pdfs',
  'pdf_signatures',
  'calendar_events',
  'meetings',
  'meeting_transcripts',
  'teams',
  'team_members',
  'profiles',
  'tags',
  'note_tags',
  'links',
  'share_links',
  'activity_log',
  'sync_queue',
  'devices',
  'encrypted_shares',
  'audit_logs',
  'user_sessions',
] as const;

export type AllowedTable = (typeof ALLOWED_TABLES)[number];

/**
 * Base interface for all database entities
 */
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Validates that a table name is in the whitelist
 * @param tableName The table name to validate
 * @throws Error if table name is not in the whitelist
 */
function validateTableName(tableName: string): asserts tableName is AllowedTable {
  if (!ALLOWED_TABLES.includes(tableName as AllowedTable)) {
    throw new Error(
      `Invalid table name: "${tableName}". ` +
        `Table name must be one of: ${ALLOWED_TABLES.join(', ')}. ` +
        'This is a security measure to prevent SQL injection.'
    );
  }
}

/**
 * Validates column names to prevent SQL injection
 * Only allows alphanumeric characters and underscores
 */
function validateColumnName(columnName: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
    throw new Error(
      `Invalid column name: "${columnName}". ` +
        'Column names must contain only alphanumeric characters and underscores, ' +
        'and must not start with a number.'
    );
  }
}

/**
 * Validates all column names in an array
 */
function validateColumnNames(columnNames: string[]): void {
  columnNames.forEach(validateColumnName);
}

/**
 * Type guard to check if a result has rowCount property
 */
function hasRowCount(result: unknown): result is { rowCount: number } {
  return (
    typeof result === 'object' &&
    result !== null &&
    'rowCount' in result &&
    typeof (result as { rowCount: unknown }).rowCount === 'number'
  );
}

export abstract class BaseRepository<T extends BaseEntity> {
  protected tableName: AllowedTable;

  constructor(tableName: string) {
    // Validate table name against whitelist
    validateTableName(tableName);
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    const result = await sql<T>(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);

    return result.length > 0 ? result[0] : null;
  }

  async findAll(): Promise<T[]> {
    const result = await sql<T>(`SELECT * FROM ${this.tableName}`);

    return result;
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    // Extract keys and values for insertion
    const keys = Object.keys(data) as (keyof T)[];
    const values = Object.values(data);

    if (keys.length === 0) {
      throw new Error('No data provided for creation');
    }

    // Validate column names to prevent SQL injection
    validateColumnNames(keys as string[]);

    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const columns = keys.join(', ');

    const result = await sql<T>(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    if (result.length === 0) {
      throw new Error('Failed to create record');
    }

    return result[0];
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T | null> {
    const keys = Object.keys(data) as (keyof T)[];
    if (keys.length === 0) {
      throw new Error('No data provided for update');
    }

    // Validate column names to prevent SQL injection
    validateColumnNames(keys as string[]);

    const setClause = keys.map((key, index) => `${String(key)} = $${index + 1}`).join(', ');
    const values = Object.values(data);

    const result = await sql<T>(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );

    return result.length > 0 ? result[0] : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await sql<QueryResultRow>(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);

    // Handle both array result and result with rowCount
    if (hasRowCount(result)) {
      return result.rowCount > 0;
    }

    // For array results, check if any rows were returned
    return Array.isArray(result) && result.length > 0;
  }
}

/**
 * Export the allowed tables for external use
 */
export { ALLOWED_TABLES };
