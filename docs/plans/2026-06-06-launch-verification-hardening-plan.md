# Launch Verification Hardening Plan

Status: Accepted planning direction
Date: 2026-06-06
Related docs: `docs/testing.md`, `docs/plans/2026-06-06-meeting-to-knowledge-implementation-roadmap.md`

## Purpose

Define how NoteChain should grow from the current fast `verify:launch` command into a broader launch gate without making routine agent verification slow, flaky, or ambiguous.

The recommendation is **do not immediately expand `bun run verify:launch` to the full suite**. Keep it fast and reliable while adding focused verification classes only after they are stable, non-overlapping, and useful for launch confidence.

## Current State

### Current canonical commands

From the repository root:

```bash
bun run test:web:file src/path/to/file.test.ts
bun run smoke:meeting-to-knowledge
bun run verify:launch
```

Current `verify:launch` runs:

```bash
bun run smoke:meeting-to-knowledge && bun --filter='@notechain/web' run typecheck
```

The Meeting-to-Knowledge smoke suite currently covers the core wedge:

- prototype surface notice;
- launch scope / public-beta Shared Spaces gate;
- derived metadata privacy guard;
- meeting action item extraction/provenance;
- meeting storage normalization;
- action item → task conversion;
- meeting prep context;
- meeting follow-ups;
- Context Graph typed entities;
- cited context search;
- note/task integration workflow.

### Current test inventory

As of this plan, the repo has roughly:

- 78 test files total under `apps/web/src` and `packages`;
- 67 app/web test files;
- 11 package test files;
- 43 lib-focused tests;
- 15 component-focused tests;
- 3 API tests;
- 1 integration test.

The full suite exists, but prior full-suite runs have had runtime/reliability issues. Agents should prefer targeted tests plus `verify:launch` until the full suite is stabilized.

## Command Hierarchy

### 1. Targeted regression command

Use during implementation:

```bash
bun run test:web:file src/path/to/file.test.ts
```

Purpose: prove the touched unit/component/integration behavior quickly.

### 2. Wedge smoke command

Use for Meeting-to-Knowledge work:

```bash
bun run smoke:meeting-to-knowledge
```

Purpose: prove the strategic wedge still works.

### 3. Current launch gate

Use before saying a slice is complete:

```bash
bun run verify:launch
```

Purpose: prove the fast launch-critical path and type safety.

### 4. Future focused gates

Add these as scripts only when each has stable test ownership and clear scope:

```bash
bun run smoke:public-beta
bun run verify:privacy
bun run verify:sync
bun run verify:collaboration
bun run verify:build
```

`smoke:public-beta`, `verify:privacy`, and `verify:sync` now exist. These should not be aliases for the full suite; they should stay curated, fast, and launch-relevant.

## Proposed Future Gates

### `smoke:public-beta`

Scope:

- public navigation exposes only beta-approved surfaces;
- Shared Spaces remain hidden unless `NEXT_PUBLIC_FEATURE_SHARED_SPACES=true`;
- prototype/internal-preview notices appear on non-production surfaces;
- `/tasks` is canonical while `/todos` remains compatibility;
- Knowledge Map naming appears in user-facing navigation.

Add to `verify:launch` after:

- it runs in under ~15 seconds locally;
- it has no browser/network dependency beyond Vitest/jsdom;
- it does not duplicate most of `smoke:meeting-to-knowledge`.

### `verify:privacy`

Scope:

- derived metadata fields are classified sensitive/local-only;
- sync payloads reject source backlinks, citations, transcript references, graph/search metadata, and embeddings unless explicitly authorized/encrypted;
- cloud AI/provider paths require explicit user action or setting;
- search/citation snippets do not silently enter remote sync queues.

Add to `verify:launch` after:

- privacy tests cover both positive and negative sync cases;
- cloud AI consent seams have testable boundaries;
- test runtime remains small.

### `verify:sync`

