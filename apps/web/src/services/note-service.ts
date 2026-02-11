// apps/web/src/services/note-service.ts
import { NoteRepository, createNoteRepository } from '../lib/repositories/NoteRepository';
import { SyncRepository, createSyncRepository } from '../lib/repositories/SyncRepository';
import type { Note, NoteAttachment, NoteReference } from '@notechain/data-models';
import type { SyncOperation } from '@notechain/sync-engine';

/**
 * Input for creating a new note
 */
export interface CreateNoteInput {
  title: string;
  content: string;
  notebookId?: string;
  tags?: string[];
  attachments?: Omit<NoteAttachment, 'id' | 'noteId' | 'createdAt'>[];
}

/**
 * Input for updating a note
 */
export interface UpdateNoteInput {
  title?: string;
  content?: string;
  notebookId?: string;
  tags?: string[];
  isLocked?: boolean;
}

/**
 * Options for listing notes
 */
export interface ListNotesOptions {
  notebookId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * NoteService provides business logic for note-taking
 * Coordinates between encryption, storage, and sync
 * FR-NOTE-01: Create, edit, delete notes
 */
export class NoteService {
  private noteRepository: NoteRepository;
  private syncRepository: SyncRepository;
  private userId: string;
  private encryptionKey: Uint8Array;
  private deviceId: string;

  constructor(userId: string, encryptionKey: Uint8Array, deviceId?: string) {
    this.userId = userId;
    this.encryptionKey = encryptionKey;
    this.deviceId = deviceId ?? `device_${Date.now()}`;
    this.noteRepository = createNoteRepository(userId, encryptionKey);
    this.syncRepository = createSyncRepository(this.deviceId);
  }

  /**
   * Create a new note
   * FR-NOTE-01: Create, edit, delete notes
   */
  async createNote(input: CreateNoteInput): Promise<Note> {
    // Calculate content hash for integrity
    const contentHash = await this.hashContent(input.content);

    // Generate encryption key ID
    const encryptionKeyId = crypto.randomUUID();

    const note = await this.noteRepository.create({
      userId: this.userId,
      title: input.title,
      content: input.content,
      contentHash,
      notebookId: input.notebookId,
      tags: input.tags ?? [],
      attachments: [],
      backlinks: [],
      wordCount: this.countWords(input.content),
      encryptionKeyId,
      isLocked: false,
      isDeleted: false,
      lastModifiedBy: this.userId,
    });

    // Add attachments if provided
    if (input.attachments && input.attachments.length > 0) {
      for (const attachment of input.attachments) {
        await this.noteRepository.addAttachment(note.id, attachment);
      }
    }

    // Queue sync operation
    await this.pushToSync(note, 'create');

    return note;
  }

  /**
   * Get a note by ID
   */
  async getNote(noteId: string): Promise<Note | null> {
    return this.noteRepository.getById(noteId);
  }

  /**
   * List notes with optional filters
   */
  async listNotes(options?: ListNotesOptions): Promise<Note[]> {
    if (options?.notebookId) {
      return this.noteRepository.getByNotebookId(options.notebookId);
    }

    if (options?.tags && options.tags.length > 0) {
      return this.noteRepository.searchByTags(options.tags);
    }

    return this.noteRepository.getAll(options?.limit, options?.offset);
  }

  /**
   * Update a note
   * FR-NOTE-01: Create, edit, delete notes
   */
  async updateNote(noteId: string, input: UpdateNoteInput): Promise<Note | null> {
    const existing = await this.noteRepository.getById(noteId);
    if (!existing) return null;

    // Recalculate content hash if content changed
    let contentHash = existing.contentHash;
    let wordCount = existing.wordCount;

    if (input.content !== undefined) {
      contentHash = await this.hashContent(input.content);
      wordCount = this.countWords(input.content);
    }

    const note = await this.noteRepository.update(noteId, {
      ...input,
      contentHash,
      wordCount,
    });

    if (note) {
      // Queue sync operation
      await this.pushToSync(note, 'update');
    }

    return note;
  }

  /**
   * Delete a note (soft delete)
   * FR-NOTE-01: Create, edit, delete notes
   */
  async deleteNote(noteId: string): Promise<boolean> {
    const success = await this.noteRepository.delete(noteId);

    if (success) {
      // Queue sync operation for deletion
      await this.pushDeleteToSync(noteId);
    }

    return success;
  }

