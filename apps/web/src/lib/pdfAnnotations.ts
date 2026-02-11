import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Annotation types
 */
export type AnnotationType = 'highlight' | 'underline' | 'freehand';

/**
 * Base annotation interface
 */
export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  pageIndex: number;
  createdAt: Date;
}

/**
 * Highlight annotation
 */
export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

/**
 * Underline annotation
 */
export interface UnderlineAnnotation extends BaseAnnotation {
  type: 'underline';
  x: number;
  y: number;
  width: number;
  thickness: number;
  color: string;
}

/**
 * Freehand drawing annotation
 */
export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
}

/**
 * Combined annotation type
 */
export type Annotation = HighlightAnnotation | UnderlineAnnotation | FreehandAnnotation;

/**
 * PDF Annotation Service
 * US-PDF-02: PDF annotations (Pro feature)
 */
export class PDFAnnotationService {
  /**
   * Adds highlight annotation to PDF
   * @param pdfBuffer Original PDF bytes
   * @param annotation Highlight annotation
   * @returns Modified PDF bytes
   */
  static async addHighlight(
    pdfBuffer: Uint8Array,
    annotation: HighlightAnnotation
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const page = pages[annotation.pageIndex];

    const { width: _width } = page.getSize();

    // Draw highlight rectangle with transparency
    const color = this.hexToRgb(annotation.color);
    page.drawRectangle({
      x: annotation.x,
      y: annotation.y - annotation.height,
      width: annotation.width,
      height: annotation.height,
      color: rgb(color.r, color.g, color.b),
      opacity: 0.3,
    });

    return await pdfDoc.save();
  }

  /**
   * Adds underline annotation to PDF
   * @param pdfBuffer Original PDF bytes
   * @param annotation Underline annotation
   * @returns Modified PDF bytes
   */
  static async addUnderline(
    pdfBuffer: Uint8Array,
    annotation: UnderlineAnnotation
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const page = pages[annotation.pageIndex];

    // Draw underline line
    const color = this.hexToRgb(annotation.color);
    page.drawLine({
      start: { x: annotation.x, y: annotation.y },
      end: { x: annotation.x + annotation.width, y: annotation.y },
      thickness: annotation.thickness,
      color: rgb(color.r, color.g, color.b),
    });

    return await pdfDoc.save();
  }

  /**
   * Adds freehand drawing annotation to PDF
   * @param pdfBuffer Original PDF bytes
   * @param annotation Freehand annotation
   * @returns Modified PDF bytes
   */
  static async addFreehand(
    pdfBuffer: Uint8Array,
    annotation: FreehandAnnotation
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const page = pages[annotation.pageIndex];

    const color = this.hexToRgb(annotation.color);

    // Draw path through points
    if (annotation.points.length > 1) {
      for (let i = 0; i < annotation.points.length - 1; i++) {
        const start = annotation.points[i];
        const end = annotation.points[i + 1];

        page.drawLine({
          start: { x: start.x, y: start.y },
          end: { x: end.x, y: end.y },
          thickness: annotation.strokeWidth,
          color: rgb(color.r, color.g, color.b),
        });
      }
    }

    return await pdfDoc.save();
  }

  /**
   * Applies multiple annotations to PDF
   * @param pdfBuffer Original PDF bytes
   * @param annotations Array of annotations
   * @returns Modified PDF bytes
   */
  static async applyAnnotations(
    pdfBuffer: Uint8Array,
    annotations: Annotation[]
  ): Promise<Uint8Array> {
    let modifiedPdf = pdfBuffer;

    for (const annotation of annotations) {
      switch (annotation.type) {
        case 'highlight':
          modifiedPdf = await this.addHighlight(modifiedPdf, annotation as HighlightAnnotation);
          break;
        case 'underline':
          modifiedPdf = await this.addUnderline(modifiedPdf, annotation as UnderlineAnnotation);
          break;
        case 'freehand':
          modifiedPdf = await this.addFreehand(modifiedPdf, annotation as FreehandAnnotation);
          break;
      }
    }

    return modifiedPdf;
  }

  /**
   * Removes all annotations from PDF
   * @param annotatedPdf PDF with annotations
   * @param originalPdf Original PDF without annotations
   * @returns Clean PDF bytes
   */
  static async removeAnnotations(
    annotatedPdf: Uint8Array,
    originalPdf: Uint8Array
  ): Promise<Uint8Array> {
    // Simply return original PDF
    return originalPdf;
  }

  /**
   * Exports annotations to JSON for storage
   * @param annotations Array of annotations
   * @returns JSON string
   */
  static exportAnnotations(annotations: Annotation[]): string {
    return JSON.stringify(annotations);
  }

  /**
   * Imports annotations from JSON
   * @param json JSON string
   * @returns Array of annotations
   */
  static importAnnotations(json: string): Annotation[] {
    try {
      return JSON.parse(json) as Annotation[];
    } catch (error) {
      console.error('Failed to import annotations:', error);
      return [];
    }
  }

  /**
   * Gets annotations for a specific page
   * @param annotations All annotations
   * @param pageIndex Page index
   * @returns Annotations for the page
   */
  static getPageAnnotations(annotations: Annotation[], pageIndex: number): Annotation[] {
    return annotations.filter(a => a.pageIndex === pageIndex);
  }

  /**
   * Converts hex color to RGB
   * @param hex Hex color string
   * @returns RGB color object
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 0 }; // Default to yellow
  }

  /**
   * Validates annotation data
   * @param annotation Annotation to validate
   * @returns True if valid
   */
  static validateAnnotation(annotation: Annotation): boolean {
    // Validate common fields
    if (!annotation.id || annotation.pageIndex < 0) {
      return false;
    }

    // Validate type-specific fields
    switch (annotation.type) {
      case 'highlight': {
        const hl = annotation as HighlightAnnotation;
        return hl.width > 0 && hl.height > 0;
      }

      case 'underline': {
        const ul = annotation as UnderlineAnnotation;
        return ul.width > 0 && ul.thickness > 0;
      }

      case 'freehand': {
        const fh = annotation as FreehandAnnotation;
        return fh.points.length > 1 && fh.strokeWidth > 0;
      }

      default:
        return false;
    }
  }

  /**
   * Gets annotation count by type
   * @param annotations All annotations
   * @returns Object with counts by type
   */
  static getAnnotationCounts(annotations: Annotation[]): {
    highlight: number;
    underline: number;
    freehand: number;
  } {
    return {
      highlight: annotations.filter(a => a.type === 'highlight').length,
      underline: annotations.filter(a => a.type === 'underline').length,
      freehand: annotations.filter(a => a.type === 'freehand').length,
    };
  }
}
