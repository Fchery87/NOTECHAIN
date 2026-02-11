// apps/web/src/lib/ai/notes/types.ts

import type { Note } from '@notechain/data-models';

/**
 * Represents a keyword extracted from note content with its importance score
 */
export interface ExtractedKeyword {
  word: string;
  score: number;
  frequency: number;
}

/**
 * Result of analyzing note content
 */
export interface NoteAnalysis {
  noteId: string;
  keywords: ExtractedKeyword[];
  entities: ExtractedEntity[];
  sentiment: SentimentScore;
  readingTimeMinutes: number;
  contentStructure: ContentStructure;
  analyzedAt: Date;
}

/**
 * Named entity extracted from content (people, places, organizations, etc.)
 */
export interface ExtractedEntity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'concept' | 'date' | 'url';
  confidence: number;
}

/**
 * Sentiment analysis result
 */
export interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
  overall: 'positive' | 'negative' | 'neutral';
}

/**
 * Structure analysis of note content
 */
export interface ContentStructure {
  hasHeadings: boolean;
  headingCount: number;
  hasLists: boolean;
  listCount: number;
  hasCodeBlocks: boolean;
  codeBlockCount: number;
  hasImages: boolean;
  imageCount: number;
  wordCount: number;
  paragraphCount: number;
}

/**
 * Suggested backlink with confidence score
 */
export interface LinkSuggestion {
  targetNoteId: string;
  targetNoteTitle: string;
  context: string;
  confidence: number;
  reason: string;
  suggestedText: string;
}

/**
 * Auto-generated tag with relevance score
 */
export interface AutoTag {
  name: string;
  confidence: number;
  source: 'keyword' | 'entity' | 'category' | 'ai';
  category?: string;
}

/**
 * Related note with similarity score
 */
export interface RelatedNote {
  note: Note;
  similarityScore: number;
  matchReason: string;
  sharedKeywords: string[];
}

/**
 * Note summary with different lengths
 */
export interface NoteSummary {
  noteId: string;
  brief: string; // 1-2 sentences
  medium: string; // 3-5 sentences
  detailed: string; // Paragraph
  keyPoints: string[];
  generatedAt: Date;
}

/**
 * Knowledge graph node representing a note
 */
export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'note' | 'tag' | 'concept';
  size: number; // Based on connections or importance
  color: string;
  metadata: {
    wordCount: number;
    createdAt: Date;
    tagCount: number;
    backlinkCount: number;
  };
}

/**
 * Knowledge graph edge representing relationships
 */
export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  type: 'backlink' | 'tag' | 'similarity' | 'temporal';
  weight: number;
  label?: string;
}

/**
 * Complete knowledge graph data
 */
export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  clusters: GraphCluster[];
}

/**
 * Cluster of related notes in the knowledge graph
 */
export interface GraphCluster {
  id: string;
  label: string;
  nodeIds: string[];
  centroid: { x: number; y: number };
  color: string;
}

/**
 * Options for note analysis
 */
export interface NoteAnalysisOptions {
  extractKeywords?: boolean;
  extractEntities?: boolean;
  analyzeSentiment?: boolean;
  analyzeStructure?: boolean;
  maxKeywords?: number;
}

/**
 * Options for link suggestions
 */
export interface LinkSuggestionOptions {
  minConfidence?: number;
  maxSuggestions?: number;
  includeExisting?: boolean;
}

/**
 * Options for auto-tagging
 */
export interface AutoTagOptions {
  maxTags?: number;
  minConfidence?: number;
  includeExisting?: boolean;
  categories?: string[];
}

/**
 * Options for finding related notes
 */
export interface RelatedNotesOptions {
  maxResults?: number;
  minSimilarity?: number;
  includeBacklinks?: boolean;
  timeDecay?: boolean;
}

/**
 * Options for summarization
 */
export interface SummarizationOptions {
  maxLength?: 'brief' | 'medium' | 'detailed';
  focusOn?: string[];
  extractKeyPoints?: boolean;
}

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Result of batch processing multiple notes
 */
export interface BatchAnalysisResult {
  totalNotes: number;
  processedNotes: number;
  failedNotes: number;
  results: Map<string, NoteAnalysis>;
  errors: Map<string, Error>;
}

/**
 * Vector embedding for a note (for similarity search)
 */
export interface NoteEmbedding {
  noteId: string;
  embedding: number[];
  model: string;
  createdAt: Date;
}

/**
 * Search result with relevance scoring
 */
export interface SemanticSearchResult {
  note: Note;
  score: number;
  matchedContent?: string;
}

/**
 * Text chunk for processing long notes
 */
export interface TextChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  metadata: Record<string, any>;
}

/**
 * Cache entry for analysis results
 */
export interface AnalysisCacheEntry {
  analysis: NoteAnalysis;
  contentHash: string;
  expiresAt: Date;
}

/**
 * Configuration for the note intelligence system
 */
export interface NoteIntelligenceConfig {
  embeddingModel?: string;
  summarizationModel?: string;
  enableCaching?: boolean;
  cacheDurationMs?: number;
  maxConcurrentAnalyses?: number;
  backgroundProcessing?: boolean;
}
