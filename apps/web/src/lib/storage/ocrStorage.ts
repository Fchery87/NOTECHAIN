import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { encryptData, decryptData, type EncryptedData } from '@notechain/core-crypto';

/**
 * OCR result interface representing a stored OCR extraction
 */
export interface OCRResult {
  /** Unique identifier for the OCR result */
  id: string;
  /** Document ID (links to PDF or image) */
  documentId: string;
  /** Document type: 'pdf' or 'image' */
  documentType: 'pdf' | 'image';
  /** Page number (for PDFs, undefined for images) */
  pageNumber?: number;
  /** Extracted text content */
  text: string;
  /** Encrypted text data */
  encryptedText: EncryptedData;
  /** OCR confidence score (0-100) */
  confidence: number;
  /** Language code (e.g., 'eng') */
  language: string;
  /** Word count in extracted text */
  wordCount: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Input interface for creating a new OCR result
 */
export interface OCRResultInput {
  /** Document ID (links to PDF or image) */
  documentId: string;
  /** Document type: 'pdf' or 'image' */
  documentType: 'pdf' | 'image';
  /** Page number (for PDFs, undefined for images) */
  pageNumber?: number;
  /** Extracted text content */
  text: string;
  /** OCR confidence score (0-100) */
  confidence: number;
  /** Language code (e.g., 'eng') */
  language: string;
  /** Word count in extracted text (optional, auto-calculated if not provided) */
  wordCount?: number;
}

/**
 * OCR result with relevance score for search results
 */
export interface OCRResultWithRelevance extends OCRResult {
  /** Relevance score for search ranking */
  relevance: number;
}

/**
 * Stored OCR result data structure in IndexedDB
 */
interface StoredOCRResult {
  id: string;
  documentId: string;
  documentType: 'pdf' | 'image';
  pageNumber?: number;
  encryptedText: EncryptedData;
  confidence: number;
  language: string;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-memory storage adapter for testing when IndexedDB is unavailable
 */
class InMemoryStorage {
  private data = new Map<string, StoredOCRResult>();

  async add(item: StoredOCRResult): Promise<string> {
    this.data.set(item.id, item);
    return item.id;
  }

  async get(id: string): Promise<StoredOCRResult | undefined> {
    return this.data.get(id);
  }

  async put(item: StoredOCRResult): Promise<string> {
    this.data.set(item.id, item);
    return item.id;
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }

  async toArray(): Promise<StoredOCRResult[]> {
    return Array.from(this.data.values());
  }

  clear(): void {
    this.data.clear();
  }
}

/**
 * OCR database using Dexie.js with in-memory fallback
 */
class OCRDatabase extends Dexie {
  ocrResults!: Table<StoredOCRResult, string>;
  private inMemoryStorage: InMemoryStorage | null = null;
  private useInMemory: boolean;

  constructor() {
    super('OCRDatabase');

    // Check if IndexedDB is available
    this.useInMemory = typeof globalThis.indexedDB === 'undefined';

    if (!this.useInMemory) {
      try {
        this.version(1).stores({
          ocrResults:
            'id, documentId, documentType, pageNumber, [documentId+pageNumber], createdAt',
        });
      } catch {
        // If IndexedDB setup fails, fall back to in-memory
        this.useInMemory = true;
      }
    }

    if (this.useInMemory) {
      this.inMemoryStorage = new InMemoryStorage();
    }
  }

  // Override Dexie methods to use in-memory storage when needed
  private get storage(): InMemoryStorage | Table<StoredOCRResult, string> {
    return this.inMemoryStorage || this.ocrResults;
  }

  async addOCRResult(item: StoredOCRResult): Promise<string> {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.add(item);
    }
    return this.ocrResults.add(item);
  }

  async getOCRResult(id: string): Promise<StoredOCRResult | undefined> {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.get(id);
    }
    return this.ocrResults.get(id);
  }

  async putOCRResult(item: StoredOCRResult): Promise<string> {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.put(item);
    }
    return this.ocrResults.put(item);
  }

  async deleteOCRResult(id: string): Promise<void> {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.delete(id);
    }
    return this.ocrResults.delete(id);
  }

  async getAllOCRResults(): Promise<StoredOCRResult[]> {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.toArray();
    }
    return this.ocrResults.toArray();
  }

  clear(): void {
    if (this.inMemoryStorage) {
      this.inMemoryStorage.clear();
    }
  }

  async closeConnection(): Promise<void> {
    if (this.inMemoryStorage) {
      this.inMemoryStorage.clear();
    } else {
      await this.close();
    }
  }
}

// Singleton database instance
let dbInstance: OCRDatabase | null = null;

function getDb(): OCRDatabase {
  if (!dbInstance) {
    dbInstance = new OCRDatabase();
  }
  return dbInstance;
}

/**
 * Calculate word count from text
 */
