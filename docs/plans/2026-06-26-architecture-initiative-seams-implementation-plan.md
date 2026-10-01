# Architecture Initiative Seams Implementation Plan

Status: Proposed implementation plan
Date: 2026-06-26
Parent context: `CONTEXT.md`
Related roadmap: `docs/plans/2026-06-06-meeting-to-knowledge-implementation-roadmap.md`
Related policy: `docs/adr/ADR-ai-processing-policy.md`
Related architecture decision: `docs/adr/ADR-context-graph-product-substrate.md`
Related trust gate: `docs/adr/ADR-cryptographic-sharing.md`

## Goal

Deepen five shallow product surfaces into a small set of high-leverage modules with clear seams:

1. **Task module** for persisted Task reads/writes and provenance-preserving follow-through.
2. **Meeting access module** for encrypted Meeting retrieval, prep, and action-item promotion.
3. **Calendar module** for provider-neutral event shells used by prep and follow-up.
4. **Context Graph query module** for typed, source-cited local context retrieval.
5. **Shared Space access module** only after cryptographic sharing gates are implemented and tested.

This initiative should increase depth, leverage, and locality without widening product scope beyond the accepted meeting-to-knowledge wedge.

## Constraints from `CONTEXT.md` and accepted ADRs

- NoteChain remains **meeting-to-knowledge first**, not a generic all-in-one productivity suite.
- **Tasks** are the preferred product term and `/tasks` is the preferred route, but `Todo*` internals remain compatibility details until a functional migration trigger is active.
- Calendar exists to provide **time context** for prep, capture, and follow-through; this plan must not become a generic calendar-clone effort.
- The **Context Graph** is a product substrate, not only the `/graph` page.
- Derived metadata is sensitive. Transcript references, citations, graph edges, search snippets, task provenance, and calendar context remain **local-only by default**.
- Shared Spaces remain **trust-gated** until cryptographic sharing acceptance gates exist in code and tests.

## Current friction summary

### Task surface

- `/tasks` currently re-exports `/todos`.
- `/todos` still renders from route-local mock state.
- There are multiple competing task implementations: local Dexie CRUD, repository code, service code, and meeting follow-up conversion.

### Meeting surface

- Meeting storage, prep context, and action-item promotion logic are spread across UI modules and helpers.
- Sensitive transcript-backed actions do not yet pass through one access module.

### Calendar surface

- Calendar UI is still mock-backed.
- Provider code exists, but the route does not consume a provider-neutral interface.
- Meeting prep and task follow-through use only a thin subset of calendar value, but the current implementation does not isolate that seam.

### Context Graph surface

- The graph page, cited search, and related loaders compose notes, meetings, and tasks separately.
- There is no single query module for typed, source-cited local context retrieval.

### Shared Spaces surface

- `/teams` and `teamManager` remain prototype-level and local-only.
- The route is correctly trust-gated today, but the future seam must be authorization-aware rather than only membership-aware.

## Recommended sequence

1. **S01: Task module**
2. **S02: Meeting access module**
3. **S03: Calendar module**
4. **S04: Context Graph query module**
5. **S05: Route rewiring and verification hardening**
6. **S06: Shared Space access module (deferred behind trust gates)**

This order is intentional:

- Task persistence and provenance are on the critical path of the accepted wedge.
- Meeting access should be centralized before graph and calendar compose it.
- Calendar should consume Task and Meeting seams rather than invent parallel rules.
- Context Graph queries should sit on top of the prior seams.
- Shared Space access depends on cryptographic sharing and authorization gates, not only refactoring.

## Phased milestones

- [ ] **S01: Task module** `risk:high` `depends:[]`

  > After this: `/tasks` no longer depends on route-local mock state and meeting-derived tasks keep provenance through one interface.

- [ ] **S02: Meeting access module** `risk:high` `depends:[S01]`

  > After this: encrypted Meeting reads, prep, and action-item promotion go through one access seam instead of scattered helpers and UI logic.

- [ ] **S03: Calendar module** `risk:high` `depends:[S02]`

  > After this: Calendar uses local encrypted event shells and provider-neutral account/event state without claiming full provider lifecycle.

