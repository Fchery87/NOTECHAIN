// apps/web/src/lib/ai/notes/RelatedNotesFinder.ts

import type { RelatedNote, RelatedNotesOptions, NoteAnalysis, SemanticSearchResult } from './types';
import type { Note } from '@notechain/data-models';
import { EmbeddingService } from '@notechain/ai-engine';
import { getNoteAnalyzer } from './NoteAnalyzer';

/**
 * RelatedNotesFinder finds semantically similar notes using embeddings
 * and keyword matching for content-based recommendations
 */
export class RelatedNotesFinder {
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
   * Index notes for similarity search
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
   * Find related notes for a given note
   */
  async findRelatedNotes(
    note: Note,
    candidateNotes: Note[],
    options: RelatedNotesOptions = {}
  ): Promise<RelatedNote[]> {
    const {
      maxResults = 5,
      minSimilarity = 0.3,
      includeBacklinks = true,
      timeDecay = true,
    } = options;

    // Filter out the note itself
    const candidates = candidateNotes.filter(n => n.id !== note.id);

    if (candidates.length === 0) {
      return [];
    }

    // Get note analysis
    const noteAnalysis = await this.analyzer.analyzeNote(note);

    // Calculate similarity scores
    const scoredCandidates = await Promise.all(
      candidates.map(async candidate => {
        const score = await this.calculateSimilarityScore(note, noteAnalysis, candidate, {
          timeDecay,
        });
        return { note: candidate, score };
      })
    );

    // Filter and sort
    const validCandidates = scoredCandidates
      .filter(({ score }) => score.similarity >= minSimilarity)
      .sort((a, b) => b.score.similarity - a.score.similarity)
      .slice(0, maxResults);

    // Optionally include backlinks
    const results: RelatedNote[] = [];
    const addedNoteIds = new Set<string>();

    for (const { note: candidate, score } of validCandidates) {
      results.push({
        note: candidate,
        similarityScore: score.similarity,
        matchReason: score.reason,
        sharedKeywords: score.sharedKeywords,
      });
      addedNoteIds.add(candidate.id);
    }

    // Add backlinks if requested and not already included
    if (includeBacklinks) {
      for (const backlink of note.backlinks) {
        if (addedNoteIds.has(backlink.sourceNoteId)) continue;

        const linkedNote = candidates.find(n => n.id === backlink.sourceNoteId);
        if (linkedNote) {
          results.push({
            note: linkedNote,
            similarityScore: 0.95,
            matchReason: 'Directly linked to this note',
            sharedKeywords: [],
          });
          addedNoteIds.add(linkedNote.id);
        }
      }
    }

    // Re-sort with backlinks included
    return results.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  /**
   * Semantic search across notes
   */
  async semanticSearch(
    query: string,
    notes: Note[],
    topK: number = 5,
    threshold: number = 0.3
  ): Promise<SemanticSearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding({ text: query });

    // Ensure all notes are indexed
    const unindexedNotes = notes.filter(n => !this.noteEmbeddings.has(n.id));
    if (unindexedNotes.length > 0) {
      await this.indexNotes(unindexedNotes);
    }

    // Calculate similarities
    const results: SemanticSearchResult[] = [];

    for (const note of notes) {
      const noteEmbedding = this.noteEmbeddings.get(note.id);
      if (!noteEmbedding) continue;

      const similarity = this.embeddingService.cosineSimilarity(
        queryEmbedding.embedding,
        noteEmbedding
      );

      if (similarity >= threshold) {
        results.push({
          note,
          score: similarity,
          matchedContent: this.findRelevantExcerpt(note, query),
        });
      }
    }

    // Sort by score and return top K
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Find notes that share tags
   */
  async findByTagSimilarity(
    note: Note,
    candidateNotes: Note[],
    minSharedTags: number = 1
  ): Promise<RelatedNote[]> {
    const noteTags = new Set(note.tags.map(t => t.toLowerCase()));

    const results: RelatedNote[] = [];

    for (const candidate of candidateNotes) {
      if (candidate.id === note.id) continue;

      const candidateTags = new Set(candidate.tags.map(t => t.toLowerCase()));
      const sharedTags = [...noteTags].filter(t => candidateTags.has(t));

      if (sharedTags.length >= minSharedTags) {
        const similarity = Math.min(1, sharedTags.length / Math.max(noteTags.size, 1));
        results.push({
          note: candidate,
          similarityScore: similarity,
          matchReason: `Shares ${sharedTags.length} tag${sharedTags.length > 1 ? 's' : ''}`,
          sharedKeywords: sharedTags,
        });
      }
    }

    return results.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  /**
   * Find temporal neighbors (notes created around the same time)
   */
  async findTemporalNeighbors(
    note: Note,
    candidateNotes: Note[],
    timeWindowDays: number = 7,
    maxResults: number = 5
  ): Promise<RelatedNote[]> {
    const noteTime = note.createdAt.getTime();
    const windowMs = timeWindowDays * 24 * 60 * 60 * 1000;

    const neighbors = candidateNotes
      .filter(n => {
        if (n.id === note.id) return false;
        const timeDiff = Math.abs(n.createdAt.getTime() - noteTime);
        return timeDiff <= windowMs;
      })
      .map(n => {
        const timeDiff = Math.abs(n.createdAt.getTime() - noteTime);
        const daysDiff = timeDiff / (24 * 60 * 60 * 1000);
        const similarity = Math.max(0, 1 - daysDiff / timeWindowDays);

        return {
          note: n,
          similarityScore: similarity,
          matchReason: `Created ${daysDiff < 1 ? 'the same day' : `${Math.round(daysDiff)} days apart`}`,
          sharedKeywords: [],
        };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, maxResults);

    return neighbors;
  }

  /**
   * Calculate comprehensive similarity score
   */
  private async calculateSimilarityScore(
    note: Note,
    noteAnalysis: NoteAnalysis,
    candidate: Note,
    options: { timeDecay: boolean }
  ): Promise<{ similarity: number; reason: string; sharedKeywords: string[] }> {
    let totalScore = 0;
    const weights = {
      semantic: 0.4,
      keyword: 0.25,
      tag: 0.15,
      entity: 0.1,
      temporal: 0.1,
    };

    // 1. Semantic similarity using embeddings
    let semanticScore = 0;
    const noteEmbedding = this.noteEmbeddings.get(note.id);
    const candidateEmbedding = this.noteEmbeddings.get(candidate.id);

    if (noteEmbedding && candidateEmbedding) {
      semanticScore = this.embeddingService.cosineSimilarity(noteEmbedding, candidateEmbedding);
    } else {
      // Generate on-the-fly if not cached
      try {
        const [noteEmbed, candidateEmbed] = await Promise.all([
          this.embeddingService.generateEmbedding({
            text: `${note.title}\n\n${this.extractPlainText(note.content)}`,
          }),
          this.embeddingService.generateEmbedding({
            text: `${candidate.title}\n\n${this.extractPlainText(candidate.content)}`,
          }),
        ]);
        semanticScore = this.embeddingService.cosineSimilarity(
          noteEmbed.embedding,
          candidateEmbed.embedding
        );
      } catch (error) {
        console.warn('Failed to generate embeddings for similarity:', error);
      }
    }
    totalScore += semanticScore * weights.semantic;

    // 2. Keyword overlap
    const candidateAnalysis = await this.analyzer.analyzeNote(candidate);
    const noteKeywords = new Set(noteAnalysis.keywords.map(k => k.word.toLowerCase()));
    const candidateKeywords = new Set(candidateAnalysis.keywords.map(k => k.word.toLowerCase()));
    const sharedKeywords = [...noteKeywords].filter(k => candidateKeywords.has(k));
    const keywordScore =
      sharedKeywords.length / Math.max(noteKeywords.size, candidateKeywords.size, 1);
    totalScore += keywordScore * weights.keyword;

    // 3. Tag overlap
    const noteTags = new Set(note.tags.map(t => t.toLowerCase()));
    const candidateTags = new Set(candidate.tags.map(t => t.toLowerCase()));
    const sharedTags = [...noteTags].filter(t => candidateTags.has(t));
    const tagScore = sharedTags.length / Math.max(noteTags.size, candidateTags.size, 1);
    totalScore += tagScore * weights.tag;

    // 4. Entity overlap
    const noteEntities = new Set(noteAnalysis.entities.map(e => e.name.toLowerCase()));
    const candidateEntities = new Set(candidateAnalysis.entities.map(e => e.name.toLowerCase()));
    const sharedEntities = [...noteEntities].filter(e => candidateEntities.has(e));
    const entityScore =
      sharedEntities.length / Math.max(noteEntities.size, candidateEntities.size, 1);
    totalScore += entityScore * weights.entity;

    // 5. Temporal proximity
    if (options.timeDecay) {
      const timeDiff = Math.abs(note.createdAt.getTime() - candidate.createdAt.getTime());
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      const temporalScore = Math.max(0, 1 - daysDiff / 30); // Decay over 30 days
      totalScore += temporalScore * weights.temporal;
    }

    // Generate reason
    const reason = this.generateSimilarityReason(
      semanticScore,
      keywordScore,
      tagScore,
      sharedKeywords,
      sharedTags,
      sharedEntities
    );

    return {
      similarity: Math.min(1, totalScore),
      reason,
      sharedKeywords,
    };
  }

  /**
   * Generate human-readable reason for similarity
   */
  private generateSimilarityReason(
    semanticScore: number,
    keywordScore: number,
    tagScore: number,
    sharedKeywords: string[],
    sharedTags: string[],
    sharedEntities: string[]
  ): string {
    const reasons: string[] = [];

    if (semanticScore > 0.7) {
      reasons.push('Highly similar content');
    } else if (semanticScore > 0.5) {
      reasons.push('Related content');
    }

    if (sharedTags.length > 0) {
      const tagStr = sharedTags.slice(0, 2).join(', ');
      reasons.push(`Tagged: ${tagStr}`);
    }

    if (sharedKeywords.length > 0 && keywordScore > 0.3) {
      const keywordStr = sharedKeywords.slice(0, 3).join(', ');
      reasons.push(`Topics: ${keywordStr}`);
    }

    if (sharedEntities.length > 0) {
      const entityStr = sharedEntities.slice(0, 2).join(', ');
      reasons.push(`Mentions: ${entityStr}`);
    }

    return reasons.length > 0 ? reasons.join('; ') : 'Similar content';
  }

  /**
   * Find relevant excerpt from note for search results
   */
  private findRelevantExcerpt(note: Note, query: string): string | undefined {
    const content = this.extractPlainText(note.content);
    const queryLower = query.toLowerCase();
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    // Find sentence with highest word overlap
    let bestSentence = '';
    let bestScore = 0;

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const words = queryLower.split(/\s+/);
      let score = 0;

      for (const word of words) {
        if (word.length > 3 && sentenceLower.includes(word)) {
          score++;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence.trim();
      }
    }

    return bestSentence || sentences[0]?.trim();
  }

  /**
   * Extract plain text from markdown/HTML content
   */
  private extractPlainText(content: string): string {
    return content
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Clear indexed data
   */
  clearIndex(): void {
    this.noteEmbeddings.clear();
    this.noteAnalyses.clear();
  }

  /**
   * Get index statistics
   */
  getStats(): { notesIndexed: number; averageEmbeddingTime: number } {
    return {
      notesIndexed: this.noteEmbeddings.size,
      averageEmbeddingTime: 0, // Could track this if needed
    };
  }
}

// Singleton instance
let defaultFinder: RelatedNotesFinder | null = null;

/**
 * Get or create the default RelatedNotesFinder instance
 */
export function getRelatedNotesFinder(): RelatedNotesFinder {
  if (!defaultFinder) {
    defaultFinder = new RelatedNotesFinder();
  }
  return defaultFinder;
}

/**
 * Create a new RelatedNotesFinder instance
 */
export function createRelatedNotesFinder(embeddingService?: EmbeddingService): RelatedNotesFinder {
  return new RelatedNotesFinder(embeddingService);
}
