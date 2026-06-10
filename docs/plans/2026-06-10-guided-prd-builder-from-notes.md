# Guided PRD Builder from Notes

**Status:** Planning draft  
**Created:** 2026-06-10  
**Feature area:** Notes, AI assistance, research, export  
**Primary output:** Downloadable Markdown (`.md`) PRD

## Executive Summary

Build a Guided PRD Builder that turns one or more selected notes into a client-ready Product Requirements Document. The feature should not simply generate a generic PRD from raw text. It should help the user improve the quality of the PRD input before generation by extracting a project brief, identifying gaps, asking targeted discovery questions, optionally conducting sanitized web research, and then producing a structured Markdown PRD.

The product promise:

> Turn rough project notes into a researched, client-ready PRD through guided discovery.

The MVP should prioritize:

1. Selecting one or more notes.
2. Extracting a structured project brief.
3. Showing PRD readiness / missing context.
4. Asking targeted one-at-a-time guided questions with recommended answers.
5. Optionally supporting light, sanitized research.
6. Generating a PRD using the `writing-prds` structure.
7. Previewing the result.
8. Downloading the PRD as a `.md` file.
9. Optionally copying Markdown or saving the PRD as a new NoteChain note.

Third-party integrations such as Jira, Linear, Notion, Google Docs, GitHub Issues, v0, Lovable, and Cursor exports are intentionally out of scope for the MVP. Markdown download is the primary portable output.

---

## Product Positioning

### Not This

```text
AI PRD Generator
```

This framing is too generic and competes directly with basic AI writing tools.

### Better

```text
Guided PRD Builder
```

### Best User-Facing Promise

```text
Turn Notes into a Client-Ready PRD
```

### Differentiation

Most AI tools can generate a PRD from a prompt. NoteChain should generate a better PRD because it uses:

- The user's existing notes.
- Adaptive clarification questions.
- Recommended answers the user can accept or edit.
- Optional sanitized research.
- Clear assumptions and open questions.
- Source note references.
- Research citations when research is enabled.
- Privacy-conscious controls.
- Portable Markdown export.

The key principle:

> The system should not just write the PRD. It should help the user think clearly enough to deserve a good PRD.

---

## Guiding Skills and Product Philosophy

This feature should combine three internal skill patterns:

### 1. `writing-prds`

Path:

```text
/home/nochaserz/.agents/skills/writing-prds
```

Key principles to reflect in generated PRDs:

- Start with the problem and context.
- Explain why the problem matters now.
- Define success criteria upfront.
- Keep the PRD lightweight but actionable.
- Include a customer narrative / mock press release when useful.
- For AI products, include prompt behavior, guardrails, failure cases, and eval-style requirements.
- Treat the PRD as a living artifact that can support design, engineering, and stakeholder alignment.

### 2. `grill-me`

Path:

```text
/home/nochaserz/.agents/skills/grill-me
```

Key principles to adapt:

- Ask one question at a time.
- Walk down the decision tree until important ambiguity is resolved.
- Provide a recommended answer for each question.
- Do not ask questions that are already answered by available context.

Productized name for users should not be “grill me.” Use friendlier language such as:

- Guided Discovery
- Improve PRD with Questions
- PRD Readiness Check
- Clarify Project
- Answer Key Questions

Recommended label:

```text
Improve PRD with Guided Questions
```

### 3. `userinterface-wiki`

Path:

```text
/home/nochaserz/.agents/skills/userinterface-wiki
```

Key principles to apply to the product UI:

- Use progressive disclosure: show one step, one decision, and one primary action at a time.
- Keep guided discovery as a one-question-at-a-time experience, not a long intake form.
- Show visible progress through the wizard, question set, and readiness improvements.
- Reduce cognitive load by prioritizing the most important actions and hiding advanced options until needed.
- Provide immediate feedback for every user action and staged progress for long-running AI operations.
- Keep motion subtle, functional, under 300ms for user-triggered transitions, and respectful of `prefers-reduced-motion`.
- Ensure keyboard accessibility, sufficient hit targets, accessible status labels, and non-color-only status indicators.
- End with a clear success state after download/copy/save.

Productized UI direction:

```text
Calm guided wizard → one step at a time → one question at a time → clear Markdown export
```

---

## End-to-End User Flow

