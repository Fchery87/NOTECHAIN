# Production Readiness Audit — NoteChain

> Independent audit. Findings verified against source on `master` (build, typecheck,
> and test suite executed during the audit). Every issue cites a file:line reference.

## Project Summary

**NoteChain** is a privacy-first, browser-based productivity suite (notes, tasks,
calendar, meetings, OCR, PDF, knowledge graph) built as a Bun/Next.js 16 monorepo
that encrypts all user data client-side with libsodium (XSalsa20-Poly1305) before it
touches Supabase. It targets privacy-conscious professionals and is positioned in its
README and marketing site as a shipped, "v1.0 production-ready" zero-knowledge product
with paid tiers. The cryptography core, offline-first sync, auth, and database
row-level security are genuinely solid and well-tested — but several _marketed_
features are prototypes, one security control is structurally broken, and a
database-credential path is wired to leak to the browser.

**Tech stack:** Next.js 16 (App Router), Supabase (PostgreSQL + Auth + Realtime +
Storage), Dexie/IndexedDB, libsodium-wrappers (XSalsa20-Poly1305, PBKDF2-SHA256 @
600k), Zustand + React Query, TipTap, Bun workspaces (2 apps, 5 packages). ~93K LOC
of source. 98 test files; build, typecheck, and tests all pass.

---

## What's Working Well

- **Genuine zero-knowledge crypto core.** `packages/core-crypto` uses **PBKDF2-SHA256
  @ 600,000 iterations** (OWASP-current), 16-byte salt, constant-time compare, and
  libsodium `secretbox` (XSalsa20-Poly1305) with random per-encrypt 24-byte nonces +
  16-byte auth tags. Decryption fails on wrong key. (`packages/core-crypto/src/**`)
- **Real encryption at rest in the client DB.** `apps/web/src/lib/db.ts` stores every
  record as `{ciphertext, nonce, authTag, version}` in Dexie/IndexedDB — content is
  never plaintext on disk. Notes round-trip encrypt→store→decrypt correctly on both
  Dexie and the Postgres `sync_operations` view.
- **Strong access control + RLS.** `apps/web/src/proxy.ts` (Next 16 proxy convention)
  refreshes Supabase sessions, redirects unauthenticated users off 13 protected
  routes, and enforces a server-side admin/owner role check on `/admin`. Supabase
  migrations enable RLS on all tenant tables with `auth.uid()`-scoped
  `USING`/`WITH CHECK` policies and admin-scoped admin tables (`005, 013, 016, 019`).
- **Strong HTTP security headers.** Nonce-based strict CSP (no
  `unsafe-inline`/`unsafe-eval` in prod), HSTS+preload, `X-Frame-Options: DENY`,
  COEP/COOP/CORP, Permissions-Policy. Applied per-request in `proxy.ts` via
  `lib/security/csp.ts`.
- **Build, typecheck, and tests all genuinely pass.** `bun run build` compiles all 5
  packages + web (30 routes) and exits 0; `bun run typecheck` is clean across every
  workspace; the web suite runs **hundreds** of passing tests (e.g. 113 + 142 + 6 in
  observed groups), not the "48" the README claims.
- **Real rate limiting on API routes.** `withRateLimit` (Redis-backed `HybridStore`
  with in-memory fallback) is wired into `/api/auth/csrf-token`,
  `/api/auth/websocket-token` (auth tier), and both `/api/prd-builder/*` routes.
- **Hardened sync RPCs & privilege escalation blocked.** `insert_sync_operation` is
  `SECURITY DEFINER` with `auth.uid()` check + `search_path` lock (`017`); a
  `BEFORE UPDATE` trigger (`019`) blocks self-promotion of role/plan/status.
- **PWA is real.** `public/sw.js` has full cache strategies;
  `ServiceWorkerRegistrar.tsx` registers prod-only; manifest has a working
  `share_target` → `/quick-capture`.

---

## Critical Issues (🔴)

### 1. Database credentials force-inlined into the client bundle

`apps/web/next.config.ts:22-25` explicitly pushes `NEXT_PUBLIC_NEON_DATABASE_URL`
**and the non-public `NEON_PRIVATE_KEY`** into `env`, which Next.js inlines into the
browser build. `apps/web/src/lib/neonClient.ts:5` reads that connection string
(`postgresql://user:password@host/db`) directly. Because the variable is
`NEXT_PUBLIC_`, **if anyone sets it, the live DB username/password ships to every
visitor's browser**, bypassing Supabase RLS entirely and defeating the entire
zero-knowledge premise.

_Mitigating context:_ the Neon `repositories/*` are currently **dead code** (no
importer found in `app/`/`components/`/`hooks/`), so it's latent — but the exposure is
unconditional once the var is set, and `NEON_PRIVATE_KEY` has no business being in the
`env` block at all. **Rotate any Neon credential ever set in a deployment; remove both
from `next.config.ts`.**

### 2. CSRF verification is structurally broken — it can never validate a token it issued

