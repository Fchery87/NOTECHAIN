import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: VoiceInputError) => void;
  language?: string;
  continuous?: boolean;
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
  const { onTranscript, onError, language = 'en-US', continuous = false } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<VoiceInputError | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check browser support
  const isSupported =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition) !== undefined;

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
    recognition.interimResults = false;
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
      const err = { error: event.error, message: event.message || 'Speech recognition error' };
      setError(err);
      setIsListening(false);
      onError?.(err);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, language, continuous, onTranscript, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
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
    error,
  };
}
