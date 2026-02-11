// packages/ai-engine/src/rag/RAGEngine.ts
/**
 * RAG Engine - High-level orchestrator for RAG operations
 * Coordinates vector storage, context retrieval, and suggestion generation
 */

import { VectorStore } from './VectorStore';
import { ContextRetriever } from './ContextRetriever';
import { SuggestionEngine } from './SuggestionEngine';
import { EmbeddingService } from '../embeddings/EmbeddingService';
import { LocalLLM } from '../llm/LocalLLM';
import {
  type VectorRecord,
  type IndexableEntity,
  type IndexingOptions,
  type SuggestionRequest,
  type SuggestionResponse,
  type RAGConfig,
  type RAGPerformanceMetrics,
  DEFAULT_RAG_CONFIG,
  DEFAULT_INDEXING_OPTIONS,
} from './types';

/**
 * RAG Engine - Main entry point for RAG operations
 * Provides high-level API for indexing content and generating suggestions
 */
export class RAGEngine {
  private vectorStore: VectorStore;
  private contextRetriever: ContextRetriever;
  private suggestionEngine: SuggestionEngine;
  private embeddingService: EmbeddingService;
  private llm: LocalLLM;
  private config: RAGConfig;
  private isInitialized = false;

  constructor(embeddingService: EmbeddingService, llm: LocalLLM, config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
    this.embeddingService = embeddingService;
    this.llm = llm;

    // Initialize components
    this.vectorStore = new VectorStore(this.config.vectorStore);
    this.contextRetriever = new ContextRetriever(this.vectorStore, embeddingService);
    this.suggestionEngine = new SuggestionEngine(
      this.contextRetriever,
      llm,
      this.config.suggestions
    );
  }

  /**
   * Initialize the RAG engine and all components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await Promise.all([
      this.vectorStore.initialize(),
      this.embeddingService.initialize(),
      this.llm.initialize(),
    ]);

    this.isInitialized = true;
  }

  /**
   * Ensure engine is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('RAGEngine not initialized. Call initialize() first.');
    }
  }

  /**
   * Index a single entity (note or todo)
   * Processes content, generates embeddings, and stores in vector DB
   */
  async indexEntity(entity: IndexableEntity): Promise<void> {
    this.ensureInitialized();

    // Skip if no decrypted content available
    if (!entity.decryptedContent) {
      return;
    }

    // Delete existing vectors for this entity (reindexing)
    await this.vectorStore.deleteByEntity(entity.data.id, entity.type);

    // Generate content to index
    const content = this.extractIndexableContent(entity);
    if (!content) return;

    // Chunk content if needed
    const chunks = this.vectorStore.chunkText(content, this.config.vectorStore.chunkConfig);

    // Process each chunk
    const records: VectorRecord[] = [];
    for (const chunk of chunks) {
      // Check cache first
      const cachedEmbedding = this.vectorStore.getCachedEmbedding(chunk.contentHash);

      let embedding: number[];
      if (cachedEmbedding) {
        embedding = cachedEmbedding;
      } else {
        // Generate embedding
        const response = await this.embeddingService.generateEmbedding({ text: chunk.text });
        embedding = response.embedding;

        // Cache the embedding
        await this.vectorStore.cacheEmbedding(
          chunk.contentHash,
          embedding,
          this.embeddingService.getConfig().modelId
        );
      }

      // Create vector record
      const record: VectorRecord = {
        id: `${entity.data.id}_chunk_${chunk.index}`,
        entityType: entity.type === 'note' ? 'note' : 'todo',
        entityId: entity.data.id,
        embedding,
        contentHash: chunk.contentHash,
        indexedAt: new Date(),
        chunkIndex: chunk.index,
        totalChunks: chunks.length,
        content: chunk.text, // Only stored in memory
        metadata: this.extractMetadata(entity),
      };

      records.push(record);
    }

    // Store all records
    await this.vectorStore.upsertBatch(records);
  }

  /**
   * Index multiple entities in batch
   */
  async indexEntities(
    entities: IndexableEntity[],
    options: Partial<IndexingOptions> = {}
  ): Promise<void> {
    this.ensureInitialized();

    const opts = { ...DEFAULT_INDEXING_OPTIONS, ...options };
    const errors: string[] = [];
    let processed = 0;

    // Report initial progress
    opts.onProgress?.({
      progress: 0,
      processed: 0,
      total: entities.length,
      errors: [],
    });

    // Process in batches
    for (let i = 0; i < entities.length; i += opts.batchSize) {
      const batch = entities.slice(i, i + opts.batchSize);

      await Promise.all(
        batch.map(async entity => {
          try {
            opts.onProgress?.({
              progress: (processed / entities.length) * 100,
              processed,
              total: entities.length,
              currentItem:
                entity.type === 'note'
                  ? (entity.decryptedContent?.title ?? entity.data.id)
                  : (entity.decryptedContent?.title ?? entity.data.id),
              errors,
            });

            await this.indexEntity(entity);
            processed++;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`${entity.data.id}: ${errorMsg}`);
          }
        })
      );
    }

