const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const SECRET_PATTERN = /\b(?:sk|pk|api|key|token|secret)[-_]?[a-z0-9]{16,}\b/gi;
const WHITESPACE_PATTERN = /\s+/g;

export function sanitizeResearchQuery(input: string, maxLength = 240): string {
  const sanitized = input
    .replace(EMAIL_PATTERN, '[email]')
    .replace(UUID_PATTERN, '[id]')
    .replace(SECRET_PATTERN, '[secret]')
    .replace(/["'`<>]/g, '')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();

  if (sanitized.length <= maxLength) return sanitized;

  return sanitized
    .slice(0, maxLength)
    .replace(/\s+\S*$/, '')
    .trim();
}

export function compactForPrompt(value: string, maxLength: number): string {
  const compact = value.replace(WHITESPACE_PATTERN, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact
    .slice(0, maxLength)
    .replace(/\s+\S*$/, '')
    .trim()}…`;
}

export function hasUnexpectedResearchPayloadKeys(payload: Record<string, unknown>): boolean {
  return ['notes', 'sourceNotes', 'noteContent', 'plainText', 'content'].some(
    key => key in payload
  );
}
