import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMocks = vi.hoisted(() => ({
  listNotes: vi.fn(),
  listTodos: vi.fn(),
  listMeetings: vi.fn(),
  listEventShells: vi.fn(),
  getEventShell: vi.fn(),
}));

vi.mock('../../db', () => ({
  listNotes: queryMocks.listNotes,
  listTodos: queryMocks.listTodos,
}));

vi.mock('../../meetings/meetingAccess', () => ({
  createMeetingAccess: () => ({
    listMeetings: queryMocks.listMeetings,
  }),
}));

vi.mock('../../calendar/calendarAccess', () => ({
  createCalendarAccess: () => ({
    listEventShells: queryMocks.listEventShells,
    getEventShell: queryMocks.getEventShell,
  }),
}));

import { buildContextGraph } from '../contextGraph';
import { buildMeetingPrepQuery, localContextGraphQuery } from '../contextGraphQuery';

const mockDate = new Date('2026-06-06T10:00:00Z');

function encryptedFields() {
  return {
    ciphertext: 'ciphertext',
    nonce: 'nonce',
    authTag: 'auth-tag',
    version: 1,
  };
}

describe('localContextGraphQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMocks.listNotes.mockResolvedValue([]);
    queryMocks.listTodos.mockResolvedValue([]);
    queryMocks.listMeetings.mockResolvedValue([]);
    queryMocks.listEventShells.mockResolvedValue([]);
    queryMocks.getEventShell.mockResolvedValue(undefined);
  });

  it('builds a context graph from local notes, meetings, and tasks', async () => {
    queryMocks.listNotes.mockResolvedValue([
      {
        id: 'note-1',
        title: 'Launch Notes',
        content: 'Launch checklist and owners.',
        tags: ['launch'],
        createdAt: mockDate,
        updatedAt: mockDate,
        ...encryptedFields(),
      },
    ]);
    queryMocks.listMeetings.mockResolvedValue([
      {
        id: 'meeting-1',
        title: 'Launch Review',
        date: mockDate,
        transcript: 'Alice will send the launch notes.',
        encryptedTranscript: { ciphertext: 'ciphertext', nonce: 'nonce', authTag: 'auth-tag' },
        actionItems: [],
        createdAt: mockDate,
        updatedAt: mockDate,
      },
    ]);
    queryMocks.listTodos.mockResolvedValue([
      {
        id: 'todo-1',
        title: 'Send launch notes',
        status: 'pending',
        priority: 'high',
        sourceType: 'meeting',
        sourceMeetingId: 'meeting-1',
        sourceText: 'Alice will send the launch notes.',
        createdAt: mockDate,
        updatedAt: mockDate,
        ...encryptedFields(),
      },
    ]);

    const baseGraph = buildContextGraph({
      notes: [],
      meetings: [],
      todos: [],
    });

    const graph = await localContextGraphQuery.getContextGraph({ baseGraph });

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'note-1', type: 'note' }),
        expect.objectContaining({ id: 'meeting:meeting-1', type: 'meeting' }),
        expect.objectContaining({ id: 'task:todo-1', type: 'task' }),
      ])
    );
  });

  it('returns source-cited transcript search results through the seam', async () => {
    queryMocks.listMeetings.mockResolvedValue([
      {
        id: 'meeting-1',
        title: 'Launch Review',
        date: mockDate,
        transcript: 'Alice will send the launch notes.',
        encryptedTranscript: { ciphertext: 'ciphertext', nonce: 'nonce', authTag: 'auth-tag' },
        actionItems: [
          {
            text: 'Send the launch notes',
            completed: false,
            provenance: {
              source: {
                type: 'transcript',
                segmentId: 'segment-1',
                startOffset: 0,
                endOffset: 33,
                text: 'Alice will send the launch notes.',
              },
              confidence: 0.93,
              confirmationStatus: 'confirmed',
            },
          },
        ],
        createdAt: mockDate,
        updatedAt: mockDate,
      },
    ]);

    const results = await localContextGraphQuery.searchCitedContext({
      query: 'Alice launch',
      types: ['transcript_segment'],
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: 'transcript_segment',
      citation: {
        type: 'transcript_segment',
        id: 'segment-1',
        href: '/meetings/meeting-1',
        meetingId: 'meeting-1',
        transcriptSegmentId: 'segment-1',
      },
    });
    expect(queryMocks.listNotes).not.toHaveBeenCalled();
    expect(queryMocks.listTodos).not.toHaveBeenCalled();
  });

  it('uses a calendar shell title when loading related meeting context', async () => {
    queryMocks.getEventShell.mockResolvedValue({
      id: 'event-1',
      title: 'Quarterly Roadmap Review',
      startDate: mockDate,
      endDate: mockDate,
      source: 'google',
      externalId: 'google-event-1',
    });
    queryMocks.listNotes.mockResolvedValue([
      {
        id: 'note-1',
        title: 'Quarterly Roadmap Notes',
        content: 'Timeline, launch risks, and dependencies.',
        tags: [],
        createdAt: mockDate,
        updatedAt: mockDate,
        ...encryptedFields(),
      },
    ]);

    const context = await localContextGraphQuery.getRelatedContextForMeeting({
      meetingTitle: 'Team Standup',
      calendarEventId: 'event-1',
      limit: 3,
      types: ['note'],
    });

    expect(buildMeetingPrepQuery('Quarterly Roadmap Review')).toBe('quarterly roadmap review');
    expect(context).toMatchObject({
      source: 'calendar-event',
      calendarEventId: 'event-1',
      query: 'quarterly roadmap review',
    });
    expect(context.results[0]).toMatchObject({
      type: 'note',
      citation: {
        type: 'note',
        id: 'note-1',
      },
    });
  });

  it('returns task provenance from local-only task metadata', async () => {
    queryMocks.listTodos.mockResolvedValue([
      {
        id: 'todo-1',
        title: 'Send launch notes',
        status: 'pending',
        priority: 'high',
        sourceType: 'meeting',
        sourceMeetingId: 'meeting-1',
        sourceTranscriptSegmentId: 'segment-1',
        sourceText: 'Alice will send the launch notes.',
        createdAt: mockDate,
        updatedAt: mockDate,
        ...encryptedFields(),
      },
    ]);

    const provenance = await localContextGraphQuery.getTaskProvenance('todo-1');

    expect(provenance).toMatchObject({
      taskId: 'todo-1',
      citation: {
        type: 'task',
        id: 'todo-1',
        href: '/meetings/meeting-1',
        meetingId: 'meeting-1',
        transcriptSegmentId: 'segment-1',
      },
    });
  });
});
