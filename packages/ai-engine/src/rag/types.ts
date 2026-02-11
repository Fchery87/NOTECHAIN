// packages/ai-engine/src/rag/types.ts
/**
 * RAG (Retrieval-Augmented Generation) type definitions
 * Context-aware suggestions with privacy-first local processing
 */

// Minimal type definitions to avoid circular dependencies
// These mirror the types from @notechain/data-models

/**
 * Note model (minimal subset needed for RAG)
 */
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  contentHash: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  notebookId?: string;
  isDeleted: boolean;
}

/**
 * Todo model (minimal subset needed for RAG)
 */
export interface Todo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  tags: string[];
  projectId?: string;
  isDeleted: boolean;
}

/**
 * Vector record stored in the vector database
 * Contains embedding and metadata for efficient retrieval
 */
export interface VectorRecord {
  /** Unique identifier for the record */
  id: string;
  /** Entity type (note, todo, pdf_chunk) */
  entityType: 'note' | 'todo' | 'pdf_chunk';
  /** Entity ID in the main database */
  entityId: string;
  /** Vector embedding (normalized) */
  embedding: number[];
  /** Content hash for cache validation */
  contentHash: string;
  /** Timestamp when indexed */
  indexedAt: Date;
  /** Chunk index for long documents (0 for non-chunked) */
  chunkIndex: number;
  /** Total chunks for this entity */
  totalChunks: number;
  /** Text content (only stored in memory, never persisted) */
  content?: string;
  /** Metadata for filtering */
  metadata: VectorMetadata;
}

/**
 * Metadata for vector records
 */
export interface VectorMetadata {
  /** User ID for multi-tenant support */
  userId: string;
  /** Entity-specific metadata */
  title?: string;
  tags?: string[];
  notebookId?: string;
  projectId?: string;
  /** Priority for todos */
  priority?: 'low' | 'medium' | 'high' | 'critical';
  /** Status for todos */
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  /** Due date for todos */
  dueDate?: string;
  /** Last modified timestamp */
  modifiedAt: string;
}

/**
 * Search result from vector similarity search
 */
export interface VectorSearchResult {
  /** The matched vector record */
  record: VectorRecord;
  /** Similarity score (0-1, higher is better) */
  score: number;
  /** Relevant text excerpt */
  excerpt?: string;
}

/**
 * Context item retrieved for suggestion generation
 */
export interface ContextItem {
  /** Content type */
  type: 'note' | 'todo' | 'pdf_excerpt';
  /** Content ID */
  id: string;
  /** Content title/subject */
  title: string;
  /** Relevant content text */
  content: string;
  /** Relevance score */
  relevance: number;
  /** Source entity reference */
  source: {
    entityId: string;
    entityType: string;
    chunkIndex?: number;
  };
  /** Contextual metadata */
  metadata?: {
    tags?: string[];
    dueDate?: Date;
    priority?: string;
    status?: string;
  };
}

/**
 * Retrieved context for AI processing
 */
export interface RetrievedContext {
  /** Query that was used for retrieval */
  query: string;
  /** Context items found */
  items: ContextItem[];
  /** Total results before filtering */
  totalResults: number;
  /** Retrieval time in milliseconds */
  retrievalTime: number;
  /** Whether context was found */
  hasContext: boolean;
}

/**
 * Suggestion request configuration
 */
