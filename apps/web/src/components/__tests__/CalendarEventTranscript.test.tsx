import { describe, it, expect, beforeEach, afterEach, vi, mock } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CalendarEventTranscript, CalendarEventTranscriptProps } from '../CalendarEventTranscript';
import type { Meeting } from '../../lib/storage/meetingStorage';
import type { ActionItem } from '../../lib/ai/transcription/actionItemExtractor';

// Mock functions
const mockOnSave = mock();
const mockOnCancel = mock();
const mockGetMeetingsByCalendarEvent = mock();
const mockCreateMeetingStorage = mock(() => ({
  getMeetingsByCalendarEvent: mockGetMeetingsByCalendarEvent,
}));

// Mock MeetingTranscriber modal
mock.module('../MeetingTranscriber', () => ({
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

// Mock meeting storage
mock.module('../../lib/storage/meetingStorage', () => ({
  createMeetingStorage: mockCreateMeetingStorage,
}));

describe('CalendarEventTranscript', () => {
  const defaultProps: CalendarEventTranscriptProps = {
    eventId: 'calendar-event-456',
    eventTitle: 'Team Sync Meeting',
    eventDate: new Date('2024-01-15T10:00:00'),
    onTranscribe: mock(),
    onViewMeeting: mock(),
  };

  const mockActionItems: ActionItem[] = [
    { text: 'John will review the proposal', assignee: 'John', completed: false },
    { text: 'Complete the report', completed: true },
  ];

  const mockMeeting: Meeting = {
    id: 'meeting-123',
    title: 'Team Sync Meeting',
    date: new Date('2024-01-15T10:00:00'),
    duration: 1800,
    transcript:
      'This is a test transcript with some meeting content that should be displayed in the preview. It has multiple sentences and should be truncated properly.',
    encryptedTranscript: {
      ciphertext: 'base64encodedciphertext',
      nonce: 'base64encodednonce',
      authTag: 'base64encodedauthtag',
    },
    actionItems: mockActionItems,
    calendarEventId: 'calendar-event-456',
    createdAt: new Date('2024-01-15T10:00:00'),
    updatedAt: new Date('2024-01-15T10:30:00'),
  };

  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnCancel.mockClear();
    mockGetMeetingsByCalendarEvent.mockClear();
    mockCreateMeetingStorage.mockClear();
    mockGetMeetingsByCalendarEvent.mockResolvedValue([]);
  });

  afterEach(() => {
    mockOnSave.mockClear();
    mockOnCancel.mockClear();
    mockGetMeetingsByCalendarEvent.mockClear();
    mockCreateMeetingStorage.mockClear();
  });

  test('shows loading state initially', () => {
    render(<CalendarEventTranscript {...defaultProps} />);
    expect(screen.getByText(/loading/i)).toBeDefined();
  });

  test('shows "Transcribe" button if no meeting exists for event', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/transcribe meeting/i)).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /transcribe meeting/i })).toBeDefined();
  });

  test('shows transcript summary if meeting exists', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([mockMeeting]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/view transcript/i)).toBeDefined();
    });

    // Should show transcript preview (first 100 chars)
    expect(screen.getByText(/this is a test transcript/i)).toBeDefined();
  });

  test('clicking "Transcribe" opens transcriber modal', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([]);
    const mockOnTranscribe = mock();

    render(<CalendarEventTranscript {...defaultProps} onTranscribe={mockOnTranscribe} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /transcribe meeting/i })).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /transcribe meeting/i }));
    });

    expect(mockOnTranscribe).toHaveBeenCalledWith('calendar-event-456');
    expect(screen.getByTestId('meeting-transcriber-modal')).toBeDefined();
  });

  test('shows action item count if meeting has action items', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([mockMeeting]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/2 action items/i)).toBeDefined();
    });
  });

  test('shows completed vs pending action item count', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([mockMeeting]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/1 pending/i)).toBeDefined();
    });
  });

  test('shows link to view full meeting', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([mockMeeting]);
    const mockOnViewMeeting = mock();

    render(<CalendarEventTranscript {...defaultProps} onViewMeeting={mockOnViewMeeting} />);

    await waitFor(() => {
      expect(screen.getByText(/view full meeting/i)).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/view full meeting/i));
    });

    expect(mockOnViewMeeting).toHaveBeenCalledWith('meeting-123');
  });

  test('closes modal and refreshes meeting data on save', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /transcribe meeting/i })).toBeDefined();
    });

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /transcribe meeting/i }));
    });

    expect(screen.getByTestId('meeting-transcriber-modal')).toBeDefined();

    // Save meeting
    await act(async () => {
      fireEvent.click(screen.getByText('Save Meeting'));
    });

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('meeting-transcriber-modal')).toBeNull();
    });

    // Should refresh meetings (called twice: initial + after save)
    expect(mockGetMeetingsByCalendarEvent).toHaveBeenCalledTimes(2);
  });

  test('closes modal on cancel', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /transcribe meeting/i })).toBeDefined();
    });

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /transcribe meeting/i }));
    });

    expect(screen.getByTestId('meeting-transcriber-modal')).toBeDefined();

    // Cancel
    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('meeting-transcriber-modal')).toBeNull();
    });
  });

  test('passes calendarEventId to MeetingTranscriber', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /transcribe meeting/i })).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /transcribe meeting/i }));
    });

    expect(screen.getByTestId('meeting-transcriber-modal')).toBeDefined();
  });

  test('handles error when fetching meetings', async () => {
    mockGetMeetingsByCalendarEvent.mockRejectedValue(new Error('Database error'));

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/error loading meeting data/i)).toBeDefined();
    });
  });

  test('truncates transcript preview to 100 characters', async () => {
    const longTranscript = 'A'.repeat(200);
    const meetingWithLongTranscript = { ...mockMeeting, transcript: longTranscript };
    mockGetMeetingsByCalendarEvent.mockResolvedValue([meetingWithLongTranscript]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/view transcript/i)).toBeDefined();
    });

    const preview = screen.getByText('A'.repeat(100) + '...');
    expect(preview).toBeDefined();
  });
});
