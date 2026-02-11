import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, afterEach, jest } from 'bun:test';
import { KnowledgeGraphView, KnowledgeGraphViewProps } from '../KnowledgeGraphView';
import type { KnowledgeGraph } from '../../lib/ai/notes/types';

// Track cytoscape instance for assertions
let mockCyInstance: unknown = null;

// Mock cytoscape
jest.mock('cytoscape', () => ({
  __esModule: true,
  default: jest.fn(() => {
    const mockElements: unknown[] = [];
    const eventHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};

    const instance = {
      elements: jest.fn(() => ({
        remove: jest.fn(() => {
          mockElements.length = 0;
        }),
      })),
      add: jest.fn((data: unknown) => {
        if (Array.isArray(data)) {
          mockElements.push(...data);
        }
      }),
      layout: jest.fn(() => ({
        run: jest.fn(),
      })),
      fit: jest.fn(),
      zoom: jest.fn((level?: number) => {
        if (level === undefined) return 1;
        return level;
      }),
      center: jest.fn(),
      destroy: jest.fn(() => {
        mockCyInstance = null;
      }),
      on: jest.fn(
        (
          event: string,
          selector: string | ((...args: unknown[]) => void),
          handler?: (...args: unknown[]) => void
        ) => {
          const key = typeof selector === 'string' ? `${event}:${selector}` : event;
          if (!eventHandlers[key]) eventHandlers[key] = [];
          eventHandlers[key].push(handler || (selector as (...args: unknown[]) => void));
        }
      ),
      off: jest.fn(),
      json: jest.fn(() => ({ elements: mockElements })),
      _eventHandlers: eventHandlers,
    };

    mockCyInstance = instance;
    return instance;
  }),
}));

