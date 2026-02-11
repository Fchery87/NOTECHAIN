// apps/web/src/lib/ai/notes/NoteAnalyzer.ts

import type {
  NoteAnalysis,
  ExtractedKeyword,
  ExtractedEntity,
  SentimentScore,
  ContentStructure,
  NoteAnalysisOptions,
  TextChunk,
  AnalysisCacheEntry,
} from './types';
import type { Note } from '@notechain/data-models';

/**
 * Default stop words to filter out from keyword extraction
 */
const DEFAULT_STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'can',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'my',
  'your',
  'his',
  'her',
  'its',
  'our',
  'their',
  'what',
  'which',
  'who',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'now',
  'then',
  'here',
  'there',
  'up',
  'down',
  'out',
  'off',
  'over',
  'under',
  'again',
  'further',
  'once',
  'me',
  'him',
  'them',
  'us',
  'am',
  'get',
  'got',
  'go',
  'went',
  'going',
  'make',
  'made',
  'making',
  'take',
  'took',
  'taking',
  'come',
  'came',
  'coming',
  'see',
  'saw',
  'seen',
  'know',
  'knew',
  'known',
  'think',
  'thought',
  'say',
  'said',
  'saying',
  'want',
  'wanted',
  'use',
  'used',
  'using',
  'find',
  'found',
  'finding',
  'give',
  'gave',
  'given',
  'told',
  'tell',
  'telling',
  'ask',
  'asked',
  'asking',
  'seem',
  'seemed',
  'seeming',
  'feel',
  'felt',
  'feeling',
  'try',
  'tried',
  'trying',
  'leave',
  'left',
  'leaving',
  'call',
  'called',
  'calling',
  'good',
  'new',
  'first',
  'last',
  'long',
  'great',
  'little',
  'own',
  'other',
  'old',
  'right',
  'big',
  'high',
  'different',
  'small',
  'large',
  'next',
  'early',
  'young',
  'important',
  'few',
  'public',
  'bad',
  'same',
  'able',
]);

/**
 * Positive sentiment words
 */
const POSITIVE_WORDS = new Set([
  'good',
  'great',
  'excellent',
  'amazing',
  'wonderful',
  'fantastic',
  'awesome',
  'best',
  'love',
  'like',
  'happy',
  'joy',
  'excited',
  'pleased',
  'satisfied',
  'success',
  'successful',
  'win',
  'winning',
  'achieve',
  'accomplished',
  'proud',
  'beautiful',
  'perfect',
  'brilliant',
  'outstanding',
  'superb',
  'magnificent',
  'positive',
  'optimistic',
  'hopeful',
  'confident',
  'grateful',
  'thankful',
  'benefit',
  'beneficial',
  'helpful',
  'useful',
  'effective',
  'efficient',
  'improve',
  'improved',
  'better',
  'progress',
  'advance',
  'growth',
  'gain',
]);

/**
 * Negative sentiment words
 */
const NEGATIVE_WORDS = new Set([
  'bad',
  'terrible',
  'awful',
  'horrible',
  'worst',
  'hate',
  'dislike',
  'angry',
  'sad',
  'unhappy',
  'disappointed',
  'frustrated',
  'annoyed',
  'upset',
  'worried',
  'fail',
  'failed',
  'failure',
  'lose',
  'losing',
  'loss',
  'mistake',
  'error',
  'problem',
  'issue',
  'trouble',
  'difficult',
  'hard',
  'challenge',
  'obstacle',
  'negative',
  'pessimistic',
  'hopeless',
  'doubt',
  'fear',
  'afraid',
  'anxious',
  'harm',
  'harmful',
  'damage',
  'damaged',
  'break',
  'broken',
  'wrong',
  'incorrect',
  'worse',
  'decline',
  'decrease',
  'drop',
  'fall',
  'reduce',
  'difficulty',
  'struggle',
]);

/**
 * NoteAnalyzer provides content analysis capabilities
 * Uses TF-IDF and heuristic methods for keyword extraction and sentiment analysis
 */
