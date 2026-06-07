# Shared Spaces Internal Migration Plan

Status: Accepted planning direction
Date: 2026-06-06
Related ADR: `docs/adr/ADR-cryptographic-sharing.md`
Related strategy: `docs/plans/2026-06-06-meeting-to-knowledge-implementation-roadmap.md`

## Purpose

NoteChain now uses **Shared Spaces** as the user-facing product term for trust-gated collaboration, while the implementation still uses `/teams`, `Team*`, and some `Workspace*` concepts. This plan defines when that compatibility is acceptable and when a functional migration to `/shared-spaces` / `SharedSpace*` is justified.

The recommendation is **do not perform a broad `Team` → `SharedSpace` rename yet**. Collaboration is not production-ready until the cryptographic sharing model, authorization checks, revocation behavior, and audit trail are implemented. A naming-only refactor would create churn without making collaboration safer.

## Current State

### User-facing surface

- Product copy should say **Shared Spaces**.
- Shared Spaces are hidden from public-beta navigation by default.
- They appear in navigation only when `NEXT_PUBLIC_FEATURE_SHARED_SPACES=true`.
- `/teams` and `/teams/[id]` remain direct/internal preview routes.
- Internal preview notices explain that records, members, roles, and creation flows are demo/local state until encrypted sharing, revocation, authorization, and audit logs exist.

### Internal compatibility layer

The following internals intentionally still use `Team*` naming:

- `apps/web/src/app/teams/page.tsx`
- `apps/web/src/app/teams/[id]/page.tsx`
- `apps/web/src/lib/teams/types.ts`
- `apps/web/src/lib/teams/teamManager.ts`
- `apps/web/src/components/TeamSwitcher.tsx`
- `apps/web/src/components/TeamSettings.tsx`
- `apps/web/src/components/MemberList.tsx`
- navigation links using `/teams` behind the Shared Spaces feature gate

The current local model includes:

- `TeamRole`
- `TeamMember`
- `Team`
- `TeamInvite`
- `Workspace`
- `WorkspaceFolder`
- `WorkspaceSettings`

`teamManager.ts` stores prototype records in local Dexie database `NoteChainTeamsDB`. It supports local create/update/delete/invite/member-role operations, but it is not a cryptographic sharing or production authorization layer.

### Trust boundary

The accepted cryptographic sharing model in `docs/adr/ADR-cryptographic-sharing.md` requires:

- per-document content keys;
- recipient-specific key wrapping;
- server authorization checks;
- unauthorized realtime join rejection;
- revocation with future key rotation;
- product copy that documents revocation limits.

Until those gates are implemented and tested, Shared Spaces must remain an internal preview/direct route or feature-flagged surface.

## Boundary Decision

Use **Shared Spaces** in product language and navigation. Keep `/teams` and `Team*` internals as compatibility names until a functional collaboration migration is underway.

This avoids broad churn across routes, components, local storage, manager functions, tests, feature gates, and future sharing code while preserving honest user-facing language.

## Migration Triggers

Migrate from `/teams` / `Team*` to `/shared-spaces` / `SharedSpace*` when at least one of these product requirements is actively being implemented:

1. **Cryptographic sharing gates are being implemented**
   Per-document content keys, recipient key wrapping, and encrypted key packages are moving from ADR to code.

2. **Server authorization becomes real**
   Shared Space membership and roles control metadata listing, payload fetches, realtime channel joins, writes, and key-package access.

3. **Revocation becomes product behavior**
   Removing a collaborator/device rotates future content keys and the UI explains revocation limits.

4. **Shared content containers become real**
   Notes, tasks, meetings, decisions, or attachments can belong to a shared authorization boundary, not just local demo folders.

5. **Auditability is required**
   Invites, member changes, role changes, key-package issuance, revocation, and sync access need durable audit records.

6. **Public routes need production semantics**
   `/shared-spaces` is ready to become the canonical route and `/teams` can become a redirect/alias.

7. **Database or sync schema changes anyway**
   A storage/sync migration is already needed, making route/model renaming cheaper and safer.

## Non-Triggers

Do not rename internals merely because:

- product copy says Shared Spaces;
- the feature flag is named `NEXT_PUBLIC_FEATURE_SHARED_SPACES`;
- navigation labels say Shared Spaces;
- `/teams` feels semantically old;
- variables or component names contain `Team`;
- the current prototype pages are hidden from public-beta navigation.

Those are acceptable compatibility seams until cryptographic sharing work starts.

## Target Shared Space Model Direction

A future `SharedSpace` model should represent an encrypted authorization boundary, not just a collection of people.

```ts
interface SharedSpace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived';

  members: SharedSpaceMember[];
  encryptionPolicy: SharedSpaceEncryptionPolicy;
  auditPolicy: SharedSpaceAuditPolicy;
}

interface SharedSpaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
  revokedAt?: Date;
  devices?: SharedSpaceDeviceGrant[];
}

interface SharedSpaceDeviceGrant {
  deviceId: string;
  publicKeyId: string;
  grantedAt: Date;
  revokedAt?: Date;
}

interface SharedSpaceEncryptionPolicy {
  contentKeyScope: 'per_document' | 'per_collection';
  keyRotation: 'on_revocation' | 'manual';
  allowsPublicLinks: boolean;
}

interface SharedSpaceAuditPolicy {
  recordInvites: boolean;
  recordRoleChanges: boolean;
  recordRevocations: boolean;
  recordKeyPackageAccess: boolean;
}
```

Exact fields should be finalized during implementation. The key principle is that Shared Space identity must include cryptographic and authorization semantics, not just membership display data.

## Migration Shape

When a trigger is active, migrate in thin slices:

1. Add `SharedSpace*` aliases/types next to existing `Team*` types.
2. Introduce `SharedSpaceRepository`/`SharedSpaceService` adapters over current local prototype data only if useful.
3. Add `/shared-spaces` route as canonical while keeping `/teams` as compatibility redirect/alias.
4. Move feature-gated navigation to `/shared-spaces` only after route parity exists.
5. Implement cryptographic sharing gates before removing prototype notices.
6. Add server authorization and realtime denial tests before exposing production collaboration.
7. Add revocation/key-rotation tests before promising revocation.
8. Remove `Team*` internals only after compatibility, route redirects, sharing, search, graph, sync, and docs all pass verification.

## Verification Requirements

Any future migration must pass:

- Shared Space model/repository/service tests;
- cryptographic key wrapping tests;
- server authorization tests;
- unauthorized realtime join tests;
- revocation/key-rotation tests;
- route compatibility tests for `/teams` redirects or aliases;
- navigation feature-gate tests;
- Context Graph authorization-leakage tests;
- derived metadata privacy tests;
- `bun run verify:launch`.

## Current Recommendation

Keep the current implementation as:

- user-facing **Shared Spaces**;
- hidden from public-beta navigation by default;
- enabled only with `NEXT_PUBLIC_FEATURE_SHARED_SPACES=true`;
- `/teams` direct/internal preview route;
- `Team*` internal compatibility names;
- prototype notices until cryptographic sharing gates pass.

Revisit this plan when production cryptographic sharing, server authorization, revocation, or Shared Space-owned content work begins.
