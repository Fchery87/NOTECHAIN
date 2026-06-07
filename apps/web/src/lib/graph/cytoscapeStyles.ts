/**
 * Cytoscape styles for the knowledge graph visualization
 * Following Warm Editorial Minimalism design system
 */

export interface CytoscapeStyle {
  selector: string;
  style: Record<string, any>;
}

/**
 * Returns the Cytoscape style configuration for the knowledge graph
 * Implements Warm Editorial Minimalism design system
 */
export function getCytoscapeStyles(): CytoscapeStyle[] {
  return [
    // Base node styles
    {
      selector: 'node',
      style: {
        'background-color': '#57534e',
        label: 'data(label)',
        color: '#1c1917',
        'font-family': '"DM Sans", system-ui, sans-serif',
        'font-size': '12px',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '100px',
        width: 'mapData(size, 1, 100, 20, 80)',
        height: 'mapData(size, 1, 100, 20, 80)',
        'border-width': 2,
        'border-color': '#fafaf9',
        'border-opacity': 0,
        'transition-property': 'background-color, border-width, border-opacity, border-color',
        'transition-duration': '0.3s',
      },
    },

    // Note node styles
    {
      selector: 'node[type="note"]',
      style: {
        shape: 'ellipse',
        'background-color': '#57534e',
        color: '#fafaf9',
      },
    },

    // Tag node styles
    {
      selector: 'node[type="tag"]',
      style: {
        shape: 'round-rectangle',
        'background-color': '#f59e0b',
        color: '#fffbeb',
        'font-weight': '600',
        width: 'mapData(size, 1, 100, 30, 90)',
        height: 'mapData(size, 1, 100, 15, 40)',
        padding: '8px',
      },
    },

    // Meeting node styles
    {
      selector: 'node[type="meeting"]',
      style: {
        shape: 'round-hexagon',
        'background-color': '#f43f5e',
        color: '#fff1f2',
        'font-weight': '600',
      },
    },

    // Transcript segment node styles
    {
      selector: 'node[type="transcript_segment"]',
      style: {
        shape: 'round-rectangle',
        'background-color': '#fed7aa',
        color: '#7c2d12',
        'font-size': '10px',
        width: 'mapData(size, 1, 100, 40, 110)',
        height: 'mapData(size, 1, 100, 18, 48)',
      },
    },

    // Task node styles
    {
      selector: 'node[type="task"]',
      style: {
        shape: 'diamond',
        'background-color': '#0f766e',
        color: '#f0fdfa',
        'font-weight': '600',
      },
    },

    // Hover state for nodes
    {
      selector: 'node:hover',
      style: {
        'border-opacity': 1,
        'border-width': 3,
        'border-color': '#d6d3d1',
      },
    },

    // Selected node styles
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#f59e0b',
        'border-opacity': 1,
        'shadow-blur': 10,
        'shadow-color': '#f59e0b',
        'shadow-opacity': 0.4,
      },
    },

    // Active/pressed node styles
    {
      selector: 'node:active',
      style: {
        'background-color': '#44403c',
      },
    },

    // Base edge styles
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#d6d3d1',
        'target-arrow-color': '#d6d3d1',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 1.2,
        opacity: 0.8,
        'transition-property': 'line-color, width, opacity',
        'transition-duration': '0.3s',
      },
    },

    // Backlink edge styles
    {
      selector: 'edge[type="backlink"]',
      style: {
        'line-color': '#57534e',
        'target-arrow-color': '#57534e',
        'line-style': 'solid',
        width: 2,
      },
    },

    // Tag edge styles
    {
      selector: 'edge[type="tag"]',
      style: {
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b',
        'line-style': 'dashed',
        width: 2,
        'target-arrow-shape': 'none',
      },
    },

    // Similarity edge styles
    {
      selector: 'edge[type="similarity"]',
      style: {
        'line-color': '#8b5cf6',
        'target-arrow-color': '#8b5cf6',
        'line-style': 'dotted',
        width: 1.5,
        'target-arrow-shape': 'none',
      },
    },

    // Created-from edge styles
    {
      selector: 'edge[type="created_from"]',
      style: {
        'line-color': '#f43f5e',
        'target-arrow-color': '#f43f5e',
        'line-style': 'solid',
        width: 2.5,
      },
    },

    // Citation edge styles
    {
      selector: 'edge[type="cites"]',
      style: {
        'line-color': '#d97706',
        'target-arrow-color': '#d97706',
        'line-style': 'dashed',
        width: 2,
      },
    },

    // Hover state for edges
    {
      selector: 'edge:hover',
      style: {
        width: 3,
        opacity: 1,
      },
    },

    // Selected edge styles
    {
      selector: 'edge:selected',
      style: {
        width: 3,
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b',
        opacity: 1,
      },
    },

    // Highlighted node (for search/focus)
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 4,
        'border-color': '#f59e0b',
        'border-opacity': 1,
        'shadow-blur': 15,
        'shadow-color': '#f59e0b',
        'shadow-opacity': 0.5,
      },
    },

    // Dimmed node (when filtering/focusing)
    {
      selector: 'node.dimmed',
      style: {
        opacity: 0.3,
      },
    },

    // Dimmed edge (when filtering/focusing)
    {
      selector: 'edge.dimmed',
      style: {
        opacity: 0.2,
      },
    },

    // Labels on hover
    {
      selector: 'node.show-label',
      style: {
        'font-size': '14px',
        'text-background-color': '#fafaf9',
        'text-background-opacity': 0.9,
        'text-background-shape': 'roundrectangle',
        'text-background-padding': '4px',
        'text-border-color': '#e7e5e4',
        'text-border-width': 1,
        'text-border-opacity': 1,
      },
    },
  ];
}