export class NoteAnalyzer {
  private stopWords: Set<string>;
  private documentFrequency: Map<string, number>;
  private totalDocuments: number;
  private cache: Map<string, AnalysisCacheEntry>;
  private cacheDurationMs: number;

  constructor(cacheDurationMs: number = 1000 * 60 * 60) {
    this.stopWords = DEFAULT_STOP_WORDS;
    this.documentFrequency = new Map();
    this.totalDocuments = 0;
    this.cache = new Map();
    this.cacheDurationMs = cacheDurationMs;
  }

  /**
   * Analyze a note's content
   */
  async analyzeNote(note: Note, options: NoteAnalysisOptions = {}): Promise<NoteAnalysis> {
    const {
      extractKeywords = true,
      extractEntities = true,
      analyzeSentiment = true,
      analyzeStructure = true,
      maxKeywords = 10,
    } = options;

    // Check cache
    const cached = this.getCachedAnalysis(note.id, note.contentHash);
    if (cached) {
      return cached;
    }

    const analysis: NoteAnalysis = {
      noteId: note.id,
      keywords: [],
      entities: [],
      sentiment: { positive: 0, negative: 0, neutral: 100, overall: 'neutral' },
      readingTimeMinutes: 0,
      contentStructure: {
        hasHeadings: false,
        headingCount: 0,
        hasLists: false,
        listCount: 0,
        hasCodeBlocks: false,
        codeBlockCount: 0,
        hasImages: false,
        imageCount: 0,
        wordCount: 0,
        paragraphCount: 0,
      },
      analyzedAt: new Date(),
    };

    // Combine title and content for analysis
    const fullText = `${note.title}\n\n${note.content}`;

    if (extractKeywords) {
      analysis.keywords = await this.extractKeywords(fullText, maxKeywords);
    }

    if (extractEntities) {
      analysis.entities = this.extractEntities(fullText);
    }

    if (analyzeSentiment) {
      analysis.sentiment = this.analyzeSentiment(fullText);
    }

    if (analyzeStructure) {
      analysis.contentStructure = this.analyzeStructure(fullText);
    }

    // Calculate reading time (average 200 words per minute)
    analysis.readingTimeMinutes = Math.max(1, Math.ceil(analysis.contentStructure.wordCount / 200));

    // Cache the result
    this.cacheAnalysis(note.id, note.contentHash, analysis);

    return analysis;
  }