`apps/web/src/lib/security/csrf.ts`: `generateCSRFToken` (line 62) signs
`tokenB64 + timestamp + secret` (no dot), but `verifyCSRFToken` (line 84) recomputes
`tokenPart + "." + timestamp + secret` (inserts a dot). The two hashes **never match**,
so `verifyCSRFToken()` returns `false` for every legitimately-generated token. Any
route relying on `validateCSRF()` for state-changing requests either 403s on all valid
traffic or — more likely given the app works — the CSRF control is silently never
enforced, making it security theater. Combined with the fallback signing secret
(issue 3), this is a non-functional security control advertised as "CSRF Protection"
in the README.

---

## Important Issues (🟡)

### 3. "Encryption at rest" is weakened by a localStorage key seed

`packages/core-crypto/src/secureStorage.ts:42` stores the wrapping-key seed in
`localStorage`. Any XSS (or malicious dependency) can read the seed + IndexedDB
ciphertext, derive the key, and decrypt the master key → all documents. This materially
overstates the README's "military-grade" / "zero-knowledge" claim; a truly zero-knowledge
model does not persist key material in cleartext JS-readable storage. (Legacy plaintext
master-key path also still migrates from localStorage — `keyManagement.ts:125`.)

### 4. Meeting "Save" silently does nothing in Private Mode (known, confirmed)

`apps/web/src/lib/storage/meetingEncryptionKey.ts:17` calls `KeyManager.getMasterKey()`
without ensuring `EncryptedSyncService.initialize(userId)` has completed; in Private Mode
the longer model-download window makes `getMasterKey()` return null, so it throws
`"No local encryption key was found…"`. The meetings page doesn't call `useNotesSync`
directly and depends on `AppLayout`'s recovery side-effects to set the key namespace —
a race that surfaces to the user as a no-op Save button.

### 5. Several flagship features are prototypes but shipped/marketed as complete

- **PDF signing** is a placeholder: `apps/web/src/components/PDFViewer.tsx:503` renders
  "PDF content would render here" and `:568` saves `'signature-data-placeholder'`;
  `pdfs/page.tsx:9` uses `mockPDFs`. README claims "Legally valid digital signatures."
- **Real-time collaboration** doesn't converge:
  `apps/web/src/components/CollaborativeEditor.tsx:248` — "Note: This is simplified - in
  production you'd apply the actual CRDT operation." Remote ops are never applied to the
  editor.
- **Teams** (`teams/[id]/page.tsx`) and **Calendar** (`calendar/page.tsx`) render a
  `PrototypeNotice` ("local demo state"); members are hardcoded mock data. README claims
  Outlook/Apple two-way sync — **only Google is implemented** (`lib/googleCalendar.ts`).
- **End-to-end encrypted sharing** (`ShareDialog.tsx:560`) is a static label with no
  crypto; `docs/adr/ADR-cryptographic-sharing.md` confirms the crypto sharing is
  unimplemented.

### 6. No error tracking / observability

Sentry is referenced in env docs but **never wired** — only commented-out
`// Example: Sentry.captureException(...)` placeholders exist (`errorHandling.ts:183`,
`ErrorBoundary.tsx:134`). There are **271 scattered `console.*` calls** across `src`
instead of structured logging (`logger.ts` exists but is barely used). No APM, no
uptime monitoring.

### 7. Rate-limit identity trusts spoofable `X-Forwarded-For`

`apps/web/src/lib/security/serverRateLimiter.ts:52` takes `forwarded.split(',')[0]`
directly as the client identity, so an attacker rotating that header evades all rate
limits (incl. the auth limiter). Should read the platform-provided client IP, not a
client-controlled header.

### 8. No route-level error or loading boundaries

Only `app/not-found.tsx` exists — there is **no `error.tsx`, `global-error.tsx`, or
`loading.tsx`** in any route. The single app-level `ErrorBoundary` in `layout.tsx` is
the entire error surface. For an offline-first PWA, missing per-route loading/suspense
states and granular error recovery is a real UX gap.

### 9. Security scans are non-blocking in CI

`.github/workflows/security-scan.yml`: `npm audit ... || true` (never fails), and
TruffleHog has `continue-on-error: true`. CodeQL runs, but dependency vulns and secret
leaks cannot fail a build by design.

---

## Suggestions (🟢)

10. `@notechain/ai-engine` (a complete Transformers.js LLM+RAG+embeddings package) is
    **dead code** — not imported by `apps/web` (only a test asserts its absence). Either
    wire it in or delete to reduce maintenance/bundle surface.
11. The README's self-reported metrics are unreliable and should be corrected or removed:
    "48 tests" (real: several hundred), "~50,000 LOC" (real: ~93K), "112 KB initial
    bundle" (implausible — `cytoscape`, `recharts`, `tesseract.js`, `transformers` are
    all client-imported), "WCAG 2.1 AA / OWASP Top 10 compliant," "6/6 Epics 100%,"
    "Health Score 95/100." These undermine trust in an otherwise strong project.
12. Two env templates (`apps/web/.env.example` and `.env.local.example`) duplicate and
    drift. Consolidate to one.
13. The CSRF token test in `AnalyticsRepository.test.ts:124` has an un-awaited
    `rejects.toEqual` — a Vitest-3 time bomb (warns now, fails later).
