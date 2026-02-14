// apps/web/src/lib/repositories/NoteRepository.ts
import { supabase, SupabaseClient } from '../supabaseClient';
import { encryptData, decryptData } from '@notechain/core-crypto';
import type { Note, NoteAttachment, NoteReference } from '@notechain/data-models';

/**
 * Database representation of an encrypted blob for notes
 */
interface NoteBlobRow {
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
 * Helper to wrap Supabase errors in proper Error instances
 */
function createRepositoryError(operation: string, error: unknown): Error {
  if (error instanceof Error) {
    return new Error(`${operation} failed: ${error.message}`);
  }
  if (error && typeof error === 'object') {
    const err = error as { message?: string; code?: string; details?: string };
    const message = err.message || err.details || err.code || 'Unknown error';
    return new Error(`${operation} failed: ${message}`);
  }
  return new Error(`${operation} failed: ${String(error)}`);
}

/**
 * Repository for managing notes with encryption
 * Uses encrypted_blobs table for storage
 */
export class NoteRepository {
  private client: SupabaseClient;
  private userId: string;
  private encryptionKey: Uint8Array;

  constructor(userId: string, encryptionKey: Uint8Array, client?: SupabaseClient) {
    this.userId = userId;
    this.encryptionKey = encryptionKey;
    this.client = client ?? supabase;
  }

  /**
   * Create a new note
   */
  async create(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'syncVersion'>): Promise<Note> {
    const id = crypto.randomUUID();
    const now = new Date();
    const version = 1;

    const noteData: Note = {
      ...note,
      id,
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
      syncVersion: version,
    };

    // Encrypt note data
    const encrypted = await encryptData(JSON.stringify(noteData), this.encryptionKey);

    // Store in encrypted_blobs
    const { error } = await this.client.from('encrypted_blobs').insert({
      id,
      user_id: this.userId,
      blob_type: 'note',
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      auth_tag: encrypted.authTag,
      key_id: note.encryptionKeyId,
      metadata_hash: note.contentHash,
      version,
      is_deleted: false,
    });

    if (error) throw createRepositoryError('Create note', error);

    return noteData;
  }

  /**
   * Get a note by ID
   */
  async getById(noteId: string): Promise<Note | null> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', this.userId)
      .eq('blob_type', 'note')
      .eq('is_deleted', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw createRepositoryError('Get note by ID', error);
    }

    return this.decryptNote(data as NoteBlobRow);
  }

  /**
   * Get all notes for the user
   */
  async getAll(limit: number = 100, offset: number = 0): Promise<Note[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'note')
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw createRepositoryError('Get all notes', error);

    const notes: Note[] = [];
    for (const row of data || []) {
      const note = await this.decryptNote(row as NoteBlobRow);
      if (note) notes.push(note);
    }

    return notes;
  }

  /**
   * Get notes by notebook ID
   */
  async getByNotebookId(notebookId: string): Promise<Note[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'note')
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) throw createRepositoryError('Get notes by notebook', error);

    const notes: Note[] = [];
    for (const row of data || []) {
      const note = await this.decryptNote(row as NoteBlobRow);
      if (note && note.notebookId === notebookId) {
        notes.push(note);
      }
    }

    return notes;
  }

  /**
   * Update a note
   */
  async update(noteId: string, updates: Partial<Note>): Promise<Note | null> {
    const existing = await this.getById(noteId);
    if (!existing) return null;

    const updatedNote: Note = {
      ...existing,
      ...updates,
      id: noteId,
      userId: this.userId,
      updatedAt: new Date(),
      syncVersion: existing.syncVersion + 1,
    };

    // Encrypt updated data
    const encrypted = await encryptData(JSON.stringify(updatedNote), this.encryptionKey);

    // Update in database
    const { error } = await this.client
      .from('encrypted_blobs')
      .update({
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        auth_tag: encrypted.authTag,
        metadata_hash: updatedNote.contentHash,
        version: updatedNote.syncVersion,
        updated_at: updatedNote.updatedAt.toISOString(),
      })
      .eq('id', noteId)
      .eq('user_id', this.userId);

    if (error) throw createRepositoryError('Update note', error);

    return updatedNote;
  }

  /**
   * Soft delete a note
   */
  async delete(noteId: string): Promise<boolean> {
    const { error } = await this.client
      .from('encrypted_blobs')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('user_id', this.userId);

    if (error) throw createRepositoryError('Delete note', error);
    return true;
  }

  /**
   * Search notes by tags
   */
  async searchByTags(tags: string[]): Promise<Note[]> {
    const { data, error } = await this.client
      .from('encrypted_blobs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('blob_type', 'note')
      .eq('is_deleted', false);

    if (error) throw createRepositoryError('Search notes by tags', error);

    const notes: Note[] = [];
    for (const row of data || []) {
      const note = await this.decryptNote(row as NoteBlobRow);
      if (note && tags.some(tag => note.tags.includes(tag))) {
        notes.push(note);
      }
    }

    return notes;
  }

  /**
   * Add attachment to note
   */
  async addAttachment(
    noteId: string,
    attachment: Omit<NoteAttachment, 'id' | 'noteId' | 'createdAt'>
  ): Promise<NoteAttachment> {
    const note = await this.getById(noteId);
    if (!note) throw new Error('Note not found');

    const newAttachment: NoteAttachment = {
      ...attachment,
      id: crypto.randomUUID(),
      noteId,
      createdAt: new Date(),
    };

    await this.update(noteId, {
      attachments: [...note.attachments, newAttachment],
    });

    return newAttachment;
  }

  /**
   * Add backlink to note
   */
  async addBacklink(noteId: string, backlink: NoteReference): Promise<void> {
    const note = await this.getById(noteId);
    if (!note) throw new Error('Note not found');

    await this.update(noteId, {
      backlinks: [...note.backlinks, backlink],
    });
  }

  /**
   * Get note count
   */
  async count(): Promise<number> {
    const { count, error } = await this.client
      .from('encrypted_blobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .eq('blob_type', 'note')
      .eq('is_deleted', false);

    if (error) throw createRepositoryError('Count notes', error);
    return count ?? 0;
  }

  /**
   * Decrypt a note from database row
n   */
  private async decryptNote(row: NoteBlobRow): Promise<Note | null> {
    try {
      const decrypted = await decryptData(
        {
          ciphertext: row.ciphertext,
          nonce: row.nonce,
          authTag: row.auth_tag,
        },
        this.encryptionKey
      );

      const note: Note = JSON.parse(decrypted);
      // Ensure dates are Date objects
      note.createdAt = new Date(note.createdAt);
      note.updatedAt = new Date(note.updatedAt);
      return note;
    } catch (error) {
      console.error('Failed to decrypt note:', error);
      return null;
    }
  }
}

/**
 * Factory function to create a NoteRepository instance
 */
export function createNoteRepository(
  userId: string,
  encryptionKey: Uint8Array,
  client?: SupabaseClient
): NoteRepository {
  return new NoteRepository(userId, encryptionKey, client);
}
