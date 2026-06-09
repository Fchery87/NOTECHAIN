import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ActionItem } from '../../lib/ai/transcription/actionItemExtractor';
import type { MeetingTranscriberProps } from '../MeetingTranscriber';

const transcriberMocks = vi.hoisted(() => {
  const startWebSpeech = vi.fn();
  const stopWebSpeech = vi.fn();
  const resetWebSpeech = vi.fn();
  const startRecording = vi.fn();
  const stopRecording = vi.fn();
  const initializeHf = vi.fn();
  const transcribeHf = vi.fn();
  const resetHf = vi.fn();
  const saveMeeting = vi.fn();
  const getMeetingEncryptionKey = vi.fn();
  const extractActionItems = vi.fn(() => []);
  const meetingKey = new Uint8Array(Array.from({ length: 32 }, (_, index) => index + 1));

  const webSpeechState = {
    isSupported: true,
    isListening: false,
    transcript: '',
    interimTranscript: '',
  };

  const hfState = {
    isSupported: true,
    isModelLoaded: true,
    isLoading: false,
    isTranscribing: false,
    progress: 0,
    transcript: '',
  };

  const audioState = {
    isRecording: false,
    isSupported: true,
    duration: 0,
    error: null as string | null,
  };

  return {
    startWebSpeech,
    stopWebSpeech,
    resetWebSpeech,
    startRecording,
    stopRecording,
    initializeHf,
    transcribeHf,
    resetHf,
    saveMeeting,
    getMeetingEncryptionKey,
    extractActionItems,
    meetingKey,
    webSpeechState,
    hfState,
    audioState,
  };
});

vi.mock('../../hooks/useWebSpeechTranscription', () => ({
  useWebSpeechTranscription: vi.fn(() => ({
    ...transcriberMocks.webSpeechState,
    startListening: transcriberMocks.startWebSpeech,
    stopListening: transcriberMocks.stopWebSpeech,
    resetTranscript: transcriberMocks.resetWebSpeech,
  })),
}));

vi.mock('../../hooks/useHuggingFaceTranscription', () => ({
  useHuggingFaceTranscription: vi.fn(() => ({
    ...transcriberMocks.hfState,
    initialize: transcriberMocks.initializeHf,
    transcribe: transcriberMocks.transcribeHf,
    resetTranscript: transcriberMocks.resetHf,
  })),
}));

vi.mock('../../hooks/useAudioCapture', () => ({
  useAudioCapture: vi.fn(() => ({
    ...transcriberMocks.audioState,
    startRecording: transcriberMocks.startRecording,
    stopRecording: transcriberMocks.stopRecording,
  })),
}));

vi.mock('../../lib/ai/transcription/webSpeechTranscriptionService', () => ({
  WebSpeechTranscriptionService: {
    isSupported: vi.fn(() => true),
  },
}));

vi.mock('../../lib/ai/transcription/huggingfaceTranscriptionService', () => ({
  HuggingFaceTranscriptionService: {
    isSupported: vi.fn(() => true),
  },
  DEFAULT_TRANSCRIPTION_MODEL: '/models/moonshine-tiny-ONNX',
  TARGET_SAMPLE_RATE: 16000,
}));

vi.mock('../../lib/ai/transcription/actionItemExtractor', () => ({
  extractActionItems: transcriberMocks.extractActionItems,
}));

vi.mock('../../lib/storage/meetingStorage', () => ({
  createMeetingStorage: vi.fn(() => ({
    saveMeeting: transcriberMocks.saveMeeting,
  })),
}));

vi.mock('../../lib/storage/meetingEncryptionKey', () => ({
  getMeetingEncryptionKey: transcriberMocks.getMeetingEncryptionKey,
}));

import { MeetingTranscriber } from '../MeetingTranscriber';

const defaultProps: MeetingTranscriberProps = {
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

const resetMockState = () => {
  transcriberMocks.webSpeechState.isSupported = true;
  transcriberMocks.webSpeechState.isListening = false;
  transcriberMocks.webSpeechState.transcript = '';
  transcriberMocks.webSpeechState.interimTranscript = '';

  transcriberMocks.hfState.isSupported = true;
  transcriberMocks.hfState.isModelLoaded = true;
  transcriberMocks.hfState.isLoading = false;
  transcriberMocks.hfState.isTranscribing = false;
  transcriberMocks.hfState.progress = 0;
  transcriberMocks.hfState.transcript = '';

  transcriberMocks.audioState.isRecording = false;
  transcriberMocks.audioState.isSupported = true;
  transcriberMocks.audioState.duration = 0;
  transcriberMocks.audioState.error = null;
};

const selectRealTimeMode = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /real-time mode/i }));
  });
};

const selectPrivateMode = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /private mode/i }));
  });
};

