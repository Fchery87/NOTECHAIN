import { describe, expect, it } from 'vitest';
import { buildContextGraph, contextGraphNodeIds } from '../contextGraph';
import type { KnowledgeGraph } from '../../ai/notes/types';
import type { EncryptedNote, EncryptedTodo } from '../../db';
import type { Meeting } from '../../storage/meetingStorage';

const mockDate = new Date('2026-06-06T09:00:00Z');

function encryptedFields() {
  return {
    ciphertext: 'ciphertext',
    nonce: 'nonce',
    authTag: 'auth-tag',
    version: 1,
  };
}

function createNote(overrides: Partial<EncryptedNote> = {}): EncryptedNote {
  return {
    id: 'note-1',
    title: 'Launch Notes',
    content: 'Decision notes for launch readiness',
    tags: ['launch'],
    createdAt: mockDate,
    updatedAt: mockDate,
    ...encryptedFields(),
    ...overrides,
  };
}

function createTodo(overrides: Partial<EncryptedTodo> = {}): EncryptedTodo {
  return {
    id: 'todo-1',
    title: 'Send launch notes',
    status: 'pending',
    priority: 'high',
    createdAt: mockDate,
    updatedAt: mockDate,
    ...encryptedFields(),
    ...overrides,
  };
}

function createMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'meeting-1',
    title: 'Launch Review',
    date: mockDate,
    transcript: 'Alice will send the launch notes.',
    encryptedTranscript: {
      ciphertext: 'ciphertext',
      nonce: 'nonce',
      authTag: 'auth-tag',
    },
    actionItems: [
      {
        text: 'Send launch notes',
        completed: false,
        provenance: {
          source: {
            type: 'transcript',
            segmentId: 'segment-1',
            startOffset: 0,
            endOffset: 33,
            text: 'Alice will send the launch notes.',
          },
          confidence: 0.92,
          confirmationStatus: 'confirmed',
        },
      },
    ],
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  };
}

describe('buildContextGraph', () => {
  it('adds typed nodes for notes, meetings, transcript segments, and tasks', () => {
    const graph = buildContextGraph({
      notes: [createNote()],
      meetings: [createMeeting()],
      todos: [
        createTodo({
          sourceType: 'meeting',
          sourceMeetingId: 'meeting-1',
          sourceTranscriptSegmentId: 'segment-1',
          sourceText: 'Alice will send the launch notes.',
        }),
      ],
    });

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'note-1', type: 'note' }),
        expect.objectContaining({ id: contextGraphNodeIds.meeting('meeting-1'), type: 'meeting' }),
        expect.objectContaining({
          id: contextGraphNodeIds.transcriptSegment('meeting-1', 'segment-1'),
          type: 'transcript_segment',
        }),
        expect.objectContaining({ id: contextGraphNodeIds.task('todo-1'), type: 'task' }),
      ])
    );
  });

  it('adds created_from and cites edges from meeting-linked tasks to transcript segments', () => {
    const graph = buildContextGraph({
      meetings: [createMeeting()],
      todos: [
        createTodo({
          sourceType: 'meeting',
          sourceMeetingId: 'meeting-1',
          sourceTranscriptSegmentId: 'segment-1',
          sourceText: 'Alice will send the launch notes.',
        }),
      ],
    });

    const taskId = contextGraphNodeIds.task('todo-1');
    const segmentId = contextGraphNodeIds.transcriptSegment('meeting-1', 'segment-1');

    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: taskId, target: segmentId, type: 'created_from' }),
        expect.objectContaining({ source: taskId, target: segmentId, type: 'cites' }),
      ])
    );
  });

  it('adds created_from edges from note-linked tasks to notes', () => {
    const graph = buildContextGraph({
      notes: [createNote()],
      todos: [createTodo({ sourceType: 'note', linkedNoteId: 'note-1' })],
    });

    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: contextGraphNodeIds.task('todo-1'),
          target: 'note-1',
          type: 'created_from',
        }),
      ])
    );
  });

  it('preserves existing base graph nodes and edges', () => {
    const baseGraph: KnowledgeGraph = {
      nodes: [
        {
          id: 'base-note',
          label: 'Base Note',
          type: 'note',
          size: 20,
          color: '#57534e',
          metadata: { wordCount: 10, createdAt: mockDate, tagCount: 0, backlinkCount: 0 },
        },
      ],
      edges: [{ source: 'base-note', target: 'tag-work', type: 'tag', weight: 0.4 }],
      clusters: [],
    };

    const graph = buildContextGraph({ baseGraph, notes: [createNote()] });

    expect(graph.nodes.some(node => node.id === 'base-note')).toBe(true);
    expect(graph.edges.some(edge => edge.source === 'base-note' && edge.type === 'tag')).toBe(true);
  });
});
