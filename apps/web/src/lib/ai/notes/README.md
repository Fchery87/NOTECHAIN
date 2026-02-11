# Note Intelligence & Auto-Linking System

> Week 20 - Phase 5 (Epic 3: AI Intelligence Layer)

AI-powered content analysis and intelligent note organization for NoteChain.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      NoteIntelligence                            │
│                    (Orchestration Layer)                         │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│   Analyzer   │   Tagger     │   Linker     │   Finder           │
│  (Content)   │  (Keywords)  │ (Backlinks)  │ (Similarity)       │
├──────────────┼──────────────┼──────────────┼────────────────────┤
│ Sentiment    │ Categories   │ Embeddings   │ Semantic Search    │
│ Entities     │ Extraction   │ TF-IDF       │ Tag Overlap        │
│ Structure    │ Synonyms     │ Context      │ Temporal           │
└──────────────┴──────────────┴──────────────┴────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  EmbeddingService │
                    │  (ai-engine pkg)  │
                    │  Xenova/all-MiniLM│
                    └──────────────────┘
```

## Core Services

### 1. NoteAnalyzer

Content analysis using TF-IDF and heuristic methods.

**Features:**

- Keyword extraction with importance scoring
- Named entity recognition (people, places, organizations, URLs, dates)
- Sentiment analysis (positive/negative/neutral)
- Content structure analysis (headings, lists, code blocks, images)
- Reading time estimation

**Usage:**

```typescript
import { getNoteAnalyzer } from '@/lib/ai/notes';

const analyzer = getNoteAnalyzer();
const analysis = await analyzer.analyzeNote(note);

console.log(analysis.keywords); // [{ word: 'project', score: 0.85 }]
console.log(analysis.sentiment); // { positive: 60, negative: 10, neutral: 30 }
console.log(analysis.readingTimeMinutes); // 3
```

### 2. AutoTagger

Automatic tag generation based on content analysis.

**Features:**

- Extracts tags from keywords and entities
- Categorizes content (work, personal, learning, tech, etc.)
- Detects programming languages and technologies
- Supports custom categories

**Usage:**

```typescript
import { getAutoTagger } from '@/lib/ai/notes';

const tagger = getAutoTagger();
const tags = await tagger.generateTags(note, { maxTags: 6 });

// Add custom category
tagger.addCategory('projects', ['mvp', 'launch', 'roadmap']);
```

### 3. LinkSuggester

Intelligent backlink suggestions using embeddings and content matching.

**Features:**

- Semantic similarity matching
- Keyword overlap detection
- Entity matching
- Title mention detection
- Confidence scoring

**Usage:**

```typescript
import { getLinkSuggester } from '@/lib/ai/notes';

const suggester = getLinkSuggester();
await suggester.initialize();

const suggestions = await suggester.suggestLinks(note, allNotes, {
  minConfidence: 0.5,
  maxSuggestions: 5,
});
```

### 4. RelatedNotesFinder

Finds semantically similar notes for discovery.

**Features:**

- Embedding-based similarity search
- Tag overlap matching
- Temporal proximity
- Configurable thresholds

**Usage:**

```typescript
import { getRelatedNotesFinder } from '@/lib/ai/notes';

const finder = getRelatedNotesFinder();
const related = await finder.findRelatedNotes(note, allNotes, {
  maxResults: 5,
  minSimilarity: 0.4,
});
```

### 5. NoteSummarizer

Extractive summarization for long content.

**Features:**

- Brief (1-2 sentences)
- Medium (3-5 sentences)
- Detailed (paragraph)
- Key points extraction

**Usage:**

```typescript
import { getNoteSummarizer } from '@/lib/ai/notes';

const summarizer = getNoteSummarizer();
const summary = await summarizer.summarize(note);

console.log(summary.brief);
console.log(summary.keyPoints);
```

### 6. KnowledgeGraphGenerator

Generates graph data for visualization.

**Features:**

- Node-edge graph structure
- Tag nodes
- Backlink edges
- Similarity edges
- Community clustering

**Usage:**

```typescript
import { getKnowledgeGraphGenerator } from '@/lib/ai/notes';

const generator = getKnowledgeGraphGenerator();
const graph = await generator.generateGraph(notes);

// Or focused graph around specific note
const focused = await generator.generateFocusedGraph(note, allNotes, depth: 2);
```

## React Hooks

### useNoteAnalysis

```typescript
const { analysis, isAnalyzing, reanalyze } = useNoteAnalysis(note, {
  extractKeywords: true,
  extractEntities: true,
});
```

### useLinkSuggestions

```typescript
const { suggestions, isLoading, acceptSuggestion, dismissSuggestion } = useLinkSuggestions(note, {
  allNotes,
});
```

### useRelatedNotes

```typescript
const { relatedNotes, isLoading, refresh } = useRelatedNotes(note, {
  allNotes,
  relatedOptions: { maxResults: 5 },
});
```

## React Components

### LinkSuggestions

```tsx
<LinkSuggestions
  suggestions={suggestions}
  onAccept={suggestion => addBacklink(suggestion)}
  onDismiss={suggestion => dismiss(suggestion)}
  maxVisible={3}
/>
```

### AutoTags

```tsx
<AutoTags
  suggestions={autoTags}
  existingTags={note.tags}
  onAddTag={tag => addTag(tag)}
  maxVisible={6}
