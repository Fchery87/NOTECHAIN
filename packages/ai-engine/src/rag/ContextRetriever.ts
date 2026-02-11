// packages/ai-engine/src/rag/ContextRetriever.ts
/**
 * Context Retriever for RAG
 * Retrieves relevant context from vector store for AI suggestions
 */

import { VectorStore } from './VectorStore';
import { EmbeddingService } from '../embeddings/EmbeddingService';
import {
  type VectorRecord,
  type ContextItem,
  type RetrievedContext,
  type SearchOptions,
  DEFAULT_SEARCH_OPTIONS,
} from './types';

/**
 * Context Retriever for finding relevant content
 * Optimized for privacy and performance
 */
export class ContextRetriever {
  private vectorStore: VectorStore;
  private embeddingService: EmbeddingService;

  constructor(vectorStore: VectorStore, embeddingService: EmbeddingService) {
    this.vectorStore = vectorStore;
    this.embeddingService = embeddingService;
  }

  /**
   * Retrieve context for a query
   * Performs semantic search and converts results to context items
   */
  async retrieveContext(
    query: string,
    options: Partial<SearchOptions> = {}
  ): Promise<RetrievedContext> {
    const startTime = performance.now();

    // Generate query embedding
    const embeddingResponse = await this.embeddingService.generateEmbedding({ text: query });
    const queryEmbedding = embeddingResponse.embedding;

    // Search vector store
    const searchOptions = { ...DEFAULT_SEARCH_OPTIONS, ...options };
    const results = await this.vectorStore.search(queryEmbedding, searchOptions);

    // Convert to context items
    const contextItems = results.map(result =>
      this.vectorRecordToContextItem(result.record, result.score)
    );

    const retrievalTime = performance.now() - startTime;

    return {
      query,
      items: contextItems,
      totalResults: results.length,
      retrievalTime,
      hasContext: contextItems.length > 0,
    };
  }

  /**
   * Retrieve context for the current note being edited
   * Finds related content based on the note's text
   */
  async retrieveContextForNote(
    currentContent: string,
    currentTitle?: string,
    options: Partial<SearchOptions> = {}
  ): Promise<RetrievedContext> {
    // Create a rich query from current content and title
    const query = this.buildContextQuery(currentContent, currentTitle);
    return this.retrieveContext(query, options);
  }

  /**
   * Retrieve context for todo-related suggestions
   * Focuses on high-priority and upcoming todos
   */
  async retrieveContextForTodos(
    query: string,
    options: Partial<SearchOptions> = {}
  ): Promise<RetrievedContext> {
    const searchOptions: Partial<SearchOptions> = {
      ...options,
      entityTypes: ['todo'],
      topK: options.topK ?? 15, // Get more todos for filtering
    };

    const context = await this.retrieveContext(query, searchOptions);

    // Prioritize todos by due date and priority
    context.items.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aWeight =
        priorityWeight[(a.metadata?.priority as keyof typeof priorityWeight) ?? 'low'];
      const bWeight =
        priorityWeight[(b.metadata?.priority as keyof typeof priorityWeight) ?? 'low'];

      // Sort by priority first, then by due date
      if (aWeight !== bWeight) return bWeight - aWeight;

      const aDue = a.metadata?.dueDate ? new Date(a.metadata.dueDate).getTime() : Infinity;
      const bDue = b.metadata?.dueDate ? new Date(b.metadata.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });

    // Limit to topK after sorting
    const finalTopK = options.topK ?? DEFAULT_SEARCH_OPTIONS.topK;
    context.items = context.items.slice(0, finalTopK);

