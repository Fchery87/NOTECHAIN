import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  CalendarEventTranscript,
  type CalendarEventTranscriptProps,
} from '../CalendarEventTranscript';
import type { Meeting } from '../../lib/storage/meetingStorage';

const transcriptMocks = vi.hoisted(() => ({
  getMeetingsByCalendarEvent: vi.fn(),
}));

vi.mock('../../lib/meetings/meetingAccess', () => ({
  createMeetingAccess: vi.fn(() => ({
    getMeetingsByCalendarEvent: transcriptMocks.getMeetingsByCalendarEvent,
  })),
}));

vi.mock('../MeetingTranscriber', () => ({
  MeetingTranscriber: ({
    onSave,
    onCancel,
  }: {
    onSave?: (meeting: Meeting) => void;
    onCancel?: () => void;
  }) => (
    <div data-testid="meeting-transcriber-modal">
      <button onClick={() => onSave?.({ id: 'meeting-123' } as Meeting)}>Save Meeting</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

const mockMeeting: Meeting = {
  id: 'meeting-123',
  title: 'Team Sync Meeting',
  date: new Date('2024-01-15T10:00:00'),
  duration: 1800,
  transcript: 'This is a test transcript that should appear in the preview.',
  encryptedTranscript: {
    ciphertext: 'ciphertext',
    nonce: 'nonce',
    authTag: 'auth-tag',
  },
  actionItems: [{ text: 'Review the proposal', completed: false }],
  calendarEventId: 'calendar-event-456',
  createdAt: new Date('2024-01-15T10:00:00'),
  updatedAt: new Date('2024-01-15T10:30:00'),
};

describe('CalendarEventTranscript', () => {
  const defaultProps: CalendarEventTranscriptProps = {
    eventId: 'calendar-event-456',
    eventTitle: 'Team Sync Meeting',
    eventDate: new Date('2024-01-15T10:00:00'),
    onTranscribe: vi.fn(),
    onViewMeeting: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    transcriptMocks.getMeetingsByCalendarEvent.mockResolvedValue([]);
  });

  test('loads event-linked meetings through meeting access', async () => {
    transcriptMocks.getMeetingsByCalendarEvent.mockResolvedValue([mockMeeting]);
    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/view transcript/i)).toBeInTheDocument();
    });

    expect(transcriptMocks.getMeetingsByCalendarEvent).toHaveBeenCalledWith('calendar-event-456');
  });

  test('opens the transcriber when no meeting exists', async () => {
    const onTranscribe = vi.fn();
    render(<CalendarEventTranscript {...defaultProps} onTranscribe={onTranscribe} />);

    fireEvent.click(await screen.findByRole('button', { name: /transcribe meeting/i }));

    expect(onTranscribe).toHaveBeenCalledWith('calendar-event-456');
    expect(screen.getByTestId('meeting-transcriber-modal')).toBeInTheDocument();
  });

  test('refreshes after saving from the transcriber modal', async () => {
    render(<CalendarEventTranscript {...defaultProps} />);

    fireEvent.click(await screen.findByRole('button', { name: /transcribe meeting/i }));
    fireEvent.click(screen.getByText('Save Meeting'));

    await waitFor(() => {
      expect(transcriptMocks.getMeetingsByCalendarEvent).toHaveBeenCalledTimes(2);
      expect(screen.queryByTestId('meeting-transcriber-modal')).not.toBeInTheDocument();
    });
  });
});
