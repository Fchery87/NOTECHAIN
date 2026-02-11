// packages/ai-engine/src/rag/examples/usage.ts
/**
 * RAG System Usage Examples
 * Demonstrates how to use the Context-Aware Suggestions RAG system
 */

import {
  RAGEngine,
  EmbeddingService,
  LocalLLM,
  VectorStore,
  ContextRetriever,
} from '@notechain/ai-engine';

import type {
  SuggestionRequest,
  IndexableEntity,
  VectorSearchResult,
  IndexingProgress,
} from '@notechain/ai-engine';

// ============================================================================
// Example 1: Basic Setup and Initialization
// ============================================================================

async function example1_basicSetup(): Promise<void> {
  console.log('Example 1: Basic Setup');

  // Initialize embedding service
  const embeddingService = new EmbeddingService({
    modelId: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
  });

  // Initialize local LLM
  const llm = new LocalLLM({
    modelId: 'Xenova/tinyllama-chat-v1.0',
    quantized: true,
    maxTokens: 256,
  });

  // Create RAG engine
  const ragEngine = new RAGEngine(embeddingService, llm);

  // Initialize all components
  await ragEngine.initialize();

  console.log('RAG Engine initialized successfully!');
}

// ============================================================================
// Example 2: Indexing Notes and Todos
// ============================================================================

async function _example2_indexingContent(ragEngine: RAGEngine): Promise<void> {
  console.log('Example 2: Indexing Content');

  // Example note with decrypted content (only in memory)
  const noteEntity: IndexableEntity = {
    type: 'note',
    data: {
      id: 'note-001',
      userId: 'user-001',
      title: 'encrypted-title',
      content: 'encrypted-content',
      contentHash: 'hash123',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    },
    // Decrypted content - ONLY available in memory, never persisted
    decryptedContent: {
      title: 'Project Ideas 2025',
      content: `
        Here are some project ideas for 2025:

        1. AI-powered note-taking app with end-to-end encryption
        2. Decentralized task management system
        3. Personal knowledge graph with semantic search
        4. Encrypted document collaboration platform

        The AI note-taking app should have:
        - Local-first architecture
        - Privacy-preserving AI features
        - Vector search for related notes
        - Automatic linking between ideas
      `,
      tags: ['projects', 'ideas', '2025', 'AI'],
    },
  };

  // Index the note
  await ragEngine.indexEntity(noteEntity);
  console.log('Note indexed successfully!');

  // Index a todo
  const todoEntity: IndexableEntity = {
    type: 'todo',
    data: {
      id: 'todo-001',
      userId: 'user-001',
      title: 'encrypted-title',
      status: 'in_progress',
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      isDeleted: false,
    },
    decryptedContent: {
      title: 'Implement vector search for notes',
      description: 'Build a RAG system for context-aware suggestions using cosine similarity',
      tags: ['AI', 'vector-search', 'RAG'],
    },
  };

  await ragEngine.indexEntity(todoEntity);
  console.log('Todo indexed successfully!');
}

// ============================================================================
// Example 3: Batch Indexing with Progress
// ============================================================================

async function _example3_batchIndexing(ragEngine: RAGEngine): Promise<void> {
  console.log('Example 3: Batch Indexing');

  const entities: IndexableEntity[] = [
    // Multiple notes and todos...
    {
      type: 'note',
      data: {
        id: 'note-002',
        userId: 'user-001',
        title: 'encrypted',
        content: 'encrypted',
        contentHash: 'hash2',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      },
      decryptedContent: {
        title: 'Meeting Notes: AI Ethics',
        content: 'Discussion about responsible AI development and privacy considerations...',
      },
    },
    // ... more entities
  ];

  await ragEngine.indexEntities(entities, {
    batchSize: 5,
    skipExisting: true,
    forceReindex: false,
    onProgress: (progress: IndexingProgress) => {
      console.log(
        `Indexing: ${progress.progress.toFixed(1)}% (${progress.processed}/${progress.total})`
      );
      if (progress.currentItem) {
        console.log(`  Current: ${progress.currentItem}`);
      }
      if (progress.errors.length > 0) {
        console.warn(`  Errors: ${progress.errors.length}`);
      }
    },
  });
}

