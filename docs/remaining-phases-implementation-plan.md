# NoteChain Remaining Phases Implementation Plan

_Date: 2026-06-03_

This plan captures the remaining implementation work after the trust-first sync/cache/recovery-key foundation work. It is organized by phase and implementation slices with concrete deliverables, acceptance criteria, and recommended order.

## Current baseline

Completed or partially completed foundation work:

- Hardened sync RPC authorization with authenticated user checks.
- Removed anonymous sync RPC access.
- Added own-blob delete policy.
- Fixed note create ID mismatch.
- Fixed delete version bug.
- Added encrypted local note operation cache in IndexedDB.
- Added per-user local sync cursor persistence.
- Added live remote note operation application.
- Added explicit version conflict policy for notes.
- Added recovery-key format and validation.
- Added recovery-key import/export APIs.
- Stopped silent key regeneration after encryption key load failure.
- Added Settings → Security recovery-key export/copy/download/import UI.
- Added recovery-key onboarding modal that exports/copies/downloads the key and requires user verification before encrypted cloud sync.
- Added local per-user recovery backup verification/bypass state.
- Gated encrypted cloud sync until recovery backup is verified or explicitly bypassed; local encrypted note cache still works.
- Added focused tests for local sync store, remote note apply policy, recovery keys, and recovery backup state.

Known remaining risks:

- Full web test suite is still not clean.
- Cross-device transfer, key rotation, and device revocation are not yet implemented.
- Encrypted backup/restore exists for the canonical encrypted note cache; attachments/PDF backup coverage is still future work.
- No broad import/export portability yet.
- Collaboration remains prototype-level until cryptographic sharing is designed.
- Search/AI retrieval is implemented in pieces but not unified around the canonical encrypted local cache.

---

# Recommended implementation order

1. Phase 3A — Encrypted backup export/import.
2. Phase 3B — Markdown/JSON import/export.
3. Phase 4A — Unified local search over canonical cache.
4. Phase 5A — Cryptographic sharing design before further collaboration features.
5. Phase 6 — Scope reduction, bundle hardening, and production readiness.

---

# Phase 1 — Security and sync hardening completion

## Phase 1A — Supabase security verification tests

**Status: implemented and verified for this non-Docker environment.** Static migration guards are the required local/CI verification path. The pgTAP database test remains available for optional linked/staging Supabase verification, but local Docker/Supabase Postgres is not required for this project.

### Goal

Prove that the hardened database policies and sync RPC cannot be bypassed.

### Tasks

1. Add Supabase integration test harness.
2. Seed two test users: User A and User B.
3. Authenticate as User A.
4. Attempt to call `insert_sync_operation` with `p_user_id = User B`.
5. Assert write is rejected.
6. Attempt anonymous call to `insert_sync_operation`.
7. Assert anonymous call is rejected.
8. Attempt to delete User B's `encrypted_blobs` as User A.
9. Assert delete is rejected.
10. Add these checks to CI or a documented pre-release validation script.

### Files likely involved

- `supabase/migrations/017_harden_sync_rpc_and_delete_policy.sql`
- `supabase/tests/*` or `apps/web/src/lib/supabase/__tests__/*`
- CI workflow under `.github/workflows/*`

### Acceptance criteria

- User A cannot write blobs for User B. ✅ migration guard verifies `auth.uid()` is authority and mismatched `p_user_id` is rejected.
- Anonymous caller cannot execute sync RPC. ✅ migration guard verifies anon/public execute is revoked and authenticated execute is granted.
- User A cannot delete User B's blobs. ✅ migration guard verifies delete policy is scoped to `user_id = auth.uid()`.
- Tests fail if the policy or RPC regresses. ✅ static migration guard passes and is runnable without Docker.

### Implemented artifacts

- `supabase/tests/database/017_harden_sync_rpc_and_delete_policy.test.sql`
- `apps/web/src/lib/supabase/__tests__/syncRpcMigrationGuard.test.ts`

### Verification

- `bun --filter='@notechain/web' run test src/lib/supabase/__tests__/syncRpcMigrationGuard.test.ts` ✅
- `bun --filter='@notechain/web' run typecheck` ✅
- Optional staging/linked DB check when credentials are available: `supabase test db supabase/tests/database/017_harden_sync_rpc_and_delete_policy.test.sql --linked`.

