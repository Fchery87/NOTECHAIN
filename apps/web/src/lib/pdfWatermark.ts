import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Watermark configuration
 */
export interface WatermarkConfig {
  text: string;
  opacity?: number;
  rotation?: number;
  fontSize?: number;
  color?: string;
  position?: 'diagonal' | 'center' | 'bottom-right';
}

/**
 * PDF Watermark Service
 * US-PDF-04: PDF watermark export
 * Adds branded watermarks to signed PDFs
 */
export class PDFWatermarkService {
  /**
   * Applies watermark to PDF
   * @param pdfBuffer Original PDF bytes
   * @param config Watermark configuration
   * @returns Modified PDF bytes
   */
  static async applyWatermark(pdfBuffer: Uint8Array, config: WatermarkConfig): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    // Embed font for watermark text
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Apply watermark to each page
    for (const page of pages) {
      await this.addWatermarkToPage(page, font, config);
    }

    return await pdfDoc.save();
  }

  /**
   * Adds watermark to a single page
   * @param page PDF page
   * @param font Embedded font
   * @param config Watermark configuration
   */
  private static async addWatermarkToPage(
    page: any,
    font: any,
    config: WatermarkConfig
  ): Promise<void> {
    const { width, height } = page.getSize();
    const opacity = config.opacity || 0.1;
    const fontSize = config.fontSize || 24;
    const color = this.hexToRgb(config.color || '#cccccc');

    const watermarkText = config.text || 'Signed with NoteChain';
    const rotation = config.rotation || -45;

    switch (config.position) {
      case 'diagonal':
        await this.addDiagonalWatermark(
          page,
          font,
          watermarkText,
          width,
          height,
          opacity,
          fontSize,
          color,
          rotation
        );
        break;

      case 'center':
        await this.addCenterWatermark(
          page,
          font,
          watermarkText,
          width,
          height,
          opacity,
          fontSize,
          color
        );
        break;

      case 'bottom-right':
        await this.addCornerWatermark(
          page,
          font,
          watermarkText,
          width,
          height,
          opacity,
          fontSize,
          color,
          'bottom-right'
        );
        break;
    }
  }

  /**
   * Adds diagonal watermark across page
   */
  private static async addDiagonalWatermark(
    page: any,
    font: any,
    text: string,
    width: number,
    height: number,
    opacity: number,
    fontSize: number,
    color: any,
    rotation: number
  ): Promise<void> {
    // Calculate text width
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    // Calculate positions for diagonal placement
    const diagonalLength = Math.sqrt(width ** 2 + height ** 2);
    const repetitions = Math.ceil(diagonalLength / (textWidth + 50));

    // Draw multiple watermarks diagonally
    for (let i = 0; i < repetitions; i++) {
      const progress = i / repetitions;
      const x = progress * width + (progress - 0.5) * height * 0.5;
      const y = progress * height - (progress - 0.5) * width * 0.5;

      page.drawText(text, {
        x,
        y,
        font,
        size: fontSize,
        color: rgb(color.r, color.g, color.b),
        opacity,
        rotate: {
          type: 'degrees',
          angle: rotation,
        },
      });
    }
  }

  /**
   * Adds centered watermark to page
   */
  private static async addCenterWatermark(
    page: any,
    font: any,
    text: string,
    width: number,
    height: number,
    opacity: number,
    fontSize: number,
    color: any
  ): Promise<void> {
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = fontSize;

    const x = (width - textWidth) / 2;
    const y = (height - textHeight) / 2;

    page.drawText(text, {
      x,
      y,
      font,
      size: fontSize,
      color: rgb(color.r, color.g, color.b),
      opacity,
    });
  }

  /**
   * Adds corner watermark to page
   */
  private static async addCornerWatermark(
    page: any,
    font: any,
    text: string,
    width: number,
    height: number,
    opacity: number,
    fontSize: number,
    color: any,
    position: 'bottom-right' | 'top-left' | 'top-right' | 'bottom-left'
  ): Promise<void> {
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const padding = 20;

    let x: number;
    let y: number;

    switch (position) {
      case 'bottom-right':
        x = width - textWidth - padding;
        y = padding;
        break;
      case 'top-left':
        x = padding;
        y = height - padding - fontSize;
        break;
      case 'top-right':
        x = width - textWidth - padding;
        y = height - padding - fontSize;
        break;
      case 'bottom-left':
        x = padding;
        y = padding;
        break;
    }

    page.drawText(text, {
      x,
      y,
      font,
      size: fontSize,
      color: rgb(color.r, color.g, color.b),
      opacity,
    });
  }

  /**
   * Converts hex color to RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 200, g: 200, b: 200 }; // Default gray
  }

  /**
   * Gets default watermark configuration
   * @returns Default watermark config
   */
  static getDefaultWatermark(): WatermarkConfig {
    return {
      text: 'Signed with NoteChain',
      opacity: 0.1,
      rotation: -45,
      fontSize: 24,
      color: '#cccccc',
      position: 'diagonal',
    };
  }

  /**
   * Creates watermark with user branding
   * @param userName User's name for watermark
   * @returns Watermark configuration
   */
  static createBrandedWatermark(userName: string): WatermarkConfig {
    return {
      text: `Signed by ${userName} with NoteChain`,
      opacity: 0.15,
      rotation: -30,
      fontSize: 28,
      color: '#999999',
      position: 'diagonal',
    };
  }

  /**
   * Validates watermark configuration
   * @param config Watermark configuration
   * @returns True if valid
   */
  static validateWatermark(config: WatermarkConfig): boolean {
    if (!config.text || config.text.trim().length === 0) {
      return false;
    }

    if (config.opacity && (config.opacity < 0 || config.opacity > 1)) {
      return false;
    }

    if (config.fontSize && config.fontSize < 1) {
      return false;
    }

    if (config.rotation && (config.rotation < -180 || config.rotation > 180)) {
      return false;
    }

    if (config.color && !/^#[0-9a-f]{6}$/i.test(config.color)) {
      return false;
    }

    return true;
  }

  /**
   * Previews watermark on a page
   * @param page PDF page
   * @param config Watermark configuration
   * @returns Preview configuration
   */
  static getWatermarkPreview(config: WatermarkConfig): {
    text: string;
    opacity: number;
    fontSize: number;
    color: string;
    rotation: number;
  } {
    return {
      text: config.text,
      opacity: config.opacity || 0.1,
      fontSize: config.fontSize || 24,
      color: config.color || '#cccccc',
      rotation: config.rotation || -45,
    };
  }
}
