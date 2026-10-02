import {
  createContextGraphQuery,
  type CitedContextEntityType,
  type CitedContextSearchOptions,
  type CitedContextSearchResult,
  type ContextCitation,
} from '../graph/contextGraphQuery';

export type {
  CitedContextEntityType,
  CitedContextSearchOptions,
  CitedContextSearchResult,
  ContextCitation,
};

export async function searchCitedContext(
  input: CitedContextSearchOptions
): Promise<CitedContextSearchResult[]> {
  return createContextGraphQuery().searchCitedContext(input);
}
