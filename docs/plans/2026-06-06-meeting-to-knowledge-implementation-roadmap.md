# Meeting-to-Knowledge Implementation Roadmap

Status: Accepted direction
Date: 2026-06-06
Parent strategy: `docs/plans/2026-06-06-notechain-feature-review-and-june-2026-standards.md`
Architecture decision: `docs/adr/ADR-context-graph-product-substrate.md`

## Vision

NoteChain’s next 1–2 milestones should prove one narrow, trustworthy loop:

> Private meeting and note context becomes encrypted, source-cited decisions, tasks, follow-ups, and knowledge map context.

This roadmap intentionally avoids turning NoteChain into a generic all-in-one productivity suite. It prioritizes the meeting-to-knowledge wedge while keeping Tasks, Calendar, and Shared Spaces honest until they are repository-backed and trust-gated.

## Success Criteria

- A meeting transcript can produce structured, source-cited outputs.
- A meeting action item can become a persisted task linked to its source transcript segment.
- Follow-up work appears in a focused Today / Command Center surface.
- Related context can be retrieved with visible provenance.
- The graph has typed entities/edges for the narrow meeting-to-task loop.
- Mock or hardcoded product surfaces are feature-gated or clearly labelled.
- A fast launch smoke suite verifies the happy path.

## Non-Goals

- Full Shared Spaces launch.
- Full Google/Outlook calendar sync lifecycle.
- Polishing graph visualization layouts before graph data is useful.
- Broad project-management features unrelated to meeting follow-through.
- Cloud AI expansion beyond the accepted AI processing policy in `docs/adr/ADR-ai-processing-policy.md`.

## Slices

- [x] **S01: Feature-gate non-production surfaces** `risk:medium` `depends:[]`

  > After this: Tasks, Calendar, and Shared Spaces cannot be mistaken for production-backed features when data is mock/hardcoded.

- [x] **S02: Meeting artifact provenance** `risk:high` `depends:[]`

  > After this: meeting summaries/action items can store source transcript segment IDs and confidence/user-confirmation state.

- [x] **S03: Action item to real task path** `risk:high` `depends:[S02]`

  > After this: a meeting action item can become a persisted task with a backlink to the source transcript segment.

- [x] **S04: Meeting prep from manual/calendar context** `risk:medium` `depends:[S02]`

  > After this: a meeting can show prep context from linked notes and/or a calendar-like event shell without claiming full calendar sync.

- [x] **S05: Today / follow-up command center** `risk:medium` `depends:[S03]`

  > After this: source-linked meeting tasks show in a focused follow-up view.

- [x] **S06: Context graph typed entities v1** `risk:high` `depends:[S02,S03]`

  > After this: notes, meetings, transcript segments, and tasks appear as typed graph entities with `created_from` and `cites` edges.

- [x] **S07: Cited related-context search** `risk:medium` `depends:[S06]`

  > After this: from a meeting or task, the user can see related notes/meetings with visible source links.

- [x] **S08: Launch smoke suite** `risk:high` `depends:[S01,S03,S05,S07]`
  > After this: one fast test command verifies the meeting-to-knowledge happy path.

## Boundary Map

### S01 produces

- Product surfaces that honestly communicate prototype/mock state.
- A clear rule for whether Tasks, Calendar, and Shared Spaces are visible, gated, or labelled.

### S02 consumes

- Existing meeting transcript/action-item storage.

### S02 produces

- Provenance shape for derived artifacts:
  - source artifact type;
  - source artifact ID;
  - transcript segment ID or text range when available;
  - extraction confidence;
  - user confirmation state;
  - created/updated timestamps.

### S03 consumes

- S02 provenance fields.
- Existing todo/task repository or sync primitives.

### S03 produces

- Persisted task records linked back to meeting action items or transcript segments.
- UI path for accepting/rejecting extracted action items.

### S04 consumes

- Meeting metadata.
- Notes and lightweight calendar/event shell data.

### S04 produces

- Prep context panel for a meeting.
- No claim of full calendar sync unless provider auth and lifecycle are real.

### S05 consumes

- Persisted source-linked tasks from S03.

### S05 produces

- Today / follow-up list centered on meeting-derived work.
- Backlinks from tasks to their source meeting and transcript segment.

### S06 consumes

- Provenance model from S02.
- Source-linked tasks from S03.

### S06 produces

- Typed graph nodes for `Note`, `Meeting`, `TranscriptSegment`, and `Task`.
- Typed graph edges for `created_from`, `cites`, and `relates_to`.

### S07 consumes

- Typed graph entities/edges from S06.

### S07 produces

- Related context retrieval with visible source links.
- User-facing evidence for why an item is related.

### S08 consumes

- The end-to-end happy path from prior slices.

### S08 produces

