import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Editor } from '@tiptap/react';
import type { VoiceInputButtonProps } from '../VoiceInputButton';

const voiceInputButtonMocks = vi.hoisted(() => ({
  startListening: vi.fn(),
  stopListening: vi.fn(),
  resetTranscript: vi.fn(),
  interpretVoiceCommand: vi.fn(),
  executeVoiceCommand: vi.fn(),
  useVoiceInput: vi.fn(),
  state: {
    isListening: false,
    isSupported: true,
    transcript: '',
    error: null as { error: string; message: string } | null,
  },
}));

vi.mock('../../hooks/useVoiceInput', () => ({
  useVoiceInput: voiceInputButtonMocks.useVoiceInput,
}));

vi.mock('../../lib/voice/voiceCommands', () => ({
  interpretVoiceCommand: voiceInputButtonMocks.interpretVoiceCommand,
  executeVoiceCommand: voiceInputButtonMocks.executeVoiceCommand,
}));

import { VoiceInputButton } from '../VoiceInputButton';

const mockStartListening = voiceInputButtonMocks.startListening;
const mockStopListening = voiceInputButtonMocks.stopListening;
const mockInterpretVoiceCommand = voiceInputButtonMocks.interpretVoiceCommand;
const mockExecuteVoiceCommand = voiceInputButtonMocks.executeVoiceCommand;
const useVoiceInputMock = voiceInputButtonMocks.useVoiceInput;
const mockState = voiceInputButtonMocks.state;

const resetVoiceState = () => {
  mockState.isListening = false;
  mockState.isSupported = true;
  mockState.transcript = '';
  mockState.error = null;
  useVoiceInputMock.mockImplementation(() => ({
    isListening: mockState.isListening,
    isSupported: mockState.isSupported,
    transcript: mockState.transcript,
    startListening: mockStartListening,
    stopListening: mockStopListening,
    resetTranscript: voiceInputButtonMocks.resetTranscript,
    error: mockState.error,
  }));
};

describe('VoiceInputButton', () => {
  const insertContent = vi.fn(() => ({ run: vi.fn() }));
  const focus = vi.fn(() => ({ insertContent, run: vi.fn() }));

  const mockEditor = {
    chain: vi.fn(() => ({ focus })),
    commands: {
      focus: vi.fn(),
    },
    view: {
      focus: vi.fn(),
    },
  } as unknown as Editor;

  const defaultProps: VoiceInputButtonProps = {
    editor: mockEditor,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetVoiceState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('button renders with correct title', () => {
    render(<VoiceInputButton {...defaultProps} />);

    expect(screen.getByRole('button')).toHaveAttribute('title', 'Voice input');
  });

  test('microphone icon is displayed', () => {
    render(<VoiceInputButton {...defaultProps} />);

    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
  });

  test('clicking starts listening when not currently listening', () => {
    mockState.isListening = false;
    render(<VoiceInputButton {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockStartListening).toHaveBeenCalledTimes(1);
  });

  test('clicking stops listening when currently listening', () => {
    mockState.isListening = true;
    render(<VoiceInputButton {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockStopListening).toHaveBeenCalledTimes(1);
  });

  test('listening state shows animated indicator', () => {
    mockState.isListening = true;
    render(<VoiceInputButton {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-amber-100');
    expect(button).toHaveClass('text-amber-600');
    expect(button.querySelector('.animate-ping')).toBeInTheDocument();
  });

  test('not supported state shows disabled button', () => {
    mockState.isSupported = false;
    render(<VoiceInputButton {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Voice input not supported');
  });

  test('default state uses stone colors', () => {
    render(<VoiceInputButton {...defaultProps} />);

    expect(screen.getByRole('button')).toHaveClass('text-stone-500');
  });

  test('onTranscript callback is passed to useVoiceInput hook', () => {
    render(<VoiceInputButton {...defaultProps} />);

    expect(useVoiceInputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        onTranscript: expect.any(Function),
        continuous: false,
        interimResults: true,
      })
    );
  });

  test('onTranscript executes recognized voice commands', () => {
    mockInterpretVoiceCommand.mockReturnValue({ type: 'format', action: 'bold' });
    render(<VoiceInputButton {...defaultProps} />);

    const options = useVoiceInputMock.mock.calls[0][0];
    options.onTranscript('make this bold');

    expect(mockInterpretVoiceCommand).toHaveBeenCalledWith('make this bold');
    expect(mockExecuteVoiceCommand).toHaveBeenCalledWith(
      { type: 'format', action: 'bold' },
      mockEditor
    );
  });

  test('error state is handled gracefully', () => {
    mockState.error = { error: 'not-allowed', message: 'Permission denied' };
    render(<VoiceInputButton {...defaultProps} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('error message is displayed when error occurs', () => {
    mockState.error = { error: 'not-allowed', message: 'Permission denied' };
    render(<VoiceInputButton {...defaultProps} />);

    expect(screen.getByText('Permission denied')).toBeInTheDocument();
    expect(screen.getByText('Permission denied')).toHaveClass('text-rose-500');
  });

  test('no error message when no error', () => {
    render(<VoiceInputButton {...defaultProps} />);

    expect(screen.queryByText('Permission denied')).not.toBeInTheDocument();
  });

  test('button has correct aria-label and aria-pressed attributes', () => {
    const { rerender } = render(<VoiceInputButton {...defaultProps} />);

    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Start voice input');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    mockState.isListening = true;
    rerender(<VoiceInputButton {...defaultProps} />);

    button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Stop voice input');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  test('editor is optional - works with null editor', () => {
    expect(() => render(<VoiceInputButton editor={null} />)).not.toThrow();
  });
});
