import {
  searchLocalIndex,
  type LocalSearchResult,
  type LocalSearchOptions,
} from './localSearchIndex';

export interface LocalAnswerCitation {
  sourceId: string;
  entityType: string;
  entityId: string;
  title: string;
  snippet: string;
  score: number;
}

export interface LocalAnswer {
  answer: string;
  citations: LocalAnswerCitation[];
}

function sentenceSplit(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9_'-]+/i)
    .map(token => token.trim())
    .filter(Boolean);
}

function pickBestSentence(result: LocalSearchResult, queryTokens: string[]): string {
  const sentences = sentenceSplit(result.content || result.snippet || result.title);
  if (sentences.length === 0) return result.snippet || result.title;

  return sentences
    .map(sentence => {
      const lower = sentence.toLowerCase();
      const score = queryTokens.reduce(
        (total, token) => total + (lower.includes(token) ? 1 : 0),
        0
      );
      return { sentence, score };
    })
    .sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length)[0].sentence;
}

export async function answerFromLocalSearch(
  userId: string,
  question: string,
  options: LocalSearchOptions = {}
): Promise<LocalAnswer> {
  const results = await searchLocalIndex(userId, question, {
    ...options,
    limit: options.limit ?? 5,
  });
  const queryTokens = tokens(question);

  if (results.length === 0) {
    return {
      answer: 'No matching local sources were found for this question.',
      citations: [],
    };
  }

  const citations: LocalAnswerCitation[] = results.map(result => ({
    sourceId: result.id,
    entityType: result.entityType,
    entityId: result.entityId,
    title: result.title,
    snippet: result.snippet,
    score: result.score,
  }));

  const evidenceSentences = results.slice(0, 3).map((result, index) => {
    const bestSentence = pickBestSentence(result, queryTokens);
    return `${bestSentence} [${index + 1}]`;
  });

  return {
    answer: evidenceSentences.join(' '),
    citations,
  };
}
