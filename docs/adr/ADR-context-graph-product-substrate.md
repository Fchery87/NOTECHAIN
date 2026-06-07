# ADR: Context Graph as Product Substrate

Status: Accepted
Date: 2026-06-06

## Context

NoteChain currently exposes Notes, Tasks, Calendar, Meetings, Teams, and Graph as separate navigation areas. Repository review shows that Notes and Meetings have the strongest implementation foundations, while Tasks, Calendar, and Teams are still partly mock/in-memory at the page level. The Graph feature currently exists primarily as a visualization over notes/tags/backlinks.

June 2026 market research shows that AI productivity tools are no longer judged by whether they have AI summaries or a graph view. Users expect integrated workflows where notes, meetings, tasks, calendar context, and collaboration produce source-cited, actionable knowledge. Graph views that only visualize backlinks risk becoming decorative “spaghetti graphs” once data grows.

NoteChain’s strongest differentiation is not a generic all-in-one productivity suite. It is a trust-first encrypted workspace where private notes and meeting context become source-cited decisions, tasks, follow-ups, and knowledge maps.

The accepted near-term wedge is **Meeting-to-Knowledge OS** for the next 1–2 milestones: private notes and calendar context prepare meetings; meetings produce structured, cited outputs; those outputs become tasks, follow-ups, decisions, and graph context. Encrypted team workspace capabilities remain a later expansion after cryptographic sharing gates are satisfied.

## Decision

NoteChain will treat the **Context Graph** as a product substrate, not merely as the `/graph` visualization.

The Context Graph is the typed, source-cited relationship model connecting:

- notes;
- meetings;
- transcript segments;
- tasks/action items;
- calendar events;
- people;
- teams/shared spaces;
- projects;
- topics/tags;
- decisions;
- attachments and OCR/PDF-derived content.

The user-facing graph page may remain a **Knowledge Map**, but the underlying graph must power:

- semantic search;
- related context;
- meeting preparation;
- cited AI answers;
- action item/task provenance;
- decision history;
- cross-meeting intelligence;
- and shared workspace knowledge navigation.

## Required properties

1. **Typed entities**
   Graph nodes must have explicit entity types instead of treating all content as notes/tags.

2. **Typed edges**
   Supported edge types should include at minimum:
   - `mentions`
   - `assigned_to`
   - `due_on`
   - `created_from`
   - `decided_in`
   - `follows_up`
   - `blocks`
   - `relates_to`
   - `cites`
   - `supersedes`
   - `contradicts`
   - `belongs_to_team`

3. **Provenance**
   Every AI-generated or derived node/edge must cite its source note, transcript segment, attachment, calendar event, or prior graph edge.

4. **Trust-aware AI**
   AI outputs based on the graph must disclose their sources. The system should avoid unsupported claims, especially across private/team boundaries.

5. **Privacy boundaries**
   Graph indexing, embeddings, and derived metadata must respect encryption and sharing boundaries. A user must not learn private/shared content through graph leakage unless they are authorized to decrypt the source.

6. **Actionability before visual polish**
   The graph should first improve answers, prep, decisions, and task follow-through. New layouts/animations are secondary.

## Alternatives considered

### Keep Graph as a visualization feature

This is simpler and matches the current implementation. However, it risks investing in visual polish without solving the core product problem: turning private context into useful action and recall.

### Use Notes as the only system of record

This keeps the model simple and aligns with classic note-taking apps. However, meetings, tasks, calendar events, decisions, people, and teams become second-class annotations instead of first-class product entities.

### Build a generic project-management data model

This could support tasks, teams, and calendars but would pull NoteChain toward ClickUp/Asana-style scope. That weakens the privacy-first knowledge differentiation and increases implementation surface area.

## Consequences

### Positive

- Creates one coherent model across Notes, Meetings, Tasks, Calendar, Shared Spaces, Knowledge Map, and the underlying Context Graph.
- Supports the recommended meeting-to-knowledge product wedge.
- Makes AI outputs more trustworthy through citations and provenance.
- Gives the Knowledge Map and underlying Context Graph a practical role beyond visualization.
- Helps future agents reason about feature boundaries and terminology.

### Negative

- Requires data-model work before the graph reaches its full value.
- Requires careful permission and encryption boundary design.
- May require migrations from note-centric graph structures.
- Increases the burden on tests because derived relationships must be verifiable.

## Implementation guidance

Near-term implementation should proceed in slices:

1. Add provenance fields to AI-derived artifacts and meeting action items.
2. Promote meeting action items into tasks linked to transcript segments.
3. Add typed graph entities for `Meeting`, `TranscriptSegment`, `Task`, `CalendarEvent`, and `Decision`.
4. Use the graph in search/related-context flows before expanding graph visualization.
5. Feature-gate shared/team graph behavior until cryptographic sharing gates pass.

## Related documents

- `CONTEXT.md`
- `docs/plans/2026-06-06-notechain-feature-review-and-june-2026-standards.md`
- `docs/plans/2026-06-06-meeting-to-knowledge-implementation-roadmap.md`
- `docs/features/knowledge-graph.md`
- `docs/features/meeting-transcription.md`
- `docs/adr/ADR-cryptographic-sharing.md`