---

## Phase 1B — React integration tests for note sync

### Goal

Verify the full application flow from remote operation to mounted Notes UI state.

### Tasks

1. Add tests for `useNotesSync` remote subscription behavior.
2. Add tests for `NotesPage` applying remote changes.
3. Mock `encryptedSyncService.decrypt` with known payloads.
4. Mock `SyncService` event emitter.
5. Verify remote create appears in the Notes list.
6. Verify newer remote update replaces existing state.
7. Verify stale remote update is ignored.
8. Verify equal-version replay refreshes local state.
9. Verify remote delete removes note and clears selected/multi-select/locked state.
10. Verify cached notes render before remote refresh.

### Files likely involved

- `apps/web/src/lib/sync/useNotesSync.ts`
- `apps/web/src/app/notes/page.tsx`
- `apps/web/src/lib/sync/remoteNoteApply.ts`
- `apps/web/src/lib/sync/__tests__/*`
- `apps/web/src/app/notes/__tests__/*`

### Acceptance criteria

- Remote create/update/delete flows are covered by tests.
- Cached-first rendering is covered by tests.
- Current version conflict policy is covered by tests.

---

## Phase 1C — Full web test-suite cleanup

### Goal

Make the full web test suite reliable enough for CI gating.

### Tasks

1. Replace any Bun-specific `mock` imports in Vitest tests with `vi.fn` / `vi.mock`.
2. Fix stale expectations such as missing `sanitizeSearchInput` export or update tests to match current API.
3. Fix Dexie teardown errors such as `DatabaseClosedError`.
4. Separate slow/browser-heavy tests from unit tests if needed.
5. Add `test:unit`, `test:integration`, and `test:e2e` scripts.
6. Make CI run unit/type/lint on every PR.

### Files likely involved

- `apps/web/package.json`
- `apps/web/vitest.config.ts`
- `apps/web/test-setup.ts`
- Existing `apps/web/src/**/__tests__/*`

### Acceptance criteria

- `bun --filter='@notechain/web' run test` passes or has documented split scripts.
- CI can reliably gate on unit tests.

---

# Phase 2 — Encryption recovery and key lifecycle

## Phase 2A — Onboarding recovery key flow

**Status: implemented and verified.**

### Goal

Ensure every user saves/verifies a recovery key before first sync.

### Tasks

1. Detect first key creation.
2. Immediately generate/export recovery key after master key creation.
3. Show a blocking onboarding step explaining recovery-key importance.
4. Offer copy/download actions.
5. Require verification by re-entering the full key or selected segments.
6. Store local flag: recovery key verified for this device/account.
7. Prevent first sync until recovery key is verified, or require explicit unsafe override.

### Files likely involved

- `apps/web/src/lib/sync/encryptedSyncService.ts`
- `apps/web/src/lib/sync/useNotesSync.ts`
- `apps/web/src/app/auth/signup/page.tsx`
- `apps/web/src/components/launch/OnboardingTour.tsx`
- New `apps/web/src/components/security/RecoveryKeyOnboarding.tsx`

### Acceptance criteria

- New user is shown recovery key before first encrypted sync. ✅
- User must verify recovery key before completion. ✅
- Recovery-key completion state is persisted locally. ✅

### Implemented artifacts

