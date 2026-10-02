import { getResearchProvider } from './providers';
import { sanitizeResearchQuery } from './sanitize';
import type { ResearchBrief, ResearchInput } from './types';

export async function runPrdResearch(input: ResearchInput): Promise<ResearchBrief> {
  const provider = getResearchProvider();
  return provider.search({ ...input, query: sanitizeResearchQuery(input.query) });
}