Status: implemented as a focused gate.

Scope:

- web sync queue offline/online behavior;
- repository-backed queued operation acceptance;
- Supabase sync RPC migration guard;
- remote note apply behavior;
- recovery backup sync state;
- local note sync store records and cursor behavior;
- sync-engine LWW/queue logic;
- sync-engine CRDT/vector-clock/operation-transformer behavior;
- sync-engine collaboration authorization/history guards.

Current command:

```bash
bun run verify:sync
```

This runs:

```bash
bun run verify:sync:web && bun run verify:sync-engine
```

Server/websocket tests are available separately:

```bash
bun run verify:sync-server
```

S18 finding: the apparent sync-engine timeout came from the wrong workspace invocation form. Use `bun --filter='@notechain/sync-engine' run test`, not `bun --filter='@notechain/sync-engine' run test`.

Add to `verify:launch` only after:

- it remains deterministic across several slices;
- any server/websocket coverage needed for launch is intentionally included or separated;
- failures produce actionable messages.

### `verify:collaboration`

Scope:

- cryptographic sharing gates from `docs/adr/ADR-cryptographic-sharing.md`;
- server authorization tests;
- unauthorized realtime join denial;
- revocation/key rotation;
- Shared Space route/compatibility behavior.

Do **not** add this before real collaboration work exists. Until then, Shared Spaces should remain feature-gated/internal-preview.

### `verify:build`

Scope:

- package builds;
- Next app build;
- lint/format checks if stabilized.

Add to `verify:launch` only when runtime and dependency requirements are acceptable for routine agent use, or split it into a slower CI-only command.

## Expansion Rules

A check can be added to `verify:launch` only if all are true:

1. It is launch-critical.
2. It is deterministic in local agent runs.
3. It has a clear owner/scope.
4. It adds confidence not already covered by another gate.
5. It has acceptable runtime for routine use.
6. Its failure output is actionable.
7. It does not require external credentials, network access, or mutable cloud state.

## Non-Goals

Do not make `verify:launch`:

- a full replacement for CI;
- a full test-suite alias before test harness stabilization;
- dependent on external providers;
- dependent on live browser/manual QA;
- a lint/build mega-command if that makes routine verification too slow;
- a catch-all for every package in the monorepo.

## Suggested Phased Roadmap

### Phase 0 — Current state

Keep:

```bash
bun run verify:launch
```

as:

```bash
bun run smoke:meeting-to-knowledge && bun --filter='@notechain/web' run typecheck
```

### Phase 1 — Name explicit focused gates

Status: implemented.

The following focused gates exist and pass independently:

```bash
bun run smoke:public-beta
bun run verify:privacy
bun run verify:sync
```

They are documented and available for manual/agent use, but are not yet included in `verify:launch`.

### Phase 2 — Fold stable gates into launch

If Phase 1 gates stay fast and deterministic, expand:

```bash
bun run verify:launch
```

to run:

```bash
bun run smoke:meeting-to-knowledge \
  && bun run smoke:public-beta \
  && bun run verify:privacy \
  && bun --filter='@notechain/web' run typecheck
```

Avoid duplicate test files across gates where possible.

### Phase 3 — Add CI-only hard gates

For heavier checks, prefer separate commands:

```bash
bun run verify:ci
bun run verify:build
```

These can include lint, build, full suite, package builds, and coverage once reliable.

## Current Recommendation

Keep `verify:launch` unchanged for now. It is passing and agent-safe.

Phase 1 focused gates now exist:

```bash
bun run smoke:public-beta
bun run verify:privacy
bun run verify:sync
```

Next hardening work should be:

1. observe these focused gates across a few implementation slices;
2. de-duplicate them against `smoke:meeting-to-knowledge` if overlap becomes costly;
3. keep websocket/server sync coverage separate as `bun run verify:sync-server` unless it becomes launch-critical;
4. only then consider expanding `verify:launch`.