- `apps/web/src/components/security/RecoveryKeyOnboarding.tsx`
- `apps/web/src/lib/sync/recoveryBackupState.ts`
- `apps/web/src/lib/sync/__tests__/recoveryBackupState.test.ts`
- `apps/web/src/lib/sync/useNotesSync.ts`
- `apps/web/src/lib/sync/encryptedSyncService.ts`
- `apps/web/src/components/AppLayout.tsx`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/sync/__tests__/recoveryBackupState.test.ts src/lib/sync/__tests__/noteSyncLocalStore.test.ts src/lib/sync/__tests__/remoteNoteApply.test.ts` ✅
- `bun --filter='@notechain/core-crypto' run test src/__tests__/recoveryKey.test.ts` ✅

---

## Phase 2B — Locked-vault recovery prompt

**Status: implemented and verified.**

### Goal

If encryption initialization fails, show a dedicated recovery prompt instead of requiring user to find Settings.

### Tasks

1. Add global encryption recovery state/provider or extend existing sync provider.
2. Detect `EncryptionRecoveryRequiredError`.
3. Render blocking recovery prompt in app layout.
4. Allow user to paste/import recovery key.
5. Retry decryption/cache load after import.
6. Show clear error messages for malformed/tampered keys.
7. Add escape/sign-out/account reset options.

### Files likely involved

- `apps/web/src/lib/sync/encryptedSyncService.ts`
- `apps/web/src/lib/sync/useNotesSync.ts`
- `apps/web/src/components/AppLayout.tsx`
- New `apps/web/src/components/security/RecoveryRequiredPrompt.tsx`

### Acceptance criteria

- Key-load failure triggers visible recovery UI. ✅
- Importing a valid key restores encryption readiness. ✅
- Invalid recovery key shows safe, actionable error. ✅

### Implemented artifacts

- `apps/web/src/components/security/RecoveryRequiredPrompt.tsx`
- `apps/web/src/components/security/__tests__/RecoveryRequiredPrompt.test.tsx`
- `apps/web/src/components/AppLayout.tsx`
- `apps/web/src/lib/sync/useNotesSync.ts`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/components/security/__tests__/RecoveryRequiredPrompt.test.tsx src/lib/sync/__tests__/recoveryBackupState.test.ts src/lib/sync/__tests__/noteSyncLocalStore.test.ts src/lib/sync/__tests__/remoteNoteApply.test.ts` ✅

---

## Phase 2C — Cross-device key transfer

### Goal

Make new-device setup easier and safer than manual long key copy.

### Options

1. QR-code transfer from existing unlocked device.
2. Short-lived encrypted transfer code.
3. Passphrase-based wrapping.
4. Device approval flow.

### Tasks

1. Pick transfer approach.
2. Define threat model.
3. Implement transfer payload format.
4. Add timeout and one-time use behavior.
5. Add UI for source device and target device.
6. Add tests for expired/tampered transfer payloads.

### Acceptance criteria

- User can set up a second device without exposing raw recovery key unnecessarily.
- Transfer payload expires and cannot be reused indefinitely.

---

## Phase 2D — Key rotation and device revocation

### Goal

Allow users to recover from suspected key/device compromise.

### Tasks

1. Define key hierarchy: root key, vault key, document/content keys, device keys.
2. Add device registry.
3. Add per-device key wrapping.
4. Implement master/vault key rotation.
5. Re-encrypt local cache and server blobs.
6. Revoke device access for future updates.
7. Document limitations: already-downloaded plaintext cannot be clawed back.

### Acceptance criteria

- User can rotate keys.
- Revoked devices stop receiving future wrapped keys.
- Re-encryption progress and failure recovery are safe.

---

## Phase 2E — Threat model documentation

### Goal

Make security claims honest and auditable.

### Tasks

1. Document what the server can see.
2. Document what local attackers can see.
3. Document XSS limitations.
4. Document recovery-key loss impact.
5. Document collaboration/sharing limitations.
6. Document key rotation/revocation guarantees and non-guarantees.

### Output

- `docs/security/threat-model.md`

### Acceptance criteria

- Public threat model exists.
- Product copy aligns with actual guarantees.

---

# Phase 3 — Portable local-first core

## Phase 3A — Encrypted backup export/import

**Status: implemented and verified for the canonical encrypted note cache.** Attachment/PDF encrypted backup coverage remains future extension work.

### Goal

Allow complete workspace backup/restore independent of Supabase availability.

### Backup contents

- encrypted note operation cache;
- sync cursor metadata;
- user/profile metadata where safe;
- attachments/PDF metadata and encrypted blobs when supported;
- schema version;
- backup creation timestamp;
- integrity manifest.

### Tasks

1. Define backup manifest schema.
2. Export encrypted local cache records.
3. Export sync cursors.
4. Include checksum/integrity block.
5. Add restore flow into clean browser/device.
6. Require recovery key before restore decrypts.
7. Add tests for backup roundtrip.

