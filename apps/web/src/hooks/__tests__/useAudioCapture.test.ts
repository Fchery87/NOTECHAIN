import { describe, test, expect, beforeEach, afterEach, jest } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useAudioCapture } from '../useAudioCapture';

// Store the last created MediaRecorder instance for testing
let lastMediaRecorderInstance: MockMediaRecorder | null = null;

// Mock MediaStream
class MockMediaStream {
  id: string;
  tracks: MockMediaStreamTrack[];

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.id = 'test-stream-' + Math.random().toString(36).substr(2, 9);
    this.tracks = tracks;
  }

  getTracks() {
    return this.tracks;
  }
}

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  kind: string;
  stopped = false;

  constructor(kind: string = 'audio') {
    this.kind = kind;
  }

  stop() {
    this.stopped = true;
  }
}

// Mock MediaRecorder
class MockMediaRecorder {
  stream: MockMediaStream;
  mimeType: string;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  audioChunks: Blob[] = [];

  constructor(stream: MockMediaStream, options?: { mimeType?: string }) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'audio/webm';
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastMediaRecorderInstance = this;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  }

  pause() {
    this.state = 'paused';
  }

  resume() {
    this.state = 'recording';
  }

  // Helper method for tests to simulate data available
  simulateDataAvailable(data: Blob) {
    this.audioChunks.push(data);
    if (this.ondataavailable) {
      this.ondataavailable({ data });
    }
  }
}

// Helper to get the last created MediaRecorder instance
function getLastMediaRecorder(): MockMediaRecorder {
  if (!lastMediaRecorderInstance) {
    throw new Error('No MediaRecorder instance created');
  }
  return lastMediaRecorderInstance;
}

describe('useAudioCapture', () => {
  let originalMediaDevices: typeof navigator.mediaDevices;
  let originalMediaRecorder: typeof MediaRecorder;
  let mockGetUserMedia: jest.Mock;

  beforeEach(() => {
    // Reset instance trackers
    lastMediaRecorderInstance = null;

    // Store original values
    originalMediaDevices = navigator.mediaDevices;
    originalMediaRecorder = global.MediaRecorder;

    // Mock getUserMedia
    mockGetUserMedia = jest.fn();

    // Set up navigator.mediaDevices mock
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      writable: true,
      configurable: true,
    });

    // Set up MediaRecorder mock
    // @ts-expect-error - mocking
    global.MediaRecorder = MockMediaRecorder;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      writable: true,
      configurable: true,
    });
    global.MediaRecorder = originalMediaRecorder;

    jest.clearAllMocks();
  });

  test('should initialize with isRecording: false', () => {
    const { result } = renderHook(() => useAudioCapture());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isSupported).toBe(true);
    expect(result.current.duration).toBe(0);
    expect(result.current.error).toBeNull();
  });

  test('should detect when browser does not support getUserMedia', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useAudioCapture());

    expect(result.current.isSupported).toBe(false);
  });

  test('should detect when browser does not support MediaRecorder', () => {
    // @ts-expect-error - mocking
    global.MediaRecorder = undefined;

    const { result } = renderHook(() => useAudioCapture());

    expect(result.current.isSupported).toBe(false);
  });

  test('should start recording and set isRecording to true', async () => {
    const mockStream = new MockMediaStream([new MockMediaStreamTrack('audio')]);
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(result.current.isRecording).toBe(true);
  });

  test('should stop recording and return audio blob', async () => {
    const mockStream = new MockMediaStream([new MockMediaStreamTrack('audio')]);
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useAudioCapture());

    // Start recording
    await act(async () => {
      await result.current.startRecording();
    });

    // Simulate ondataavailable event
    const mediaRecorder = getLastMediaRecorder();
    act(() => {
      mediaRecorder.simulateDataAvailable(new Blob(['chunk1']));
    });

    // Stop recording
    let returnedBlob: Blob | null = null;
    await act(async () => {
      returnedBlob = await result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(returnedBlob).toBeInstanceOf(Blob);
  });

  test('should call onDataAvailable callback with audio chunks', async () => {
    const mockStream = new MockMediaStream([new MockMediaStreamTrack('audio')]);
    mockGetUserMedia.mockResolvedValue(mockStream);

    const onDataAvailable = jest.fn();
    const { result } = renderHook(() =>
      useAudioCapture({
        onDataAvailable,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    const mediaRecorder = getLastMediaRecorder();
    const mockChunk = new Blob(['audio chunk']);
    act(() => {
      mediaRecorder.simulateDataAvailable(mockChunk);
    });

    expect(onDataAvailable).toHaveBeenCalledWith(mockChunk);
  });

  test('should handle permission denied error', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValue(error);

    const onError = jest.fn();
    const { result } = renderHook(() => useAudioCapture({ onError }));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBe(
      'Permission denied. Please allow microphone access to record audio.'
    );
    expect(onError).toHaveBeenCalledWith(
      'Permission denied. Please allow microphone access to record audio.'
    );
  });

  test('should handle no microphone device error', async () => {
    const error = new Error('No device found');
    error.name = 'NotFoundError';
    mockGetUserMedia.mockRejectedValue(error);

    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBe(
      'No microphone found. Please connect a microphone and try again.'
    );
  });

  test('should handle generic media errors', async () => {
    const error = new Error('Unknown error');
    error.name = 'SomeOtherError';
    mockGetUserMedia.mockRejectedValue(error);

    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBe('Failed to access microphone: Unknown error');
  });

  test('should track recording duration', async () => {
    const mockStream = new MockMediaStream([new MockMediaStreamTrack('audio')]);
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useAudioCapture());

    // Initially duration should be 0
    expect(result.current.duration).toBe(0);

    await act(async () => {
      await result.current.startRecording();
    });

    // Duration should still be 0 immediately after starting
    expect(result.current.duration).toBe(0);

    await act(async () => {
      await result.current.stopRecording();
    });

    // Duration should persist after stopping
    expect(result.current.duration).toBeGreaterThanOrEqual(0);
  });

  test('should reset duration when starting new recording', async () => {
    const mockStream = new MockMediaStream([new MockMediaStreamTrack('audio')]);
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useAudioCapture());

    // Start first recording
    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    await act(async () => {
      await result.current.stopRecording();
    });

    // Start second recording
    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.duration).toBe(0);
  });

  test('should clear error when starting new recording', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    mockGetUserMedia
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(new MockMediaStream([new MockMediaStreamTrack('audio')]));

    const { result } = renderHook(() => useAudioCapture());

    // First attempt fails
    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).not.toBeNull();

    // Second attempt should clear error
    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBeNull();
  });

  test('should allow custom mime type', async () => {
    const mockStream = new MockMediaStream([new MockMediaStreamTrack('audio')]);
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() =>
      useAudioCapture({
        mimeType: 'audio/mp4',
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    const mediaRecorder = getLastMediaRecorder();
    expect(mediaRecorder.mimeType).toBe('audio/mp4');
  });

  test('should return null when stopping if not recording', async () => {
    const { result } = renderHook(() => useAudioCapture());

    let returnedBlob: Blob | null = null;
    await act(async () => {
      returnedBlob = await result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(returnedBlob).toBeNull();
  });

  test('should clean up on unmount', async () => {
    const mockTrack = new MockMediaStreamTrack('audio');
    const mockStream = new MockMediaStream([mockTrack]);
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result, unmount } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.startRecording();
    });

    unmount();

    // After unmount, the track should be stopped
    expect(mockTrack.stopped).toBe(true);
  });
});
