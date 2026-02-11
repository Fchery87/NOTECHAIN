'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import cytoscape from 'cytoscape';
import type { KnowledgeGraph } from '../lib/ai/notes/types';
import {
  transformGraphData,
  filterGraphByType,
  filterGraphByEdgeType,
} from '../lib/graph/transformData';
import { getLayoutOptions, LayoutType } from '../lib/graph/layouts';
import { getCytoscapeStyles } from '../lib/graph/cytoscapeStyles';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Props for KnowledgeGraphView component
 */
export interface KnowledgeGraphViewProps {
  /** The knowledge graph data to visualize */
  graph: KnowledgeGraph;
  /** Whether the graph is loading */
  isLoading?: boolean;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string, nodeData: any) => void;
  /** Height of the graph container */
  height?: string;
  /** Whether to show control toolbar */
  showControls?: boolean;
}

/**
 * KnowledgeGraphView - Interactive knowledge graph visualization component
 *
 * Uses Cytoscape.js for graph rendering with support for multiple layouts,
 * node type filtering, zoom controls, and node selection.
 *
 * Follows Warm Editorial Minimalism design system:
 * - Stone colors for backgrounds and text
 * - Amber accents for interactive elements
 * - Clean, minimal UI
 *
 * @example
 * ```tsx
 * <KnowledgeGraphView
 *   graph={graphData}
 *   onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
 *   height="600px"
 *   showControls={true}
 * />
 * ```
 */
