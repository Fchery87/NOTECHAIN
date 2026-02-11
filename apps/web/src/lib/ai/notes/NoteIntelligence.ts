// apps/web/src/lib/ai/notes/NoteIntelligence.ts
/**
 * NoteIntelligence Service
 *
 * Main orchestrator for all note AI features.
 * Provides a unified API for note analysis, tagging, linking, and summarization.
 *
 * Features:
 * - Content analysis (keywords, entities, sentiment, structure)
 * - Automatic tag generation
 * - Smart backlink suggestions
 * - Related notes discovery
 * - Content summarization
 * - Knowledge graph generation
 * - Background processing for large operations
 */

import type {
  NoteAnalysis,
  AutoTag,
  LinkSuggestion,
  RelatedNote,
  NoteSummary,
  KnowledgeGraph,
  NoteAnalysisOptions,
  AutoTagOptions,
  LinkSuggestionOptions,
  RelatedNotesOptions,
  SummarizationOptions,
  BatchAnalysisResult,
  NoteIntelligenceConfig,
  ProgressCallback,
} from './types';
import type { Note } from '@notechain/data-models';
import { EmbeddingService } from '@notechain/ai-engine';
import { getNoteAnalyzer, createNoteAnalyzer } from './NoteAnalyzer';
import { getAutoTagger, createAutoTagger } from './AutoTagger';
import { getLinkSuggester, createLinkSuggester } from './LinkSuggester';
import { getRelatedNotesFinder, createRelatedNotesFinder } from './RelatedNotesFinder';
import { getNoteSummarizer, createNoteSummarizer } from './NoteSummarizer';
import {
  getKnowledgeGraphGenerator,
  createKnowledgeGraphGenerator,
} from './KnowledgeGraphGenerator';

/**
 * NoteIntelligence provides a unified interface for all AI-powered
 * note analysis and intelligence features.
 */
export class NoteIntelligence {
  private config: Required<NoteIntelligenceConfig>;
  private analyzer: ReturnType<typeof getNoteAnalyzer>;
  private tagger: ReturnType<typeof getAutoTagger>;
  private linkSuggester: ReturnType<typeof getLinkSuggester>;
  private relatedNotesFinder: ReturnType<typeof getRelatedNotesFinder>;
  private summarizer: ReturnType<typeof getNoteSummarizer>;
  private graphGenerator: ReturnType<typeof getKnowledgeGraphGenerator>;
  private embeddingService: EmbeddingService;

  // Analysis cache
  private analysisCache: Map<string, { analysis: NoteAnalysis; timestamp: number }> = new Map();

  constructor(config: NoteIntelligenceConfig = {}) {
    this.config = {
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      summarizationModel: 'extractive',
      enableCaching: true,
      cacheDurationMs: 1000 * 60 * 60, // 1 hour
      maxConcurrentAnalyses: 3,
      backgroundProcessing: true,
      ...config,
    };

    // Initialize services
    this.analyzer = createNoteAnalyzer(this.config.cacheDurationMs);
    this.tagger = createAutoTagger();
    this.embeddingService = new EmbeddingService({
      modelId: this.config.embeddingModel,
    });
    this.linkSuggester = createLinkSuggester(this.embeddingService);
    this.relatedNotesFinder = createRelatedNotesFinder(this.embeddingService);
    this.summarizer = createNoteSummarizer();
    this.graphGenerator = createKnowledgeGraphGenerator();
  }

  /**
   * Initialize all AI services
   */
  async initialize(onProgress?: ProgressCallback): Promise<void> {
    onProgress?.(0, 'Initializing AI services...');

    // Initialize embedding service (loads model)
    await this.embeddingService.initialize();
    onProgress?.(30, 'Embedding model loaded');

    // Initialize other services
    await this.linkSuggester.initialize();
    onProgress?.(50, 'Link suggester ready');

    await this.relatedNotesFinder.initialize();
    onProgress?.(70, 'Related notes finder ready');

    onProgress?.(100, 'All AI services initialized');
  }

