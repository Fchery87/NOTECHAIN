# NoteChain Feature Review and June 2026 Standards Check

Date: 2026-06-06

Purpose: Review the currently implemented NoteChain product surface — Notes, Graph, Tasks, Calendar, Meetings, and Teams — against 2026 expectations for AI-native, privacy-first productivity systems. This is a research-backed decision map for the next product/architecture grilling session.

## Executive Summary

NoteChain already has the right strategic ingredients: encrypted notes, local/offline persistence, sync infrastructure, TipTap editing, AI-assisted note intelligence, graph visualization, meeting transcription, task links, calendar UI, and team surfaces.

The gap is not ambition. The gap is product coherence and trust depth.

As of this review, Notes and Meetings are the most real product areas. Graph has a plausible implementation path but needs usefulness beyond visual novelty. Tasks, Calendar, and Teams are visually present but still rely heavily on mock/in-memory data and need backend, sync, permission, and workflow integration before being positioned as production features.

June 2026 standards are clear:

- AI is baseline, not a differentiator.
- Meeting capture must become structured knowledge, not just transcript storage.
- Notes, tasks, calendar, meetings, and teams must be one context graph, not six tabs.
- Enterprise/security buyers expect SOC 2/GDPR/HIPAA-aligned controls, auditability, SSO/SCIM, retention, export, and data residency posture.
- Privacy-first users expect local-first/offline behavior, encryption clarity, zero-knowledge claims only when technically defensible, and model-processing transparency.
- Knowledge graph features must support retrieval, provenance, decisions, and action — not just a force-directed visualization.

Recommended strategic direction:

> Position NoteChain as a trust-first, local-first workspace where private notes, meeting memory, tasks, calendar context, and team knowledge become an encrypted, queryable context graph.

## Current Implementation Review

Evidence sources: repository inspection of `apps/web/src/app`, `apps/web/src/components`, `apps/web/src/lib`, package manifests, feature docs, roadmap docs, ADRs, and test/typecheck runs.

### Product routes currently present

Implemented Next.js routes include:

- `/notes`
- `/todos`
- `/calendar`
- `/meetings`
- `/meetings/[id]`
- `/teams`
- `/teams/[id]`
- `/graph`
- Supporting routes for dashboard, search, OCR, PDFs, quick capture, auth, settings, and admin APIs.

### Notes

Relevant files:

- `apps/web/src/app/notes/page.tsx`
- `apps/web/src/components/NoteEditor.tsx`
- `apps/web/src/components/NoteEditorWithSelection.tsx`
- `apps/web/src/lib/sync/useNotesSync.ts`
- `apps/web/src/lib/repositories/NoteRepository.ts`
- `apps/web/src/lib/ai/notes/*`
- `apps/web/src/lib/search/*`
- backup/portability modules under `apps/web/src/lib/backup/*`

Current strengths:

- Notes page is a real feature surface, not only a stub.
- Uses `useNotesSync`, Supabase user context, and encrypted note persistence paths.
- Rich editor stack via TipTap extensions: links, images, code blocks, task lists, underline, character count, placeholders.
- Note intelligence exists in code: auto-tagging, summarization, related notes, embeddings/search, local answer/search modules.
- Multi-select and locked-note affordances exist.
- Export/portability modules exist for JSON, Markdown, encrypted workspace backups.

Current gaps:

- Need clearer UX around encrypted state, unlock/recovery, and why a note is locked.
- Need first-class backlinks, mentions, entities, decisions, and provenance extraction in the editor, not only downstream AI helpers.
- Need conflict semantics made user-legible. Current roadmap acknowledges newest-version-wins vs CRDT/merge questions.
- Need stronger evidence that offline queue never contains plaintext and remote sync applies correctly across sessions.
- Need performance posture for large note sets: virtualized lists, incremental indexing, graph/search rebuild behavior.

2026 readiness: medium-high foundation, but needs coherence and trust UX before it can compete with privacy-first products.

### Graph

Relevant files:

- `apps/web/src/app/graph/page.tsx`
- `apps/web/src/components/KnowledgeGraphView.tsx`
- `apps/web/src/lib/graph/transformData.ts`
- `apps/web/src/lib/graph/cytoscapeStyles.ts`
- `apps/web/src/lib/graph/layouts.ts`
- `apps/web/src/lib/ai/notes/KnowledgeGraphGenerator.ts`

Current strengths:

- Real graph visualization exists using Cytoscape.
- Supports layouts such as force-directed, circle, grid, hierarchical, and concentric.
- Has node/edge filters and legend controls.
- Graph page loads notes through repository/user context and uses `getKnowledgeGraphGenerator`.
- Tests exist for graph view/styles.

Current gaps:

- The biggest risk is “graph as pretty spaghetti.” 2026 market reviews repeatedly warn that graph views are often beautiful but not practical past modest note counts.
- Needs task/calendar/meeting/team nodes, not just note/tag/backlink nodes.
- Needs typed edges: mentions, caused-by, decided-in, blocks, assigned-to, due-on, relates-to, supersedes, contradicted-by.
- Needs provenance: every AI-created relationship should cite the note/transcript/event it came from.
- Needs actionability: clicking an edge should explain why it exists and what can be done next.

2026 readiness: visually credible, strategically incomplete. Must become a context graph, not a graph view.

### Tasks

Relevant files:

- `apps/web/src/app/todos/page.tsx`
- `apps/web/src/components/TodoList.tsx`
- `apps/web/src/components/TodoForm.tsx`
- `apps/web/src/components/TodoListWithLinks.tsx`
- `apps/web/src/lib/sync/useTodosSync.ts`
- `apps/web/src/lib/repositories/TodoRepository.ts`
- `apps/web/src/lib/recurringTasks.ts`

Current strengths:

- Tasks route and UI exist.
- `useTodosSync` exists, suggesting real sync plumbing.
- Todo form/list components exist, including a linked-notes variant.
- Recurring task logic exists.
- Tests exist around note-to-task workflows and local todo storage.

Current gaps:

- `/todos/page.tsx` initializes from `mockTodos`, which makes the feature feel demo-grade.
- Tasks are not yet obviously unified with meetings and calendar as a single execution layer.
- Need natural-language task capture, recurring rules UX, priority scheduling, dependency links, and assignment semantics.
- Need task provenance: created manually vs extracted from meeting vs from note vs imported from external system.
- Need clear owner/team permissions before shared tasking is credible.

2026 readiness: medium-low as product surface; higher as internal plumbing. Should not be marketed as full task management until mock data is removed and workflows are integrated.

### Calendar

Relevant files:

- `apps/web/src/app/calendar/page.tsx`
- `apps/web/src/components/CalendarView.tsx`
- `apps/web/src/components/CalendarEventTranscript.tsx`
- `apps/web/src/lib/googleCalendar.ts`
- `apps/web/src/lib/outlookCalendar.ts`

Current strengths:

- Calendar UI supports month/week/day style rendering.
- Google and Outlook integration modules exist.
- Calendar event transcript component exists, creating a bridge between calendar and meetings.
- Sidebar communicates connected calendar concepts and upcoming events.

Current gaps:

- `/calendar/page.tsx` initializes from `mockEvents`.
- “Google Calendar Connected” and “Outlook Connected” appear hardcoded/optimistic in the UI.
- No visible full OAuth account lifecycle: connect, disconnect, token refresh, failure state, partial sync, scopes transparency.
- Need calendar-to-meeting workflow: upcoming event → agenda/prep → recording/transcript → summary/action items → tasks/follow-ups.
- Need conflict/state model for imported external events vs user-created events.

2026 readiness: low-medium. The UI is strong enough for demos, but standards require reliable integrations and scheduling intelligence.

### Meetings

Relevant files:

- `apps/web/src/app/meetings/page.tsx`
- `apps/web/src/app/meetings/[id]/page.tsx`
- `apps/web/src/components/MeetingTranscriber.tsx`
- `apps/web/src/components/MeetingList.tsx`
- `apps/web/src/components/MeetingDetail.tsx`
- `apps/web/src/lib/storage/meetingStorage.ts`
- `apps/web/src/hooks/useMeetingTranscriptionController.ts`
- `apps/web/src/hooks/useWebSpeechTranscription.ts`
- `apps/web/src/hooks/useHuggingFaceTranscription.ts`
- `apps/web/src/lib/ai/transcription/*`

Current strengths:

- Meetings are one of the strongest implemented surfaces.
- Meeting list/detail/transcriber components exist.
- Supports real-time browser transcription mode and private fallback mode.
- Uses local/HuggingFace-style transcription paths and encrypted meeting storage.
- Extracts action items.
- Meeting detail includes metadata, calendar event marker, action items, transcript, copy/export affordances.
- Substantial test coverage exists around meeting storage and meeting components.

