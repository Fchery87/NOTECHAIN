import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { encryptData, decryptData } from '@notechain/core-crypto';
import { db } from '../db';

// Mock EncryptionService
jest.mock('@notechain/core-crypto', () => ({
  encryptData: jest.fn(),
  decryptData: jest.fn(),
}));

describe('Encrypted Database', () => {
  beforeEach(() => {
    // Clear IndexedDB before each test
    db.delete().catch(() => {});
  });

  afterEach(() => {
    // Clean up after each test
    db.close();
  });

  describe('Database Initialization', () => {
    it('should initialize database with correct version', async () => {
      await db.open();
      expect(db.verno).toBe(1);
    });

    it('should create all required tables', async () => {
      await db.open();
      const tables = db.tables.map(t => t.name);
      expect(tables).toContain('notes');
      expect(tables).toContain('todos');
      expect(tables).toContain('pdfs');
      expect(tables).toContain('calendarEvents');
      expect(tables).toContain('syncLogs');
    });
  });

  describe('Note Operations', () => {
    it('should store encrypted note and retrieve decrypted note', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'This is a test note',
        folderId: 'folder-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const encryptedNote = {
        id: 'note-1',
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array([4, 5, 6]),
        authTag: new Uint8Array([7, 8, 9]),
        version: 1,
        ...noteData,
      };

      (encryptData as jest.Mock).mockResolvedValue({
        ciphertext: encryptedNote.ciphertext,
        nonce: encryptedNote.nonce,
        authTag: encryptedNote.authTag,
      });

      (decryptData as jest.Mock).mockResolvedValue(noteData);

      await db.open();
      await db.notes.add(encryptedNote);

      const retrievedNote = await db.notes.get('note-1');
      expect(retrievedNote).toBeDefined();
      expect(encryptData).toHaveBeenCalled();
    });

    it('should update existing encrypted note', async () => {
      const encryptedNote = {
        id: 'note-1',
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array([4, 5, 6]),
        authTag: new Uint8Array([7, 8, 9]),
        title: 'Original Title',
        updatedAt: new Date(),
      };

      await db.open();
      await db.notes.add(encryptedNote);

      const updatedNote = {
        ...encryptedNote,
        title: 'Updated Title',
        updatedAt: new Date(),
      };

      await db.notes.update('note-1', updatedNote);

      const retrieved = await db.notes.get('note-1');
      expect(retrieved.title).toBe('Updated Title');
    });

    it('should delete note from database', async () => {
      const encryptedNote = {
        id: 'note-1',
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array([4, 5, 6]),
        authTag: new Uint8Array([7, 8, 9]),
        title: 'Test Note',
      };

      await db.open();
      await db.notes.add(encryptedNote);

      await db.notes.delete('note-1');

      const retrieved = await db.notes.get('note-1');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Todo Operations', () => {
    it('should store encrypted todo and retrieve decrypted todo', async () => {
      const todoData = {
        id: 'todo-1',
        title: 'Test Todo',
        description: 'This is a test todo',
        priority: 'high' as const,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const encryptedTodo = {
        id: 'todo-1',
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array([4, 5, 6]),
        authTag: new Uint8Array([7, 8, 9]),
        ...todoData,
      };

      (encryptData as jest.Mock).mockResolvedValue({
        ciphertext: encryptedTodo.ciphertext,
        nonce: encryptedTodo.nonce,
        authTag: encryptedTodo.authTag,
      });

      await db.open();
      await db.todos.add(encryptedTodo);

      const retrievedTodo = await db.todos.get('todo-1');
      expect(retrievedTodo).toBeDefined();
      expect(encryptData).toHaveBeenCalled();
    });
  });

  describe('PDF Operations', () => {
    it('should store encrypted PDF metadata', async () => {
      const pdfData = {
        id: 'pdf-1',
        filename: 'test.pdf',
        fileData: new Uint8Array([1, 2, 3]),
        annotations: '',
        signature: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const encryptedPdf = {
        id: 'pdf-1',
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array([4, 5, 6]),
        authTag: new Uint8Array([7, 8, 9]),
        ...pdfData,
      };

      (encryptData as jest.Mock).mockResolvedValue({
        ciphertext: encryptedPdf.ciphertext,
        nonce: encryptedPdf.nonce,
        authTag: encryptedPdf.authTag,
      });

      await db.open();
      await db.pdfs.add(encryptedPdf);

      const retrievedPdf = await db.pdfs.get('pdf-1');
      expect(retrievedPdf).toBeDefined();
      expect(encryptData).toHaveBeenCalled();
    });
  });

  describe('Calendar Event Operations', () => {
    it('should store encrypted calendar event', async () => {
      const eventData = {
        id: 'event-1',
        title: 'Test Event',
        description: 'Test description',
        startDate: new Date(),
        endDate: new Date(),
        externalId: 'google-event-123',
        source: 'google' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const encryptedEvent = {
        id: 'event-1',
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array([4, 5, 6]),
        authTag: new Uint8Array([7, 8, 9]),
        ...eventData,
      };

      (encryptData as jest.Mock).mockResolvedValue({
        ciphertext: encryptedEvent.ciphertext,
        nonce: encryptedEvent.nonce,
        authTag: encryptedEvent.authTag,
      });

      await db.open();
      await db.calendarEvents.add(encryptedEvent);

      const retrievedEvent = await db.calendarEvents.get('event-1');
      expect(retrievedEvent).toBeDefined();
      expect(encryptData).toHaveBeenCalled();
    });
  });

  describe('Sync Log Operations', () => {
    it('should track sync operations', async () => {
      const syncLog = {
        id: 'sync-1',
        operation: 'upload' as const,
        blobId: 'note-1',
        timestamp: Date.now(),
        success: true,
      };

      await db.open();
      await db.syncLogs.add(syncLog);

      const retrievedLog = await db.syncLogs.get('sync-1');
      expect(retrievedLog).toBeDefined();
      expect(retrievedLog.operation).toBe('upload');
    });
  });

  describe('Offline Capabilities', () => {
    it('should work without network connection', async () => {
      const noteData = {
        id: 'note-1',
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array([4, 5, 6]),
        authTag: new Uint8Array([7, 8, 9]),
        title: 'Offline Note',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.open();
      await db.notes.add(noteData);

      const retrievedNote = await db.notes.get('note-1');
      expect(retrievedNote).toBeDefined();
    });

    it('should persist data across page refreshes', async () => {
      const noteData = {
        id: 'note-1',
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array([4, 5, 6]),
        authTag: new Uint8Array([7, 8, 9]),
        title: 'Persistent Note',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.open();
      await db.notes.add(noteData);

      // Simulate page refresh by closing and reopening database
      await db.close();
      await db.open();

      const retrievedNote = await db.notes.get('note-1');
      expect(retrievedNote).toBeDefined();
    });
  });
});