/>
```

### RelatedNotes

```tsx
<RelatedNotes notes={relatedNotes} onNoteClick={noteId => navigate(noteId)} maxVisible={5} />
```

### NoteSummary

```tsx
<NoteSummary
  summary={summary}
  isLoading={isLoading}
  maxLength="medium"
  onRegenerate={() => regenerateSummary()}
/>
```

## Main Orchestrator

### NoteIntelligence Service

Unified interface for all AI features:

```typescript
import { getNoteIntelligence } from '@/lib/ai/notes';

const intelligence = getNoteIntelligence();

// Initialize (loads embedding model)
await intelligence.initialize((progress, message) => {
  console.log(`[${progress}%] ${message}`);
});

// Analyze a note
const analysis = await intelligence.analyzeNote(note);

// Generate tags
const tags = await intelligence.generateTags(note);

// Get link suggestions
const links = await intelligence.suggestLinks(note, allNotes);

// Find related notes
const related = await intelligence.findRelatedNotes(note, allNotes);

// Summarize
const summary = await intelligence.summarizeNote(note);

// Generate knowledge graph
const graph = await intelligence.generateKnowledgeGraph(notes);

// Get everything at once
const full = await intelligence.getFullIntelligence(note, allNotes);
```

## Design System

All components follow NoteChain's **Warm Editorial Minimalism**:

- **Colors:** Stone palette with amber accents
- **Typography:** Serif headlines, sans-serif body
- **Spacing:** Generous whitespace
- **Animations:** Subtle, never jarring
- **Privacy:** AI indicators clearly marked

## Performance Considerations

### Caching

- Analysis results cached by content hash
- Embeddings cached to avoid regeneration
- Configurable cache duration (default: 1 hour)

### Background Processing

- Batch operations use background processing
- Non-blocking UI updates
- Progress callbacks for long operations

### Memory Management

- Index data cleared when not needed
- Embedding service can be disposed
- Singleton pattern for services

## Privacy-First Design

- All AI processing happens locally
- No data sent to external AI services
- Uses Xenova Transformers.js for embeddings
- Optional local LLM support (via ai-engine)

## Configuration

```typescript
const intelligence = createNoteIntelligence({
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  summarizationModel: 'extractive',
  enableCaching: true,
  cacheDurationMs: 1000 * 60 * 60, // 1 hour
  maxConcurrentAnalyses: 3,
  backgroundProcessing: true,
});
```

## Error Handling

All services handle errors gracefully:

```typescript
try {
  const analysis = await intelligence.analyzeNote(note);
} catch (error) {
  if (error instanceof AIError) {
    console.error(`AI Error [${error.code}]:`, error.message);
  }
}
```

## Integration Points

### With NoteRepository

```typescript
const noteRepo = createNoteRepository(userId, encryptionKey);
const notes = await noteRepo.getAll();

const intelligence = getNoteIntelligence();
await intelligence.indexNotes(notes);
```

### With TipTap Editor

```typescript
// Detect unlinked mentions in editor content
const mentions = await intelligence.findUnlinkedMentions(editor.getText(), allNotes, currentNoteId);

// Convert to links
mentions.forEach(mention => {
  editor.commands.setTextSelection({
    from: mention.position,
    to: mention.position + mention.title.length,
  });
  editor.commands.setLink({ href: `/notes/${mention.noteId}` });
});
```

## File Structure

```
apps/web/src/lib/ai/notes/
├── types.ts                 # TypeScript type definitions
├── NoteAnalyzer.ts          # Content analysis (TF-IDF)
├── AutoTagger.ts           # Automatic tagging
├── LinkSuggester.ts        # Backlink suggestions
├── RelatedNotesFinder.ts   # Similarity search
├── NoteSummarizer.ts       # Content summarization
├── KnowledgeGraphGenerator.ts  # Graph data generation
├── NoteIntelligence.ts     # Main orchestrator
├── index.ts                # Public API exports
└── examples.tsx            # Usage examples

apps/web/src/components/
├── LinkSuggestions.tsx     # Link suggestions UI
├── AutoTags.tsx           # Tag suggestions UI
├── RelatedNotes.tsx       # Related notes sidebar
└── NoteSummary.tsx        # Summary display

apps/web/src/hooks/
├── useNoteAnalysis.ts     # Analysis hook
├── useLinkSuggestions.ts  # Link suggestions hook
└── useRelatedNotes.ts     # Related notes hook
```

## Testing

```typescript
// Test with mock notes
const mockNote: Note = {
  id: 'test-1',
  userId: 'user-1',
  title: 'Project Planning',
  content: 'Working on the new feature implementation...',
  tags: ['work', 'planning'],
  // ... other fields
};

const analyzer = createNoteAnalyzer();
const analysis = await analyzer.analyzeNote(mockNote);

expect(analysis.keywords.length).toBeGreaterThan(0);
expect(analysis.readingTimeMinutes).toBeGreaterThan(0);
```

## Future Enhancements

- [ ] Integration with local LLM for abstractive summarization
- [ ] Real-time analysis during typing
- [ ] Custom embedding model training
- [ ] Advanced graph visualization (D3.js/Force-graph)
- [ ] Multi-language support
- [ ] Image content analysis
- [ ] Voice transcription processing

## License

MIT - See LICENSE for details
