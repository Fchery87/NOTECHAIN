// src/lib/neonClient.ts
import { neon } from '@neondatabase/serverless';

// Create a serverless connection to Neon
const connectionString = process.env.NEXT_PUBLIC_NEON_DATABASE_URL || '';

/**
 * Result of a SELECT query that returns rows
 */
export interface QueryResultRow {
  [column: string]: unknown;
}

/**
 * Result of an INSERT, UPDATE, or DELETE query
 */
export interface QueryResultWithRowCount {
  rowCount: number;
  rows: QueryResultRow[];
}

/**
 * Type for the SQL query function with proper overloads
 * Uses a more flexible generic constraint to support entity types
 */
export type SqlQueryFunction = {
  <T = QueryResultRow>(template: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  <T = QueryResultRow>(query: string, params?: unknown[]): Promise<T[]>;
};

export const sql = neon(connectionString) as unknown as SqlQueryFunction;
