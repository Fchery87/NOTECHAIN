// apps/web/src/services/pdf-intelligence-service.ts

/**
 * PDF Intelligence Service - On-device PDF analysis and highlighting
 * FR-PDF-05: AI-Powered Highlighting for legal/academic documents
 * All processing happens locally - no data sent to servers
 */

/**
 * Represents a highlight suggestion in a PDF
 */
export interface PDFHighlight {
  text: string;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  category: HighlightCategory;
  confidence: number;
  reason: string;
}

/**
 * Categories for different types of highlights
 */
export type HighlightCategory =
  | 'key_term'
  | 'definition'
  | 'action_item'
  | 'deadline'
  | 'important_clause'
  | 'monetary_value'
  | 'date_reference'
  | 'contact_info';

/**
 * Analysis result containing all suggested highlights
 */
export interface PDFAnalysisResult {
  highlights: PDFHighlight[];
  summary: string;
  keyTerms: string[];
  processedAt: Date;
  processingTimeMs: number;
}

/**
 * Configuration for PDF analysis
 */
export interface PDFAnalysisConfig {
  enableKeyTerms: boolean;
  enableDefinitions: boolean;
  enableActionItems: boolean;
  enableDeadlines: boolean;
  enableImportantClauses: boolean;
  enableMonetaryValues: boolean;
  enableDateReferences: boolean;
  enableContactInfo: boolean;
  minConfidence: number; // 0-1, only return highlights above this threshold
  maxHighlights: number; // Maximum number of highlights to return
}

const DEFAULT_CONFIG: PDFAnalysisConfig = {
  enableKeyTerms: true,
  enableDefinitions: true,
  enableActionItems: true,
  enableDeadlines: true,
  enableImportantClauses: true,
  enableMonetaryValues: true,
  enableDateReferences: true,
  enableContactInfo: true,
  minConfidence: 0.6,
  maxHighlights: 50,
};

/**
 * Pattern definitions for rule-based extraction
 * Used as fallback when NPU is unavailable
 */
const HIGHLIGHT_PATTERNS = {
  // Definition patterns (e.g., "'term' means...", "X is defined as...")
  definition: [
    /["']([^"']+)["']\s*(means|refers to|is defined as|shall mean)/gi,
    /(term|phrase|word)\s+"([^"]+)"\s*(means|refers to|is defined as)/gi,
    /^([A-Z][A-Za-z\s]+)\s*[:–-]\s*(?:means|refers to)/gm,
  ],

  // Action items (e.g., "must", "shall", "required to")
  actionItem: [
    /\b(must|shall|is required to|needs to|will|agrees to)\s+/gi,
    /\b(obligated|responsible|liable)\s+to\s+/gi,
    /\b(required|mandatory|obligatory)\s+/gi,
  ],

  // Deadlines and date references
  deadline: [
    /\b(within|by|before|no later than|prior to)\s+(\d+\s*(?:days?|weeks?|months?|years?))/gi,
    /\b(deadline|due date|expiry|expiration)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:or before|at the latest)/gi,
  ],

  // Important legal clauses
  importantClause: [
    /\b(indemnif(?:y|ication)|liability|warranty|termination|confidential|non-disclosure|intellectual property)\b/gi,
    /\b(breach|default|remedy|damages|penalty|fine)\b/gi,
    /\b(governing law|jurisdiction|dispute|arbitration|mediation)\b/gi,
  ],

  // Monetary values
  monetaryValue: [
    /\$\s*[\d,]+(?:\.\d{2})?(?:\s*(?:USD|dollars?))?/gi,
    /(?:USD|EUR|GBP|CAD|AUD)\s*[\d,]+(?:\.\d{2})?/gi,
    /\b[\d,]+(?:\.\d{2})?\s*(?:dollars?|euros?|pounds?)\b/gi,
  ],

  // Date references
  dateReference: [
    /\b(?:effective|commencing|starting)\s+(?:from\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
    /\b(?:valid|in effect)\s+(?:for|until)\s+(\d+\s*(?:days?|weeks?|months?|years?))/gi,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
  ],

  // Contact information
  contactInfo: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    /\b(?:phone|tel|telephone|mobile|cell)\s*:?\s*[\d\s\-\(\)\+]{7,}/gi,
    /\b(?:address|location)\s*:?\s*\d+[^,]+(?:,\s*[^,]+){2,}/gi,
  ],

  // Key terms (capitalized phrases, technical terms)
  keyTerm: [
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, // Title Case Phrases
    /\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b/g, // Acronyms
  ],
};