Current gaps:

- Needs speaker diarization, language coverage, accuracy reporting, and correction flow.
- Needs meeting summaries, decisions, risks, open questions, and follow-up drafts as first-class structured outputs.
- Needs cross-meeting intelligence: themes across meetings, recurring blockers, unresolved decisions, people/project timelines.
- Needs integrations: Zoom/Google Meet/Microsoft Teams capture or import path; calendar-aware auto-prep; export/sync to tasks.
- Needs enterprise controls around recording consent, retention, access, and audit logs.

2026 readiness: medium-high for privacy-first local meeting capture; medium-low for enterprise meeting intelligence.

### Teams

Relevant files:

- `apps/web/src/app/teams/page.tsx`
- `apps/web/src/app/teams/[id]/page.tsx`
- `apps/web/src/components/TeamSwitcher.tsx`
- `apps/web/src/components/TeamSettings.tsx`
- `apps/web/src/components/MemberList.tsx`
- `apps/web/src/lib/teams/teamManager.ts`
- `apps/web/src/lib/teams/types.ts`
- `docs/adr/ADR-cryptographic-sharing.md`

Current strengths:

- Teams route and team detail route exist.
- Team settings/member management UI exists.
- Team manager code exists.
- Cryptographic sharing ADR exists, with key hierarchy, sharing flow, revocation model, server authorization requirements, operation history/realtime, and acceptance gates.

Current gaps:

- `/teams/page.tsx` and `/teams/[id]/page.tsx` rely on hardcoded/in-memory teams, members, folders, and notes.
- The UI currently risks overpromising collaboration before cryptographic sharing is complete.
- Need server-backed membership, invites, RBAC, revocation, audit logs, and encrypted team key lifecycle.
- Need external collaborators/guest model only after core sharing is proven.
- Need shared workspace scope: which notes/tasks/meetings/calendar events are personal vs team-owned?

2026 readiness: low as production collaboration; high as a declared product direction. Keep behind feature gate until acceptance gates pass.

## Engineering Health Findings

### Typecheck

`bun --filter='@notechain/web' run typecheck` exited successfully.

### Tests

A full `bun --filter='@notechain/web' run test` run did not complete within the safe execution budget. A previous summarized run reported many failed/error test files, while a deeper rerun timed out. Treat test reliability/runtime as an engineering health issue before launch claims.

Recommended follow-up:

- Split tests by node/jsdom/browser environment.
- Fix unhandled errors between tests.
- Add CI-friendly per-package test profiles.
- Create a “launch smoke” suite that runs quickly and covers notes sync, encryption, meeting storage, task creation, and graph generation.

### Docs mismatch

Repo guidance says there is a root `CONTEXT.md`, but none exists. `docs/adr/` does exist. Grill-with-docs should either create a root `CONTEXT.md` or update project guidance.

## June 2026 Standards from Web Research

Sources reviewed include market and product comparisons around 2026 note-taking, AI knowledge management, meeting intelligence, all-in-one productivity, secure collaboration, and local-first systems.

### Table-stakes expectations

Modern users and enterprise buyers expect:

1. Cross-device sync with conflict handling.
2. Offline/local-first behavior for trusted capture.
3. AI search, summaries, and action-item extraction.
4. Semantic search across notes and meetings.
5. Calendar, task, and shared workspace integration.
6. Secure collaboration with RBAC and audit logs.
7. Export/portability and anti-lock-in posture.
8. Privacy and AI-processing transparency.
9. Enterprise controls: SSO/SAML, SCIM, retention, data residency, compliance posture.
10. Multimodal capture: voice, meetings, OCR/PDFs, web clips, screenshots.

### Competitive pattern

The market has split into layers:

- All-in-one team workspaces: Notion, ClickUp, Coda-like tools.
- Local/private PKM: Obsidian, Joplin, Standard Notes-like tools.
- AI-first personal memory: Mem, Reflect, voice-first tools.
- Meeting intelligence: Granola, Fellow, Spinach, Sembly, Bluedot-like tools.
- Enterprise retrieval/collaboration: Glean, Slack AI, Microsoft Copilot, Teams, Google Workspace.
- Local-first/open-source systems: CRDT-backed, Markdown/SQLite-backed, encrypted, agent-accessible projects.

NoteChain’s strongest possible differentiation is the intersection:

> privacy-first encrypted workspace + local-first capture + AI-structured context graph + meeting-to-task/calendar/team workflow.

