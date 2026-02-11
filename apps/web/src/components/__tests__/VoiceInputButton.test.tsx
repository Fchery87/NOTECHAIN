import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, afterEach, jest } from 'bun:test';
import { VoiceInputButton, VoiceInputButtonProps } from '../VoiceInputButton';
import type { Editor } from '@tiptap/react';

// Mock the useVoiceInput hook
const mockStartListening = jest.fn();
const mockStopListening = jest.fn();
const mockResetTranscript = jest.fn();

let mockIsListening = false;
let mockIsSupported = true;
let mockTranscript = '';
let mockError: { error: string; message: string } | null = null;

jest.mock('../../hooks/useVoiceInput', () => ({
  useVoiceInput: jest.fn(options => {
    return {
      isListening: mockIsListening,
      isSupported: mockIsSupported,
      transcript: mockTranscript,
      startListening: mockStartListening,
      stopListening: mockStopListening,
      resetTranscript: mockResetTranscript,
      error: mockError,
    };
  }),
}));

// Mock the voice commands module
const mockInterpretVoiceCommand = jest.fn();
const mockExecuteVoiceCommand = jest.fn();

jest.mock('../../lib/voice/voiceCommands', () => ({
  interpretVoiceCommand: (...args: unknown[]) => mockInterpretVoiceCommand(...args),
  executeVoiceCommand: (...args: unknown[]) => mockExecuteVoiceCommand(...args),
}));

describe('VoiceInputButton', () => {
  const mockEditor = {
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        insertContent: jest.fn().run,
        run: jest.fn(),
      })),
    })),
    commands: {
      focus: jest.fn(),
    },
    view: {
      focus: jest.fn(),
    },
  } as unknown as Editor;

  const defaultProps: VoiceInputButtonProps = {
    editor: mockEditor,
  };

  beforeEach(() => {
    mockIsListening = false;
    mockIsSupported = true;
    mockTranscript = '';
    mockError = null;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('button renders with correct title', () => {
    render(<VoiceInputButton {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Voice input');
  });

  test('microphone icon is displayed', () => {
    render(<VoiceInputButton {...defaultProps} />);

    // The button should contain an SVG (microphone icon)
    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  test('clicking starts listening when not currently listening', () => {
    mockIsListening = false;
    render(<VoiceInputButton {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockStartListening).toHaveBeenCalledTimes(1);
  });

  test('clicking stops listening when currently listening', () => {
    mockIsListening = true;
    render(<VoiceInputButton {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockStopListening).toHaveBeenCalledTimes(1);
  });

  test('listening state shows animated indicator', () => {
    mockIsListening = true;
    render(<VoiceInputButton {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-amber-100');
    expect(button).toHaveClass('text-amber-600');

    // Should have animated ping indicator
    const pulseIndicator = button.querySelector('.animate-ping');
    expect(pulseIndicator).toBeInTheDocument();
  });

  test('not supported state shows disabled button', () => {
    mockIsSupported = false;
    render(<VoiceInputButton {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Voice input not supported');
  });

  test('default state uses stone colors', () => {
    mockIsListening = false;
    render(<VoiceInputButton {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-stone-500');
  });

  test('transcript is processed for voice commands', () => {
    // Transcript is processed when isListening becomes false (after recording stops)
    mockIsListening = false;
    mockTranscript = 'new paragraph';
    mockInterpretVoiceCommand.mockReturnValue({
      type: 'NEW_PARAGRAPH',
      raw: 'new paragraph',
    });

    render(<VoiceInputButton {...defaultProps} />);

    // Transcript is processed via useEffect when not listening
    expect(mockInterpretVoiceCommand).toHaveBeenCalledWith('new paragraph');
  });

  test('voice command is executed when found', () => {
    // Transcript is processed when isListening becomes false (after recording stops)
    mockIsListening = false;
    mockTranscript = 'bold that';
    const command = { type: 'BOLD', raw: 'bold that' };
    mockInterpretVoiceCommand.mockReturnValue(command);

    render(<VoiceInputButton {...defaultProps} />);

    expect(mockExecuteVoiceCommand).toHaveBeenCalledWith(command, mockEditor);
  });

  test('error state is handled gracefully', () => {
    mockError = { error: 'not-allowed', message: 'Permission denied' };
    render(<VoiceInputButton {...defaultProps} />);

    const button = screen.getByRole('button');
    // Button should still be rendered even with error
    expect(button).toBeInTheDocument();
  });

  test('editor is optional - works with null editor', () => {
    const propsWithoutEditor: VoiceInputButtonProps = {
      editor: null,
    };

    // Should not throw when rendering without editor
    expect(() => render(<VoiceInputButton {...propsWithoutEditor} />)).not.toThrow();
  });
});
