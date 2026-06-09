import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export type VoiceInputBackend = 'web-speech' | 'local';

export interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: VoiceInputError) => void;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  /**
   * `web-speech` uses the browser SpeechRecognition API, which can depend on a
   * remote browser speech service. `local` records with MediaRecorder and
   * transcribes on-device using the bundled Moonshine model.
   */
  backend?: VoiceInputBackend;
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
  isProcessing: boolean;
  progress: number;
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

function getBestSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined;
  }

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];

  return types.find(type => MediaRecorder.isTypeSupported(type));
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    onTranscript,
    onError,
    language = 'en-US',
    continuous = false,
    interimResults = true,
    backend = 'web-speech',
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<VoiceInputError | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const localServiceRef = useRef<
    | import('../lib/ai/transcription/huggingfaceTranscriptionService').HuggingFaceTranscriptionService
    | null
  >(null);

  // Check browser support - memoized to avoid recalculation on every render
  const isSupported = useMemo(() => {
    const webSpeechSupported =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition) !== undefined;

    if (backend === 'web-speech') return webSpeechSupported;

    if (typeof window === 'undefined') return false;

    const hasWasm =
      typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
    const hasAudioContext = 'AudioContext' in window || 'webkitAudioContext' in window;
    const hasRecorder =
      !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

    return hasWasm && hasAudioContext && hasRecorder;
  }, [backend]);

  const reportError = useCallback(
    (err: VoiceInputError) => {
      setError(err);
      onError?.(err);
    },
    [onError]
  );

  const transcribeLocalRecording = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);

      try {
        const { HuggingFaceTranscriptionService } =
          await import('../lib/ai/transcription/huggingfaceTranscriptionService');

        localServiceRef.current ??= new HuggingFaceTranscriptionService({
          language: language.split('-')[0] || 'en',
        });

        const text = await localServiceRef.current.transcribeAudio(audioBlob, p => {
          setProgress(Math.round(p * 100));
        });
        const transcriptText = text.trim();

        if (!transcriptText) {
          throw new Error('No speech was transcribed. Please try speaking again.');
        }

        setTranscript(transcriptText);
        onTranscript?.(transcriptText);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Local transcription failed.';
        reportError({ error: 'local-transcription', message });
      } finally {
        setIsProcessing(false);
      }
    },
    [language, onTranscript, reportError]
  );

  const cleanupLocalRecording = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  const startLocalListening = useCallback(async () => {
    if (!isSupported) {
      reportError({
        error: 'local-speech-not-supported',
        message:
          'Local voice input is not supported in this browser. Please use a browser with microphone recording and WebAssembly support.',
      });
      return;
    }

    if (isListening || isProcessing) return;

    setTranscript('');
    setError(null);
    setProgress(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = getBestSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = event => {
        if (event.data?.size) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        reportError({
          error: 'audio-capture',
          message: 'Audio recording failed. Please try again.',
        });
        setIsListening(false);
        cleanupLocalRecording();
      };

      mediaRecorder.onstop = () => {
        const audioBlob = audioChunksRef.current.length
          ? new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
          : null;

        audioChunksRef.current = [];
        cleanupLocalRecording();
        setIsListening(false);

        if (!audioBlob || audioBlob.size === 0) {
          reportError({
            error: 'audio-capture',
            message: 'No audio was captured. Please try again.',
          });
          return;
        }

        void transcribeLocalRecording(audioBlob);
      };

      mediaRecorder.start(100);
      setIsListening(true);
    } catch (err) {
      cleanupLocalRecording();
      const domError = err as DOMException;
      const message =
        domError.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone permissions in your browser settings.'
          : domError.name === 'NotFoundError'
            ? 'No microphone found. Please connect a microphone and try again.'
            : `Failed to access microphone: ${domError.message || 'Unknown error'}`;
      reportError({ error: 'audio-capture', message });
      setIsListening(false);
    }
  }, [
    cleanupLocalRecording,
    isListening,
    isProcessing,
    isSupported,
    reportError,
    transcribeLocalRecording,
  ]);

  const startListening = useCallback(() => {
    if (backend === 'local') {
      void startLocalListening();
      return;
    }

    if (!isSupported) {
      const err = {
        error: 'Speech recognition not supported',
        message: 'Browser does not support speech recognition',
      };
      reportError(err);
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
      reportError(err);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [
    backend,
    isSupported,
    language,
    continuous,
    interimResults,
    onTranscript,
    reportError,
    startLocalListening,
  ]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const stopListening = useCallback(() => {
    if (backend === 'local') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        setIsListening(false);
      }
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      // Don't set recognitionRef.current = null here - let onend handler handle cleanup
    }
    setIsListening(false);
  }, [backend]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onerror = null;
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
      localServiceRef.current?.dispose();
      localServiceRef.current = null;
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
    isProcessing,
    progress,
  };
}
