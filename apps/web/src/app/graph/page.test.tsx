import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { KnowledgeGraph } from '@/lib/ai/notes/types';

// Mock data defined first
const mockNotes = [
  {
    id: 'note-1',
    title: 'Test Note 1',
    content: 'Test content 1',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['work'],
    backlinks: [],
    attachments: [],
    wordCount: 100,
    notebookId: 'nb-1',
    encryptionKeyId: 'key-1',
    contentHash: 'hash-1',
    syncVersion: 1,
  },
];

const mockGraphData: KnowledgeGraph = {
  nodes: [
    {
      id: 'note-1',
      label: 'Test Note 1',
      type: 'note',
      size: 20,
      color: '#57534e',
      metadata: {
        wordCount: 100,
        createdAt: new Date(),
        tagCount: 1,
        backlinkCount: 0,
      },
    },
  ],
  edges: [],
  clusters: [],
};

const graphMocks = vi.hoisted(() => ({
  push: vi.fn(),
  generateGraph: vi.fn(),
  getAll: vi.fn(),
  listNotes: vi.fn(),
  listTodos: vi.fn(),
  getAllMeetings: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: graphMocks.push,
  }),
}));

vi.mock('@/lib/supabase/UserProvider', () => ({
  useUser: () => ({ user: { id: 'user-1' }, isLoading: false }),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({ children, pageTitle }: { children: React.ReactNode; pageTitle: string }) => (
    <main>
      <h1>{pageTitle}</h1>
      {children}
    </main>
  ),
}));

vi.mock('@/lib/ai/notes', () => ({
  getKnowledgeGraphGenerator: () => ({
    generateGraph: graphMocks.generateGraph,
  }),
}));

vi.mock('@/lib/repositories', () => ({
  createNoteRepository: () => ({
    getAll: graphMocks.getAll,
  }),
}));

vi.mock('@/lib/db', () => ({
  listNotes: graphMocks.listNotes,
  listTodos: graphMocks.listTodos,
}));

vi.mock('@/lib/storage/meetingStorage', () => ({
  createMeetingStorage: () => ({
    getAllMeetings: graphMocks.getAllMeetings,
  }),
}));

// Mock cytoscape to avoid initialization errors
vi.mock('cytoscape', () => ({
  __esModule: true,
  default: () => ({
    elements: () => ({ remove: () => {} }),
    add: () => {},
    layout: () => ({ run: () => {} }),
    fit: () => {},
    zoom: () => 1,
    center: () => {},
    destroy: () => {},
    on: () => {},
    off: () => {},
    json: () => ({ elements: [] }),
  }),
}));

import KnowledgeGraphPage from './page';

describe('KnowledgeGraphPage', () => {
  beforeEach(() => {
    graphMocks.push.mockClear();
    graphMocks.generateGraph.mockImplementation(async () => mockGraphData);
    graphMocks.getAll.mockImplementation(async () => mockNotes);
    graphMocks.listNotes.mockImplementation(async () => []);
    graphMocks.listTodos.mockImplementation(async () => []);
    graphMocks.getAllMeetings.mockImplementation(async () => []);
  });

  test('renders page title', async () => {
    render(<KnowledgeGraphPage />);

    expect(screen.getByText('Knowledge Map')).toBeDefined();
    await waitFor(() => {
      expect(graphMocks.generateGraph).toHaveBeenCalled();
    });
  });

  test('renders subtitle/description', async () => {
    render(<KnowledgeGraphPage />);

    expect(screen.getByText(/Visualize source-cited connections/)).toBeDefined();
    await waitFor(() => {
      expect(graphMocks.generateGraph).toHaveBeenCalled();
    });
  });

  test('shows loading state initially', async () => {
    render(<KnowledgeGraphPage />);

    // The KnowledgeGraphView component shows loading state with data-testid="graph-loading-container"
    expect(screen.getByTestId('graph-loading-container')).toBeDefined();
    expect(screen.getByText(/loading.*graph/i)).toBeDefined();
    await waitFor(() => {
      expect(screen.queryByTestId('graph-loading-container')).toBeNull();
    });
  });

  test('loads notes on mount', async () => {
    render(<KnowledgeGraphPage />);

    await waitFor(() => {
      expect(graphMocks.getAll).toHaveBeenCalled();
    });
  });

  test('generates graph with correct options', async () => {
    render(<KnowledgeGraphPage />);

    await waitFor(() => {
      expect(graphMocks.generateGraph).toHaveBeenCalledWith(
        mockNotes,
        expect.objectContaining({
          includeTags: true,
          includeSimilarity: true,
          maxNodes: 200,
        })
      );
    });
  });

  test('renders graph view after loading', async () => {
    render(<KnowledgeGraphPage />);

    // Wait for loading to complete and graph to render
    await waitFor(
      () => {
        // After loading, the graph container should be rendered
        expect(screen.queryByTestId('graph-loading-container')).toBeNull();
      },
      { timeout: 3000 }
    );

    // The graph should show the toolbar with controls
    expect(screen.getByTestId('graph-toolbar')).toBeDefined();
  });

  test('renders tips section', async () => {
    render(<KnowledgeGraphPage />);

    expect(screen.getByText(/Tips/)).toBeDefined();
    await waitFor(() => {
      expect(graphMocks.generateGraph).toHaveBeenCalled();
    });
  });

  test('shows empty state when no notes exist', async () => {
    graphMocks.getAll.mockImplementation(async () => []);
    graphMocks.generateGraph.mockImplementation(async () => ({
      nodes: [],
      edges: [],
      clusters: [],
    }));

    render(<KnowledgeGraphPage />);

    await waitFor(() => {
      expect(screen.getByTestId('graph-empty-state')).toBeDefined();
    });
  });

  test('handles errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      graphMocks.getAll.mockRejectedValue(new Error('Failed to load notes'));

      render(<KnowledgeGraphPage />);

      await waitFor(() => {
        expect(screen.getByText(/error loading graph/i)).toBeDefined();
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