// ============================================================================
// Example 4: Generating Suggestions
// ============================================================================

async function _example4_generatingSuggestions(ragEngine: RAGEngine): Promise<void> {
  console.log('Example 4: Generating Suggestions');

  // Get related notes while editing
  const currentNoteContent = `
    Working on the privacy-preserving AI features for NoteChain.
    Need to implement vector storage and similarity search.
  `;

  const suggestionRequest: SuggestionRequest = {
    currentContext: {
      type: 'note',
      content: currentNoteContent,
      title: 'AI Features Implementation',
    },
    suggestionType: 'related',
    maxSuggestions: 5,
  };

  const response = await ragEngine.generateQuickSuggestions(suggestionRequest);

  console.log(`Found ${response.suggestions.length} related items:`);
  for (const suggestion of response.suggestions) {
    console.log(
      `- ${suggestion.content.slice(0, 100)}... (confidence: ${suggestion.confidence.toFixed(2)})`
    );
  }

  console.log(`Retrieval time: ${response.context.retrievalTime.toFixed(2)}ms`);
}

// ============================================================================
// Example 5: Text Completion Suggestions
// ============================================================================

async function _example5_textCompletion(ragEngine: RAGEngine): Promise<void> {
  console.log('Example 5: Text Completion');

  const request: SuggestionRequest = {
    currentContext: {
      type: 'note',
      content: 'The key benefits of end-to-end encryption include',
      title: 'Security Overview',
      cursorPosition: 47,
    },
    suggestionType: 'completion',
    maxSuggestions: 1,
  };

  const response = await ragEngine.generateSuggestions(request);

  if (response.suggestions.length > 0) {
    const completion = response.suggestions[0];
    console.log('Suggested completion:');
    console.log(completion.content);
    console.log(`Confidence: ${completion.confidence.toFixed(2)}`);
  }
}

// ============================================================================
// Example 6: Action Item Extraction
// ============================================================================

async function _example6_actionItems(ragEngine: RAGEngine): Promise<void> {
  console.log('Example 6: Action Item Extraction');

  const meetingNotes = `
    Team Meeting - January 15, 2025

    Action Items:
    - Sarah will review the AI model documentation by Friday
    - Mike needs to set up the vector database infrastructure
    - We should schedule a demo for next week
    - Update the privacy policy to reflect new AI features

    Next meeting: January 22
  `;

  const actionItems = await ragEngine.extractActionItems(meetingNotes, 'Team Meeting Notes');

  console.log('Extracted action items:');
  for (const item of actionItems.suggestions) {
    console.log(`- ${item.content}`);
    if (item.action?.type === 'create_todo') {
      console.log(`  -> Can create todo: ${JSON.stringify(item.action.payload)}`);
    }
  }
}

// ============================================================================
// Example 7: Direct Vector Store Usage
// ============================================================================

async function _example7_vectorStoreDirect(): Promise<void> {
  console.log('Example 7: Direct Vector Store Usage');

  const embeddingService = new EmbeddingService();
  await embeddingService.initialize();

  // Create vector store
  const vectorStore = new VectorStore({
    dimensions: 384,
    metric: 'cosine',
    enablePersistence: true,
    persistenceKey: 'my_vectors',
  });

  await vectorStore.initialize();

  // Generate embedding for query
  const queryResponse = await embeddingService.generateEmbedding({
    text: 'privacy and encryption',
  });

  // Search for similar vectors
  const results: VectorSearchResult[] = await vectorStore.search(queryResponse.embedding, {
    topK: 5,
    threshold: 0.5,
    entityTypes: ['note'],
    includeContent: true,
  });

  console.log(`Found ${results.length} matching vectors:`);
  for (const result of results) {
    console.log(`- Score: ${result.score.toFixed(3)}, Type: ${result.record.entityType}`);
    if (result.excerpt) {
      console.log(`  Excerpt: ${result.excerpt.slice(0, 100)}...`);
    }
  }

  // Get stats
  const stats = vectorStore.getStats();
  console.log(`Vector store stats: ${stats.vectorCount} vectors, ${stats.cacheSize} cached`);
}

// ============================================================================
// Example 8: Using ContextRetriever Directly
// ============================================================================

