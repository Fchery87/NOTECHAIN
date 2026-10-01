import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationSql = readFileSync(
  join(process.cwd(), '../../supabase/migrations/020_drop_ambiguous_sync_rpc_overload.sql'),
  'utf8'
);

describe('020 sync RPC overload migration guard', () => {
  it('drops the legacy BIGINT insert_sync_operation overload', () => {
    expect(migrationSql).toMatch(/DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.insert_sync_operation/i);
    expect(migrationSql).toMatch(/BIGINT/i);
  });

  it('documents the PostgREST ambiguity this migration fixes', () => {
    expect(migrationSql).toMatch(/PGRST203/i);
    expect(migrationSql).toMatch(/PostgREST\s+cannot\s+choose/i);
  });
});