    // Report final progress
    opts.onProgress?.({
      progress: 100,
      processed,
      total: entities.length,
      errors,
    });
  }

  /**
   * Delete an entity from the index
   */
  async deleteEntity(entityId: string, entityType?: string): Promise<void> {
    this.ensureInitialized();
    await this.vectorStore.deleteByEntity(entityId, entityType);
  }

  /**
   * Generate context-aware suggestions
   */
  async generateSuggestions(request: SuggestionRequest): Promise<SuggestionResponse> {
    this.ensureInitialized();
    return this.suggestionEngine.generateSuggestions(request);
  }

  /**
   * Generate quick suggestions (no LLM, faster)
   */
  async generateQuickSuggestions(request: SuggestionRequest): Promise<SuggestionResponse> {
    this.ensureInitialized();
    return this.suggestionEngine.generateQuickSuggestions(request);
  }

  /**
   * Get related notes for a note
   */
  async getRelatedNotes(
    noteId: string,
    noteContent: string,
    noteTitle: string,
    limit: number = 5
  ): Promise<SuggestionResponse> {
    this.ensureInitialized();

    const suggestions = await this.suggestionEngine.getRelatedNotes(
      noteId,
      noteContent,
      noteTitle,
      limit
    );

    return {
      suggestions,
      context: {
        query: noteTitle,
        items: suggestions.flatMap(s => s.sourceContext),
        totalResults: suggestions.length,
        retrievalTime: 0,
        hasContext: suggestions.length > 0,
      },
      totalTime: 0,
    };
  }

  /**
   * Get suggested links for content
   */
  async getSuggestedLinks(
    content: string,
    title: string,
    limit: number = 5
  ): Promise<SuggestionResponse> {
    this.ensureInitialized();

    const suggestions = await this.suggestionEngine.getSuggestedLinks(content, title, limit);

    return {
      suggestions,
      context: {
        query: title,
        items: suggestions.flatMap(s => s.sourceContext),
        totalResults: suggestions.length,
        retrievalTime: 0,
        hasContext: suggestions.length > 0,
      },
      totalTime: 0,
    };
  }

  /**
   * Extract action items from content
   */
  async extractActionItems(content: string, title: string): Promise<SuggestionResponse> {
    this.ensureInitialized();

    const suggestions = await this.suggestionEngine.extractActionItems(content, title);

    return {
      suggestions,
      context: {
        query: title,
        items: suggestions.flatMap(s => s.sourceContext),
        totalResults: suggestions.length,
        retrievalTime: 0,
        hasContext: suggestions.length > 0,
      },
      totalTime: 0,
    };
  }

  /**
   * Extract indexable content from entity
   */
  private extractIndexableContent(entity: IndexableEntity): string {
    const parts: string[] = [];

    if (entity.type === 'note') {
      if (entity.decryptedContent?.title) {
        parts.push(entity.decryptedContent.title);
      }
      if (entity.decryptedContent?.content) {
        parts.push(entity.decryptedContent.content);
      }
    } else if (entity.type === 'todo') {
      if (entity.decryptedContent?.title) {
        parts.push(entity.decryptedContent.title);
      }
      if (entity.decryptedContent?.description) {
        parts.push(entity.decryptedContent.description);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Extract metadata from entity
   */
  private extractMetadata(entity: IndexableEntity): VectorRecord['metadata'] {
    const base = {
      userId: entity.data.userId,
      modifiedAt: entity.data.updatedAt.toISOString(),
    };

    if (entity.type === 'note') {
      return {
        ...base,
        title: entity.decryptedContent?.title,
        tags: entity.decryptedContent?.tags,
        notebookId: (entity.data as IndexableEntity['data'] & { notebookId?: string }).notebookId,
      };
    } else {
      const todoData = entity.data as IndexableEntity['data'] & {
        priority?: string;
        status?: string;
        dueDate?: Date;
        projectId?: string;
      };
      return {
        ...base,
        title: entity.decryptedContent?.title,
        tags: entity.decryptedContent?.tags,
        priority: todoData.priority as VectorRecord['metadata']['priority'],
        status: todoData.status as VectorRecord['metadata']['status'],
        dueDate: todoData.dueDate?.toISOString(),
        projectId: todoData.projectId,
      };
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): RAGPerformanceMetrics & { vectorStats: ReturnType<VectorStore['getStats']> } {
    const stats = this.vectorStore.getStats();

    return {
      avgSearchTime: 0, // Would need to track over time
      avgIndexingTime: 0, // Would need to track over time
      cacheHitRate:
        stats.cacheSize > 0 ? stats.cacheSize / (stats.cacheSize + stats.vectorCount) : 0,
      totalVectors: stats.vectorCount,
      memoryUsage: stats.memoryUsage,
      vectorStats: stats,
    };
  }

  /**
   * Clear all indexed data
   */
  async clear(): Promise<void> {
    this.ensureInitialized();
    await this.vectorStore.clear();
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.vectorStore.dispose();
    this.embeddingService.dispose?.();
    this.llm.dispose?.();
    this.isInitialized = false;
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get vector store instance
   */
  getVectorStore(): VectorStore {
    return this.vectorStore;
  }

  /**
   * Get context retriever instance
   */
  getContextRetriever(): ContextRetriever {
    return this.contextRetriever;
  }

  /**
   * Get suggestion engine instance
   */
  getSuggestionEngine(): SuggestionEngine {
    return this.suggestionEngine;
  }
}
