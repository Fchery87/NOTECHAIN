// packages/ai-engine/src/types.ts
/**
 * Type definitions for AI Engine
 * Privacy-first local LLM integration for NoteChain
 */

/**
 * Model loading states for progress tracking
 */
export type ModelLoadingState = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

/**
 * Configuration for local LLM operations
 */
export interface LocalLLMConfig {
  /** Model identifier from Hugging Face or local path */
  modelId: string;
  /** Whether to use quantized model for better performance */
  quantized?: boolean;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Temperature for sampling (0.0 - 1.0) */
  temperature?: number;
  /** Top-p sampling parameter */
  topP?: number;
  /** Enable progress callbacks */
  enableProgress?: boolean;
  /** Device to run on ('cpu' | 'webgpu' - if available) */
  device?: 'cpu' | 'webgpu';
}

/**
 * Configuration for embedding generation
 */
export interface EmbeddingConfig {
  /** Embedding model identifier */
  modelId: string;
  /** Dimensionality of embeddings */
  dimensions?: number;
  /** Maximum sequence length */
  maxLength?: number;
  /** Whether to normalize embeddings */
  normalize?: boolean;
  /** Device to run on */
  device?: 'cpu' | 'webgpu';
}

/**
 * Request for text generation
 */
export interface GenerationRequest {
  /** Input prompt text */
  prompt: string;
  /** System instructions/context */
  systemPrompt?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for sampling */
  temperature?: number;
  /** Top-p sampling */
  topP?: number;
  /** Stop sequences */
  stopSequences?: string[];
}

/**
 * Response from text generation
 */
export interface GenerationResponse {
  /** Generated text */
  text: string;
  /** Tokens generated */
  tokensGenerated: number;
  /** Time taken in milliseconds */
  duration: number;
  /** Whether generation was truncated */
  truncated: boolean;
}

/**
 * Request for text summarization
 */
export interface SummarizationRequest {
  /** Text to summarize */
  text: string;
  /** Desired summary length */
  maxLength?: number;
  /** Minimum summary length */
  minLength?: number;
  /** Summary style */
  style?: 'concise' | 'detailed' | 'bullet-points';
}

/**
 * Request for embedding generation
 */
export interface EmbeddingRequest {
  /** Text to embed */
  text: string;
  /** Batch processing ID for tracking */
  batchId?: string;
}

/**
 * Response from embedding generation
 */
export interface EmbeddingResponse {
  /** Generated embedding vector */
  embedding: number[];
  /** Dimensionality */
  dimensions: number;
  /** Model used */
  model: string;
  /** Processing time in milliseconds */
  duration: number;
}

/**
 * Progress information for model loading
 */
export interface ModelProgress {
  /** Current loading state */
  state: ModelLoadingState;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current operation description */
  message: string;
  /** File being loaded (if applicable) */
  file?: string;
  /** Bytes loaded */
  loaded?: number;
  /** Total bytes */
  total?: number;
  /** Error message if state is 'error' */
  error?: string;
}

/**
 * Note content for AI processing
 */
export interface NoteContent {
  /** Note ID */
  id: string;
  /** Note title */
  title?: string;
  /** Note content/body */
  content: string;
  /** Tags associated with note */
  tags?: string[];
  /** Last modified timestamp */
  modifiedAt: Date;
}

/**
 * Processed note with embeddings
 */
export interface ProcessedNote extends NoteContent {
  /** Content embedding vector */
  contentEmbedding?: number[];
  /** Title embedding vector */
  titleEmbedding?: number[];
  /** Processing timestamp */
  processedAt: Date;
}

/**
 * Search request using embeddings
 */
export interface SemanticSearchRequest {
  /** Query text */
  query: string;
  /** Number of results to return */
  topK?: number;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Filter by tags */
  tagFilter?: string[];
}

/**
 * Search result from semantic search
 */
export interface SemanticSearchResult {
  /** Note that matched */
  note: ProcessedNote;
  /** Similarity score (0-1) */
  score: number;
  /** Matching text excerpt */
  excerpt?: string;
}

/**
 * AI Engine initialization options
 */
export interface AIEngineOptions {
  /** LLM configuration */
  llm?: LocalLLMConfig;
  /** Embedding configuration */
  embedding?: EmbeddingConfig;
  /** Progress callback */
  onProgress?: (progress: ModelProgress) => void;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Error types specific to AI operations
 */
export type AIErrorCode =
  | 'MODEL_NOT_LOADED'
  | 'MODEL_LOAD_ERROR'
  | 'GENERATION_ERROR'
  | 'EMBEDDING_ERROR'
  | 'INVALID_INPUT'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED';

/**
 * AI operation error
 */
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

/**
 * Streaming generation chunk
 */
export interface GenerationChunk {
  /** Text chunk */
  text: string;
  /** Whether this is the final chunk */
  done: boolean;
}

/**
 * Callback for streaming generation
 */
export type GenerationCallback = (chunk: GenerationChunk) => void | Promise<void>;
