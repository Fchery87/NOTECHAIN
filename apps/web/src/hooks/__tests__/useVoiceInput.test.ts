import { describe, test, expect, beforeEach, afterEach, jest } from 'bun:test';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceInput } from '../useVoiceInput';

// Type declarations for test
interface MockSpeechRecognitionEvent {
  results: MockSpeechRecognitionResultList;
  resultIndex: number;
}

interface MockSpeechRecognitionResultList {
  length: number;
  [index: number]: MockSpeechRecognitionResult;
}

interface MockSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: MockSpeechRecognitionAlternative;
}

interface MockSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface MockSpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

// Store the last created instance for testing
let lastRecognitionInstance: MockSpeechRecognition | null = null;

// Mock SpeechRecognition
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onresult: ((event: MockSpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: MockSpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  started = false;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastRecognitionInstance = this;
  }

  start() {
    this.started = true;
    if (this.onstart) {
      this.onstart();
    }
  }

  stop() {
    this.started = false;
    if (this.onend) {
      this.onend();
    }
  }

  abort() {
    this.started = false;
    if (this.onend) {
      this.onend();
    }
  }
}

// Helper to get the last created recognition instance
function getLastRecognition(): MockSpeechRecognition {
  if (!lastRecognitionInstance) {
    throw new Error('No SpeechRecognition instance created');
  }
  return lastRecognitionInstance;
}

// Mock SpeechRecognitionEvent
function createMockSpeechRecognitionEvent(
  transcript: string,
  isFinal = true
): MockSpeechRecognitionEvent {
  return {
    resultIndex: 0,
    results: [
      {
        isFinal,
        length: 1,
        0: {
          transcript,
          confidence: 0.95,
        },
      },
    ] as unknown as MockSpeechRecognitionResultList,
  };
}

// Mock SpeechRecognitionErrorEvent
function createMockSpeechRecognitionErrorEvent(
  error: string,
  message = ''
): MockSpeechRecognitionErrorEvent {
  return {
    error,
    message,
  };
}

