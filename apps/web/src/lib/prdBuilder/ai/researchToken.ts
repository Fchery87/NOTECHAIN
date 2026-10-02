import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ResearchBrief } from './types';

const TOKEN_VERSION = 'v1';
const MAX_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;

function getResearchTokenSecret(): string {
  const secret =
    process.env.PRD_BUILDER_RESEARCH_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') return 'notechain-dev-prd-builder-research-token';

  throw new Error('PRD Builder research token secret is not configured');
}

function canonicalizeBrief(userId: string, brief: ResearchBrief): string {
  return JSON.stringify({
    version: TOKEN_VERSION,
    userId,
    query: brief.query,
    summary: brief.summary,
    citations: brief.citations.map(citation => ({
      id: citation.id,
      title: citation.title,
      url: citation.url,
      snippet: citation.snippet,
      retrievedAt: citation.retrievedAt,
    })),
    generatedAt: brief.generatedAt,
  });
}

function sign(value: string): string {
  return createHmac('sha256', getResearchTokenSecret()).update(value).digest('base64url');
}

export function signResearchBrief(userId: string, brief: ResearchBrief): string {
  return `${TOKEN_VERSION}.${sign(canonicalizeBrief(userId, brief))}`;
}

export function verifyResearchBriefToken(
  userId: string,
  brief: ResearchBrief,
  token: string | undefined
): boolean {
  if (!token) return false;
  if (Date.now() - Date.parse(brief.generatedAt) > MAX_TOKEN_AGE_MS) return false;
  if (Date.parse(brief.generatedAt) - Date.now() > 5 * 60_000) return false;

  const expected = signResearchBrief(userId, brief);
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}
