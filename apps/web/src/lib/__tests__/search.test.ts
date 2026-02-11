import { describe, it, expect, beforeEach } from '@jest/globals';
import { search } from '../search';

// Mock database functions
jest.mock('../lib/db', () => ({
  listNotes: jest.fn(),
  listTodos: jest.fn(),
}));

describe('Search Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Search', () => {
    it('should find notes by title match', async () => {
      const { listNotes } = await import('../lib/db').then(m => m);
      (listNotes as jest.Mock).mockResolvedValue([
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

    it('should find todos by title match', async () => {
      const { listTodos } = await import('../lib/db').then(m => m);
      (listTodos as jest.Mock).mockResolvedValue([
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

    it('should search both notes and todos', async () => {
      const { listNotes, listTodos } = await import('../lib/db').then(m => m);
      (listNotes as jest.Mock).mockResolvedValue([
        {
          id: 'note-1',
          title: 'Meeting Notes',
          content: 'Discussion',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      (listTodos as jest.Mock).mockResolvedValue([
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
      expect(results[0].type).toBe('note');
      expect(results[1].type).toBe('todo');
    });
  });

  describe('Fuzzy Search', () => {
    it('should find partial matches', async () => {
      const { listNotes } = await import('../lib/db').then(m => m);
      (listNotes as jest.Mock).mockResolvedValue([
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

    it('should find case-insensitive matches', async () => {
      const { listNotes } = await import('../lib/db').then(m => m);
      (listNotes as jest.Mock).mockResolvedValue([
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
    it('should rank exact title matches higher', async () => {
      const { listNotes } = await import('../lib/db').then(m => m);
      (listNotes as jest.Mock).mockResolvedValue([
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

    it('should sort results by score', async () => {
      const { listNotes } = await import('../lib/db').then(m => m);
      (listNotes as jest.Mock).mockResolvedValue([
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
    it('should limit results to specified count', async () => {
      const { listNotes } = await import('../lib/db').then(m => m);
      (listNotes as jest.Mock).mockResolvedValue(
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

    it('should use default limit of 50', async () => {
      const { listNotes } = await import('../lib/db').then(m => m);
      (listNotes as jest.Mock).mockResolvedValue(
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
    it('should only search notes when types includes note', async () => {
      const { listNotes, listTodos } = await import('../lib/db').then(m => m);
      (listNotes as jest.Mock).mockResolvedValue([
        {
          id: 'note-1',
          title: 'Search Test',
          content: '...',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      (listTodos as jest.Mock).mockResolvedValue([
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

    it('should only search todos when types includes todo', async () => {
      const { listNotes, listTodos } = await import('../lib/db').then(m => m);
      (listNotes as jest.Mock).mockResolvedValue([
        {
          id: 'note-1',
          title: 'Search Test',
          content: '...',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      (listTodos as jest.Mock).mockResolvedValue([
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
