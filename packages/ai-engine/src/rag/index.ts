// packages/ai-engine/src/rag/index.ts
/**
 * RAG (Retrieval-Augmented Generation) module
 * Context-aware suggestions with privacy-first local processing
 */

// Core RAG classes
export { VectorStore } from './VectorStore';
export { ContextRetriever } from './ContextRetriever';
export { SuggestionEngine } from './SuggestionEngine';

// RAG types
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
} from './types';

// Default configurations
export {
  DEFAULT_VECTOR_STORE_CONFIG,
  DEFAULT_CHUNK_CONFIG,
  DEFAULT_INDEXING_OPTIONS,
  DEFAULT_SEARCH_OPTIONS,
  DEFAULT_RAG_CONFIG,
} from './types';

// RAG Engine - High-level orchestrator
export { RAGEngine } from './RAGEngine';
