// packages/ai-engine/src/embeddings/EmbeddingService.ts
/**
 * Text embedding generation service using Xenova Transformers.js
 * Privacy-first local embedding generation for semantic search
 */

import { pipeline, type FeatureExtractionPipeline, env } from '@xenova/transformers';
import {
  type EmbeddingConfig,
  type EmbeddingRequest,
  type EmbeddingResponse,
  type ModelProgress,
  AIError,
} from '../types';

// Configure transformers.js
env.allowLocalModels = true;
env.allowRemoteModels = true;

/**
 * Default configuration for embeddings
 * Using all-MiniLM-L6-v2 for good balance of quality and speed
 */
const DEFAULT_CONFIG: Required<EmbeddingConfig> = {
  modelId: 'Xenova/all-MiniLM-L6-v2',
  dimensions: 384,
  maxLength: 512,
  normalize: true,
  device: 'cpu',
};

/**
 * Service for generating text embeddings locally
 * Supports single and batch processing with progress tracking
 */
export class EmbeddingService {
  private config: Required<EmbeddingConfig>;
  private pipeline: FeatureExtractionPipeline | null = null;
  private isLoading = false;
  private loadingPromise: Promise<void> | null = null;
  private progressCallback?: (progress: ModelProgress) => void;
  private embeddingCache = new Map<string, number[]>();

  constructor(
    config: EmbeddingConfig = DEFAULT_CONFIG,
    onProgress?: (progress: ModelProgress) => void
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.progressCallback = onProgress;
  }

  /**
   * Initialize and load the embedding model
   */
  async initialize(): Promise<void> {
    if (this.pipeline) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.loadModel();
    return this.loadingPromise;
  }

  /**
   * Load the feature extraction model
   */
  private async loadModel(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      this.reportProgress({
        state: 'downloading',
        progress: 0,
        message: 'Loading embedding model...',
      });

      this.pipeline = await pipeline('feature-extraction', this.config.modelId, {
        quantized: true, // Always use quantized for embeddings
        progress_callback: (progress: unknown) => {
          this.handleProgressCallback(progress);
        },
      });

      this.reportProgress({
        state: 'ready',
        progress: 100,
        message: 'Embedding model loaded',
      });
    } catch (error) {
      this.reportProgress({
        state: 'error',
        progress: 0,
        message: 'Failed to load embedding model',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AIError('MODEL_LOAD_ERROR', 'Failed to load embedding model', error);
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  /**
   * Handle progress callbacks from transformers.js
   */
  private handleProgressCallback(progress: unknown): void {
    if (typeof progress !== 'object' || progress === null) return;

    const p = progress as {
      status?: string;
      file?: string;
      progress?: number;
      loaded?: number;
      total?: number;
    };

    const modelProgress: ModelProgress = {
      state: this.mapStatusToState(p.status),
      progress: p.progress ?? 0,
      message: this.getProgressMessage(p),
      file: p.file,
      loaded: p.loaded,
      total: p.total,
    };

    this.reportProgress(modelProgress);
  }

  /**
   * Map transformers.js status to our state enum
   */
  private mapStatusToState(status?: string): ModelProgress['state'] {
    switch (status) {
      case 'progress':
        return 'loading';
      case 'done':
        return 'ready';
      case 'error':
        return 'error';
      default:
        return 'downloading';
    }
  }

  /**
   * Get human-readable progress message
   */
  private getProgressMessage(progress: { status?: string; file?: string }): string {
    if (progress.status === 'progress') {
      return `Loading ${progress.file || 'model'}...`;
    }
    if (progress.status === 'done') {
      return 'Embedding model ready';
    }
    return 'Initializing embedding model...';
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: ModelProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Ensure model is loaded before operations
   */
  private ensureModelLoaded(): void {
    if (!this.pipeline) {
      throw new AIError('MODEL_NOT_LOADED', 'Embedding model not loaded. Call initialize() first.');
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    await this.initialize();
    this.ensureModelLoaded();

    const startTime = performance.now();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(request.text);
      const cached = this.embeddingCache.get(cacheKey);
      if (cached) {
        return {
          embedding: cached,
          dimensions: cached.length,
          model: this.config.modelId,
          duration: 0,
        };
      }

      // Truncate text if too long
      const text = this.truncateText(request.text);

      // Generate embedding
      const output = await this.pipeline!(text, {
        pooling: 'mean',
        normalize: this.config.normalize,
      });

      // Extract embedding vector
      const embedding = Array.from(output.data as Float32Array);

      // Cache the result
      this.embeddingCache.set(cacheKey, embedding);

      const duration = performance.now() - startTime;

      return {
        embedding,
        dimensions: embedding.length,
        model: this.config.modelId,
        duration: Math.round(duration),
      };
    } catch (error) {
      throw new AIError('EMBEDDING_ERROR', 'Failed to generate embedding', error);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(requests: EmbeddingRequest[]): Promise<EmbeddingResponse[]> {
    await this.initialize();
    this.ensureModelLoaded();

    const results: EmbeddingResponse[] = [];

    // Process in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(request => this.generateEmbedding(request)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Truncate text to max length while preserving meaning
   */
  private truncateText(text: string): string {
    // Rough estimate: ~4 characters per token
    const maxChars = this.config.maxLength * 4;

    if (text.length <= maxChars) {
      return text;
    }

    // Try to truncate at a sentence boundary
    const truncated = text.slice(0, maxChars);
    const lastSentence = truncated.match(/.*[.!?]/s);

    if (lastSentence && lastSentence[0].length > maxChars * 0.5) {
      return lastSentence[0].trim();
    }

    return truncated.trim() + '...';
  }

  /**
   * Generate cache key for text
   */
  private getCacheKey(text: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `${this.config.modelId}:${hash}`;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new AIError('INVALID_INPUT', 'Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Find most similar embeddings from a collection
   */
  findMostSimilar(
    query: number[],
    candidates: Array<{ id: string; embedding: number[] }>,
    topK: number = 5
  ): Array<{ id: string; score: number }> {
    const scores = candidates.map(candidate => ({
      id: candidate.id,
      score: this.cosineSimilarity(query, candidate.embedding),
    }));

    // Sort by score descending and take top K
    return scores.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.embeddingCache.size;
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.pipeline !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<EmbeddingConfig> {
    return { ...this.config };
  }

  /**
   * Dispose of model and clear cache
   */
  dispose(): void {
    this.pipeline = null;
    this.loadingPromise = null;
    this.clearCache();
  }
}
