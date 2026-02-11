// packages/ai-engine/src/rag/SuggestionEngine.ts
/**
 * Suggestion Engine for Context-Aware AI Suggestions
 * Generates intelligent suggestions based on retrieved context
 */

import { ContextRetriever } from './ContextRetriever';
import { LocalLLM } from '../llm/LocalLLM';
import {
  type SuggestionRequest,
  type SuggestionResponse,
  type Suggestion,
  type ContextItem,
  type RetrievedContext,
  DEFAULT_RAG_CONFIG,
} from './types';

/**
 * Suggestion Engine for AI-powered content suggestions
 * Privacy-first: all processing happens locally
 */
export class SuggestionEngine {
  private contextRetriever: ContextRetriever;
  private llm: LocalLLM;
  private config: typeof DEFAULT_RAG_CONFIG.suggestions;

  constructor(
    contextRetriever: ContextRetriever,
    llm: LocalLLM,
    config: Partial<typeof DEFAULT_RAG_CONFIG.suggestions> = {}
  ) {
    this.contextRetriever = contextRetriever;
    this.llm = llm;
    this.config = { ...DEFAULT_RAG_CONFIG.suggestions, ...config };
  }

  /**
   * Generate context-aware suggestions
   */
  async generateSuggestions(request: SuggestionRequest): Promise<SuggestionResponse> {
    const startTime = performance.now();

    // Retrieve relevant context
    const context = await this.retrieveContext(request);

    if (!context.hasContext) {
      return {
        suggestions: [],
        context,
        totalTime: performance.now() - startTime,
      };
    }

    // Generate suggestions based on type
    const suggestions = await this.generateSuggestionsByType(
      request,
      context,
      request.suggestionType
    );

    // Filter by confidence
    const filteredSuggestions = suggestions.filter(s => s.confidence >= this.config.minConfidence);

    const totalTime = performance.now() - startTime;

    return {
      suggestions: filteredSuggestions,
      context,
      totalTime,
    };
  }

  /**
   * Retrieve context based on request type
   */
  private async retrieveContext(request: SuggestionRequest): Promise<RetrievedContext> {
    const maxItems = request.maxSuggestions ?? this.config.maxContextItems;

    if (request.currentContext?.cursorPosition !== undefined) {
      // Position-aware retrieval
      return this.contextRetriever.retrieveContextAtPosition(
        request.currentContext.content,
        request.currentContext.cursorPosition,
        { topK: maxItems * 2 }
      );
    }

    if (request.suggestionType === 'action_items') {
      // Todo-focused retrieval
      return this.contextRetriever.retrieveContextForTodos(
        request.query ?? request.currentContext?.content ?? '',
        { topK: maxItems * 2 }
      );
    }

    // Standard context retrieval
    const query = request.query ?? this.buildQueryFromContext(request.currentContext);
    return this.contextRetriever.retrieveContext(query, { topK: maxItems * 2 });
  }

  /**
   * Build a query from current context
   */
  private buildQueryFromContext(currentContext?: SuggestionRequest['currentContext']): string {
    if (!currentContext) return '';

    const parts: string[] = [];
    if (currentContext.title) parts.push(currentContext.title);
    if (currentContext.content) {
      // Extract first 500 chars as context
      parts.push(currentContext.content.slice(0, 500));
    }

    return parts.join('. ');
  }

  /**
   * Generate suggestions based on type
   */
  private async generateSuggestionsByType(
    request: SuggestionRequest,
    context: RetrievedContext,
    type: SuggestionRequest['suggestionType']
  ): Promise<Suggestion[]> {
    switch (type) {
      case 'completion':
        return this.generateCompletionSuggestions(request, context);
      case 'related':
        return this.generateRelatedSuggestions(request, context);
      case 'action_items':
        return this.generateActionItemSuggestions(request, context);
      case 'summary':
        return this.generateSummarySuggestions(request, context);
      case 'insight':
        return this.generateInsightSuggestions(request, context);
      default:
        return [];
    }
  }

