// apps/web/src/lib/ai/notes/KnowledgeGraphGenerator.ts

import type { KnowledgeGraph, KnowledgeGraphNode, KnowledgeGraphEdge, GraphCluster } from './types';
import type { Note } from '@notechain/data-models';
import { getRelatedNotesFinder } from './RelatedNotesFinder';
import { getNoteAnalyzer } from './NoteAnalyzer';

/**
 * KnowledgeGraphGenerator creates graph data for visualizing
 * note relationships, tags, and connections
 */
export class KnowledgeGraphGenerator {
  private relatedNotesFinder = getRelatedNotesFinder();
  private analyzer = getNoteAnalyzer();

  /**
   * Generate knowledge graph from notes
   */
  async generateGraph(
    notes: Note[],
    options: {
      includeTags?: boolean;
      includeSimilarity?: boolean;
      minSimilarity?: number;
      maxNodes?: number;
    } = {}
  ): Promise<KnowledgeGraph> {
    const {
      includeTags = true,
      includeSimilarity = true,
      minSimilarity = 0.3,
      maxNodes = 100,
    } = options;

    const nodes: KnowledgeGraphNode[] = [];
    const edges: KnowledgeGraphEdge[] = [];
    const nodeMap = new Map<string, KnowledgeGraphNode>();

    // Create nodes for notes
    for (const note of notes.slice(0, maxNodes)) {
      const node = this.createNoteNode(note, notes);
      nodes.push(node);
      nodeMap.set(note.id, node);
    }

    // Create edges from backlinks
    for (const note of notes) {
      for (const backlink of note.backlinks) {
        if (nodeMap.has(backlink.sourceNoteId) && nodeMap.has(backlink.targetNoteId)) {
          edges.push({
            source: backlink.sourceNoteId,
            target: backlink.targetNoteId,
            type: 'backlink',
            weight: 0.8,
            label: 'links to',
          });
        }
      }
    }

    // Create tag nodes and connections
    if (includeTags) {
      const tagConnections = this.buildTagConnections(notes);

      for (const [tag, noteIds] of tagConnections) {
        const tagNode: KnowledgeGraphNode = {
          id: `tag-${tag}`,
          label: tag,
          type: 'tag',
          size: Math.min(30, 10 + noteIds.length * 3),
          color: '#f59e0b', // Amber for tags
          metadata: {
            wordCount: 0,
            createdAt: new Date(),
            tagCount: noteIds.length,
            backlinkCount: 0,
          },
        };
        nodes.push(tagNode);
        nodeMap.set(tagNode.id, tagNode);

        // Connect notes to tags
        for (const noteId of noteIds) {
          edges.push({
            source: noteId,
            target: tagNode.id,
            type: 'tag',
            weight: 0.4,
          });
        }
      }
    }

    // Create similarity edges
    if (includeSimilarity) {
      await this.relatedNotesFinder.initialize();
      await this.relatedNotesFinder.indexNotes(notes);

      for (const note of notes) {
        const related = await this.relatedNotesFinder.findRelatedNotes(note, notes, {
          maxResults: 3,
          minSimilarity,
          includeBacklinks: false,
        });

        for (const relatedNote of related) {
          // Avoid duplicate edges
          const existingEdge = edges.find(
            e =>
              (e.source === note.id && e.target === relatedNote.note.id) ||
              (e.source === relatedNote.note.id && e.target === note.id)
          );

          if (!existingEdge) {
            edges.push({
              source: note.id,
              target: relatedNote.note.id,
              type: 'similarity',
              weight: relatedNote.similarityScore * 0.6,
              label: relatedNote.sharedKeywords.slice(0, 2).join(', ') || 'related',
            });
          }
        }
      }
    }

    // Detect clusters using community detection
    const clusters = this.detectClusters(nodes, edges);

    return {
      nodes,
      edges,
      clusters,
    };
  }

