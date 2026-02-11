// packages/ai-engine/src/index.ts
/**
 * AI Engine for NoteChain
 * Privacy-first local LLM integration and embedding services
 */

// Core exports
export { LocalLLM } from './llm/LocalLLM';
export { EmbeddingService } from './embeddings/EmbeddingService';

// RAG (Retrieval-Augmented Generation) exports
export {
  // Core RAG classes
  VectorStore,
  ContextRetriever,
  SuggestionEngine,
  RAGEngine,

  // RAG default configurations
  DEFAULT_VECTOR_STORE_CONFIG,
  DEFAULT_CHUNK_CONFIG,
  DEFAULT_INDEXING_OPTIONS,
  DEFAULT_SEARCH_OPTIONS,
  DEFAULT_RAG_CONFIG,
} from './rag';

// RAG type exports
export type {
  // Vector store types
  VectorRecord,
  VectorSearchResult,
  VectorStoreConfig,
  VectorMetadata,

  // Context types
  ContextItem,
  RetrievedContext,

  // Suggestion types
  SuggestionRequest,
  SuggestionResponse,
  Suggestion,

  // Chunking types
  ChunkConfig,
  ContentChunk,

  // Indexing types
  IndexingProgress,
  IndexingOptions,
  IndexableEntity,

  // Search types
  SearchOptions,

  // Cache types
  EmbeddingCacheEntry,

  // Configuration types
  RAGConfig,
  RAGPerformanceMetrics,
} from './rag';

// Type exports
export type {
  // Configuration types
  LocalLLMConfig,
  EmbeddingConfig,
  AIEngineOptions,

  // Request types
  GenerationRequest,
  SummarizationRequest,
  EmbeddingRequest,
  SemanticSearchRequest,

  // Response types
  GenerationResponse,
  EmbeddingResponse,
  SemanticSearchResult,
  GenerationChunk,

  // Data types
  NoteContent,
  ProcessedNote,
  ModelProgress,

  // Utility types
  ModelLoadingState,
  AIErrorCode,
  GenerationCallback,
} from './types';

// Error class export
export { AIError } from './types';

// Version
export const VERSION = '0.1.0';
