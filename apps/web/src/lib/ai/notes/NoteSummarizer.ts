// apps/web/src/lib/ai/notes/NoteSummarizer.ts

import type { NoteSummary, SummarizationOptions } from './types';
import type { Note } from '@notechain/data-models';
import { getNoteAnalyzer } from './NoteAnalyzer';

/**
 * Sentence score for extractive summarization
 */
interface SentenceScore {
  sentence: string;
  index: number;
  score: number;
}

/**
 * NoteSummarizer generates summaries using extractive and abstractive methods
 * Falls back to extractive when abstractive methods aren't available
 */
export class NoteSummarizer {
  private analyzer = getNoteAnalyzer();

  /**
   * Generate a summary for a note
   */
  async summarize(note: Note, options: SummarizationOptions = {}): Promise<NoteSummary> {
    const { maxLength: _maxLength = 'medium', focusOn = [], extractKeyPoints = true } = options;

    const plainText = this.extractPlainText(note.content);

    // For short notes, return simple summary
    if (plainText.length < 200) {
      return {
        noteId: note.id,
        brief: note.title,
        medium: `${note.title}. ${plainText}`,
        detailed: plainText,
        keyPoints: extractKeyPoints ? this.extractKeyPoints(plainText, 3) : [],
        generatedAt: new Date(),
      };
    }

    // Generate summaries of different lengths
    const brief = this.generateBriefSummary(note, plainText);
    const medium = this.generateMediumSummary(note, plainText, focusOn);
    const detailed = this.generateDetailedSummary(note, plainText, focusOn);

    // Extract key points
    const keyPoints = extractKeyPoints ? this.extractKeyPoints(plainText, 5, focusOn) : [];

    return {
      noteId: note.id,
      brief,
      medium,
      detailed,
      keyPoints,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate a brief summary (1-2 sentences)
   */
  private generateBriefSummary(note: Note, plainText: string): string {
    // Get the first sentence
    const sentences = this.splitIntoSentences(plainText);

    if (sentences.length === 0) {
      return note.title;
    }

    if (sentences.length === 1) {
      return sentences[0];
    }

    // Combine first sentence with most important sentence
    const firstSentence = sentences[0];
    const importantSentence = this.findMostImportantSentence(sentences.slice(1));

    if (importantSentence && this.diversityScore(firstSentence, importantSentence) > 0.3) {
      return `${firstSentence} ${importantSentence}`;
    }

    return firstSentence;
  }

  /**
   * Generate a medium summary (3-5 sentences)
   */
  private generateMediumSummary(note: Note, plainText: string, focusOn: string[]): string {
    const sentences = this.splitIntoSentences(plainText);

    if (sentences.length <= 5) {
      return sentences.join(' ');
    }

    // Score sentences for importance
    const scoredSentences = this.scoreSentences(sentences, focusOn);

    // Select top sentences while maintaining order
    const numSentences = Math.min(5, Math.max(3, Math.ceil(sentences.length * 0.15)));
    const topSentences = scoredSentences.slice(0, numSentences).sort((a, b) => a.index - b.index);

    return topSentences.map(s => s.sentence).join(' ');
  }

  /**
   * Generate a detailed summary (paragraph)
   */
  private generateDetailedSummary(note: Note, plainText: string, focusOn: string[]): string {
    const sentences = this.splitIntoSentences(plainText);

    if (sentences.length <= 10) {
      return sentences.join(' ');
    }

    // Score sentences for importance
    const scoredSentences = this.scoreSentences(sentences, focusOn);

    // Select top sentences while maintaining order
    const numSentences = Math.min(10, Math.max(5, Math.ceil(sentences.length * 0.25)));
    const topSentences = scoredSentences.slice(0, numSentences).sort((a, b) => a.index - b.index);

    return topSentences.map(s => s.sentence).join(' ');
  }

  /**
   * Extract key points from content
   */
  private extractKeyPoints(plainText: string, maxPoints: number, focusOn: string[] = []): string[] {
    const keyPoints: string[] = [];
    const sentences = this.splitIntoSentences(plainText);

    // 1. Look for list items
    const listItemPattern = /^[\s]*[-*+]\s+(.+)$/gm;
    const listMatches = [...plainText.matchAll(listItemPattern)];

    for (const match of listMatches.slice(0, maxPoints)) {
      const point = match[1].trim();
      if (point.length > 10 && point.length < 150) {
        keyPoints.push(point);
      }
    }

    // 2. Look for important sentences (first sentence of paragraphs)
    const paragraphs = plainText.split(/\n\n+/).filter(p => p.trim().length > 0);
    for (const paragraph of paragraphs) {
      if (keyPoints.length >= maxPoints) break;

      const firstSentence = paragraph.split(/[.!?]+/)[0]?.trim();
      if (firstSentence && firstSentence.length > 20 && firstSentence.length < 150) {
        const isDuplicate = keyPoints.some(p => this.similarity(p, firstSentence) > 0.7);
        if (!isDuplicate) {
          keyPoints.push(firstSentence + '.');
        }
      }
    }

    // 3. Look for focus-related sentences
    if (focusOn.length > 0) {
      for (const sentence of sentences) {
        if (keyPoints.length >= maxPoints) break;

        const lowerSentence = sentence.toLowerCase();
        const isRelevant = focusOn.some(term => lowerSentence.includes(term.toLowerCase()));

        if (isRelevant && sentence.length > 20 && sentence.length < 150) {
          const isDuplicate = keyPoints.some(p => this.similarity(p, sentence) > 0.7);
          if (!isDuplicate) {
            keyPoints.push(sentence);
          }
        }
      }
    }

    // 4. Fill remaining slots with important sentences
    if (keyPoints.length < maxPoints) {
      const scoredSentences = this.scoreSentences(sentences, focusOn);

      for (const { sentence } of scoredSentences) {
        if (keyPoints.length >= maxPoints) break;

        if (sentence.length > 20 && sentence.length < 150) {
          const isDuplicate = keyPoints.some(p => this.similarity(p, sentence) > 0.7);
          if (!isDuplicate) {
            keyPoints.push(sentence);
          }
        }
      }
    }

    return keyPoints.slice(0, maxPoints);
  }

  /**
   * Score sentences for importance
   */
  private scoreSentences(sentences: string[], focusOn: string[]): SentenceScore[] {
    const scored: SentenceScore[] = [];

    // Calculate word frequencies
    const wordFreq = new Map<string, number>();
    for (const sentence of sentences) {
      const words = this.tokenize(sentence);
      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      let score = 0;

      // Position score (first sentences are more important)
      if (i === 0) score += 3;
      else if (i === 1) score += 2;
      else if (i < sentences.length * 0.2) score += 1;

      // Length score (prefer medium-length sentences)
      const wordCount = sentence.split(/\s+/).length;
      if (wordCount >= 8 && wordCount <= 25) {
        score += 1;
      }

      // TF-IDF-like score
      const words = this.tokenize(sentence);
      for (const word of words) {
        const freq = wordFreq.get(word) || 0;
        const tfidf = Math.log(1 + freq) * Math.log(sentences.length / (freq || 1));
        score += tfidf;
      }

      // Focus bonus
      if (focusOn.length > 0) {
        const lowerSentence = sentence.toLowerCase();
        for (const term of focusOn) {
          if (lowerSentence.includes(term.toLowerCase())) {
            score += 2;
          }
        }
      }

      // Indicator words
      const indicators = [
        'important',
        'key',
        'main',
        'primary',
        'crucial',
        'essential',
        'significant',
        'critical',
        'major',
        'fundamental',
        'conclusion',
        'result',
        'find',
        'discover',
        'conclude',
        'therefore',
        'thus',
      ];
      const lowerSentence = sentence.toLowerCase();
      for (const indicator of indicators) {
        if (lowerSentence.includes(indicator)) {
          score += 0.5;
        }
      }

      scored.push({ sentence, index: i, score });
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Find the most important sentence
   */
  private findMostImportantSentence(sentences: string[]): string | null {
    if (sentences.length === 0) return null;

    const scored = this.scoreSentences(sentences, []);
    return scored[0]?.sentence || null;
  }

  /**
   * Calculate diversity score between two sentences
   */
  private diversityScore(sentence1: string, sentence2: string): number {
    const words1 = new Set(this.tokenize(sentence1));
    const words2 = new Set(this.tokenize(sentence2));

    const shared = [...words1].filter(w => words2.has(w)).length;
    const total = words1.size + words2.size - shared;

    return total > 0 ? 1 - shared / total : 0;
  }

  /**
   * Calculate similarity between two strings
   */
  private similarity(str1: string, str2: string): number {
    const words1 = new Set(this.tokenize(str1));
    const words2 = new Set(this.tokenize(str2));

    const shared = [...words1].filter(w => words2.has(w)).length;
    const total = Math.max(words1.size, words2.size);

    return total > 0 ? shared / total : 0;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !this.isStopWord(w));
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
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
    ]);
    return stopWords.has(word.toLowerCase());
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
   * Check if a note should have a summary generated
   */
  shouldSummarize(note: Note): boolean {
    const plainText = this.extractPlainText(note.content);
    const wordCount = plainText.split(/\s+/).length;
    return wordCount >= 50; // Only summarize notes with 50+ words
  }

  /**
   * Get summary length recommendation based on content
   */
  getRecommendedLength(note: Note): 'brief' | 'medium' | 'detailed' {
    const plainText = this.extractPlainText(note.content);
    const wordCount = plainText.split(/\s+/).length;

    if (wordCount < 100) return 'brief';
    if (wordCount < 500) return 'medium';
    return 'detailed';
  }
}

// Singleton instance
let defaultSummarizer: NoteSummarizer | null = null;

/**
 * Get or create the default NoteSummarizer instance
 */
export function getNoteSummarizer(): NoteSummarizer {
  if (!defaultSummarizer) {
    defaultSummarizer = new NoteSummarizer();
  }
  return defaultSummarizer;
}

/**
 * Create a new NoteSummarizer instance
 */
export function createNoteSummarizer(): NoteSummarizer {
  return new NoteSummarizer();
}