export interface SuggestionRequest {
  /** Current context (e.g., note being edited) */
  currentContext?: {
    /** Entity type */
    type: 'note' | 'todo';
    /** Current text content */
    content: string;
    /** Optional title */
    title?: string;
    /** Cursor position for contextual suggestions */
    cursorPosition?: number;
  };
  /** Type of suggestion needed */
  suggestionType: 'completion' | 'related' | 'action_items' | 'summary' | 'insight';
  /** Number of suggestions to return */
  maxSuggestions?: number;
  /** Specific query for suggestion context */
  query?: string;
  /** Filter by tags */
  tagFilter?: string[];
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Generated suggestion
 */
export interface Suggestion {
  /** Unique suggestion ID */
  id: string;
  /** Suggestion type */
  type: SuggestionRequest['suggestionType'];
  /** Suggestion text/content */
  content: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Source context that informed this suggestion */
  sourceContext: ContextItem[];
  /** Action that can be taken on this suggestion */
  action?: {
    /** Action type */
    type: 'insert' | 'link' | 'create_todo' | 'navigate';
    /** Action payload */
    payload: unknown;
  };
  /** Timestamp when generated */
  generatedAt: Date;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Suggestion response
 */
export interface SuggestionResponse {
  /** Generated suggestions */
  suggestions: Suggestion[];
  /** Context used for generation */
  context: RetrievedContext;
  /** Total processing time */
  totalTime: number;
}

/**
 * Chunk configuration for document processing
 */
export interface ChunkConfig {
  /** Maximum chunk size in tokens (approximate) */
  maxChunkSize: number;
  /** Overlap between chunks in tokens */
  overlap: number;
  /** Minimum chunk size to keep */
  minChunkSize: number;
  /** Split on these characters (in order of priority) */
  splitDelimiters: string[];
}

/**
 * Default chunk configuration
 * Optimized for semantic coherence and search quality
 */
export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  maxChunkSize: 512, // ~512 tokens per chunk
  overlap: 50, // 50 token overlap for continuity
  minChunkSize: 100, // Minimum meaningful chunk
  splitDelimiters: ['\n\n', '\n', '. ', '! ', '? ', ' '],
};

/**
 * Vector store configuration
 */
export interface VectorStoreConfig {
  /** Dimensionality of embeddings */
  dimensions: number;
  /** Similarity metric */
  metric: 'cosine' | 'euclidean' | 'dot';
  /** Maximum vectors to store in memory */
  maxInMemoryVectors: number;
  /** Enable persistence to IndexedDB */
  enablePersistence: boolean;
  /** Persistence key prefix */
  persistenceKey: string;
  /** Chunk configuration */
  chunkConfig: ChunkConfig;
}

/**
 * Default vector store configuration
 */
export const DEFAULT_VECTOR_STORE_CONFIG: VectorStoreConfig = {
  dimensions: 384, // all-MiniLM-L6-v2 dimensions
  metric: 'cosine',
  maxInMemoryVectors: 10000,
  enablePersistence: true,
  persistenceKey: 'notechain_vectors',
  chunkConfig: DEFAULT_CHUNK_CONFIG,
};

/**
 * Indexing progress for batch operations
 */
export interface IndexingProgress {
  /** Current progress (0-100) */
  progress: number;
  /** Items processed */
  processed: number;
  /** Total items to process */
  total: number;
  /** Current operation */
  currentItem?: string;
  /** Errors encountered */
  errors: string[];
}

/**
 * Indexing options
 */
export interface IndexingOptions {
  /** Batch size for processing */
  batchSize: number;
  /** Progress callback */
  onProgress?: (progress: IndexingProgress) => void;
  /** Skip already indexed items (based on content hash) */
  skipExisting: boolean;
  /** Force reindex all items */
  forceReindex: boolean;
}

/**
 * Default indexing options
 */
export const DEFAULT_INDEXING_OPTIONS: IndexingOptions = {
  batchSize: 10,
  skipExisting: true,
  forceReindex: false,
};

/**
 * Search options for vector queries
 */
export interface SearchOptions {
  /** Maximum results to return */
  topK: number;
  /** Minimum similarity threshold (0-1) */
  threshold: number;
  /** Filter by entity types */
  entityTypes?: ('note' | 'todo' | 'pdf_chunk')[];
  /** Filter by metadata */
  metadataFilter?: Partial<VectorMetadata>;
  /** Include content in results */
  includeContent: boolean;
  /** Maximum time allowed for search in ms */
  timeoutMs: number;
}

/**
 * Default search options
 */
export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  topK: 10,
  threshold: 0.5,
  includeContent: true,
  timeoutMs: 100,
};

/**
 * Entity with content ready for indexing
 */
export interface IndexableEntity {
  /** Entity type */
  type: 'note' | 'todo';
  /** Entity data */
  data: Note | Todo;
  /** Decrypted content (only available in memory) */
  decryptedContent?: {
    title?: string;
    content?: string;
    description?: string;
    tags?: string[];
  };
}

/**
 * Content chunk from document processing
 */
export interface ContentChunk {
  /** Chunk text content */
  text: string;
  /** Chunk index in document */
  index: number;
  /** Total chunks in document */
  total: number;
  /** Start position in original text */
  startPosition: number;
  /** End position in original text */
  endPosition: number;
  /** Content hash for caching */
  contentHash: string;
}

/**
 * Cache entry for embeddings
 */
export interface EmbeddingCacheEntry {
  /** Content hash */
  contentHash: string;
  /** Embedding vector */
  embedding: number[];
  /** Timestamp when cached */
  cachedAt: Date;
  /** Model ID used */
  modelId: string;
}

/**
 * RAG engine configuration
 */
export interface RAGConfig {
  /** Vector store configuration */
  vectorStore: VectorStoreConfig;
  /** Search configuration */
  search: SearchOptions;
  /** Indexing configuration */
  indexing: IndexingOptions;
  /** Suggestion configuration */
  suggestions: {
    /** Maximum context items per suggestion */
    maxContextItems: number;
    /** Minimum confidence threshold */
    minConfidence: number;
    /** Enable streaming suggestions */
    enableStreaming: boolean;
  };
}

/**
 * Default RAG configuration
 */
export const DEFAULT_RAG_CONFIG: RAGConfig = {
  vectorStore: DEFAULT_VECTOR_STORE_CONFIG,
  search: DEFAULT_SEARCH_OPTIONS,
  indexing: DEFAULT_INDEXING_OPTIONS,
  suggestions: {
    maxContextItems: 5,
    minConfidence: 0.6,
    enableStreaming: false,
  },
};

/**
 * Performance metrics for RAG operations
 */
export interface RAGPerformanceMetrics {
  /** Average search time in ms */
  avgSearchTime: number;
  /** Average indexing time per item in ms */
  avgIndexingTime: number;
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
  /** Total vectors stored */
  totalVectors: number;
  /** Memory usage in bytes (approximate) */
  memoryUsage: number;
}