```text
1. Select one or more notes
2. Click Generate PRD / Create PRD
3. System extracts an initial project brief
4. System shows PRD readiness and missing context
5. User chooses whether to answer guided questions or generate anyway
6. System asks targeted questions one at a time
7. User accepts, edits, skips, or marks answers as open questions
8. Optional: user enables light sanitized research
9. System generates the PRD using the writing-prds structure
10. User previews the Markdown PRD
11. User downloads the PRD as a .md file
12. Optional: user copies Markdown or saves as a NoteChain note
```

---

## Entry Points

### MVP Entry Points

1. **Current note action**

```text
AI Actions → Create PRD
```

2. **Multi-note selection action** if note selection already exists or is cheap to add:

```text
Select notes → Generate PRD
```

### Later Entry Points

- Search results → Generate PRD from matching notes.
- Folder/project context → Generate PRD from all related notes.
- Meeting transcript → Generate PRD from transcript and linked notes.

---

## Detailed UX Flow

### Step 1: Source Selection

The user selects a current note or multiple notes.

Example selected notes:

```text
- Client call notes
- Marketplace feature brainstorm
- Admin workflow ideas
```

### Step 2: Source Review and Brief Extraction

The system analyzes selected notes and shows what it understood.

Example UI:

```text
Create PRD from Notes

Selected notes:
✓ Client marketplace idea
✓ Feature brainstorm
✓ Discovery call notes

Detected project:
Marketplace website for local service providers

Known from notes:
- Users can browse service providers
- Providers need profiles
- Customers should submit booking requests
- Admin needs to approve providers

Missing:
- Success criteria
- Out-of-scope items
- Payment decision
- Admin workflow details
```

### Step 3: PRD Readiness

Show a readiness checklist or score.

Example:

```text
PRD Readiness: 62%

Strong:
- Product type is clear
- Core features are present
- Target users are partially identified

Needs clarification:
- Problem statement
- Success criteria
- MVP boundaries
- Out-of-scope items
- Timeline or constraints
```

This makes the guided questions feel purposeful instead of arbitrary.

### Step 4: User Chooses Path

Offer a clear choice:

```text
Your PRD is missing success criteria and out-of-scope boundaries.

Recommended:
Answer 5 key questions first.

[Answer key questions]
[Generate draft with gaps]
[Cancel]
```

The user should never be trapped. If they choose to generate with gaps, the PRD should prominently include open questions and assumptions.

### Step 5: Guided Discovery Questions

Ask one focused question at a time. Each question includes:

- The question.
- A recommended answer.
- Why the question matters.
- Actions: use recommendation, edit, skip, mark as open question.

Example:

```text
Question 1 of 5

What does success look like for the MVP?

Recommended answer:
The MVP succeeds if a customer can discover a provider, submit a booking request, and receive confirmation without manual coordination outside the platform.

Why this matters:
Success criteria help define what engineering and design should optimize for.

[Use recommended answer]
[Edit answer]
[Skip]
[Mark as open question]
```

### Step 6: Optional Research Settings

For MVP, research should be optional and conservative.

Recommended initial options:

```text
Research mode

(o) Notes only
    Fastest and most private.

( ) Light research
    Finds common features, competitor examples, and market context.
    Search queries will be sanitized before sending.

[Preview queries]
[Continue]
```

If research is not included in the first milestone, build the architecture so it can be added later.

### Step 7: Markdown Preview

After generation, show a preview of the generated PRD.

Actions:

```text
[Download .md]
[Copy Markdown]
[Save as Note]
[Regenerate]
```

For MVP, prioritize:

1. Download `.md`
2. Copy Markdown
3. Save as Note, if existing note-creation APIs make this straightforward

---

## UI/UX Principles from `userinterface-wiki`

The Guided PRD Builder should feel like a calm, focused wizard rather than a complex AI control panel. The UI should reduce effort while keeping the user in control.

### Core UX Principles

