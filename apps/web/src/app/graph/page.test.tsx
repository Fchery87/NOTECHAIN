import { describe, it, expect, beforeEach, afterEach, vi, mock } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KnowledgeGraphPage from './page';
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

// Mock next/navigation
const mockPush = mock(() => {});
mock.module('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock getKnowledgeGraphGenerator
const mockGenerateGraph = mock(async (): Promise<KnowledgeGraph> => mockGraphData);

mock.module('@/lib/ai/notes', () => ({
  getKnowledgeGraphGenerator: () => ({
    generateGraph: mockGenerateGraph,
  }),
}));

// Mock createNoteRepository
const mockGetAll = mock(async () => mockNotes);

mock.module('@/lib/repositories', () => ({
  createNoteRepository: () => ({
    getAll: mockGetAll,
  }),
}));

// Mock cytoscape to avoid initialization errors
mock.module('cytoscape', () => ({
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

describe('KnowledgeGraphPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGenerateGraph.mockImplementation(async () => mockGraphData);
    mockGetAll.mockImplementation(async () => mockNotes);
  });

  test('renders page title', () => {
    render(<KnowledgeGraphPage />);

    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  test('renders subtitle/description', () => {
    render(<KnowledgeGraphPage />);

    expect(screen.getByText(/Visualize connections between your notes/)).toBeDefined();
  });

  test('shows loading state initially', () => {
    render(<KnowledgeGraphPage />);

    // The KnowledgeGraphView component shows loading state with data-testid="graph-loading-container"
    expect(screen.getByTestId('graph-loading-container')).toBeDefined();
    expect(screen.getByText(/loading.*graph/i)).toBeDefined();
  });

  test('loads notes on mount', async () => {
    render(<KnowledgeGraphPage />);

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalled();
    });
  });

  test('generates graph with correct options', async () => {
    render(<KnowledgeGraphPage />);

    await waitFor(() => {
      expect(mockGenerateGraph).toHaveBeenCalledWith(
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

  test('renders tips section', () => {
    render(<KnowledgeGraphPage />);

    expect(screen.getByText(/Tips/)).toBeDefined();
  });

  test('shows empty state when no notes exist', async () => {
    mockGetAll.mockImplementation(async () => []);
    mockGenerateGraph.mockImplementation(async () => ({
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
    // Suppress console.error for this test
    const originalConsoleError = console.error;
    console.error = () => {};

    mockGetAll.mockRejectedValue(new Error('Failed to load notes'));

    render(<KnowledgeGraphPage />);

    await waitFor(() => {
      expect(screen.getByText(/error loading graph/i)).toBeDefined();
    });

    // Restore console.error
    console.error = originalConsoleError;
  });
});