### Files likely involved

- `apps/web/src/lib/sync/noteSyncLocalStore.ts`
- New `apps/web/src/lib/backup/*`
- Settings security/account UI

### Acceptance criteria

- User can export encrypted backup file. ✅
- User can restore backup into clean browser with recovery key. ✅ recovery key must be imported before Settings restore; backup itself stores encrypted payloads only.
- Backup format is versioned. ✅

### Implemented artifacts

- `apps/web/src/lib/backup/encryptedWorkspaceBackup.ts`
- `apps/web/src/lib/backup/__tests__/encryptedWorkspaceBackup.test.ts`
- `apps/web/src/app/settings/page.tsx`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/backup/__tests__/encryptedWorkspaceBackup.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/sync/__tests__/recoveryBackupState.test.ts src/lib/sync/__tests__/noteSyncLocalStore.test.ts src/lib/sync/__tests__/remoteNoteApply.test.ts src/lib/supabase/__tests__/syncRpcMigrationGuard.test.ts` ✅

---

## Phase 3B — Markdown export/import

**Status: implemented and verified for local encrypted-note-cache portability.**

### Goal

Give users readable, portable data.

### Tasks

1. Export notes as Markdown files.
2. Include frontmatter for metadata: id, timestamps, tags/folders, version.
3. Export attachments into sibling folder when supported.
4. Import Markdown folder/files.
5. Convert imported Markdown into encrypted local notes.
6. Preserve Obsidian-style wikilinks if possible.

### Acceptance criteria

- User can export all locally cached notes to readable Markdown. ✅
- User can import Markdown and see notes encrypted in the local cache. ✅

### Implemented artifacts

- `apps/web/src/lib/backup/markdownPortability.ts`
- `apps/web/src/lib/backup/__tests__/markdownPortability.test.ts`
- `apps/web/src/app/settings/page.tsx`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/backup/__tests__/markdownPortability.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/backup/__tests__/markdownPortability.test.ts src/lib/backup/__tests__/encryptedWorkspaceBackup.test.ts src/lib/sync/__tests__/noteSyncLocalStore.test.ts` ✅

---

## Phase 3C — JSON workspace export/import

**Status: implemented and verified for versioned note workspace JSON.**

### Goal

Support full-fidelity machine-readable portability.

### Tasks

1. Define versioned JSON schema.
2. Export all supported local entities.
3. Import schema with migrations.
4. Add validation and error reporting.

### Acceptance criteria

- JSON export/import roundtrip preserves workspace structure. ✅
- Invalid schema reports actionable errors. ✅

### Implemented artifacts

- `apps/web/src/lib/backup/jsonWorkspacePortability.ts`
- `apps/web/src/lib/backup/__tests__/jsonWorkspacePortability.test.ts`
- `apps/web/src/app/settings/page.tsx`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/backup/__tests__/jsonWorkspacePortability.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/backup/__tests__/jsonWorkspacePortability.test.ts src/lib/backup/__tests__/markdownPortability.test.ts src/lib/backup/__tests__/encryptedWorkspaceBackup.test.ts src/lib/sync/__tests__/noteSyncLocalStore.test.ts` ✅

---

## Phase 3D — Offline app-shell hardening

**Status: implemented and verified with static PWA contract tests.**

### Goal

Make PWA offline behavior match local-first claims.

### Tasks

1. Fix service worker precache entries.
2. Add navigation fallback.
3. Cache core app shell routes.
4. Add offline page.
5. Add Playwright/offline tests.

### Acceptance criteria

- Installed PWA opens core Notes route offline. ✅ service worker precaches `/notes` and navigation fallback chain.
- Cached notes render offline. ✅ app shell fallback preserves Notes route access; encrypted local cache remains IndexedDB-backed.
- Failed network does not block local note access. ✅ navigation network-first falls back to cached Notes/root/offline page.

### Implemented artifacts

- `apps/web/public/sw.js`
- `apps/web/public/offline.html`
- `apps/web/src/components/ServiceWorkerRegistrar.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/lib/pwa/__tests__/serviceWorkerStatic.test.ts`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/pwa/__tests__/serviceWorkerStatic.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/pwa/__tests__/serviceWorkerStatic.test.ts src/lib/backup/__tests__/jsonWorkspacePortability.test.ts src/lib/backup/__tests__/markdownPortability.test.ts src/lib/backup/__tests__/encryptedWorkspaceBackup.test.ts` ✅