1. **Progressive disclosure** — show only the current step and the current decision. Do not expose extracted brief fields, all missing fields, all questions, research settings, full preview, and export actions at the same time.
2. **One question at a time** — the guided discovery step should remain conversational and focused. Avoid turning it into a long form.
3. **One primary action per screen** — each step should visually emphasize the recommended next action and de-emphasize secondary/tertiary options.
4. **Visible progress** — show step progress, question progress, and readiness improvement.
5. **Immediate feedback** — every click should produce an immediate UI response. Long-running AI operations should use staged progress messages, not an indefinite spinner alone.
6. **Actionable readiness** — PRD readiness should explain strengths, missing areas, and how many questions will improve the draft. It should not be a decorative score.
7. **Accept messy input** — users can answer casually. The final PRD generation should normalize rough answers into polished PRD language.
8. **Accessible by default** — support keyboard navigation, clear focus states, screen-reader-friendly status messages, sufficient hit targets, reduced motion, and non-color-only indicators.
9. **Subtle functional motion** — transitions should clarify state changes, complete quickly, and avoid flashy “AI magic” effects.
10. **Strong finish** — after export, copy, or save, show a clear completion message that names the file or note created.

### Recommended Wizard Layout

Use a familiar structure across steps:

```text
Header:
Create PRD from Notes

Progress:
Step 2 of 6 — Review Project Brief

Main:
Current step content

Footer:
Back / Primary CTA / Secondary CTA
```

### Action Hierarchy

#### Source Review

Primary:

```text
Answer key questions
```

Secondary:

```text
Generate draft with gaps
```

Tertiary:

```text
Cancel
```

#### Guided Question

Primary:

```text
Use recommended answer
```

Secondary:

```text
Edit answer
```

Tertiary:

```text
Skip
Mark as open question
```

#### Preview / Export

Primary:

```text
Download .md
```

Secondary:

```text
Copy Markdown
Save as Note
```

Tertiary:

```text
Regenerate
```

### Staged Progress Messages

Long-running operations should communicate what is happening.

For generation:

```text
Analyzing selected notes...
Extracting project brief...
Preparing guided questions...
Generating Markdown PRD...
Finalizing download...
```

For research, if enabled:

```text
Sanitizing research queries...
Searching for market context...
Summarizing sources...
Adding citations...
```

### Motion and Accessibility Standards

- Step transitions: 180–260ms.
- Button state changes: 120–180ms.
- Modal/drawer transitions: under 300ms.
- No animation for keyboard navigation.
- Respect `prefers-reduced-motion`.
- Avoid multiple simultaneous focal animations.
- Buttons and selectable cards should be at least 32px high, preferably 40–44px for primary actions.
- Research mode and discovery-depth cards should be fully clickable, not just their radio controls.
- Status should never rely on color alone; use text, icons, and labels.

### Confirmation and Error Copy

Use specific confirmations:

```text
Markdown copied.
PRD downloaded: prd-local-service-marketplace-2026-06-10.md
Saved as note: PRD - Local Service Marketplace.
Research failed, so the PRD was generated from notes and discovery answers only.
Could not save as note, but your Markdown download is still available.
```

Avoid vague messages:

```text
Done.
Something went wrong.
```

### UI Choices to Avoid

- Long all-in-one setup forms.
- Showing all discovery questions at once.
- Too many equally weighted buttons.
- Spinner-only AI loading states.
- Flashy AI animations, bouncing icons, or flickering skeletons.
- Mandatory discovery with no “generate anyway” option.
- Decorative readiness scores that do not tell the user what is missing.
- Tiny icon-only controls for important actions.
- Hidden external research in the background.
- Decorative audio feedback in the MVP.

---

## Discovery Question Strategy

### Do Not Ask What Notes Already Answer

Bad:

```text
Should this be a website or mobile app?
```

If the note already says:

```text
Client wants web app first.
```

Better:

```text
I found that the MVP should be web-first. Should I treat native mobile apps as out of scope for version one?
```

### Discovery Depth Modes

Do not force every user through a long interview.

```text
Discovery depth:
(o) Quick — 5 key questions
( ) Standard — 8–12 questions
( ) Deep — full product discovery
```

#### Quick Mode

Ask no more than five high-impact questions:

1. What problem is this solving?
2. Who is the primary user/customer?
3. What does success look like?
4. What is included in the MVP?
5. What is explicitly out of scope?

#### Standard Mode

Ask 8–12 adaptive questions across:

- Problem
- Why now
- Users
- Success
- Workflows
- Scope
- Risks
- Constraints
- Open questions

#### Deep Mode

Later, for agencies/consultants:

