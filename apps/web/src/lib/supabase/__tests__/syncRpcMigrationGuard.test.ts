import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationSql = readFileSync(
  join(process.cwd(), '../../supabase/migrations/017_harden_sync_rpc_and_delete_policy.sql'),
  'utf8'
);

describe('017 hardened sync RPC migration guard', () => {
  it('uses auth.uid as the authority for insert_sync_operation', () => {
    expect(migrationSql).toMatch(/v_auth_uid\s*:=\s*auth\.uid\(\)/i);
    expect(migrationSql).toMatch(/IF\s+v_auth_uid\s+IS\s+NULL\s+THEN/i);
    expect(migrationSql).toMatch(/p_user_id\s+IS\s+NULL\s+OR\s+p_user_id\s*<>\s*v_auth_uid/i);
    expect(migrationSql).toMatch(
      /RAISE\s+EXCEPTION\s+'not authorized to write sync operations for this user'/i
    );
  });

  it('writes rows using the authenticated uid rather than the caller-provided user id', () => {
    expect(migrationSql).toMatch(/VALUES\s*\(\s*v_auth_uid,/i);
    expect(migrationSql).toMatch(
      /WHERE\s+user_id\s*=\s*v_auth_uid\s+AND\s+blob_uuid\s*=\s*p_entity_id/i
    );
  });

  it('revokes public and anonymous execute access while granting authenticated access', () => {
    expect(migrationSql).toMatch(
      /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.insert_sync_operation[\s\S]*FROM\s+anon/i
    );
    expect(migrationSql).toMatch(
      /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.insert_sync_operation[\s\S]*FROM\s+PUBLIC/i
    );
    expect(migrationSql).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.insert_sync_operation[\s\S]*TO\s+authenticated/i
    );
  });

  it('adds a delete policy scoped to auth.uid', () => {
    expect(migrationSql).toMatch(/CREATE\s+POLICY\s+"Users can delete own encrypted blobs"/i);
    expect(migrationSql).toMatch(/FOR\s+DELETE\s+USING\s*\(\s*user_id\s*=\s*auth\.uid\(\)\s*\)/i);
  });
});