  /**
   * Generate a focused subgraph around a specific note
   */
  async generateFocusedGraph(
    centerNote: Note,
    allNotes: Note[],
    depth: number = 2
  ): Promise<KnowledgeGraph> {
    const nodes: KnowledgeGraphNode[] = [];
    const edges: KnowledgeGraphEdge[] = [];
    const includedNoteIds = new Set<string>();

    // Add center note
    nodes.push(this.createNoteNode(centerNote, allNotes));
    includedNoteIds.add(centerNote.id);

    // BFS to find connected notes up to depth
    let currentDepth = 0;
    let currentNotes = [centerNote];

    while (currentDepth < depth && currentNotes.length > 0) {
      const nextNotes: Note[] = [];

      for (const note of currentNotes) {
        // Find connected notes via backlinks
        for (const backlink of note.backlinks) {
          const connectedNote = allNotes.find(n => n.id === backlink.sourceNoteId);
          if (connectedNote && !includedNoteIds.has(connectedNote.id)) {
            nodes.push(this.createNoteNode(connectedNote, allNotes));
            includedNoteIds.add(connectedNote.id);
            nextNotes.push(connectedNote);

            edges.push({
              source: backlink.sourceNoteId,
              target: note.id,
              type: 'backlink',
              weight: 0.8,
            });
          }
        }

        // Find notes that link to this note
        for (const otherNote of allNotes) {
          if (otherNote.id === note.id) continue;

          const linksToCurrent = otherNote.backlinks.some(b => b.targetNoteId === note.id);

          if (linksToCurrent && !includedNoteIds.has(otherNote.id)) {
            nodes.push(this.createNoteNode(otherNote, allNotes));
            includedNoteIds.add(otherNote.id);
            nextNotes.push(otherNote);

            edges.push({
              source: otherNote.id,
              target: note.id,
              type: 'backlink',
              weight: 0.8,
            });
          }
        }
      }

      currentNotes = nextNotes;
      currentDepth++;
    }

    // Add some similar notes
    await this.relatedNotesFinder.initialize();
    const related = await this.relatedNotesFinder.findRelatedNotes(
      centerNote,
      allNotes.filter(n => !includedNoteIds.has(n.id)),
      { maxResults: 5, minSimilarity: 0.4 }
    );

    for (const relatedNote of related) {
      if (!includedNoteIds.has(relatedNote.note.id)) {
        nodes.push(this.createNoteNode(relatedNote.note, allNotes));
        includedNoteIds.add(relatedNote.note.id);

        edges.push({
          source: centerNote.id,
          target: relatedNote.note.id,
          type: 'similarity',
          weight: relatedNote.similarityScore * 0.6,
        });
      }
    }

    // Detect clusters
    const clusters = this.detectClusters(nodes, edges);

    return {
      nodes,
      edges,
      clusters,
    };
  }