async function _example8_contextRetriever(): Promise<void> {
  console.log('Example 8: Context Retriever');

  const embeddingService = new EmbeddingService();
  const vectorStore = new VectorStore();
  const contextRetriever = new ContextRetriever(vectorStore, embeddingService);

  await Promise.all([embeddingService.initialize(), vectorStore.initialize()]);

  // Retrieve context for a query
  const context = await contextRetriever.retrieveContext('machine learning and neural networks', {
    topK: 5,
    threshold: 0.4,
  });

  console.log(
    `Retrieved ${context.items.length} context items in ${context.retrievalTime.toFixed(2)}ms`
  );

  for (const item of context.items) {
    console.log(`- [${item.type}] ${item.title} (relevance: ${item.relevance.toFixed(2)})`);
  }

  // Format for LLM prompt
  const formattedContext = contextRetriever.formatContextForPrompt(context, 1000);
  console.log('\nFormatted for LLM:');
  console.log(formattedContext);
}

// ============================================================================
// Example 9: Performance Monitoring
// ============================================================================

async function _example9_performanceMetrics(ragEngine: RAGEngine): Promise<void> {
  console.log('Example 9: Performance Metrics');

  const _metrics = ragEngine.getMetrics();

  console.log('RAG Performance Metrics:');
  console.log(`- Total vectors: ${_metrics.totalVectors}`);
  console.log(`- Memory usage: ${(_metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
  console.log(`- Cache hit rate: ${(_metrics.cacheHitRate * 100).toFixed(1)}%`);
  console.log(`- Vector count: ${_metrics.vectorStats.vectorCount}`);
  console.log(`- Cache size: ${_metrics.vectorStats.cacheSize}`);
}

// ============================================================================
// Example 10: Complete Workflow
// ============================================================================

async function _example10_completeWorkflow(): Promise<void> {
  console.log('Example 10: Complete Workflow');

  // 1. Setup
  const embeddingService = new EmbeddingService();
  const llm = new LocalLLM();
  const ragEngine = new RAGEngine(embeddingService, llm);

  await ragEngine.initialize();
  console.log('✓ RAG Engine initialized');

  // 2. Index content
  const notes: IndexableEntity[] = [
    {
      type: 'note',
      data: {
        id: 'workflow-note-1',
        userId: 'user-1',
        title: 'encrypted',
        content: 'encrypted',
        contentHash: 'hash1',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      },
      decryptedContent: {
        title: 'React Best Practices',
        content: 'When building React applications, consider using hooks for state management...',
        tags: ['react', 'javascript', 'frontend'],
      },
    },
    {
      type: 'note',
      data: {
        id: 'workflow-note-2',
        userId: 'user-1',
        title: 'encrypted',
        content: 'encrypted',
        contentHash: 'hash2',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      },
      decryptedContent: {
        title: 'TypeScript Tips',
        content: 'Use strict mode for better type checking. Define interfaces for props...',
        tags: ['typescript', 'javascript'],
      },
    },
  ];

  await ragEngine.indexEntities(notes);
  console.log('✓ Content indexed');

  // 3. Get suggestions while writing
  const request: SuggestionRequest = {
    currentContext: {
      type: 'note',
      content: 'Working on a new React component using TypeScript',
      title: 'Component Development',
    },
    suggestionType: 'related',
    maxSuggestions: 3,
  };

  const response = await ragEngine.generateQuickSuggestions(request);
  console.log(`✓ Found ${response.suggestions.length} suggestions`);

  for (const suggestion of response.suggestions) {
    console.log(`  - ${suggestion.content.split('\n')[0]}`);
  }

  // 4. Check performance
  const _metrics = ragEngine.getMetrics();
  console.log(`✓ Performance: ${response.context.retrievalTime.toFixed(2)}ms retrieval`);

  // 5. Cleanup
  ragEngine.dispose();
  console.log('✓ Cleanup complete');
}

// ============================================================================
// Main execution
// ============================================================================

export async function runExamples(): Promise<void> {
  console.log('=== NoteChain RAG System Examples ===\n');

  try {
    await example1_basicSetup();
  } catch (error) {
    console.error('Example failed:', error);
  }

  console.log('\n=== Examples Complete ===');
}

// Run if executed directly
if (import.meta.main) {
  runExamples();
}