Trying to compete as generic Notion/ClickUp replacement is too broad. Trying to compete as only encrypted notes undersells the implementation.

## Strong Recommendations

### Implement next

1. Unify everything into a context graph

Do not treat Notes, Tasks, Calendar, Meetings, Teams, and Graph as separate products. Every entity should be graph-addressable:

- Note
- Task
- CalendarEvent
- Meeting
- TranscriptSegment
- ActionItem
- Decision
- Person
- Team
- Project
- Tag/Topic
- Attachment/PDF/OCRDocument

Required edge types:

- mentions
- assigned_to
- due_on
- created_from
- decided_in
- follows_up
- blocks
- relates_to
- cites
- supersedes
- contradicts
- belongs_to_team

2. Make meeting intelligence first-class

Meetings should produce structured artifacts:

- Summary
- Action items
- Decisions
- Risks
- Open questions
- Follow-up draft
- Linked tasks
- Linked notes
- Linked calendar event
- Speaker/person references

3. Replace mock Tasks/Calendar/Teams with real repositories

Tasks, Calendar, and Teams should not be considered production until mock/in-memory state is removed from their pages and replaced with storage/sync/repository layers.

4. Add provenance and citations everywhere AI acts

Every AI-generated summary, tag, relationship, action item, and answer should cite its source.

5. Build privacy-first AI controls

Users should know:

- Which model processed the content.
- Whether processing was local or cloud.
- Whether content left the device.
- Whether embeddings are encrypted and where they live.
- Whether the model provider can train on the content.

6. Add team sharing only after cryptographic gates pass

The existing ADR is directionally right. Do not expose team collaboration as a primary feature until revocation, membership, authorization, and audit gates are real.

7. Create a fast “Today / Command Center” experience

The product needs a daily operating surface:

- Today’s meetings
- Suggested prep notes
- Open tasks
- Waiting follow-ups
- Recent decisions
- Unprocessed captures
- Ask NoteChain / semantic search

8. Harden tests and launch smoke checks

A privacy-first product must be boringly reliable.

### Revise

1. Rename `/todos` to `/tasks`

The nav says “Tasks,” but the route/code uses todos. “Tasks” is product language; “todos” is implementation language.

2. Reframe Graph

Revise “Graph” from a standalone visualization to “Context Graph” or “Knowledge Map.” Make it useful for answers, decisions, and workflows.

3. Reframe Calendar

Calendar should not be a generic calendar clone. It should be meeting prep, time context, and task scheduling around encrypted knowledge.

4. Reframe Teams

Teams should be “Shared Spaces” or “Workspaces” if the privacy/sharing model centers encrypted workspace keys. Use “Teams” only for people/org membership.

5. Clarify AI branding

Avoid broad “AI assistant” claims. Use precise trust-first language: “local summaries,” “cited answers,” “private transcription,” “source-backed suggestions.”

### Take away / defer

1. Defer generic project management bloat

Do not chase ClickUp/Asana with Gantt charts, sprints, complex dashboards, resource planning, or workflow automations yet.

2. Defer enterprise suite claims

No “enterprise collaboration platform” positioning until SSO/SCIM, audit logs, retention, admin controls, compliance posture, and sharing gates exist.

3. Defer broad real-time co-editing if encryption semantics are not solved

Real-time collaborative rich text is hard under encryption. Ship shared encrypted spaces and async collaboration first if needed.

4. Defer visual graph novelty

Avoid adding graph layouts/animations before making graph edges meaningful and cited.

5. Defer hardcoded integration status

Do not show Google/Outlook as connected unless auth/token state is real.

## Product Strategy Options for Grill-with-Docs

### Option A — Private AI Notebook

Primary user: privacy-conscious individual knowledge worker.

Promise: encrypted notes, meeting memory, and semantic search that stay private.

Pros:

- Strongest alignment with current Notes/Meetings implementation.
- Lower team-collaboration complexity.
- Clear differentiation from Notion.

Cons:

- Smaller ACV.
- Must be excellent on solo UX, mobile capture, search, and portability.

### Option B — Encrypted Team Knowledge Workspace

Primary user: small-to-mid teams handling sensitive knowledge.

Promise: shared encrypted notes, meetings, tasks, and context graph with accountable AI.

Pros:

- Stronger revenue path.
- Uses Teams/cryptographic sharing direction.

Cons:

- Requires the most hardening: RBAC, audit, sharing, revocation, admin controls.
- Highest risk of overpromising.