  /**
   * Create a graph node from a note
   */
  private createNoteNode(note: Note, allNotes: Note[]): KnowledgeGraphNode {
    // Calculate importance based on backlinks
    const backlinkCount = this.countBacklinks(note, allNotes);
    const size = Math.min(40, 15 + backlinkCount * 5);

    // Color based on age
    const daysSinceCreated = (Date.now() - note.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const color = this.getNodeColor(daysSinceCreated);

    return {
      id: note.id,
      label: note.title.slice(0, 30),
      type: 'note',
      size,
      color,
      metadata: {
        wordCount: note.wordCount,
        createdAt: note.createdAt,
        tagCount: note.tags.length,
        backlinkCount,
      },
    };
  }

  /**
   * Build map of tags to note IDs
   */
  private buildTagConnections(notes: Note[]): Map<string, string[]> {
    const tagMap = new Map<string, string[]>();

    for (const note of notes) {
      for (const tag of note.tags) {
        const lowerTag = tag.toLowerCase();
        if (!tagMap.has(lowerTag)) {
          tagMap.set(lowerTag, []);
        }
        tagMap.get(lowerTag)!.push(note.id);
      }
    }

    return tagMap;
  }

  /**
   * Count backlinks to a note
   */
  private countBacklinks(note: Note, allNotes: Note[]): number {
    let count = 0;
    for (const otherNote of allNotes) {
      if (otherNote.backlinks.some(b => b.targetNoteId === note.id)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Detect clusters in the graph using simple community detection
   */
  private detectClusters(nodes: KnowledgeGraphNode[], edges: KnowledgeGraphEdge[]): GraphCluster[] {
    const clusters: GraphCluster[] = [];

    // Group notes by shared tags
    const _tagGroups = new Map<string, string[]>();
    const noteNodes = nodes.filter(n => n.type === 'note');

    // Find connected components via edges
    const adjacencyList = new Map<string, string[]>();
    for (const node of noteNodes) {
      adjacencyList.set(node.id, []);
    }

    for (const edge of edges) {
      if (edge.type === 'backlink' || edge.type === 'similarity') {
        const sourceList = adjacencyList.get(edge.source);
        const targetList = adjacencyList.get(edge.target);
        if (sourceList) sourceList.push(edge.target);
        if (targetList) targetList.push(edge.source);
      }
    }

    // Find connected components
    const visited = new Set<string>();
    for (const node of noteNodes) {
      if (visited.has(node.id)) continue;

      const component: string[] = [];
      const stack = [node.id];

      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;

        visited.add(current);
        component.push(current);

        const neighbors = adjacencyList.get(current) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }

      // Only create cluster if component has 3+ nodes
      if (component.length >= 3) {
        const clusterId = `cluster-${clusters.length}`;
        const clusterNodes = noteNodes.filter(n => component.includes(n.id));

        // Calculate centroid
        const centroid = this.calculateCentroid(clusterNodes, clusters.length);

        clusters.push({
          id: clusterId,
          label: this.generateClusterLabel(clusterNodes),
          nodeIds: component,
          centroid,
          color: this.getClusterColor(clusters.length),
        });
      }
    }

    return clusters;
  }

  /**
   * Calculate centroid for cluster positioning
   */
  private calculateCentroid(nodes: KnowledgeGraphNode[], index: number): { x: number; y: number } {
    // Use spiral layout for initial positioning
    const angle = (index * 137.5 * Math.PI) / 180; // Golden angle
    const radius = 200 + index * 50;

    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    };
  }

  /**
   * Generate label for a cluster
   */
  private generateClusterLabel(nodes: KnowledgeGraphNode[]): string {
    if (nodes.length === 0) return 'Unnamed Cluster';

    // Use the most connected node's label
    const sortedByConnections = [...nodes].sort(
      (a, b) => b.metadata.backlinkCount - a.metadata.backlinkCount
    );

    return `${sortedByConnections[0]?.label || 'Unnamed'} & ${nodes.length - 1} others`;
  }

  /**
   * Get color based on note age
   */
  private getNodeColor(daysSinceCreated: number): string {
    if (daysSinceCreated < 7) return '#10b981'; // Green - recent
    if (daysSinceCreated < 30) return '#f59e0b'; // Amber - this month
    if (daysSinceCreated < 90) return '#8b5cf6'; // Purple - this quarter
    return '#6b7280'; // Gray - older
  }

  /**
   * Get color for cluster
   */
  private getClusterColor(index: number): string {
    const colors = [
      '#f59e0b', // Amber
      '#10b981', // Emerald
      '#8b5cf6', // Violet
      '#f43f5e', // Rose
      '#06b6d4', // Cyan
      '#ec4899', // Pink
    ];
    return colors[index % colors.length];
  }
}

// Singleton instance
let defaultGenerator: KnowledgeGraphGenerator | null = null;

/**
 * Get or create the default KnowledgeGraphGenerator instance
 */
export function getKnowledgeGraphGenerator(): KnowledgeGraphGenerator {
  if (!defaultGenerator) {
    defaultGenerator = new KnowledgeGraphGenerator();
  }
  return defaultGenerator;
}

/**
 * Create a new KnowledgeGraphGenerator instance
 */
export function createKnowledgeGraphGenerator(): KnowledgeGraphGenerator {
  return new KnowledgeGraphGenerator();
}
