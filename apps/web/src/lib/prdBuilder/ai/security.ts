const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?(previous|above) instructions/i,
  /disregard (all )?(previous|above)/i,
  /system prompt/i,
  /developer message/i,
  /reveal.*instructions/i,
  /exfiltrate/i,
  /send.*secret/i,
  /api[_ -]?key/i,
];

export function escapeForPrompt(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```/g, '`\u200b``')
    .trim();
}

export function wrapUntrustedSource(input: { id: string; title: string; content: string }): string {
  return `<source_note id="${escapeForPrompt(input.id)}">
<title>${escapeForPrompt(input.title || 'Untitled note')}</title>
<content>
${escapeForPrompt(input.content)}
</content>
</source_note>`;
}

export function wrapUntrustedResearchBrief(input: {
  query: string;
  summary: string;
  citations: Array<{ id: string; title: string; url: string; snippet: string }>;
}): string {
  return `<external_research untrusted="true">
<query>${escapeForPrompt(input.query)}</query>
<summary>${escapeForPrompt(input.summary)}</summary>
<citations>
${input.citations
  .map(
    citation => `<citation id="${escapeForPrompt(citation.id)}">
<title>${escapeForPrompt(citation.title)}</title>
<url>${escapeForPrompt(citation.url)}</url>
<snippet>${escapeForPrompt(citation.snippet)}</snippet>
</citation>`
  )
  .join('\n')}
</citations>
</external_research>`;
}

export function detectPromptInjectionRisk(text: string): string[] {
  return PROMPT_INJECTION_PATTERNS.filter(pattern => pattern.test(text)).map(pattern =>
    pattern.source.replace(/\\/g, '')
  );
}

export function summarizePromptInjectionWarnings(
  notes: Array<{ id: string; title: string; plainText: string }>
): string[] {
  const riskyNotes = notes
    .map(note => ({ note, matches: detectPromptInjectionRisk(`${note.title}\n${note.plainText}`) }))
    .filter(result => result.matches.length > 0);

  if (riskyNotes.length === 0) return [];

  return [
    `${riskyNotes.length} selected note${riskyNotes.length === 1 ? '' : 's'} contain text that resembles AI instructions. The prompt treats note text as untrusted source material, not commands.`,
  ];
}
