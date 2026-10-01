# NoteChain

> Your thoughts. Encrypted. Yours alone.

NoteChain is a privacy-first workspace that turns private notes and meetings into encrypted, source-cited tasks, follow-ups, and a knowledge map. Content is encrypted in the browser before it is stored or synced.

**Status: public-beta preview, not production-ready.** The core (encrypted notes, local-first storage, meetings) works. Several surfaces are prototypes and are labelled or hidden in the app. See [What works today](#what-works-today) and [`PRODUCTION_READINESS_AUDIT.md`](PRODUCTION_READINESS_AUDIT.md).

## Product direction

The near-term wedge is **meeting-to-knowledge**: private notes and calendar context feed meeting prep, and meeting transcripts produce cited summaries, decisions, action items, and tasks. NoteChain does not try to be a generic all-in-one productivity suite. The guiding rule is _trust before surface area_. Details and vocabulary live in [`CONTEXT.md`](CONTEXT.md).

## What works today

| Surface          | Status         | Notes                                                                                         |
| ---------------- | -------------- | --------------------------------------------------------------------------------------------- |
| Notes            | Working        | Rich text editor (TipTap), encrypted local storage (Dexie/IndexedDB), local search, export    |
| Meetings         | Working        | Browser or private on-device transcription, action-item extraction, convert items to tasks    |
| Knowledge Map    | Working        | Cytoscape view over notes; graph metadata stays local by default                              |
| Recovery key     | Working        | Export and import of a user-held recovery key                                                 |
| Tasks            | Prototype      | Local data with a visible prototype notice                                                    |
| Calendar         | Prototype      | Local event shells; Google import helpers exist, Outlook and Apple are off by default         |
| PDFs             | Coming soon    | Hidden behind `NEXT_PUBLIC_ENABLE_PDF_SIGNING`; signing is not implemented                    |
| Shared Spaces    | Hidden         | Needs `NEXT_PUBLIC_FEATURE_SHARED_SPACES=true`; cryptographic sharing is not implemented      |
| Real-time collab | Off by default | Remote operations are not applied to the editor yet                                           |
| PRD Builder      | Optional       | Notes-only by default; external AI and web research need explicit consent and server API keys |

## Security model

- Content is encrypted client-side with XSalsa20-Poly1305 (TweetNaCl `secretbox`, libsodium-compatible). Passphrase-derived keys use PBKDF2-SHA256 at 600,000 iterations.
- The vault key is wrapped by a random non-extractable WebCrypto key stored in IndexedDB. No key material is kept in `localStorage` or `sessionStorage`.
- The recovery key encodes the master key directly. Losing both the device and the recovery key means losing the data.
- Supabase stores ciphertext behind row-level security. In production the server sets a strict nonce-based CSP, and CSRF tokens require `CSRF_SECRET` in production.
- Derived metadata (embeddings, graph edges, citations, search snippets) is treated as sensitive and stays local by default. See [`docs/adr/ADR-ai-processing-policy.md`](docs/adr/ADR-ai-processing-policy.md).

What is **not** claimed: end-to-end encrypted sharing, revocation, or audited team workspaces. Those are tracked in [`docs/adr/ADR-cryptographic-sharing.md`](docs/adr/ADR-cryptographic-sharing.md). A script running in the live page can still use the in-memory key, so XSS defense rests on the CSP.

## Stack

Next.js 16 (App Router, PWA) · React 19 · Bun workspaces · Supabase (Postgres, Auth, Realtime) · Dexie · Zustand · TanStack Query · TipTap · Cytoscape · pdf-lib · Tesseract.js · Transformers.js · Vitest.

## Repository layout

```
apps/
  web/            Main Next.js application
  marketing/      Marketing site (port 3001)
packages/
  core-crypto/    Encryption, key management, recovery keys, secure storage
  data-models/    Shared TypeScript types
  sync-engine/    Sync and CRDT logic
  ai-engine/      On-device AI helpers
  ui-components/  Shared React components
supabase/         Config, migrations, edge functions
docs/             ADRs, plans, feature docs, archive of older reports
```

## Getting started

Requires Bun 1.1+ and Node 22+.

```bash
bun install
cp apps/web/.env.example apps/web/.env.local   # set the Supabase URL and anon key
bun run dev                                    # web app on http://localhost:3000
bun run dev:marketing                          # marketing site on http://localhost:3001
```

Minimum environment for local development: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. In production, `CSRF_SECRET` is also required. OAuth setup is in [`OAUTH_SETUP.md`](OAUTH_SETUP.md).

**Database.** `supabase db reset` (or `supabase db push`) builds the full schema from `supabase/migrations/`, starting at `001_baseline_schema.sql`. Existing databases need `supabase migration repair --status applied 001` first; see [`supabase/migrations/README.md`](supabase/migrations/README.md). `bun run verify:db` proves a fresh build works without Docker.

## Verification

```bash
bun run verify:launch        # meeting-to-knowledge smoke tests plus web typecheck
bun run verify:db            # builds the schema from empty on PostgreSQL and checks RLS and sync RPC
bun run verify:privacy       # derived-metadata privacy gate
bun run verify:route-seams   # tasks, calendar, graph, meeting detail seams
bun run verify:sync          # web sync tests plus sync-engine tests
bun run typecheck            # all workspaces
bun run test                 # full suite (slow)
```

Targeted web tests: `bun run test:web:file src/path/to/file.test.ts`. More in [`docs/testing.md`](docs/testing.md).

## Documents

- [`CONTEXT.md`](CONTEXT.md) domain language, trust vocabulary, roadmap, accepted decisions
- [`PRODUCTION_READINESS_AUDIT.md`](PRODUCTION_READINESS_AUDIT.md) and [`tickets.md`](tickets.md) known gaps and the hardening plan
- [`docs/adr/`](docs/adr) architecture decisions
- [`CONTRIBUTING.md`](CONTRIBUTING.md), [`NAMING_CONVENTIONS.md`](NAMING_CONVENTIONS.md), [`AGENTS.md`](AGENTS.md) contributor and design guidelines
- [`docs/archive/`](docs/archive) older reports kept for history, not maintained

## License

Proprietary. All rights reserved.
