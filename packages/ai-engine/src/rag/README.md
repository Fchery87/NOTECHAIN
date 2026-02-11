# NoteChain RAG System

## Context-Aware Suggestions with Retrieval-Augmented Generation

The RAG (Retrieval-Augmented Generation) system provides intelligent, context-aware suggestions for NoteChain by combining vector similarity search with local LLM processing. All data remains encrypted - only embeddings and decrypted content processed in memory are used.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        RAG Engine                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Indexing   │───▶│ Vector Store │◀───│    Search    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Local LLM    │◀───│  Context     │───▶│ Suggestion   │      │
│  │ (TinyLlama)  │    │  Retriever   │    │  Engine      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────┐    ┌──────────────┐                          │
│  │  Embeddings  │────│ Embedding    │                          │
│  │  (MiniLM)    │    │  Service     │                          │
│  └──────────────┘    └──────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Storage Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  In-Memory: Vector embeddings (never encrypted content)         │
│  IndexedDB: Persistence for embeddings (optional)               │
│  Cache:     Content hash → embedding mapping                    │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. VectorStore

In-memory vector storage with optional IndexedDB persistence.

**Features:**

- Cosine similarity search optimized for <100ms retrieval
- Sliding window chunking for long documents
- Content hash-based embedding caching
- Automatic memory management (max 10K vectors default)

**Usage:**

```typescript
const vectorStore = new VectorStore({
  dimensions: 384,
  metric: 'cosine',
  enablePersistence: true,
});

await vectorStore.initialize();

// Search
const results = await vectorStore.search(queryEmbedding, {
  topK: 5,
  threshold: 0.5,
});
```

### 2. ContextRetriever

Retrieves relevant context from the vector store.

**Features:**

- Semantic search with query embedding
- Position-aware context extraction
- Todo prioritization (by due date/priority)
- Context formatting for LLM prompts

**Usage:**

```typescript
const retriever = new ContextRetriever(vectorStore, embeddingService);

// Get context for current note
const context = await retriever.retrieveContextForNote(currentContent, currentTitle);

// Format for LLM
const prompt = retriever.formatContextForPrompt(context, 2000);
```

### 3. SuggestionEngine

Generates AI-powered suggestions based on retrieved context.

**Suggestion Types:**

- `completion`: Continue text based on context
- `related`: Find related notes/todos
- `action_items`: Extract todos from text
- `summary`: Generate concise summaries
- `insight`: Discover connections and insights

**Usage:**

```typescript
const engine = new SuggestionEngine(retriever, llm);

const response = await engine.generateSuggestions({
  currentContext: { type: 'note', content: '...', title: '...' },
  suggestionType: 'related',
  maxSuggestions: 5,
});
```

### 4. RAGEngine

High-level orchestrator that coordinates all components.

**Usage:**

```typescript
const rag = new RAGEngine(embeddingService, llm);
await rag.initialize();

// Index content
await rag.indexEntity({
  type: 'note',
  data: noteData,
  decryptedContent: { title, content, tags },
});

// Generate suggestions
const suggestions = await rag.generateSuggestions({
  suggestionType: 'related',
  currentContext: { type: 'note', content, title },
});
```

## Privacy & Security

### Core Principles

1. **Encryption at Rest**: All note/todo content remains encrypted in storage
2. **Memory-Only Decryption**: Decrypted content only exists in memory during processing
3. **Embedding Storage**: Only vector embeddings (mathematical representations) are stored
4. **No Plaintext Persistence**: Content is never written to disk in plaintext

### Data Flow

```
Encrypted Note (DB)
       │
       ▼ (decrypt in memory)
Decrypted Content (Memory only)
       │
       ▼ (chunk + embed)
Embeddings ────────▶ Vector Store
       │
       ▼ (garbage collected)
Decrypted Content (removed from memory)
```

## Performance Optimizations

### 1. Cosine Similarity

- Vectors are normalized once at indexing
- Dot product equals cosine similarity for normalized vectors
- SIMD-optimized operations where available

### 2. Caching Strategy

- Content hash → embedding cache prevents recomputation
- LRU cache for frequently accessed vectors
- IndexedDB persistence for embeddings (optional)

### 3. Chunking Strategy

```typescript
// Sliding window chunking for long documents
{
  maxChunkSize: 512,   // tokens per chunk
  overlap: 50,         // token overlap
  minChunkSize: 100,   // minimum meaningful chunk
  splitDelimiters: ['\n\n', '\n', '. ', '! ', '? '],
}
```

### 4. Search Optimization

- Early termination after timeout (default 100ms)
- Metadata filtering before similarity calculation
- Lazy loading of content excerpts

## Usage Examples

### Indexing Notes

```typescript
const note: IndexableEntity = {
  type: 'note',
  data: encryptedNoteData,
  decryptedContent: {
    title: 'Project Ideas',
    content: 'My project ideas for 2025...',
    tags: ['ideas', '2025'],
  },
};

await ragEngine.indexEntity(note);
```

### Batch Indexing with Progress

```typescript
await ragEngine.indexEntities(notes, {
  batchSize: 10,
  onProgress: progress => {
    console.log(`${progress.progress.toFixed(1)}% complete`);
  },
});
```