- Buyer vs user
- Monetization
- Launch constraints
- Competitors
- Stakeholders
- Technical constraints
- Compliance
- Support/admin workflows
- Failure modes
- Measurement plan

### Question Categories

The question generator should prioritize:

1. **Problem**
   - What problem is this solving?
   - Who has this problem?
   - How is this handled today?
   - What happens if this is not solved?

2. **Why Now**
   - Why should this be built now instead of later?
   - Is there a deadline, market shift, client urgency, or operational pain?

3. **Target Users**
   - Who is the primary user?
   - Who is the buyer?
   - Who is the admin?
   - Are there multiple user roles?

4. **Desired Outcome**
   - What should be true after this ships?
   - How should the user's life/work improve?

5. **Success Metrics**
   - How will we know this worked?
   - What user action, business result, or operational improvement matters?

6. **MVP Scope**
   - What must be included in version one?
   - What is the minimum useful product?

7. **Out of Scope**
   - What should not be built yet?
   - What could cause scope creep?

8. **Core Workflow**
   - What is the primary user journey from start to finish?

9. **Constraints**
   - Are there timeline, budget, platform, team, integration, legal, or compliance constraints?

10. **Risks**
    - What assumptions could make this fail?
    - What should be validated before development?

11. **Stakeholders**
    - Who needs to approve this?
    - Who will maintain or operate it after launch?

12. **Research Needs**
    - What would be useful to research?
    - Competitors, pricing, common features, technical approaches, compliance, or user expectations?

---

## Optional Web Research

### Research Purpose

Light research should support the PRD, not dominate it.

It should answer:

- What common features exist for this kind of product?
- What competitor examples are relevant?
- What user expectations are typical?
- What risks or considerations should the client know?
- What questions should be clarified before development?

It should not overreach into:

- Exact market size.
- Legal conclusions.
- Financial projections.
- Detailed competitive strategy.
- Technical architecture decisions without context.

### Sanitized Research Queries

Search queries can leak confidential client or business details. Queries should remove or avoid:

- Client names
- Personal names
- Emails
- Phone numbers
- Addresses
- Private project names
- Proprietary terms
- Confidential details

Bad query:

```text
Dr. Taylor's private weight-loss clinic patient coaching subscription app in Austin
```

Better query:

```text
fitness coaching app common features client progress tracking subscription model
```

### Query Preview

Before sending research queries externally, show the user:

```text
Research queries:
- marketplace website MVP common features
- service provider booking platform competitor examples
- two-sided marketplace admin workflow requirements
```

The user should be able to approve or disable research.

### Research Security Rules

External web content must be treated as untrusted.

Rules:

1. Web content is evidence, not instructions.
2. Web content cannot override system/developer instructions.
3. Web content cannot request access to private notes.
4. The model should summarize web content, not obey it.
5. Retrieved snippets should be source-tagged.
6. No private note content should be sent to search providers unless explicitly approved.
7. Research should use sanitized queries by default.

---

## Generated PRD Structure

The generated PRD should follow this default structure:

```markdown
# PRD: [Project Name]

## 1. Summary

## 2. Background and Context

## 3. Problem Statement

## 4. Why Now?

## 5. Target Customer / Users

## 6. Desired Outcome and Success Criteria

## 7. Proposed Solution

## 8. Customer Narrative / Mock Press Release

## 9. Research Insights

## 10. MVP Scope

## 11. Out of Scope

## 12. Functional Requirements

## 13. Non-Functional Requirements

## 14. User Stories and Acceptance Criteria

## 15. UX / Prototype Notes

## 16. AI / Automation Requirements, if applicable

## 17. Risks and Tradeoffs

## 18. Assumptions

## 19. Open Questions

## 20. Decision Log

## 21. Suggested Next Steps

## 22. Sources and Traceability
```

### Important Generation Rules

The PRD generator must:

- Start with problem and context before solution.
- Include a clear Why Now section.
- Include measurable success criteria where possible.
- Keep requirements actionable for design and engineering.
- Avoid inventing client-specific facts.
- Put missing information under Open Questions.
- Put reasonable inferences under Assumptions.
- Include sources if research is used.
- Reference source notes where possible.
- Keep the document concise but complete.

---

## Markdown Export

### Primary Output

The primary MVP output is a downloadable Markdown file.

