import type { GeneratePrdRouteRequest, ResearchRouteRequest } from './types';
import { hasUnexpectedResearchPayloadKeys, sanitizeResearchQuery } from './sanitize';

export const PRD_AI_LIMITS = {
  maxSourceNotes: 20,
  maxSingleNoteChars: 20_000,
  maxTotalNoteChars: 80_000,
  maxTotalAnswerChars: 20_000,
  maxDeterministicMarkdownChars: 120_000,
  maxResearchQueryChars: 240,
  maxResearchSummaryChars: 4_000,
  maxResearchSnippetChars: 1_000,
  maxResearchTitleChars: 300,
  maxResearchAgeMs: 24 * 60 * 60 * 1000,
  maxBriefFieldChars: 4_000,
} as const;

function isFreshIsoTimestamp(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return false;
  const age = Date.now() - time;
  return age >= 0 && age <= PRD_AI_LIMITS.maxResearchAgeMs;
}

function isHttpsUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateGeneratePrdRequest(body: unknown): string[] {
  const errors: string[] = [];
  const request = body as Partial<GeneratePrdRouteRequest>;

  if (request.mode !== 'ai-enhanced' && request.mode !== 'ai-enhanced-with-research') {
    errors.push('Invalid AI generation mode.');
  }

  if (request.consent?.externalAi !== true) {
    errors.push('External AI consent is required.');
  }

  if (!request.brief || typeof request.brief !== 'object') {
    errors.push('Project brief is required.');
  } else if (
    typeof request.brief.projectName !== 'string' ||
    typeof request.brief.summary !== 'string' ||
    request.brief.projectName.length > PRD_AI_LIMITS.maxBriefFieldChars ||
    request.brief.summary.length > PRD_AI_LIMITS.maxBriefFieldChars ||
    !Array.isArray(request.brief.targetUsers) ||
    !Array.isArray(request.brief.knownFeatures) ||
    !Array.isArray(request.brief.assumptions) ||
    !Array.isArray(request.brief.unknowns) ||
    !Array.isArray(request.brief.sourceTitles)
  ) {
    errors.push('Project brief must include expected PRD Builder fields.');
  }

  if (!Array.isArray(request.sourceNotes) || request.sourceNotes.length === 0) {
    errors.push('At least one source note is required.');
  } else {
    if (request.sourceNotes.length > PRD_AI_LIMITS.maxSourceNotes) {
      errors.push(`At most ${PRD_AI_LIMITS.maxSourceNotes} source notes can be sent.`);
    }

    const totalChars = request.sourceNotes.reduce((sum, note) => {
      if (
        !note ||
        typeof note.id !== 'string' ||
        typeof note.title !== 'string' ||
        typeof note.plainText !== 'string'
      ) {
        errors.push('Each source note must include string id, title, and plainText fields.');
        return sum;
      }

      if (note.plainText.length > PRD_AI_LIMITS.maxSingleNoteChars) {
        errors.push(`Source note ${note.id || 'unknown'} is too large.`);
      }
      return sum + note.plainText.length;
    }, 0);

    if (totalChars > PRD_AI_LIMITS.maxTotalNoteChars) {
      errors.push('Selected source notes exceed the total AI payload limit.');
    }
  }

  if (!Array.isArray(request.answers)) {
    errors.push('Guided answers must be an array.');
  } else {
    const answerChars = request.answers.reduce((sum, answer) => {
      if (
        !answer ||
        typeof answer.questionId !== 'string' ||
        typeof answer.answer !== 'string' ||
        !['answered', 'skipped', 'open'].includes(answer.status)
      ) {
        errors.push('Each guided answer must include questionId, answer, and valid status.');
        return sum;
      }

      return sum + answer.answer.length;
    }, 0);

    if (answerChars > PRD_AI_LIMITS.maxTotalAnswerChars) {
      errors.push('Guided answers exceed the AI payload limit.');
    }
  }

  if (
    typeof request.deterministicMarkdown !== 'string' ||
    request.deterministicMarkdown.length === 0
  ) {
    errors.push('Deterministic Markdown fallback is required.');
  } else if (request.deterministicMarkdown.length > PRD_AI_LIMITS.maxDeterministicMarkdownChars) {
    errors.push('Deterministic Markdown fallback exceeds the AI payload limit.');
  }

  if (request.mode === 'ai-enhanced' && request.researchBrief) {
    errors.push('Research briefs are only accepted in AI + research mode.');
  }

  if (request.mode === 'ai-enhanced-with-research') {
    if (request.consent?.webResearch !== true) {
      errors.push('Web research consent is required for AI + research mode.');
    }

    if (
      !request.researchBrief ||
      typeof request.researchBrief.query !== 'string' ||
      sanitizeResearchQuery(request.researchBrief.query).length === 0 ||
      typeof request.researchBrief.summary !== 'string' ||
      !Array.isArray(request.researchBrief.citations) ||
      !isFreshIsoTimestamp(request.researchBrief.generatedAt)
    ) {
      errors.push('A completed fresh research brief is required for AI + research mode.');
    } else {
      if (request.researchBrief.summary.length > PRD_AI_LIMITS.maxResearchSummaryChars) {
        errors.push('Research brief summary exceeds the limit.');
      }

      if (request.researchBrief.citations.length > 5) {
        errors.push('Research brief citation count exceeds the limit.');
      }

      for (const citation of request.researchBrief.citations) {
        if (
          !citation ||
          typeof citation.id !== 'string' ||
          typeof citation.title !== 'string' ||
          citation.title.length > PRD_AI_LIMITS.maxResearchTitleChars ||
          !isHttpsUrl(citation.url) ||
          typeof citation.snippet !== 'string' ||
          citation.snippet.length > PRD_AI_LIMITS.maxResearchSnippetChars ||
          !isFreshIsoTimestamp(citation.retrievedAt)
        ) {
          errors.push(
            'Each research citation must include id, title, HTTPS url, snippet, and fresh retrievedAt timestamp.'
          );
          break;
        }
      }
    }
  }

  return errors;
}

export function validateResearchRequest(body: unknown): string[] {
  const errors: string[] = [];
  const request = body as Partial<ResearchRouteRequest> & Record<string, unknown>;

  if (hasUnexpectedResearchPayloadKeys(request)) {
    errors.push('Research requests may only include a query and consent, not note content.');
  }

  if (request.consent?.webResearch !== true) {
    errors.push('Web research consent is required.');
  }

  if (typeof request.query !== 'string' || sanitizeResearchQuery(request.query).length === 0) {
    errors.push('Research query is required.');
  }

  if (
    typeof request.query === 'string' &&
    request.query.length > PRD_AI_LIMITS.maxResearchQueryChars
  ) {
    errors.push(
      `Research query must be ${PRD_AI_LIMITS.maxResearchQueryChars} characters or fewer.`
    );
  }

  return errors;
}
