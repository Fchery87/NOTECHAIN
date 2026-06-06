# Trust-First Implementation Roadmap

_Date: 2026-06-02_

This roadmap turns the codebase review findings into implementation work. The priority is to make NoteChain trustworthy before expanding the product surface.

## Guiding principle

Do not add major user-facing features until the trust foundation is reliable:

1. authenticated sync writes;
2. recoverable encryption keys;
3. deterministic local/remote sync;
4. durable data portability;
5. passing tests for critical flows.

## Phase 1 — Security and sync hardening

### 1. Harden sync RPC authorization

Status: started in `supabase/migrations/017_harden_sync_rpc_and_delete_policy.sql`.

Implementation requirements:

- `insert_sync_operation` must reject calls where `auth.uid()` is null.
- `insert_sync_operation` must reject calls where `p_user_id != auth.uid()`.
- Anonymous execute access must be revoked.
- Authenticated users may delete only their own encrypted blobs.
- Add database tests or Supabase integration tests for cross-user write/delete attempts.

Acceptance criteria:

- User A cannot insert/update/delete blobs for User B.
- Anonymous callers cannot execute sync RPC.
- Existing sync clients remain compatible.

### 2. Fix core note sync correctness

Status: started in:

- `apps/web/src/lib/sync/useNotesSync.ts`
- `apps/web/src/app/notes/page.tsx`
- `apps/web/src/lib/supabase/syncAdapter.ts`
- `packages/sync-engine/src/syncService.ts`

Implementation requirements:

- Note creation uses one stable UUID locally and remotely.
- Delete operations sync with the correct incremented version.
- Offline queue must only contain encrypted payloads, never plaintext or marker strings.
- Latest note loading must dedupe append-only operations by entity id.
- Tombstones/delete operations must suppress older note versions.
- Remote operations from the same session should be ignored as echoes.

Acceptance criteria:

- Creating a note produces exactly one synced note id.
- Updating a note does not create duplicate visible notes.
- Deleting a note hides older create/update operations after reload.
- Offline delete retries do not fail payload parsing.

### 3. Make remote operations apply to local state

Status: partially implemented.

Implemented:

- Added an application-level handler for `remoteOperationApplied`.
- Decrypts remote note payloads in the web app.
- Applies create/update/delete to mounted Notes page state.
- Stores encrypted newest-note operations in a local IndexedDB sync cache.
- Loads cached encrypted notes first, then refreshes from Supabase.

Conflict policy implemented for the current phase:

- Higher note operation version wins.
- Equal-version replays can refresh local state.
- Lower-version remote operations are ignored as stale.
- Delete operations are stored as tombstones and remove the note from the mounted Notes page.

Remaining implementation requirements:

- Add automated tests for remote note application in the React hook/page layer.
- Move broader note screens to read from the same canonical local cache.
- Evaluate whether rich-text concurrent editing should move from newest-version-wins to CRDT/merge semantics.

Acceptance criteria:

- Device A creates/updates/deletes a note.
- Device B receives and applies the operation without manual reload.
- Refreshed/reopened Notes page renders cached encrypted notes before network refresh.
- Sync resumes from a persisted per-user local sync cursor.
- Conflicting updates resolve according to documented policy.

## Phase 2 — Encryption recovery and key lifecycle

Status: foundation started.

Implemented:

- Added NoteChain recovery-key encoding/decoding with checksum validation.
- Added `KeyManager.exportRecoveryKey()` and `KeyManager.importRecoveryKey()`.
- Exposed recovery export/import through `EncryptedSyncService` and `useNotesSync`.
- Stopped `EncryptedSyncService.initialize()` from silently generating a new incompatible key after key-loading/decryption failure.
- Added Settings → Security UX to export, copy, download, and import a recovery key.

Implementation requirements:

- Add recovery-key generation/download/copy UX during onboarding.
- Add a dedicated recovery-key restore prompt when encryption initialization fails outside Settings.
- Add recovery-key verification before first sync.
- Add cross-device key transfer.
- Add key rotation.
- Add device revocation.
- Add threat-model documentation.

Acceptance criteria:

- Clearing browser storage does not permanently strand synced notes if the user has recovery material.
- Logging into a new device prompts for recovery/import instead of creating an incompatible key.
- Key mismatch is recoverable or clearly explained.

## Phase 3 — Portable local-first core

Status: not started.

Implementation requirements:

- Markdown export/import for notes.
- JSON export/import for full workspace data.
- Encrypted backup export/import.
- Attachment export/import.
- Obsidian/Joplin import path.
- Offline app-shell and navigation fallback.
- Browser/PWA share target or quick-capture inbox.

Acceptance criteria:

- User can leave NoteChain with readable Markdown.
- User can restore an encrypted backup into a clean browser/device.
- Core routes work offline after installation.

## Phase 4 — Search and knowledge retrieval

Status: partially implemented, needs product integration.

Implementation requirements:

- Unified search across notes, todos, meetings, PDFs, and OCR.
- Exact, fuzzy, and semantic search modes.
- Result highlighting and source citations.
- Permission-aware indexing.
- Saved searches and filters.
- AI answers must cite notes/attachments used as context.

Acceptance criteria:

- User can find information by exact term, fuzzy term, and semantic query.
- AI-generated answers show source notes and never use unauthorized content.

## Phase 5 — Collaboration after cryptographic sharing

Status: prototype only.

Implementation requirements:

- Per-document content keys.
- Recipient key wrapping for collaborators.
- Share-link key packages with expiration/max-use constraints.
- Revoke/rotate keys for future versions.
- Server-side document authorization for WebSocket joins.
- Durable operation history or adoption of a proven CRDT engine such as Yjs/Automerge.

Acceptance criteria:

- A collaborator can decrypt only documents explicitly shared with them.
- Revoked collaborators stop receiving future keys/updates.
- WebSocket server rejects unauthorized document joins.

## Deferred or reduced scope

The following should not block the trust-first launch:

- custom CRDT beyond simple sync correctness;
- blockchain/decentralized storage features;
- broad admin analytics;
- heavy local AI models by default;
- PDF signing workflows;
- full calendar two-way sync across all providers.

These can return after encryption, sync, recovery, and portability are proven.
