/**
 * Graph layout utilities for knowledge graph visualization
 * Provides layout configurations for Cytoscape.js
 */

/**
 * Available layout types for the graph visualization
 */
export enum LayoutType {
  FORCE_DIRECTED = 'FORCE_DIRECTED',
  CIRCLE = 'CIRCLE',
  GRID = 'GRID',
  BREADTHFIRST = 'BREADTHFIRST',
  CONCENTRIC = 'CONCENTRIC',
}

/**
 * Configuration options for graph layouts
 */
export interface LayoutConfig {
  name: string;
  animate?: boolean;
  animationDuration?: number;
  padding?: number;
  avoidOverlap?: boolean;
  directed?: boolean;
  componentSpacing?: number;
  nodeRepulsion?: number;
  edgeElasticity?: number;
  gravity?: number;
  numIter?: number;
  concentric?: (node: any) => number;
  levelWidth?: (nodes: any) => number;
  [key: string]: any;
}

/**
 * Base layout options shared across all layouts
 */
const baseLayoutOptions: Partial<LayoutConfig> = {
  animate: true,
  animationDuration: 500,
  padding: 30,
};

/**
 * Layout configurations for each layout type
 */
const layoutConfigs: Record<LayoutType, LayoutConfig> = {
  [LayoutType.FORCE_DIRECTED]: {
    ...baseLayoutOptions,
    name: 'cose',
    componentSpacing: 100,
    nodeRepulsion: 400000,
    edgeElasticity: 100,
    gravity: 80,
    numIter: 1000,
  },
  [LayoutType.CIRCLE]: {
    ...baseLayoutOptions,
    name: 'circle',
    padding: 30,
    avoidOverlap: true,
  },
  [LayoutType.GRID]: {
    ...baseLayoutOptions,
    name: 'grid',
    padding: 30,
    avoidOverlap: true,
  },
  [LayoutType.BREADTHFIRST]: {
    ...baseLayoutOptions,
    name: 'breadthfirst',
    directed: true,
    padding: 30,
  },
  [LayoutType.CONCENTRIC]: {
    ...baseLayoutOptions,
    name: 'concentric',
    padding: 30,
    concentric: (node: any) => {
      return node.degree();
    },
    levelWidth: (nodes: any) => {
      return nodes.maxDegree() / 4;
    },
  },
};

/**
 * Get layout options for a specific layout type
 * @param type - The layout type to get options for
 * @param customOptions - Optional custom options to override defaults
 * @returns Layout configuration options for Cytoscape
 */
export function getLayoutOptions(
  type: LayoutType,
  customOptions?: Partial<LayoutConfig>
): LayoutConfig {
  const baseConfig = layoutConfigs[type];

  if (!baseConfig) {
    throw new Error(`Unknown layout type: ${type}`);
  }

  return {
    ...baseConfig,
    ...customOptions,
  };
}

/**
 * Get the recommended layout type based on the number of nodes
 * @param nodeCount - Number of nodes in the graph
 * @returns Recommended layout type
 */
export function getRecommendedLayout(nodeCount: number): LayoutType {
  if (nodeCount <= 0) {
    return LayoutType.FORCE_DIRECTED;
  }

  if (nodeCount <= 20) {
    return LayoutType.FORCE_DIRECTED;
  } else if (nodeCount <= 50) {
    return LayoutType.CIRCLE;
  } else if (nodeCount <= 100) {
    return LayoutType.GRID;
  } else {
    return LayoutType.CONCENTRIC;
  }
}