- [ ] **S04: Context Graph query module** `risk:high` `depends:[S01,S02,S03]`

  > After this: graph page and related-context retrieval can query one local, source-cited module for typed context.

- [ ] **S05: Route rewiring and verification hardening** `risk:medium` `depends:[S01,S02,S03,S04]`

  > After this: route surfaces depend on deep modules rather than concrete implementations, and deterministic verification covers the initiative.

- [ ] **S06: Shared Space access module** `risk:high` `depends:[cryptographic-sharing-gates]`

  > After this: a future Shared Space seam can govern authorization-aware access, but this slice remains deferred until trust gates are real.

## Boundary map

### S01 produces

- One Task interface for route and follow-up flows.
- Preserved provenance for meeting-derived tasks.
- `/tasks` as the honest product route over real persistence.

### S02 consumes

- Task interface from S01.
- Existing encrypted meeting storage and follow-up helpers.

### S02 produces

- One Meeting access interface for list/get/update/prep/promote operations.
- A single place to enforce transcript-backed access decisions.

### S03 consumes

- Meeting access interface from S02.
- Existing local calendar-event storage and provider helpers.

### S03 produces

- Provider-neutral local event shells.
- Explicit account/connection state.
- A narrow Calendar interface used by prep and follow-through.

### S04 consumes

- Task, Meeting, and Calendar interfaces.
- Existing note graph builders and local note retrieval.

### S04 produces

- One Context Graph query interface.
- Typed local context retrieval with provenance-aware edges.
- Reusable query surface for graph page and cited related-context flows.

### S05 consumes

- S01 through S04 module seams.

### S05 produces

- Route surfaces that depend on module seams rather than direct storage/provider composition.
- Deterministic verification gates for the initiative.

### S06 consumes

- Future cryptographic sharing implementation and authorization gates.

### S06 produces

- A future Shared Space access seam with real trust boundaries.

## File-by-file changes

### S01 — Task module

#### Goal

Replace route-local Task mock state with one Task interface while keeping `Todo*` internals as compatibility details.

#### Files to add

- `apps/web/src/lib/tasks/taskTypes.ts`
- `apps/web/src/lib/tasks/taskAdapter.ts`
- `apps/web/src/lib/tasks/taskRepository.ts`

#### Files to change

- `apps/web/src/app/tasks/page.tsx`
- `apps/web/src/app/todos/page.tsx`
- `apps/web/src/components/TodoList.tsx`
- `apps/web/src/components/TodoForm.tsx`
- `apps/web/src/lib/db.ts`
- `apps/web/src/lib/repositories/TodoRepository.ts`
- `apps/web/src/services/todo-service.ts`
- `apps/web/src/lib/meetings/actionItemToTodo.ts`
- `apps/web/src/lib/meetings/meetingFollowUps.ts`

#### Planned change shape

1. Add Task-facing aliases/types over the existing todo-shaped storage model.
2. Add a thin Task adapter over local Dexie CRUD first.
3. Route `/tasks` and `/todos` UI through the adapter.
4. Preserve provenance fields for meeting-created tasks.
5. Keep repository/service code compatible, but do not make them the route seam yet.

#### Why this implementation first

A local-Dexie-first adapter gives the best locality and least migration risk because meeting follow-ups, local graph assembly, and current task storage already live close to that implementation.

### S02 — Meeting access module

#### Goal

Centralize encrypted Meeting reads, prep, and action-item promotion behind one interface.

#### Files to add

- `apps/web/src/lib/meetings/meetingAccess.ts`
- `apps/web/src/lib/meetings/meetingAccess.types.ts`

#### Files to change

- `apps/web/src/app/meetings/page.tsx`
- `apps/web/src/components/MeetingDetail.tsx`
- `apps/web/src/components/MeetingList.tsx`
- `apps/web/src/components/MeetingTranscriber.tsx`
- `apps/web/src/components/CalendarEventTranscript.tsx`
- `apps/web/src/lib/meetings/meetingPrepContext.ts`
- `apps/web/src/lib/meetings/meetingFollowUps.ts`
- `apps/web/src/lib/storage/meetingStorage.ts`

