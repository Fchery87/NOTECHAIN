import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

export interface EmbeddingConfig {
  modelId: string;
  dimensions?: number;
  maxLength?: number;
  normalize?: boolean;
  device?: 'cpu' | 'webgpu';
}

export interface EmbeddingRequest {
  text: string;
  batchId?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
  duration: number;
}

type ModelLoadingState = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

export interface ModelProgress {
  state: ModelLoadingState;
  progress: number;
  message: string;
  file?: string;
  loaded?: number;
  total?: number;
  error?: string;
}

export type AIErrorCode =
  | 'MODEL_NOT_LOADED'
  | 'MODEL_LOAD_ERROR'
  | 'EMBEDDING_ERROR'
  | 'INVALID_INPUT';

export class AIError extends Error {
  constructor(
    public code: AIErrorCode,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'AIError';
  }
}

const DEFAULT_CONFIG: Required<EmbeddingConfig> = {
  modelId: 'Xenova/all-MiniLM-L6-v2',
  dimensions: 384,
  maxLength: 512,
  normalize: true,
  device: 'cpu',
};

type EmbeddingTensor = {
  data?: ArrayLike<number>;
  tolist?: () => number[] | number[][];
};

type FeaturePipelineFactory = (
  task: 'feature-extraction',
  model: string,
  options: {
    device: 'cpu' | 'webgpu';
    dtype: 'q8';
    progress_callback?: (progress: unknown) => void;
  }
) => Promise<FeatureExtractionPipeline>;

const createFeaturePipeline = pipeline as unknown as FeaturePipelineFactory;

export class EmbeddingService {
  private config: Required<EmbeddingConfig>;
  private extractor: FeatureExtractionPipeline | null = null;
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

  async initialize(): Promise<void> {
    if (this.extractor) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.loadModel();
    return this.loadingPromise;
  }

  private async loadModel(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      env.allowLocalModels = false;
      env.allowRemoteModels = true;

      this.reportProgress({
        state: 'downloading',
        progress: 0,
        message: 'Loading embedding model...',
      });

      this.extractor = await createFeaturePipeline('feature-extraction', this.config.modelId, {
        device: this.config.device,
        dtype: 'q8',
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

  private handleProgressCallback(progress: unknown): void {
    if (typeof progress !== 'object' || progress === null) return;

    const p = progress as {
      status?: string;
      file?: string;
      progress?: number;
      loaded?: number;
      total?: number;
    };

    this.reportProgress({
      state: this.mapStatusToState(p.status),
      progress: p.progress ?? 0,
      message: this.getProgressMessage(p),
      file: p.file,
      loaded: p.loaded,
      total: p.total,
    });
  }

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

  private getProgressMessage(progress: { status?: string; file?: string }): string {
    if (progress.status === 'progress') {
      return `Loading ${progress.file || 'model'}...`;
    }
    if (progress.status === 'done') {
      return 'Embedding model ready';
    }
    return 'Initializing embedding model...';
  }

  private reportProgress(progress: ModelProgress): void {
    this.progressCallback?.(progress);
  }

  private getLoadedExtractor(): FeatureExtractionPipeline {
    if (!this.extractor) {
      throw new AIError('MODEL_NOT_LOADED', 'Embedding model not loaded. Call initialize() first.');
    }
    return this.extractor;
  }

  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    await this.initialize();
    const extractor = this.getLoadedExtractor();

    const startTime = performance.now();
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

    try {
      const output = (await extractor(this.truncateText(request.text), {
        pooling: 'mean',
        normalize: this.config.normalize,
      })) as EmbeddingTensor;
      const embedding = this.extractEmbedding(output);
      this.embeddingCache.set(cacheKey, embedding);

      return {
        embedding,
        dimensions: embedding.length,
        model: this.config.modelId,
        duration: Math.round(performance.now() - startTime),
      };
    } catch (error) {
      throw new AIError('EMBEDDING_ERROR', 'Failed to generate embedding', error);
    }
  }

  async generateEmbeddingsBatch(requests: EmbeddingRequest[]): Promise<EmbeddingResponse[]> {
    const results: EmbeddingResponse[] = [];
    const batchSize = 10;

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(request => this.generateEmbedding(request)));
      results.push(...batchResults);
    }

    return results;
  }

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

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  isReady(): boolean {
    return this.extractor !== null;
  }

  clearCache(): void {
    this.embeddingCache.clear();
  }

  dispose(): void {
    this.extractor = null;
    this.loadingPromise = null;
    this.clearCache();
  }

  private extractEmbedding(output: EmbeddingTensor): number[] {
    const listed = output.tolist?.();
    if (Array.isArray(listed)) {
      const first = listed[0];
      if (Array.isArray(first)) return first;
      if (typeof first === 'number') return listed as number[];
    }

    if (output.data) return Array.from(output.data, Number);

    throw new AIError('EMBEDDING_ERROR', 'Embedding model returned an unsupported output shape');
  }

  private truncateText(text: string): string {
    const maxChars = this.config.maxLength * 4;
    if (text.length <= maxChars) return text;

    const truncated = text.slice(0, maxChars);
    const lastSentence = /.*[.!?]/.exec(truncated);
    if (lastSentence && lastSentence[0].length > maxChars * 0.5) {
      return lastSentence[0].trim();
    }
    return `${truncated.trim()}...`;
  }

  private getCacheKey(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash &= hash;
    }
    return `${this.config.modelId}:${hash}`;
  }
}
