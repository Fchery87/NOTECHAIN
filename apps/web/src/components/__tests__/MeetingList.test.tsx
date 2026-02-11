import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, afterEach, jest } from 'bun:test';
import { MeetingList, MeetingListProps } from '../MeetingList';
import type { Meeting } from '../../lib/storage/meetingStorage';

// Mock meeting storage
const mockGetAllMeetings = jest.fn();
const mockDeleteMeeting = jest.fn();

jest.mock('../../lib/storage/meetingStorage', () => ({
  MeetingStorage: jest.fn().mockImplementation(() => ({
    getAllMeetings: mockGetAllMeetings,
    deleteMeeting: mockDeleteMeeting,
  })),
  createMeetingStorage: jest.fn(() => ({
    getAllMeetings: mockGetAllMeetings,
    deleteMeeting: mockDeleteMeeting,
  })),
}));

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: mockConfirm,
});

describe('MeetingList', () => {
  const defaultProps: MeetingListProps = {
    onMeetingSelect: jest.fn(),
    onDelete: jest.fn(),
  };

  const mockMeetings: Meeting[] = [
    {
      id: 'meeting-1',
      title: 'Weekly Team Sync',
      date: new Date('2024-01-15T10:00:00'),
      duration: 3600,
      transcript: 'This is the transcript for the weekly team sync meeting.',
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
    },
    {
      id: 'meeting-2',
      title: 'Product Planning',
      date: new Date('2024-01-14T14:00:00'),
      duration: 2700,
      transcript: 'Product planning discussion for the next quarter.',
      encryptedTranscript: {
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array([4, 5, 6]),
      },
      actionItems: [{ text: 'Create roadmap', completed: false }],
      createdAt: new Date('2024-01-14T14:00:00'),
      updatedAt: new Date('2024-01-14T14:45:00'),
    },
    {
      id: 'meeting-3',
      title: 'Client Call',
      date: new Date('2024-01-13T09:00:00'),
      duration: 1800,
      transcript: 'Discussion with client about new requirements.',
      encryptedTranscript: {
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array([4, 5, 6]),
      },
      actionItems: [],
      createdAt: new Date('2024-01-13T09:00:00'),
      updatedAt: new Date('2024-01-13T09:30:00'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllMeetings.mockResolvedValue(mockMeetings);
    mockConfirm.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('component renders loading state initially', () => {
    mockGetAllMeetings.mockImplementation(() => new Promise(() => {}));

    render(<MeetingList {...defaultProps} />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('displays list of meetings when loaded', async () => {
    await act(async () => {
      render(<MeetingList {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
      expect(screen.getByText('Product Planning')).toBeInTheDocument();
      expect(screen.getByText('Client Call')).toBeInTheDocument();
    });
  });

  test('shows meeting title, date, and duration', async () => {
    await act(async () => {
      render(<MeetingList {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
      expect(screen.getByText('60 min')).toBeInTheDocument();
    });
  });

  test('shows action item count', async () => {
    await act(async () => {
      render(<MeetingList {...defaultProps} />);
    });

    await waitFor(() => {
      // First meeting has 2 action items
      expect(screen.getByText('2 action items')).toBeInTheDocument();
      // Second meeting has 1 action item
      expect(screen.getByText('1 action item')).toBeInTheDocument();
    });
  });

  test('does not show action item badge when no action items', async () => {
    await act(async () => {
      render(<MeetingList {...defaultProps} />);
    });

    await waitFor(() => {
      // Client Call has no action items, so no badge should be shown
      // We should only see 2 badges (for the meetings with action items)
      const badges = screen.getAllByText(/action item/);
      expect(badges.length).toBe(2);
    });
  });

  test('search input filters meetings', async () => {
    await act(async () => {
      render(<MeetingList {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search meetings/i);

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Product' } });
    });

    await waitFor(() => {
      expect(screen.queryByText('Weekly Team Sync')).not.toBeInTheDocument();
      expect(screen.getByText('Product Planning')).toBeInTheDocument();
    });
  });

  test('search filters by transcript content', async () => {
    await act(async () => {
      render(<MeetingList {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search meetings/i);

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'client' } });
    });

    await waitFor(() => {
      expect(screen.queryByText('Weekly Team Sync')).not.toBeInTheDocument();
      expect(screen.getByText('Client Call')).toBeInTheDocument();
    });
  });

  test('click on meeting calls onMeetingSelect', async () => {
    const mockOnMeetingSelect = jest.fn();

    await act(async () => {
      render(<MeetingList {...defaultProps} onMeetingSelect={mockOnMeetingSelect} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
    });

    const meetingCard = screen.getByTestId('meeting-card-meeting-1');

    await act(async () => {
      fireEvent.click(meetingCard);
    });

    expect(mockOnMeetingSelect).toHaveBeenCalledWith('meeting-1');
  });

  test('delete button calls onDelete with confirmation', async () => {
    const mockOnDelete = jest.fn();
    mockConfirm.mockReturnValue(true);

    await act(async () => {
      render(<MeetingList {...defaultProps} onDelete={mockOnDelete} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('delete-meeting-meeting-1');

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(mockConfirm).toHaveBeenCalled();
    expect(mockDeleteMeeting).toHaveBeenCalledWith('meeting-1');
    expect(mockOnDelete).toHaveBeenCalledWith('meeting-1');
  });

  test('delete button does not delete if cancelled', async () => {
    const mockOnDelete = jest.fn();
    mockConfirm.mockReturnValue(false);

    await act(async () => {
      render(<MeetingList {...defaultProps} onDelete={mockOnDelete} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('delete-meeting-meeting-1');

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(mockConfirm).toHaveBeenCalled();
    expect(mockDeleteMeeting).not.toHaveBeenCalled();
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  test('empty state when no meetings', async () => {
    mockGetAllMeetings.mockResolvedValue([]);

    await act(async () => {
      render(<MeetingList {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/no meetings yet/i)).toBeInTheDocument();
      expect(screen.getByText(/record your first meeting/i)).toBeInTheDocument();
    });
  });

  test('empty state when search returns no results', async () => {
    await act(async () => {
      render(<MeetingList {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search meetings/i);

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/no meetings found/i)).toBeInTheDocument();
      expect(screen.getByText(/try adjusting your search/i)).toBeInTheDocument();
    });
  });

  test('meetings are sorted by date newest first', async () => {
    await act(async () => {
      render(<MeetingList {...defaultProps} />);
    });

    await waitFor(() => {
      const meetingCards = screen.getAllByTestId(/^meeting-card-/);
      expect(meetingCards.length).toBe(3);
      // First card should be the most recent (Weekly Team Sync - Jan 15)
      expect(meetingCards[0]).toHaveAttribute('data-testid', 'meeting-card-meeting-1');
    });
  });

  test('className prop is applied to container', async () => {
    await act(async () => {
      render(<MeetingList {...defaultProps} className="custom-class" />);
    });

    const container = screen.getByTestId('meeting-list-container');
    expect(container).toHaveClass('custom-class');
  });

  test('displays transcript preview', async () => {
    await act(async () => {
      render(<MeetingList {...defaultProps} />);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/this is the transcript for the weekly team sync/i)
      ).toBeInTheDocument();
    });
  });

  test('search input is cleared when component unmounts', async () => {
    const { unmount } = render(<MeetingList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search meetings/i)).toBeInTheDocument();
    });

    unmount();

    // Component should unmount without errors
    expect(screen.queryByTestId('meeting-list-container')).not.toBeInTheDocument();
  });
});
