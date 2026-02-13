import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: VoiceInputError) => void;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface VoiceInputError {
  error: string;
  message: string;
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: VoiceInputError | null;
}

// Type definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    onTranscript,
    onError,
    language = 'en-US',
    continuous = false,
    interimResults = true,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<VoiceInputError | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check browser support - memoized to avoid recalculation on every render
  const isSupported = useMemo(() => {
    return (
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition) !== undefined
    );
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      const err = {
        error: 'Speech recognition not supported',
        message: 'Browser does not support speech recognition',
      };
      setError(err);
      onError?.(err);
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      if (result && result.isFinal) {
        const transcriptText = result[0].transcript;
        setTranscript(transcriptText);
        onTranscript?.(transcriptText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Map error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        'not-allowed':
          'Microphone access denied. Please allow microphone permissions in your browser settings.',
        'no-speech': 'No speech detected. Please try speaking again.',
        'audio-capture': 'No microphone found. Please connect a microphone and try again.',
        network: 'Network error. Speech recognition requires an internet connection.',
        aborted: 'Speech recognition was cancelled.',
        'service-not-allowed': 'Speech recognition service is not allowed in this browser.',
        'language-not-supported': 'The selected language is not supported.',
        'grammar-not-supported': 'Grammar is not supported.',
      };

      const message =
        errorMessages[event.error] ||
        event.message ||
        'Speech recognition error. Please try again.';
      const err = { error: event.error, message };
      setError(err);
      setIsListening(false);
      onError?.(err);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, language, continuous, interimResults, onTranscript, onError]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      // Don't set recognitionRef.current = null here - let onend handler handle cleanup
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    error,
  };
}