  /**
   * Comprehensive note analysis
   */
  async analyzeNote(note: Note, options: NoteAnalysisOptions = {}): Promise<NoteAnalysis> {
    // Check cache
    if (this.config.enableCaching) {
      const cached = this.getCachedAnalysis(note.id);
      if (cached) return cached;
    }

    const analysis = await this.analyzer.analyzeNote(note, options);

    // Cache result
    if (this.config.enableCaching) {
      this.cacheAnalysis(note.id, analysis);
    }

    return analysis;
  }

  /**
   * Generate automatic tags for a note
   */
  async generateTags(note: Note, options: AutoTagOptions = {}): Promise<AutoTag[]> {
    return this.tagger.generateTags(note, options);
  }

  /**
   * Suggest backlinks for a note
   */
  async suggestLinks(
    note: Note,
    candidateNotes: Note[],
    options: LinkSuggestionOptions = {}
  ): Promise<LinkSuggestion[]> {
    return this.linkSuggester.suggestLinks(note, candidateNotes, options);
  }

  /**
   * Find related notes
   */
  async findRelatedNotes(
    note: Note,
    candidateNotes: Note[],
    options: RelatedNotesOptions = {}
  ): Promise<RelatedNote[]> {
    return this.relatedNotesFinder.findRelatedNotes(note, candidateNotes, options);
  }

  /**
   * Summarize note content
   */
  async summarizeNote(note: Note, options: SummarizationOptions = {}): Promise<NoteSummary> {
    return this.summarizer.summarize(note, options);
  }

  /**
   * Generate knowledge graph
   */
  async generateKnowledgeGraph(
    notes: Note[],
    options: {
      includeTags?: boolean;
      includeSimilarity?: boolean;
      minSimilarity?: number;
      maxNodes?: number;
    } = {}
  ): Promise<KnowledgeGraph> {
    return this.graphGenerator.generateGraph(notes, options);
  }

  /**
   * Generate focused knowledge graph around a note
   */
  async generateFocusedKnowledgeGraph(
    centerNote: Note,
    allNotes: Note[],
    depth: number = 2
  ): Promise<KnowledgeGraph> {
    return this.graphGenerator.generateFocusedGraph(centerNote, allNotes, depth);
  }

  /**
   * Batch analyze multiple notes
   */
  async batchAnalyze(
    notes: Note[],
    options: NoteAnalysisOptions = {},
    onProgress?: ProgressCallback
  ): Promise<BatchAnalysisResult> {
    const results = new Map<string, NoteAnalysis>();
    const errors = new Map<string, Error>();

    const total = notes.length;
    let processed = 0;

    // Process in batches
    const batchSize = this.config.maxConcurrentAnalyses;
    for (let i = 0; i < notes.length; i += batchSize) {
      const batch = notes.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async note => {
          try {
            const analysis = await this.analyzeNote(note, options);
            results.set(note.id, analysis);
          } catch (error) {
            errors.set(note.id, error instanceof Error ? error : new Error(String(error)));
          }
          processed++;
        })
      );