/**
 * PDFIntelligenceService provides on-device PDF analysis
 * Uses rule-based pattern matching (can be extended with on-device ML)
 */
export class PDFIntelligenceService {
  private config: PDFAnalysisConfig;

  constructor(config: Partial<PDFAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze PDF text content and suggest highlights
   * @param text The extracted text content from the PDF
   * @param pageTexts Optional array of text by page for page-level tracking
   * @returns Analysis result with suggested highlights
   */
  analyzeText(text: string, pageTexts?: string[]): PDFAnalysisResult {
    const startTime = performance.now();
    const highlights: PDFHighlight[] = [];

    // Process each enabled category
    if (this.config.enableDefinitions) {
      highlights.push(...this.findDefinitions(text, pageTexts));
    }
    if (this.config.enableActionItems) {
      highlights.push(...this.findActionItems(text, pageTexts));
    }
    if (this.config.enableDeadlines) {
      highlights.push(...this.findDeadlines(text, pageTexts));
    }
    if (this.config.enableImportantClauses) {
      highlights.push(...this.findImportantClauses(text, pageTexts));
    }
    if (this.config.enableMonetaryValues) {
      highlights.push(...this.findMonetaryValues(text, pageTexts));
    }
    if (this.config.enableDateReferences) {
      highlights.push(...this.findDateReferences(text, pageTexts));
    }
    if (this.config.enableContactInfo) {
      highlights.push(...this.findContactInfo(text, pageTexts));
    }
    if (this.config.enableKeyTerms) {
      highlights.push(...this.findKeyTerms(text, pageTexts));
    }

    // Filter by confidence and limit results
    const filteredHighlights = highlights
      .filter(h => h.confidence >= this.config.minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxHighlights);

    // Generate summary and extract key terms
    const summary = this.generateSummary(filteredHighlights, text);
    const keyTerms = this.extractKeyTerms(filteredHighlights);

    const processingTimeMs = performance.now() - startTime;

    return {
      highlights: filteredHighlights,
      summary,
      keyTerms,
      processedAt: new Date(),
      processingTimeMs,
    };
  }

  /**
   * Find definitions in the text
   */
  private findDefinitions(text: string, pageTexts?: string[]): PDFHighlight[] {
    const highlights: PDFHighlight[] = [];

    for (const pattern of HIGHLIGHT_PATTERNS.definition) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const surroundingContext = this.getContext(text, match.index, 100);
        highlights.push({
          text: match[0],
          pageIndex: this.findPageIndex(match.index, pageTexts),
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          category: 'definition',
          confidence: this.calculateConfidence(match[0], 'definition', surroundingContext),
          reason: 'Definition or term explanation detected',
        });
      }
    }

