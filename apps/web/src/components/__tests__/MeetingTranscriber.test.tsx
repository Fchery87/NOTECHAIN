import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { MeetingTranscriberProps } from '../MeetingTranscriber';

const transcriberMocks = vi.hoisted(() => ({
  createMeeting: vi.fn(),
  extractActionItems: vi.fn(() => []),
  stopActiveRecording: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  selectMode: vi.fn(),
  controllerState: {
    mode: 'webspeech' as const,
    transcript: 'Captured transcript',
    audioBlob: new Blob(['audio'], { type: 'audio/webm' }),
    recordingDuration: 90,
    isRecording: false,
    isProcessing: false,
    isWebSpeechSupported: true,
    isHuggingFaceSupported: true,
    isHfModelLoaded: true,
    isHfLoading: false,
    isHfTranscribing: false,
    hfProgress: 0,
    canStartSelectedMode: true,
  },
}));

vi.mock('../../hooks/useMeetingTranscriptionController', () => ({
  useMeetingTranscriptionController: vi.fn(() => ({
    ...transcriberMocks.controllerState,
    selectMode: transcriberMocks.selectMode,
    startRecording: transcriberMocks.startRecording,
    stopRecording: transcriberMocks.stopRecording,
    stopActiveRecording: transcriberMocks.stopActiveRecording,
  })),
}));

vi.mock('../../lib/ai/transcription/actionItemExtractor', () => ({
  extractActionItems: transcriberMocks.extractActionItems,
}));

vi.mock('../../lib/meetings/meetingAccess', () => ({
  createMeetingAccess: vi.fn(() => ({
    createMeeting: transcriberMocks.createMeeting,
  })),
}));

import { MeetingTranscriber } from '../MeetingTranscriber';

describe('MeetingTranscriber', () => {
  const defaultProps: MeetingTranscriberProps = {
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(transcriberMocks.controllerState, {
      mode: 'webspeech',
      transcript: 'Captured transcript',
      audioBlob: new Blob(['audio'], { type: 'audio/webm' }),
      recordingDuration: 90,
      isRecording: false,
      isProcessing: false,
      isWebSpeechSupported: true,
      isHuggingFaceSupported: true,
      isHfModelLoaded: true,
      isHfLoading: false,
      isHfTranscribing: false,
      hfProgress: 0,
      canStartSelectedMode: true,
    });
    transcriberMocks.createMeeting.mockResolvedValue({
      id: 'meeting-1',
      title: 'Saved Meeting',
      transcript: 'Captured transcript',
      actionItems: [],
      date: new Date('2024-01-15T10:00:00'),
      duration: 90,
      createdAt: new Date('2024-01-15T10:00:00'),
      updatedAt: new Date('2024-01-15T10:00:00'),
    });
  });

  test('renders the initial title', () => {
    render(<MeetingTranscriber {...defaultProps} initialTitle="Pre-filled Title" />);

    expect(screen.getByPlaceholderText(/enter meeting title/i)).toHaveValue('Pre-filled Title');
  });

  test('saves meetings through meeting access with calendar provenance', async () => {
    const onSave = vi.fn();
    render(
      <MeetingTranscriber
        {...defaultProps}
        initialTitle="Team Sync"
        calendarEventId="calendar-event-456"
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /save meeting/i }));

    await waitFor(() => {
      expect(transcriberMocks.createMeeting).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Team Sync',
          transcript: 'Captured transcript',
          duration: 90,
          calendarEventId: 'calendar-event-456',
        })
      );
      expect(onSave).toHaveBeenCalled();
    });
  });

  test('disables saving when no transcript is available', () => {
    transcriberMocks.controllerState.transcript = '   ';
    render(<MeetingTranscriber {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: /save meeting/i });
    expect(saveButton).toBeDisabled();
    expect(transcriberMocks.createMeeting).not.toHaveBeenCalled();
  });
});
