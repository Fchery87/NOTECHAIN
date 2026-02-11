import { PDFDocument } from 'pdf-lib';

/**
 * Signature configuration
 */
export interface SignatureConfig {
  id: string;
  name: string;
  image: Uint8Array;
  type: 'drawn' | 'typed' | 'image';
  createdAt: Date;
  isDefault: boolean;
}

/**
 * Typed signature configuration
 */
export interface TypedSignature extends SignatureConfig {
  type: 'typed';
  font: 'signature' | 'cursive' | 'serif' | 'sans-serif';
  fontSize: number;
  color: string;
  text: string;
}

/**
 * Drawn signature configuration
 */
export interface DrawnSignature extends SignatureConfig {
  type: 'drawn';
  penColor: string;
  strokeWidth: number;
}

/**
 * Image signature configuration
 */
export interface ImageSignature extends SignatureConfig {
  type: 'image';
  format: 'png' | 'jpg';
}

/**
 * Signature Storage Service
 * US-PDF-02: Multiple signature storage
 */
export class SignatureStorageService {
  private static readonly STORAGE_KEY = 'notechain_signatures';
  private static signatures: SignatureConfig[] = [];

  /**
   * Loads signatures from local storage
   */
  static async loadSignatures(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.signatures = JSON.parse(stored) as SignatureConfig[];
      }
    } catch (error) {
      console.error('Failed to load signatures:', error);
      this.signatures = [];
    }
  }

  /**
   * Saves signatures to local storage
   */
  static async saveSignatures(): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.signatures));
    } catch (error) {
      console.error('Failed to save signatures:', error);
      throw new Error('Failed to save signatures');
    }
  }

  /**
   * Adds a new signature
   * @param signature Signature to add
   * @returns Signature ID
   */
  static async addSignature(signature: Omit<SignatureConfig, 'id' | 'createdAt'>): Promise<string> {
    const id = `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSignature: SignatureConfig = {
      ...signature,
      id,
      createdAt: new Date(),
    };

    this.signatures.push(newSignature);
    await this.saveSignatures();

    return id;
  }

  /**
   * Updates an existing signature
   * @param id Signature ID
   * @param updates Signature fields to update
   */
  static async updateSignature(id: string, updates: Partial<SignatureConfig>): Promise<void> {
    const index = this.signatures.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error('Signature not found');
    }

    this.signatures[index] = {
      ...this.signatures[index],
      ...updates,
    };

    await this.saveSignatures();
  }

  /**
   * Deletes a signature
   * @param id Signature ID
   */
  static async deleteSignature(id: string): Promise<void> {
    const index = this.signatures.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error('Signature not found');
    }

    this.signatures.splice(index, 1);
    await this.saveSignatures();
  }

  /**
   * Gets a signature by ID
   * @param id Signature ID
   * @returns Signature or undefined
   */
  static getSignature(id: string): SignatureConfig | undefined {
    return this.signatures.find(s => s.id === id);
  }

  /**
   * Gets all signatures
   * @returns Array of signatures
   */
  static getAllSignatures(): SignatureConfig[] {
    return [...this.signatures];
  }

  /**
   * Gets default signature
   * @returns Default signature or undefined
   */
  static getDefaultSignature(): SignatureConfig | undefined {
    return this.signatures.find(s => s.isDefault);
  }

  /**
   * Sets a signature as default
   * @param id Signature ID
   */
  static async setDefaultSignature(id: string): Promise<void> {
    // Remove default flag from all signatures
    this.signatures = this.signatures.map(s => ({
      ...s,
      isDefault: s.id === id,
    }));

    await this.saveSignatures();
  }

  /**
   * Converts drawn signature image to PNG
   * @param canvas HTML5 canvas element
   * @returns PNG image data
   */
  static canvasToImage(canvas: HTMLCanvasElement): Uint8Array {
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  }

  /**
   * Applies signature to PDF
   * @param pdfBuffer Original PDF bytes
   * @param signature Signature to apply
   * @param pageIndex Page index
   * @param x X position on page
   * @param y Y position on page
   * @param width Signature width
   * @param height Signature height
   * @returns Modified PDF bytes
   */
  static async applySignatureToPDF(
    pdfBuffer: Uint8Array,
    signature: SignatureConfig,
    pageIndex: number,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    if (pageIndex >= pages.length) {
      throw new Error('Invalid page index');
    }

    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Calculate default size if not provided
    const sigWidth = width || pageWidth * 0.3;
    const sigHeight = height || pageHeight * 0.1;

    // Embed signature image
    const signatureImage = await pdfDoc.embedPng(signature.image);

    // Draw signature on page
    page.drawImage(signatureImage, {
      x,
      y: y - sigHeight, // PDF origin is bottom-left
      width: sigWidth,
      height: sigHeight,
    });

    return await pdfDoc.save();
  }

  /**
   * Exports signature for sharing
   * @param signature Signature to export
   * @returns PNG image data
   */
  static exportSignature(signature: SignatureConfig): Uint8Array {
    return signature.image;
  }

  /**
   * Validates signature data
   * @param signature Signature to validate
   * @returns True if valid
   */
  static validateSignature(signature: SignatureConfig): boolean {
    // Validate common fields
    if (!signature.id || !signature.name || !signature.image) {
      return false;
    }

    // Validate image data
    if (signature.image.length === 0) {
      return false;
    }

    // Validate type-specific fields
    if (signature.type === 'typed') {
      const typed = signature as TypedSignature;
      return !!typed.text && typed.fontSize > 0;
    }

    if (signature.type === 'drawn') {
      const drawn = signature as DrawnSignature;
      return drawn.strokeWidth > 0;
    }

    return true;
  }

  /**
   * Gets signature count by type
   * @returns Object with counts by type
   */
  static getSignatureCounts(): {
    total: number;
    drawn: number;
    typed: number;
    image: number;
  } {
    return {
      total: this.signatures.length,
      drawn: this.signatures.filter(s => s.type === 'drawn').length,
      typed: this.signatures.filter(s => s.type === 'typed').length,
      image: this.signatures.filter(s => s.type === 'image').length,
    };
  }

  /**
   * Clears all signatures
   */
  static async clearSignatures(): Promise<void> {
    this.signatures = [];
    await this.saveSignatures();
  }
}
