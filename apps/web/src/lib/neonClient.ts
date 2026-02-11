// src/lib/neonClient.ts
import { neon } from '@neondatabase/serverless';

// Create a serverless connection to Neon
const connectionString = process.env.NEXT_PUBLIC_NEON_DATABASE_URL || '';

// Type for the SQL query function
export type SqlQueryFunction = {
  (template: TemplateStringsArray, ...values: any[]): Promise<any[]>;
  (query: string, params?: any[]): Promise<any[]>;
};

export const sql = neon(connectionString) as unknown as SqlQueryFunction;
