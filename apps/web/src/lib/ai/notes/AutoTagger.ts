// apps/web/src/lib/ai/notes/AutoTagger.ts

import type { AutoTag, AutoTagOptions, NoteAnalysis } from './types';
import type { Note } from '@notechain/data-models';
import { getNoteAnalyzer } from './NoteAnalyzer';

/**
 * Predefined tag categories with associated keywords
 */
const TAG_CATEGORIES: Record<string, string[]> = {
  work: [
    'project',
    'meeting',
    'deadline',
    'task',
    'client',
    'report',
    'presentation',
    'work',
    'job',
    'career',
    'office',
    'team',
    'colleague',
    'manager',
    'business',
  ],
  personal: [
    'family',
    'friend',
    'hobby',
    'vacation',
    'trip',
    'home',
    'weekend',
    'personal',
    'life',
    'relationship',
    'birthday',
    'anniversary',
    'health',
    'exercise',
  ],
  ideas: [
    'idea',
    'concept',
    'theory',
    'hypothesis',
    'innovation',
    'creative',
    'brainstorm',
    'inspiration',
    'thought',
    'philosophy',
    'vision',
  ],
  learning: [
    'study',
    'learn',
    'course',
    'book',
    'article',
    'research',
    'knowledge',
    'education',
    'skill',
    'tutorial',
    'documentation',
    'academic',
    'paper',
  ],
  finance: [
    'money',
    'budget',
    'expense',
    'income',
    'investment',
    'saving',
    'finance',
    'financial',
    'tax',
    'cost',
    'price',
    'payment',
    'bill',
    'bank',
  ],
  tech: [
    'code',
    'software',
    'app',
    'programming',
    'development',
    'technology',
    'computer',
    'api',
    'database',
    'system',
    'architecture',
    'design pattern',
    'framework',
  ],
  health: [
    'health',
    'medical',
    'doctor',
    'symptom',
    'treatment',
    'medicine',
    'wellness',
    'fitness',
    'diet',
    'nutrition',
    'mental health',
    'therapy',
  ],
  goals: [
    'goal',
    'objective',
    'target',
    'plan',
    'strategy',
    'milestone',
    'achievement',
    'success',
    'progress',
    'ambition',
    'aspiration',
    'resolution',
  ],
  journal: [
    'journal',
    'diary',
    'reflection',
    'gratitude',
    'mood',
    'feelings',
    'experience',
    'memory',
    'moment',
    'today',
    'yesterday',
  ],
  resources: [
    'resource',
    'link',
    'reference',
    'bookmark',
    'tool',
    'website',
    'article',
    'video',
    'podcast',
    'book',
    'recommendation',
  ],
};

/**
 * Common tag synonyms for normalization
 */
const TAG_SYNONYMS: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  postgresql: 'postgres',
  reactjs: 'react',
  nextjs: 'next',
  nodejs: 'node',
  'artificial intelligence': 'ai',
  'machine learning': 'ml',
  'user experience': 'ux',
  'user interface': 'ui',
};

/**
 * AutoTagger automatically generates relevant tags from note content
 * Uses keyword extraction, entity recognition, and category classification
 */
export class AutoTagger {
  private analyzer = getNoteAnalyzer();
  private customCategories: Map<string, string[]> = new Map();

  /**
   * Generate tags for a note
   */
  async generateTags(note: Note, options: AutoTagOptions = {}): Promise<AutoTag[]> {
    const {
      maxTags = 8,
      minConfidence = 0.3,
      includeExisting = false,
      categories = Object.keys(TAG_CATEGORIES),
    } = options;

    // Analyze the note
    const analysis = await this.analyzer.analyzeNote(note);

    // Collect tag candidates
    const tagCandidates: AutoTag[] = [];

    // 1. Extract from keywords
    const keywordTags = this.extractFromKeywords(analysis, minConfidence);
    tagCandidates.push(...keywordTags);

    // 2. Extract from entities
    const entityTags = this.extractFromEntities(analysis, minConfidence);
    tagCandidates.push(...entityTags);

    // 3. Categorize based on content
    const categoryTags = this.categorizeContent(note, analysis, categories, minConfidence);
    tagCandidates.push(...categoryTags);

    // 4. Extract from content patterns
    const patternTags = this.extractFromPatterns(note, minConfidence);
    tagCandidates.push(...patternTags);

    // Merge and deduplicate tags
    const mergedTags = this.mergeTags(tagCandidates);

    // Filter out existing tags if requested
    let finalTags = mergedTags;
    if (!includeExisting) {
      const existingTags = new Set(note.tags.map(t => t.toLowerCase()));
      finalTags = mergedTags.filter(tag => !existingTags.has(tag.name.toLowerCase()));
    }

    // Sort by confidence and limit
    return finalTags.sort((a, b) => b.confidence - a.confidence).slice(0, maxTags);
  }

