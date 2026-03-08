import { useState, useCallback, useRef, useEffect } from 'react';
import {
  WebSpeechTranscriptionService,
  type TranscriptionResult,
  type WebSpeechTranscriptionOptions,
} from '../lib/ai/transcription/webSpeechTranscriptionService';

export interface UseWebSpeechTranscriptionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export interface UseWebSpeechTranscriptionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  supportMessage: string;
}

/**
 * React hook for Web Speech API transcription
 *
 * Provides a simple interface for speech-to-text using the browser's native
 * Web Speech API. Falls back gracefully for unsupported browsers.
 */
export function useWebSpeechTranscription(
  options: UseWebSpeechTranscriptionOptions = {}
): UseWebSpeechTranscriptionReturn {
  const {
    language = 'en-US',
    continuous = true,
    interimResults = true,
    onTranscript,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const serviceRef = useRef<WebSpeechTranscriptionService | null>(null);
  const finalTranscriptRef = useRef('');
  const interimTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check browser support
  const isSupported = WebSpeechTranscriptionService.isSupported();
  const supportMessage = WebSpeechTranscriptionService.getSupportMessage();

  // Initialize service
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    serviceRef.current = new WebSpeechTranscriptionService({
      language,
      continuous,
      interimResults,
      onStart: () => {
        setIsListening(true);
        setError(null);
      },
      onResult: (result: TranscriptionResult) => {
        if (result.isFinal) {
          // Clear any pending interim update
          if (interimTimeoutRef.current) {
            clearTimeout(interimTimeoutRef.current);
          }
          finalTranscriptRef.current += result.transcript;
          setTranscript(finalTranscriptRef.current);
          setInterimTranscript('');
          onTranscript?.(finalTranscriptRef.current, true);
        } else {
          // Debounce interim results to prevent UI flicker
          if (interimTimeoutRef.current) {
            clearTimeout(interimTimeoutRef.current);
          }
          interimTimeoutRef.current = setTimeout(() => {
            setInterimTranscript(result.transcript);
            onTranscript?.(finalTranscriptRef.current + result.transcript, false);
          }, 100); // 100ms debounce
        }
      },
      onError: (err: string) => {
        setError(err);
        onError?.(err);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    return () => {
      if (interimTimeoutRef.current) {
        clearTimeout(interimTimeoutRef.current);
      }
      serviceRef.current?.abort();
    };
  }, [language, continuous, interimResults, onTranscript, onError, isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Opera.'
      );
      return;
    }

    setError(null);
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    serviceRef.current?.start();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    serviceRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    if (interimTimeoutRef.current) {
      clearTimeout(interimTimeoutRef.current);
    }
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    supportMessage,
  };
}
