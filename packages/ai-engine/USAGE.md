# AI Engine - Comprehensive Usage Guide

This guide provides detailed examples and best practices for using the @notechain/ai-engine package.

## Table of Contents

- [Getting Started](#getting-started)
- [Core Features](#core-features)
- [RAG System](#rag-system)
- [Task Prioritization](#task-prioritization)
- [Performance Optimization](#performance-optimization)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Initialization

Always initialize models before use:

```typescript
import { LocalLLM, EmbeddingService } from '@notechain/ai-engine';

async function initializeAI() {
  const llm = new LocalLLM(
    {
      modelId: 'Xenova/tinyllama-chat-v1.0',
      quantized: true,
    },
    progress => console.log(`LLM: ${progress.progress}%`)
  );

  const embeddings = new EmbeddingService(
    {
      modelId: 'Xenova/all-MiniLM-L6-v2',
      dimensions: 384,
    },
    progress => console.log(`Embeddings: ${progress.progress}%`)
  );

  await Promise.all([llm.initialize(), embeddings.initialize()]);

  return { llm, embeddings };
}
```

## Core Features

### 1. Text Summarization

Generate concise summaries of notes:

```typescript
async function summarizeNote(note: string) {
  const { llm } = await initializeAI();

  const summary = await llm.generate(`Summarize this note in 2-3 sentences:\n\n${note}`, {
    maxTokens: 150,
    temperature: 0.5,
  });

  return summary;
}
```

### 2. Auto-completion

Context-aware text completion:

```typescript
async function getCompletions(partialText: string, context: string[]) {
  const { llm } = await initializeAI();

  const contextStr = context.join('\n');
  const prompt = `Given context:\n${contextStr}\n\nComplete this text:\n${partialText}`;

  const completion = await llm.generate(prompt, {
    maxTokens: 100,
    temperature: 0.7,
  });

  return completion;
}
```

### 3. Key Point Extraction

Extract main ideas from notes:

```typescript
async function extractKeyPoints(note: string) {
  const { llm } = await initializeAI();

  const prompt = `Extract 3-5 key points from this note as a bullet list:\n\n${note}`;

  const keyPoints = await llm.generate(prompt, {
    maxTokens: 200,
    temperature: 0.3,
  });

  return keyPoints;
}
```

## RAG System

### Setting Up RAG

```typescript
import { RAGEngine, VectorStore, ContextRetriever } from '@notechain/ai-engine';

async function setupRAG() {
  const { embeddings } = await initializeAI();

  const vectorStore = new VectorStore({
    dimensions: 384,
    similarityThreshold: 0.7,
  });

  const retriever = new ContextRetriever(vectorStore, embeddings);
  const rag = new RAGEngine(retriever);

  return { rag, vectorStore, retriever };
}
```

### Adding Documents

```typescript
async function indexNotes(notes: Note[]) {
  const { vectorStore, embeddings } = await setupRAG();

  for (const note of notes) {
    const embedding = await embeddings.generateEmbedding(note.content);

    await vectorStore.addVector({
      id: note.id,
      vector: embedding,
      metadata: {
        title: note.title,
        tags: note.tags,
        createdAt: note.createdAt,
      },
    });
  }
}
```

### Semantic Search

```typescript
async function findRelatedNotes(query: string, limit = 5) {
  const { retriever } = await setupRAG();

  const results = await retriever.search(query, {
    limit,
    minSimilarity: 0.75,
  });

  return results.map(r => ({
    id: r.id,
    similarity: r.score,
    metadata: r.metadata,
  }));
}
```

### Context-Aware Suggestions

```typescript
import { SuggestionEngine } from '@notechain/ai-engine';

async function getSuggestions(currentNote: string, type: SuggestionType) {
  const { llm } = await initializeAI();
  const { rag } = await setupRAG();

  const engine = new SuggestionEngine(llm, rag);

  const suggestions = await engine.getSuggestions(currentNote, {
    type, // 'completion' | 'related' | 'action_items' | 'summary' | 'insight'
    limit: 5,
  });

  return suggestions;
}

// Usage examples
const completions = await getSuggestions(noteText, 'completion');
const related = await getSuggestions(noteText, 'related');
const actionItems = await getSuggestions(noteText, 'action_items');
```

## Task Prioritization

### AI-Powered Task Scoring

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  deadline?: Date;
  context?: string;
}

async function prioritizeTasks(tasks: Task[], userContext: string) {
  const { embeddings } = await initializeAI();

  const scored = [];

  for (const task of tasks) {
    // Generate embedding for task
    const taskEmbedding = await embeddings.generateEmbedding(
      `${task.title}\n${task.description}\n${task.context || ''}`
    );

    // Generate embedding for user context
    const contextEmbedding = await embeddings.generateEmbedding(userContext);

    // Calculate relevance (cosine similarity)
    const relevance = embeddings.cosineSimilarity(taskEmbedding, contextEmbedding);

    // Calculate urgency based on deadline
    const urgency = task.deadline
      ? 1 - Math.min((task.deadline.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000), 1)
      : 0.5;

    // Compute final priority score
    const score = relevance * 0.6 + urgency * 0.4;

    scored.push({
      ...task,
      score: score * 100, // Scale to 0-100
      relevance,
      urgency,
    });
  }

  return scored.sort((a, b) => b.score - a.score);
}

// Example usage
const tasks = [
  {
    id: '1',
    title: 'Fix authentication bug',
    description: 'Users cannot log in with Google OAuth',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
  },
  {
    id: '2',
    title: 'Add dark mode',
    description: 'Implement dark mode theme',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
  },
];

const userContext = 'Working on authentication and security features';
const prioritized = await prioritizeTasks(tasks, userContext);
```

## Performance Optimization

### 1. Preload Models

```typescript
// During app initialization
async function preloadModels() {
  const llm = new LocalLLM();
  const embeddings = new EmbeddingService();

  // Load in parallel
  await Promise.all([llm.initialize(), embeddings.initialize()]);

  // Store globally or in context
  globalThis.__ai__ = { llm, embeddings };
}

// Call on app start
preloadModels();
```

### 2. Batch Processing

```typescript
async function generateEmbeddingsForNotes(notes: Note[]) {
  const { embeddings } = await initializeAI();

  // Batch processing (more efficient)
  const texts = notes.map(n => n.content);
  const vectors = await embeddings.generateBatch(texts);

  return notes.map((note, i) => ({
    id: note.id,
    embedding: vectors[i],
  }));
}
```

### 3. Caching Results

```typescript
class CachedLLM {
  private cache = new Map<string, string>();
  private llm: LocalLLM;

  constructor(llm: LocalLLM) {
    this.llm = llm;
  }

  async generate(prompt: string, options?: any) {
    const key = JSON.stringify({ prompt, options });

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const result = await this.llm.generate(prompt, options);
    this.cache.set(key, result);

    return result;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### 4. Lazy Loading

```typescript
// Load models only when needed
let llmPromise: Promise<LocalLLM> | null = null;

async function getLLM() {
  if (!llmPromise) {
    llmPromise = (async () => {
      const llm = new LocalLLM();
      await llm.initialize();
      return llm;
    })();
  }
  return llmPromise;
}

// Usage
const llm = await getLLM();
```

## Best Practices

### 1. Error Handling

```typescript
import { AIError } from '@notechain/ai-engine';

async function safeGenerate(prompt: string) {
  try {
    const llm = await getLLM();
    return await llm.generate(prompt);
  } catch (error) {
    if (error instanceof AIError) {
      console.error('AI Error:', error.message, error.code);
      // Handle specific error types
      if (error.code === 'MODEL_LOAD_FAILED') {
        // Retry with different model
      }
    }
    throw error;
  }
}
```

### 2. Progress Feedback

```typescript
function createProgressHandler(onUpdate: (percent: number) => void) {
  return (progress: { progress: number; message: string }) => {
    console.log(progress.message);
    onUpdate(progress.progress);
  };
}

// In React component
const [loadingProgress, setLoadingProgress] = useState(0);

const llm = new LocalLLM({}, createProgressHandler(setLoadingProgress));
```

### 3. Resource Cleanup

```typescript
class AIService {
  private llm?: LocalLLM;
  private embeddings?: EmbeddingService;

  async initialize() {
    this.llm = new LocalLLM();
    this.embeddings = new EmbeddingService();

    await Promise.all([this.llm.initialize(), this.embeddings.initialize()]);
  }

  async cleanup() {
    // Release resources
    this.llm = undefined;
    this.embeddings = undefined;

    // Force garbage collection (if available)
    if (global.gc) global.gc();
  }
}
```

## Troubleshooting

### Model Loading Issues

```typescript
// If model download fails, use CDN fallback
const llm = new LocalLLM({
  modelId: 'Xenova/tinyllama-chat-v1.0',
  cdn: 'https://cdn.jsdelivr.net/npm/@xenova/transformers',
});
```

### Memory Issues

```typescript
// Reduce model memory footprint
const llm = new LocalLLM({
  quantized: true, // Use quantized models
  maxTokens: 256, // Limit output tokens
});

// Clear caches periodically
setInterval(
  () => {
    vectorStore.clear();
    cachedLLM.clearCache();
  },
  60 * 60 * 1000
); // Every hour
```

### Slow Performance

```typescript
// 1. Use Web Workers for heavy computations
const worker = new Worker(new URL('./ai-worker.ts', import.meta.url));

worker.postMessage({ type: 'generate', prompt: 'Hello' });
worker.onmessage = e => {
  console.log('Result:', e.data);
};

// 2. Implement timeouts
const timeout = 30000; // 30 seconds
const result = await Promise.race([
  llm.generate(prompt),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
]);
```

## Advanced Use Cases

### Custom Model Fine-Tuning

```typescript
// Note: This is conceptual - actual implementation depends on model support
async function fineTuneOnUserData(userNotes: Note[]) {
  // Collect user data (privacy-preserved)
  const trainingData = userNotes.map(note => ({
    input: note.title,
    output: note.content.slice(0, 100), // First 100 chars as summary
  }));

  // Fine-tune (this would require additional libraries)
  // const fineTunedModel = await llm.fineTune(trainingData);

  // Use fine-tuned model
  // const result = await fineTunedModel.generate(prompt);
}
```

### Multi-Language Support

```typescript
async function detectAndGenerate(text: string) {
  // Detect language (simplified)
  const isEnglish = /^[a-zA-Z\s]+$/.test(text);

  const prompt = isEnglish ? `Summarize: ${text}` : `Summarize (any language): ${text}`;

  const llm = await getLLM();
  return await llm.generate(prompt);
}
```

## Testing

```typescript
import { describe, test, expect } from 'bun:test';

describe('AI Engine', () => {
  test('should generate embeddings', async () => {
    const embeddings = new EmbeddingService();
    await embeddings.initialize();

    const vector = await embeddings.generateEmbedding('test content');

    expect(vector).toHaveLength(384);
    expect(vector.every(v => typeof v === 'number')).toBe(true);
  });

  test('should calculate cosine similarity', async () => {
    const embeddings = new EmbeddingService();
    await embeddings.initialize();

    const vec1 = await embeddings.generateEmbedding('TypeScript');
    const vec2 = await embeddings.generateEmbedding('JavaScript');

    const similarity = embeddings.cosineSimilarity(vec1, vec2);

    expect(similarity).toBeGreaterThan(0.7); // Related terms
    expect(similarity).toBeLessThan(1.0); // Not identical
  });
});
```

## Further Reading

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [RAG Architecture Patterns](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [Vector Databases Guide](https://www.pinecone.io/learn/vector-database/)

## Support

For issues or questions:

- Check the [main README](./README.md)
- Review [test files](./src/__tests__/)
- Create an issue on GitHub
