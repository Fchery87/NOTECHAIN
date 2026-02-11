import { describe, it, expect } from 'vitest';
import {
  transformGraphData,
  filterGraphByType,
  filterGraphByEdgeType,
  type CytoscapeNode,
  type CytoscapeEdge,
  type CytoscapeData,
} from '../transformData';
import type { KnowledgeGraph, KnowledgeGraphNode, KnowledgeGraphEdge } from '../../ai/notes/types';

describe('transformData', () => {
  const mockDate = new Date('2024-01-15');

  const createMockNode = (overrides: Partial<KnowledgeGraphNode> = {}): KnowledgeGraphNode => ({
    id: 'node-1',
    label: 'Test Node',
    type: 'note',
    size: 10,
    color: '#57534e',
    metadata: {
      wordCount: 100,
      createdAt: mockDate,
      tagCount: 2,
      backlinkCount: 1,
    },
    ...overrides,
  });

  const createMockEdge = (overrides: Partial<KnowledgeGraphEdge> = {}): KnowledgeGraphEdge => ({
    source: 'node-1',
    target: 'node-2',
    type: 'backlink',
    weight: 1,
    ...overrides,
  });

  const createMockGraph = (overrides: Partial<KnowledgeGraph> = {}): KnowledgeGraph => ({
    nodes: [],
    edges: [],
    clusters: [],
    ...overrides,
  });

  describe('transformGraphData', () => {
    it('should convert KnowledgeGraph to Cytoscape format', () => {
      const graph = createMockGraph({
        nodes: [createMockNode({ id: 'node-1', label: 'Node 1' })],
        edges: [createMockEdge({ source: 'node-1', target: 'node-2' })],
      });

      const result = transformGraphData(graph);

      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(Array.isArray(result.nodes)).toBe(true);
      expect(Array.isArray(result.edges)).toBe(true);
    });

    it('should transform nodes with correct data properties', () => {
      const node = createMockNode({
        id: 'note-1',
        label: 'My Note',
        type: 'note',
        size: 25,
        color: '#f59e0b',
        metadata: {
          wordCount: 500,
          createdAt: mockDate,
          tagCount: 5,
          backlinkCount: 3,
        },
      });

      const graph = createMockGraph({ nodes: [node] });
      const result = transformGraphData(graph);

      expect(result.nodes).toHaveLength(1);
      const cytoscapeNode = result.nodes[0];
      expect(cytoscapeNode.data.id).toBe('note-1');
      expect(cytoscapeNode.data.label).toBe('My Note');
      expect(cytoscapeNode.data.type).toBe('note');
      expect(cytoscapeNode.data.size).toBe(25);
      expect(cytoscapeNode.data.color).toBe('#f59e0b');
      expect(cytoscapeNode.data.metadata).toEqual({
        wordCount: 500,
        createdAt: mockDate,
        tagCount: 5,
        backlinkCount: 3,
      });
    });

    it('should transform edges with correct data properties', () => {
      const edge = createMockEdge({
        source: 'node-a',
        target: 'node-b',
        type: 'similarity',
        weight: 0.85,
        label: 'similar to',
      });

      const graph = createMockGraph({ edges: [edge] });
      const result = transformGraphData(graph);

      expect(result.edges).toHaveLength(1);
      const cytoscapeEdge = result.edges[0];
      expect(cytoscapeEdge.data.id).toBeDefined();
      expect(cytoscapeEdge.data.source).toBe('node-a');
      expect(cytoscapeEdge.data.target).toBe('node-b');
      expect(cytoscapeEdge.data.type).toBe('similarity');
      expect(cytoscapeEdge.data.weight).toBe(0.85);
      expect(cytoscapeEdge.data.label).toBe('similar to');
    });

    it('should generate unique edge IDs', () => {
      const edges = [
        createMockEdge({ source: 'a', target: 'b' }),
        createMockEdge({ source: 'b', target: 'c' }),
        createMockEdge({ source: 'a', target: 'b' }), // Duplicate connection
      ];

      const graph = createMockGraph({ edges });
      const result = transformGraphData(graph);

      const ids = result.edges.map(e => e.data.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should handle empty graph', () => {
      const emptyGraph = createMockGraph();
      const result = transformGraphData(emptyGraph);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('should handle graph with only nodes', () => {
      const graph = createMockGraph({
        nodes: [createMockNode(), createMockNode({ id: 'node-2' })],
        edges: [],
      });

      const result = transformGraphData(graph);

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toEqual([]);
    });

    it('should handle graph with only edges', () => {
      const graph = createMockGraph({
        nodes: [],
        edges: [createMockEdge()],
      });

      const result = transformGraphData(graph);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toHaveLength(1);
    });

    it('should support all node types', () => {
      const nodes: KnowledgeGraphNode[] = [
        createMockNode({ id: 'note-1', type: 'note' }),
        createMockNode({ id: 'tag-1', type: 'tag' }),
        createMockNode({ id: 'concept-1', type: 'concept' }),
      ];

      const graph = createMockGraph({ nodes });
      const result = transformGraphData(graph);

      expect(result.nodes[0].data.type).toBe('note');
      expect(result.nodes[1].data.type).toBe('tag');
      expect(result.nodes[2].data.type).toBe('concept');
    });

    it('should support all edge types', () => {
      const edges: KnowledgeGraphEdge[] = [
        createMockEdge({ source: 'a', target: 'b', type: 'backlink' }),
        createMockEdge({ source: 'b', target: 'c', type: 'tag' }),
        createMockEdge({ source: 'c', target: 'd', type: 'similarity' }),
        createMockEdge({ source: 'd', target: 'e', type: 'temporal' }),
      ];

      const graph = createMockGraph({ edges });
      const result = transformGraphData(graph);

      expect(result.edges[0].data.type).toBe('backlink');
      expect(result.edges[1].data.type).toBe('tag');
      expect(result.edges[2].data.type).toBe('similarity');
      expect(result.edges[3].data.type).toBe('temporal');
    });

    it('should handle nodes without metadata', () => {
      const node = createMockNode({
        metadata: {
          wordCount: 0,
          createdAt: mockDate,
          tagCount: 0,
          backlinkCount: 0,
        },
      });

      const graph = createMockGraph({ nodes: [node] });
      const result = transformGraphData(graph);

      expect(result.nodes[0].data.metadata.wordCount).toBe(0);
      expect(result.nodes[0].data.metadata.tagCount).toBe(0);
    });

    it('should handle edges without optional label', () => {
      const edge = createMockEdge({ label: undefined });

      const graph = createMockGraph({ edges: [edge] });
      const result = transformGraphData(graph);

      expect(result.edges[0].data.label).toBeUndefined();
    });
  });

  describe('filterGraphByType', () => {
    const mockData: CytoscapeData = {
      nodes: [
        {
          data: {
            id: 'note-1',
            label: 'Note 1',
            type: 'note',
            size: 10,
            color: '#57534e',
            metadata: { wordCount: 100, createdAt: mockDate, tagCount: 2, backlinkCount: 1 },
          },
        },
        {
          data: {
            id: 'note-2',
            label: 'Note 2',
            type: 'note',
            size: 15,
            color: '#57534e',
            metadata: { wordCount: 200, createdAt: mockDate, tagCount: 3, backlinkCount: 2 },
          },
        },
        {
          data: {
            id: 'tag-1',
            label: 'Tag 1',
            type: 'tag',
            size: 8,
            color: '#f59e0b',
            metadata: { wordCount: 0, createdAt: mockDate, tagCount: 0, backlinkCount: 0 },
          },
        },
        {
          data: {
            id: 'concept-1',
            label: 'Concept 1',
            type: 'concept',
            size: 12,
            color: '#8b5cf6',
            metadata: { wordCount: 0, createdAt: mockDate, tagCount: 0, backlinkCount: 0 },
          },
        },
      ],
      edges: [
        { data: { id: 'edge-1', source: 'note-1', target: 'note-2', type: 'backlink', weight: 1 } },
        { data: { id: 'edge-2', source: 'note-1', target: 'tag-1', type: 'tag', weight: 1 } },
        {
          data: {
            id: 'edge-3',
            source: 'note-2',
            target: 'concept-1',
            type: 'similarity',
            weight: 0.8,
          },
        },
        {
          data: {
            id: 'edge-4',
            source: 'tag-1',
            target: 'concept-1',
            type: 'similarity',
            weight: 0.6,
          },
        },
      ],
    };

    it('should filter nodes by single type', () => {
      const result = filterGraphByType(mockData, ['note']);

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes.every(n => n.data.type === 'note')).toBe(true);
    });

    it('should filter nodes by multiple types', () => {
      const result = filterGraphByType(mockData, ['note', 'tag']);

      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.some(n => n.data.type === 'note')).toBe(true);
      expect(result.nodes.some(n => n.data.type === 'tag')).toBe(true);
      expect(result.nodes.some(n => n.data.type === 'concept')).toBe(false);
    });

    it('should remove orphaned edges when filtering nodes', () => {
      const result = filterGraphByType(mockData, ['note']);

      // Only edge-1 connects two notes
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].data.id).toBe('edge-1');
    });

    it('should keep edges where both nodes exist', () => {
      const result = filterGraphByType(mockData, ['note', 'concept']);

      // edge-3 connects note-2 to concept-1
      expect(result.edges.some(e => e.data.id === 'edge-3')).toBe(true);
    });

    it('should return empty arrays when no types match', () => {
      const result = filterGraphByType(mockData, ['nonexistent']);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('should handle empty input', () => {
      const emptyData: CytoscapeData = { nodes: [], edges: [] };
      const result = filterGraphByType(emptyData, ['note']);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('should not modify original data', () => {
      const originalNodeCount = mockData.nodes.length;
      const originalEdgeCount = mockData.edges.length;

      filterGraphByType(mockData, ['note']);

      expect(mockData.nodes).toHaveLength(originalNodeCount);
      expect(mockData.edges).toHaveLength(originalEdgeCount);
    });
  });

  describe('filterGraphByEdgeType', () => {
    const mockData: CytoscapeData = {
      nodes: [
        {
          data: {
            id: 'node-1',
            label: 'Node 1',
            type: 'note',
            size: 10,
            color: '#57534e',
            metadata: { wordCount: 100, createdAt: mockDate, tagCount: 2, backlinkCount: 1 },
          },
        },
        {
          data: {
            id: 'node-2',
            label: 'Node 2',
            type: 'note',
            size: 15,
            color: '#57534e',
            metadata: { wordCount: 200, createdAt: mockDate, tagCount: 3, backlinkCount: 2 },
          },
        },
        {
          data: {
            id: 'node-3',
            label: 'Node 3',
            type: 'tag',
            size: 8,
            color: '#f59e0b',
            metadata: { wordCount: 0, createdAt: mockDate, tagCount: 0, backlinkCount: 0 },
          },
        },
      ],
      edges: [
        { data: { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'backlink', weight: 1 } },
        { data: { id: 'edge-2', source: 'node-1', target: 'node-3', type: 'tag', weight: 1 } },
        {
          data: {
            id: 'edge-3',
            source: 'node-2',
            target: 'node-3',
            type: 'similarity',
            weight: 0.8,
          },
        },
        {
          data: { id: 'edge-4', source: 'node-3', target: 'node-1', type: 'temporal', weight: 0.5 },
        },
      ],
    };

    it('should filter edges by single type', () => {
      const result = filterGraphByEdgeType(mockData, ['backlink']);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].data.type).toBe('backlink');
    });

    it('should filter edges by multiple types', () => {
      const result = filterGraphByEdgeType(mockData, ['backlink', 'tag']);

      expect(result.edges).toHaveLength(2);
      expect(result.edges.some(e => e.data.type === 'backlink')).toBe(true);
      expect(result.edges.some(e => e.data.type === 'tag')).toBe(true);
      expect(result.edges.some(e => e.data.type === 'similarity')).toBe(false);
    });

    it('should keep all nodes when filtering edges', () => {
      const result = filterGraphByEdgeType(mockData, ['backlink']);

      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.map(n => n.data.id).sort()).toEqual(['node-1', 'node-2', 'node-3']);
    });

    it('should return all edges when all types specified', () => {
      const result = filterGraphByEdgeType(mockData, ['backlink', 'tag', 'similarity', 'temporal']);

      expect(result.edges).toHaveLength(4);
    });

    it('should return empty edges array when no types match', () => {
      const result = filterGraphByEdgeType(mockData, ['nonexistent']);

      expect(result.edges).toEqual([]);
      expect(result.nodes).toHaveLength(3);
    });

    it('should handle empty input', () => {
      const emptyData: CytoscapeData = { nodes: [], edges: [] };
      const result = filterGraphByEdgeType(emptyData, ['backlink']);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('should not modify original data', () => {
      const originalEdgeCount = mockData.edges.length;

      filterGraphByEdgeType(mockData, ['backlink']);

      expect(mockData.edges).toHaveLength(originalEdgeCount);
    });
  });
});