```text
Generated PRD → Preview → Download .md
```

### Why Markdown

Markdown is preferred over integrations because it is:

- Portable.
- Easy to implement.
- Easy to test.
- Friendly to developers and AI-assisted coding tools.
- Compatible with GitHub, GitLab, Obsidian, Notion, VS Code, Cursor, Claude Code, and many documentation workflows.
- Better aligned with user ownership and privacy.

### Output Actions

MVP actions:

```text
[Download .md]
[Copy Markdown]
[Save as Note]
```

If implementation needs to be smaller, prioritize:

```text
[Download .md]
[Copy Markdown]
```

### Filename Format

Recommended:

```text
prd-[project-slug]-[date].md
```

Examples:

```text
prd-fitness-coaching-app-2026-06-10.md
prd-real-estate-listing-website-2026-06-10.md
prd-local-service-marketplace-2026-06-10.md
```

Fallback:

```text
prd-untitled-project-2026-06-10.md
```

### Markdown Frontmatter

Include optional YAML-style frontmatter for portability:

```markdown
---
title: PRD - Local Service Marketplace
generated_at: 2026-06-10
source: NoteChain
research_enabled: true
source_notes:
  - Client Call Notes
  - Marketplace Feature Brainstorm
  - Admin Workflow Ideas
---
```

### Example Traceability Section

```markdown
## 22. Sources and Traceability

### Source Notes

- Client call notes — used for problem statement, target users, known features
- Feature brainstorm — used for MVP scope and future enhancements

### Discovery Answers

- User confirmed MVP success criteria
- User marked payments as phase two

### Research Sources

- [Source title](https://example.com) — used for competitor/context section

### Assumptions

- Payment processing is not required in MVP unless confirmed.
- Admin approval flow is required based on marketplace quality needs.

### Open Questions

- Does the client need Stripe payments at launch?
- Who approves service providers?
```

---

## Architecture Concept

### 1. Note Selection Layer

Responsible for:

- Current note input.
- Selected notes input.
- Source note metadata.
- Content length checks.

```ts
type SourceNote = {
  id: string;
  title: string;
  content: string;
  updatedAt?: string;
  tags?: string[];
};
```

### 2. Brief Extraction Service

Input:

```ts
SourceNote[]
```

Output:

```ts
type BriefField<T> = {
  value: T;
  confidence: 'high' | 'medium' | 'low';
  sourceNoteIds?: string[];
};

type ExtractedProjectBrief = {
  projectName?: BriefField<string>;
  projectType?: BriefField<string>;
  clientName?: BriefField<string>;
  summary?: BriefField<string>;
  problem?: BriefField<string>;
  targetUsers?: BriefField<string[]>;
  proposedSolution?: BriefField<string>;
  knownFeatures?: BriefField<string[]>;
  constraints?: BriefField<string[]>;
  successCriteria?: BriefField<string[]>;
  timeline?: BriefField<string>;
  budget?: BriefField<string>;
  assumptions?: string[];
  unknowns?: string[];
  sourceNoteIds: string[];
};
```

Responsibilities:

- Summarize selected notes.
- Extract structured fields.
- Identify missing information.
- Mark confidence.
- Preserve source note references where possible.

### 3. Discovery Question Generator

Input:

```ts
ExtractedProjectBrief;
```

Output:

```ts
type DiscoveryQuestion = {
  id: string;
  category:
    | 'problem'
    | 'why_now'
    | 'target_user'
    | 'success'
    | 'scope'
    | 'out_of_scope'
    | 'workflow'
    | 'constraint'
    | 'risk'
    | 'stakeholder'
    | 'research';
  question: string;
  recommendedAnswer?: string;
  reasonForAsking: string;
  priority: 'required' | 'recommended' | 'optional';
  answeredByNotes?: boolean;
};
```

Responsibilities:

- Generate only questions that matter.
- Avoid duplicate questions.
- Avoid asking what notes already answer.
- Prioritize based on PRD readiness.

### 4. Discovery Session State

```ts
type DiscoveryAnswer = {
  questionId: string;
  answer?: string;
  status: 'accepted_recommendation' | 'edited' | 'skipped' | 'marked_unknown';
};

type PRDDiscoverySession = {
  id: string;
  sourceNoteIds: string[];
  extractedBrief: ExtractedProjectBrief;
  questions: DiscoveryQuestion[];
  answers: DiscoveryAnswer[];
  readinessScore: number;
  createdAt: string;
};
```

