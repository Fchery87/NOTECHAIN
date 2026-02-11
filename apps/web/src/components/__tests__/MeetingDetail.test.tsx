import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, afterEach, jest } from 'bun:test';
import { MeetingDetail, MeetingDetailProps } from '../MeetingDetail';
import type { Meeting } from '../../lib/storage/meetingStorage';

// Mock meeting storage
const mockGetMeeting = jest.fn();
const mockUpdateMeeting = jest.fn();
const mockDeleteMeeting = jest.fn();

jest.mock('../../lib/storage/meetingStorage', () => ({
  MeetingStorage: jest.fn().mockImplementation(() => ({
    getMeeting: mockGetMeeting,
    updateMeeting: mockUpdateMeeting,
    deleteMeeting: mockDeleteMeeting,
  })),
  createMeetingStorage: jest.fn(() => ({
    getMeeting: mockGetMeeting,
    updateMeeting: mockUpdateMeeting,
    deleteMeeting: mockDeleteMeeting,
  })),
}));

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: mockConfirm,
});

describe('MeetingDetail', () => {
  const defaultProps: MeetingDetailProps = {
    meetingId: 'meeting-1',
    onBack: jest.fn(),
    onDelete: jest.fn(),
  };

  const mockMeeting: Meeting = {
    id: 'meeting-1',
    title: 'Weekly Team Sync',
    date: new Date('2024-01-15T10:00:00'),
    duration: 3600,
    transcript:
      'This is the transcript for the weekly team sync meeting. We discussed Q4 goals and reviewed the current sprint progress.',
    encryptedTranscript: {
      ciphertext: new Uint8Array([1, 2, 3]),
      nonce: new Uint8Array([4, 5, 6]),
    },
    actionItems: [
      { text: 'Review Q4 goals', completed: false },
      { text: 'Update documentation', completed: true },
      {
        text: 'Schedule follow-up meeting',
        completed: false,
        assignee: 'Alice',
        deadline: 'tomorrow',
        priority: 'high',
      },
    ],
    createdAt: new Date('2024-01-15T10:00:00'),
    updatedAt: new Date('2024-01-15T11:00:00'),
  };

  const mockMeetingWithCalendar: Meeting = {
    ...mockMeeting,
    id: 'meeting-2',
    title: 'Product Planning',
    calendarEventId: 'cal-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMeeting.mockResolvedValue(mockMeeting);
    mockConfirm.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('component renders loading state initially', () => {
    mockGetMeeting.mockImplementation(() => new Promise(() => {}));

    render(<MeetingDetail {...defaultProps} />);

    expect(screen.getByTestId('meeting-detail-loading')).toBeInTheDocument();
  });

  test('displays meeting details when loaded', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
      expect(screen.getByText('60 min')).toBeInTheDocument();
      expect(
        screen.getByText(/This is the transcript for the weekly team sync/i)
      ).toBeInTheDocument();
    });
  });

  test('shows editable title', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      const titleElement = screen.getByTestId('meeting-title');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent('Weekly Team Sync');
    });
  });

  test('shows date and duration', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('60 min')).toBeInTheDocument();
    });
  });

  test('shows full transcript in scrollable area', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      const transcriptElement = screen.getByTestId('meeting-transcript');
      expect(transcriptElement).toBeInTheDocument();
      expect(transcriptElement).toHaveTextContent(
        /This is the transcript for the weekly team sync/i
      );
    });
  });

  test('shows action items with checkboxes', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Review Q4 goals')).toBeInTheDocument();
      expect(screen.getByText('Update documentation')).toBeInTheDocument();
      expect(screen.getByText('Schedule follow-up meeting')).toBeInTheDocument();
    });

    // Check for checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);
  });

  test('edit title saves on blur', async () => {
    mockUpdateMeeting.mockResolvedValue({ ...mockMeeting, title: 'Updated Meeting Title' });

    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('meeting-title')).toBeInTheDocument();
    });

    // Click to edit
    const titleElement = screen.getByTestId('meeting-title');
    await act(async () => {
      fireEvent.click(titleElement);
    });

    // Type new title
    const input = screen.getByTestId('meeting-title-input');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Updated Meeting Title' } });
      fireEvent.blur(input);
    });

    await waitFor(() => {
      expect(mockUpdateMeeting).toHaveBeenCalledWith(
        'meeting-1',
        { title: 'Updated Meeting Title' },
        expect.any(Uint8Array)
      );
    });
  });

  test('export transcript button exists', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('export-transcript-button')).toBeInTheDocument();
    });
  });

  test('copy to clipboard button exists', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('copy-transcript-button')).toBeInTheDocument();
    });
  });

  test('back button calls onBack', async () => {
    const mockOnBack = jest.fn();

    await act(async () => {
      render(<MeetingDetail {...defaultProps} onBack={mockOnBack} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });

    const backButton = screen.getByTestId('back-button');
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  test('delete button calls onDelete', async () => {
    const mockOnDelete = jest.fn();
    mockDeleteMeeting.mockResolvedValue(undefined);

    await act(async () => {
      render(<MeetingDetail {...defaultProps} onDelete={mockOnDelete} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('delete-meeting-button')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('delete-meeting-button');
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(mockConfirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('meeting-1');
    });
  });

  test('calendar link shown if calendarEventId exists', async () => {
    mockGetMeeting.mockResolvedValue(mockMeetingWithCalendar);

    await act(async () => {
      render(<MeetingDetail {...defaultProps} meetingId="meeting-2" />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('calendar-link')).toBeInTheDocument();
    });
  });

  test('calendar link not shown if no calendarEventId', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('calendar-link')).not.toBeInTheDocument();
  });

  test('shows not found state when meeting does not exist', async () => {
    mockGetMeeting.mockResolvedValue(null);

    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('meeting-not-found')).toBeInTheDocument();
    });
  });

  test('toggle action item checkbox', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Review Q4 goals')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];

    // Toggle the checkbox
    fireEvent.click(firstCheckbox);

    await waitFor(() => {
      expect(mockUpdateMeeting).toHaveBeenCalled();
    });
  });

  test('action item with assignee shows assignee badge', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  test('action item with deadline shows deadline', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('tomorrow')).toBeInTheDocument();
    });
  });

  test('action item with priority shows priority badge', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('high')).toBeInTheDocument();
    });
  });

  test('completed action item has strikethrough', async () => {
    await act(async () => {
      render(<MeetingDetail {...defaultProps} />);
    });

    await waitFor(() => {
      const completedItem = screen.getByText('Update documentation');
      expect(completedItem).toHaveClass('line-through');
    });
  });

  test('delete button does not call onDelete if cancelled', async () => {
    const mockOnDelete = jest.fn();
    mockConfirm.mockReturnValue(false);

    await act(async () => {
      render(<MeetingDetail {...defaultProps} onDelete={mockOnDelete} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('delete-meeting-button')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('delete-meeting-button');
    fireEvent.click(deleteButton);

    expect(mockConfirm).toHaveBeenCalled();
    expect(mockOnDelete).not.toHaveBeenCalled();
  });
});