#### Planned change shape

1. Define a narrow Meeting access interface for list/get/save/update/query-by-calendar-event/promote-action-item.
2. Implement the interface over the current encrypted meeting storage.
3. Move prep-context and action-item promotion orchestration into the Meeting access implementation where practical.
4. Update UI modules to depend on the Meeting access interface rather than direct helper/storage composition.

### S03 — Calendar module

#### Goal

Replace page-level mock Calendar state with provider-neutral local event shells and explicit account state.

#### Files to add

- `apps/web/src/lib/calendar/calendarTypes.ts`
- `apps/web/src/lib/calendar/calendarAccounts.ts`
- `apps/web/src/lib/calendar/calendarEventShells.ts`
- `apps/web/src/lib/calendar/calendarAccess.ts`

#### Files to change

- `apps/web/src/app/calendar/page.tsx`
- `apps/web/src/components/CalendarView.tsx`
- `apps/web/src/components/CalendarEventTranscript.tsx`
- `apps/web/src/lib/db.ts`
- `apps/web/src/services/calendar-service.ts`
- `apps/web/src/lib/googleCalendar.ts`
- `apps/web/src/lib/outlookCalendar.ts`
- `apps/web/src/lib/meetings/meetingPrepContext.ts`
- `apps/web/src/services/todo-service.ts`

#### Planned change shape

1. Persist local encrypted calendar event shells and provider-account state.
2. Define one provider-neutral Calendar interface focused on meeting prep and follow-through.
3. Adapt existing provider helpers into that interface.
4. Keep the first slice read-focused; only add writes that are required for an existing follow-through path.
5. Keep prototype messaging honest until provider lifecycle is real.

### S04 — Context Graph query module

#### Goal

Create one local-only query surface for typed, source-cited context retrieval.

#### Files to add

- `apps/web/src/lib/graph/contextGraphQuery.ts`
- `apps/web/src/lib/graph/contextGraphQuery.types.ts`

#### Files to change

- `apps/web/src/app/graph/page.tsx`
- `apps/web/src/lib/graph/contextGraph.ts`
- `apps/web/src/lib/search/citedContextSearch.ts`
- `apps/web/src/lib/meetings/meetingPrepContext.ts`
- `apps/web/src/components/MeetingDetail.tsx`
- `apps/web/src/lib/privacy/derivedMetadata.ts`

#### Planned change shape

1. Define a narrow query interface for the first practical use cases:
   - `getRelatedContextForMeeting`
   - `getTaskProvenance`
   - `getContextForCalendarEvent`
2. Compose existing note, task, meeting, and calendar seams behind the query layer.
3. Keep all query outputs local-only and source-cited.
4. Rewire graph page and cited-context retrieval to consume the new query module.

### S05 — Route rewiring and verification hardening

#### Goal

Finish the initiative by routing product surfaces through the new deep modules and tightening deterministic verification.

#### Files to change

- `apps/web/src/app/tasks/page.tsx`
- `apps/web/src/app/todos/page.tsx`
- `apps/web/src/app/graph/page.tsx`
- `apps/web/src/app/calendar/page.tsx`
- `apps/web/src/components/MeetingDetail.tsx`
- `apps/web/src/components/AppHeader.tsx`
- `apps/web/src/components/WorkspaceSidebar.tsx`
- `apps/web/src/components/MobileBottomNav.tsx`
- `docs/testing.md`
- `package.json`

#### Planned change shape

1. Remove route-level composition that reaches directly into storage/provider code where module seams now exist.
2. Keep user-facing copy honest where a surface is still partial.
3. Ensure navigation and launch posture still match existing trust gates.
4. Expand focused verification only through deterministic commands.

### S06 — Shared Space access module (deferred)

#### Goal

Document the future seam without implementing product-ready collaboration before the trust gates are real.

#### Files to add later

- `apps/web/src/lib/shared-spaces/sharedSpaceAccess.ts`
- `apps/web/src/lib/shared-spaces/sharedSpaceAccess.types.ts`