- A fast smoke command suitable for pre-launch and agent verification.

## Key Risks

1. **Privacy leakage through derived metadata**
   Graph edges, embeddings, task titles, or calendar metadata could leak private context if sync/sharing boundaries are not enforced.

2. **Mock-surface trust erosion**
   Visible Tasks, Calendar, and Shared Spaces pages could imply production readiness before storage, authorization, and sync paths are real.

3. **AI provenance gap**
   AI summaries and extracted tasks become untrustworthy if users cannot see where claims came from.

4. **Test instability**
   Full tests previously timed out. The stabilized agent path is documented in `docs/testing.md`: use targeted Vitest commands, `bun run smoke:meeting-to-knowledge`, and `bun run verify:launch` before relying on the full suite.

5. **Scope creep into all-in-one productivity**
   Calendar, Shared Spaces, and project management features should support meeting follow-through, not become independent product fronts yet.

## Proof Strategy

Use narrow, observable proofs instead of broad demos:

- Record or load one meeting transcript.
- Extract one action item with a transcript citation.
- Confirm the action item into a real task.
- Show the task in Today / follow-up.
- Navigate from the task back to the source meeting segment.
- Show one related note or meeting with a visible graph/source explanation.
- Run a fast smoke command that verifies the path.

## Verification Classes

- **Typecheck**: `bun --filter='@notechain/web' run typecheck`
- **Launch gate**: `bun run verify:launch`
- **Smoke**: `bun run smoke:meeting-to-knowledge`
- **Unit**: provenance model, task conversion, graph entity/edge creation
- **Integration**: meeting artifact → task → Today → source backlink
- **Security/privacy**: no plaintext leakage in remote sync queues; derived metadata follows `docs/adr/ADR-ai-processing-policy.md`, uses `apps/web/src/lib/privacy/derivedMetadata.ts`, and respects authorization boundaries
- **UX trust**: mock/prototype surfaces are clearly gated or labelled

## Definition of Done

This roadmap is complete when:

- S01–S08 are implemented or intentionally superseded by an accepted replacement.
- The meeting-to-knowledge happy path works end-to-end without mock-only dependencies.
- Every AI-derived meeting artifact visible to users has provenance.
- The graph contributes useful related context before additional visual polish.
- Tests include a fast, reliable launch smoke command.
- Team/shared behavior remains gated until `docs/adr/ADR-cryptographic-sharing.md` acceptance gates are implemented.

## Requirement Coverage

| Requirement                                  | Covered By |
| -------------------------------------------- | ---------- |
| Honest launch posture for prototype surfaces | S01        |
| Source-cited meeting intelligence            | S02        |
| Meeting action item becomes real work        | S03        |
| Meeting prep workflow                        | S04        |
| Follow-up command center                     | S05        |
| Context Graph substrate v1                   | S06        |
| Related context with citations               | S07        |
| Reliable verification loop                   | S08        |

## Resolved Follow-Up Decisions

- Product copy should use **Shared Spaces** for trust-gated collaboration while `/teams` and `Team*` internals remain compatibility details until a cryptographic sharing migration trigger in `docs/plans/2026-06-06-shared-spaces-internal-migration-plan.md` is active. Shared Spaces are hidden from public-beta navigation by default and only appear when `NEXT_PUBLIC_FEATURE_SHARED_SPACES=true`.
- `/graph` should be presented as **Knowledge Map** in user-facing UI while **Context Graph** remains the domain and architecture term.
- `/tasks` should become the preferred user-facing route, with `/todos` and `Todo*` internals retained as compatibility details until a functional migration trigger in `docs/plans/2026-06-06-task-domain-model-consolidation-plan.md` is active.
- AI processing policy is accepted in `docs/adr/ADR-ai-processing-policy.md`.
- Derived metadata privacy is guarded by `apps/web/src/lib/privacy/derivedMetadata.ts`; meeting-derived task sync payloads reject source backlinks, citations, and transcript segment references by default.
- `bun run smoke:meeting-to-knowledge` is the canonical Meeting-to-Knowledge smoke command.
- `bun run verify:launch` is the current launch verification gate; it runs the Meeting-to-Knowledge smoke suite plus web typecheck.
- Launch verification should be expanded only through curated, deterministic focused gates. Phase 1 gates now exist as `bun run smoke:public-beta`, `bun run verify:privacy`, and `bun run verify:sync`, but `verify:launch` intentionally remains the Meeting-to-Knowledge smoke suite plus web typecheck; see `docs/plans/2026-06-06-launch-verification-hardening-plan.md` and `docs/plans/2026-06-06-sync-engine-test-stabilization.md`.
- Targeted web tests should use `bun run test:web:file src/path/to/file.test.ts`; see `docs/testing.md`.
