// apps/web/src/lib/ai/notes/index.ts
/**
 * Note Intelligence Module
 *
 * AI-powered note analysis and intelligence features for NoteChain.
 *
 * Features:
 * - Content analysis (keywords, entities, sentiment, structure)
 * - Automatic tag generation
 * - Smart backlink suggestions
 * - Related notes discovery
 * - Content summarization
 * - Knowledge graph generation
 */

// Core services
export { NoteAnalyzer, getNoteAnalyzer, createNoteAnalyzer } from './NoteAnalyzer';
export { AutoTagger, getAutoTagger, createAutoTagger } from './AutoTagger';
export { LinkSuggester, getLinkSuggester, createLinkSuggester } from './LinkSuggester';
export {
  RelatedNotesFinder,
  getRelatedNotesFinder,
  createRelatedNotesFinder,
} from './RelatedNotesFinder';
export { NoteSummarizer, getNoteSummarizer, createNoteSummarizer } from './NoteSummarizer';
export {
  KnowledgeGraphGenerator,
  getKnowledgeGraphGenerator,
  createKnowledgeGraphGenerator,
} from './KnowledgeGraphGenerator';
export { NoteIntelligence, getNoteIntelligence, createNoteIntelligence } from './NoteIntelligence';

// Types
export type {
  ExtractedKeyword,
  NoteAnalysis,
  ExtractedEntity,
  SentimentScore,
  ContentStructure,
  LinkSuggestion,
  AutoTag,
  RelatedNote,
  NoteSummary,
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  KnowledgeGraph,
  GraphCluster,
  NoteAnalysisOptions,
  LinkSuggestionOptions,
  AutoTagOptions,
  RelatedNotesOptions,
  SummarizationOptions,
  ProgressCallback,
  BatchAnalysisResult,
  NoteEmbedding,
  SemanticSearchResult,
  TextChunk,
  AnalysisCacheEntry,
  NoteIntelligenceConfig,
} from './types';
