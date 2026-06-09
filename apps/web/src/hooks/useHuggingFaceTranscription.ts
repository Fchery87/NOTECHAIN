import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DEFAULT_TRANSCRIPTION_MODEL,
  HuggingFaceTranscriptionService,
  type HuggingFaceTranscriptionOptions,
} from '../lib/ai/transcription/huggingfaceTranscriptionService';

export interface UseHuggingFaceTranscriptionOptions {
  model?: string;
  language?: string;
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
  onLoad?: () => void;
}

export interface UseHuggingFaceTranscriptionReturn {
  isSupported: boolean;
  isModelLoaded: boolean;
  isLoading: boolean;
  isTranscribing: boolean;
  progress: number;
  transcript: string;
  error: string | null;
  initialize: () => Promise<void>;
  transcribe: (audioBlob: Blob) => Promise<void>;
  resetTranscript: () => void;
  supportMessage: string;
}

/**
 * React hook for Hugging Face Transformers transcription
 *
 * Provides a client-side transcription fallback that works in all browsers
 * including Brave, Firefox, and Safari.
 */
export function useHuggingFaceTranscription(
  options: UseHuggingFaceTranscriptionOptions = {}
): UseHuggingFaceTranscriptionReturn {
  const {
    model = DEFAULT_TRANSCRIPTION_MODEL,
    language = 'en',
    onTranscript,
    onError,
    onLoad,
  } = options;

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const serviceRef = useRef<HuggingFaceTranscriptionService | null>(null);

  // Check browser support
  const isSupported = HuggingFaceTranscriptionService.isSupported();
  const supportMessage = HuggingFaceTranscriptionService.getSupportMessage();

  // Initialize service
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    serviceRef.current = new HuggingFaceTranscriptionService({
      model,
      language,
      onProgress: p => setProgress(Math.round(p * 100)),
      onError: err => {
        setError(err);
        onError?.(err);
      },
      onLoad: () => {
        setIsModelLoaded(true);
        setIsLoading(false);
        onLoad?.();
      },
    });

    return () => {
      serviceRef.current?.dispose();
    };
  }, [model, language, onLoad, onError, isSupported]);

  const initialize = useCallback(async () => {
    if (!isSupported) {
      setError('Hugging Face transcription is not supported in this browser.');
      return;
    }

    if (isModelLoaded || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      await serviceRef.current?.initialize();
      // onLoad callback will set isModelLoaded
    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [isSupported, isModelLoaded, isLoading, onError]);

  const transcribe = useCallback(
    async (audioBlob: Blob) => {
      if (!isModelLoaded) {
        setError('Model not loaded. Please initialize first.');
        return;
      }

      setIsTranscribing(true);
      setProgress(0);
      setError(null);

      try {
        const text = await serviceRef.current?.transcribeAudio(audioBlob, p => {
          setProgress(Math.round(p * 100));
        });

        if (text) {
          setTranscript(text);
          onTranscript?.(text);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Transcription failed';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsTranscribing(false);
      }
    },
    [isModelLoaded, onTranscript, onError]
  );

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
    setProgress(0);
  }, []);

  return {
    isSupported,
    isModelLoaded,
    isLoading,
    isTranscribing,
    progress,
    transcript,
    error,
    initialize,
    transcribe,
    resetTranscript,
    supportMessage,
  };
}