function calculateWordCount(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Calculate relevance score for search results
 * Returns the number of matching query terms found in the text
 */
function calculateRelevance(text: string, queryTerms: string[]): number {
  const lowerText = text.toLowerCase();
  let score = 0;

  for (const term of queryTerms) {
    const regex = new RegExp(term.toLowerCase(), 'g');
    const matches = lowerText.match(regex);
    if (matches) {
      score += matches.length;
    }
  }

  return score;
}

/**
 * OCRStorage class for encrypted OCR result storage
 *
 * Provides CRUD operations for OCR results with automatic encryption/decryption
 * using XSalsa20-Poly1305 via the core-crypto package.
 */
export class OCRStorage {
  private db: OCRDatabase;

  constructor() {
    this.db = getDb();
  }

  /**
   * Save a new OCR result with encrypted text
   *
   * @param input - OCR result data (without id, createdAt, updatedAt)
   * @param key - Encryption key (32 bytes for XSalsa20-Poly1305)
   * @returns The saved OCR result with generated id and timestamps
   */
  async saveOCRResult(input: OCRResultInput, key: Uint8Array): Promise<OCRResult> {
    const id = uuidv4();
    const now = new Date();

    // Always calculate word count from text to ensure consistency
    const wordCount = calculateWordCount(input.text);

    // Encrypt the text
    const encryptedText = await encryptData(input.text, key);

    const storedOCRResult: StoredOCRResult = {
      id,
      documentId: input.documentId,
      documentType: input.documentType,
      pageNumber: input.pageNumber,
      encryptedText,
      confidence: input.confidence,
      language: input.language,
      wordCount,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.addOCRResult(storedOCRResult);

    return {
      ...storedOCRResult,
      text: input.text,
    };
  }

  /**
   * Retrieve and decrypt an OCR result by document ID and page number
   *
   * @param documentId - Document ID
   * @param pageNumber - Page number (optional, for PDFs)
   * @param key - Decryption key
   * @returns The decrypted OCR result or null if not found
   */
  async getOCRResult(
    documentId: string,
    pageNumber: number | undefined,
    key: Uint8Array
  ): Promise<OCRResult | null> {
    const allResults = await this.db.getAllOCRResults();

    const storedResult = allResults.find(
      r => r.documentId === documentId && r.pageNumber === pageNumber
    );

    if (!storedResult) {
      return null;
    }

    // Decrypt the text
    const text = await decryptData(storedResult.encryptedText, key);

    return {
      ...storedResult,
      text,
    };
  }

  /**
   * Get all OCR results for a document
   *
   * @param documentId - Document ID
   * @param key - Decryption key
   * @returns Array of all OCR results for the document, sorted by page number
   */
  async getAllOCRResultsForDocument(documentId: string, key: Uint8Array): Promise<OCRResult[]> {
    const allResults = await this.db.getAllOCRResults();

    // Filter by document ID
    const documentResults = allResults.filter(r => r.documentId === documentId);

    // Decrypt all texts
    const results: OCRResult[] = await Promise.all(
      documentResults.map(async stored => {
        const text = await decryptData(stored.encryptedText, key);
        return {
          ...stored,
          text,
        };
      })
    );

    // Sort by page number (null/undefined last)
    return results.sort((a, b) => {
      if (a.pageNumber === undefined && b.pageNumber === undefined) return 0;
      if (a.pageNumber === undefined) return 1;
      if (b.pageNumber === undefined) return -1;
      return a.pageNumber - b.pageNumber;
    });
  }

  /**
   * Get recent OCR results sorted by date (newest first)
   *
   * @param limit - Maximum number of results to return (optional)
   * @param key - Decryption key
   * @returns Array of recent OCR results
   */
  async getRecentOCRResults(limit: number | undefined, key: Uint8Array): Promise<OCRResult[]> {
    const allResults = await this.db.getAllOCRResults();

    // Sort by creation date (newest first)
    const sortedResults = allResults.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit if specified
    const limitedResults = limit ? sortedResults.slice(0, limit) : sortedResults;

    // Decrypt all texts
    const results: OCRResult[] = await Promise.all(
      limitedResults.map(async stored => {
        const text = await decryptData(stored.encryptedText, key);
        return {
          ...stored,
          text,
        };
      })
    );

    return results;
  }

  /**
   * Search OCR text content
   *
   * @param query - Search query string
   * @param key - Decryption key
   * @returns Array of matching OCR results with relevance scores, ranked by relevance
   */
  async searchOCRText(query: string, key: Uint8Array): Promise<OCRResultWithRelevance[]> {
    if (!query.trim()) {
      return [];
    }

    const queryTerms = query.trim().toLowerCase().split(/\s+/);
    const allResults = await this.db.getAllOCRResults();

    // Decrypt all texts and calculate relevance
    const resultsWithRelevance: OCRResultWithRelevance[] = await Promise.all(
      allResults.map(async stored => {
        const text = await decryptData(stored.encryptedText, key);
        const relevance = calculateRelevance(text, queryTerms);

        return {
          ...stored,
          text,
          relevance,
        };
      })
    );

    // Filter to only include results with relevance > 0
    const matchingResults = resultsWithRelevance.filter(r => r.relevance > 0);

    // Sort by relevance (highest first)
    return matchingResults.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Delete an OCR result by ID
   *
   * @param id - OCR result ID
   */
  async deleteOCRResult(id: string): Promise<void> {
    try {
      await this.db.deleteOCRResult(id);
    } catch {
      // Silently ignore if result doesn't exist
    }
  }

  /**
   * Delete all OCR results for a document
   *
   * @param documentId - Document ID
   */
  async deleteAllOCRResultsForDocument(documentId: string): Promise<void> {
    const allResults = await this.db.getAllOCRResults();
    const documentResults = allResults.filter(r => r.documentId === documentId);

    await Promise.all(documentResults.map(r => this.db.deleteOCRResult(r.id)));
  }

  /**
   * Close the database connection
   * Useful for testing and cleanup
   */
  async close(): Promise<void> {
    await this.db.closeConnection();
    dbInstance = null;
  }

  /**
   * Clear all OCR results (useful for testing)
   */
  clear(): void {
    this.db.clear();
  }
}

/**
 * Factory function to create an OCRStorage instance
 * @returns New OCRStorage instance
 */
export function createOCRStorage(): OCRStorage {
  return new OCRStorage();
}

// Default export
export default OCRStorage;
