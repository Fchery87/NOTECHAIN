# NoteChain Context

Last updated: 2026-06-06

> Your thoughts. Encrypted. Yours alone.

This document captures the current domain language, product direction, and trust boundaries for NoteChain. It is intentionally concise: durable enough for future agents and contributors, but not a replacement for feature specs or ADRs.

## Product Positioning

NoteChain is a trust-first, privacy-oriented workspace where private notes, meeting memory, tasks, calendar context, and team knowledge become an encrypted, queryable context graph.

Accepted near-term product wedge:

> NoteChain turns private meeting and note context into encrypted, source-cited decisions, tasks, follow-ups, and knowledge maps.

For the next 1–2 milestones, NoteChain is **meeting-to-knowledge first**, built on privacy-first notes. Encrypted team workspace capabilities remain important, but should be deferred until sharing, revocation, authorization, and audit gates are trustworthy.

This means NoteChain should not compete head-on as a generic all-in-one productivity suite. Its strongest differentiation is the intersection of:

- encrypted/private notes,
- meeting intelligence,
- task and calendar follow-through,
- source-cited AI,
- local/offline-first capture,
- and a knowledge/context graph that is useful for retrieval and action, not just visualization.

## Strategic Product Principle

Trust before surface area.

Do not broaden into more tabs, dashboards, or collaboration claims until the existing surfaces are trustworthy, integrated, and source-backed.

## Core Domain Terms

### Workspace

A user- or team-scoped container for encrypted knowledge.

A workspace may contain notes, meetings, tasks, calendar events, attachments, graph entities, and derived intelligence.

“Workspace” is the broad container term. “Shared Space” is the preferred user-facing term for a collaborative encrypted workspace boundary; “team” may remain an implementation detail until a later refactor.

### Note

A private or shared encrypted writing unit. Notes may include rich text, tasks, links, tags, attachments, and AI-derived metadata.

A note is not just a document. In the desired model, a note can produce or reference graph entities such as decisions, topics, people, projects, and tasks.

### Meeting

A time-bound conversation that can produce a transcript and structured intelligence.

A meeting should connect to:

- a calendar event,
- preparation notes,
- transcript segments,
- decisions,
- action items,
- follow-up tasks,
- people,
- projects,
- and related notes.

### Transcript Segment

A cited span of meeting transcript text. Transcript segments should become the provenance layer for AI-generated summaries, decisions, risks, and action items.

### Task

An executable item with owner, status, due date, priority, recurrence, and provenance.

A task can be created manually, extracted from a meeting, linked from a note, or derived from a calendar context.

Use product language “Task,” not “Todo,” in user-facing surfaces. `todos` may remain an implementation detail temporarily, but `/tasks` should become the preferred route.

### Calendar Event

An external or internal time object that provides context for meetings, deadlines, and task scheduling.

Calendar should not become a generic calendar clone. Its role is to provide time context for preparation, capture, follow-up, and execution.

### Team

A group of people with roles and access to shared encrypted workspace content.

Use “team” for implementation concepts only when necessary. User-facing collaboration language should prefer “Shared Space” until production-grade organization/team semantics are implemented.

### Shared Space

The preferred user-facing term for a trust-gated encrypted collaboration scope.

A Shared Space is about shared access to encrypted context, not merely org membership. Shared Spaces must not be marketed as production-ready until cryptographic sharing, revocation, authorization, and auditability are complete.

### Context Graph

The underlying network of entities and relationships across notes, meetings, tasks, calendar events, people, teams, projects, topics, decisions, and attachments.

The context graph is not merely the `/graph` page. It should power search, citations, related context, AI answers, meeting prep, and follow-up workflows.

### Knowledge Map

The user-facing visualization and navigation surface powered by the context graph.

Use “Knowledge Map” in product navigation and end-user copy. Use “Context Graph” for domain, architecture, and implementation language. Avoid implying the value is only a force-directed graph visualization.

### Decision

A structured knowledge artifact representing a choice made by a person or team. A decision should cite its source: a note, meeting transcript segment, or imported document.

### Action Item

A task-like item extracted from a meeting or note. Action items should either become tasks or remain explicitly linked to their source.

### Provenance

The source trail for any AI-generated or derived object.