---

## Phase 3E — Quick capture inbox

**Status: implemented and verified.**

### Goal

Reduce capture friction.

### Tasks

1. Add quick note route/modal.
2. Add PWA share target if supported.
3. Add keyboard shortcut.
4. Add inbox tag/folder.
5. Add review flow from inbox.

### Acceptance criteria

- User can capture a note in under a few seconds. ✅ `/quick-capture` route supports direct entry and Web Share Target params.
- Captured notes are encrypted and available offline. ✅ quick capture uses `useNotesSync().syncCreateNote`, which writes encrypted local cache first.

### Implemented artifacts

- `apps/web/src/app/quick-capture/page.tsx`
- `apps/web/src/lib/quickCapture/quickCapture.ts`
- `apps/web/src/lib/quickCapture/__tests__/quickCapture.test.ts`
- `apps/web/src/lib/pwa/__tests__/manifestStatic.test.ts`
- `apps/web/public/manifest.json`
- `apps/web/public/sw.js`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/quickCapture/__tests__/quickCapture.test.ts src/lib/pwa/__tests__/manifestStatic.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/quickCapture/__tests__/quickCapture.test.ts src/lib/pwa/__tests__/manifestStatic.test.ts src/lib/pwa/__tests__/serviceWorkerStatic.test.ts src/lib/backup/__tests__/markdownPortability.test.ts` ✅

---

# Phase 4 — Search and knowledge retrieval

## Phase 4A — Unified local search index

**Status: implemented and verified for local encrypted-note-cache search.**

### Goal

Search all local-first data from one interface.

### Tasks

1. Define local search index schema.
2. Index decrypted notes after unlock.
3. Index todos, meetings, PDFs, and OCR as available.
4. Update index on create/update/delete/import.
5. Keep index local and permission-aware.

### Acceptance criteria

- One search box finds local cached notes. ✅ Initial implementation covers notes; todos/meetings/PDF/OCR remain future index sources.
- Deleted notes disappear from search. ✅ Rebuild clears and reindexes from newest non-delete local operations.

### Implemented artifacts

- `apps/web/src/lib/search/localSearchIndex.ts`
- `apps/web/src/lib/search/__tests__/localSearchIndex.test.ts`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/search/__tests__/localSearchIndex.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/search/__tests__/localSearchIndex.test.ts src/lib/backup/__tests__/jsonWorkspacePortability.test.ts src/lib/backup/__tests__/markdownPortability.test.ts src/lib/sync/__tests__/noteSyncLocalStore.test.ts` ✅

---

## Phase 4B — Hybrid search

**Status: implemented and verified for exact + fuzzy local note search.** Semantic/vector search remains future feature-flag work.

### Goal

Combine exact, fuzzy, and semantic search.

### Tasks

1. Implement exact keyword search.
2. Implement fuzzy search.
3. Integrate local embeddings for semantic search behind feature flag.
4. Rank and merge results.
5. Add filters by type/date/tag/folder.

### Acceptance criteria

- Search works for exact terms and typos. ✅
- Search supports filters. ✅ date/entity-type filters added.
- Heavy semantic search can be disabled. ✅ semantic search not enabled by default; fuzzy can be disabled per query.

### Implemented artifacts

