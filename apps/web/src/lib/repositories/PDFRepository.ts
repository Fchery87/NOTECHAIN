// apps/web/src/lib/repositories/PDFRepository.ts
import { supabase, SupabaseClient } from '../supabaseClient';
import { encryptData, decryptData } from '@notechain/core-crypto';
import type { PDFDocument, PDFAnnotation, PDFSignature } from '@notechain/data-models';

/**
 * Database representation of an encrypted blob for PDFs
 */
interface PDFBlobRow {
  id: string;
  user_id: string;
  blob_type: string;
  ciphertext: string;
  nonce: string;
  auth_tag: string;
  key_id: string;
  metadata_hash: string;
  version: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Repository for managing PDF documents with encryption
 * Uses encrypted_blobs table for storage
 * FR-PDF-01: PDF import and storage (encrypted)
 */
export class PDFRepository {
  private client: SupabaseClient;
  private userId: string;
  private encryptionKey: Uint8Array;

  constructor(userId: string, encryptionKey: Uint8Array, client?: SupabaseClient) {
    this.userId = userId;
    this.encryptionKey = encryptionKey;
    this.client = client ?? supabase;
  }

  /**
   * Create a new PDF document
   * FR-PDF-01: PDF import and storage (encrypted)
   */
  async createPDF(pdf: Omit<PDFDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<PDFDocument> {
    const id = crypto.randomUUID();
    const now = new Date();

    const pdfData: PDFDocument = {
      ...pdf,
      id,
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
    };

    // Encrypt PDF data
    const encrypted = await encryptData(JSON.stringify(pdfData), this.encryptionKey);

    // Store in encrypted_blobs
    const { error } = await this.client.from('encrypted_blobs').insert({
      id,
      user_id: this.userId,
      blob_type: 'pdf',
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      auth_tag: encrypted.authTag,
      key_id: pdf.encryptionKeyId,
      metadata_hash: pdf.title, // Use title as metadata hash for search
      version: 1,
      is_deleted: false,
    });

    if (error) throw error;

    return pdfData;
  }

  /**
   * Get a PDF by ID
   */
  async getById(pdfId: string): Promise<PDFDocument | null> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('id', pdfId)
      .eq('user_id', this.userId)
      .eq('blob_type', 'pdf')
      .eq('is_deleted', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.decryptPDF(data as PDFBlobRow);
  }

  /**
   * Get all PDFs for user
   */
  async getAll(limit: number = 50, offset: number = 0): Promise<PDFDocument[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'pdf')
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const pdfs: PDFDocument[] = [];
    for (const row of data || []) {
      const pdf = await this.decryptPDF(row as PDFBlobRow);
      if (pdf) pdfs.push(pdf);
    }

    return pdfs;
  }

  /**
   * Search PDFs by title
   */
  async searchByTitle(query: string): Promise<PDFDocument[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'pdf')
      .eq('is_deleted', false)
      .ilike('metadata_hash', `%${query}%`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const pdfs: PDFDocument[] = [];
    for (const row of data || []) {
      const pdf = await this.decryptPDF(row as PDFBlobRow);
      if (pdf) pdfs.push(pdf);
    }

    return pdfs;
  }

  /**
   * Update a PDF document
   */
  async updatePDF(pdfId: string, updates: Partial<PDFDocument>): Promise<PDFDocument | null> {
    const existing = await this.getById(pdfId);
    if (!existing) return null;

    const updatedPDF: PDFDocument = {
      ...existing,
      ...updates,
      id: pdfId,
      userId: this.userId,
      updatedAt: new Date(),
    };

    // Encrypt updated data
    const encrypted = await encryptData(JSON.stringify(updatedPDF), this.encryptionKey);

    // Update in database
    const { error } = await this.client
      .from('encrypted_blobs')
      .update({
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        auth_tag: encrypted.authTag,
        metadata_hash: updatedPDF.title,
        updated_at: updatedPDF.updatedAt.toISOString(),
      })
      .eq('id', pdfId)
      .eq('user_id', this.userId);

    if (error) throw error;

    return updatedPDF;
  }

  /**
   * Delete a PDF (soft delete)
   */
  async deletePDF(pdfId: string): Promise<boolean> {
    const { error } = await this.client
      .from('encrypted_blobs')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pdfId)
      .eq('user_id', this.userId);