#### Files to keep gated for now

- `apps/web/src/app/teams/page.tsx`
- `apps/web/src/app/teams/[id]/page.tsx`
- `apps/web/src/lib/teams/teamManager.ts`
- `apps/web/src/lib/launchScope.ts`

#### Deferred change shape

1. Keep Shared Spaces hidden or clearly marked prototype.
2. Do not widen the current seam beyond gatekeeping and honesty improvements.
3. Only implement the real access seam after cryptographic sharing acceptance gates exist in code and tests.

## Verification checklist

### Targeted tests during implementation

- Task adapter and route tests
- Meeting access unit tests
- Calendar event-shell/account-state tests
- Context Graph query tests
- Privacy-focused tests for derived metadata boundaries
- Launch-scope tests for Shared Spaces gating

### Commands to keep green

- `bun --filter='@notechain/web' run typecheck`
- `bun run smoke:meeting-to-knowledge`
- `bun run verify:launch`
- `bun run verify:privacy`
- `bun run test:web:file src/lib/meetings/__tests__/actionItemToTodo.test.ts`
- `bun run test:web:file src/lib/meetings/__tests__/meetingFollowUps.test.ts`
- `bun run test:web:file src/lib/graph/__tests__/contextGraph.test.ts`

### Proof sequence

1. Record or load one Meeting.
2. Produce one action item with source provenance.
3. Confirm it into a persisted Task.
4. Show the Task in a follow-up surface.
5. Navigate back to the source Meeting or transcript-backed evidence.
6. Show one related context result via the Context Graph query module.
7. Confirm no new sync path contains plaintext derived metadata.

## Key risks

1. **Derived metadata leakage**
   Graph edges, transcript references, citations, task provenance, and calendar context are sensitive and must remain local-only by default.

2. **Mock-surface trust erosion**
   If Task and Calendar surfaces remain visually real while still relying on mock state, user trust degrades faster than architecture improves.

3. **Scope creep**
   This initiative can accidentally turn into a broad rename, full calendar platform, or generic productivity expansion.

4. **Seam duplication**
   If builders add convenience helpers outside the new modules, the codebase will preserve shallow routes and scattered logic.

5. **Premature Shared Space work**
   Shared Space access without cryptographic sharing and authorization gates creates the highest trust risk in the repo.

## Non-goals

- Broad internal `Todo*` → `Task*` rename.
- Broad internal `/teams` / `Team*` → Shared Spaces rename.
- Full Google/Outlook provider lifecycle or generic calendar-clone behavior.
- Graph visualization polish before graph query leverage is real.
- Cloud AI expansion beyond the accepted AI processing policy.
- Production Shared Spaces launch before cryptographic sharing acceptance gates are implemented and tested.

## Open decisions

1. Should the first Task seam live entirely under `apps/web/src/lib/tasks/`, or should any types move into a shared package now?
   - Recommendation: keep the first seam app-local.

2. Should the first Task interface wrap local Dexie CRUD, service code, or repository code?
   - Recommendation: local Dexie first for locality and minimum migration risk.

3. Should the first Calendar seam be read-only or read/write?
   - Recommendation: read-focused first; only add writes needed for an existing follow-through path.

4. Should the first Context Graph query module subsume cited search immediately or land graph-page reads first?
   - Recommendation: define one seam, but land graph-page reads first if schedule is tight.

5. Should this initiative include any Shared Space code changes beyond feature-gate tests and prototype honesty?
   - Recommendation: no product-ready Shared Space work in this slice.

## Definition of done

This initiative is complete when:

- `/tasks` depends on a real Task interface rather than route-local mock state.
- Meeting prep and action-item promotion run through one Meeting access seam.
- Calendar route depends on local event shells and a provider-neutral Calendar interface rather than hardcoded mock events.
- Graph page and related-context retrieval depend on one Context Graph query module.
- Focused verification proves the meeting-to-knowledge loop still works end-to-end.
- Shared Spaces remain correctly gated until cryptographic sharing acceptance gates are implemented and tested.