describe('MeetingTranscriber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
    transcriberMocks.startWebSpeech.mockResolvedValue(undefined);
    transcriberMocks.startRecording.mockResolvedValue(undefined);
    transcriberMocks.getMeetingEncryptionKey.mockResolvedValue(transcriberMocks.meetingKey);
    transcriberMocks.stopRecording.mockResolvedValue(
      new Blob(['audio data'], { type: 'audio/webm' })
    );
    transcriberMocks.saveMeeting.mockResolvedValue({
      id: 'meeting-1',
      title: 'Saved Meeting',
      transcript: 'Transcript',
      actionItems: [],
      date: new Date(),
      duration: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('component renders with initial mode-selection state', () => {
    render(<MeetingTranscriber {...defaultProps} />);

    expect(screen.getByPlaceholderText(/enter meeting title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /real-time mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /private mode/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start recording/i })).not.toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /save meeting/i });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });

  test('title input field exists and accepts input', async () => {
    render(<MeetingTranscriber {...defaultProps} />);

    const titleInput = screen.getByPlaceholderText(/enter meeting title/i);
    await act(async () => {
      fireEvent.change(titleInput, { target: { value: 'Team Sync Meeting' } });
    });

    expect(titleInput).toHaveValue('Team Sync Meeting');
  });

  test('initialTitle prop sets initial title value', () => {
    render(<MeetingTranscriber {...defaultProps} initialTitle="Pre-filled Title" />);

    expect(screen.getByPlaceholderText(/enter meeting title/i)).toHaveValue('Pre-filled Title');
  });

  test('real-time mode start button starts web speech recording', async () => {
    render(<MeetingTranscriber {...defaultProps} />);

    await selectRealTimeMode();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
    });

    expect(transcriberMocks.resetWebSpeech).toHaveBeenCalledTimes(1);
    expect(transcriberMocks.startWebSpeech).toHaveBeenCalledTimes(1);
  });

  test('private mode start button starts local audio capture', async () => {
    render(<MeetingTranscriber {...defaultProps} />);

    await selectPrivateMode();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
    });

    expect(transcriberMocks.resetHf).toHaveBeenCalledTimes(1);
    expect(transcriberMocks.startRecording).toHaveBeenCalledTimes(1);
  });

  test('cancel button calls onCancel callback', async () => {
    const mockOnCancel = vi.fn();

    render(<MeetingTranscriber {...defaultProps} onCancel={mockOnCancel} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    });

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('calendar event ID prop works', () => {
    render(<MeetingTranscriber {...defaultProps} calendarEventId="calendar-event-456" />);

    expect(screen.getByPlaceholderText(/enter meeting title/i)).toBeInTheDocument();
  });
});

describe('MeetingTranscriber - Recording State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
    transcriberMocks.webSpeechState.isListening = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('stop button is shown when real-time recording', async () => {
    render(<MeetingTranscriber {...defaultProps} />);

    await selectRealTimeMode();

    expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
  });

  test('duration timer displays during recording', async () => {
    render(<MeetingTranscriber {...defaultProps} />);

    await selectRealTimeMode();

    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  test('stop button stops web speech recording when clicked', async () => {
    render(<MeetingTranscriber {...defaultProps} />);

    await selectRealTimeMode();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));
    });

    expect(transcriberMocks.stopWebSpeech).toHaveBeenCalledTimes(1);
  });
});

describe('MeetingTranscriber - With Data', () => {
  const mockActionItems: ActionItem[] = [
    { text: 'John will review the proposal', assignee: 'John', completed: false },
    { text: 'Complete the report', completed: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
    transcriberMocks.webSpeechState.transcript =
      'John will review the proposal. Complete the report.';
    transcriberMocks.getMeetingEncryptionKey.mockResolvedValue(transcriberMocks.meetingKey);
    transcriberMocks.extractActionItems.mockReturnValue(mockActionItems);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('transcript display appears after selecting a mode with transcript data', async () => {
    render(<MeetingTranscriber {...defaultProps} />);

    await selectRealTimeMode();

    expect(screen.getByLabelText(/transcript/i)).toHaveTextContent('John will review the proposal');
  });

  test('can save a meeting when title and transcript are present', async () => {
    const onSave = vi.fn();
    render(<MeetingTranscriber {...defaultProps} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/enter meeting title/i), {
      target: { value: 'Team Sync Meeting' },
    });
    await selectRealTimeMode();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save meeting/i }));
    });

    await waitFor(() => {
      expect(transcriberMocks.saveMeeting).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Team Sync Meeting',
          transcript: 'John will review the proposal. Complete the report.',
        }),
        expect.any(Uint8Array)
      );
      expect(onSave).toHaveBeenCalled();
    });
  });
});
