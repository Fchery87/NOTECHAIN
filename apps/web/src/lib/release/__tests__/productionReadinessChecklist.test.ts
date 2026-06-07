import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const checklist = readFileSync(
  join(process.cwd(), '../../docs/production-readiness-checklist.md'),
  'utf8'
);

describe('production readiness checklist', () => {
  it('documents build, type, and trust-first test gates', () => {
    expect(checklist).toContain("bun --filter='@notechain/web' run typecheck");
    expect(checklist).toContain('recovery key tests pass');
    expect(checklist).toContain('encrypted local cache tests pass');
    expect(checklist).toContain('encrypted backup tests pass');
  });

  it('documents security gates for sync and sharing', () => {
    expect(checklist).toContain('sync RPC migration guard passes');
    expect(checklist).toContain('`auth.uid()` remains the source of truth');
    expect(checklist).toContain('cryptographic sharing ADR test passes');
    expect(checklist).toContain('no new plaintext note cache is introduced');
  });

  it('documents recovery, backup, portability, and offline drills', () => {
    expect(checklist).toContain('Import recovery key');
    expect(checklist).toContain('Import encrypted workspace backup');
    expect(checklist).toContain('Export Markdown');
    expect(checklist).toContain('go offline');
  });

  it('documents performance and rollback gates', () => {
    expect(checklist).toContain('core routes do not statically import heavy');
    expect(checklist).toContain('heavy/experimental launch-scope features are disabled by default');
    expect(checklist).toContain('database migration rollback or mitigation notes exist');
  });
});