### 5. Research Planner

Input:

```ts
ExtractedProjectBrief + DiscoveryAnswer[]
```

Output:

```ts
type ResearchPlan = {
  queries: Array<{
    query: string;
    reason: string;
    sanitized: boolean;
    sensitiveTermsRemoved?: string[];
  }>;
};
```

Responsibilities:

- Generate sanitized queries.
- Explain why each query is used.
- Remove sensitive details.
- Cap query count.
- Support query preview.

### 6. Research Retrieval Service

Input:

```ts
ResearchPlan;
```

Output:

```ts
type ResearchSource = {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  retrievedAt: string;
};

type ResearchSummary = {
  competitors?: Array<{
    name: string;
    url?: string;
    relevance: string;
  }>;
  commonFeatures: string[];
  userExpectations: string[];
  risks: string[];
  opportunities: string[];
  sources: ResearchSource[];
};
```

### 7. PRD Generator

Input:

```ts
type PRDGenerationInput = {
  sourceNotes: SourceNote[];
  brief: ExtractedProjectBrief;
  discoveryAnswers: DiscoveryAnswer[];
  researchSummary?: ResearchSummary;
  template: 'writing-prds';
};
```

Output:

```ts
type GeneratedPRD = {
  title: string;
  markdown: string;
  filename: string;
  metadata: {
    sourceNoteIds: string[];
    discoverySessionId?: string;
    researchEnabled: boolean;
    researchSources?: ResearchSource[];
    generatedAt: string;
    model?: string;
  };
};
```

### 8. Markdown Download / Copy / Save

Responsibilities:

- Create a downloadable `.md` file from generated Markdown.
- Copy Markdown to clipboard.
- Optionally save generated Markdown as a new NoteChain note.
- Show success/failure confirmation.

---

## Privacy and Security Requirements

### Disclosure Before AI or Research

Before sending note content to an AI provider:

```text
Selected note content may be sent to the configured AI provider to generate this PRD.
```

Before external research:

```text
Sanitized search queries may be sent to external search providers.
```

### Private Mode Behavior

If Private Mode is active, default behavior should be:

```text
Notes-only generation using local/private AI if available.
External research disabled by default.
```

If cloud AI is required:

```text
This action requires cloud AI. Continue?
```

No silent external calls.

### Logging

Avoid storing raw prompts or selected note content in logs.

Prefer metadata only:

- Note IDs.
- Generation timestamp.
- Model/provider name.
- Error code.
- Research enabled true/false.

### Source Isolation

Research content should be labeled as untrusted and separated from private note context.

---

## MVP Scope

### Include in MVP

- Generate from current note.
- Generate from multiple selected notes if selection already exists or is straightforward.
- Extract project brief from notes.
- Show readiness checklist or score.
- Quick guided questions, maximum 5.
- Recommended answer for each question.
- Accept/edit/skip/mark unknown controls.
- Generate PRD using `writing-prds` structure.
- Familiar wizard layout with clear step progress.
- One-question-at-a-time guided discovery UI.
- One dominant primary action per step.
- Staged progress messages for AI operations.
- Accessibility basics: keyboard navigation, visible focus states, sufficient hit targets, and reduced-motion support.
- Preview generated Markdown.
- Download `.md` file.
- Copy Markdown.
- Optional save as new note if simple.
- Clear confirmation and error states.

### Consider Phase 1.5 / Phase 2

- Light web research.
- Sanitized query generation.
- Query preview.
- Research citations.
- Research failure fallback.

### Explicitly Out of Scope for MVP

- Jira integration.
- Linear integration.
- Notion integration.
- Google Docs integration.
- GitHub Issues integration.
- PDF export.
- DOCX export.
- Full project workspace.
- Deep autonomous research.
- Automatic task creation.
- Market-size estimates.
- Cost/effort estimation.
- Legal/compliance conclusions.
- Native diagram generation.
- Real-time collaboration.
- Full claim-level citation verification.
- Complex agent orchestration.

---

## Acceptance Criteria

### Notes Input

- User can generate from one note.
- User can generate from multiple selected notes if multi-select is part of the MVP.
- Source notes are referenced in the generated PRD.
- If notes are empty or too short, the system asks for more context.

