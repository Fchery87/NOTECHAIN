import { describe, it, expect, beforeEach, afterEach, vi, mock } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
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
  useVoiceInput: jest.fn(_options => {
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

  test('onTranscript callback is passed to useVoiceInput hook', () => {
    render(<VoiceInputButton {...defaultProps} />);

    // Verify the hook was called with onTranscript callback
    const { useVoiceInput } = require('../../hooks/useVoiceInput');
    expect(useVoiceInput).toHaveBeenCalledWith(
      expect.objectContaining({
        onTranscript: expect.any(Function),
        continuous: false,
        interimResults: true,
      })
    );
  });

  test('error state is handled gracefully', () => {
    mockError = { error: 'not-allowed', message: 'Permission denied' };
    render(<VoiceInputButton {...defaultProps} />);

    const button = screen.getByRole('button');
    // Button should still be rendered even with error
    expect(button).toBeInTheDocument();
  });

  test('error message is displayed when error occurs', () => {
    mockError = { error: 'not-allowed', message: 'Permission denied' };
    render(<VoiceInputButton {...defaultProps} />);

    expect(screen.getByText('Permission denied')).toBeInTheDocument();
    expect(screen.getByText('Permission denied')).toHaveClass('text-rose-500');
  });

  test('no error message when no error', () => {
    mockError = null;
    render(<VoiceInputButton {...defaultProps} />);

    expect(screen.queryByText('Permission denied')).not.toBeInTheDocument();
  });

  test('button has correct aria-label and aria-pressed attributes', () => {
    mockIsListening = false;
    const { rerender } = render(<VoiceInputButton {...defaultProps} />);

    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Start voice input');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    mockIsListening = true;
    rerender(<VoiceInputButton {...defaultProps} />);

    button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Stop voice input');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  test('editor is optional - works with null editor', () => {
    const propsWithoutEditor: VoiceInputButtonProps = {
      editor: null,
    };

    // Should not throw when rendering without editor
    expect(() => render(<VoiceInputButton {...propsWithoutEditor} />)).not.toThrow();
  });
});
