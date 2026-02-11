# @notechain/ai-engine

Local LLM integration and AI services for NoteChain. Privacy-first AI processing that runs entirely in the browser using Xenova Transformers.js.

## Features

- **Privacy-First**: All AI processing happens locally on the user's device
- **Text Generation**: Local LLM for note summarization and completion
- **Semantic Embeddings**: Generate embeddings for semantic search
- **Progress Tracking**: Real-time model loading progress
- **Type-Safe**: Full TypeScript support with comprehensive types
- **Lightweight**: Uses quantized models for optimal performance

## Installation

```bash
bun install
```

## Usage

### Basic Setup

```typescript
import { LocalLLM, EmbeddingService, AIError } from '@notechain/ai-engine';

// Initialize Local LLM for text generation
const llm = new LocalLLM(
  {
    modelId: 'Xenova/tinyllama-chat-v1.0',
    quantized: true,
    maxTokens: 256,
    temperature: 0.7,
  },
  progress => {
    console.log(`Loading: ${progress.progress}% - ${progress.message}`);
  }
);

// Initialize Embedding Service
const embedder = new EmbeddingService(
  {
    modelId: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
  },
  progress => {
    console.log(`Embedding model: ${progress.message}`);
  }
);

// Load models
await llm.initialize();
await embedder.initialize();
```

### Text Generation

```typescript
// Generate text completion
const response = await llm.generate({
  prompt: 'What are the key benefits of end-to-end encryption?',
  systemPrompt: 'You are a helpful assistant explaining privacy concepts.',
  maxTokens: 150,
  temperature: 0.5,
});

console.log(response.text);
console.log(`Generated in ${response.duration}ms`);

// Stream generation
await llm.generateStream({ prompt: 'Explain CRDTs in simple terms' }, chunk => {
  process.stdout.write(chunk.text);
  if (chunk.done) console.log('\n[Done]');
});
```

### Text Summarization

```typescript
// Summarize note content
const summary = await llm.summarize({
  text: longNoteContent,
  style: 'concise', // 'concise' | 'detailed' | 'bullet-points'
  maxLength: 100,
});

console.log(summary.text);
```

### Embedding Generation

```typescript
// Generate embedding for a single text
const embedding = await embedder.generateEmbedding({
  text: 'This is my note content',
});

console.log(`Embedding dimensions: ${embedding.dimensions}`);
console.log(`First 5 values: ${embedding.embedding.slice(0, 5)}`);

// Batch processing
const notes = [{ text: 'Note 1 content' }, { text: 'Note 2 content' }, { text: 'Note 3 content' }];

const embeddings = await embedder.generateEmbeddingsBatch(notes.map(n => ({ text: n.text })));
```

### Semantic Search

```typescript
// Calculate similarity between embeddings
const similarity = embedder.cosineSimilarity(embedding1.embedding, embedding2.embedding);

// Find most similar notes
const queryEmbedding = await embedder.generateEmbedding({
  text: 'search query',
});

const noteEmbeddings = notes.map(note => ({
  id: note.id,
  embedding: note.embedding,
}));

const results = embedder.findMostSimilar(
  queryEmbedding.embedding,
  noteEmbeddings,
  5 // topK
);

// results: [{ id: 'note-1', score: 0.89 }, { id: 'note-2', score: 0.76 }, ...]
```

### Integration with Notes

```typescript
import type { NoteContent, ProcessedNote } from '@notechain/ai-engine';

async function processNote(note: NoteContent): Promise<ProcessedNote> {
  // Generate embeddings for content and title
  const [contentEmbedding, titleEmbedding] = await Promise.all([
    embedder.generateEmbedding({ text: note.content }),
    note.title ? embedder.generateEmbedding({ text: note.title }) : Promise.resolve(null),
  ]);

  return {
    ...note,
    contentEmbedding: contentEmbedding.embedding,
    titleEmbedding: titleEmbedding?.embedding,
    processedAt: new Date(),
  };
}
```

### Error Handling

```typescript
import { AIError } from '@notechain/ai-engine';

try {
  await llm.generate({ prompt: 'Hello' });
} catch (error) {
  if (error instanceof AIError) {
    switch (error.code) {
      case 'MODEL_NOT_LOADED':
        console.error('Model not initialized');
        break;
      case 'GENERATION_ERROR':
        console.error('Generation failed:', error.message);
        break;
      case 'MODEL_LOAD_ERROR':
        console.error('Failed to load model:', error.cause);
        break;
    }
  }
}
```

## Configuration

### LocalLLM Config

```typescript
interface LocalLLMConfig {
  modelId: string; // Hugging Face model ID or local path
  quantized?: boolean; // Use quantized model (default: true)
  maxTokens?: number; // Max tokens to generate (default: 256)
  temperature?: number; // Sampling temperature 0-1 (default: 0.7)
  topP?: number; // Top-p sampling (default: 0.9)
  enableProgress?: boolean; // Enable progress callbacks (default: true)
  device?: 'cpu' | 'webgpu'; // Device to use (default: 'cpu')
}
```

### Embedding Config

```typescript
interface EmbeddingConfig {
  modelId: string; // Hugging Face model ID
  dimensions?: number; // Embedding dimensions (default: 384)
  maxLength?: number; // Max tokens (default: 512)
  normalize?: boolean; // Normalize embeddings (default: true)
  device?: 'cpu' | 'webgpu'; // Device to use (default: 'cpu')
}
```

## Available Models

### Text Generation

- `Xenova/tinyllama-chat-v1.0` (default) - Fast, lightweight chat model
- `Xenova/LaMini-Flan-T5-783M` - Good for summarization
- `Xenova/distilgpt2` - Very lightweight option

### Embeddings

- `Xenova/all-MiniLM-L6-v2` (default) - 384 dimensions, fast
- `Xenova/all-mpnet-base-v2` - 768 dimensions, higher quality
- `Xenova/multi-qa-MiniLM-L6-cos-v1` - Optimized for semantic search

## Performance Considerations

1. **First Load**: Models download on first use (cached afterward)
2. **Memory**: Quantized models use ~200-500MB RAM
3. **Speed**: CPU inference is slower but privacy-preserving
4. **Batching**: Use `generateEmbeddingsBatch()` for multiple texts
5. **Caching**: Embeddings are cached automatically for repeated texts

## API Reference

### LocalLLM

- `initialize()` - Load the model
- `generate(request)` - Generate text completion
- `generateStream(request, callback)` - Stream generation
- `summarize(request)` - Summarize text
- `isReady()` - Check if model is loaded
- `dispose()` - Free memory

### EmbeddingService

- `initialize()` - Load the model
- `generateEmbedding(request)` - Generate single embedding
- `generateEmbeddingsBatch(requests)` - Batch embedding generation
- `cosineSimilarity(a, b)` - Calculate similarity
- `findMostSimilar(query, candidates, topK)` - Find similar embeddings
- `clearCache()` - Clear embedding cache
- `isReady()` - Check if model is loaded
- `dispose()` - Free memory and cache

## Development

```bash
# Run tests
bun test

# Type check
bun run typecheck

# Build
bun run build

# Watch mode
bun run dev
```

## Privacy Notes

- All models run locally in the browser
- No data is sent to external servers
- Models are downloaded from Hugging Face but run locally
- Embeddings can be stored locally for offline search