    return context;
  }

  /**
   * Retrieve context based on cursor position in text
   * Focuses on the sentence/paragraph around the cursor
   */
  async retrieveContextAtPosition(
    content: string,
    cursorPosition: number,
    options: Partial<SearchOptions> = {}
  ): Promise<RetrievedContext> {
    // Extract context around cursor
    const localContext = this.extractLocalContext(content, cursorPosition);

    // Build query from local context
    const query = this.buildContextQuery(localContext);

    return this.retrieveContext(query, {
      ...options,
      topK: options.topK ?? 5, // Fewer results for focused context
    });
  }

  /**
   * Retrieve cross-references for a note
   * Finds semantically similar notes and related todos
   */
  async retrieveCrossReferences(
    noteContent: string,
    noteTitle: string,
    noteId: string,
    options: Partial<SearchOptions> = {}
  ): Promise<RetrievedContext> {
    const searchOptions: Partial<SearchOptions> = {
      ...options,
      topK: options.topK ?? 10,
    };

    const context = await this.retrieveContextForNote(noteContent, noteTitle, searchOptions);

    // Filter out the current note
    context.items = context.items.filter(item => item.source.entityId !== noteId);

    return context;
  }

  /**
   * Build a contextual query from content and title
   */
  private buildContextQuery(content: string, title?: string): string {
    // Extract key phrases from content
    const keyPhrases = this.extractKeyPhrases(content);

    // Combine title and key phrases
    const parts: string[] = [];
    if (title) parts.push(title);
    parts.push(...keyPhrases.slice(0, 5)); // Top 5 key phrases

    // If we don't have enough, add the beginning of content
    if (parts.length < 3 && content.length > 100) {
      const firstSentence = content.slice(0, 200).split(/[.!?]/)[0];
      if (firstSentence.length > 50) {
        parts.push(firstSentence);
      }
    }

    return parts.join('. ');
  }

  /**
   * Extract key phrases from text using simple heuristics
   */
  private extractKeyPhrases(text: string): string[] {
    // Remove common stop words and extract potential key phrases
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'can',
      'need',
      'dare',
      'ought',
      'used',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'among',
      'and',
      'but',
      'or',
      'yet',
      'so',
      'if',
      'because',
      'although',
      'though',
      'while',
      'where',
      'when',
      'that',
      'which',
      'who',
      'whom',
      'whose',
      'what',
      'this',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'me',
      'him',
      'her',
      'us',
      'them',
      'my',
      'your',
      'his',
      'its',
      'our',
      'their',
      'mine',
      'yours',
      'hers',
      'ours',
      'theirs',
    ]);

    // Extract words and count frequencies
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    const wordFreq = new Map<string, number>();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    }

    // Get top words
    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Extract phrases containing top words
    const phrases: string[] = [];
    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences.slice(0, 10)) {
      // Check first 10 sentences
      const lowerSentence = sentence.toLowerCase();
      for (const word of topWords.slice(0, 5)) {
        if (lowerSentence.includes(word) && sentence.trim().length > 20) {
          phrases.push(sentence.trim());
          break;
        }
      }
    }

    return phrases.length > 0 ? phrases : topWords;
  }

  /**
   * Extract local context around cursor position
   */
  private extractLocalContext(content: string, cursorPosition: number): string {
    // Get surrounding paragraph or sentence
    const beforeCursor = content.slice(0, cursorPosition);
    const afterCursor = content.slice(cursorPosition);

    // Find paragraph boundaries
    const paragraphStart = beforeCursor.lastIndexOf('\n\n') + 2;
    const paragraphEnd = afterCursor.indexOf('\n\n');

    let context: string;
    if (paragraphEnd !== -1) {
      context = beforeCursor.slice(paragraphStart) + afterCursor.slice(0, paragraphEnd);
    } else {
      // Fall back to sentence
      const sentenceStart = Math.max(
        beforeCursor.lastIndexOf('. ') + 2,
        beforeCursor.lastIndexOf('! ') + 2,
        beforeCursor.lastIndexOf('? ') + 2,
        paragraphStart
      );
      const sentenceEnd = afterCursor.search(/[.!?]/);
      context =
        beforeCursor.slice(sentenceStart) +
        afterCursor.slice(0, sentenceEnd !== -1 ? sentenceEnd + 1 : undefined);
    }

    return context.trim();
  }

  /**
   * Convert a vector record to a context item
   */
  private vectorRecordToContextItem(record: VectorRecord, score: number): ContextItem {
    const { metadata, entityType, entityId, chunkIndex, content } = record;

    return {
      type: entityType === 'pdf_chunk' ? 'pdf_excerpt' : entityType,
      id: record.id,
      title: metadata.title ?? 'Untitled',
      content: content ?? '',
      relevance: score,
      source: {
        entityId,
        entityType,
        chunkIndex: chunkIndex > 0 ? chunkIndex : undefined,
      },
      metadata: {
        tags: metadata.tags,
        dueDate: metadata.dueDate ? new Date(metadata.dueDate) : undefined,
        priority: metadata.priority,
        status: metadata.status,
      },
    };
  }

  /**
   * Get all context items for a specific entity
   */
  getEntityContext(entityId: string, entityType?: string): ContextItem[] {
    const records = this.vectorStore.getByEntity(entityId, entityType);
    return records.map(record => this.vectorRecordToContextItem(record, 1.0));
  }

  /**
   * Filter context items by relevance threshold
   */
  filterByRelevance(context: RetrievedContext, minRelevance: number): RetrievedContext {
    return {
      ...context,
      items: context.items.filter(item => item.relevance >= minRelevance),
      hasContext: context.items.some(item => item.relevance >= minRelevance),
    };
  }

  /**
   * Merge multiple context results
   */
  mergeContexts(...contexts: RetrievedContext[]): RetrievedContext {
    const seenIds = new Set<string>();
    const mergedItems: ContextItem[] = [];

    for (const context of contexts) {
      for (const item of context.items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          mergedItems.push(item);
        }
      }
    }

    // Sort by relevance
    mergedItems.sort((a, b) => b.relevance - a.relevance);

    return {
      query: contexts.map(c => c.query).join(' | '),
      items: mergedItems,
      totalResults: mergedItems.length,
      retrievalTime: contexts.reduce((sum, c) => sum + c.retrievalTime, 0),
      hasContext: mergedItems.length > 0,
    };
  }

  /**
   * Format context items for LLM prompt
   */
  formatContextForPrompt(context: RetrievedContext, maxLength: number = 2000): string {
    if (!context.hasContext) {
      return 'No relevant context found.';
    }

    const parts: string[] = [];
    let currentLength = 0;

    for (const item of context.items) {
      const formatted = this.formatContextItem(item);
      if (currentLength + formatted.length > maxLength) {
        break;
      }
      parts.push(formatted);
      currentLength += formatted.length;
    }

    return parts.join('\n\n---\n\n');
  }

  /**
   * Format a single context item
   */
  private formatContextItem(item: ContextItem): string {
    const lines: string[] = [];

    lines.push(`[${item.type.toUpperCase()}] ${item.title}`);

    if (item.metadata?.tags && item.metadata.tags.length > 0) {
      lines.push(`Tags: ${item.metadata.tags.join(', ')}`);
    }

    if (item.metadata?.dueDate) {
      lines.push(`Due: ${item.metadata.dueDate.toLocaleDateString()}`);
    }

    lines.push('');
    lines.push(item.content.slice(0, 500)); // Limit content length

    return lines.join('\n');
  }
}
