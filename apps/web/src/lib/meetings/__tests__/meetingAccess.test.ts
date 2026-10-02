import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMeetingAccess } from '../meetingAccess';

const meetingAccessMocks = vi.hoisted(() => ({
  getAllMeetings: vi.fn(),
  getMeeting: vi.fn(),
  saveMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
  getMeetingsByCalendarEvent: vi.fn(),
  getMeetingEncryptionKey: vi.fn(),
  createTask: vi.fn(),
  getMeetingPrepContext: vi.fn(),
}));

vi.mock('../../storage/meetingStorage', () => ({
  createMeetingStorage: () => ({
    getAllMeetings: meetingAccessMocks.getAllMeetings,
    getMeeting: meetingAccessMocks.getMeeting,
    saveMeeting: meetingAccessMocks.saveMeeting,
    updateMeeting: meetingAccessMocks.updateMeeting,
    deleteMeeting: meetingAccessMocks.deleteMeeting,
    getMeetingsByCalendarEvent: meetingAccessMocks.getMeetingsByCalendarEvent,
  }),
}));

vi.mock('../../storage/meetingEncryptionKey', () => ({
  getMeetingEncryptionKey: meetingAccessMocks.getMeetingEncryptionKey,
}));

vi.mock('../../tasks/taskAdapter', () => ({
  localTaskAdapter: {
    createTask: meetingAccessMocks.createTask,
  },
}));

vi.mock('../meetingPrepContext', () => ({
  getMeetingPrepContext: meetingAccessMocks.getMeetingPrepContext,
}));

describe('meetingAccess', () => {
  const meetingKey = new Uint8Array([1, 2, 3]);
  const access = createMeetingAccess();

  beforeEach(() => {
    vi.clearAllMocks();
    meetingAccessMocks.getMeetingEncryptionKey.mockResolvedValue(meetingKey);
  });

  it('lists meetings via encrypted storage', async () => {
    meetingAccessMocks.getAllMeetings.mockResolvedValue([{ id: 'meeting-1' }]);

    await expect(access.listMeetings()).resolves.toEqual([{ id: 'meeting-1' }]);
    expect(meetingAccessMocks.getMeetingEncryptionKey).toHaveBeenCalled();
    expect(meetingAccessMocks.getAllMeetings).toHaveBeenCalledWith(meetingKey);
  });

  it('surfaces vault recovery errors instead of creating a master key implicitly', async () => {
    meetingAccessMocks.getMeetingEncryptionKey.mockRejectedValue(
      new Error(
        'No local encryption key was found for this existing encrypted vault. Enter your recovery key or start a new vault.'
      )
    );

    await expect(access.listMeetings()).rejects.toThrow(
      'No local encryption key was found for this existing encrypted vault. Enter your recovery key or start a new vault.'
    );
    expect(meetingAccessMocks.getAllMeetings).not.toHaveBeenCalled();
  });

  it('promotes an action item to a task with meeting provenance', async () => {
    meetingAccessMocks.getMeeting.mockResolvedValue({
      id: 'meeting-1',
      title: 'Launch Review',
      actionItems: [
        {
          text: 'Send launch notes',
          completed: false,
          provenance: {
            source: {
              type: 'transcript',
              segmentId: 'segment-1',
              startOffset: 0,
              endOffset: 17,
              text: 'Send launch notes',
            },
            confidence: 0.92,
            confirmationStatus: 'confirmed',
          },
        },
      ],
    });
    meetingAccessMocks.createTask.mockResolvedValue({ id: 'task-1' });

    await expect(
      access.promoteActionItemToTask({ meetingId: 'meeting-1', actionItemIndex: 0 })
    ).resolves.toEqual({ id: 'task-1' });

    expect(meetingAccessMocks.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Send launch notes',
        sourceType: 'meeting',
        sourceMeetingId: 'meeting-1',
        sourceTranscriptSegmentId: 'segment-1',
      })
    );
  });
});
