import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, createNote, getNote, createTodo, getTodo } from '../../lib/db';
import { search } from '../../lib/search';

/**
 * Integration Tests: Note → Todo Workflow
 * US-2.2: Todo from Note Context
 */

describe('Note → Todo Integration Workflow', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
    await db.close();
  });

  describe('Create Todo from Note Selection', () => {
    it('should create todo linked to note', async () => {
      // Step 1: Create note
      const noteId = await createNote({
        title: 'Meeting Notes',
        content: 'Discuss project milestones and action items',
        folderId: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 2: Create todo from selection
      const todoId = await createTodo({
        title: 'Discuss project milestones',
        description: 'Action item from Meeting Notes',
        priority: 'high',
        status: 'pending',
        linkedNoteId: noteId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 3: Verify todo created
      const todo = await getTodo(todoId);
      expect(todo).toBeDefined();
      expect(todo?.title).toBe('Discuss project milestones');
      expect(todo?.linkedNoteId).toBe(noteId);
      expect(todo?.priority).toBe('high');
    });

    it('should link multiple todos to same note', async () => {
      // Step 1: Create note
      const noteId = await createNote({
        title: 'Project Planning',
        content: 'Action items:\n1. Review requirements\n2. Set deadlines\n3. Assign tasks',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 2: Create multiple todos
      const todo1Id = await createTodo({
        title: 'Review requirements',
        status: 'pending',
        linkedNoteId: noteId,
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const todo2Id = await createTodo({
        title: 'Set deadlines',
        status: 'pending',
        linkedNoteId: noteId,
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 3: Verify both linked to note
      const todo1 = await getTodo(todo1Id);
      const todo2 = await getTodo(todo2Id);

      expect(todo1?.linkedNoteId).toBe(noteId);
      expect(todo2?.linkedNoteId).toBe(noteId);
      expect(todo1?.linkedNoteId).toBe(todo2?.linkedNoteId);
    });
  });

  describe('Update Linked Todo', () => {
    it('should update todo status and sync with note', async () => {
      // Step 1: Create note and linked todo
      const noteId = await createNote({
        title: 'Meeting Notes',
        content: 'Discuss project',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const todoId = await createTodo({
        title: 'Discuss project',
        status: 'pending',
        linkedNoteId: noteId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 2: Update todo status
      await db.updateTodo(todoId, {
        status: 'completed',
      });

      // Step 3: Verify todo updated
      const todo = await getTodo(todoId);
      expect(todo?.status).toBe('completed');
    });
  });

  describe('Search Linked Content', () => {
    it('should find both notes and linked todos', async () => {
      // Step 1: Create note with linked todos
      const noteId = await createNote({
        title: 'Product Launch',
        content: 'Launch the new product',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await createTodo({
        title: 'Product Launch',
        status: 'pending',
        linkedNoteId: noteId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await createTodo({
        title: 'Launch Marketing Campaign',
        status: 'pending',
        linkedNoteId: noteId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 2: Search for "launch"
      const results = await search({ query: 'launch' });

      // Step 3: Verify results include both note and todos
      const noteResults = results.filter(r => r.type === 'note');
      const todoResults = results.filter(r => r.type === 'todo');

      expect(noteResults.length).toBeGreaterThan(0);
      expect(todoResults.length).toBeGreaterThan(0);
      expect(noteResults[0].title).toBe('Product Launch');
    });
  });

  describe('Delete Linked Todo', () => {
    it('should delete todo without affecting note', async () => {
      // Step 1: Create note and linked todo
      const noteId = await createNote({
        title: 'Meeting Notes',
        content: 'Discussion',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const todoId = await createTodo({
        title: 'Action Item',
        status: 'pending',
        linkedNoteId: noteId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 2: Delete todo
      await db.deleteTodo(todoId);

      // Step 3: Verify note still exists
      const note = await getNote(noteId);
      expect(note).toBeDefined();
      expect(note?.title).toBe('Meeting Notes');

      // Step 4: Verify todo deleted
      const todo = await getTodo(todoId);
      expect(todo).toBeUndefined();
    });
  });
});