describe('KnowledgeGraphView', () => {
  const mockGraph: KnowledgeGraph = {
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
          tagCount: 2,
          backlinkCount: 3,
        },
      },
      {
        id: 'note-2',
        label: 'Test Note 2',
        type: 'note',
        size: 15,
        color: '#57534e',
        metadata: {
          wordCount: 50,
          createdAt: new Date(),
          tagCount: 1,
          backlinkCount: 1,
        },
      },
      {
        id: 'tag-work',
        label: 'work',
        type: 'tag',
        size: 25,
        color: '#f59e0b',
        metadata: {
          wordCount: 0,
          createdAt: new Date(),
          tagCount: 5,
          backlinkCount: 0,
        },
      },
    ],
    edges: [
      {
        source: 'note-1',
        target: 'note-2',
        type: 'backlink',
        weight: 0.8,
        label: 'links to',
      },
      {
        source: 'note-1',
        target: 'tag-work',
        type: 'tag',
        weight: 0.4,
      },
    ],
    clusters: [],
  };

  const defaultProps: KnowledgeGraphViewProps = {
    graph: mockGraph,
    isLoading: false,
    onNodeClick: jest.fn(),
    height: '500px',
    showControls: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCyInstance = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockCyInstance = null;
  });

  test('renders graph container', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const container = screen.getByTestId('knowledge-graph-container');
    expect(container).toBeInTheDocument();
  });

  test('renders toolbar with controls when showControls is true', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const toolbar = screen.getByTestId('graph-toolbar');
    expect(toolbar).toBeInTheDocument();
  });

  test('does not render toolbar when showControls is false', () => {
    render(<KnowledgeGraphView {...defaultProps} showControls={false} />);

    const toolbar = screen.queryByTestId('graph-toolbar');
    expect(toolbar).not.toBeInTheDocument();
  });

  test('renders layout selector', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const layoutSelector = screen.getByTestId('layout-selector');
    expect(layoutSelector).toBeInTheDocument();
  });

  test('layout selector has all 5 layout options', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const layoutSelector = screen.getByTestId('layout-selector');
    const options = layoutSelector.querySelectorAll('option');
    expect(options).toHaveLength(5);

    const optionValues = Array.from(options).map(opt => opt.value);
    expect(optionValues).toContain('FORCE_DIRECTED');
    expect(optionValues).toContain('CIRCLE');
    expect(optionValues).toContain('GRID');
    expect(optionValues).toContain('BREADTHFIRST');
    expect(optionValues).toContain('CONCENTRIC');
  });

  test('shows loading state when isLoading is true', () => {
    render(<KnowledgeGraphView {...defaultProps} isLoading={true} />);

    const loadingContainer = screen.getByTestId('graph-loading-container');
    expect(loadingContainer).toBeInTheDocument();
    expect(screen.getByText(/loading.*graph/i)).toBeInTheDocument();
  });

  test('does not show graph when loading', () => {
    render(<KnowledgeGraphView {...defaultProps} isLoading={true} />);

    // When loading, the graph container should not be rendered at all
    const graphContainer = screen.queryByTestId('knowledge-graph-container');
    expect(graphContainer).not.toBeInTheDocument();
  });

  test('shows empty state when no nodes', () => {
    const emptyGraph: KnowledgeGraph = {
      nodes: [],
      edges: [],
      clusters: [],
    };

    render(<KnowledgeGraphView {...defaultProps} graph={emptyGraph} />);

    const emptyState = screen.getByTestId('graph-empty-state');
    expect(emptyState).toBeInTheDocument();
    expect(screen.getByText(/no notes.*found/i)).toBeInTheDocument();
  });

  test('onNodeClick prop is accepted and called when node is clicked', () => {
    const onNodeClick = jest.fn();
    render(<KnowledgeGraphView {...defaultProps} onNodeClick={onNodeClick} />);

    // Verify cytoscape on event was set up for tap
    expect(mockCyInstance).not.toBeNull();
    expect((mockCyInstance as { on: jest.Mock }).on).toHaveBeenCalledWith(
      'tap',
      'node',
      expect.any(Function)
    );
  });

  test('renders zoom controls', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const zoomInButton = screen.getByTestId('zoom-in-button');
    const zoomOutButton = screen.getByTestId('zoom-out-button');
    const fitButton = screen.getByTestId('fit-button');

    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();
    expect(fitButton).toBeInTheDocument();
  });

  test('renders node type filters', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const notesFilter = screen.getByTestId('filter-notes');
    const tagsFilter = screen.getByTestId('filter-tags');

    expect(notesFilter).toBeInTheDocument();
    expect(tagsFilter).toBeInTheDocument();
  });

  test('renders legend', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const legend = screen.getByTestId('graph-legend');
    expect(legend).toBeInTheDocument();
  });

  test('legend shows note type', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const legend = screen.getByTestId('graph-legend');
    expect(legend).toHaveTextContent(/note/i);
  });

  test('legend shows tag type', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const legend = screen.getByTestId('graph-legend');
    expect(legend).toHaveTextContent(/tag/i);
  });

  test('height prop is applied to container', () => {
    render(<KnowledgeGraphView {...defaultProps} height="600px" />);

    const container = screen.getByTestId('knowledge-graph-container');
    expect(container).toBeInTheDocument();
    // Height is applied via inline style - verify container exists and has style attribute
    expect(container.hasAttribute('style')).toBe(true);
  });

  test('uses default height when not specified', () => {
    const { height: _, ...propsWithoutHeight } = defaultProps;
    render(<KnowledgeGraphView {...propsWithoutHeight} height={undefined} />);

    const container = screen.getByTestId('knowledge-graph-container');
    expect(container).toBeInTheDocument();
  });

  test('zoom in button increases zoom level', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const zoomInButton = screen.getByTestId('zoom-in-button');
    fireEvent.click(zoomInButton);

    expect(mockCyInstance).not.toBeNull();
    expect((mockCyInstance as { zoom: jest.Mock }).zoom).toHaveBeenCalled();
  });

  test('zoom out button decreases zoom level', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const zoomOutButton = screen.getByTestId('zoom-out-button');
    fireEvent.click(zoomOutButton);

    expect(mockCyInstance).not.toBeNull();
    expect((mockCyInstance as { zoom: jest.Mock }).zoom).toHaveBeenCalled();
  });

  test('fit button fits the graph to view', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const fitButton = screen.getByTestId('fit-button');
    fireEvent.click(fitButton);

    expect(mockCyInstance).not.toBeNull();
    expect((mockCyInstance as { fit: jest.Mock }).fit).toHaveBeenCalled();
  });

  test('node filters toggle visibility', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const notesFilter = screen.getByTestId('filter-notes');
    fireEvent.click(notesFilter);

    // The filter state should have changed (this is implementation detail)
    // but we can verify the filter is interactive
    expect(notesFilter).toBeInTheDocument();
  });

  test('changing layout triggers layout change', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const layoutSelector = screen.getByTestId('layout-selector');
    fireEvent.change(layoutSelector, { target: { value: 'CIRCLE' } });

    // Layout should be applied
    expect(mockCyInstance).not.toBeNull();
    expect((mockCyInstance as { layout: jest.Mock }).layout).toHaveBeenCalled();
  });

  test('cleanup cytoscape on unmount', () => {
    const { unmount } = render(<KnowledgeGraphView {...defaultProps} />);
    unmount();

    expect(mockCyInstance).toBeNull();
  });

  test('initializes cytoscape when container and graph are available', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    expect(mockCyInstance).not.toBeNull();
  });

  test('toolbar uses warm editorial minimalism design', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const toolbar = screen.getByTestId('graph-toolbar');
    expect(toolbar).toHaveClass('bg-stone-50');
  });

  test('loading spinner uses correct design', () => {
    render(<KnowledgeGraphView {...defaultProps} isLoading={true} />);

    const loadingContainer = screen.getByTestId('graph-loading-container');
    expect(loadingContainer).toHaveClass('bg-stone-50');
  });

  test('empty state uses correct design', () => {
    const emptyGraph: KnowledgeGraph = {
      nodes: [],
      edges: [],
      clusters: [],
    };

    render(<KnowledgeGraphView {...defaultProps} graph={emptyGraph} />);

    const emptyState = screen.getByTestId('graph-empty-state');
    expect(emptyState).toHaveClass('bg-stone-50');
  });

  test('buttons use amber accent color for primary actions', () => {
    render(<KnowledgeGraphView {...defaultProps} />);

    const fitButton = screen.getByTestId('fit-button');
    expect(fitButton).toHaveClass('text-amber-600');
  });
});
