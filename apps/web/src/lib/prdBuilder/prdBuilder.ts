export interface PrdSourceNote {
  id: string;
  title: string;
  content: string;
  updatedAt?: Date;
}

export interface ProjectBrief {
  projectName: string;
  summary: string;
  targetUsers: string[];
  knownFeatures: string[];
  assumptions: string[];
  unknowns: string[];
  sourceTitles: string[];
}

export type ReadinessStatus = 'strong' | 'partial' | 'missing';

export interface ReadinessItem {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
}

export interface GuidedQuestion {
  id: string;
  category: string;
  question: string;
  recommendedAnswer: string;
  whyItMatters: string;
}

export type GuidedAnswerStatus = 'answered' | 'skipped' | 'open';

export interface GuidedAnswer {
  questionId: string;
  answer: string;
  status: GuidedAnswerStatus;
}

export interface PrdResearchCitation {
  id: string;
  title: string;
  url: string;
  snippet: string;
  retrievedAt: string;
}

export interface PrdResearchBrief {
  query: string;
  summary: string;
  citations: PrdResearchCitation[];
  warnings: string[];
  generatedAt: string;
}

export interface PrdBuilderSession {
  sourceNotes: PrdSourceNote[];
  brief: ProjectBrief;
  readiness: ReadinessItem[];
  questions: GuidedQuestion[];
  createdAt: Date;
}

export interface GeneratePrdMarkdownOptions {
  session: PrdBuilderSession;
  answers: GuidedAnswer[];
  includeResearchPlaceholder?: boolean;
  researchBrief?: PrdResearchBrief;
  generatedAt?: Date;
}

interface ReadinessDefinition {
  id: string;
  label: string;
  strongPatterns: RegExp[];
  partialPatterns: RegExp[];
  missingDetail: string;
  partialDetail: string;
  strongDetail: string;
}

const MAX_FEATURES = 8;
const MAX_ASSUMPTIONS = 6;
const MAX_UNKNOWNS = 8;
const MAX_QUESTIONS = 5;

const READINESS_DEFINITIONS: ReadinessDefinition[] = [
  {
    id: 'problem',
    label: 'Problem statement',
    strongPatterns: [/\bproblem\b/i, /\bpain point\b/i, /\bchallenge\b/i, /\bstruggle\b/i],
    partialPatterns: [/\bneed\b/i, /\bgoal\b/i, /\bissue\b/i],
    missingDetail: 'The notes do not clearly explain the customer problem.',
    partialDetail: 'The notes hint at a problem but need sharper customer context.',
    strongDetail: 'The notes include a customer problem or pain point.',
  },
  {
    id: 'target-users',
    label: 'Target users',
    strongPatterns: [
      /\btarget user/i,
      /\bcustomer(s)?\b/i,
      /\bprovider(s)?\b/i,
      /\badmin(s)?\b/i,
      /\bclient(s)?\b/i,
    ],
    partialPatterns: [/\buser(s)?\b/i, /\baudience\b/i, /\bteam(s)?\b/i],
    missingDetail: 'The primary users are not explicit.',
    partialDetail: 'Some users are mentioned, but roles/personas need clarification.',
    strongDetail: 'The notes identify likely users or customer roles.',
  },
  {
    id: 'success-criteria',
    label: 'Success criteria',
    strongPatterns: [
      /\bsuccess criteria\b/i,
      /\bmetric(s)?\b/i,
      /\bkpi(s)?\b/i,
      /\bmeasure(d)? by\b/i,
    ],
    partialPatterns: [/\bsucceeds?\b/i, /\boutcome(s)?\b/i, /\bgoal(s)?\b/i],
    missingDetail: 'Success is not measurable yet.',
    partialDetail: 'Desired outcomes are present, but measurable success criteria are unclear.',
    strongDetail: 'The notes include success criteria or measurable outcomes.',
  },
  {
    id: 'mvp-scope',
    label: 'MVP scope',
    strongPatterns: [
      /\bmvp\b/i,
      /\bversion one\b/i,
      /\bv1\b/i,
      /\bphase 1\b/i,
      /\bfirst release\b/i,
    ],
    partialPatterns: [/\bscope\b/i, /\bmust have\b/i, /\bpriority\b/i, /\bcore\b/i],
    missingDetail: 'The MVP boundary is not defined.',
    partialDetail: 'The notes imply priorities, but the MVP boundary needs confirmation.',
    strongDetail: 'The notes include MVP or first-release language.',
  },
  {
    id: 'out-of-scope',
    label: 'Out-of-scope boundaries',
    strongPatterns: [
      /\bout of scope\b/i,
      /\bnot included\b/i,
      /\bwon't include\b/i,
      /\bwill not include\b/i,
    ],
    partialPatterns: [/\blater\b/i, /\bfuture\b/i, /\bphase 2\b/i],
    missingDetail: 'The notes do not say what should be excluded.',
    partialDetail: 'Some future/later ideas are present, but exclusions should be explicit.',
    strongDetail: 'The notes include exclusion or later-phase language.',
  },
  {
    id: 'risks',
    label: 'Risks and constraints',
    strongPatterns: [
      /\brisk(s)?\b/i,
      /\bconstraint(s)?\b/i,
      /\bprivacy\b/i,
      /\bsecurity\b/i,
      /\bdeadline\b/i,
      /\bbudget\b/i,
    ],
    partialPatterns: [/\bconcern(s)?\b/i, /\btradeoff(s)?\b/i, /\bdepends on\b/i],
    missingDetail: 'Risks, constraints, or tradeoffs are not yet clear.',
    partialDetail: 'The notes mention concerns but need clearer risk framing.',
    strongDetail: 'The notes include risks, constraints, or tradeoffs.',
  },
];

