# Task Domain Model Consolidation Plan

Status: Accepted planning direction
Date: 2026-06-06
Related strategy: `docs/plans/2026-06-06-meeting-to-knowledge-implementation-roadmap.md`
Related policy: `docs/adr/ADR-ai-processing-policy.md`

## Purpose

NoteChain now uses **Tasks** as the user-facing product term and `/tasks` as the preferred route, while much of the implementation still uses `Todo*` names. This plan defines when that is acceptable, when it becomes risky, and what a future migration to a true `Task` domain model should include.

The recommendation is **do not perform a broad `Todo` → `Task` rename yet**. The current internals are wide enough that a naming-only migration would add churn without improving product trust, privacy, or capability.

## Current State

### User-facing surface

- Preferred route: `/tasks`.
- Compatibility route: `/todos`.
- Visible copy should say **Tasks**, **Task list**, **New Task**, and related task language.
- Meeting-derived follow-ups surface as tasks in the dashboard command center.

### Internal compatibility layer

The following internals still intentionally use `Todo*` naming:

- `packages/data-models/src/models.ts` exports `Todo`.
- `packages/data-models/src/types/user.ts` exports `Todo`, `TodoPriority`, and `TodoStatus`.
- `apps/web/src/lib/db.ts` exposes local encrypted `createTodo`, `getTodo`, `updateTodo`, `deleteTodo`, and `listTodos` helpers.
- `apps/web/src/services/todo-service.ts` and `apps/web/src/lib/repositories/TodoRepository.ts` use service/repository naming around `Todo`.
- `apps/web/src/lib/sync/useTodosSync.ts` syncs the current todo-shaped payload.
- Calendar helpers, analytics, local search, Context Graph, cited search, and meeting follow-up code read todo/task records through existing helpers.

### Current data shape

The current `Todo` model already covers a basic task:

- `title`
- `description`
- `status`
- `priority`
- `dueDate`
- `completedAt`
- `tags`
- `projectId`
- `estimatedMinutes`
- `actualMinutes`
- `calendarEventId`
- `calendarProvider`
- `linkedNoteId`
- `externalId`
- sync metadata

The web local encrypted task shape also now includes meeting provenance fields:

- `sourceType`
- `sourceMeetingId`
- `sourceTranscriptSegmentId`
- `sourceText`

These fields are sensitive derived metadata and are guarded by `apps/web/src/lib/privacy/derivedMetadata.ts` before sync payloads can include them.

## Boundary Decision

Use **Task** in product language and routes. Keep `Todo*` internals as compatibility names until a functional domain migration is justified.

This avoids a high-risk rename across data-model packages, repositories, sync payloads, analytics, AI RAG code, app routes, tests, and existing storage records while still giving users consistent language.

## Migration Triggers

Migrate from `Todo*` internals to a true `Task` domain model when at least one of these product requirements is actively being implemented:

1. **Source provenance becomes first-class**
   Meeting/note/calendar-origin fields are no longer optional side fields but core task identity and audit data.

2. **Assignees or ownership become real**
   Tasks need `assigneeId`, `ownerId`, speaker/person links, or Shared Space authorization boundaries.

3. **Calendar lifecycle becomes real**
   Tasks need provider-backed due dates, event links, reminders, rescheduling, recurrence, or external sync conflict handling.

4. **Recurring tasks become production**
   The existing recurrence helper becomes part of persisted task state rather than a utility around todo-shaped records.

5. **Shared Spaces can contain tasks**
   Task visibility must obey encrypted sharing keys, membership, revocation, and audit rules.

6. **AI/task automation writes tasks**
   AI-derived suggestions, summaries, or agents can create/update tasks and need source-cited audit trails.

7. **Server schema or sync protocol changes anyway**
   A database or sync migration already requires record-version changes, making naming and shape consolidation cheaper.

## Non-Triggers

Do not rename internals merely because:

- public copy says Tasks;
- `/tasks` exists;
- a variable named `todo` appears in internal code;
- tests refer to `noteTodoWorkflow` compatibility behavior;
- the current page still lives under `/todos` for compatibility.

Those are acceptable compatibility seams until there is a functional migration.

## Target Task Model Direction

A future `Task` model should include, at minimum:

```ts
interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];

  source?: TaskSource;
  assigneeId?: string;
  ownerId?: string;
  sharedSpaceId?: string;
  calendarEventId?: string;
  recurrenceRule?: string;

  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  syncVersion: number;
  lastModifiedBy: string;
}

interface TaskSource {
  type: 'manual' | 'note' | 'meeting' | 'calendar' | 'ai';
  noteId?: string;
  meetingId?: string;
  transcriptSegmentId?: string;
  calendarEventId?: string;
  quote?: string;
  confidence?: number;
  confirmationStatus?: 'suggested' | 'confirmed' | 'edited' | 'rejected';
}
```

Exact field names should be finalized when implementing the migration, not before.

## Migration Shape

When a trigger is active, migrate in thin slices:

1. Add `Task` aliases/types next to existing `Todo` types without changing storage.
2. Introduce `TaskRepository`/`TaskService` adapters over existing todo storage.
3. Move app code from `Todo*` imports to task adapters.
4. Add a versioned storage/sync migration only when required by real new fields.
5. Keep `/todos` route and old sync entity names as compatibility aliases until external data is migrated.
6. Remove `Todo*` internals only after tests prove compatibility, sync, search, graph, analytics, and meeting follow-ups still work.

## Verification Requirements

Any future migration must pass:

- targeted task repository/service tests;
- meeting action item → task tests;
- note/task workflow integration tests;
- cited search tests;
- Context Graph tests;
- derived metadata privacy tests;
- `bun run verify:launch`.

## Current Recommendation

Keep the current implementation as:

- user-facing **Tasks**;
- `/tasks` preferred route;
- `/todos` compatibility route;
- `Todo*` internal compatibility names;
- derived metadata guard preventing provenance leakage into current sync payloads.

Revisit this plan when production task capabilities, shared-space authorization, or sync schema work begins.