  /**
   * Search notes by content (title-only for Free tier)
   * FR-NOTE-03: Basic search (title-only for Free tier)
   */
  async searchNotes(query: string, options?: ListNotesOptions): Promise<Note[]> {
    const notes = await this.listNotes(options);
    const lowerQuery = query.toLowerCase();

    return notes.filter(note => note.title.toLowerCase().includes(lowerQuery));
  }

  /**
   * Search notes by tags
   * FR-NOTE-04: Tag-based organization
   */
  async searchByTags(tags: string[]): Promise<Note[]> {
    return this.noteRepository.searchByTags(tags);
  }

  /**
   * Add attachment to note
   * FR-NOTE-05: Image attachments (encrypted)
   */
  async addAttachment(
    noteId: string,
    attachment: Omit<NoteAttachment, 'id' | 'noteId' | 'createdAt'>
  ): Promise<NoteAttachment> {
    const result = await this.noteRepository.addAttachment(noteId, attachment);

    // Sync the updated note
    const note = await this.noteRepository.getById(noteId);
    if (note) {
      await this.pushToSync(note, 'update');
    }

    return result;
  }

  /**
   * Add backlink to note (for bidirectional linking)
   * FR-NOTE-06: Bidirectional linking
   */
  async addBacklink(noteId: string, backlink: NoteReference): Promise<void> {
    await this.noteRepository.addBacklink(noteId, backlink);

    // Sync the updated note
    const note = await this.noteRepository.getById(noteId);
    if (note) {
      await this.pushToSync(note, 'update');
    }
  }

  /**
   * Get notes linked to a specific note
   */
  async getBacklinks(noteId: string): Promise<Note[]> {
    const note = await this.noteRepository.getById(noteId);
    if (!note) return [];

    const backlinkIds = note.backlinks.map(b => b.sourceNoteId);
    const linkedNotes: Note[] = [];

    for (const id of backlinkIds) {
      const linkedNote = await this.noteRepository.getById(id);
      if (linkedNote) {
        linkedNotes.push(linkedNote);
      }
    }

    return linkedNotes;
  }

  /**
   * Lock a note (requires authentication to view)
   */
  async lockNote(noteId: string): Promise<Note | null> {
    return this.updateNote(noteId, { isLocked: true });
  }

  /**
   * Unlock a note
   */
  async unlockNote(noteId: string): Promise<Note | null> {
    return this.updateNote(noteId, { isLocked: false });
  }

  /**
   * Get note count
   */
  async getNoteCount(): Promise<number> {
    return this.noteRepository.count();
  }

  /**
   * Subscribe to real-time note changes
   */
  subscribeToChanges(onChange: (operation: SyncOperation) => void): () => void {
    return this.syncRepository.subscribeToChanges(this.userId, onChange);
  }

  // Private helper methods

  /**
   * Calculate SHA-256 hash of content
   */
  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  /**
   * Push note changes to sync
   */
  private async pushToSync(note: Note, operationType: 'create' | 'update'): Promise<void> {
    const operation: SyncOperation = {
      id: `${note.id}_${Date.now()}`,
      userId: this.userId,
      sessionId: this.deviceId,
      operationType,
      entityType: 'note',
      entityId: note.id,
      encryptedPayload: JSON.stringify(note),
      timestamp: Date.now(),
      version: note.syncVersion,
    };

    await this.syncRepository.pushOperations([operation]);
  }

  /**
   * Push delete operation to sync
   */
  private async pushDeleteToSync(noteId: string): Promise<void> {
    const operation: SyncOperation = {
      id: `${noteId}_delete_${Date.now()}`,
      userId: this.userId,
      sessionId: this.deviceId,
      operationType: 'delete',
      entityType: 'note',
      entityId: noteId,
      encryptedPayload: '',
      timestamp: Date.now(),
      version: 0,
    };

    await this.syncRepository.pushOperations([operation]);
  }
}

/**
 * Factory function to create a NoteService instance
 */
export function createNoteService(
  userId: string,
  encryptionKey: Uint8Array,
  deviceId?: string
): NoteService {
  return new NoteService(userId, encryptionKey, deviceId);
}