14. PWA icons are inline SVG data URIs in `manifest.json` rather than real PNG files;
    some install surfaces (iOS, certain store listings) prefer material PNG icons.
15. `version: "0.0.1"` (root) / `"0.1.0"` (web) in `package.json` contradicts the
    README's "v1.0 Production Ready" — pick one source of truth for versioning.

---

## Feature Gap Report

Benchmarks vs. mature encrypted-productivity peers (Standard Notes, Joplin, Obsidian,
plus E2EE best practice). Sources: securetoolsguide.com, needtoknowit.com.au, snoq.io,
Trail of Bits Obsidian Sync audit.

| Feature / Element                               | This Project                                       | Industry Standard                  | Priority |
| ----------------------------------------------- | -------------------------------------------------- | ---------------------------------- | -------- |
| E2EE content (notes/tasks/threads)              | ✅ Real (libsodium XSalsa20-Poly1305, 600K PBKDF2) | ✅ AES-GCM/Argon2id, ≥600K PBKDF2  | 🟢       |
| Key wrapping (DEK separate from passphrase KEK) | 🟡 seed in localStorage weakens it                 | ✅ passphrase→KEK wraps random DEK | 🟡       |
| Recovery key (user-managed)                     | ✅ Real (versioned, timing-safe)                   | ✅ standard                        | 🟢       |
| Metadata protection                             | ✅ `derivedMetadata` privacy module                | ✅ encrypt tags/folders/timestamps | 🟢       |
| Audit logging                                   | ✅ `audit_logs` table + admin UI                   | ✅ client-side/minimal events      | 🟢       |
| CSRF protection                                 | ❌ Broken (sign/verify mismatch)                   | ✅ double-submit/Synchronizer      | 🔴       |
| Secret hygiene (no client DB creds)             | ❌ Neon URL inlined to bundle                      | ✅ secrets server-only             | 🔴       |
| Error tracking (Sentry/equivalent)              | ❌ Not wired                                       | ✅ Sentry/APM standard             | 🟡       |
| Route-level error/loading states                | ❌ Only not-found                                  | ✅ per-route boundaries            | 🟡       |
| PDF signing                                     | 🟡 Placeholder render + dummy sig                  | ✅ real render + real signature    | 🟡       |
| Real-time collaboration                         | 🟡 Ops not applied (prototype)                     | ✅ CRDT convergence                | 🟡       |
| Calendar two-way (Google/Outlook/Apple)         | 🟡 Google only                                     | ✅ all three                       | 🟡       |
| Offline-first PWA                               | ✅ Real SW + manifest                              | ✅ standard                        | 🟢       |
| Search                                          | 🟡 local/keyword + cited search                    | ✅ encrypted/blind-index search    | 🟡       |
| Rate limiting identity                          | 🟡 trusts X-Forwarded-For                          | ✅ trusted-proxy IP                | 🟡       |

---

## Production Readiness Score

Graded ✅ Done / 🟡 Partial / ❌ Missing.

| Category                 | Grade   | Notes                                                                                                                                   |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Security**             | 🟡 ~65% | Strong crypto, RLS, headers, RBAC. **Blocked by broken CSRF (#2) and Neon credential path (#1); weakened at-rest key storage (#3).**    |
| **Reliability**          | 🟡 ~55% | Hybrid rate limiter, timeout helper, version pruning. **No route error/loading boundaries (#8); sync-version-cursor drop risk.**        |
| **Observability**        | ❌ ~25% | **No Sentry/APM (#6); 271 console.\* calls; security scans non-blocking (#9).**                                                         |
| **Performance**          | 🟡 ~55% | Code-splitting attempted, optimizePackageImports. **112KB bundle claim implausible; no measured Core Web Vitals; heavy client deps.**   |
| **Scalability / DevOps** | 🟡 ~60% | CI (test/build/deploy), Vercel staging+prod, migrations. **No DB migration gating in CI; no explicit rollback/zero-downtime strategy.** |
| **Developer Experience** | 🟡 ~70% | Type-safe end-to-end, lint+format+husky hooks, good test suite. **Dead ai-engine package (#10); overstated docs (#11).**                |
| **Accessibility / UX**   | 🟡 ~50% | ARIA components, SkipLink, FocusManager exist. **No route loading/empty/error states (#8); WCAG claim unverified.**                     |

### Overall Score: 57 / 100

**Verdict:** NoteChain has a **genuinely strong, well-engineered security and sync
core** (encryption, RLS, auth, offline sync) that builds cleanly and passes a real test
suite — this is a credible **late-stage beta**. It is **not production-ready as
advertised**. Before any "v1.0" launch it must (1) remove the Neon credential exposure
from the client bundle, (2) fix or remove the broken CSRF control, (3) wire real error
tracking, and (4) stop marketing PDF signing, real-time collaboration, Teams, and
multi-provider calendar sync as shipped features — they are prototypes that ship a
`PrototypeNotice` to users. Fix the 🔴 items first; the rest is hardening a foundation
that is worth hardening.
