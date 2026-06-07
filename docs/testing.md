# Testing NoteChain

## Canonical commands

Use these commands from the repository root.

### Meeting-to-Knowledge smoke

```bash
bun run smoke:meeting-to-knowledge
```

Fast wedge verification for the meeting-to-knowledge path. This is the default agent-safe smoke command.

### Launch verification

```bash
bun run verify:launch
```

Runs the Meeting-to-Knowledge smoke suite and web typecheck. This is the current launch gate until focused multi-surface gates are stable. See `docs/plans/2026-06-06-launch-verification-hardening-plan.md` before expanding it.

### Focused gates

Available focused gates, not yet required by `verify:launch`:

```bash
bun run smoke:public-beta
bun run verify:privacy
bun run verify:sync
```

`verify:sync` runs web sync tests plus fast `@notechain/sync-engine` package tests. Websocket/server sync-engine tests are available separately:

```bash
bun run verify:sync-server
```

Use the `run` form for workspace package scripts, e.g. `bun --filter='@notechain/sync-engine' run test`; do not use `bun --filter='@notechain/sync-engine' test` from the repo root.

Planned future focused gates:

```bash
bun run verify:collaboration
bun run verify:build
```

Add focused gates to `verify:launch` only when they are curated, deterministic, fast enough for routine agent use, and not just aliases for the full suite.

### Web targeted tests

```bash
bun run test:web:file src/path/to/file.test.ts
```

Pass package-relative paths under `apps/web/`. Example:

```bash
bun run test:web:file src/lib/privacy/__tests__/derivedMetadata.test.ts
```

Equivalent lower-level form:

```bash
bun --filter='@notechain/web' run test -- src/lib/privacy/__tests__/derivedMetadata.test.ts
```

### Web full Vitest suite

```bash
bun run test:web
```

This runs the web package Vitest suite. Prefer targeted tests plus `verify:launch` during agent work because the full suite is slower than routine focused gates.

### Root full repository suite

```bash
bun run test
```

This runs package test suites sequentially for `@notechain/core-crypto`, `@notechain/ai-engine`, `@notechain/sync-engine`, and `@notechain/web`. The web package suite is chunked into smaller Vitest invocations to avoid full-suite jsdom/mock-state pressure. Treat it as a slow comprehensive gate, not the default agent loop. Use a long terminal timeout when running it manually because the web Vitest suite dominates runtime. If it fails after command or test-harness changes, stabilize the failing test or update stale assertions rather than folding the full suite into `verify:launch`.

## Avoid this for app tests

Do not use root `bun test apps/web/...` as the primary command for app tests. It invokes Bun's test runner, not the web package Vitest configuration. Some pure unit tests may pass through Bun, but React/jsdom/app tests should use the web package Vitest commands above.

## Root Bun preload

The repository root `test-setup.ts` is dependency-free on purpose because `bunfig.toml` preloads it for root `bun test` invocations. Browser-heavy mocks live in `apps/web/test-setup.ts` and are loaded by `apps/web/vitest.config.ts`.
