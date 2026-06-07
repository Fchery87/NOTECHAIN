import type { KnowledgeGraph, KnowledgeGraphEdge, KnowledgeGraphNode } from '../ai/notes/types';
import type { EncryptedNote, EncryptedTodo } from '../db';
import type { Meeting } from '../storage/meetingStorage';

export interface BuildContextGraphInput {
  baseGraph?: KnowledgeGraph;
  notes?: EncryptedNote[];
  meetings?: Meeting[];
  todos?: EncryptedTodo[];
}

const NODE_COLORS = {
  note: '#57534e',
  meeting: '#f43f5e',
  transcriptSegment: '#fed7aa',
  task: '#0f766e',
} as const;

function noteNodeId(noteId: string): string {
  return noteId;
}

function meetingNodeId(meetingId: string): string {
  return `meeting:${meetingId}`;
}

function transcriptSegmentNodeId(meetingId: string, segmentId: string): string {
  return `transcript-segment:${meetingId}:${segmentId}`;
}

function taskNodeId(todoId: string): string {
  return `task:${todoId}`;
}

function truncateLabel(value: string, maxLength: number = 34): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function wordCount(value: string | undefined): number {
  return (value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function baseMetadata(createdAt: Date) {
  return {
    wordCount: 0,
    createdAt,
    tagCount: 0,
    backlinkCount: 0,
  };
}

function edgeKey(edge: Pick<KnowledgeGraphEdge, 'source' | 'target' | 'type'>): string {
  return `${edge.type}:${edge.source}->${edge.target}`;
}

function addNode(nodes: KnowledgeGraphNode[], nodeIds: Set<string>, node: KnowledgeGraphNode) {
  if (nodeIds.has(node.id)) return;
  nodes.push(node);
  nodeIds.add(node.id);
}

function addEdge(edges: KnowledgeGraphEdge[], edgeKeys: Set<string>, edge: KnowledgeGraphEdge) {
  const key = edgeKey(edge);
  if (edgeKeys.has(key)) return;
  edges.push(edge);
  edgeKeys.add(key);
}

function addTranscriptSegmentNode(
  nodes: KnowledgeGraphNode[],
  nodeIds: Set<string>,
  meetingId: string,
  segmentId: string,
  text: string,
  createdAt: Date,
  confidence?: number
): string {
  const id = transcriptSegmentNodeId(meetingId, segmentId);
  addNode(nodes, nodeIds, {
    id,
    label: truncateLabel(text || 'Transcript segment'),
    type: 'transcript_segment',
    size: Math.min(44, 16 + wordCount(text)),
    color: NODE_COLORS.transcriptSegment,
    metadata: {
      ...baseMetadata(createdAt),
      wordCount: wordCount(text),
      sourceId: segmentId,
      sourceType: 'transcript',
      confidence,
      excerpt: text,
    },
  });
  return id;
}

export function buildContextGraph({
  baseGraph,
  notes = [],
  meetings = [],
  todos = [],
}: BuildContextGraphInput): KnowledgeGraph {
  const nodes = [...(baseGraph?.nodes ?? [])];
  const edges = [...(baseGraph?.edges ?? [])];
  const nodeIds = new Set(nodes.map(node => node.id));
  const edgeKeys = new Set(edges.map(edgeKey));

  for (const note of notes) {
    if (!note.id) continue;

    addNode(nodes, nodeIds, {
      id: noteNodeId(note.id),
      label: truncateLabel(note.title || 'Untitled note'),
      type: 'note',
      size: Math.min(40, 16 + (note.tags?.length ?? 0) * 4),
      color: NODE_COLORS.note,
      metadata: {
        ...baseMetadata(note.createdAt),
        wordCount: wordCount(note.content),
        tagCount: note.tags?.length ?? 0,
        sourceId: note.id,
        sourceType: 'note',
      },
    });
  }

  for (const meeting of meetings) {
    const meetingId = meetingNodeId(meeting.id);
    addNode(nodes, nodeIds, {
      id: meetingId,
      label: truncateLabel(meeting.title || 'Untitled meeting'),
      type: 'meeting',
      size: Math.min(52, 20 + meeting.actionItems.length * 4),
      color: NODE_COLORS.meeting,
      metadata: {
        ...baseMetadata(meeting.createdAt),
        wordCount: wordCount(meeting.transcript),
        sourceId: meeting.id,
        sourceType: 'meeting',
      },
    });

    for (const actionItem of meeting.actionItems) {
      const source = actionItem.provenance?.source;
      if (!source) continue;

      const segmentId = addTranscriptSegmentNode(
        nodes,
        nodeIds,
        meeting.id,
        source.segmentId,
        source.text,
        meeting.createdAt,
        actionItem.provenance?.confidence
      );

      addEdge(edges, edgeKeys, {
        source: segmentId,
        target: meetingId,
        type: 'created_from',
        weight: 0.8,
        label: 'created from meeting transcript',
      });
    }
  }

  for (const todo of todos) {
    if (!todo.id) continue;

    const taskId = taskNodeId(todo.id);
    addNode(nodes, nodeIds, {
      id: taskId,
      label: truncateLabel(todo.title || 'Untitled task'),
      type: 'task',
      size: todo.priority === 'high' ? 34 : 28,
      color: NODE_COLORS.task,
      metadata: {
        ...baseMetadata(todo.createdAt),
        sourceId: todo.id,
        sourceType: 'task',
        status: todo.status,
        priority: todo.priority,
        excerpt: todo.sourceText ?? todo.description,
      },
    });

    if (todo.sourceType === 'meeting' && todo.sourceMeetingId) {
      const meetingId = meetingNodeId(todo.sourceMeetingId);
      let sourceTargetId = meetingId;

      if (todo.sourceTranscriptSegmentId) {
        sourceTargetId = addTranscriptSegmentNode(
          nodes,
          nodeIds,
          todo.sourceMeetingId,
          todo.sourceTranscriptSegmentId,
          todo.sourceText ?? todo.title,
          todo.createdAt
        );
      }

      addEdge(edges, edgeKeys, {
        source: taskId,
        target: sourceTargetId,
        type: 'created_from',
        weight: 1,
        label: 'created from',
      });

      if (sourceTargetId !== meetingId) {
        addEdge(edges, edgeKeys, {
          source: taskId,
          target: sourceTargetId,
          type: 'cites',
          weight: 0.9,
          label: 'cites transcript',
        });
      }

      if (nodeIds.has(meetingId) && sourceTargetId !== meetingId) {
        addEdge(edges, edgeKeys, {
          source: sourceTargetId,
          target: meetingId,
          type: 'created_from',
          weight: 0.8,
          label: 'created from meeting transcript',
        });
      }
    }

    if (todo.linkedNoteId) {
      addEdge(edges, edgeKeys, {
        source: taskId,
        target: noteNodeId(todo.linkedNoteId),
        type: 'created_from',
        weight: 0.8,
        label: 'created from note',
      });
    }
  }

  return {
    nodes,
    edges,
    clusters: baseGraph?.clusters ?? [],
  };
}

export const contextGraphNodeIds = {
  note: noteNodeId,
  meeting: meetingNodeId,
  transcriptSegment: transcriptSegmentNodeId,
  task: taskNodeId,
};
