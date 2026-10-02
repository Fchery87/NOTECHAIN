import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Meeting } from '../../lib/storage/meetingStorage';
import type { MeetingDetailProps } from '../MeetingDetail';

const meetingDetailMocks = vi.hoisted(() => ({
  getMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
  getPrepContext: vi.fn(),
  promoteActionItemToTask: vi.fn(),
}));

vi.mock('../../lib/meetings/meetingAccess', () => ({
  createMeetingAccess: vi.fn(() => ({
    getMeeting: meetingDetailMocks.getMeeting,
    updateMeeting: meetingDetailMocks.updateMeeting,
    deleteMeeting: meetingDetailMocks.deleteMeeting,
    getPrepContext: meetingDetailMocks.getPrepContext,
    promoteActionItemToTask: meetingDetailMocks.promoteActionItemToTask,
  })),
}));

import { MeetingDetail } from '../MeetingDetail';

const mockConfirm = vi.fn();
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: mockConfirm,
});

const mockMeeting: Meeting = {
  id: 'meeting-1',
  title: 'Weekly Team Sync',
  date: new Date('2024-01-15T10:00:00'),
  duration: 3600,
  transcript: 'Transcript body',
  encryptedTranscript: {
    ciphertext: new Uint8Array([1, 2, 3]),
    nonce: new Uint8Array([4, 5, 6]),
  },
  actionItems: [
    { text: 'Review Q4 goals', completed: false },
    { text: 'Update documentation', completed: true },
  ],
  createdAt: new Date('2024-01-15T10:00:00'),
  updatedAt: new Date('2024-01-15T11:00:00'),
};

describe('MeetingDetail', () => {
  const defaultProps: MeetingDetailProps = {
    meetingId: 'meeting-1',
    onBack: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    meetingDetailMocks.getMeeting.mockResolvedValue(mockMeeting);
    meetingDetailMocks.getPrepContext.mockResolvedValue({
      source: 'manual',
      query: 'weekly team',
      relatedNotes: [],
    });
    meetingDetailMocks.promoteActionItemToTask.mockResolvedValue({ id: 'task-1' });
    meetingDetailMocks.updateMeeting.mockResolvedValue(mockMeeting);
  });

  test('loads the meeting through meeting access', async () => {
    render(<MeetingDetail {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
      expect(meetingDetailMocks.getMeeting).toHaveBeenCalledWith('meeting-1');
    });

    await waitFor(() => {
      expect(meetingDetailMocks.getPrepContext).toHaveBeenCalledWith({
        meetingTitle: 'Weekly Team Sync',
        calendarEventId: undefined,
      });
    });
  });

  test('saves title edits through meeting access', async () => {
    meetingDetailMocks.updateMeeting.mockResolvedValue({
      ...mockMeeting,
      title: 'Updated Meeting Title',
    });

    render(<MeetingDetail {...defaultProps} />);

    const title = await screen.findByTestId('meeting-title');
    fireEvent.click(title);

    const input = screen.getByTestId('meeting-title-input');
    fireEvent.change(input, { target: { value: 'Updated Meeting Title' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(meetingDetailMocks.updateMeeting).toHaveBeenCalledWith('meeting-1', {
        title: 'Updated Meeting Title',
      });
    });
  });

  test('promotes an action item to a task through meeting access', async () => {
    render(<MeetingDetail {...defaultProps} />);

    const createTaskButton = (await screen.findAllByRole('button', { name: /create task/i }))[0];
    fireEvent.click(createTaskButton);

    await waitFor(() => {
      expect(meetingDetailMocks.promoteActionItemToTask).toHaveBeenCalledWith({
        meetingId: 'meeting-1',
        actionItemIndex: 0,
      });
    });
  });

  test('deletes the meeting through meeting access', async () => {
    const onDelete = vi.fn();
    render(<MeetingDetail {...defaultProps} onDelete={onDelete} />);

    fireEvent.click(await screen.findByTestId('delete-meeting-button'));

    await waitFor(() => {
      expect(meetingDetailMocks.deleteMeeting).toHaveBeenCalledWith('meeting-1');
      expect(onDelete).toHaveBeenCalledWith('meeting-1');
    });
  });
});