Every AI-generated summary, tag, relation, task, decision, or answer should be able to answer: “Where did this come from?”

### Source-Cited AI

AI behavior that cites notes, transcript segments, attachments, calendar events, or graph edges used to generate an output.

This should be a trust requirement, not a premium feature.

## Trust and Privacy Vocabulary

Be precise in user-facing language.

### Encrypted at Rest

Data is encrypted while stored. This is weaker than end-to-end encryption if the server or service can access keys.

### End-to-End Encrypted / E2EE

Only authorized clients can decrypt content. The server cannot read plaintext content.

Use this claim only where the implementation and key lifecycle actually support it.

### Zero-Knowledge

The provider cannot decrypt user content or reset access to decrypted content.

Use this claim sparingly and only where key management, recovery, indexing, AI processing, and collaboration semantics support it.

### Local-First

The product continues to work offline, stores useful local state, and syncs when connectivity returns.

Local-first does not automatically mean zero-knowledge or conflict-free collaboration. Be explicit about sync semantics.

### Private AI

AI processing that is transparent about whether content is processed locally, in a trusted backend, or by an external model provider.

Private AI must follow `docs/adr/ADR-ai-processing-policy.md` and disclose:

- model/provider,
- local vs cloud processing,
- whether plaintext leaves the device,
- whether data may be retained or used for training,
- where embeddings live,
- and whether embeddings are encrypted.

### Derived Metadata

Private context inferred from user content, including embeddings, graph edges, extracted entities, meeting titles, task titles, source backlinks, citations, search snippets, and transcript segment references.

Derived metadata inherits the sensitivity of its source material and must not be treated as harmless sync or analytics data. Graph/search/provenance metadata is local-only by default; sync or cloud processing requires the same encryption, authorization, and explicit-consent rules as the source material.

## Current Product Surfaces

### Notes

Status: strongest general-purpose surface.

Implemented foundations include rich editing, encrypted persistence/sync paths, note intelligence, search, related notes, and portability/export modules.

Near-term need: make note intelligence source-cited and integrate notes into the context graph.

### Meetings

Status: strongest wedge surface.

Implemented foundations include meeting list/detail/transcription components, browser/private transcription modes, encrypted meeting storage, and action item extraction.

Near-term need: transform meetings into structured knowledge: summaries, decisions, action items, risks, open questions, follow-up drafts, and graph links.

### Tasks

Status: visible but not yet production-grade.

The task UI and sync/repository code exist, but the route currently uses mock task data. Tasks should become the execution layer for notes and meetings.

Near-term need: remove mock state, add repository-backed task persistence, and preserve task provenance.

### Calendar

Status: visible but not yet production-grade.

Calendar UI and Google/Outlook helper modules exist, but the route currently uses mock events and optimistic connected-calendar display.

Near-term need: real calendar account lifecycle, event sync state, and meeting-prep/follow-up workflow.

### Knowledge Map / Context Graph

Status: visually real and now becoming the product substrate.

The user-facing **Knowledge Map** exists via Cytoscape and generated note graph data. The underlying **Context Graph** is the typed, source-cited substrate for notes, meetings, transcript segments, tasks, citations, and follow-up context.

Near-term need: keep graph-derived metadata local-only by default and continue expanding typed, cited edges across product entities.

### Shared Spaces

Status: directionally important but must stay trust-gated.

Shared Spaces UI, settings, members, manager types, and cryptographic sharing ADR exist, but `/teams` implementation pages currently rely on hardcoded/in-memory data and remain hidden from public-beta navigation unless explicitly feature-enabled.

Near-term need: only ship shared collaboration after cryptographic sharing acceptance gates are complete.

## Recommended Near-Term Roadmap

### Milestone 1 — Trustworthy Core

- Remove or feature-gate mock Tasks, Calendar, and Shared Spaces surfaces.
- Stabilize launch smoke tests.
- Verify encrypted sync queues never contain plaintext.
- Add provenance model for derived/AI-created artifacts.
- Normalize product language around Task, Meeting, Note, Knowledge Map, Context Graph, and Shared Space.

### Milestone 2 — Meeting-to-Action Workflow

- Calendar event creates meeting prep context.
- Meeting transcript creates cited summary, decisions, risks, open questions, and action items.
- Action items convert into tasks linked to transcript segments.
- Tasks appear in a daily command center / Today view.