### Brief Extraction

- System extracts project type, summary, target users, known features, assumptions, and unknowns.
- System shows what it extracted before generation.
- System does not ask questions already answered clearly in notes.

### Guided Discovery

- System asks one question at a time.
- Each question includes a recommended answer.
- User can accept, edit, skip, or mark unknown.
- Quick mode asks no more than 5 questions.
- Standard mode, if included, asks no more than 12 questions.
- Answers are incorporated into the final PRD.
- Skipped/unknown answers become open questions where relevant.

### UX and Accessibility

- The PRD Builder uses a step-based wizard layout.
- Each step has one clear primary action.
- Guided discovery shows one question at a time.
- The question flow shows current question number and total question count.
- The overall flow shows step progress.
- PRD readiness shows strengths, missing areas, and the recommended next action.
- Long-running AI operations show staged progress messages.
- Buttons and selectable cards have sufficient hit targets.
- The flow is keyboard navigable.
- Progress and status messages are accessible to screen readers.
- Readiness states do not rely on color alone.
- Motion respects `prefers-reduced-motion`.
- User-triggered transitions complete within 300ms.
- Final download/copy/save actions show specific confirmation messages.
- Failure states are specific and recoverable.
- Decorative audio feedback is not included in the MVP.

### Research, If Included

- User can choose notes-only generation.
- User can enable light research.
- Search queries are sanitized.
- User can preview research queries.
- Research sources are included in the PRD.
- If research fails, generation can continue with notes only.

### PRD Quality

- PRD starts with background/context/problem before solution.
- PRD includes Why Now.
- PRD includes success criteria.
- PRD includes MVP scope.
- PRD includes out-of-scope items.
- PRD includes functional and non-functional requirements.
- PRD includes user stories and acceptance criteria.
- PRD includes UX/prototype notes.
- PRD includes AI/eval requirements if the project involves AI.
- PRD includes assumptions.
- PRD includes open questions.
- PRD includes a decision log.
- PRD includes suggested next steps.
- PRD includes source traceability.

### Markdown Export

- User can download generated PRD as a `.md` file.
- Markdown file uses a clean filename based on project name and date.
- Markdown contains the complete PRD.
- Markdown preserves headings, lists, tables, links, and source citations.
- Markdown includes metadata/frontmatter where appropriate.
- If research was used, source links are included.
- If notes were used, source note titles or IDs are referenced.
- Download works without requiring third-party integrations.

### Copy Markdown

- User can copy the generated PRD Markdown to clipboard.
- Copy action shows success confirmation.
- Copied content matches previewed content.

### Save as Note

- User can optionally save generated PRD as a new NoteChain note.
- Saving as note is separate from downloading.
- If save fails, download remains available.
- Saved note has a clear title.
- Saved note preserves metadata/source references where possible.

### Privacy

- User sees disclosure before cloud AI or external research.
- Private Mode does not silently send notes externally.
- Raw prompts/note content are not logged by default.
- Research queries avoid sensitive client details.

### Errors

The system shows clear errors for:

- AI unavailable.
- Research unavailable.
- Notes too long.
- Notes too short.
- User cancellation.
- Markdown download failure.
- Clipboard failure.
- Save failure.

No silent failures.

---

## Risks and Mitigations

### Risk: Too Much Friction

If every PRD requires a long interview, users may abandon.

Mitigation:

- Offer “Generate draft with gaps.”
- Default to Quick questions.
- Keep Quick mode to 5 questions.

### Risk: False Confidence

A polished PRD can make assumptions look like facts.

Mitigation:

- Require Assumptions and Open Questions sections.
- Include source traceability.
- Warn when readiness is low.

### Risk: Research Leaks Confidential Ideas

Search queries can reveal client data.

Mitigation:

- Sanitize queries.
- Preview queries.
- Require opt-in.
- Disable research by default in Private Mode.

### Risk: Prompt Injection from Research

Web pages can contain malicious instructions.

Mitigation:

- Treat web content as untrusted.
- Use research only as evidence.
- Prevent research content from overriding system instructions.

### Risk: Generic PRDs

AI-generated PRDs can become boilerplate.

Mitigation:

- Use note-specific details.
- Ask guided questions.
- Include source references.
- Include client-specific open questions.