  /**
   * Extract keywords using TF-IDF algorithm
   */
  async extractKeywords(text: string, maxKeywords: number = 10): Promise<ExtractedKeyword[]> {
    // Tokenize and clean text
    const tokens = this.tokenize(text);

    // Calculate term frequency
    const termFrequency = this.calculateTermFrequency(tokens);

    // Calculate TF-IDF scores
    const tfidfScores = new Map<string, number>();

    for (const [term, tf] of termFrequency) {
      const idf = this.calculateIDF(term);
      const tfidf = tf * idf;
      tfidfScores.set(term, tfidf);
    }

    // Sort by score and return top keywords
    const sortedKeywords = Array.from(tfidfScores.entries())
      .filter(([term]) => !this.stopWords.has(term.toLowerCase()) && term.length > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word, score]) => ({
        word,
        score,
        frequency: termFrequency.get(word) || 0,
      }));

    return sortedKeywords;
  }

  /**
   * Extract named entities from text using pattern matching
   */
  extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const foundEntities = new Set<string>();

    // Extract URLs
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    const urls = text.match(urlPattern) || [];
    for (const url of urls) {
      if (!foundEntities.has(url)) {
        entities.push({
          name: url,
          type: 'url',
          confidence: 0.95,
        });
        foundEntities.add(url);
      }
    }

    // Extract dates (various formats)
    const datePatterns = [
      /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g,
      /\b(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/g,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4}\b/gi,
      /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi,
    ];

    for (const pattern of datePatterns) {
      const matches = text.match(pattern) || [];
      for (const match of matches) {
        const normalized = match.toLowerCase().trim();
        if (!foundEntities.has(normalized)) {
          entities.push({
            name: match,
            type: 'date',
            confidence: 0.8,
          });
          foundEntities.add(normalized);
        }
      }
    }

    // Extract people (capitalized words following common titles)
    const personPattern = /\b(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+([A-Z][a-z]+)\b/g;
    let match;
    while ((match = personPattern.exec(text)) !== null) {
      const fullName = match[0];
      if (!foundEntities.has(fullName)) {
        entities.push({
          name: fullName,
          type: 'person',
          confidence: 0.75,
        });
        foundEntities.add(fullName);
      }
    }

    // Extract organizations (common suffixes)
    const orgPattern =
      /\b([A-Z][a-zA-Z]+\s)*(Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|LLC|Company|Co\.|Foundation|Institute|University|College|School|Organization)\b/g;
    while ((match = orgPattern.exec(text)) !== null) {
      const org = match[0];
      if (!foundEntities.has(org) && org.length > 3) {
        entities.push({
          name: org,
          type: 'organization',
          confidence: 0.7,
        });
        foundEntities.add(org);
      }
    }

    // Extract locations (common location indicators)
    const locationPattern = /\b(in|at|from)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;
    while ((match = locationPattern.exec(text)) !== null) {
      const location = match[2];
      if (!foundEntities.has(location) && location.length > 2) {
        entities.push({
          name: location,
          type: 'location',
          confidence: 0.6,
        });
        foundEntities.add(location);
      }
    }

    // Extract concepts (capitalized phrases that appear multiple times)
    const conceptPattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;
    const conceptCounts = new Map<string, number>();
    while ((match = conceptPattern.exec(text)) !== null) {
      const concept = match[1];
      if (concept && concept.length > 3) {
        conceptCounts.set(concept, (conceptCounts.get(concept) || 0) + 1);
      }
    }

    for (const [concept, count] of conceptCounts) {
      if (count >= 2 && !foundEntities.has(concept)) {
        entities.push({
          name: concept,
          type: 'concept',
          confidence: Math.min(0.9, 0.5 + count * 0.1),
        });
        foundEntities.add(concept);
      }
    }

    return entities.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze sentiment of text
   */
  analyzeSentiment(text: string): SentimentScore {
    const tokens = this.tokenize(text.toLowerCase());

    let positiveCount = 0;
    let negativeCount = 0;

    for (const token of tokens) {
      if (POSITIVE_WORDS.has(token)) {
        positiveCount++;
      } else if (NEGATIVE_WORDS.has(token)) {
        negativeCount++;
      }
    }

    // Calculate percentages
    const total = tokens.length || 1;
    const positive = (positiveCount / total) * 100;
    const negative = (negativeCount / total) * 100;
    const neutral = 100 - positive - negative;

    // Determine overall sentiment
    let overall: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positive > negative && positive > 5) {
      overall = 'positive';
    } else if (negative > positive && negative > 5) {
      overall = 'negative';
    }

    return {
      positive: Math.round(positive * 10) / 10,
      negative: Math.round(negative * 10) / 10,
      neutral: Math.round(neutral * 10) / 10,
      overall,
    };
  }

  /**
   * Analyze structure of note content
   */
  analyzeStructure(text: string): ContentStructure {
    // Count headings (markdown style)
    const headingPattern = /^#{1,6}\s+.+$/gm;
    const headings = text.match(headingPattern) || [];

    // Count lists
    const listPattern = /^[\s]*[-*+]\s+.+$|^\s*\d+\.\s+.+$/gm;
    const lists = text.match(listPattern) || [];

    // Count code blocks
    const codeBlockPattern = /```[\s\S]*?```|`[^`]+`/g;
    const codeBlocks = text.match(codeBlockPattern) || [];

    // Count images (markdown and HTML)
    const imagePattern = /!\[.*?\]\(.*?\)|<img[^>]+>/gi;
    const images = text.match(imagePattern) || [];

    // Count paragraphs (non-empty lines that aren't special elements)
    const lines = text.split('\n');
    const paragraphs = lines.filter(
      line =>
        line.trim().length > 0 &&
        !line.match(/^#{1,6}\s/) &&
        !line.match(/^[\s]*[-*+]\s/) &&
        !line.match(/^\s*\d+\.\s/)
    ).length;

    // Count words
    const words = text.split(/\s+/).filter(w => w.length > 0);

    return {
      hasHeadings: headings.length > 0,
      headingCount: headings.length,
      hasLists: lists.length > 0,
      listCount: lists.length,
      hasCodeBlocks: codeBlocks.length > 0,
      codeBlockCount: codeBlocks.length,
      hasImages: images.length > 0,
      imageCount: images.length,
      wordCount: words.length,
      paragraphCount: paragraphs,
    };
  }

  /**
   * Index a document for TF-IDF calculations
   */
  indexDocument(text: string): void {
    const tokens = this.tokenize(text.toLowerCase());
    const uniqueTerms = new Set(tokens);

    for (const term of uniqueTerms) {
      this.documentFrequency.set(term, (this.documentFrequency.get(term) || 0) + 1);
    }

    this.totalDocuments++;
  }

  /**
   * Index multiple documents at once
   */
  indexDocuments(texts: string[]): void {
    for (const text of texts) {
      this.indexDocument(text);
    }
  }

  /**
   * Clear the document index
   */
  clearIndex(): void {
    this.documentFrequency.clear();
    this.totalDocuments = 0;
  }

  /**
   * Split text into chunks for processing
   */
  chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 100): TextChunk[] {
    const chunks: TextChunk[] = [];
    const sentences = this.splitIntoSentences(text);

    let currentChunk = '';
    let currentStart = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          id: `chunk-${chunkIndex}`,
          content: currentChunk.trim(),
          startIndex: currentStart,
          endIndex: currentStart + currentChunk.length,
          metadata: {},
        });

        // Start new chunk with overlap
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + ' ' + sentence;
        currentStart =
          currentStart + currentChunk.length - overlapText.length - sentence.length - 1;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        startIndex: currentStart,
        endIndex: currentStart + currentChunk.length,
        metadata: {},
      });
    }

    return chunks;
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 1);
  }

  /**
   * Calculate term frequency
   */
  private calculateTermFrequency(tokens: string[]): Map<string, number> {
    const frequency = new Map<string, number>();
    const total = tokens.length || 1;

    for (const token of tokens) {
      frequency.set(token, (frequency.get(token) || 0) + 1);
    }

    // Normalize by total tokens
    for (const [term, count] of frequency) {
      frequency.set(term, count / total);
    }

    return frequency;
  }

  /**
   * Calculate Inverse Document Frequency
   */
  private calculateIDF(term: string): number {
    const docCount = this.documentFrequency.get(term) || 0;
    const total = this.totalDocuments || 1;
    return Math.log((total + 1) / (docCount + 1)) + 1;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Get cached analysis if valid
   */
  private getCachedAnalysis(noteId: string, contentHash: string): NoteAnalysis | null {
    const cached = this.cache.get(noteId);
    if (!cached) return null;

    // Check if cache is expired
    if (new Date() > cached.expiresAt) {
      this.cache.delete(noteId);
      return null;
    }

    // Check if content has changed
    if (cached.contentHash !== contentHash) {
      this.cache.delete(noteId);
      return null;
    }

    return cached.analysis;
  }

  /**
   * Cache analysis result
   */
  private cacheAnalysis(noteId: string, contentHash: string, analysis: NoteAnalysis): void {
    this.cache.set(noteId, {
      analysis,
      contentHash,
      expiresAt: new Date(Date.now() + this.cacheDurationMs),
    });
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Singleton instance
let defaultAnalyzer: NoteAnalyzer | null = null;

/**
 * Get or create the default NoteAnalyzer instance
 */
export function getNoteAnalyzer(): NoteAnalyzer {
  if (!defaultAnalyzer) {
    defaultAnalyzer = new NoteAnalyzer();
  }
  return defaultAnalyzer;
}

/**
 * Create a new NoteAnalyzer instance with custom config
 */
export function createNoteAnalyzer(cacheDurationMs?: number): NoteAnalyzer {
  return new NoteAnalyzer(cacheDurationMs);
}
