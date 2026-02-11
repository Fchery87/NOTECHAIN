import { createWorker, Worker } from 'tesseract.js';
import { PDFDocument } from 'pdf-lib';

export interface OCROptions {
  language?: string;
  onProgress?: (progress: number) => void;
}

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface PDFOCRResult extends OCRResult {
  pageCount: number;
}

export class OCRService {
  private worker: Worker | null = null;
  private logger: (message: string) => void;
  private currentLanguage: string = 'eng';

  constructor(logger?: (message: string) => void) {
    this.logger = logger || ((message: string) => console.log(message));
  }

  /**
   * Initialize the OCR service with a Tesseract worker
   * @param language - Language code (default: 'eng')
   */
  async initialize(language: string = 'eng'): Promise<void> {
    if (this.worker) {
      this.logger(`OCRService already initialized with language: ${this.currentLanguage}`);
      return;
    }

    this.currentLanguage = language;
    this.logger(`Initializing OCRService with language: ${language}`);

    this.worker = await createWorker(language);
    this.logger('OCRService worker created successfully');
  }

  /**
   * Extract text from an image file or blob
   * @param image - Image file or blob
   * @param options - OCR options including language and progress callback
   * @returns Extracted text and confidence score
   */
  async extractTextFromImage(image: File | Blob, options?: OCROptions): Promise<OCRResult> {
    // Auto-initialize if needed
    if (!this.worker) {
      await this.initialize(options?.language || 'eng');
    }

    // Switch language if different from current
    if (options?.language && options.language !== this.currentLanguage) {
      await this.terminate();
      await this.initialize(options.language);
    }

    this.logger('Extracting text from image...');

    try {
      // Report initial progress
      if (options?.onProgress) {
        options.onProgress(0);
      }

      const result = await this.worker!.recognize(image);

      // Report completion progress
      if (options?.onProgress) {
        options.onProgress(100);
      }

      this.logger(`OCR complete. Confidence: ${result.data.confidence}%`);

      return {
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } catch (error) {
      this.logger(
        `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Extract text from a PDF file
   * @param pdfBlob - PDF file as blob
   * @param pageNumber - Optional specific page number (1-indexed)
   * @returns Extracted text, confidence score, and page count
   */
  async extractTextFromPDF(pdfBlob: Blob, pageNumber?: number): Promise<PDFOCRResult> {
    this.logger('Extracting text from PDF...');

    try {
      // Load PDF document
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();

      this.logger(`PDF loaded with ${pageCount} pages`);

      // Determine which pages to process
      const pagesToProcess: number[] = [];
      if (pageNumber) {
        if (pageNumber < 1 || pageNumber > pageCount) {
          throw new Error(`Invalid page number: ${pageNumber}. PDF has ${pageCount} pages.`);
        }
        pagesToProcess.push(pageNumber);
      } else {
        for (let i = 1; i <= pageCount; i++) {
          pagesToProcess.push(i);
        }
      }

      // Process each page
      const pageTexts: string[] = [];
      let totalConfidence = 0;

      for (const pageNum of pagesToProcess) {
        this.logger(`Processing page ${pageNum}...`);

        const page = pdfDoc.getPage(pageNum - 1); // pdf-lib uses 0-indexed
        const { width, height } = page.getSize();

        // Render page to canvas
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Create a temporary image from the canvas
        const imageBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/png');
        });

        // Run OCR on the page image
        const result = await this.extractTextFromImage(imageBlob);
        pageTexts.push(result.text);
        totalConfidence += result.confidence;
      }

      // Calculate average confidence
      const averageConfidence = totalConfidence / pagesToProcess.length;

      return {
        text: pageTexts.join('\n\n'),
        confidence: averageConfidence,
        pageCount,
      };
    } catch (error) {
      this.logger(
        `PDF OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Recognize handwriting from an image
   * Note: Uses standard OCR with handwriting-optimized settings
   * Future enhancement: Use specialized handwriting models
   * @param image - Image file or blob
   * @returns Extracted text and confidence score
   */
  async recognizeHandwriting(image: File | Blob): Promise<OCRResult> {
    this.logger('Recognizing handwriting...');

    // For now, use standard OCR with English language
    // TODO: Integrate specialized handwriting recognition model when available
    return this.extractTextFromImage(image, { language: 'eng' });
  }

  /**
   * Get list of supported languages
   * @returns Array of language codes
   */
  getSupportedLanguages(): string[] {
    return [
      'eng', // English
      'spa', // Spanish
      'fra', // French
      'deu', // German
      'ita', // Italian
      'por', // Portuguese
      'rus', // Russian
      'chi_sim', // Chinese (Simplified)
      'chi_tra', // Chinese (Traditional)
      'jpn', // Japanese
      'kor', // Korean
      'ara', // Arabic
      'hin', // Hindi
      'tha', // Thai
      'vie', // Vietnamese
      'pol', // Polish
      'nld', // Dutch
      'tur', // Turkish
      'swe', // Swedish
      'dan', // Danish
      'nor', // Norwegian
      'fin', // Finnish
      'ces', // Czech
      'hun', // Hungarian
      'ell', // Greek
      'heb', // Hebrew
      'ind', // Indonesian
      'msa', // Malay
    ];
  }

  /**
   * Terminate the OCR worker and cleanup resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      this.logger('Terminating OCRService worker...');
      await this.worker.terminate();
      this.worker = null;
      this.logger('OCRService worker terminated');
    }
  }
}

// Export singleton instance for convenience
export const ocrService = new OCRService();