### Getting Related Notes

```typescript
const related = await ragEngine.getRelatedNotes(
  currentNoteId,
  currentContent,
  currentTitle,
  5 // limit
);

for (const suggestion of related.suggestions) {
  console.log(suggestion.content);
}
```

### Extracting Action Items

```typescript
const actionItems = await ragEngine.extractActionItems(meetingNotesContent, 'Meeting Notes');

for (const item of actionItems.suggestions) {
  // Can create todo from suggestion
  if (item.action?.type === 'create_todo') {
    await createTodo(item.action.payload);
  }
}
```

### Quick Suggestions (No LLM)

```typescript
// Fast retrieval without LLM processing
const suggestions = await ragEngine.generateQuickSuggestions({
  suggestionType: 'related',
  currentContext: { type: 'note', content, title },
});
```

## Configuration

### Vector Store Config

```typescript
const config: VectorStoreConfig = {
  dimensions: 384, // Embedding dimensions
  metric: 'cosine', // Similarity metric
  maxInMemoryVectors: 10000, // Memory limit
  enablePersistence: true, // IndexedDB persistence
  persistenceKey: 'my_vectors', // DB name
  chunkConfig: {
    maxChunkSize: 512,
    overlap: 50,
    minChunkSize: 100,
    splitDelimiters: ['\n\n', '\n', '. '],
  },
};
```

### Search Options

```typescript
const options: SearchOptions = {
  topK: 10, // Max results
  threshold: 0.5, // Min similarity (0-1)
  entityTypes: ['note', 'todo'], // Filter by type
  includeContent: true, // Include text in results
  timeoutMs: 100, // Max search time
};
```

## API Reference

### RAGEngine

| Method                                       | Description               |
| -------------------------------------------- | ------------------------- |
| `initialize()`                               | Initialize all components |
| `indexEntity(entity)`                        | Index a single note/todo  |
| `indexEntities(entities, options)`           | Batch indexing            |
| `deleteEntity(id, type?)`                    | Remove from index         |
| `generateSuggestions(request)`               | AI-powered suggestions    |
| `generateQuickSuggestions(request)`          | Fast retrieval-only       |
| `getRelatedNotes(id, content, title, limit)` | Find related content      |
| `getSuggestedLinks(content, title, limit)`   | Suggest links             |
| `extractActionItems(content, title)`         | Extract todos             |
| `getMetrics()`                               | Performance metrics       |
| `clear()`                                    | Clear all data            |
| `dispose()`                                  | Cleanup resources         |

### VectorStore

| Method                                   | Description        |
| ---------------------------------------- | ------------------ |
| `initialize()`                           | Initialize store   |
| `upsert(record)`                         | Add/update vector  |
| `upsertBatch(records)`                   | Batch insert       |
| `delete(id)`                             | Remove vector      |
| `search(query, options)`                 | Similarity search  |
| `getByEntity(id, type?)`                 | Get entity vectors |
| `chunkText(text, config)`                | Chunk long text    |
| `getCachedEmbedding(hash)`               | Check cache        |
| `cacheEmbedding(hash, embedding, model)` | Cache embedding    |
| `getStats()`                             | Store statistics   |

### ContextRetriever

| Method                                                  | Description     |
| ------------------------------------------------------- | --------------- |
| `retrieveContext(query, options)`                       | Basic retrieval |
| `retrieveContextForNote(content, title, options)`       | Note context    |
| `retrieveContextForTodos(query, options)`               | Todo context    |
| `retrieveContextAtPosition(content, position, options)` | Cursor-aware    |
| `retrieveCrossReferences(content, title, id, options)`  | Find links      |
| `formatContextForPrompt(context, maxLength)`            | Format for LLM  |

### SuggestionEngine

| Method                                       | Description         |
| -------------------------------------------- | ------------------- |
| `generateSuggestions(request)`               | Full AI suggestions |
| `generateQuickSuggestions(request)`          | Fast suggestions    |
| `getRelatedNotes(id, content, title, limit)` | Related content     |
| `getSuggestedLinks(content, title, limit)`   | Link suggestions    |
| `extractActionItems(content, title)`         | Action items        |

## Performance Benchmarks

Target performance on modern hardware:

- **Vector Search**: <100ms for 10K vectors
- **Embedding Generation**: ~50ms per 512 tokens
- **Batch Indexing**: ~100 items/second
- **Memory Usage**: ~15MB per 1000 vectors (384-dim)

## Files

```
packages/ai-engine/src/rag/
├── types.ts              # TypeScript definitions
├── VectorStore.ts        # Vector storage & search
├── ContextRetriever.ts   # Context retrieval logic
├── SuggestionEngine.ts   # AI suggestion generation
├── RAGEngine.ts          # High-level orchestrator
├── index.ts              # Module exports
└── examples/
    └── usage.ts          # Usage examples
```

## Dependencies

- `@xenova/transformers`: Local embedding & LLM inference
- `@notechain/data-models`: Type definitions (Note, Todo)
- `IndexedDB`: Browser storage (optional)

## License

MIT - Part of NoteChain project
