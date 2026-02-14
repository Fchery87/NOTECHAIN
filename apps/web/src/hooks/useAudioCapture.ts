import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseAudioCaptureOptions {
  onDataAvailable?: (blob: Blob) => void;
  onError?: (error: string) => void;
  mimeType?: string;
}

export interface UseAudioCaptureReturn {
  isRecording: boolean;
  isSupported: boolean;
  duration: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
}

export function useAudioCapture(options: UseAudioCaptureOptions = {}): UseAudioCaptureReturn {
  const { onDataAvailable, onError, mimeType = 'audio/webm' } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check browser support
  const isSupported =
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  const getErrorMessage = (error: Error): string => {
    if (error.name === 'NotAllowedError') {
      return 'Permission denied. Please allow microphone access to record audio.';
    }
    if (error.name === 'NotFoundError') {
      return 'No microphone found. Please connect a microphone and try again.';
    }
    return `Failed to access microphone: ${error.message}`;
  };

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const errorMsg = 'Audio recording is not supported in this browser.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Clear any previous error and reset state
    setError(null);
    setDuration(0);
    audioChunksRef.current = [];

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available event
      mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          onDataAvailable?.(event.data);
        }
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      const errorMessage = getErrorMessage(err as Error);
      setError(errorMessage);
      onError?.(errorMessage);

      // Clean up stream if it was partially created
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isSupported, mimeType, onDataAvailable, onError]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    return new Promise(resolve => {
      const mediaRecorder = mediaRecorderRef.current!;
      const stream = streamRef.current;

      // Handle stop event
      mediaRecorder.onstop = () => {
        // Stop all tracks in the stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        // Create blob from accumulated chunks
        const audioBlob =
          audioChunksRef.current.length > 0
            ? new Blob(audioChunksRef.current, { type: mimeType })
            : null;

        // Reset state
        setIsRecording(false);
        mediaRecorderRef.current = null;
        streamRef.current = null;

        resolve(audioBlob);
      };

      // Stop recording
      mediaRecorder.stop();

      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    });
  }, [isRecording, mimeType]);

  // Use ref to track recording state for cleanup (avoids dependency on isRecording)
  const isRecordingRef = useRef(isRecording);

  // Keep ref in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Clean up on unmount only (empty dependency array)
  useEffect(() => {
    return () => {
      // Stop recording if still active
      if (mediaRecorderRef.current && isRecordingRef.current) {
        mediaRecorderRef.current.stop();
      }

      // Stop all tracks in the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    isSupported,
    duration,
    error,
    startRecording,
    stopRecording,
  };
}
