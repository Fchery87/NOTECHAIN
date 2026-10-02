import { beforeEach, describe, expect, test, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { KnowledgeGraph } from '@/lib/ai/notes/types';

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
  getContextGraph: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: graphMocks.push,
  }),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({ children, pageTitle }: { children: React.ReactNode; pageTitle: string }) => (
    <main>
      <h1>{pageTitle}</h1>
      {children}
    </main>
  ),
}));

vi.mock('@/lib/graph/contextGraphQuery', () => ({
  createContextGraphQuery: () => ({
    getContextGraph: graphMocks.getContextGraph,
  }),
}));

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
    vi.clearAllMocks();
    graphMocks.getContextGraph.mockResolvedValue(mockGraphData);
  });

  test('renders page title', async () => {
    render(<KnowledgeGraphPage />);

    expect(screen.getByText('Knowledge Map')).toBeDefined();
    await waitFor(() => {
      expect(graphMocks.getContextGraph).toHaveBeenCalled();
    });
  });

  test('renders subtitle/description', async () => {
    render(<KnowledgeGraphPage />);

    expect(screen.getByText(/Visualize local, source-cited connections/)).toBeDefined();
    await waitFor(() => {
      expect(graphMocks.getContextGraph).toHaveBeenCalled();
    });
  });

  test('shows loading state initially', async () => {
    render(<KnowledgeGraphPage />);

    expect(screen.getByTestId('graph-loading-container')).toBeDefined();
    expect(screen.getByText(/loading.*graph/i)).toBeDefined();
    await waitFor(() => {
      expect(screen.queryByTestId('graph-loading-container')).toBeNull();
    });
  });

  test('builds the page graph entirely through the context graph query seam', async () => {
    render(<KnowledgeGraphPage />);

    await waitFor(() => {
      expect(graphMocks.getContextGraph).toHaveBeenCalledWith();
    });
  });

  test('renders graph view after loading', async () => {
    render(<KnowledgeGraphPage />);

    await waitFor(
      () => {
        expect(screen.queryByTestId('graph-loading-container')).toBeNull();
      },
      { timeout: 3000 }
    );

    await waitFor(() => {
      expect(screen.getByTestId('graph-toolbar')).toBeDefined();
    });
  });

  test('renders tips section', async () => {
    render(<KnowledgeGraphPage />);

    expect(screen.getByText(/Tips/)).toBeDefined();
    await waitFor(() => {
      expect(graphMocks.getContextGraph).toHaveBeenCalled();
    });
  });

  test('shows empty state when no nodes exist', async () => {
    graphMocks.getContextGraph.mockResolvedValue({
      nodes: [],
      edges: [],
      clusters: [],
    });

    render(<KnowledgeGraphPage />);

    await waitFor(() => {
      expect(screen.getByTestId('graph-empty-state')).toBeDefined();
    });
  });

  test('handles errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      graphMocks.getContextGraph.mockRejectedValue(new Error('Failed to load graph data'));

      render(<KnowledgeGraphPage />);

      await waitFor(() => {
        expect(screen.getByText(/error loading graph/i)).toBeDefined();
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
