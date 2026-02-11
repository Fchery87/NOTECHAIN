import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { OCRService } from '../ocrService';

// Mock Tesseract.js
const mockRecognize = mock(async () => ({
  data: {
    text: 'Extracted text',
    confidence: 95,
  },
}));

const mockTerminate = mock(async () => {});

const mockWorker = {
  recognize: mockRecognize,
  terminate: mockTerminate,
};

const mockCreateWorker = mock(async () => mockWorker);

mock.module('tesseract.js', () => ({
  createWorker: mockCreateWorker,
}));

// Mock pdf-lib
const mockPdfDocumentLoad = mock(async () => mockPdfDocument);
const mockPdfPageRender = mock(async () => {});
const mockGetPageCount = mock(() => 2);
const mockGetPage = mock(() => mockPdfPage);
const mockGetSize = mock(() => ({ width: 612, height: 792 }));

const mockPdfPage = {
  getSize: mockGetSize,
  render: mockPdfPageRender,
};

const mockPdfDocument = {
  getPageCount: mockGetPageCount,
  getPage: mockGetPage,
};

mock.module('pdf-lib', () => ({
  PDFDocument: {
    load: mockPdfDocumentLoad,
  },
}));

describe('OCRService', () => {
  let service: OCRService;

  beforeEach(() => {
    // Reset mocks
    mockCreateWorker.mockClear();
    mockRecognize.mockClear();
    mockTerminate.mockClear();
    mockPdfDocumentLoad.mockClear();
    mockGetPageCount.mockClear();
    mockGetPage.mockClear();

    service = new OCRService();
  });

  describe('initialization', () => {
    it('should create an OCRService instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(OCRService);
    });

    it('should initialize with default language', async () => {
      await service.initialize();
      expect(mockCreateWorker).toHaveBeenCalledWith('eng');
    });

    it('should initialize with custom language', async () => {
      await service.initialize('spa');
      expect(mockCreateWorker).toHaveBeenCalledWith('spa');
    });

    it('should not create multiple workers on repeated initialization', async () => {
      await service.initialize();
      await service.initialize();
      await service.initialize();
      expect(mockCreateWorker).toHaveBeenCalledTimes(1);
    });
  });

  describe('extractTextFromImage', () => {
    it('should have extractTextFromImage method', () => {
      expect(typeof service.extractTextFromImage).toBe('function');
    });

    it('should extract text from image', async () => {
      const imageBlob = new Blob(['image data'], { type: 'image/png' });

      const result = await service.extractTextFromImage(imageBlob);

      expect(result).toEqual({
        text: 'Extracted text',
        confidence: 95,
      });
      expect(mockRecognize).toHaveBeenCalledWith(imageBlob);
    });

    it('should call onProgress during OCR', async () => {
      const onProgress = mock(() => {});

      const imageBlob = new Blob(['image data'], { type: 'image/png' });
      await service.extractTextFromImage(imageBlob, { onProgress });

      expect(onProgress).toHaveBeenCalled();
    });

    it('should auto-initialize if not already initialized', async () => {
      const imageBlob = new Blob(['image data'], { type: 'image/png' });
      await service.extractTextFromImage(imageBlob);

      expect(mockCreateWorker).toHaveBeenCalledTimes(1);
    });

    it('should support language selection', async () => {
      const imageBlob = new Blob(['image data'], { type: 'image/png' });
      await service.extractTextFromImage(imageBlob, { language: 'fra' });

      expect(mockCreateWorker).toHaveBeenCalledWith('fra');
    });

    it('should handle errors for invalid images', async () => {
      mockRecognize.mockImplementationOnce(async () => {
        throw new Error('Invalid image format');
      });

      const invalidBlob = new Blob(['not an image'], { type: 'text/plain' });

      try {
        await service.extractTextFromImage(invalidBlob);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Invalid image format');
      }
    });
  });

  describe('extractTextFromPDF', () => {
    it('should have extractTextFromPDF method', () => {
      expect(typeof service.extractTextFromPDF).toBe('function');
    });

    it('should extract text from PDF', async () => {
      mockGetPageCount.mockReturnValue(2);

      // Mock canvas operations
      const mockToBlob = mock((callback: (blob: Blob | null) => void) => {
        callback(new Blob(['pdf page image'], { type: 'image/png' }));
      });

      const mockGetContext = mock(() => ({
        drawImage: mock(() => {}),
      }));

      // Mock document.createElement for canvas
      const originalCreateElement = document.createElement;
      document.createElement = (tagName: string) => {
        if (tagName === 'canvas') {
          return {
            getContext: mockGetContext,
            toBlob: mockToBlob,
            width: 0,
            height: 0,
          } as any;
        }
        return originalCreateElement.call(document, tagName);
      };

      const pdfBlob = new Blob(['pdf data'], { type: 'application/pdf' });

      try {
        const result = await service.extractTextFromPDF(pdfBlob);

        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('pageCount');
        expect(result.pageCount).toBe(2);
      } finally {
        document.createElement = originalCreateElement;
      }
    });

    it('should extract text from specific page', async () => {
      mockGetPageCount.mockReturnValue(3);

      const pdfBlob = new Blob(['pdf data'], { type: 'application/pdf' });

      // Mock canvas
      const originalCreateElement = document.createElement;
      document.createElement = (tagName: string) => {
        if (tagName === 'canvas') {
          return {
            getContext: () => ({
              drawImage: () => {},
            }),
            toBlob: (cb: (blob: Blob | null) => void) => cb(new Blob(['img'])),
            width: 0,
            height: 0,
          } as any;
        }
        return originalCreateElement.call(document, tagName);
      };

      try {
        await service.extractTextFromPDF(pdfBlob, 2);
        expect(mockGetPage).toHaveBeenCalledWith(1); // 0-indexed internally
      } finally {
        document.createElement = originalCreateElement;
      }
    });

    it('should handle PDF extraction errors', async () => {
      mockPdfDocumentLoad.mockImplementationOnce(async () => {
        throw new Error('Invalid PDF');
      });

      const pdfBlob = new Blob(['invalid pdf'], { type: 'application/pdf' });

      try {
        await service.extractTextFromPDF(pdfBlob);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Invalid PDF');
      }
    });
  });

  describe('recognizeHandwriting', () => {
    it('should have recognizeHandwriting method', () => {
      expect(typeof service.recognizeHandwriting).toBe('function');
    });

    it('should recognize handwriting from image', async () => {
      const imageBlob = new Blob(['handwritten image'], { type: 'image/png' });

      const result = await service.recognizeHandwriting(imageBlob);

      expect(result).toEqual({
        text: 'Extracted text',
        confidence: 95,
      });
    });

    it('should auto-initialize if not already initialized', async () => {
      const imageBlob = new Blob(['handwritten image'], { type: 'image/png' });
      await service.recognizeHandwriting(imageBlob);

      expect(mockCreateWorker).toHaveBeenCalledTimes(1);
    });

    it('should handle handwriting recognition errors', async () => {
      mockRecognize.mockImplementationOnce(async () => {
        throw new Error('Handwriting recognition failed');
      });

      const imageBlob = new Blob(['handwritten image'], { type: 'image/png' });

      try {
        await service.recognizeHandwriting(imageBlob);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Handwriting recognition failed');
      }
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return supported languages', () => {
      const languages = service.getSupportedLanguages();

      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain('eng');
      expect(languages).toContain('spa');
      expect(languages).toContain('fra');
      expect(languages).toContain('deu');
    });
  });

  describe('terminate', () => {
    it('should terminate worker', async () => {
      await service.initialize();
      await service.terminate();

      expect(mockTerminate).toHaveBeenCalled();
    });

    it('should not throw if terminate called without initialization', async () => {
      await service.terminate();
      expect(true).toBe(true); // Should reach here without error
    });

    it('should set worker to null after termination', async () => {
      await service.initialize();
      await service.terminate();

      // Verify worker is cleaned up by checking it re-initializes on next use
      await service.initialize();
      expect(mockCreateWorker).toHaveBeenCalledTimes(2);
    });
  });

  describe('worker lifecycle', () => {
    it('should create worker on initialization', async () => {
      await service.initialize();
      expect(mockCreateWorker).toHaveBeenCalled();
    });

    it('should terminate worker on cleanup', async () => {
      await service.initialize();
      await service.terminate();
      expect(mockTerminate).toHaveBeenCalled();
    });
  });

  describe('logger functionality', () => {
    it('should use custom logger when provided', async () => {
      const logMessages: string[] = [];
      const customLogger = (message: string) => {
        logMessages.push(message);
      };
      const serviceWithLogger = new OCRService(customLogger);

      await serviceWithLogger.initialize();

      // Logger should be called during operations
      expect(logMessages.length).toBeGreaterThan(0);
    });

    it('should use console.log as default logger', async () => {
      const consoleSpy = mock(() => {});
      const originalLog = console.log;
      console.log = consoleSpy;

      try {
        const defaultService = new OCRService();
        await defaultService.initialize();

        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        console.log = originalLog;
      }
    });
  });
});