### Risk: UI Feels Like a Complex AI Control Panel

If too many options, settings, and generated artifacts appear at once, the user may feel overwhelmed.

Mitigation:

- Use progressive disclosure.
- Show one step and one primary action at a time.
- Keep guided discovery one-question-at-a-time.
- Hide advanced options until relevant.

### Risk: Users Think Nothing Is Happening During AI Work

AI extraction, research, and generation can take several seconds. Without visible progress, the user may assume the system failed.

Mitigation:

- Show immediate loading states after actions.
- Use staged progress messages.
- Provide fallback messages if research or generation fails.
- Never rely on an indefinite spinner alone.

### Risk: Over-Animated or Gimmicky Experience

Excessive animation can make the feature feel less professional and can harm accessibility.

Mitigation:

- Use subtle functional transitions only.
- Keep user-triggered transitions under 300ms.
- Respect `prefers-reduced-motion`.
- Avoid decorative audio and flashy AI effects in the MVP.

### Risk: Scope Explosion

The feature can easily become a full research/project-management/integration platform.

Mitigation:

- MVP ends at Markdown download and optional save as note.
- Keep integrations out of scope.

---

## Phased Roadmap

### Phase 1: Core PRD Builder + Markdown Export

Build:

- Generate from current note.
- Generate from selected notes if available.
- Extract project brief.
- Show actionable readiness checklist.
- Use a step-based wizard layout.
- Ask Quick guided questions one at a time.
- Show staged progress for AI operations.
- Generate PRD using `writing-prds`.
- Preview PRD.
- Download `.md`.
- Copy Markdown.
- Optional save as note.

### Phase 2: Light Research

Add:

- Optional light web research.
- Sanitized query generation.
- Query preview.
- Research insights section.
- Source citations.
- Research failure fallback.

### Phase 3: PRD Editing and Refinement

Add:

- Regenerate section.
- Make more concise.
- Make more technical.
- Make more client-friendly.
- Add acceptance criteria.
- Add implementation prompt.
- Add v0/Cursor/Lovable prompt section without direct integration.

### Phase 4: Additional Export Formats, Only If Needed

Possible additions:

- PDF export.
- DOCX export.
- ZIP bundle with PRD + research notes.
- LLM-optimized prompt file.

### Phase 5: Project Workspace, Later

Potential future model:

```text
Project
├── Source notes
├── PRD
├── Research
├── Decisions
├── Tasks
├── Meetings
└── Files
```

Do not start here.

---

## Web Research Takeaways That Informed This Plan

Planning research suggested several important patterns:

1. AI PRDs are only as good as their inputs. Structured discovery before generation is valuable.
2. Strong PRDs should include problem, target users, success criteria, scope, assumptions, constraints, and open questions.
3. Evidence-backed PRDs are a differentiator. Claims should trace to notes, user answers, research, or explicit assumptions.
4. PR/FAQ and customer narrative methods help force clarity around user value.
5. Existing tools such as Notion and Coda already turn notes into polished documents, so NoteChain needs guided discovery and traceability to differentiate.
6. Privacy and prompt-injection risks must be handled carefully when external AI or web research is involved.
7. Markdown export is a strong MVP output because it is portable, implementation-light, and works across many workflows without integrations.

Reference examples and concepts reviewed during planning included:

- Product discovery questions and success metrics practices.
- Amazon-style Working Backwards / PR-FAQ methods.
- AI PRD tools emphasizing evidence-backed requirements.
- Notion/Coda-style note-to-document AI workflows.
- RAG/prompt-injection and citation-grounding best practices.

---

## Final Product Decision

For the MVP:

> Build a Guided PRD Builder that turns selected notes into a structured Markdown PRD through brief extraction, targeted discovery questions, and Markdown export.

Do not build third-party integrations in the MVP.

Primary output:

```text
Download .md
```

Secondary outputs:

```text
Copy Markdown
Save as Note
```

Core flow:

```text
Select notes
→ Step-based guided wizard
→ Extract project brief
→ Show actionable PRD readiness
→ Ask one-at-a-time guided questions
→ Generate writing-prds-style PRD
→ Preview Markdown
→ Download .md
```

The feature should feel less like an AI text generator and more like a thoughtful product strategist embedded inside NoteChain.