    if (error) throw error;
    return true;
  }

  /**
   * Add annotation to PDF
   * FR-PDF-02: Basic annotation (highlight, underline, freehand)
   */
  async addAnnotation(
    pdfId: string,
    annotation: Omit<PDFAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>
  ): Promise<PDFDocument | null> {
    const pdf = await this.getById(pdfId);
    if (!pdf) return null;

    const newAnnotation: PDFAnnotation = {
      ...annotation,
      id: crypto.randomUUID(),
      pdfId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };

    const updatedPDF = await this.updatePDF(pdfId, {
      annotations: [...pdf.annotations, newAnnotation],
    });

    return updatedPDF;
  }

  /**
   * Update annotation
   */
  async updateAnnotation(
    pdfId: string,
    annotationId: string,
    updates: Partial<PDFAnnotation>
  ): Promise<PDFDocument | null> {
    const pdf = await this.getById(pdfId);
    if (!pdf) return null;

    const updatedAnnotations = pdf.annotations.map(ann =>
      ann.id === annotationId ? { ...ann, ...updates, updatedAt: new Date() } : ann
    );

    return this.updatePDF(pdfId, { annotations: updatedAnnotations });
  }

  /**
   * Delete annotation
   */
  async deleteAnnotation(pdfId: string, annotationId: string): Promise<PDFDocument | null> {
    const pdf = await this.getById(pdfId);
    if (!pdf) return null;

    const updatedAnnotations = pdf.annotations.map(ann =>
      ann.id === annotationId ? { ...ann, isDeleted: true, updatedAt: new Date() } : ann
    );

    return this.updatePDF(pdfId, { annotations: updatedAnnotations });
  }

  /**
   * Add signature to PDF
   * FR-PDF-03: Digital signature capture (Pro feature)
   */
  async addSignature(
    pdfId: string,
    signature: Omit<PDFSignature, 'id' | 'isDeleted'>
  ): Promise<PDFDocument | null> {
    const pdf = await this.getById(pdfId);
    if (!pdf) return null;

    const newSignature: PDFSignature = {
      ...signature,
      id: crypto.randomUUID(),
      pdfId,
      isDeleted: false,
    };

    const updatedPDF = await this.updatePDF(pdfId, {
      signatures: [...pdf.signatures, newSignature],
    });

    return updatedPDF;
  }

  /**
   * Delete signature
   */
  async deleteSignature(pdfId: string, signatureId: string): Promise<PDFDocument | null> {
    const pdf = await this.getById(pdfId);
    if (!pdf) return null;

    const updatedSignatures = pdf.signatures.map(sig =>
      sig.id === signatureId ? { ...sig, isDeleted: true } : sig
    );

    return this.updatePDF(pdfId, { signatures: updatedSignatures });
  }

  /**
   * Get PDF count
   */
  async count(): Promise<number> {
    const { count, error } = await this.client
      .from('encrypted_blobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .eq('blob_type', 'pdf')
      .eq('is_deleted', false);

    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Get total storage used by PDFs
   */
  async getTotalStorageUsed(): Promise<number> {
    const pdfs = await this.getAll();
    return pdfs.reduce((total, pdf) => total + pdf.fileSize, 0);
  }

  /**
   * Decrypt a PDF from database row
   */
  private async decryptPDF(row: PDFBlobRow): Promise<PDFDocument | null> {
    try {
      const decrypted = await decryptData(
        {
          ciphertext: row.ciphertext,
          nonce: row.nonce,
          authTag: row.auth_tag,
        },
        this.encryptionKey
      );

      const pdf: PDFDocument = JSON.parse(decrypted);
      // Ensure dates are Date objects
      pdf.createdAt = new Date(pdf.createdAt);
      pdf.updatedAt = new Date(pdf.updatedAt);
      return pdf;
    } catch (error) {
      console.error('Failed to decrypt PDF:', error);
      return null;
    }
  }
}

/**
 * Factory function to create a PDFRepository instance
 */
export function createPDFRepository(
  userId: string,
  encryptionKey: Uint8Array,
  client?: SupabaseClient
): PDFRepository {
  return new PDFRepository(userId, encryptionKey, client);
}