### Milestone 3 — Context Graph

- Introduce graph entities across notes, tasks, meetings, calendar events, teams, people, projects, and attachments.
- Add typed edges and provenance.
- Use graph for search, related context, and AI answers before adding more visual polish.

### Milestone 4 — Shared Encrypted Spaces

- Implement cryptographic sharing acceptance gates.
- Add server-backed membership, invites, roles, revocation, and audit logs.
- Clearly separate personal and shared content.

## Product Guardrails

Do not prioritize:

- generic project management bloat,
- Gantt/resource planning/sprint tooling,
- broad “enterprise suite” claims,
- visual graph novelty without cited edges,
- real-time collaborative rich text before encryption/conflict semantics are solved,
- hardcoded integration states,
- or AI outputs without source citations.

## Documentation Links

Primary review, standards check, and implementation roadmap:

- `docs/plans/2026-06-06-notechain-feature-review-and-june-2026-standards.md`
- `docs/plans/2026-06-06-meeting-to-knowledge-implementation-roadmap.md`
- `docs/plans/2026-06-06-task-domain-model-consolidation-plan.md`
- `docs/plans/2026-06-06-shared-spaces-internal-migration-plan.md`
- `docs/plans/2026-06-06-launch-verification-hardening-plan.md`
- `docs/plans/2026-06-06-sync-engine-test-stabilization.md`
- `docs/testing.md`

Relevant ADRs:

- `docs/adr/ADR-001-technology-stack.md`
- `docs/adr/ADR-002-framework-choice.md`
- `docs/adr/ADR-cryptographic-sharing.md`
- `docs/adr/ADR-context-graph-product-substrate.md`
- `docs/adr/ADR-ai-processing-policy.md`

Relevant feature docs:

- `docs/features/knowledge-graph.md`
- `docs/features/meeting-transcription.md`
- `docs/features/real-time-collaboration.md`
- `docs/features/voice-to-text.md`
- `docs/features/ocr-document-intelligence.md`

## Accepted Decisions

1. The next 1–2 milestones are **meeting-first**: calendar context and private notes should feed meeting prep; meetings should produce source-cited summaries, decisions, action items, follow-ups, tasks, and graph context.
2. The Context Graph is the domain and architecture substrate; the user-facing graph surface should be called **Knowledge Map**.
3. User-facing collaboration language should use **Shared Spaces** while `/teams` and `Team*` internals remain compatibility details until a cryptographic sharing migration trigger in `docs/plans/2026-06-06-shared-spaces-internal-migration-plan.md` is active. Shared Spaces are hidden from public-beta navigation by default and only appear when `NEXT_PUBLIC_FEATURE_SHARED_SPACES=true`.
4. User-facing task language should use **Tasks**; `/tasks` is the preferred route while `/todos` and `Todo*` internals remain compatibility details until a functional migration trigger in `docs/plans/2026-06-06-task-domain-model-consolidation-plan.md` is active.
5. AI processing must follow `docs/adr/ADR-ai-processing-policy.md`.
6. Derived metadata privacy is enforced by `apps/web/src/lib/privacy/derivedMetadata.ts`; source backlinks, transcript segment references, citations, graph/search metadata, and embeddings stay local by default.
7. The accepted implementation slice plan is `docs/plans/2026-06-06-meeting-to-knowledge-implementation-roadmap.md`.
8. The current launch verification gate is `bun run verify:launch`, which runs the Meeting-to-Knowledge smoke suite plus web typecheck. Targeted web tests should use `bun run test:web:file src/path/to/file.test.ts`.
9. `verify:launch` should stay fast until focused gates in `docs/plans/2026-06-06-launch-verification-hardening-plan.md` are stable. Phase 1 gates now exist as `bun run smoke:public-beta`, `bun run verify:privacy`, and `bun run verify:sync`, but they are not yet folded into `verify:launch`. S18 stabilized sync-engine test invocation; use `bun --filter='@notechain/sync-engine' run ...`, not `bun --filter='@notechain/sync-engine' ...` without `run`.

## Remaining Decisions for Next Grill

No open product/domain naming or launch-gate decisions remain from the June 2026 review. New decisions should be attached to a concrete implementation slice.
