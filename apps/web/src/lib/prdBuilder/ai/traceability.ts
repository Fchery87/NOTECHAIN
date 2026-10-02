import { REQUIRED_PRD_HEADINGS } from './prompt';
import type { GeneratePrdAiInput, GeneratePrdAiResult } from './types';

export function ensurePrdTraceability(markdown: string, input: GeneratePrdAiInput): string {
  const warnings: string[] = [];
  let nextMarkdown = markdown.trim();

  for (const heading of REQUIRED_PRD_HEADINGS) {
    if (!nextMarkdown.includes(heading)) {
      warnings.push(`AI output was missing required heading: ${heading}`);
      nextMarkdown += `\n\n${heading}\n\n_To be completed during stakeholder review._`;
    }
  }

  const sourceLines = input.sourceNotes.map(
    note => `- [${note.id}] ${note.title || 'Untitled note'}`
  );
  const citationLines =
    input.researchBrief?.citations.map(
      citation => `- [${citation.id}] ${citation.title} — ${citation.url}`
    ) ?? [];

  if (!/## 22\. Sources and Traceability/i.test(nextMarkdown)) {
    nextMarkdown += '\n\n## 22. Sources and Traceability\n';
  }

  if (!/### Source Notes/i.test(nextMarkdown)) {
    nextMarkdown += `\n\n### Source Notes\n${sourceLines.join('\n') || '- None provided.'}`;
  }

  if (input.researchBrief && !/### External Research/i.test(nextMarkdown)) {
    nextMarkdown += `\n\n### External Research\n${citationLines.join('\n') || '- No citations returned.'}`;
  }

  if (!/### AI Generation Notice/i.test(nextMarkdown)) {
    nextMarkdown += `\n\n### AI Generation Notice\n- This PRD was enhanced by an external AI provider after explicit user consent. Unsupported claims should be treated as assumptions until verified.`;
  }

  return `${nextMarkdown.trim()}\n`;
}

export function buildAiResult(
  markdown: string,
  input: GeneratePrdAiInput,
  provider: string,
  model: string,
  warnings: string[] = []
): GeneratePrdAiResult {
  const traceableMarkdown = ensurePrdTraceability(markdown, input);

  return {
    markdown: traceableMarkdown,
    provider,
    model,
    generatedAt: new Date().toISOString(),
    warnings,
    traceability: {
      sourceNoteIds: input.sourceNotes.map(note => note.id),
      researchCitationUrls: input.researchBrief?.citations.map(citation => citation.url) ?? [],
    },
  };
}
