import { Note, Todo, PDFDocument, Notebook, Project, User } from '../models';

describe('Data Models', () => {
  describe('Type interfaces exist', () => {
    it('should export User interface', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        encryptedProfile: 'encrypted-data',
      };
      expect(user).toBeDefined();
      expect(user.id).toBe('user-1');
    });

    it('should export Note interface', () => {
      const note: Note = {
        id: 'note-1',
        userId: 'user-1',
        title: 'Test Note',
        content: 'Test content',
        contentHash: 'hash-123',
        attachments: [],
        backlinks: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: 10,
        encryptionKeyId: 'key-1',
        isLocked: false,
        isDeleted: false,
        syncVersion: 1,
        lastModifiedBy: 'device-1',
      };
      expect(note).toBeDefined();
      expect(note.title).toBe('Test Note');
    });

    it('should export Todo interface', () => {
      const todo: Todo = {
        id: 'todo-1',
        userId: 'user-1',
        title: 'Test Todo',
        description: 'Test description',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        isDeleted: false,
        syncVersion: 1,
        lastModifiedBy: 'device-1',
      };
      expect(todo).toBeDefined();
      expect(todo.status).toBe('pending');
    });

    it('should export Notebook interface', () => {
      const notebook: Notebook = {
        id: 'notebook-1',
        userId: 'user-1',
        name: 'My Notebook',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      expect(notebook).toBeDefined();
      expect(notebook.name).toBe('My Notebook');
    });

    it('should export Project interface', () => {
      const project: Project = {
        id: 'project-1',
        userId: 'user-1',
        name: 'My Project',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      expect(project).toBeDefined();
      expect(project.name).toBe('My Project');
    });

    it('should export PDFDocument interface', () => {
      const pdf: PDFDocument = {
        id: 'pdf-1',
        userId: 'user-1',
        originalFileName: 'test.pdf',
        title: 'Test PDF',
        pageCount: 10,
        fileSize: 1024,
        annotations: [],
        signatures: [],
        storageKey: 'storage-key-1',
        thumbnailKey: 'thumb-key-1',
        encryptionKeyId: 'key-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      expect(pdf).toBeDefined();
      expect(pdf.pageCount).toBe(10);
    });
  });

  describe('Type safety', () => {
    it('should enforce required properties', () => {
      const createNote = (): Note => ({
        id: 'note-1',
        userId: 'user-1',
        title: 'Test',
        content: 'Content',
        contentHash: 'hash',
        attachments: [],
        backlinks: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: 0,
        encryptionKeyId: 'key',
        isLocked: false,
        isDeleted: false,
        syncVersion: 1,
        lastModifiedBy: 'device',
      });

      const note: Note = createNote();
      expect(note).toBeDefined();
    });

    it('should allow optional properties', () => {
      const todo: Todo = {
        id: 'todo-1',
        userId: 'user-1',
        title: 'Test',
        description: undefined,
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        isDeleted: false,
        syncVersion: 1,
        lastModifiedBy: 'device-1',
      };

      expect(todo.description).toBeUndefined();
    });
  });
});
