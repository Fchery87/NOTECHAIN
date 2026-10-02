# Tickets: Production Readiness Hardening

Vertical tracer-bullet slices that close the blockers and gaps from `PRODUCTION_READINESS_AUDIT.md`.
**Source spec:** [Fchery87/NOTECHAIN#2](https://github.com/Fchery87/NOTECHAIN/issues/2) — "Production Readiness Hardening".

Work the **frontier**: any ticket whose blockers are all done. Tickets #3–#11 are all independent
and startable now; #12 is gated by all of them and is the natural finale. Recommended start: #3 or #4
(the two 🔴 blockers). Work one ticket at a time with `/implement`, clearing context between tickets.

These mirror the published GitHub issues one-for-one. The tracker is the source of truth; this file is
a local contributor index.

## #3 — Stop leaking database credentials into the client bundle

**What to build:** As a privacy-conscious user, no database password or private key may ever be present
in the code my browser downloads. The production build must provably exclude any database connection
string and any non-public secret from the client entry; the dead Neon repository layer is removed or
re-scoped server-only; any credential ever exposed is rotated with a documented runbook. (Audit 🔴 #1.)

**Blocked by:** None — can start immediately.

- [ ] Production client entry contains no connection-string-shaped or `NEXT_PUBLIC`-secret-shaped value (verified by the extended static-import-budget seam)
- [ ] No non-public secret is forwarded into the client bundle via build configuration
- [ ] Dead Neon repositories removed or moved server-only
- [ ] Credential-rotation runbook documented

## #4 — Fix CSRF token verification and require a production secret

**What to build:** A CSRF token the app issues must verify on the way back; the signed value at issuance
and verification must agree byte-for-byte; expiry and tamper detection both function; signing requires a
configured secret in production and fails closed (no hardcoded fallback). Adds the missing round-trip
test — the module has zero coverage today. (Audit 🔴 #2.)

**Blocked by:** None — can start immediately.

- [ ] A freshly issued token verifies true
- [ ] Expired, tampered, and malformed tokens verify false
- [ ] No hardcoded fallback secret; signing fails closed when unconfigured in production
- [ ] CSRF generate→verify round-trip test added (fresh passes; expired/tampered/malformed fail)

## #5 — Derive rate-limit identity from a trusted source

**What to build:** The rate limiter must not trust a client-controlled header for client identity;
derive identity from the platform-/trusted-proxy-provided source and document the trust assumption.
(Audit 🟡 #7.)

**Blocked by:** None — can start immediately.

- [ ] Limiter identity no longer sourced from a client-set forwarded header
- [ ] Identity sourced from the trusted platform/proxy source; trust assumption documented
- [ ] Rate-limiter tests updated and green

## #6 — Move the vault key seed out of plaintext storage

**What to build:** The vault wrapping-key seed must no longer live in plaintext, JavaScript-readable
storage; move to a non-extractable, device-/session-scoped key without weakening the recovery-key
contract and without introducing a new plaintext key cache. Legacy plaintext master-key paths are
retired, not merely migrated from. (Audit 🟡 #3.) Blast radius across the recovery contract —
coordinate with #7 if worked in the same context window.

**Blocked by:** None — can start immediately.

- [ ] Wrapping-key seed no longer in plaintext, JS-readable storage
- [ ] Recovery key still round-trips (encrypt → recover with key → decrypt)
- [ ] No new plaintext key cache introduced
- [ ] Legacy plaintext master-key path retired, not just migrated from

## #7 — Make meeting save reliable in Private Mode

**What to build:** Save Meeting must reliably persist once the encryption service is initialized; when
the vault key is not yet available it must surface the existing recovery prompt instead of a silent
no-op (the reported "Save does nothing" in Private Mode). (Audit 🟡 #4.) Touches the same key-management
area as #6 — sequence them in one context if possible.

**Blocked by:** None — can start immediately.

- [ ] Save Meeting persists after the encryption service initializes in Private Mode
- [ ] When the vault key is unavailable, the recovery prompt is surfaced (no silent no-op)
- [ ] Meeting-encryption-key test covers the key-not-ready condition

## #8 — Gate prototype surfaces off by default for release

**What to build:** PDF signing, real-time collaboration, Teams workspaces, and Outlook/Apple calendar
sync are disabled-by-default behind a release flag, presenting a clear "coming soon"/disabled UI instead
of a functioning-looking stub. The cryptographic-sharing surface follows suit per its ADR's
"not implemented" status. (Audit 🟡 #5.)

**Blocked by:** None — can start immediately.

- [ ] The four prototype surfaces are disabled-by-default behind a release flag
- [ ] Disabled state shows a clear "coming soon" UI, not a fake-working stub
- [ ] Cryptographic-sharing UI gated consistently with its ADR's not-implemented status
- [ ] Feature-gate seam asserts these surfaces are off-by-default for release

## #9 — Wire error tracking and structured logging on critical paths

**What to build:** A real error-tracking provider replaces the existing placeholder; the structured
logger replaces scattered `console` calls on security-critical and sync paths; all captured/logged data
is scrubbed of secrets, keys, and user content so error tracking does not punch a hole in the
zero-knowledge boundary. (Audit 🟡 #6.)

**Blocked by:** None — can start immediately.

- [ ] Real error-tracking provider wired behind the existing placeholder
- [ ] Structured logger adopted on security-critical and sync paths
- [ ] Captured/logged data scrubbed of secrets, keys, and user content

## #10 — Add route-level loading and error boundaries

**What to build:** Every route has consistent loading, empty, and error states; a failure is isolated to
its screen, with the global error boundary as the last resort. (Audit 🟡 #8.)

**Blocked by:** None — can start immediately.

- [ ] Each protected route has a loading state and a route-level error boundary
- [ ] Empty states are handled consistently
- [ ] A failure in one route does not take down the whole app

## #11 — Make CI security scans actually fail the build

**What to build:** The dependency audit and the secret scan must gate CI at a chosen severity (remove
the always-pass / continue-on-error behavior); CodeQL behavior is unchanged. (Audit 🟡 #9.)

**Blocked by:** None — can start immediately.

- [ ] Dependency audit fails CI at the chosen severity threshold
- [ ] Secret scan fails CI (no continue-on-error)
- [ ] CodeQL behavior unchanged

## #12 — Consolidate ship-readiness into the release-readiness gate

**What to build:** Every hardening outcome becomes a documented, asserted release gate in the
production-readiness checklist and its test — the single source of truth for "safe to ship." This is the
primary verification seam from the spec; it knits #3–#11 into one ship-readiness contract.

**Blocked by:** #3, #4, #5, #6, #7, #8, #9, #10, #11 — all nine hardening tickets must complete first.

- [ ] The production-readiness checklist documents each hardening outcome as a gate
- [ ] The production-readiness checklist test asserts each gate string
- [ ] Full build, typecheck, and the existing suite are green
- [ ] The smoke/verify scripts (meeting-to-knowledge, privacy, sync, route-seams, launch) are green