describe('useVoiceInput', () => {
  let originalSpeechRecognition: unknown;

  beforeEach(() => {
    originalSpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition;
    // @ts-expect-error - mocking
    window.SpeechRecognition = MockSpeechRecognition;
    // @ts-expect-error - mocking webkit prefix
    window.webkitSpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    if (originalSpeechRecognition) {
      // @ts-expect-error - cleanup
      window.SpeechRecognition = originalSpeechRecognition;
    } else {
      // @ts-expect-error - cleanup
      delete window.SpeechRecognition;
    }
    // @ts-expect-error - cleanup
    delete window.webkitSpeechRecognition;
    lastRecognitionInstance = null;
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    test('should have isListening as false initially', () => {
      const { result } = renderHook(() => useVoiceInput({}));
      expect(result.current.isListening).toBe(false);
    });

    test('should have isSupported as true when SpeechRecognition is available', () => {
      const { result } = renderHook(() => useVoiceInput({}));
      expect(result.current.isSupported).toBe(true);
    });

    test('should have empty transcript initially', () => {
      const { result } = renderHook(() => useVoiceInput({}));
      expect(result.current.transcript).toBe('');
    });

    test('should have no error initially', () => {
      const { result } = renderHook(() => useVoiceInput({}));
      expect(result.current.error).toBeNull();
    });
  });

  describe('Browser Support Detection', () => {
    test('should detect when SpeechRecognition is not supported', () => {
      // @ts-expect-error - removing mock
      delete window.SpeechRecognition;
      // @ts-expect-error - removing mock
      delete window.webkitSpeechRecognition;

      const { result } = renderHook(() => useVoiceInput({}));
      expect(result.current.isSupported).toBe(false);
    });

    test('should support webkitSpeechRecognition prefix', () => {
      // @ts-expect-error - removing standard
      delete window.SpeechRecognition;
      // @ts-expect-error - using webkit only
      window.webkitSpeechRecognition = MockSpeechRecognition;

      const { result } = renderHook(() => useVoiceInput({}));
      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('Start Listening', () => {
    test('should set isListening to true when startListening is called', async () => {
      const { result } = renderHook(() => useVoiceInput({}));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
    });

    test('should not start if not supported', () => {
      // @ts-expect-error - removing mock
      delete window.SpeechRecognition;
      // @ts-expect-error - removing mock
      delete window.webkitSpeechRecognition;

      const onError = jest.fn();
      const { result } = renderHook(() => useVoiceInput({ onError }));

      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(false);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Speech recognition not supported',
        })
      );
    });
  });

  describe('Stop Listening', () => {
    test('should set isListening to false when stopListening is called', async () => {
      const { result } = renderHook(() => useVoiceInput({}));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      act(() => {
        result.current.stopListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(false);
      });
    });
  });

  describe('Transcript Callback', () => {
    test('should call onTranscript with final transcript', async () => {
      const onTranscript = jest.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      // Get the recognition instance created by the hook and simulate result
      const recognition = getLastRecognition();
      const event = createMockSpeechRecognitionEvent('Hello world', true);

      act(() => {
        if (recognition.onresult) {
          recognition.onresult(event);
        }
      });

      expect(onTranscript).toHaveBeenCalledWith('Hello world');
    });

    test('should update transcript state', async () => {
      const { result } = renderHook(() => useVoiceInput({}));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      // Get the recognition instance created by the hook and simulate result
      const recognition = getLastRecognition();
      const event = createMockSpeechRecognitionEvent('Test transcript', true);

      act(() => {
        if (recognition.onresult) {
          recognition.onresult(event);
        }
      });

      expect(result.current.transcript).toBe('Test transcript');
    });
  });

  describe('Error Handling', () => {
    test('should call onError when recognition fails', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useVoiceInput({ onError }));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      const recognition = getLastRecognition();
      const errorEvent = createMockSpeechRecognitionErrorEvent('not-allowed', 'Permission denied');

      act(() => {
        if (recognition.onerror) {
          recognition.onerror(errorEvent);
        }
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'not-allowed',
          message: 'Permission denied',
        })
      );
    });

    test('should set error state when recognition fails', async () => {
      const { result } = renderHook(() => useVoiceInput({}));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      const recognition = getLastRecognition();
      const errorEvent = createMockSpeechRecognitionErrorEvent('network', 'Network error');

      act(() => {
        if (recognition.onerror) {
          recognition.onerror(errorEvent);
        }
      });

      expect(result.current.error).toEqual(
        expect.objectContaining({
          error: 'network',
          message: 'Network error',
        })
      );
    });
  });

  describe('Configuration Options', () => {
    test('should accept language option', () => {
      const { result } = renderHook(() => useVoiceInput({ language: 'es-ES' }));
      expect(result.current).toBeDefined();
    });

    test('should apply language to SpeechRecognition instance', async () => {
      const { result } = renderHook(() => useVoiceInput({ language: 'es-ES' }));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      const recognition = getLastRecognition();
      expect(recognition.lang).toBe('es-ES');
    });

    test('should default to en-US when no language is specified', async () => {
      const { result } = renderHook(() => useVoiceInput({}));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      const recognition = getLastRecognition();
      expect(recognition.lang).toBe('en-US');
    });

    test('should accept continuous option', () => {
      const { result } = renderHook(() => useVoiceInput({ continuous: true }));
      expect(result.current).toBeDefined();
    });

    test('should default interimResults to true', async () => {
      const { result } = renderHook(() => useVoiceInput({}));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      const recognition = getLastRecognition();
      expect(recognition.interimResults).toBe(true);
    });

    test('should accept interimResults option', async () => {
      const { result } = renderHook(() => useVoiceInput({ interimResults: false }));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      const recognition = getLastRecognition();
      expect(recognition.interimResults).toBe(false);
    });
  });

  describe('Reset Transcript', () => {
    test('should reset transcript to empty string', async () => {
      const { result } = renderHook(() => useVoiceInput({}));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      const recognition = getLastRecognition();
      const event = createMockSpeechRecognitionEvent('Hello world', true);

      act(() => {
        if (recognition.onresult) {
          recognition.onresult(event);
        }
      });

      expect(result.current.transcript).toBe('Hello world');

      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe('');
    });

    test('should have resetTranscript function in return object', () => {
      const { result } = renderHook(() => useVoiceInput({}));
      expect(typeof result.current.resetTranscript).toBe('function');
    });
  });

  describe('Cleanup', () => {
    test('should stop recognition on unmount', async () => {
      const { result, unmount } = renderHook(() => useVoiceInput({}));

      act(() => {
        result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      const stopSpy = jest.spyOn(MockSpeechRecognition.prototype, 'stop');

      unmount();

      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