export function createPrdBuilderSession(
  sourceNotes: PrdSourceNote[],
  now = new Date()
): PrdBuilderSession {
  const nonEmptyNotes = sourceNotes.filter(
    note => extractPlainText(note.content).trim().length > 0
  );
  const notes = nonEmptyNotes.length > 0 ? nonEmptyNotes : sourceNotes;
  const combinedText = notes
    .map(note => `${note.title}\n${extractPlainText(note.content)}`)
    .join('\n\n');
  const brief = extractProjectBrief(notes, combinedText);
  const readiness = calculateReadiness(combinedText, brief);
  const questions = generateGuidedQuestions(brief, readiness).slice(0, MAX_QUESTIONS);

  return {
    sourceNotes: notes,
    brief,
    readiness,
    questions,
    createdAt: now,
  };
}

export function extractPlainText(content: string): string {
  return content
    .replace(/<style[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractProjectBrief(notes: PrdSourceNote[], combinedText: string): ProjectBrief {
  const plain = combinedText.trim();
  const sentences = splitIntoSentences(plain);
  const sourceTitles = notes.map(note => note.title || 'Untitled note');
  const projectName = deriveProjectName(sourceTitles, plain);
  const knownFeatures = uniqueStrings([
    ...extractListItems(plain),
    ...findSentences(sentences, [
      /\bshould\b/i,
      /\bneeds? to\b/i,
      /\bmust\b/i,
      /\bfeature\b/i,
      /\ballow(s)?\b/i,
    ]),
  ]).slice(0, MAX_FEATURES);
  const targetUsers = extractTargetUsers(plain);
  const assumptions = findSentences(sentences, [
    /\bassum/i,
    /\bprobably\b/i,
    /\blikely\b/i,
    /\bexpect/i,
    /\bdepends on\b/i,
  ]).slice(0, MAX_ASSUMPTIONS);
  const unknowns = uniqueStrings([
    ...findQuestions(plain),
    ...findSentences(sentences, [
      /\btbd\b/i,
      /\bunknown\b/i,
      /\bclarify\b/i,
      /\bneed to decide\b/i,
      /\bopen question\b/i,
    ]),
  ]).slice(0, MAX_UNKNOWNS);

  return {
    projectName,
    summary: summarizeProject(projectName, sentences, knownFeatures),
    targetUsers,
    knownFeatures,
    assumptions,
    unknowns,
    sourceTitles,
  };
}

function calculateReadiness(combinedText: string, brief: ProjectBrief): ReadinessItem[] {
  const featureStatus: ReadinessItem = {
    id: 'features',
    label: 'Known feature set',
    status:
      brief.knownFeatures.length >= 3
        ? 'strong'
        : brief.knownFeatures.length > 0
          ? 'partial'
          : 'missing',
    detail:
      brief.knownFeatures.length >= 3
        ? 'The notes include multiple feature candidates.'
        : brief.knownFeatures.length > 0
          ? 'The notes include some feature ideas, but the set is thin.'
          : 'The notes do not include enough feature detail.',
  };

  return [
    ...READINESS_DEFINITIONS.map(definition => {
      const hasStrong = definition.strongPatterns.some(pattern => pattern.test(combinedText));
      const hasPartial = definition.partialPatterns.some(pattern => pattern.test(combinedText));
      const status: ReadinessStatus = hasStrong ? 'strong' : hasPartial ? 'partial' : 'missing';
      return {
        id: definition.id,
        label: definition.label,
        status,
        detail:
          status === 'strong'
            ? definition.strongDetail
            : status === 'partial'
              ? definition.partialDetail
              : definition.missingDetail,
      };
    }),
    featureStatus,
  ];
}

export function getReadinessScore(readiness: ReadinessItem[]): number {
  if (readiness.length === 0) return 0;

  const points = readiness.reduce((total, item) => {
    if (item.status === 'strong') return total + 1;
    if (item.status === 'partial') return total + 0.5;
    return total;
  }, 0);

  return Math.round((points / readiness.length) * 100);
}

export function getReadinessLabel(score: number): 'Needs work' | 'Good' | 'Strong' {
  if (score >= 80) return 'Strong';
  if (score >= 55) return 'Good';
  return 'Needs work';
}

function generateGuidedQuestions(
  brief: ProjectBrief,
  readiness: ReadinessItem[]
): GuidedQuestion[] {
  const missingOrPartial = readiness.filter(item => item.status !== 'strong');
  const questionMap: Record<string, GuidedQuestion> = {
    problem: {
      id: 'problem',
      category: 'Problem',
      question: 'What customer problem should this PRD solve first?',
      recommendedAnswer: `The PRD should focus on helping ${formatUsers(brief.targetUsers)} accomplish the core workflow described in the notes with less friction.`,
      whyItMatters:
        'A clear problem statement keeps the PRD grounded in customer value instead of a feature list.',
    },
    'target-users': {
      id: 'target-users',
      category: 'Users',
      question: 'Who are the primary users or customer roles for the MVP?',
      recommendedAnswer: `Primary users appear to be ${formatUsers(brief.targetUsers)}. Secondary roles can be listed as assumptions until confirmed.`,
      whyItMatters:
        'User roles drive requirements, acceptance criteria, and out-of-scope decisions.',
    },
    'success-criteria': {
      id: 'success-criteria',
      category: 'Success',
      question: 'What does success look like for the MVP?',
      recommendedAnswer: `The MVP succeeds if ${formatUsers(brief.targetUsers)} can complete the main workflow without manual workarounds, and stakeholders can verify that the core requirements are met.`,
      whyItMatters: 'Success criteria help design and engineering know what to optimize for.',
    },
    'mvp-scope': {
      id: 'mvp-scope',
      category: 'Scope',
      question: 'What should be included in the first usable MVP?',
      recommendedAnswer: `Include the core workflow, the highest-priority features from the notes, and enough admin/support capability to operate the first release.`,
      whyItMatters: 'MVP scope prevents the PRD from becoming a wishlist.',
    },
    'out-of-scope': {
      id: 'out-of-scope',
      category: 'Boundaries',
      question: 'What should explicitly stay out of scope for version one?',
      recommendedAnswer:
        'Defer advanced automation, integrations, native mobile apps, and non-essential reporting unless the notes explicitly require them for launch.',
      whyItMatters: 'Out-of-scope boundaries reduce ambiguity and protect delivery focus.',
    },
    risks: {
      id: 'risks',
      category: 'Risks',
      question: 'What risks, constraints, or tradeoffs should the client know before development?',
      recommendedAnswer:
        'Key risks include unclear requirements, scope expansion, privacy/security expectations, and dependencies that need confirmation before build starts.',
      whyItMatters: 'Risks make hidden assumptions visible before engineering commits to a plan.',
    },
    features: {
      id: 'features',
      category: 'Features',
      question: 'What are the must-have features for the PRD?',
      recommendedAnswer: `Use the strongest feature candidates from the notes: ${brief.knownFeatures.slice(0, 3).join('; ') || 'core creation, review, and management workflows'}.`,
      whyItMatters:
        'Must-have features become the backbone of functional requirements and acceptance criteria.',
    },
  };

  return missingOrPartial
    .map(item => questionMap[item.id])
    .filter((question): question is GuidedQuestion => Boolean(question));
}

export function generatePrdMarkdown({
  session,
  answers,
  includeResearchPlaceholder = false,
  researchBrief,
  generatedAt = new Date(),
}: GeneratePrdMarkdownOptions): string {
  const { brief, readiness, sourceNotes } = session;
  const answerMap = new Map(answers.map(answer => [answer.questionId, answer]));
  const openAnswers = answers.filter(
    answer => answer.status === 'open' || answer.status === 'skipped'
  );
  const acceptedAnswers = answers.filter(
    answer => answer.status === 'answered' && answer.answer.trim().length > 0
  );
  const score = getReadinessScore(readiness);
  const filename = buildPrdFilename(brief.projectName, generatedAt);

  const answerValue = (id: string, fallback: string) => {
    const answer = answerMap.get(id);
    return answer?.status === 'answered' && answer.answer.trim() ? answer.answer.trim() : fallback;
  };

  const markdown = `---
title: "PRD - ${escapeYaml(brief.projectName)}"
generatedAt: "${generatedAt.toISOString()}"
sourceNotes: ${JSON.stringify(brief.sourceTitles)}
filename: "${filename}"
---

# PRD: ${brief.projectName}

## 1. Summary

${brief.summary}

## 2. Background and Context

This PRD was generated from ${sourceNotes.length} NoteChain source note${sourceNotes.length === 1 ? '' : 's'}: ${brief.sourceTitles.join(', ')}.

${formatParagraphList(brief.knownFeatures, 'Key context from the notes:')}

## 3. Problem Statement

${answerValue('problem', 'The notes indicate a product opportunity, but the exact customer problem should be validated with stakeholders before development begins.')}

## 4. Why Now?

The selected notes contain enough product context to align on a client-ready draft and identify remaining decisions before design or engineering starts.

## 5. Target Customer / Users

${answerValue('target-users', formatBulletList(brief.targetUsers.length > 0 ? brief.targetUsers : ['Primary customer or user role to confirm']))}

## 6. Desired Outcome and Success Criteria

${answerValue('success-criteria', 'Success should be defined with measurable product, customer, or operational outcomes before implementation begins.')}

## 7. Proposed Solution

Build the smallest useful version of ${brief.projectName} that solves the stated problem, supports the primary users, and keeps unclear or lower-priority work visible as assumptions or open questions.

## 8. Customer Narrative / Mock Press Release

A customer can use the MVP to complete the core workflow described in the notes without relying on scattered documents, manual coordination, or unclear next steps.

## 9. Research Insights

${formatResearchInsights(researchBrief, includeResearchPlaceholder)}

## 10. MVP Scope

${answerValue('mvp-scope', formatBulletList(brief.knownFeatures.length > 0 ? brief.knownFeatures : ['Core workflow and must-have requirements to confirm']))}

## 11. Out of Scope

${answerValue('out-of-scope', formatBulletList(['Advanced integrations unless explicitly required', 'Nice-to-have reporting or automation', 'Future-phase features not needed for first launch']))}

## 12. Functional Requirements

${formatRequirements(brief.knownFeatures)}

## 13. Non-Functional Requirements

- The experience should be clear, accessible, and usable without special training.
- Important status and error states should be visible and specific.
- Any sensitive content from notes should remain within the selected generation mode and privacy constraints.

## 14. User Stories and Acceptance Criteria

${formatUserStories(brief)}

## 15. UX / Prototype Notes

- Use a guided, low-friction flow for first-time users.
- Keep one primary action visible at a time.
- Surface missing context as questions or open decisions rather than blocking progress.

## 16. AI / Automation Requirements, if applicable

- AI-generated content should preserve source-note context and distinguish assumptions from facts.
- Generated language should be editable and exportable as Markdown.
- If external research or AI providers are added later, users must opt in before sensitive note context is sent externally.

## 17. Risks and Tradeoffs

${answerValue('risks', formatBulletList(['Requirements may be incomplete because the source notes do not answer every PRD question.', 'A polished draft may make assumptions look more certain than they are.', 'Scope can expand if out-of-scope boundaries are not confirmed.']))}

## 18. Assumptions

${formatBulletList(brief.assumptions.length > 0 ? brief.assumptions : ['Stakeholders will review and refine this generated PRD before implementation.', 'The MVP should prioritize the core workflow before integrations and advanced automation.'])}

## 19. Open Questions

${formatBulletList(
  [
    ...brief.unknowns,
    ...openAnswers.map(answer => getQuestionText(session.questions, answer.questionId)),
  ].filter(Boolean)
)}

## 20. Decision Log

${formatDecisionLog(acceptedAnswers, session.questions)}

## 21. Suggested Next Steps

- Review this PRD with the client or stakeholder group.
- Confirm open questions and out-of-scope boundaries.
- Convert functional requirements into implementation tasks once the PRD is approved.
- Save or share the exported Markdown as the working PRD artifact.

## 22. Sources and Traceability

${formatSources(sourceNotes)}

## PRD Readiness Snapshot

- Readiness: ${getReadinessLabel(score)} (${score}%)
${readiness.map(item => `- ${statusSymbol(item.status)} ${item.label}: ${item.detail}`).join('\n')}
`;

  return markdown.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function buildSuggestedResearchQuery(brief: ProjectBrief): string {
  const rawQuery = [
    brief.projectName,
    brief.summary,
    brief.targetUsers.slice(0, 3).join(' '),
    'market product requirements best practices',
  ]
    .filter(Boolean)
    .join(' ');

  return rawQuery
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '')
    .replace(/["'`<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
    .replace(/\s+\S*$/, '')
    .trim();
}

export function buildPrdFilename(projectName: string, date = new Date()): string {
  const isoDate = date.toISOString().slice(0, 10);
  return `prd-${slugify(projectName || 'untitled-project')}-${isoDate}.md`;
}

export function markdownToNoteHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    if (trimmed === '---') {
      closeList();
      html.push('<hr>');
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
    if (bullet) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${escapeHtml(bullet[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${escapeHtml(trimmed)}</p>`);
  }

  closeList();
  return html.join('\n');
}

function splitIntoSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 20);
}

function extractListItems(text: string): string[] {
  return [...text.matchAll(/(?:^|\n)\s*[-*•]\s+(.+)/g)]
    .map(match => match[1].trim())
    .filter(item => item.length > 8 && item.length < 180);
}

function findSentences(sentences: string[], patterns: RegExp[]): string[] {
  return uniqueStrings(
    sentences.filter(sentence => patterns.some(pattern => pattern.test(sentence))).map(trimSentence)
  );
}

function findQuestions(text: string): string[] {
  return uniqueStrings(
    text
      .split(/\n+/)
      .map(line => line.trim())
      .filter(line => line.endsWith('?') && line.length > 10)
      .map(trimSentence)
  );
}

function extractTargetUsers(text: string): string[] {
  const users = new Set<string>();
  const patterns = [
    /\b(customers?|clients?|providers?|admins?|operators?|managers?|members?|teams?|users?)\b/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:users?|customers?|clients?)\b/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = (match[1] || '').toLowerCase();
      if (value && value.length > 2) users.add(capitalize(value));
    }
  }

  return Array.from(users).slice(0, 5);
}

function summarizeProject(projectName: string, sentences: string[], features: string[]): string {
  if (sentences.length > 0) {
    return trimSentence(sentences[0]);
  }

  if (features.length > 0) {
    return `${projectName} centers on ${features[0].replace(/[.]+$/, '')}.`;
  }

  return `${projectName} is a product concept generated from selected NoteChain notes.`;
}

function deriveProjectName(titles: string[], text: string): string {
  const candidateTitle = titles.find(title => title && !/^new note$/i.test(title.trim()))?.trim();
  if (candidateTitle) {
    return (
      candidateTitle
        .replace(/\b(notes?|brainstorm|ideas?|meeting|call|client)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim() || candidateTitle
    );
  }

  const projectMatch =
    /(?:project|product|app|platform|website)\s+(?:called|named|for)?\s*([A-Z][A-Za-z0-9\s-]{3,50})/.exec(
      text
    );
  return projectMatch?.[1]?.trim() || 'Untitled Project';
}

function formatUsers(users: string[]): string {
  if (users.length === 0) return 'the primary users';
  if (users.length === 1) return users[0].toLowerCase();
  return `${users.slice(0, -1).join(', ').toLowerCase()}, and ${users[users.length - 1].toLowerCase()}`;
}

function formatParagraphList(items: string[], intro: string): string {
  if (items.length === 0)
    return 'The selected notes provide initial context, but more detail should be confirmed.';
  return `${intro}\n\n${formatBulletList(items)}`;
}

function formatBulletList(items: string[]): string {
  const clean = uniqueStrings(items.map(trimSentence).filter(Boolean));
  if (clean.length === 0) return '- To confirm.';
  return clean.map(item => `- ${item}`).join('\n');
}

function formatRequirements(features: string[]): string {
  const requirements =
    features.length > 0
      ? features
      : ['Confirm and implement the core workflow described by stakeholders'];
  return requirements
    .map((feature, index) => `- FR-${String(index + 1).padStart(2, '0')}: ${trimSentence(feature)}`)
    .join('\n');
}

function formatUserStories(brief: ProjectBrief): string {
  const users = brief.targetUsers.length > 0 ? brief.targetUsers : ['User'];
  const features =
    brief.knownFeatures.length > 0
      ? brief.knownFeatures.slice(0, 4)
      : ['complete the core workflow'];

  return features
    .map((feature, index) => {
      const user = users[index % users.length];
      return `- As a ${user.toLowerCase()}, I want to ${feature.replace(/[.]+$/, '')}, so that I can get value from the MVP.\n  - Acceptance: The workflow is available, understandable, and handles success and failure states.`;
    })
    .join('\n');
}

function formatDecisionLog(answers: GuidedAnswer[], questions: GuidedQuestion[]): string {
  if (answers.length === 0) {
    return '- No guided discovery answers were accepted yet.';
  }

  return answers
    .map(answer => {
      const question = getQuestionText(questions, answer.questionId);
      return `- ${question}: ${answer.answer.trim()}`;
    })
    .join('\n');
}

function formatResearchInsights(
  researchBrief: PrdResearchBrief | undefined,
  includeResearchPlaceholder: boolean
): string {
  if (researchBrief) {
    const citations = researchBrief.citations.length
      ? `\n\nCitations:\n${researchBrief.citations
          .map(citation => `- [${citation.id}] ${citation.title} — ${citation.url}`)
          .join('\n')}`
      : '';

    return `${researchBrief.summary}${citations}`;
  }

  if (includeResearchPlaceholder) {
    return '- Light research was requested, but no external research brief is attached to this draft.';
  }

  return '- Notes-only generation was used. No external research was performed.';
}

function formatSources(notes: PrdSourceNote[]): string {
  return notes
    .map(note => {
      const text = extractPlainText(note.content);
      const excerpt = text.length > 160 ? `${text.slice(0, 157).trim()}...` : text;
      return `- ${note.title || 'Untitled note'} (${note.id}): ${excerpt || 'No text content.'}`;
    })
    .join('\n');
}

function getQuestionText(questions: GuidedQuestion[], questionId: string): string {
  return questions.find(question => question.id === questionId)?.question || questionId;
}

function trimSentence(value: string): string {
  const clean = value
    .replace(/\s+/g, ' ')
    .replace(/^[\-•*\s]+/, '')
    .trim();
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const clean = value.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }

  return result;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'untitled-project'
  );
}

function escapeYaml(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusSymbol(status: ReadinessStatus): string {
  if (status === 'strong') return '✓';
  if (status === 'partial') return '◐';
  return '○';
}
