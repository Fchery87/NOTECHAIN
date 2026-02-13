import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OCRStorage, type OCRResultInput } from '../ocrStorage';

// Mock the crypto module - use base64 encoding to preserve full data
vi.mock('@notechain/core-crypto', () => ({
  encryptData: vi.fn(async (data: string) => ({
    // Store full data using base64 encoding
    ciphertext: Buffer.from(data).toString('base64'),
    nonce: 'mock_nonce',
    authTag: 'mock_authTag',
  })),
  decryptData: vi.fn(async (encrypted: { ciphertext: string }) => {
    // Decode from base64 to get full data back
    return Buffer.from(encrypted.ciphertext, 'base64').toString('utf-8');
  }),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
}));

describe('OCRStorage', () => {
  let storage: OCRStorage;
  let mockKey: Uint8Array;

  const sampleOCRInput: OCRResultInput = {
    documentId: 'doc-123',
    documentType: 'pdf',
    pageNumber: 1,
    text: 'This is extracted text from page 1 of the document.',
    confidence: 95,
    language: 'eng',
    wordCount: 10,
  };

  const sampleImageInput: OCRResultInput = {
    documentId: 'doc-456',
    documentType: 'image',
    text: 'This is extracted text from an image.',
    confidence: 88,
    language: 'eng',
    wordCount: 8,
  };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create a fresh storage instance
    storage = new OCRStorage();
    storage.clear();

    // Mock encryption key (32 bytes for XSalsa20-Poly1305)
    mockKey = new Uint8Array(32).fill(1);
  });

  afterEach(async () => {
    await storage.close();
  });

  describe('initialization', () => {
    it('should create OCRStorage instance', () => {
      expect(storage).toBeInstanceOf(OCRStorage);
    });
  });

  describe('saveOCRResult', () => {
    it('should save an OCR result with generated id and timestamps', async () => {
      const result = await storage.saveOCRResult(sampleOCRInput, mockKey);

      expect(result.id).toBeDefined();
      expect(result.documentId).toBe(sampleOCRInput.documentId);
      expect(result.text).toBe(sampleOCRInput.text);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should encrypt the text before storing', async () => {
      const { encryptData } = await import('@notechain/core-crypto');

      await storage.saveOCRResult(sampleOCRInput, mockKey);

      expect(encryptData).toHaveBeenCalledWith(sampleOCRInput.text, mockKey);
    });

    it('should handle image documents (no pageNumber)', async () => {
      const result = await storage.saveOCRResult(sampleImageInput, mockKey);

      expect(result.documentType).toBe('image');
      expect(result.pageNumber).toBeUndefined();
    });

    it('should handle PDF documents with page numbers', async () => {
      const result = await storage.saveOCRResult(sampleOCRInput, mockKey);

      expect(result.documentType).toBe('pdf');
      expect(result.pageNumber).toBe(1);
    });

    it('should calculate word count if not provided', async () => {
      const inputWithoutWordCount = {
        ...sampleOCRInput,
        wordCount: undefined,
      };

      const result = await storage.saveOCRResult(inputWithoutWordCount, mockKey);

      expect(result.wordCount).toBe(10); // Based on sample text
    });
  });

  describe('getOCRResult', () => {
    it('should retrieve and decrypt an OCR result by documentId and pageNumber', async () => {
      const savedResult = await storage.saveOCRResult(sampleOCRInput, mockKey);
      const retrievedResult = await storage.getOCRResult(
        savedResult.documentId,
        savedResult.pageNumber,
        mockKey
      );

      expect(retrievedResult).not.toBeNull();
      expect(retrievedResult?.id).toBe(savedResult.id);
      expect(retrievedResult?.text).toBe(sampleOCRInput.text);
    });

    it('should retrieve image OCR result by documentId only', async () => {
      const savedResult = await storage.saveOCRResult(sampleImageInput, mockKey);
      const retrievedResult = await storage.getOCRResult(
        savedResult.documentId,
        undefined,
        mockKey
      );

      expect(retrievedResult).not.toBeNull();
      expect(retrievedResult?.documentType).toBe('image');
      expect(retrievedResult?.text).toBe(sampleImageInput.text);
    });

    it('should decrypt the text when retrieving', async () => {
      const { decryptData } = await import('@notechain/core-crypto');
      const savedResult = await storage.saveOCRResult(sampleOCRInput, mockKey);

      await storage.getOCRResult(savedResult.documentId, savedResult.pageNumber, mockKey);

      expect(decryptData).toHaveBeenCalled();
    });

    it('should return null for non-existent result', async () => {
      const result = await storage.getOCRResult('non-existent-id', 1, mockKey);

      expect(result).toBeNull();
    });

    it('should return null for non-existent page', async () => {
      const savedResult = await storage.saveOCRResult(sampleOCRInput, mockKey);
      const result = await storage.getOCRResult(savedResult.documentId, 99, mockKey);

      expect(result).toBeNull();
    });
  });

  describe('getAllOCRResultsForDocument', () => {
    it('should get all OCR results for a document', async () => {
      const docId = 'multi-page-doc';

      // Save multiple pages
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: docId, pageNumber: 1, text: 'Page 1 text' },
        mockKey
      );
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: docId, pageNumber: 2, text: 'Page 2 text' },
        mockKey
      );
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: docId, pageNumber: 3, text: 'Page 3 text' },
        mockKey
      );

      const results = await storage.getAllOCRResultsForDocument(docId, mockKey);

      expect(results).toHaveLength(3);
      expect(results.map(r => r.pageNumber)).toEqual([1, 2, 3]);
    });

    it('should return results sorted by page number', async () => {
      const docId = 'unsorted-doc';

      // Save pages in reverse order
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: docId, pageNumber: 3, text: 'Page 3' },
        mockKey
      );
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: docId, pageNumber: 1, text: 'Page 1' },
        mockKey
      );
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: docId, pageNumber: 2, text: 'Page 2' },
        mockKey
      );

      const results = await storage.getAllOCRResultsForDocument(docId, mockKey);

      expect(results.map(r => r.pageNumber)).toEqual([1, 2, 3]);
    });

    it('should return empty array when no results exist', async () => {
      const results = await storage.getAllOCRResultsForDocument('non-existent', mockKey);

      expect(results).toEqual([]);
    });

    it('should include image documents in results', async () => {
      const docId = 'mixed-doc';

      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: docId, pageNumber: 1, text: 'Page 1' },
        mockKey
      );
      await storage.saveOCRResult(
        { ...sampleImageInput, documentId: docId, documentType: 'image', text: 'Image text' },
        mockKey
      );

      const results = await storage.getAllOCRResultsForDocument(docId, mockKey);

      expect(results).toHaveLength(2);
    });
  });

  describe('getRecentOCRResults', () => {
    it('should return recent OCR results sorted by date', async () => {
      await storage.saveOCRResult(sampleOCRInput, mockKey);
      await new Promise(resolve => setTimeout(resolve, 10));
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: 'doc-2', text: 'Second text' },
        mockKey
      );
      await new Promise(resolve => setTimeout(resolve, 10));
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: 'doc-3', text: 'Third text' },
        mockKey
      );

      const results = await storage.getRecentOCRResults(2, mockKey);

      expect(results).toHaveLength(2);
      expect(results[0].documentId).toBe('doc-3');
      expect(results[1].documentId).toBe('doc-2');
    });

    it('should return all results when limit not specified', async () => {
      await storage.saveOCRResult(sampleOCRInput, mockKey);
      await storage.saveOCRResult({ ...sampleOCRInput, documentId: 'doc-2' }, mockKey);

      const results = await storage.getRecentOCRResults(undefined, mockKey);

      expect(results).toHaveLength(2);
    });

    it('should return empty array when no results exist', async () => {
      const results = await storage.getRecentOCRResults(undefined, mockKey);

      expect(results).toEqual([]);
    });
  });

  describe('searchOCRText', () => {
    it('should find matches in OCR text', async () => {
      await storage.saveOCRResult(
        { ...sampleOCRInput, text: 'The quick brown fox jumps over the lazy dog' },
        mockKey
      );
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: 'doc-2', text: 'The quick brown cat sleeps' },
        mockKey
      );
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: 'doc-3', text: 'Something completely different' },
        mockKey
      );

      const results = await storage.searchOCRText('quick brown', mockKey);

      expect(results).toHaveLength(2);
    });

    it('should be case-insensitive', async () => {
      await storage.saveOCRResult({ ...sampleOCRInput, text: 'HELLO WORLD' }, mockKey);

      const results = await storage.searchOCRText('hello', mockKey);

      expect(results).toHaveLength(1);
    });

    it('should return ranked results by relevance (word match count)', async () => {
      // Most relevant: matches both words multiple times
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: 'doc-1', text: 'budget budget finance finance' },
        mockKey
      );
      // Less relevant: matches both words once each
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: 'doc-2', text: 'budget and finance report' },
        mockKey
      );
      // Least relevant: matches only one word
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: 'doc-3', text: 'budget report only' },
        mockKey
      );

      const results = await storage.searchOCRText('budget finance', mockKey);

      expect(results).toHaveLength(3);
      expect(results[0].documentId).toBe('doc-1'); // Highest relevance
      expect(results[0].relevance).toBeGreaterThan(results[1].relevance);
      expect(results[1].relevance).toBeGreaterThan(results[2].relevance);
    });

    it('should return empty array when no matches found', async () => {
      await storage.saveOCRResult(sampleOCRInput, mockKey);

      const results = await storage.searchOCRText('nonexistent', mockKey);

      expect(results).toEqual([]);
    });

    it('should include relevance score in results', async () => {
      await storage.saveOCRResult(sampleOCRInput, mockKey);

      const results = await storage.searchOCRText('extracted', mockKey);

      expect(results[0]).toHaveProperty('relevance');
      expect(typeof results[0].relevance).toBe('number');
    });
  });

  describe('deleteOCRResult', () => {
    it('should remove OCR result from storage', async () => {
      const savedResult = await storage.saveOCRResult(sampleOCRInput, mockKey);

      await storage.deleteOCRResult(savedResult.id);

      const retrievedResult = await storage.getOCRResult(
        savedResult.documentId,
        savedResult.pageNumber,
        mockKey
      );
      expect(retrievedResult).toBeNull();
    });

    it('should not throw when deleting non-existent result', async () => {
      await expect(async () => {
        await storage.deleteOCRResult('non-existent-id');
      }).not.toThrow();
    });

    it('should remove result from getAllOCRResultsForDocument', async () => {
      const docId = 'delete-test-doc';
      const savedResult = await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: docId, pageNumber: 1 },
        mockKey
      );
      await storage.saveOCRResult({ ...sampleOCRInput, documentId: docId, pageNumber: 2 }, mockKey);

      let results = await storage.getAllOCRResultsForDocument(docId, mockKey);
      expect(results).toHaveLength(2);

      await storage.deleteOCRResult(savedResult.id);

      results = await storage.getAllOCRResultsForDocument(docId, mockKey);
      expect(results).toHaveLength(1);
    });
  });

  describe('deleteAllOCRResultsForDocument', () => {
    it('should remove all OCR results for a document', async () => {
      const docId = 'multi-page-delete-doc';

      await storage.saveOCRResult({ ...sampleOCRInput, documentId: docId, pageNumber: 1 }, mockKey);
      await storage.saveOCRResult({ ...sampleOCRInput, documentId: docId, pageNumber: 2 }, mockKey);
      await storage.saveOCRResult({ ...sampleOCRInput, documentId: docId, pageNumber: 3 }, mockKey);

      let results = await storage.getAllOCRResultsForDocument(docId, mockKey);
      expect(results).toHaveLength(3);

      await storage.deleteAllOCRResultsForDocument(docId);

      results = await storage.getAllOCRResultsForDocument(docId, mockKey);
      expect(results).toHaveLength(0);
    });

    it('should not affect other documents', async () => {
      const docId1 = 'doc-1';
      const docId2 = 'doc-2';

      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: docId1, pageNumber: 1 },
        mockKey
      );
      await storage.saveOCRResult(
        { ...sampleOCRInput, documentId: docId2, pageNumber: 1 },
        mockKey
      );

      await storage.deleteAllOCRResultsForDocument(docId1);

      const results1 = await storage.getAllOCRResultsForDocument(docId1, mockKey);
      const results2 = await storage.getAllOCRResultsForDocument(docId2, mockKey);

      expect(results1).toHaveLength(0);
      expect(results2).toHaveLength(1);
    });

    it('should not throw when document has no results', async () => {
      await expect(async () => {
        await storage.deleteAllOCRResultsForDocument('non-existent-doc');
      }).not.toThrow();
    });
  });

  describe('multi-page documents', () => {
    it('should handle documents with many pages', async () => {
      const docId = 'large-doc';

      // Save 10 pages
      for (let i = 1; i <= 10; i++) {
        await storage.saveOCRResult(
          {
            ...sampleOCRInput,
            documentId: docId,
            pageNumber: i,
            text: `Content of page ${i}`,
          },
          mockKey
        );
      }

      const results = await storage.getAllOCRResultsForDocument(docId, mockKey);

      expect(results).toHaveLength(10);
      expect(results.every(r => r.documentId === docId)).toBe(true);
    });

    it('should retrieve correct page by number', async () => {
      const docId = 'page-test-doc';

      for (let i = 1; i <= 5; i++) {
        await storage.saveOCRResult(
          {
            ...sampleOCRInput,
            documentId: docId,
            pageNumber: i,
            text: `Page ${i} content`,
          },
          mockKey
        );
      }

      const page3 = await storage.getOCRResult(docId, 3, mockKey);
      expect(page3?.text).toBe('Page 3 content');

      const page1 = await storage.getOCRResult(docId, 1, mockKey);
      expect(page1?.text).toBe('Page 1 content');
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', async () => {
      const input = {
        ...sampleOCRInput,
        text: '',
      };

      const result = await storage.saveOCRResult(input, mockKey);
      const retrieved = await storage.getOCRResult(result.documentId, result.pageNumber, mockKey);

      expect(retrieved?.text).toBe('');
      expect(retrieved?.wordCount).toBe(0);
    });

    it('should handle special characters in text', async () => {
      const input = {
        ...sampleOCRInput,
        text: 'Special chars: ñ, é, 中文, 🎉, <script>',
      };

      const result = await storage.saveOCRResult(input, mockKey);
      const retrieved = await storage.getOCRResult(result.documentId, result.pageNumber, mockKey);

      expect(retrieved?.text).toBe(input.text);
    });

    it('should handle very long text', async () => {
      const longText = 'word '.repeat(10000);
      const input = {
        ...sampleOCRInput,
        text: longText,
      };

      const result = await storage.saveOCRResult(input, mockKey);
      const retrieved = await storage.getOCRResult(result.documentId, result.pageNumber, mockKey);

      expect(retrieved?.text).toBe(longText);
    });

    it('should handle zero confidence', async () => {
      const input = {
        ...sampleOCRInput,
        confidence: 0,
      };

      const result = await storage.saveOCRResult(input, mockKey);

      expect(result.confidence).toBe(0);
    });

    it('should handle 100% confidence', async () => {
      const input = {
        ...sampleOCRInput,
        confidence: 100,
      };

      const result = await storage.saveOCRResult(input, mockKey);

      expect(result.confidence).toBe(100);
    });
  });
});