export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  graph,
  isLoading = false,
  onNodeClick,
  height = '500px',
  showControls = true,
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  // State
  const [layoutType, setLayoutType] = useState<LayoutType>(LayoutType.FORCE_DIRECTED);
  const [visibleTypes, setVisibleTypes] = useState<Array<'note' | 'tag'>>(['note', 'tag']);
  const [visibleEdgeTypes, _setVisibleEdgeTypes] = useState<
    Array<'backlink' | 'tag' | 'similarity'>
  >(['backlink', 'tag', 'similarity']);

  /**
   * Transform and filter graph data for Cytoscape
   */
  const cytoscapeData = useMemo(() => {
    if (!graph || graph.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    let data = transformGraphData(graph);

    // Filter by node types
    if (visibleTypes.length > 0) {
      data = filterGraphByType(data, visibleTypes);
    }

    // Filter by edge types
    if (visibleEdgeTypes.length > 0) {
      data = filterGraphByEdgeType(data, visibleEdgeTypes);
    }

    return data;
  }, [graph, visibleTypes, visibleEdgeTypes]);

  /**
   * Initialize Cytoscape instance
   */
  useEffect(() => {
    if (!containerRef.current || isLoading || graph.nodes.length === 0) {
      return;
    }

    // Destroy existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    // Create new Cytoscape instance
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: cytoscapeData,
      style: getCytoscapeStyles(),
      layout: getLayoutOptions(layoutType),
      wheelSensitivity: 0.3,
      minZoom: 0.1,
      maxZoom: 3,
    });

    // Apply initial layout
    const layout = cyRef.current.layout(getLayoutOptions(layoutType));
    layout.run();

    // Add tap event listener for node clicks
    if (onNodeClick) {
      cyRef.current.on('tap', 'node', event => {
        const node = event.target;
        onNodeClick(node.id(), node.data());
      });
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);

  /**
   * Update graph data when dependencies change
   */
  useEffect(() => {
    if (!cyRef.current || isLoading) {
      return;
    }

    // Update elements
    cyRef.current.elements().remove();

    if (cytoscapeData.nodes.length > 0) {
      cyRef.current.add(cytoscapeData);

      // Re-run layout
      const layout = cyRef.current.layout(getLayoutOptions(layoutType));
      layout.run();
    }
  }, [cytoscapeData, layoutType, isLoading]);

  /**
   * Handle layout change
   */
  const handleLayoutChange = useCallback(
    (newLayout: LayoutType) => {
      setLayoutType(newLayout);

      if (cyRef.current && cytoscapeData.nodes.length > 0) {
        const layout = cyRef.current.layout(getLayoutOptions(newLayout));
        layout.run();
      }
    },
    [cytoscapeData.nodes.length]
  );

  /**
   * Handle zoom in
   */
  const handleZoomIn = useCallback(() => {
    if (cyRef.current) {
      const currentZoom = cyRef.current.zoom();
      cyRef.current.zoom(currentZoom * 1.2);
    }
  }, []);

  /**
   * Handle zoom out
   */
  const handleZoomOut = useCallback(() => {
    if (cyRef.current) {
      const currentZoom = cyRef.current.zoom();
      cyRef.current.zoom(currentZoom / 1.2);
    }
  }, []);

  /**
   * Handle fit to view
   */
  const handleFit = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  }, []);

  /**
   * Toggle node type visibility
   */
  const toggleNodeType = useCallback((type: 'note' | 'tag') => {
    setVisibleTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  }, []);

  /**
   * Check if graph is empty
   */
  const isEmpty = !isLoading && graph.nodes.length === 0;

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div
        data-testid="graph-loading-container"
        className="flex flex-col items-center justify-center bg-stone-50 rounded-xl border border-stone-200"
        style={{ height }}
      >
        <LoadingSpinner
          data-testid="graph-loading-spinner"
          size="lg"
          text="Loading knowledge graph..."
        />
      </div>
    );
  }

  /**
   * Empty state
   */
  if (isEmpty) {
    return (
      <div
        data-testid="graph-empty-state"
        className="flex flex-col items-center justify-center bg-stone-50 rounded-xl border border-stone-200 p-8"
        style={{ height }}
      >
        <div className="w-16 h-16 mb-4 text-stone-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-stone-700 mb-2">No notes found</h3>
        <p className="text-sm text-stone-500 text-center">
          Create some notes to see them visualized in the knowledge graph
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-stone-200 overflow-hidden bg-white">
      {/* Toolbar */}
      {showControls && (
        <div
          data-testid="graph-toolbar"
          className="flex flex-wrap items-center gap-3 px-4 py-3 bg-stone-50 border-b border-stone-200"
        >
          {/* Layout Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="layout-selector" className="text-sm text-stone-600 font-medium">
              Layout:
            </label>
            <select
              id="layout-selector"
              data-testid="layout-selector"
              value={layoutType}
              onChange={e => handleLayoutChange(e.target.value as LayoutType)}
              className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            >
              <option value={LayoutType.FORCE_DIRECTED}>Force Directed</option>
              <option value={LayoutType.CIRCLE}>Circle</option>
              <option value={LayoutType.GRID}>Grid</option>
              <option value={LayoutType.BREADTHFIRST}>Hierarchical</option>
              <option value={LayoutType.CONCENTRIC}>Concentric</option>
            </select>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-stone-300" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              data-testid="zoom-out-button"
              onClick={handleZoomOut}
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
              title="Zoom out"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              data-testid="fit-button"
              onClick={handleFit}
              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
              title="Fit to view"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              data-testid="zoom-in-button"
              onClick={handleZoomIn}
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
              title="Zoom in"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-stone-300" />

          {/* Node Type Filters */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-600 font-medium">Show:</span>
            <button
              data-testid="filter-notes"
              onClick={() => toggleNodeType('note')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                visibleTypes.includes('note')
                  ? 'bg-stone-200 text-stone-800'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-stone-600" />
              Notes
            </button>
            <button
              data-testid="filter-tags"
              onClick={() => toggleNodeType('tag')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                visibleTypes.includes('tag')
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Tags
            </button>
          </div>
        </div>
      )}

      {/* Graph Container */}
      <div className="relative">
        <div
          ref={containerRef}
          data-testid="knowledge-graph-container"
          className={`w-full ${isLoading ? 'hidden' : ''}`}
          style={{ height: showControls ? `calc(${height} - 60px)` : height }}
        />

        {/* Legend */}
        {showControls && (
          <div
            data-testid="graph-legend"
            className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-lg shadow-lg px-4 py-3"
          >
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Legend
            </h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-stone-600" />
                <span className="text-sm text-stone-700">Note</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-sm text-stone-700">Tag</span>
              </div>
              <div className="mt-2 pt-2 border-t border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-stone-600" />
                  <span className="text-xs text-stone-500">Backlink</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-6 h-0.5 bg-amber-500" style={{ borderStyle: 'dashed' }} />
                  <span className="text-xs text-stone-500">Tag Connection</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraphView;
