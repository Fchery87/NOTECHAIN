/**
 * Graph data transformer utilities
 * Converts KnowledgeGraph data to Cytoscape.js format
 */

import type {
  KnowledgeGraph,
  KnowledgeGraphEdgeType,
  KnowledgeGraphNodeMetadata,
  KnowledgeGraphNodeType,
} from '../ai/notes/types';

/**
 * Cytoscape node data structure
 */
export interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    type: KnowledgeGraphNodeType;
    size: number;
    color: string;
    metadata: KnowledgeGraphNodeMetadata;
  };
}

/**
 * Cytoscape edge data structure
 */
export interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    type: KnowledgeGraphEdgeType;
    weight: number;
    label?: string;
  };
}

/**
 * Complete Cytoscape data structure
 */
export interface CytoscapeData {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

/**
 * Transforms a KnowledgeGraph into Cytoscape.js format
 * @param graph - The knowledge graph to transform
 * @returns Cytoscape-compatible data structure
 */
export function transformGraphData(graph: KnowledgeGraph): CytoscapeData {
  const nodes: CytoscapeNode[] = graph.nodes.map(node => ({
    data: {
      id: node.id,
      label: node.label,
      type: node.type,
      size: node.size,
      color: node.color,
      metadata: node.metadata,
    },
  }));

  const edges: CytoscapeEdge[] = graph.edges.map((edge, index) => ({
    data: {
      id: `edge-${index}-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      weight: edge.weight,
      label: edge.label,
    },
  }));

  return { nodes, edges };
}

/**
 * Filters nodes by type and removes orphaned edges
 * @param data - Cytoscape data to filter
 * @param types - Array of node types to keep
 * @returns Filtered Cytoscape data
 */
export function filterGraphByType(
  data: CytoscapeData,
  types: KnowledgeGraphNodeType[]
): CytoscapeData {
  // Filter nodes by type
  const filteredNodes = data.nodes.filter(node => types.includes(node.data.type));

  // Get set of valid node IDs
  const validNodeIds = new Set(filteredNodes.map(node => node.data.id));

  // Filter edges to only include those where both source and target exist
  const filteredEdges = data.edges.filter(
    edge => validNodeIds.has(edge.data.source) && validNodeIds.has(edge.data.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

/**
 * Filters edges by type while keeping all nodes
 * @param data - Cytoscape data to filter
 * @param edgeTypes - Array of edge types to keep
 * @returns Filtered Cytoscape data
 */
export function filterGraphByEdgeType(
  data: CytoscapeData,
  edgeTypes: KnowledgeGraphEdgeType[]
): CytoscapeData {
  // Filter edges by type
  const filteredEdges = data.edges.filter(edge => edgeTypes.includes(edge.data.type));

  // Keep all nodes
  return {
    nodes: [...data.nodes],
    edges: filteredEdges,
  };
}
