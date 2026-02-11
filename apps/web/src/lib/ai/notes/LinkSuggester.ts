// apps/web/src/lib/ai/notes/LinkSuggester.ts

import type { LinkSuggestion, LinkSuggestionOptions, NoteAnalysis } from './types';
import type { Note } from '@notechain/data-models';
import { EmbeddingService } from '@notechain/ai-engine';
import { getNoteAnalyzer } from './NoteAnalyzer';

/**
 * LinkSuggester automatically suggests relevant backlinks between notes
 * Uses a combination of semantic similarity, keyword matching, and entity overlap
 */
export class LinkSuggester {
  private embeddingService: EmbeddingService;
  private analyzer = getNoteAnalyzer();
  private noteEmbeddings: Map<string, number[]> = new Map();
  private noteAnalyses: Map<string, NoteAnalysis> = new Map();

  constructor(embeddingService?: EmbeddingService) {
    this.embeddingService = embeddingService ?? new EmbeddingService();
  }

  /**
   * Initialize the embedding service
   */
  async initialize(): Promise<void> {
    await this.embeddingService.initialize();
  }

  /**
   * Index a collection of notes for link suggestion
   */
  async indexNotes(notes: Note[]): Promise<void> {
    // Generate embeddings for all notes
    const embeddingRequests = notes.map(note => ({
      text: `${note.title}\n\n${this.extractPlainText(note.content)}`,
      batchId: note.id,
    }));

    const embeddings = await this.embeddingService.generateEmbeddingsBatch(embeddingRequests);

    // Store embeddings and analyses
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const embedding = embeddings[i];

      this.noteEmbeddings.set(note.id, embedding.embedding);

      // Analyze note
      const analysis = await this.analyzer.analyzeNote(note);
      this.noteAnalyses.set(note.id, analysis);
    }
  }

  /**
   * Suggest backlinks for a note
   */
  async suggestLinks(
    note: Note,
    candidateNotes: Note[],
    options: LinkSuggestionOptions = {}
  ): Promise<LinkSuggestion[]> {
    const { minConfidence = 0.3, maxSuggestions = 5, includeExisting = false } = options;

    // Filter out the note itself and optionally existing backlinks
    const existingBacklinkIds = new Set(note.backlinks.map(b => b.targetNoteId));
    const filteredCandidates = candidateNotes.filter(
      candidate =>
        candidate.id !== note.id && (includeExisting || !existingBacklinkIds.has(candidate.id))
    );

    if (filteredCandidates.length === 0) {
      return [];
    }

    // Analyze the source note
    const sourceAnalysis = await this.analyzer.analyzeNote(note);

    // Calculate scores for each candidate
    const scoredCandidates = await Promise.all(
      filteredCandidates.map(async candidate => {
        const score = await this.calculateLinkScore(note, sourceAnalysis, candidate);
        return { note: candidate, score };
      })
    );

    // Filter by confidence and sort
    const validSuggestions = scoredCandidates
      .filter(({ score }) => score.confidence >= minConfidence)
      .sort((a, b) => b.score.confidence - a.score.confidence)
      .slice(0, maxSuggestions);

    return validSuggestions.map(({ note: candidate, score }) => ({
      targetNoteId: candidate.id,
      targetNoteTitle: candidate.title,
      context: score.context,
      confidence: score.confidence,
      reason: score.reason,
      suggestedText: this.generateLinkText(note, candidate),
    }));
  }

  /**
   * Find notes that should link to a specific target note
   */
  async findInboundLinkOpportunities(
    targetNote: Note,
    sourceNotes: Note[],
    options: LinkSuggestionOptions = {}
  ): Promise<LinkSuggestion[]> {
    const suggestions: LinkSuggestion[] = [];

    for (const sourceNote of sourceNotes) {
      if (sourceNote.id === targetNote.id) continue;

      // Check if source already links to target
      const alreadyLinks = sourceNote.backlinks.some(b => b.targetNoteId === targetNote.id);
      if (alreadyLinks && !options.includeExisting) continue;

      const sourceSuggestions = await this.suggestLinks(sourceNote, [targetNote], {
        ...options,
        maxSuggestions: 1,
      });

      if (sourceSuggestions.length > 0) {
        suggestions.push(sourceSuggestions[0]);
      }
    }

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, options.maxSuggestions || 10);
  }

  /**
   * Detect unlinked mentions of note titles in content
   */
  async detectUnlinkedMentions(
    content: string,
    notes: Note[],
    currentNoteId?: string
  ): Promise<Array<{ noteId: string; title: string; position: number; context: string }>> {
    const mentions: Array<{ noteId: string; title: string; position: number; context: string }> =
      [];

    for (const note of notes) {
      if (note.id === currentNoteId) continue;

      // Escape special regex characters in title
      const escapedTitle = note.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\b${escapedTitle}\\b`, 'gi');

      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Get context around the mention
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(content.length, match.index + note.title.length + 50);
        const context = content.slice(contextStart, contextEnd);

        mentions.push({
          noteId: note.id,
          title: note.title,
          position: match.index,
          context: `...${context}...`,
        });
      }
    }

    // Sort by position
    return mentions.sort((a, b) => a.position - b.position);
  }

  /**
   * Calculate a comprehensive link score between two notes
   */
  private async calculateLinkScore(
    sourceNote: Note,
    sourceAnalysis: NoteAnalysis,
    targetNote: Note
  ): Promise<{ confidence: number; context: string; reason: string }> {
    let totalScore = 0;
    const weights = {
      semantic: 0.35,
      keyword: 0.25,
      entity: 0.2,
      titleMention: 0.15,
      temporal: 0.05,
    };

    // 1. Semantic similarity using embeddings
    let semanticScore = 0;
    const sourceEmbedding = this.noteEmbeddings.get(sourceNote.id);
    const targetEmbedding = this.noteEmbeddings.get(targetNote.id);

    if (sourceEmbedding && targetEmbedding) {
      semanticScore = this.embeddingService.cosineSimilarity(sourceEmbedding, targetEmbedding);
    } else {
      // Generate embeddings if not cached
      try {
        const [sourceEmbed, targetEmbed] = await Promise.all([
          this.embeddingService.generateEmbedding({
            text: `${sourceNote.title}\n\n${this.extractPlainText(sourceNote.content)}`,
          }),
          this.embeddingService.generateEmbedding({
            text: `${targetNote.title}\n\n${this.extractPlainText(targetNote.content)}`,
          }),
        ]);
        semanticScore = this.embeddingService.cosineSimilarity(
          sourceEmbed.embedding,
          targetEmbed.embedding
        );
      } catch (error) {
        console.warn('Failed to generate embeddings for link scoring:', error);
      }
    }
    totalScore += semanticScore * weights.semantic;

    // 2. Keyword overlap
    const targetAnalysis = await this.analyzer.analyzeNote(targetNote);
    const sourceKeywords = new Set(sourceAnalysis.keywords.map(k => k.word.toLowerCase()));
    const targetKeywords = new Set(targetAnalysis.keywords.map(k => k.word.toLowerCase()));
    const sharedKeywords = [...sourceKeywords].filter(k => targetKeywords.has(k));
    const keywordScore =
      sharedKeywords.length / Math.max(sourceKeywords.size, targetKeywords.size, 1);
    totalScore += keywordScore * weights.keyword;

    // 3. Entity overlap
    const sourceEntities = new Set(sourceAnalysis.entities.map(e => e.name.toLowerCase()));
    const targetEntities = new Set(targetAnalysis.entities.map(e => e.name.toLowerCase()));
    const sharedEntities = [...sourceEntities].filter(e => targetEntities.has(e));
    const entityScore =
      sharedEntities.length / Math.max(sourceEntities.size, targetEntities.size, 1);
    totalScore += entityScore * weights.entity;

    // 4. Title mention in content
    let titleMentionScore = 0;
    const targetTitlePattern = new RegExp(
      `\\b${targetNote.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      'gi'
    );
    const titleMentions = (sourceNote.content.match(targetTitlePattern) || []).length;
    if (titleMentions > 0) {
      titleMentionScore = Math.min(1, titleMentions / 3); // Cap at 3 mentions
    }
    totalScore += titleMentionScore * weights.titleMention;

    // 5. Temporal proximity (notes created close together are more likely related)
    const timeDiff = Math.abs(sourceNote.createdAt.getTime() - targetNote.createdAt.getTime());
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    const temporalScore = Math.max(0, 1 - daysDiff / 30); // Decay over 30 days
    totalScore += temporalScore * weights.temporal;

    // Generate context and reason
    const context = this.generateContext(sourceNote, targetNote, sharedKeywords, sharedEntities);
    const reason = this.generateReason(
      semanticScore,
      keywordScore,
      entityScore,
      titleMentionScore,
      sharedKeywords,
      sharedEntities
    );

    return {
      confidence: Math.min(1, totalScore),
      context,
      reason,
    };
  }

  /**
   * Generate context for a link suggestion
   */
  private generateContext(
    sourceNote: Note,
    targetNote: Note,
    sharedKeywords: string[],
    sharedEntities: string[]
  ): string {
    const contexts: string[] = [];

    // Find relevant content from source note
    const sourceContent = this.extractPlainText(sourceNote.content);
    const sentences = sourceContent.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Look for sentences that mention target or contain shared keywords
    for (const sentence of sentences.slice(0, 3)) {
      const lowerSentence = sentence.toLowerCase();
      const hasRelevance =
        lowerSentence.includes(targetNote.title.toLowerCase()) ||
        sharedKeywords.some(kw => lowerSentence.includes(kw.toLowerCase())) ||
        sharedEntities.some(ent => lowerSentence.includes(ent.toLowerCase()));

      if (hasRelevance && contexts.length < 2) {
        contexts.push(sentence.trim());
      }
    }

    return contexts.length > 0 ? contexts.join('. ') + '.' : `Related to "${targetNote.title}"`;
  }

  /**
   * Generate human-readable reason for the suggestion
   */
  private generateReason(
    semanticScore: number,
    keywordScore: number,
    entityScore: number,
    titleMentionScore: number,
    sharedKeywords: string[],
    sharedEntities: string[]
  ): string {
    const reasons: string[] = [];

    if (semanticScore > 0.7) {
      reasons.push('Highly semantically similar');
    } else if (semanticScore > 0.5) {
      reasons.push('Semantically related');
    }

    if (titleMentionScore > 0) {
      reasons.push('Title mentioned in content');
    }

    if (sharedKeywords.length > 0) {
      const topKeywords = sharedKeywords.slice(0, 3).join(', ');
      reasons.push(`Shared topics: ${topKeywords}`);
    }

    if (sharedEntities.length > 0) {
      const topEntities = sharedEntities.slice(0, 2).join(', ');
      reasons.push(`Common references: ${topEntities}`);
    }

    return reasons.length > 0 ? reasons.join('; ') : 'Potentially related content';
  }

  /**
   * Generate suggested link text
   */
  private generateLinkText(sourceNote: Note, targetNote: Note): string {
    // Default to target note title
    return targetNote.title;
  }

  /**
   * Extract plain text from markdown/HTML content
   */
  private extractPlainText(content: string): string {
    return (
      content
        // Remove markdown links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove markdown images
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
        // Remove HTML tags
        .replace(/<[^>]+>/g, ' ')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, ' ')
        // Remove inline code
        .replace(/`[^`]+`/g, ' ')
        // Remove markdown headings
        .replace(/^#{1,6}\s+/gm, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Clear indexed data
   */
  clearIndex(): void {
    this.noteEmbeddings.clear();
    this.noteAnalyses.clear();
  }

  /**
   * Get number of indexed notes
   */
  getIndexedCount(): number {
    return this.noteEmbeddings.size;
  }
}

// Singleton instance
let defaultSuggester: LinkSuggester | null = null;

/**
 * Get or create the default LinkSuggester instance
 */
export function getLinkSuggester(): LinkSuggester {
  if (!defaultSuggester) {
    defaultSuggester = new LinkSuggester();
  }
  return defaultSuggester;
}

/**
 * Create a new LinkSuggester instance with custom embedding service
 */
export function createLinkSuggester(embeddingService?: EmbeddingService): LinkSuggester {
  return new LinkSuggester(embeddingService);
}
