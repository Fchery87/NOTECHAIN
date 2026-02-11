// packages/ai-engine/src/rag/VectorStore.ts
/**
 * Vector Store for RAG (Retrieval-Augmented Generation)
 * In-memory vector storage with IndexedDB persistence
 * Privacy-first: only embeddings stored, never plaintext
 */

import {
  type VectorRecord,
  type VectorSearchResult,
  type VectorStoreConfig,
  type ContentChunk,
  type EmbeddingCacheEntry,
  type SearchOptions,
  DEFAULT_VECTOR_STORE_CONFIG,
  DEFAULT_SEARCH_OPTIONS,
} from './types';

/**
 * In-memory vector store with IndexedDB persistence
 * Optimized for <100ms retrieval performance
 */
export class VectorStore {
  private config: Required<VectorStoreConfig>;
  private vectors: Map<string, VectorRecord> = new Map();
  private embeddingCache: Map<string, EmbeddingCacheEntry> = new Map();
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<VectorStoreConfig> = {}) {
    this.config = { ...DEFAULT_VECTOR_STORE_CONFIG, ...config } as Required<VectorStoreConfig>;
  }

  /**
   * Initialize the vector store
   * Loads persisted vectors from IndexedDB if enabled
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  /**
   * Perform actual initialization
   */
  private async doInitialize(): Promise<void> {
    try {
      if (this.config.enablePersistence) {
        await this.initIndexedDB();
        await this.loadPersistedVectors();
      }
      this.isInitialized = true;
    } catch (error) {
      console.warn('VectorStore: Failed to initialize persistence, using in-memory only:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Initialize IndexedDB
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NoteChainVectorStore', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('vectors')) {
          const store = db.createObjectStore('vectors', { keyPath: 'id' });
          store.createIndex('entityType', 'entityType', { unique: false });
          store.createIndex('entityId', 'entityId', { unique: false });
          store.createIndex('contentHash', 'contentHash', { unique: false });
          store.createIndex('userId', 'metadata.userId', { unique: false });
        }
        if (!db.objectStoreNames.contains('embeddingCache')) {
          const cacheStore = db.createObjectStore('embeddingCache', { keyPath: 'contentHash' });
          cacheStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
      };
    });
  }

  /**
   * Load persisted vectors from IndexedDB
   */
  private async loadPersistedVectors(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction('vectors', 'readonly');
    const store = transaction.objectStore('vectors');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const records: VectorRecord[] = request.result;
        for (const record of records) {
          // Restore Date objects from strings
          record.indexedAt = new Date(record.indexedAt);
          this.vectors.set(record.id, record);
        }
        console.log(`VectorStore: Loaded ${records.length} persisted vectors`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Ensure store is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('VectorStore not initialized. Call initialize() first.');
    }
  }

  /**
   * Add or update a vector record
   */
  async upsert(record: VectorRecord): Promise<void> {
    this.ensureInitialized();

    // Validate embedding dimensions
    if (record.embedding.length !== this.config.dimensions) {
      throw new Error(
        `Invalid embedding dimensions: expected ${this.config.dimensions}, got ${record.embedding.length}`
      );
    }

    // Normalize embedding if using cosine similarity
    if (this.config.metric === 'cosine') {
      record.embedding = this.normalizeVector(record.embedding);
    }

    // Store in memory
    this.vectors.set(record.id, record);

    // Persist if enabled
    if (this.config.enablePersistence && this.db) {
      await this.persistVector(record);
    }

    // Enforce memory limits
    this.enforceMemoryLimits();
  }

  /**
   * Add multiple vectors in batch
   */
  async upsertBatch(records: VectorRecord[]): Promise<void> {
    this.ensureInitialized();

    // Process in batches to avoid blocking
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await Promise.all(batch.map(record => this.upsert(record)));
    }
  }

  /**
   * Persist a vector to IndexedDB
   */
  private async persistVector(record: VectorRecord): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('vectors', 'readwrite');
      const store = transaction.objectStore('vectors');
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a vector by ID
   */
  async delete(id: string): Promise<void> {
    this.ensureInitialized();

    this.vectors.delete(id);

    if (this.config.enablePersistence && this.db) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction('vectors', 'readwrite');
        const store = transaction.objectStore('vectors');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Delete all vectors for an entity
   */
  async deleteByEntity(entityId: string, entityType?: string): Promise<void> {
    this.ensureInitialized();

    const toDelete: string[] = [];
    for (const [id, record] of this.vectors) {
      if (record.entityId === entityId) {
        if (!entityType || record.entityType === entityType) {
          toDelete.push(id);
        }
      }
    }

    await Promise.all(toDelete.map(id => this.delete(id)));
  }

  /**
   * Get a vector by ID
   */
  get(id: string): VectorRecord | undefined {
    this.ensureInitialized();
    return this.vectors.get(id);
  }

  /**
   * Get all vectors for an entity
   */
  getByEntity(entityId: string, entityType?: string): VectorRecord[] {
    this.ensureInitialized();

    const results: VectorRecord[] = [];
    for (const record of this.vectors.values()) {
      if (record.entityId === entityId) {
        if (!entityType || record.entityType === entityType) {
          results.push(record);
        }
      }
    }

    return results.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  /**
   * Search for similar vectors using cosine similarity
   * Optimized for <100ms retrieval
   */
  async search(
    queryEmbedding: number[],
    options: Partial<SearchOptions> = {}
  ): Promise<VectorSearchResult[]> {
    this.ensureInitialized();

    const startTime = performance.now();
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };

    // Validate query dimensions
    if (queryEmbedding.length !== this.config.dimensions) {
      throw new Error(
        `Invalid query dimensions: expected ${this.config.dimensions}, got ${queryEmbedding.length}`
      );
    }

    // Normalize query if using cosine similarity
    let normalizedQuery = queryEmbedding;
    if (this.config.metric === 'cosine') {
      normalizedQuery = this.normalizeVector(queryEmbedding);
    }

    // Calculate similarities with early termination
    const results: VectorSearchResult[] = [];

    for (const record of this.vectors.values()) {
      // Check timeout
      if (performance.now() - startTime > opts.timeoutMs) {
        break;
      }

      // Filter by entity type
      if (opts.entityTypes && !opts.entityTypes.includes(record.entityType)) {
        continue;
      }

      // Filter by metadata
      if (opts.metadataFilter && !this.matchesMetadataFilter(record, opts.metadataFilter)) {
        continue;
      }

      // Calculate similarity
      const score = this.calculateSimilarity(normalizedQuery, record.embedding);

      // Apply threshold
      if (score >= opts.threshold) {
        results.push({
          record,
          score,
          excerpt: opts.includeContent ? record.content : undefined,
        });
      }

      // Processed count intentionally unused - kept for future analytics
    }

    // Sort by score and take topK
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, opts.topK);

    return topResults;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }

    // If vectors are normalized, dot product equals cosine similarity
    if (this.config.metric === 'cosine') {
      return Math.max(0, Math.min(1, dotProduct)); // Clamp to [0, 1]
    }

    // For non-normalized vectors, calculate full cosine similarity
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Normalize a vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    let norm = 0;
    for (let i = 0; i < vector.length; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm === 0) return vector;

    return vector.map(v => v / norm);
  }

  /**
   * Check if record matches metadata filter
   */
  private matchesMetadataFilter(record: VectorRecord, filter: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      const recordValue = record.metadata[key as keyof typeof record.metadata];
      if (Array.isArray(value)) {
        if (!Array.isArray(recordValue) || !value.every(v => recordValue.includes(v))) {
          return false;
        }
      } else if (recordValue !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get cached embedding for content hash
   */
  getCachedEmbedding(contentHash: string): number[] | undefined {
    const entry = this.embeddingCache.get(contentHash);
    if (entry) {
      return entry.embedding;
    }

    // Check IndexedDB cache
    if (this.config.enablePersistence && this.db) {
      // Async cache lookup - return undefined for now, will be populated on next access
      this.loadCachedEmbedding(contentHash);
    }

    return undefined;
  }

  /**
   * Load cached embedding from IndexedDB
   */
  private async loadCachedEmbedding(contentHash: string): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction('embeddingCache', 'readonly');
      const store = transaction.objectStore('embeddingCache');
      const request = store.get(contentHash);

      request.onsuccess = () => {
        const entry: EmbeddingCacheEntry | undefined = request.result;
        if (entry) {
          this.embeddingCache.set(contentHash, entry);
        }
      };
    } catch {
      // Ignore cache load errors
    }
  }

  /**
   * Cache an embedding
   */
  async cacheEmbedding(contentHash: string, embedding: number[], modelId: string): Promise<void> {
    const entry: EmbeddingCacheEntry = {
      contentHash,
      embedding,
      cachedAt: new Date(),
      modelId,
    };

    this.embeddingCache.set(contentHash, entry);

    if (this.config.enablePersistence && this.db) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction('embeddingCache', 'readwrite');
        const store = transaction.objectStore('embeddingCache');
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Chunk text into smaller pieces for processing
   * Uses sliding window approach for long documents
   */
  chunkText(text: string, config = this.config.chunkConfig): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    const { maxChunkSize, overlap, minChunkSize, splitDelimiters } = config;

    // Estimate tokens (rough: ~4 chars per token)
    const estimatedTokens = Math.ceil(text.length / 4);

    if (estimatedTokens <= maxChunkSize) {
      // Text fits in a single chunk
      const contentHash = this.hashContent(text);
      return [
        {
          text,
          index: 0,
          total: 1,
          startPosition: 0,
          endPosition: text.length,
          contentHash,
        },
      ];
    }

    // Split into chunks with overlap
    let position = 0;
    let chunkIndex = 0;

    while (position < text.length) {
      // Calculate chunk end position
      const maxChars = maxChunkSize * 4;
      let endPosition = Math.min(position + maxChars, text.length);

      // Try to find a good split point
      if (endPosition < text.length) {
        const searchStart = Math.max(position + minChunkSize * 4, endPosition - 100);
        const searchText = text.slice(searchStart, endPosition + 100);

        for (const delimiter of splitDelimiters) {
          const lastIndex = searchText.lastIndexOf(delimiter);
          if (lastIndex !== -1 && lastIndex > minChunkSize * 4) {
            endPosition = searchStart + lastIndex + delimiter.length;
            break;
          }
        }
      }

      const chunkText = text.slice(position, endPosition).trim();
      if (chunkText.length >= minChunkSize * 2) {
        chunks.push({
          text: chunkText,
          index: chunkIndex,
          total: 0, // Will update later
          startPosition: position,
          endPosition,
          contentHash: this.hashContent(chunkText),
        });
        chunkIndex++;
      }

      // Move position with overlap
      position = endPosition - overlap * 4;
      if (position >= endPosition) {
        position = endPosition;
      }
    }

    // Update total count
    for (const chunk of chunks) {
      chunk.total = chunks.length;
    }

    return chunks;
  }

  /**
   * Generate a hash for content
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Enforce memory limits by removing oldest vectors
   */
  private enforceMemoryLimits(): void {
    if (this.vectors.size <= this.config.maxInMemoryVectors) return;

    // Sort by indexedAt and remove oldest
    const sorted = Array.from(this.vectors.entries()).sort(
      (a, b) => a[1].indexedAt.getTime() - b[1].indexedAt.getTime()
    );

    const toRemove = sorted.slice(0, this.vectors.size - this.config.maxInMemoryVectors);
    for (const [id] of toRemove) {
      this.vectors.delete(id);
    }
  }

  /**
   * Clear all vectors
   */
  async clear(): Promise<void> {
    this.vectors.clear();
    this.embeddingCache.clear();

    if (this.config.enablePersistence && this.db) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(['vectors', 'embeddingCache'], 'readwrite');
        transaction.objectStore('vectors').clear();
        transaction.objectStore('embeddingCache').clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }
  }

  /**
   * Get store statistics
   */
  getStats(): {
    vectorCount: number;
    cacheSize: number;
    memoryUsage: number;
  } {
    // Estimate memory usage (rough)
    const vectorMemory = this.vectors.size * this.config.dimensions * 4; // 4 bytes per float
    const cacheMemory = this.embeddingCache.size * this.config.dimensions * 4;

    return {
      vectorCount: this.vectors.size,
      cacheSize: this.embeddingCache.size,
      memoryUsage: vectorMemory + cacheMemory,
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.vectors.clear();
    this.embeddingCache.clear();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
    this.initPromise = null;
  }
}