    return highlights;
  }

  /**
   * Find action items and obligations
   */
  private findActionItems(text: string, pageTexts?: string[]): PDFHighlight[] {
    const highlights: PDFHighlight[] = [];

    for (const pattern of HIGHLIGHT_PATTERNS.actionItem) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullSentence = this.getFullSentence(text, match.index);
        const surroundingContext = this.getContext(text, match.index, 100);

        highlights.push({
          text: fullSentence,
          pageIndex: this.findPageIndex(match.index, pageTexts),
          startOffset: match.index,
          endOffset: match.index + fullSentence.length,
          category: 'action_item',
          confidence: this.calculateConfidence(match[0], 'actionItem', surroundingContext),
          reason: 'Action item or obligation detected',
        });
      }
    }

    return highlights;
  }

  /**
   * Find deadlines and time-sensitive information
   */
  private findDeadlines(text: string, pageTexts?: string[]): PDFHighlight[] {
    const highlights: PDFHighlight[] = [];

    for (const pattern of HIGHLIGHT_PATTERNS.deadline) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const surroundingContext = this.getContext(text, match.index, 100);

        highlights.push({
          text: match[0],
          pageIndex: this.findPageIndex(match.index, pageTexts),
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          category: 'deadline',
          confidence: this.calculateConfidence(match[0], 'deadline', surroundingContext),
          reason: 'Deadline or time constraint detected',
        });
      }
    }

    return highlights;
  }

  /**
   * Find important legal clauses
   */
  private findImportantClauses(text: string, pageTexts?: string[]): PDFHighlight[] {
    const highlights: PDFHighlight[] = [];

    for (const pattern of HIGHLIGHT_PATTERNS.importantClause) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullSentence = this.getFullSentence(text, match.index);
        const surroundingContext = this.getContext(text, match.index, 100);

        highlights.push({
          text: fullSentence,
          pageIndex: this.findPageIndex(match.index, pageTexts),
          startOffset: match.index,
          endOffset: match.index + fullSentence.length,
          category: 'important_clause',
          confidence: this.calculateConfidence(match[0], 'importantClause', surroundingContext),
          reason: 'Important legal clause detected',
        });
      }
    }

    return highlights;
  }

  /**
   * Find monetary values
   */
  private findMonetaryValues(text: string, pageTexts?: string[]): PDFHighlight[] {
    const highlights: PDFHighlight[] = [];

    for (const pattern of HIGHLIGHT_PATTERNS.monetaryValue) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const surroundingContext = this.getContext(text, match.index, 100);

        highlights.push({
          text: match[0],
          pageIndex: this.findPageIndex(match.index, pageTexts),
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          category: 'monetary_value',
          confidence: this.calculateConfidence(match[0], 'monetaryValue', surroundingContext),
          reason: 'Monetary value detected',
        });
      }
    }

    return highlights;
  }

  /**
   * Find date references
   */
  private findDateReferences(text: string, pageTexts?: string[]): PDFHighlight[] {
    const highlights: PDFHighlight[] = [];

    for (const pattern of HIGHLIGHT_PATTERNS.dateReference) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const surroundingContext = this.getContext(text, match.index, 100);

        highlights.push({
          text: match[0],
          pageIndex: this.findPageIndex(match.index, pageTexts),
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          category: 'date_reference',
          confidence: this.calculateConfidence(match[0], 'dateReference', surroundingContext),
          reason: 'Date reference detected',
        });
      }
    }

    return highlights;
  }

  /**
   * Find contact information
   */
  private findContactInfo(text: string, pageTexts?: string[]): PDFHighlight[] {
    const highlights: PDFHighlight[] = [];

    for (const pattern of HIGHLIGHT_PATTERNS.contactInfo) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const surroundingContext = this.getContext(text, match.index, 100);

        highlights.push({
          text: match[0],
          pageIndex: this.findPageIndex(match.index, pageTexts),
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          category: 'contact_info',
          confidence: this.calculateConfidence(match[0], 'contactInfo', surroundingContext),
          reason: 'Contact information detected',
        });
      }
    }

    return highlights;
  }

  /**
   * Find key terms and phrases
   */
  private findKeyTerms(text: string, pageTexts?: string[]): PDFHighlight[] {
    const highlights: PDFHighlight[] = [];
    const seenTerms = new Set<string>();

    for (const pattern of HIGHLIGHT_PATTERNS.keyTerm) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Skip common words and duplicates
        const term = match[0];
        if (seenTerms.has(term.toLowerCase())) continue;
        if (this.isCommonWord(term)) continue;

        seenTerms.add(term.toLowerCase());
        const surroundingContext = this.getContext(text, match.index, 100);

        highlights.push({
          text: term,
          pageIndex: this.findPageIndex(match.index, pageTexts),
          startOffset: match.index,
          endOffset: match.index + term.length,
          category: 'key_term',
          confidence: this.calculateConfidence(term, 'keyTerm', surroundingContext),
          reason: 'Key term or phrase detected',
        });
      }
    }

    return highlights;
  }

  /**
   * Calculate confidence score for a match
   */
  private calculateConfidence(matchedText: string, category: string, context: string): number {
    let confidence = 0.7; // Base confidence for pattern matches

    // Boost confidence for longer matches
    if (matchedText.length > 20) confidence += 0.1;
    if (matchedText.length > 50) confidence += 0.05;

    // Boost confidence for specific category indicators
    const categoryBoosts: Record<string, RegExp> = {
      definition: /(?:means|defined as|refers to)/i,
      actionItem: /(?:must|shall|required|mandatory)/i,
      deadline: /(?:deadline|due|expiry|before|within)/i,
      importantClause: /(?:agreement|contract|party|obligation)/i,
    };

    const boostPattern = categoryBoosts[category];
    if (boostPattern && boostPattern.test(context)) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * Get surrounding context for a match
   */
  private getContext(text: string, index: number, contextLength: number): string {
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + contextLength);
    return text.slice(start, end);
  }

  /**
   * Get the full sentence containing a match
   */
  private getFullSentence(text: string, index: number): string {
    // Find sentence boundaries
    let start = index;
    let end = index;

    // Look backwards for sentence start
    while (start > 0 && !/[.!?]\s/.test(text.slice(start - 2, start))) {
      start--;
    }
    // Skip the period and space
    if (start > 0 && /[.!?]\s/.test(text.slice(start - 2, start))) {
      start++;
    }

    // Look forwards for sentence end
    while (end < text.length && !/[.!?]/.test(text[end])) {
      end++;
    }
    // Include the punctuation
    if (end < text.length) end++;

    return text.slice(start, end).trim();
  }

  /**
   * Find which page a match is on
   */
  private findPageIndex(index: number, pageTexts?: string[]): number {
    if (!pageTexts) return 0;

    let charCount = 0;
    for (let i = 0; i < pageTexts.length; i++) {
      charCount += pageTexts[i].length;
      if (index < charCount) return i;
    }
    return pageTexts.length - 1;
  }

  /**
   * Check if a term is a common word that should be ignored
   */
  private isCommonWord(term: string): boolean {
    const commonWords = new Set([
      'The',
      'This',
      'That',
      'These',
      'Those',
      'What',
      'Which',
      'Who',
      'When',
      'Where',
      'Why',
      'How',
      'All',
      'Each',
      'Every',
      'Both',
      'Few',
      'More',
      'Most',
      'Other',
      'Some',
      'Such',
      'No',
      'Not',
      'Only',
      'Same',
      'Than',
      'Too',
      'Very',
      'Just',
      'Should',
      'Now',
      'Also',
      'Here',
      'There',
      'Then',
      'Once',
      'And',
      'But',
      'For',
      'Or',
      'Nor',
      'So',
      'Yet',
      'After',
      'Before',
      'Above',
      'Below',
      'From',
      'Into',
      'Through',
      'During',
      'Before',
      'After',
      'Above',
      'Below',
      'Between',
      'Under',
      'Again',
      'Further',
      'Then',
      'Once',
    ]);
    return commonWords.has(term);
  }

  /**
   * Generate a summary of the document based on highlights
   */
  private generateSummary(highlights: PDFHighlight[], _fullText: string): string {
    const categories = new Map<HighlightCategory, number>();

    for (const h of highlights) {
      categories.set(h.category, (categories.get(h.category) ?? 0) + 1);
    }

    const parts: string[] = [];

    if (categories.get('definition')) {
      parts.push(`${categories.get('definition')} definitions`);
    }
    if (categories.get('action_item')) {
      parts.push(`${categories.get('action_item')} action items`);
    }
    if (categories.get('deadline')) {
      parts.push(`${categories.get('deadline')} deadlines`);
    }
    if (categories.get('important_clause')) {
      parts.push(`${categories.get('important_clause')} important clauses`);
    }
    if (categories.get('monetary_value')) {
      parts.push(`${categories.get('monetary_value')} monetary values`);
    }

    if (parts.length === 0) {
      return 'No significant patterns detected in this document.';
    }

    return `Document analysis found: ${parts.join(', ')}.`;
  }

  /**
   * Extract unique key terms from highlights
   */
  private extractKeyTerms(highlights: PDFHighlight[]): string[] {
    const terms = new Set<string>();

    for (const h of highlights) {
      if (h.category === 'key_term') {
        terms.add(h.text);
      }
    }

    return Array.from(terms).slice(0, 20); // Return top 20 terms
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PDFAnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): PDFAnalysisConfig {
    return { ...this.config };
  }
}

/**
 * Factory function to create PDFIntelligenceService
 */
export function createPDFIntelligenceService(
  config?: Partial<PDFAnalysisConfig>
): PDFIntelligenceService {
  return new PDFIntelligenceService(config);
}
