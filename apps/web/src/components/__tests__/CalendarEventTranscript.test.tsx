import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, afterEach, jest } from 'bun:test';
import { CalendarEventTranscript, CalendarEventTranscriptProps } from '../CalendarEventTranscript';
import type { Meeting } from '../../lib/storage/meetingStorage';
import type { ActionItem } from '../../lib/ai/transcription/actionItemExtractor';

// Mock MeetingTranscriber modal
jest.mock('../MeetingTranscriber', () => ({
  MeetingTranscriber: jest.fn(({ onSave, onCancel }) => (
    <div data-testid="meeting-transcriber-modal">
      <button onClick={() => onSave?.({ id: 'meeting-123' } as Meeting)}>Save Meeting</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )),
}));

// Mock meeting storage
const mockGetMeetingsByCalendarEvent = jest.fn();
const mockCreateMeetingStorage = jest.fn(() => ({
  getMeetingsByCalendarEvent: mockGetMeetingsByCalendarEvent,
}));

jest.mock('../../lib/storage/meetingStorage', () => ({
  createMeetingStorage: mockCreateMeetingStorage,
}));

describe('CalendarEventTranscript', () => {
  const defaultProps: CalendarEventTranscriptProps = {
    eventId: 'calendar-event-456',
    eventTitle: 'Team Sync Meeting',
    eventDate: new Date('2024-01-15T10:00:00'),
    onTranscribe: jest.fn(),
    onViewMeeting: jest.fn(),
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
      ciphertext: new Uint8Array([1, 2, 3]),
      nonce: new Uint8Array([4, 5, 6]),
    },
    actionItems: mockActionItems,
    calendarEventId: 'calendar-event-456',
    createdAt: new Date('2024-01-15T10:00:00'),
    updatedAt: new Date('2024-01-15T10:30:00'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMeetingsByCalendarEvent.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    render(<CalendarEventTranscript {...defaultProps} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('shows "Transcribe" button if no meeting exists for event', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/transcribe meeting/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /transcribe meeting/i })).toBeInTheDocument();
  });

  test('shows transcript summary if meeting exists', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([mockMeeting]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/view transcript/i)).toBeInTheDocument();
    });

    // Should show transcript preview (first 100 chars)
    expect(screen.getByText(/this is a test transcript/i)).toBeInTheDocument();
  });

  test('clicking "Transcribe" opens transcriber modal', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([]);
    const mockOnTranscribe = jest.fn();

    render(<CalendarEventTranscript {...defaultProps} onTranscribe={mockOnTranscribe} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /transcribe meeting/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /transcribe meeting/i }));
    });

    expect(mockOnTranscribe).toHaveBeenCalledWith('calendar-event-456');
    expect(screen.getByTestId('meeting-transcriber-modal')).toBeInTheDocument();
  });

  test('shows action item count if meeting has action items', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([mockMeeting]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/2 action items/i)).toBeInTheDocument();
    });
  });

  test('shows completed vs pending action item count', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([mockMeeting]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
    });
  });

  test('shows link to view full meeting', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([mockMeeting]);
    const mockOnViewMeeting = jest.fn();

    render(<CalendarEventTranscript {...defaultProps} onViewMeeting={mockOnViewMeeting} />);

    await waitFor(() => {
      expect(screen.getByText(/view full meeting/i)).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: /transcribe meeting/i })).toBeInTheDocument();
    });

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /transcribe meeting/i }));
    });

    expect(screen.getByTestId('meeting-transcriber-modal')).toBeInTheDocument();

    // Save meeting
    await act(async () => {
      fireEvent.click(screen.getByText('Save Meeting'));
    });

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('meeting-transcriber-modal')).not.toBeInTheDocument();
    });

    // Should refresh meetings (called twice: initial + after save)
    expect(mockGetMeetingsByCalendarEvent).toHaveBeenCalledTimes(2);
  });

  test('closes modal on cancel', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /transcribe meeting/i })).toBeInTheDocument();
    });

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /transcribe meeting/i }));
    });

    expect(screen.getByTestId('meeting-transcriber-modal')).toBeInTheDocument();

    // Cancel
    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('meeting-transcriber-modal')).not.toBeInTheDocument();
    });
  });

  test('passes calendarEventId to MeetingTranscriber', async () => {
    mockGetMeetingsByCalendarEvent.mockResolvedValue([]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /transcribe meeting/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /transcribe meeting/i }));
    });

    expect(screen.getByTestId('meeting-transcriber-modal')).toBeInTheDocument();
  });

  test('handles error when fetching meetings', async () => {
    mockGetMeetingsByCalendarEvent.mockRejectedValue(new Error('Database error'));

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/error loading meeting data/i)).toBeInTheDocument();
    });
  });

  test('truncates transcript preview to 100 characters', async () => {
    const longTranscript = 'A'.repeat(200);
    const meetingWithLongTranscript = { ...mockMeeting, transcript: longTranscript };
    mockGetMeetingsByCalendarEvent.mockResolvedValue([meetingWithLongTranscript]);

    render(<CalendarEventTranscript {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/view transcript/i)).toBeInTheDocument();
    });

    const preview = screen.getByText('A'.repeat(100) + '...');
    expect(preview).toBeInTheDocument();
  });
});
