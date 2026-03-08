/**
 * Web Speech API Transcription Service
 *
 * A lightweight, browser-native transcription service using the Web Speech API.
 * This is the primary transcription method for supported browsers (Chrome, Edge, Opera).
 *
 * Benefits:
 * - Zero dependencies (no bundling issues)
 * - Native browser implementation (most reliable)
 * - Works offline in Chromium browsers
 * - No WASM or ONNX runtime required
 *
 * Limitations:
 * - Only works in Chromium-based browsers (Chrome, Edge, Opera)
 * - Requires internet connection in some cases (depends on browser implementation)
 * - Less accurate than Whisper for noisy audio or accents
 */

export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export interface WebSpeechTranscriptionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (result: TranscriptionResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

// Type definitions for Web Speech API - extending from useVoiceInput.ts
type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';

interface SpeechRecognitionErrorEvent extends Event {
  error: SpeechRecognitionErrorCode;
  message: string;
}

// Use the SpeechRecognition type from useVoiceInput.ts
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
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

export class WebSpeechTranscriptionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private isManuallyStopped = false;
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 3;
  private options: WebSpeechTranscriptionOptions;

  constructor(options: WebSpeechTranscriptionOptions = {}) {
    this.options = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      ...options,
    };
  }

  /**
   * Check if Web Speech API is supported in the current browser
   */
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }

  /**
   * Get a user-friendly message about browser support
   */
  static getSupportMessage(): string {
    if (this.isSupported()) {
      return 'Speech recognition is supported in this browser.';
    }
    return 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Opera for transcription features.';
  }

  /**
   * Initialize and start transcription
   */
  start(): void {
    if (!WebSpeechTranscriptionService.isSupported()) {
      this.options.onError?.(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Opera.'
      );
      return;
    }

    if (this.isListening) {
      return;
    }

    // Clear any pending restart timeout
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    this.isManuallyStopped = false;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Enable continuous mode so it doesn't stop after a few seconds
      // This keeps listening until manually stopped
      this.recognition.continuous = true;
      this.recognition.interimResults = this.options.interimResults ?? true;
      this.recognition.lang = this.options.language ?? 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.consecutiveErrors = 0; // Reset error count on successful start
        this.options.onStart?.();
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const alternative = result[0];

          this.options.onResult?.({
            transcript: alternative.transcript,
            isFinal: result.isFinal,
            confidence: alternative.confidence,
          });
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMessages: Record<SpeechRecognitionErrorCode, string> = {
          'no-speech': 'No speech was detected. Please try speaking again.',
          aborted: 'Speech recognition was aborted.',
          'audio-capture': 'No microphone was found or microphone is not working.',
          network: 'A network error occurred. Please check your internet connection.',
          'not-allowed': 'Microphone permission was denied. Please allow microphone access.',
          'service-not-allowed': 'Speech recognition service is not allowed.',
          'bad-grammar': 'There was an error with the speech recognition grammar.',
          'language-not-supported': 'The selected language is not supported.',
        };

        const message = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
        this.options.onError?.(message);

        // Track consecutive errors to prevent infinite restart loops
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          this.consecutiveErrors++;
        }

        // Stop listening on critical errors
        if (
          event.error === 'network' ||
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed'
        ) {
          this.isListening = false;
          this.isManuallyStopped = true; // Prevent auto-restart
        }
      };

      this.recognition.onend = () => {
        const wasListening = this.isListening;
        this.isListening = false;
        this.options.onEnd?.();

        // With continuous=true, onend usually only fires when:
        // 1. Manually stopped (isManuallyStopped = true)
        // 2. An error occurred (we track these with consecutiveErrors)
        // 3. Browser's internal timeout (rare with continuous=true)
        //
        // We only auto-restart if it wasn't a manual stop AND we haven't hit error limits
        if (
          !this.isManuallyStopped &&
          this.consecutiveErrors < this.maxConsecutiveErrors &&
          wasListening
        ) {
          // Add a small delay before restarting to handle edge cases
          this.restartTimeout = setTimeout(() => {
            if (!this.isManuallyStopped && this.consecutiveErrors < this.maxConsecutiveErrors) {
              try {
                this.recognition?.start();
              } catch {
                // If restart fails, don't keep trying
                this.consecutiveErrors++;
              }
            }
          }, 200); // 200ms delay for seamless continuation
        }
      };

      this.recognition.start();
    } catch (error) {
      this.options.onError?.(
        `Failed to start speech recognition: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stop transcription
   */
  stop(): void {
    this.isManuallyStopped = true;

    // Clear any pending restart timeout
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop errors
      }
    }
    this.isListening = false;
  }

  /**
   * Abort transcription immediately
   */
  abort(): void {
    this.isManuallyStopped = true;

    // Clear any pending restart timeout
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition && this.isListening) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore abort errors
      }
    }
    this.isListening = false;
  }

  /**
   * Check if currently listening
   */
  get listening(): boolean {
    return this.isListening;
  }

  /**
   * Update language during runtime
   */
  setLanguage(language: string): void {
    this.options.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
}

// Export singleton instance for easy access
export const webSpeechTranscriptionService = new WebSpeechTranscriptionService();
