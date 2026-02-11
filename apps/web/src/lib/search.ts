import { listNotes } from '../lib/db';
import { listTodos } from '../lib/db';

/**
 * SearchResult represents a single search result
 */
export interface SearchResult {
  id: string;
  type: 'note' | 'todo';
  title: string;
  content?: string;
  score: number;
  highlights: string[];
}

/**
 * SearchOptions configures search behavior
 */
export interface SearchOptions {
  query: string;
  types?: ('note' | 'todo')[];
  folderId?: string;
  limit?: number;
}

/**
 * Fuzzy match score calculation
 * Returns 0-100 based on match quality
 */
function calculateScore(query: string, text: string, title: boolean): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match in title = 100 points
  if (title && textLower === queryLower) {
    return 100;
  }

  // Exact match in content = 90 points
  if (!title && textLower === queryLower) {
    return 90;
  }

  // Contains full query in title = 80 points
  if (title && textLower.includes(queryLower)) {
    return 80;
  }

  // Contains full query in content = 70 points
  if (!title && textLower.includes(queryLower)) {
    return 70;
  }

  // Query words match (fuzzy) = 50-69 points
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  const textWords = textLower.split(/\s+/).filter(w => w.length > 0);

  const matchedWords = queryWords.filter(word =>
    textWords.some(textWord => textWord.includes(word))
  );

  const matchPercentage = (matchedWords.length / queryWords.length) * 100;
  return Math.max(0, Math.min(69, Math.floor(matchPercentage)));
}

/**
 * Generates highlighted text with search query matches wrapped in <mark>
 */
function generateHighlights(text: string, query: string): string[] {
  const queryLower = query.toLowerCase();

  const highlights: string[] = [];
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

  for (const word of queryWords) {
    const regex = new RegExp(`(${word})`, 'gi');
    const matches = text.match(regex);

    if (matches) {
      highlights.push(...matches);
    }
  }

  return highlights;
}

/**
 * Searches across all content types
 * @param options Search configuration
 * @returns Array of search results sorted by score
 */
export async function search(options: SearchOptions): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const types = options.types || ['note', 'todo'];

  // Search notes
  if (types.includes('note')) {
    const notes = await listNotes(options.folderId);

    for (const note of notes) {
      const titleScore = calculateScore(options.query, note.title, true);
      const contentScore = note.content ? calculateScore(options.query, note.content, false) : 0;

      const maxScore = Math.max(titleScore, contentScore);

      if (maxScore > 0) {
        const titleHighlights = titleScore > 0 ? generateHighlights(note.title, options.query) : [];

        const contentHighlights =
          contentScore > 0 && note.content ? generateHighlights(note.content, options.query) : [];

        results.push({
          id: note.id!,
          type: 'note',
          title: note.title,
          content: note.content,
          score: maxScore,
          highlights: [...titleHighlights, ...contentHighlights],
        });
      }
    }
  }

  // Search todos
  if (types.includes('todo')) {
    const todos = await listTodos();

    for (const todo of todos) {
      const titleScore = calculateScore(options.query, todo.title, true);
      const descriptionScore = todo.description
        ? calculateScore(options.query, todo.description, false)
        : 0;

      const maxScore = Math.max(titleScore, descriptionScore);

      if (maxScore > 0) {
        const titleHighlights = titleScore > 0 ? generateHighlights(todo.title, options.query) : [];

        const descriptionHighlights =
          descriptionScore > 0 && todo.description
            ? generateHighlights(todo.description, options.query)
            : [];

        results.push({
          id: todo.id!,
          type: 'todo',
          title: todo.title,
          content: todo.description,
          score: maxScore,
          highlights: [...titleHighlights, ...descriptionHighlights],
        });
      }
    }
  }

  // Sort by score (descending) and limit results
  const sortedResults = results.sort((a, b) => b.score - a.score).slice(0, options.limit || 50);

  return sortedResults;
}

/**
 * Search suggestions for autocomplete
 * @param query Partial search query
 * @param limit Max number of suggestions
 * @returns Array of suggestion strings
 */
export async function getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
  const results = await search({ query, limit });

  // Extract unique titles as suggestions
  const suggestions = new Set<string>();
  for (const result of results) {
    if (suggestions.size >= limit) break;
    suggestions.add(result.title);
  }

  return Array.from(suggestions);
}