  /**
   * Generate text completion suggestions
   */
  private async generateCompletionSuggestions(
    request: SuggestionRequest,
    context: RetrievedContext
  ): Promise<Suggestion[]> {
    if (!request.currentContext?.content) return [];

    const prompt = this.buildCompletionPrompt(request.currentContext.content, context);

    try {
      const response = await this.llm.generate({
        prompt,
        maxTokens: 200,
        temperature: 0.7,
      });

      return [
        {
          id: this.generateId(),
          type: 'completion',
          content: response.text.trim(),
          confidence: this.estimateConfidence(context, response.text),
          sourceContext: context.items.slice(0, 3),
          action: {
            type: 'insert',
            payload: {
              text: response.text.trim(),
              position:
                request.currentContext.cursorPosition ?? request.currentContext.content.length,
            },
          },
          generatedAt: new Date(),
          processingTime: response.duration,
        },
      ];
    } catch {
      return [];
    }
  }

  /**
   * Build prompt for text completion
   */
  private buildCompletionPrompt(currentContent: string, context: RetrievedContext): string {
    const formattedContext = this.contextRetriever.formatContextForPrompt(context, 1500);

    return `Based on the following context from my notes, continue the text:

${formattedContext}

Current text to continue:
"""
${currentContent.slice(-500)}
"""

Continue naturally (1-3 sentences):`;
  }

  /**
   * Generate related content suggestions
   */
  private async generateRelatedSuggestions(
    request: SuggestionRequest,
    context: RetrievedContext
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Convert context items to suggestions
    for (const item of context.items.slice(0, request.maxSuggestions ?? 5)) {
      suggestions.push({
        id: this.generateId(),
        type: 'related',
        content: this.formatRelatedSuggestion(item),
        confidence: item.relevance,
        sourceContext: [item],
        action: {
          type: 'link',
          payload: {
            entityId: item.source.entityId,
            entityType: item.source.entityType,
          },
        },
        generatedAt: new Date(),
        processingTime: 0,
      });
    }

    return suggestions;
  }

  /**
   * Format a related suggestion from context item
   */
  private formatRelatedSuggestion(item: ContextItem): string {
    const parts: string[] = [];

    switch (item.type) {
      case 'note':
        parts.push(`Related note: "${item.title}"`);
        if (item.content) {
          const excerpt = item.content.slice(0, 150).replace(/\n/g, ' ');
          parts.push(excerpt + (item.content.length > 150 ? '...' : ''));
        }
        break;
      case 'todo':
        parts.push(`Related task: "${item.title}"`);
        if (item.metadata?.dueDate) {
          parts.push(`Due: ${item.metadata.dueDate.toLocaleDateString()}`);
        }
        if (item.metadata?.priority) {
          parts.push(`Priority: ${item.metadata.priority}`);
        }
        break;
      case 'pdf_excerpt':
        parts.push(`From "${item.title}"`);
        if (item.content) {
          parts.push(item.content.slice(0, 200));
        }
        break;
    }

    return parts.join('\n');
  }

