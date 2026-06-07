# Sync Engine Test Stabilization

Status: Implemented
Date: 2026-06-06
Related docs: `docs/plans/2026-06-06-launch-verification-hardening-plan.md`, `docs/testing.md`

## Problem

During S17, `@notechain/sync-engine` package tests appeared to hang when run through this command:

```bash
bun --filter='@notechain/sync-engine' run test
```

That command is the wrong workspace invocation form for this repo. It does not run only the sync-engine package script. It can start broad/root Bun test discovery, including app/e2e tests that require unrelated browser or IndexedDB setup, and can time out with unrelated failures such as missing Playwright or browser APIs.

## Root Cause

The package tests themselves are stable. The failure came from invoking Bun incorrectly from the workspace root.

Correct workspace form:

```bash
bun --filter='@notechain/sync-engine' run test
```

Incorrect form:

```bash
bun --filter='@notechain/sync-engine' run test
```

## Test Split

The sync-engine package now has explicit test layers:

```bash
bun --filter='@notechain/sync-engine' run test:fast
bun --filter='@notechain/sync-engine' run test:server
bun --filter='@notechain/sync-engine' run test
```

### `test:fast`

Runs deterministic sync-engine logic tests:

- LWW element set and queue tests;
- multi-user CRDT/vector-clock/operation-transformer tests;
- collaboration authorization/history guard tests.

### `test:server`

Runs websocket/server integration-style tests:

- WebSocket server connection/auth flows;
- join/leave document behavior;
- broadcasts;
- cursor/presence/operation messages;
- connection manager behavior.

### `test`

Runs all sync-engine tests.

## Verification Gate

The root `verify:sync` gate now runs:

```bash
bun run verify:sync:web && bun run verify:sync-engine
```

Where:

```bash
bun run verify:sync:web
```

runs the web app sync tests, and:

```bash
bun run verify:sync-engine
```

runs `@notechain/sync-engine` fast package tests.

The websocket/server tests are available separately:

```bash
bun run verify:sync-server
```

They are intentionally not part of routine `verify:sync` because they are slower and closer to integration/server behavior.

## Current Results

- `bun run verify:sync:web`: passes 5 web sync test files / 25 tests.
- `bun run verify:sync-engine`: passes 43 sync-engine fast tests.
- `bun run verify:sync-server`: passes 18 websocket/server tests.
- `bun run verify:sync`: passes web sync + sync-engine fast tests.

## Current Recommendation

Use `bun run verify:sync` for routine agent verification of sync behavior.

Use `bun run verify:sync-server` before changing websocket/server collaboration behavior.

Do not fold either into `verify:launch` until focused gates have remained deterministic across several implementation slices.
