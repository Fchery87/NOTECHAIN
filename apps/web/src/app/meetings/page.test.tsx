import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import MeetingsPage from './page';

// Mock next/navigation
const mockPush = mock(() => {});
const mockRefresh = mock(() => {});
mock.module('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock MeetingList component
const MockMeetingList = ({ onMeetingSelect }: { onMeetingSelect?: (id: string) => void }) => (
  <div data-testid="meeting-list">Meeting List Component</div>
);

mock.module('@/components/MeetingList', () => ({
  MeetingList: MockMeetingList,
}));

// Mock MeetingTranscriber component
const MockMeetingTranscriber = ({
  onSave,
  onCancel,
}: {
  onSave?: () => void;
  onCancel?: () => void;
}) => (
  <div data-testid="meeting-transcriber">
    <button data-testid="mock-save-button" onClick={onSave}>
      Mock Save
    </button>
    <button data-testid="mock-cancel-button" onClick={onCancel}>
      Mock Cancel
    </button>
  </div>
);

mock.module('@/components/MeetingTranscriber', () => ({
  MeetingTranscriber: MockMeetingTranscriber,
}));

describe('MeetingsPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  afterEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  test('renders with title "Meetings"', () => {
    render(<MeetingsPage />);

    expect(screen.getByText('Meetings')).toBeInTheDocument();
  });

  test('shows description text', () => {
    render(<MeetingsPage />);

    expect(screen.getByText(/Record and manage your meeting transcriptions/)).toBeInTheDocument();
  });

  test('shows MeetingList component', () => {
    render(<MeetingsPage />);

    expect(screen.getByTestId('meeting-list')).toBeInTheDocument();
  });

  test('shows "New Meeting" button', () => {
    render(<MeetingsPage />);

    expect(screen.getByText('New Meeting')).toBeInTheDocument();
  });

  test('clicking "New Meeting" opens MeetingTranscriber modal', async () => {
    render(<MeetingsPage />);

    const newMeetingButton = screen.getByText('New Meeting');

    await act(async () => {
      fireEvent.click(newMeetingButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('meeting-transcriber')).toBeInTheDocument();
    });
  });

  test('modal shows overlay when open', async () => {
    render(<MeetingsPage />);

    const newMeetingButton = screen.getByText('New Meeting');

    await act(async () => {
      fireEvent.click(newMeetingButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
    });
  });

  test('clicking cancel closes the modal', async () => {
    render(<MeetingsPage />);

    // Open modal
    const newMeetingButton = screen.getByText('New Meeting');
    await act(async () => {
      fireEvent.click(newMeetingButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('meeting-transcriber')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByTestId('mock-cancel-button');
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('meeting-transcriber')).not.toBeInTheDocument();
    });
  });

  test('clicking save closes the modal and refreshes list', async () => {
    render(<MeetingsPage />);

    // Open modal
    const newMeetingButton = screen.getByText('New Meeting');
    await act(async () => {
      fireEvent.click(newMeetingButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('meeting-transcriber')).toBeInTheDocument();
    });

    // Click save
    const saveButton = screen.getByTestId('mock-save-button');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('meeting-transcriber')).not.toBeInTheDocument();
    });

    // Meeting list should still be visible
    expect(screen.getByTestId('meeting-list')).toBeInTheDocument();
  });

  test('handles empty state', () => {
    render(<MeetingsPage />);

    // The page should render even with empty meetings
    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getByTestId('meeting-list')).toBeInTheDocument();
  });

  test('page has correct layout structure', () => {
    render(<MeetingsPage />);

    // Check for main container
    expect(screen.getByTestId('meetings-page')).toBeInTheDocument();

    // Check for header section
    expect(screen.getByTestId('meetings-header')).toBeInTheDocument();
  });

  test('New Meeting button has primary button styling', () => {
    render(<MeetingsPage />);

    const newMeetingButton = screen.getByText('New Meeting');
    expect(newMeetingButton).toHaveClass('bg-stone-900');
  });

  test('modal can be closed by clicking overlay', async () => {
    render(<MeetingsPage />);

    // Open modal
    const newMeetingButton = screen.getByText('New Meeting');
    await act(async () => {
      fireEvent.click(newMeetingButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('meeting-transcriber')).toBeInTheDocument();
    });

    // Click overlay
    const overlay = screen.getByTestId('modal-overlay');
    await act(async () => {
      fireEvent.click(overlay);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('meeting-transcriber')).not.toBeInTheDocument();
    });
  });
});
