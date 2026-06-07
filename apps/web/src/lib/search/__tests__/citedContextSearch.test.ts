import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchMocks = vi.hoisted(() => ({
  listNotes: vi.fn(),
  listTodos: vi.fn(),
  getAllMeetings: vi.fn(),
}));

vi.mock('../../db', () => ({
  listNotes: searchMocks.listNotes,
  listTodos: searchMocks.listTodos,
}));

vi.mock('../../storage/meetingStorage', () => ({
  createMeetingStorage: () => ({
    getAllMeetings: searchMocks.getAllMeetings,
  }),
}));

import { searchCitedContext } from '../citedContextSearch';

const mockDate = new Date('2026-06-06T10:00:00Z');

function encryptedFields() {
  return {
    ciphertext: 'ciphertext',
    nonce: 'nonce',
    authTag: 'auth-tag',
    version: 1,
  };
}

describe('searchCitedContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchMocks.listNotes.mockResolvedValue([]);
    searchMocks.listTodos.mockResolvedValue([]);
    searchMocks.getAllMeetings.mockResolvedValue([]);
  });

  it('returns note citations', async () => {
    searchMocks.listNotes.mockResolvedValue([
      {
        id: 'note-1',
        title: 'Launch Plan',
        content: 'Finalize the encrypted launch checklist.',
        tags: ['launch'],
        createdAt: mockDate,
        updatedAt: mockDate,
        ...encryptedFields(),
      },
    ]);

    const results = await searchCitedContext({ query: 'launch', types: ['note'] });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: 'note',
      title: 'Launch Plan',
      citation: {
        type: 'note',
        id: 'note-1',
        href: '/notes/note-1',
      },
    });
  });

  it('returns meeting citations', async () => {
    searchMocks.getAllMeetings.mockResolvedValue([
      {
        id: 'meeting-1',
        title: 'Launch Review',
        date: mockDate,
        transcript: 'The launch review covered encrypted follow-ups.',
        encryptedTranscript: { ciphertext: 'ciphertext', nonce: 'nonce', authTag: 'auth-tag' },
        actionItems: [],
        createdAt: mockDate,
        updatedAt: mockDate,
      },
    ]);

    const results = await searchCitedContext({ query: 'follow-ups', types: ['meeting'] });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: 'meeting',
      citation: {
        type: 'meeting',
        id: 'meeting-1',
        href: '/meetings/meeting-1',
        meetingId: 'meeting-1',
      },
    });
  });

  it('returns transcript segment citations from action item provenance', async () => {
    searchMocks.getAllMeetings.mockResolvedValue([
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

    const results = await searchCitedContext({
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
  });

  it('returns task citations with source meeting and transcript segment metadata', async () => {
    searchMocks.listTodos.mockResolvedValue([
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

    const results = await searchCitedContext({ query: 'launch', types: ['task'] });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: 'task',
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
