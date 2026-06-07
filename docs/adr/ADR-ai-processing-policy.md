# ADR: AI Processing Policy

Status: Accepted
Date: 2026-06-06

## Context

NoteChain's accepted product wedge turns private meeting and note context into encrypted, source-cited decisions, tasks, follow-ups, and knowledge maps. This creates trust value, but it also introduces privacy risk: AI processing can expose plaintext content, and derived metadata can reveal sensitive meaning even when source documents remain encrypted.

The product currently distinguishes local/private capabilities from cloud or shared capabilities. Future contributors need an explicit policy before expanding AI features, provider integrations, embeddings, sync, or shared-space behavior.

## Decision

NoteChain will use a local-first, explicit-consent AI processing policy.

User content and derived context must not be sent to external AI providers unless the user explicitly enables a cloud AI feature or invokes an action whose UI clearly discloses that cloud processing will occur.

AI-generated or AI-assisted outputs that are shown as factual product artifacts must carry provenance wherever feasible. This includes summaries, action items, decisions, answers, tags, graph relationships, related-context results, and follow-up suggestions.

Derived metadata is sensitive. Meeting titles, task titles, calendar metadata, graph edges, embeddings, citations, source backlinks, transcript segment references, and search indexes can leak private meaning and must be treated as private context, not harmless metadata.

## Required properties

1. **Local-first default**
   - Notes, meetings, transcripts, tasks, search indexes, graph projections, and derived metadata stay local unless a cloud or shared feature is explicitly enabled.

2. **Explicit cloud AI consent**
   - No note content, transcript text, task content, graph context, embedding input, or derived metadata may be sent to an external model provider without explicit user action or setting.

3. **Provider disclosure**
   - Cloud AI flows must disclose the provider, what data is sent, whether plaintext leaves the device, retention assumptions, training/use policy, and whether encryption terminates before provider processing.

4. **Source-cited outputs**
   - AI-derived artifacts that affect user decisions or follow-up work must link back to their source note, meeting, transcript segment, calendar event, task, attachment, or graph relationship when available.

5. **Sensitive derived metadata**
   - Embeddings, graph edges, extracted entities, task backlinks, citation records, search snippets, and generated summaries inherit the sensitivity of their source material.

6. **No silent training exposure**
   - NoteChain must not silently send user content to providers that train on user data by default.

7. **Deletion and invalidation**
   - When source artifacts are deleted, derived AI artifacts should be deleted, invalidated, or clearly marked stale where feasible.

8. **Auditability**
   - AI-derived artifacts should record processing mode (`local`, `cloud`, `manual`, or `imported`), source artifact IDs, timestamp, and provider/model when cloud processing is used.

## Alternatives considered

### Permit cloud AI by default

This would accelerate feature development and improve model quality, but it conflicts with NoteChain's trust-first positioning and creates hidden privacy surprises.

### Treat embeddings and graph metadata as non-sensitive

This would simplify sync and retrieval, but derived metadata can reveal topics, relationships, participants, priorities, and decisions. Treating it as harmless would undermine the privacy model.

### Require every AI output to have perfect citations

This is ideal for factual claims, but some local suggestions or transformations may not have precise span-level provenance. The accepted rule is provenance wherever feasible, with factual or durable artifacts held to the highest standard.

## Consequences

### Positive

- Keeps NoteChain aligned with privacy-first product positioning.
- Gives future AI work a clear consent and disclosure boundary.
- Makes source-cited meeting intelligence a trust requirement rather than a UI flourish.
- Prevents derived metadata from bypassing encryption and sharing assumptions.

### Negative

- Some cloud AI features require more UI and policy work before launch.
- Local-first AI may have lower capability than hosted models.
- Search, graph, sync, and shared-space implementations need extra privacy review for derived metadata.

## Implementation guidance

- Prefer local models or local indexes for default AI/context features.
- Gate cloud provider integrations behind explicit settings and per-action disclosure where needed.
- Store provenance with AI-derived meeting artifacts, tasks, graph edges, and cited search results.
- Use `apps/web/src/lib/privacy/derivedMetadata.ts` as the source of truth for derived metadata sensitivity and local-only defaults.
- Do not sync plaintext derived metadata to remote services unless the same authorization and encryption guarantees apply as the source content.
- Guard sync payloads against accidental inclusion of source backlinks, transcript segment references, citations, graph/search metadata, embeddings, or other sensitive derived fields.
- Review shared-space features against `docs/adr/ADR-cryptographic-sharing.md` before marketing or enabling production collaboration.

## Related documents

- `CONTEXT.md`
- `docs/adr/ADR-context-graph-product-substrate.md`
- `docs/adr/ADR-cryptographic-sharing.md`
- `docs/plans/2026-06-06-meeting-to-knowledge-implementation-roadmap.md`
