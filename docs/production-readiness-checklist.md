# NoteChain Production Readiness Checklist

Use this checklist for every release candidate. A release is not production-ready unless every required gate passes or has an explicitly documented exception.

## 1. Build and type gates

Required:

- `bun run --filter='@notechain/core-crypto' typecheck`
- `bun run --filter='@notechain/sync-engine' typecheck`
- `bun run --filter='@notechain/web' typecheck`
- production web build completes successfully

## 2. Focused trust-first test gates

Required:

- recovery key tests pass;
- encrypted local cache tests pass;
- remote note apply policy tests pass;
- encrypted backup tests pass;
- Markdown/JSON portability tests pass;
- local search and answer citation tests pass;
- static performance budget tests pass;
- launch-scope feature tests pass.

## 3. Security gates

Required:

- sync RPC migration guard passes;
- anon/public sync RPC execution remains revoked;
- `auth.uid()` remains the source of truth for sync writes;
- encrypted blob delete policy remains scoped to owner;
- cryptographic sharing ADR test passes;
- no new plaintext note cache is introduced.

## 4. Recovery and backup drill

Required before release:

1. Create a note.
2. Verify recovery key backup.
3. Export encrypted workspace backup.
4. Clear local browser storage in a test browser profile.
5. Import recovery key.
6. Import encrypted workspace backup.
7. Confirm note is restored from encrypted cache.

## 5. Portability drill

Required before release:

1. Export Markdown.
2. Export JSON workspace.
3. Import Markdown into a clean test profile.
4. Import JSON workspace into a clean test profile.
5. Confirm imported notes are encrypted locally.

## 6. Offline/PWA drill

Required before release:

- install/open the PWA;
- open Notes online once;
- go offline;
- reload Notes;
- confirm app shell loads and cached notes can render;
- confirm `/offline.html` fallback works for uncached navigation.

## 7. Performance gates

Required:

- core routes do not statically import heavy AI/OCR/PDF/graph libraries;
- heavy/experimental launch-scope features are disabled by default;
- bundle analyzer review is completed for release candidates.

## 8. Release documentation gates

Required:

- threat model is current;
- known revocation limitations are documented;
- backup/recovery limitations are documented;
- no product copy promises server-side recovery of encrypted data.

## 9. Rollback gates

Required:

- database migration rollback or mitigation notes exist;
- app rollback process is documented;
- backup restoration path has been tested before release.