### Option C — Meeting-to-Knowledge Operating System

Primary user: meeting-heavy founders, managers, product teams, agencies.

Promise: every meeting becomes private knowledge, tasks, decisions, and follow-ups.

Pros:

- Strongest 2026 market pull.
- Notes/Meetings/Tasks/Calendar naturally converge.
- Easier story than generic workspace.

Cons:

- Requires best-in-class transcription, integrations, and cross-meeting intelligence.
- Crowded with meeting AI tools.

Accepted synthesis:

Start with Option C — **Meeting-to-Knowledge OS** — as the product wedge for the next 1–2 milestones. Build it on Option A’s trust-first architecture, while designing Option B as the later expansion after cryptographic sharing gates are trustworthy.

Wedge statement:

> NoteChain turns private meeting and note context into an encrypted, source-cited workspace for decisions, tasks, and follow-ups.

## Grill-with-Docs Decision Gates

The next grilling session should force decisions on these questions:

1. What is the core noun: Note, Workspace, Meeting, or Context?
2. Given the accepted meeting-first wedge, what is the first launch-critical workflow: calendar prep, live transcription, post-meeting action extraction, or daily follow-through?
3. Is the graph a user-facing product area or an internal substrate powering search/AI?
4. What content can AI process locally vs in cloud?
5. What does “encrypted” mean in user-facing promises: E2EE, zero-knowledge, encrypted-at-rest, or local-first?
6. What is the launch-critical workflow?
   - quick capture → note → search
   - calendar event → meeting → transcript → tasks
   - team note → shared workspace → graph
7. What features should be hidden behind feature gates until trustworthy?
8. What docs need to become the durable domain model?

## Accepted Near-Term Roadmap

The accepted wedge is **Meeting-to-Knowledge OS** for the next 1–2 milestones. The roadmap therefore starts with the smallest trustworthy end-to-end loop: meeting context becomes cited decisions and tasks, without over-marketing mock Tasks, Calendar, or Teams surfaces.

Detailed vertical slices are captured in `docs/plans/2026-06-06-meeting-to-knowledge-implementation-roadmap.md`.

### Milestone 1 — Trustworthy meeting-to-action core

- Feature-gate or clearly mark Tasks, Calendar, and Teams surfaces until mock/hardcoded data is removed.
- Confirm notes/tasks/meeting storage never leaks plaintext to remote sync queues.
- Stabilize fast smoke tests so launch-critical flows can be verified quickly.
- Add source citations/provenance data model for meeting-derived artifacts.
- Use `CONTEXT.md` as the durable domain model for terms and trust promises.

### Milestone 2 — Meeting-to-knowledge workflow

- Calendar event or manual meeting setup creates meeting prep context.
- Meeting transcript generates cited summary, decisions, risks, action items, and open questions.
- Action items become tasks linked back to transcript segments.
- Tasks appear in Today/Command Center with source links and follow-up state.
- Meeting outputs feed the Context Graph for related-context search.

### Milestone 3 — Context graph substrate

- Introduce graph entity model across notes, tasks, meetings, transcript segments, calendar events, people, and teams/shared spaces.
- Add typed edges and provenance.
- Make graph power search, related context, meeting prep, and cited AI answers before adding visual polish.

### Milestone 4 — Shared encrypted spaces

- Implement cryptographic sharing acceptance gates.
- Add team membership, invites, roles, revocation, and audit logs.
- Support shared notes/tasks/meetings only with clear personal/team encryption boundaries.

## Documentation Status

Completed in this review pass:

- Created `CONTEXT.md` because repo instructions expected it but it was absent.
- Added `docs/adr/ADR-context-graph-product-substrate.md` and accepted the Context Graph substrate direction.
- Added `docs/plans/2026-06-06-meeting-to-knowledge-implementation-roadmap.md` with vertical implementation slices.
- Updated `docs/features/knowledge-graph.md` from visual graph to context graph / knowledge map direction.
- Updated `docs/features/meeting-transcription.md` to include structured meeting intelligence and meeting-to-knowledge workflow.

Still open:

- Add ADR for AI processing policy: local-first/local-only/cloud-permitted model boundaries.
- Add docs for Tasks, Calendar, and Teams once mock state is removed or feature-gated.
- Decide product naming: “Teams” vs “Shared Spaces”, `/graph` vs “Knowledge Map”, and `/todos` vs `/tasks`.