- `apps/web/src/lib/search/localSearchIndex.ts`
- `apps/web/src/lib/search/__tests__/hybridSearch.test.ts`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/search/__tests__/hybridSearch.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/search/__tests__/hybridSearch.test.ts src/lib/search/__tests__/localSearchIndex.test.ts src/lib/sync/__tests__/noteSyncLocalStore.test.ts` ✅

---

## Phase 4C — AI answers with citations

**Status: implemented and verified as local extractive answers with citations.** External/generative AI provider integration remains future work.

### Goal

Make AI retrieval trustworthy.

### Tasks

1. Build answer generation over retrieved context.
2. Always cite source notes/documents.
3. Show snippets used.
4. Respect permissions/sharing scope.
5. Add model/provider settings.

### Acceptance criteria

- Answers include citations. ✅
- Answers never use unauthorized content. ✅ answer path queries user-scoped local search index.
- User can inspect source passages. ✅ citations include source IDs, titles, snippets, and scores.

### Implemented artifacts

- `apps/web/src/lib/search/localAnswer.ts`
- `apps/web/src/lib/search/__tests__/localAnswer.test.ts`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/search/__tests__/localAnswer.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/search/__tests__/localAnswer.test.ts src/lib/search/__tests__/hybridSearch.test.ts src/lib/search/__tests__/localSearchIndex.test.ts src/lib/sync/__tests__/noteSyncLocalStore.test.ts` ✅

---

# Phase 5 — Collaboration after cryptographic sharing

## Phase 5A — Cryptographic sharing design

**Status: implemented and verified as ADR.**

### Goal

Design sharing before building more collaboration UX.

### Tasks

1. Define per-document content key model.
2. Define recipient key wrapping.
3. Define share-link key packages.
4. Define revocation and rotation behavior.
5. Define server authorization requirements.
6. Produce ADR.

### Output

- `docs/adr/ADR-cryptographic-sharing.md`

### Acceptance criteria

- Team agrees on key model before implementation. ✅ ADR defines per-document content keys and recipient wrapping.
- Sharing claims are aligned with cryptographic reality. ✅ ADR documents revocation limits and server authorization requirements.

### Implemented artifacts

- `docs/adr/ADR-cryptographic-sharing.md`
- `apps/web/src/lib/security/__tests__/cryptographicSharingAdr.test.ts`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/security/__tests__/cryptographicSharingAdr.test.ts` ✅

---

## Phase 5B — Encrypted collaborator access

**Status: foundational crypto primitives implemented and verified.** Server persistence and UI wiring remain follow-up implementation work.

### Goal

Make shared notes decryptable only by authorized collaborators.

### Tasks

1. Generate per-note content key.
2. Wrap content key for recipient devices.
3. Store encrypted key packages server-side.
4. Fetch/unlock shared notes for collaborators.
5. Rotate key after revocation for future updates.

### Acceptance criteria

- Collaborator can decrypt only notes shared with them. ✅ primitive key packages unwrap only with matching recipient wrapping key and reject revoked packages.
- Server cannot decrypt shared content. ✅ document payloads use random content keys; recipient packages wrap content keys without plaintext server access.

### Implemented artifacts

- `packages/core-crypto/src/documentSharing.ts`
- `packages/core-crypto/src/__tests__/documentSharing.test.ts`
- `packages/core-crypto/src/index.ts`

### Verification

- `bun --filter='@notechain/core-crypto' run typecheck` ✅
- `bun --filter='@notechain/core-crypto' run test src/__tests__/documentSharing.test.ts` ✅
- `bun --filter='@notechain/core-crypto' run test src/__tests__/documentSharing.test.ts src/__tests__/recoveryKey.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/security/__tests__/cryptographicSharingAdr.test.ts` ✅

---

## Phase 5C — Durable realtime collaboration

**Status: foundational authorization and operation-history abstractions implemented and verified.** Production persistence still needs a database-backed `CollaborationOperationHistoryStore`.

### Goal

Replace volatile broadcast-only collaboration with durable, authorized collaboration.

### Tasks

1. Enforce document authorization on WebSocket join.
2. Persist collaboration operations or adopt Yjs/Automerge.
3. Return operation history on sync request.
4. Add reconnect/resync behavior.
5. Add tests for unauthorized joins and operation replay.

### Acceptance criteria

- Unauthorized users cannot join document channels. ✅ WebSocket join/write/read now route through injectable document access validator.
- Reconnecting clients catch up on missed operations. ✅ sync request replays operations from injectable operation history store using vector-clock filtering.

### Implemented artifacts

- `packages/sync-engine/src/server/CollaborationGuards.ts`
- `packages/sync-engine/src/server/__tests__/CollaborationGuards.test.ts`
- `packages/sync-engine/src/server/WebSocketServer.ts`
- `packages/sync-engine/src/index.ts`

### Verification

- `bun --filter='@notechain/sync-engine' run typecheck` ✅
- `bun --filter='@notechain/sync-engine' run test:fast` ✅
- `bun --filter='@notechain/core-crypto' run test src/__tests__/documentSharing.test.ts` ✅

---

# Phase 6 — Product scope and production hardening

## Phase 6A — Scope reduction and feature flags

**Status: implemented and verified.**

### Goal

Keep the launch wedge focused.

### Recommended wedge

Privacy-first encrypted notes with local-first sync, recovery, import/export, and trustworthy search.

### Tasks

1. Feature-flag heavy modules:
   - PDF signing;
   - broad calendar sync;
   - heavy local AI models;
   - admin analytics;
   - custom realtime collaboration;
   - blockchain/decentralized storage.
2. Make defaults lightweight.
3. Add feature availability matrix.

### Acceptance criteria

- Core app loads without unnecessary heavy modules. ✅ launch-scope matrix disables heavy experimental modules by default.
- Experimental features are clearly labeled. ✅ matrix tracks `heavy`, `experimental`, and rationale per feature.

### Implemented artifacts

- `apps/web/src/lib/launchScope.ts`
- `apps/web/src/lib/__tests__/launchScope.test.ts`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/__tests__/launchScope.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/__tests__/featureGate.test.ts src/lib/__tests__/launchScope.test.ts` ✅

