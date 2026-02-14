import { describe, test, expect, beforeEach } from 'bun:test';
import { search } from '../search';

// Mock setup
let listNotesMock: ReturnType<typeof jest.fn>;
let listTodosMock: ReturnType<typeof jest.fn>;

describe('Search Service', () => {
  beforeEach(() => {
    listNotesMock = jest.fn();
    listTodosMock = jest.fn();
  });

  describe('Basic Search', () => {
    test('should find notes by title match', async () => {
      listNotesMock.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Meeting Notes',
          content: 'Discussion about project',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const results = await search({ query: 'meeting' });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('note');
      expect(results[0].title).toBe('Meeting Notes');
      expect(results[0].score).toBeGreaterThan(70);
    });

    test('should find todos by title match', async () => {
      listTodosMock.mockResolvedValue([
        {
          id: 'todo-1',
          title: 'Buy groceries',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const results = await search({ query: 'groceries' });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('todo');
      expect(results[0].title).toBe('Buy groceries');
    });

    test('should search both notes and todos', async () => {
      listNotesMock.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Meeting Notes',
          content: 'Discussion',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      listTodosMock.mockResolvedValue([
        {
          id: 'todo-1',
          title: 'Meeting Action Items',
          status: 'pending',
          priority: 'high',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const results = await search({ query: 'meeting' });

      expect(results).toHaveLength(2);
    });
  });

  describe('Fuzzy Search', () => {
    test('should find partial matches', async () => {
      listNotesMock.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Quarterly Review',
          content: 'Q4 2024 review',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const results = await search({ query: 'review' });

      expect(results).toHaveLength(1);
      expect(results[0].score).toBeGreaterThan(50);
    });

    test('should find case-insensitive matches', async () => {
      listNotesMock.mockResolvedValue([
        {
          id: 'note-1',
          title: 'PROJECT PLAN',
          content: 'Planning phase',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const results = await search({ query: 'project' });

      expect(results).toHaveLength(1);
    });
  });

  describe('Search Scoring', () => {
    test('should rank exact title matches higher', async () => {
      listNotesMock.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Project Planning',
          content: '...',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'note-2',
          title: 'Notes',
          content: 'Project planning discussion',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const results = await search({ query: 'Project Planning' });

      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    test('should sort results by score', async () => {
      listNotesMock.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Meeting Notes',
          content: '...',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'note-2',
          title: 'Action Items from Meeting',
          content: '...',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const results = await search({ query: 'meeting' });

      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });
  });

  describe('Search Limits', () => {
    test('should limit results to specified count', async () => {
      listNotesMock.mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => ({
          id: `note-${i}`,
          title: `Note ${i}`,
          content: 'Content',
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );

      const results = await search({ query: 'note', limit: 10 });

      expect(results).toHaveLength(10);
    });

    test('should use default limit of 50', async () => {
      listNotesMock.mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => ({
          id: `note-${i}`,
          title: `Note ${i}`,
          content: 'Content',
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );

      const results = await search({ query: 'note' });

      expect(results).toHaveLength(50);
    });
  });

  describe('Type Filtering', () => {
    test('should only search notes when types includes note', async () => {
      listNotesMock.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Search Test',
          content: '...',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      listTodosMock.mockResolvedValue([
        {
          id: 'todo-1',
          title: 'Search Test Todo',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const results = await search({
        query: 'search',
        types: ['note'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('note');
    });

    test('should only search todos when types includes todo', async () => {
      listNotesMock.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Search Test',
          content: '...',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      listTodosMock.mockResolvedValue([
        {
          id: 'todo-1',
          title: 'Search Test Todo',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const results = await search({
        query: 'search',
        types: ['todo'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('todo');
    });
  });
});
