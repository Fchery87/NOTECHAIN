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
  encryption: { isEncryptionReady: true, encryptionError: null as string | null },
  loadCachedNotes: vi.fn(),
  loadNotes: vi.fn(),
}));

vi.mock('@/lib/sync/useNotesSync', () => ({
  useNotesSync: () => ({
    ...graphMocks.encryption,
    loadCachedNotes: graphMocks.loadCachedNotes,
    loadNotes: graphMocks.loadNotes,
  }),
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
    graphMocks.encryption = { isEncryptionReady: true, encryptionError: null };
    graphMocks.getContextGraph.mockResolvedValue(mockGraphData);
    graphMocks.loadCachedNotes.mockResolvedValue([{ id: 'note-1' }]);
    graphMocks.loadNotes.mockResolvedValue([{ id: 'note-1' }]);
  });

  test('fetches notes once on an empty local cache before building the graph', async () => {
    graphMocks.loadCachedNotes.mockResolvedValue([]);
    render(<KnowledgeGraphPage />);

    await waitFor(() => expect(graphMocks.getContextGraph).toHaveBeenCalledTimes(1));
    expect(graphMocks.loadNotes).toHaveBeenCalledTimes(1);
    expect(graphMocks.loadNotes.mock.invocationCallOrder[0]).toBeLessThan(
      graphMocks.getContextGraph.mock.invocationCallOrder[0]
    );
  });

  test('does not hit the network when notes are already cached', async () => {
    render(<KnowledgeGraphPage />);

    await waitFor(() => expect(graphMocks.getContextGraph).toHaveBeenCalled());
    expect(graphMocks.loadNotes).not.toHaveBeenCalled();
  });

  test('shows the encryption error instead of an incomplete graph', async () => {
    graphMocks.encryption = { isEncryptionReady: false, encryptionError: 'vault locked' };
    render(<KnowledgeGraphPage />);

    expect(await screen.findByText(/can't be decrypted right now: vault locked/)).toBeDefined();
    expect(graphMocks.getContextGraph).not.toHaveBeenCalled();
  });

  test('waits for the encryption key before reading notes', async () => {
    graphMocks.encryption = { isEncryptionReady: false, encryptionError: null };
    const { rerender } = render(<KnowledgeGraphPage />);

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(graphMocks.getContextGraph).not.toHaveBeenCalled();
    expect(screen.getByTestId('graph-loading-container')).toBeDefined();

    graphMocks.encryption = { isEncryptionReady: true, encryptionError: null };
    rerender(<KnowledgeGraphPage />);
    await waitFor(() => expect(graphMocks.getContextGraph).toHaveBeenCalledTimes(1));
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