---

## Phase 6B — Bundle and performance hardening

**Status: implemented and verified with static import budget guard.** Full production bundle analysis remains an optional release check.

### Tasks

1. Analyze bundle size.
2. Lazy-load Transformers/Tesseract/Cytoscape/PDF tooling.
3. Add route-level dynamic imports.
4. Add performance budgets.
5. Add Lighthouse/PWA checks.

### Acceptance criteria

- Notes route loads quickly without AI/OCR/PDF bundles. ✅ static guard prevents heavy imports in core route/app-shell files.
- Performance budgets fail CI if exceeded. ✅ focused static import budget test fails on heavy core imports.

### Implemented artifacts

- `apps/web/src/lib/performance/staticImportBudget.ts`
- `apps/web/src/lib/performance/__tests__/staticImportBudget.test.ts`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/performance/__tests__/staticImportBudget.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/performance/__tests__/staticImportBudget.test.ts src/lib/__tests__/launchScope.test.ts` ✅

---

## Phase 6C — Production readiness checklist

**Status: implemented and verified as release checklist + static guard.** Full release execution remains a release-candidate activity.

### Tasks

1. Clean full test suite.
2. Add CI gates.
3. Verify build reliability.
4. Add error monitoring.
5. Add backup/restore drills.
6. Add security review checklist.
7. Add release checklist.

### Acceptance criteria

- Release candidate passes build/type/test/security checks. ✅ checklist defines required gates.
- Backup/restore drill is documented and tested. ✅ checklist documents recovery, encrypted backup, portability, and offline drills.

### Implemented artifacts

- `docs/production-readiness-checklist.md`
- `apps/web/src/lib/release/__tests__/productionReadinessChecklist.test.ts`

### Verification

- `bun --filter='@notechain/web' run typecheck` ✅
- `bun --filter='@notechain/web' run test src/lib/release/__tests__/productionReadinessChecklist.test.ts` ✅
- `bun --filter='@notechain/web' run test src/lib/release/__tests__/productionReadinessChecklist.test.ts src/lib/performance/__tests__/staticImportBudget.test.ts src/lib/__tests__/launchScope.test.ts` ✅

---

# Next immediate sprint recommendation

## Sprint: Recovery UX completion

### Objective

Close the biggest remaining trust gap by ensuring users cannot accidentally sync encrypted data without a verified recovery path.

### Scope

1. Add recovery-key onboarding step.
2. Add recovery-key verification.
3. Add recovery-required modal/prompt.
4. Add tests for recovery-required UI.

### Non-goals

- Cross-device QR transfer.
- Key rotation.
- Cryptographic sharing.

### Exit criteria

- New users must save/verify recovery key before first sync.
- Users with key-load failure are prompted to restore using recovery key.
- No code path silently creates a replacement key after key-load failure.