  /**
   * Generate action item suggestions from notes
   */
  private async generateActionItemSuggestions(
    request: SuggestionRequest,
    context: RetrievedContext
  ): Promise<Suggestion[]> {
    const content = request.currentContext?.content ?? request.query ?? '';

    const prompt = `Extract action items from the following text. Return each action item on a new line starting with "- ".

Text:
"""
${content.slice(0, 2000)}
"""

Action items:`;

    try {
      const response = await this.llm.generate({
        prompt,
        maxTokens: 300,
        temperature: 0.3,
      });

      // Parse action items from response
      const actionItems = response.text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('- ') || line.startsWith('• '))
        .map(line => line.slice(2).trim())
        .filter(line => line.length > 10);

      return actionItems.map((item, index) => ({
        id: this.generateId(),
        type: 'action_items',
        content: item,
        confidence: 0.7 - index * 0.1, // Decreasing confidence
        sourceContext: context.items.slice(0, 2),
        action: {
          type: 'create_todo',
          payload: {
            title: item,
            description: `From: ${request.currentContext?.title ?? 'Note'}`,
          },
        },
        generatedAt: new Date(),
        processingTime: response.duration / actionItems.length,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Generate summary suggestions
   */
  private async generateSummarySuggestions(
    request: SuggestionRequest,
    context: RetrievedContext
  ): Promise<Suggestion[]> {
    const content = request.currentContext?.content ?? '';

    if (content.length < 200) return []; // Too short to summarize

    try {
      const response = await this.llm.summarize({
        text: content,
        style: 'concise',
        maxLength: 150,
      });

      return [
        {
          id: this.generateId(),
          type: 'summary',
          content: response.text,
          confidence: 0.8,
          sourceContext: context.items.slice(0, 2),
          action: {
            type: 'insert',
            payload: {
              text: `## Summary\n\n${response.text}`,
              position: 0,
            },
          },
          generatedAt: new Date(),
          processingTime: response.duration,
        },
      ];
    } catch {
      return [];
    }
  }

  /**
   * Generate insight suggestions
   */
  private async generateInsightSuggestions(
    request: SuggestionRequest,
    context: RetrievedContext
  ): Promise<Suggestion[]> {
    const content = request.currentContext?.content ?? '';

    const prompt = `Analyze the following text and provide 2-3 insights or connections. Each insight should be a single sentence.

Text:
"""
${content.slice(0, 2000)}
"""

Relevant context from my notes:
${this.contextRetriever.formatContextForPrompt(context, 1000)}

Insights:`;

    try {
      const response = await this.llm.generate({
        prompt,
        maxTokens: 250,
        temperature: 0.6,
      });

      // Parse insights from response
      const insights = response.text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 20 && !line.startsWith('Insights'))
        .slice(0, 3);

      return insights.map((insight, index) => ({
        id: this.generateId(),
        type: 'insight',
        content: insight,
        confidence: 0.75 - index * 0.05,
        sourceContext: context.items.slice(0, 3),
        action: {
          type: 'insert',
          payload: {
            text: `💡 ${insight}`,
            position: request.currentContext?.content?.length ?? 0,
          },
        },
        generatedAt: new Date(),
        processingTime: response.duration / insights.length,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Quick suggestion without LLM (for fast suggestions)
   */
  async generateQuickSuggestions(request: SuggestionRequest): Promise<SuggestionResponse> {
    const startTime = performance.now();

    const context = await this.retrieveContext(request);

    if (!context.hasContext) {
      return {
        suggestions: [],
        context,
        totalTime: performance.now() - startTime,
      };
    }

    // Generate suggestions without LLM - just based on context
    const suggestions: Suggestion[] = [];

    for (const item of context.items.slice(0, request.maxSuggestions ?? 3)) {
      if (item.relevance >= 0.6) {
        suggestions.push({
          id: this.generateId(),
          type: request.suggestionType,
          content: this.formatRelatedSuggestion(item),
          confidence: item.relevance,
          sourceContext: [item],
          action: {
            type: 'link',
            payload: {
              entityId: item.source.entityId,
              entityType: item.source.entityType,
            },
          },
          generatedAt: new Date(),
          processingTime: 0,
        });
      }
    }

    return {
      suggestions,
      context,
      totalTime: performance.now() - startTime,
    };
  }

  /**
   * Estimate confidence based on context quality and response
   */
  private estimateConfidence(context: RetrievedContext, response: string): number {
    // Base confidence on context relevance
    const avgRelevance =
      context.items.length > 0
        ? context.items.reduce((sum, item) => sum + item.relevance, 0) / context.items.length
        : 0;

    // Adjust based on response quality
    let confidence = avgRelevance;

    // Penalize very short responses
    if (response.length < 20) confidence *= 0.8;

    // Penalize responses that don't end properly
    if (!/[.!?]$/.test(response.trim())) confidence *= 0.9;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `sugg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get related notes for a given note
   */
  async getRelatedNotes(
    noteId: string,
    noteContent: string,
    noteTitle: string,
    limit: number = 5
  ): Promise<Suggestion[]> {
    const request: SuggestionRequest = {
      suggestionType: 'related',
      currentContext: { type: 'note', content: noteContent, title: noteTitle },
      maxSuggestions: limit,
    };

    const response = await this.generateQuickSuggestions(request);

    // Filter out the current note
    return response.suggestions.filter(s => s.sourceContext[0]?.source.entityId !== noteId);
  }

  /**
   * Get suggested links for a note
   */
  async getSuggestedLinks(
    content: string,
    title: string,
    limit: number = 5
  ): Promise<Suggestion[]> {
    const request: SuggestionRequest = {
      suggestionType: 'related',
      currentContext: { type: 'note', content, title },
      maxSuggestions: limit,
    };

    return (await this.generateQuickSuggestions(request)).suggestions;
  }

  /**
   * Get action items from note content
   */
  async extractActionItems(content: string, title: string): Promise<Suggestion[]> {
    const request: SuggestionRequest = {
      suggestionType: 'action_items',
      currentContext: { type: 'note', content, title },
      maxSuggestions: 10,
    };

    return (await this.generateSuggestions(request)).suggestions;
  }
}