  /**
   * Batch generate tags for multiple notes
   */
  async generateTagsBatch(
    notes: Note[],
    options: AutoTagOptions = {}
  ): Promise<Map<string, AutoTag[]>> {
    const results = new Map<string, AutoTag[]>();

    for (const note of notes) {
      try {
        const tags = await this.generateTags(note, options);
        results.set(note.id, tags);
      } catch (error) {
        console.error(`Failed to generate tags for note ${note.id}:`, error);
        results.set(note.id, []);
      }
    }

    return results;
  }

  /**
   * Add custom tag categories
   */
  addCategory(name: string, keywords: string[]): void {
    this.customCategories.set(name.toLowerCase(), keywords);
  }

  /**
   * Remove custom category
   */
  removeCategory(name: string): boolean {
    return this.customCategories.delete(name.toLowerCase());
  }

  /**
   * Suggest tags based on partial input (for autocomplete)
   */
  suggestTags(partialTag: string, existingTags: string[] = [], maxSuggestions = 5): string[] {
    const partial = partialTag.toLowerCase().trim();
    if (partial.length < 2) return [];

    const suggestions: Array<{ tag: string; score: number }> = [];
    const existingSet = new Set(existingTags.map(t => t.toLowerCase()));

    // Check predefined categories
    for (const [category, keywords] of Object.entries(TAG_CATEGORIES)) {
      if (category.includes(partial) && !existingSet.has(category)) {
        suggestions.push({ tag: category, score: 1.0 });
      }

      for (const keyword of keywords) {
        if (keyword.includes(partial) && !existingSet.has(keyword)) {
          suggestions.push({ tag: keyword, score: 0.8 });
        }
      }
    }

    // Check custom categories
    for (const [category, keywords] of this.customCategories) {
      if (category.includes(partial) && !existingSet.has(category)) {
        suggestions.push({ tag: category, score: 0.9 });
      }

      for (const keyword of keywords) {
        if (keyword.includes(partial) && !existingSet.has(keyword)) {
          suggestions.push({ tag: keyword, score: 0.7 });
        }
      }
    }

    // Check synonyms
    for (const [synonym, canonical] of Object.entries(TAG_SYNONYMS)) {
      if (synonym.includes(partial) && !existingSet.has(canonical)) {
        suggestions.push({ tag: canonical, score: 0.85 });
      }
    }

    // Remove duplicates and sort
    const seen = new Set<string>();
    return suggestions
      .filter(s => {
        const key = s.tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(s => s.tag);
  }

  /**
   * Normalize a tag (convert synonyms, clean up)
   */
  normalizeTag(tag: string): string {
    const lowerTag = tag.toLowerCase().trim();
    return TAG_SYNONYMS[lowerTag] || lowerTag.replace(/\s+/g, '-');
  }

  /**
   * Extract tags from extracted keywords
   */
  private extractFromKeywords(analysis: NoteAnalysis, minConfidence: number): AutoTag[] {
    const tags: AutoTag[] = [];

    for (const keyword of analysis.keywords) {
      if (keyword.score >= minConfidence) {
        // Clean and normalize the keyword
        const normalizedTag = this.cleanTag(keyword.word);
        if (normalizedTag.length >= 3) {
          tags.push({
            name: normalizedTag,
            confidence: keyword.score,
            source: 'keyword',
          });
        }
      }
    }

    return tags;
  }

  /**
   * Extract tags from named entities
   */
  private extractFromEntities(analysis: NoteAnalysis, minConfidence: number): AutoTag[] {
    const tags: AutoTag[] = [];

    for (const entity of analysis.entities) {
      if (entity.confidence >= minConfidence) {
        const normalizedTag = this.cleanTag(entity.name);
        if (normalizedTag.length >= 3) {
          tags.push({
            name: normalizedTag,
            confidence: entity.confidence,
            source: 'entity',
            category: entity.type,
          });
        }
      }
    }

    return tags;
  }

  /**
   * Categorize content based on keywords
   */
  private categorizeContent(
    note: Note,
    analysis: NoteAnalysis,
    categories: string[],
    minConfidence: number
  ): AutoTag[] {
    const tags: AutoTag[] = [];
    const fullText = `${note.title} ${note.content}`.toLowerCase();

    // Check predefined categories
    for (const [category, keywords] of Object.entries(TAG_CATEGORIES)) {
      if (!categories.includes(category)) continue;

      let matchCount = 0;
      let totalWeight = 0;

      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (fullText.match(regex) || []).length;
        if (matches > 0) {
          matchCount++;
          totalWeight += matches;
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(1, (matchCount / keywords.length) * 2 + totalWeight * 0.1);
        if (confidence >= minConfidence) {
          tags.push({
            name: category,
            confidence,
            source: 'category',
            category: 'topic',
          });
        }
      }
    }

    // Check custom categories
    for (const [category, keywords] of this.customCategories) {
      if (!categories.includes(category)) continue;

      let matchCount = 0;
      for (const keyword of keywords) {
        if (fullText.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const confidence = matchCount / Math.max(keywords.length * 0.5, 1);
        if (confidence >= minConfidence) {
          tags.push({
            name: category,
            confidence,
            source: 'category',
            category: 'custom',
          });
        }
      }
    }

    return tags;
  }

  /**
   * Extract tags from content patterns
   */
  private extractFromPatterns(note: Note, minConfidence: number): AutoTag[] {
    const tags: AutoTag[] = [];
    const content = note.content.toLowerCase();

    // Check for programming languages
    const languagePatterns = [
      { pattern: /\b(javascript|js)\b/g, tag: 'javascript' },
      { pattern: /\b(typescript|ts)\b/g, tag: 'typescript' },
      { pattern: /\bpython\b/g, tag: 'python' },
      { pattern: /\b(react|reactjs)\b/g, tag: 'react' },
      { pattern: /\b(next\.?js|nextjs)\b/g, tag: 'nextjs' },
      { pattern: /\b(node\.?js|nodejs)\b/g, tag: 'nodejs' },
      { pattern: /\b(golang|go)\b/g, tag: 'go' },
      { pattern: /\brust\b/g, tag: 'rust' },
      { pattern: /\bsql\b/g, tag: 'sql' },
      { pattern: /\b(html|css)\b/g, tag: 'web-dev' },
    ];

    for (const { pattern, tag } of languagePatterns) {
      const matches = (content.match(pattern) || []).length;
      if (matches > 0) {
        const confidence = Math.min(1, 0.5 + matches * 0.15);
        if (confidence >= minConfidence) {
          tags.push({
            name: tag,
            confidence,
            source: 'ai',
            category: 'technology',
          });
        }
      }
    }

    // Check for specific formats
    if (content.includes('todo') || content.includes('task') || content.includes('checklist')) {
      tags.push({
        name: 'tasks',
        confidence: 0.7,
        source: 'ai',
        category: 'format',
      });
    }

    if (content.includes('meeting') || content.includes('agenda') || content.includes('minutes')) {
      tags.push({
        name: 'meeting',
        confidence: 0.75,
        source: 'ai',
        category: 'format',
      });
    }

    if (content.includes('question') || content.includes('q&a') || content.includes('faq')) {
      tags.push({
        name: 'questions',
        confidence: 0.6,
        source: 'ai',
        category: 'format',
      });
    }

    return tags;
  }

  /**
   * Merge duplicate tags, keeping highest confidence
   */
  private mergeTags(tags: AutoTag[]): AutoTag[] {
    const merged = new Map<string, AutoTag>();

    for (const tag of tags) {
      const key = tag.name.toLowerCase();
      const existing = merged.get(key);

      if (!existing || tag.confidence > existing.confidence) {
        merged.set(key, tag);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Clean and normalize a tag string
   */
  private cleanTag(tag: string): string {
    return tag
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove consecutive hyphens
      .trim();
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return [...Object.keys(TAG_CATEGORIES), ...this.customCategories.keys()];
  }

  /**
   * Get keywords for a category
   */
  getCategoryKeywords(category: string): string[] {
    const lowerCategory = category.toLowerCase();
    return TAG_CATEGORIES[lowerCategory] || this.customCategories.get(lowerCategory) || [];
  }
}

// Singleton instance
let defaultTagger: AutoTagger | null = null;

/**
 * Get or create the default AutoTagger instance
 */
export function getAutoTagger(): AutoTagger {
  if (!defaultTagger) {
    defaultTagger = new AutoTagger();
  }
  return defaultTagger;
}

/**
 * Create a new AutoTagger instance
 */
export function createAutoTagger(): AutoTagger {
  return new AutoTagger();
}