      onProgress?.(Math.round((processed / total) * 100), `Analyzed ${processed}/${total} notes`);
    }

    return {
      totalNotes: total,
      processedNotes: results.size,
      failedNotes: errors.size,
      results,
      errors,
    };
  }

  /**
   * Batch generate tags for multiple notes
   */
  async batchGenerateTags(
    notes: Note[],
    options: AutoTagOptions = {}
  ): Promise<Map<string, AutoTag[]>> {
    return this.tagger.generateTagsBatch(notes, options);
  }

  /**
   * Semantic search across notes
   */
  async semanticSearch(
    query: string,
    notes: Note[],
    topK: number = 5,
    threshold: number = 0.3
  ): Promise<Array<{ note: Note; score: number; excerpt?: string }>> {
    return this.relatedNotesFinder.semanticSearch(query, notes, topK, threshold);
  }

  /**
   * Find unlinked mentions in content
   */
  async findUnlinkedMentions(
    content: string,
    notes: Note[],
    currentNoteId?: string
  ): Promise<Array<{ noteId: string; title: string; position: number; context: string }>> {
    return this.linkSuggester.detectUnlinkedMentions(content, notes, currentNoteId);
  }

  /**
   * Index notes for similarity search and linking
   */
  async indexNotes(notes: Note[]): Promise<void> {
    await Promise.all([
      this.linkSuggester.indexNotes(notes),
      this.relatedNotesFinder.indexNotes(notes),
    ]);
  }

  /**
   * Background analysis - analyzes notes without blocking UI
   */
  async analyzeInBackground(
    notes: Note[],
    options: NoteAnalysisOptions = {},
    onProgress?: ProgressCallback
  ): Promise<void> {
    if (!this.config.backgroundProcessing) {
      await this.batchAnalyze(notes, options, onProgress);
      return;
    }

    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleWork =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? window.requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 1);

    let processed = 0;
    const total = notes.length;

    for (const note of notes) {
      await new Promise<void>(resolve => {
        scheduleWork(() => {
          this.analyzeNote(note, options).catch(console.error);
          processed++;
          onProgress?.(
            Math.round((processed / total) * 100),
            `Background analysis: ${processed}/${total}`
          );
          resolve();
        });
      });
    }
  }

  /**
   * Get all intelligence for a note in one call
   */
  async getFullIntelligence(
    note: Note,
    allNotes: Note[],
    options: {
      includeTags?: boolean;
      includeLinks?: boolean;
      includeRelated?: boolean;
      includeSummary?: boolean;
    } = {}
  ): Promise<{
    analysis: NoteAnalysis;
    tags?: AutoTag[];
    linkSuggestions?: LinkSuggestion[];
    relatedNotes?: RelatedNote[];
    summary?: NoteSummary;
  }> {
    const {
      includeTags = true,
      includeLinks = true,
      includeRelated = true,
      includeSummary = true,
    } = options;

    const [analysis, tags, linkSuggestions, relatedNotes, summary] = await Promise.all([
      this.analyzeNote(note),
      includeTags ? this.generateTags(note) : Promise.resolve([]),
      includeLinks ? this.suggestLinks(note, allNotes) : Promise.resolve([]),
      includeRelated ? this.findRelatedNotes(note, allNotes) : Promise.resolve([]),
      includeSummary ? this.summarizeNote(note) : Promise.resolve(undefined),
    ]);

    return {
      analysis,
      tags: includeTags ? tags : undefined,
      linkSuggestions: includeLinks ? linkSuggestions : undefined,
      relatedNotes: includeRelated ? relatedNotes : undefined,
      summary: includeSummary ? summary : undefined,
    };
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.embeddingService.isReady();
  }

  /**
   * Get configuration
   */
  getConfig(): NoteIntelligenceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NoteIntelligenceConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.analysisCache.clear();
    this.analyzer.clearCache();
    this.embeddingService.clearCache();
    this.linkSuggester.clearIndex();
    this.relatedNotesFinder.clearIndex();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCaches();
    this.embeddingService.dispose();
  }

  // Private methods

  private getCachedAnalysis(noteId: string): NoteAnalysis | null {
    const cached = this.analysisCache.get(noteId);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.config.cacheDurationMs;
    if (isExpired) {
      this.analysisCache.delete(noteId);
      return null;
    }

    return cached.analysis;
  }

  private cacheAnalysis(noteId: string, analysis: NoteAnalysis): void {
    this.analysisCache.set(noteId, {
      analysis,
      timestamp: Date.now(),
    });
  }
}

// Singleton instance
let defaultIntelligence: NoteIntelligence | null = null;

/**
 * Get or create the default NoteIntelligence instance
 */
export function getNoteIntelligence(config?: NoteIntelligenceConfig): NoteIntelligence {
  if (!defaultIntelligence) {
    defaultIntelligence = new NoteIntelligence(config);
  }
  return defaultIntelligence;
}

/**
 * Create a new NoteIntelligence instance
 */
export function createNoteIntelligence(config?: NoteIntelligenceConfig): NoteIntelligence {
  return new NoteIntelligence(config);
}

// Re-export all types
export * from './types';

// Re-export all services
export {
  getNoteAnalyzer,
  createNoteAnalyzer,
  getAutoTagger,
  createAutoTagger,
  getLinkSuggester,
  createLinkSuggester,
  getRelatedNotesFinder,
  createRelatedNotesFinder,
  getNoteSummarizer,
  createNoteSummarizer,
  getKnowledgeGraphGenerator,
  createKnowledgeGraphGenerator,
} from './';
