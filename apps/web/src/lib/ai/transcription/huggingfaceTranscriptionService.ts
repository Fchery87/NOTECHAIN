/**
 * Hugging Face Transformers Transcription Service (v3)
 *
 * Fallback transcription service using @huggingface/transformers.
 * This runs entirely in the browser using ONNX Runtime Web.
 *
 * Benefits:
 * - Works in all modern browsers (including Brave, Firefox, Safari)
 * - Privacy-focused: audio never leaves the device
 * - No cloud services required
 * - Offline capable after initial model download
 *
 * Limitations:
 * - Large initial download (~150MB for Whisper Tiny)
 * - Slower than Web Speech API (runs locally)
 * - Requires WebAssembly support
 * - First load can be slow (model download)
 */

import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

type SpeechPipelineFactory = (
  task: 'automatic-speech-recognition',
  model: string,
  options: {
    dtype: 'fp32' | 'q8';
    device: 'cpu';
    progress_callback?: (progress: { status: string; progress?: number }) => void;
  }
) => Promise<AutomaticSpeechRecognitionPipeline>;

const createSpeechPipeline = pipeline as unknown as SpeechPipelineFactory;

export interface HuggingFaceTranscriptionResult {
  text: string;
  chunks?: Array<{
    text: string;
    timestamp: [number, number | null];
  }>;
}

export interface HuggingFaceTranscriptionOptions {
  model?: string;
  language?: string;
  task?: 'transcribe' | 'translate';
  returnTimestamps?: boolean;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  onLoad?: () => void;
}

export class HuggingFaceTranscriptionService {
  private pipeline: AutomaticSpeechRecognitionPipeline | null = null;
  private modelLoaded = false;
  private loadingPromise: Promise<void> | null = null;
  private options: HuggingFaceTranscriptionOptions;

  constructor(options: HuggingFaceTranscriptionOptions = {}) {
    this.options = {
      model: 'onnx-community/whisper-tiny',
      language: 'en',
      task: 'transcribe',
      returnTimestamps: false,
      ...options,
    };
  }

  /**
   * Check if the browser supports the required features
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for WebAssembly support (required for ONNX Runtime)
    const hasWasm =
      typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';

    // Check for required APIs
    const hasAudioContext =
      typeof AudioContext !== 'undefined' ||
      typeof (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext !==
        'undefined';

    return hasWasm && hasAudioContext;
  }

  /**
   * Get support message
   */
  static getSupportMessage(): string {
    if (this.isSupported()) {
      return 'Hugging Face transcription is supported in this browser.';
    }
    return 'Hugging Face transcription requires WebAssembly support. Please use a modern browser.';
  }

  /**
   * Initialize and load the model
   */
  async initialize(): Promise<void> {
    if (this.modelLoaded) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadModel();
    return this.loadingPromise;
  }

  private async loadModel(): Promise<void> {
    try {
      this.options.onProgress?.(0.1);

      this.options.onProgress?.(0.2);

      // Configure environment for browser usage.
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      env.useCustomCache = false;

      this.options.onProgress?.(0.3);

      // Load the ASR pipeline with error handling
      try {
        this.pipeline = await createSpeechPipeline(
          'automatic-speech-recognition',
          this.options.model ?? 'onnx-community/whisper-tiny',
          {
            dtype: 'fp32', // Use fp32 for better compatibility
            device: 'cpu', // Use CPU for better compatibility (WebGPU can have issues)
            progress_callback: (progress: { status: string; progress?: number }) => {
              if (progress.status === 'progress' && typeof progress.progress === 'number') {
                // Map download progress (0.3 - 0.8)
                const downloadProgress = 0.3 + progress.progress * 0.5;
                this.options.onProgress?.(downloadProgress);
              }
            },
          }
        );
      } catch (pipelineError) {
        // If the first attempt fails, try with a smaller model
        console.warn(
          '[HuggingFaceTranscriptionService] First model failed, trying fallback...',
          pipelineError
        );
        this.options.onProgress?.(0.3);

        // Try with whisper-base as fallback
        this.pipeline = await createSpeechPipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny', // Fallback to Xenova's tiny model
          {
            dtype: 'q8', // Use quantized model for smaller download
            device: 'cpu',
          }
        );
      }

      this.options.onProgress?.(0.8);
      this.modelLoaded = true;
      this.options.onProgress?.(1.0);
      this.options.onLoad?.();

      console.log('[HuggingFaceTranscriptionService] Model loaded successfully');
    } catch (error) {
      this.modelLoaded = false;
      this.loadingPromise = null;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Provide more helpful error messages
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('fetch')) {
        userFriendlyError =
          "Failed to download AI model. This may be blocked by your browser's privacy settings (Brave Shields, ad blockers). Try temporarily disabling shields or using Chrome/Edge instead.";
      } else if (errorMessage.includes('CORS')) {
        userFriendlyError =
          'Cross-origin request blocked. Please check your browser extensions or try a different browser.';
      }

      this.options.onError?.(`Failed to load transcription model: ${userFriendlyError}`);
      throw new Error(`Failed to load transcription model: ${userFriendlyError}`);
    }
  }

  /**
   * Transcribe audio from a Blob
   */
  async transcribeAudio(audioBlob: Blob, onProgress?: (progress: number) => void): Promise<string> {
    // Auto-initialize if not already loaded
    if (!this.modelLoaded) {
      onProgress?.(0.1);
      await this.initialize();
      onProgress?.(0.3);
    }

    if (!this.pipeline) {
      throw new Error('Transcription model not loaded');
    }

    try {
      // Convert Blob to AudioBuffer
      const audioBuffer = await this.blobToAudioBuffer(audioBlob);
      onProgress?.(0.5);

      // Convert to Float32Array
      const audioData = this.audioBufferToFloat32Array(audioBuffer);
      onProgress?.(0.7);

      // Run transcription
      const result = (await this.pipeline(audioData, {
        language: this.options.language,
        task: this.options.task,
        return_timestamps: this.options.returnTimestamps,
      })) as HuggingFaceTranscriptionResult | string;

      onProgress?.(1.0);

      // Extract text from result
      if (typeof result === 'string') {
        return result.trim();
      }

      if (result && typeof result === 'object' && 'text' in result) {
        return result.text.trim();
      }

      throw new Error('Unexpected transcription result format');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Transcription failed: ${errorMessage}`);
    }
  }

  /**
   * Convert audio blob to AudioBuffer
   */
  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();

    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } finally {
      audioContext.close();
    }
  }

  /**
   * Convert AudioBuffer to Float32Array (mono, 16kHz)
   */
  private audioBufferToFloat32Array(audioBuffer: AudioBuffer): Float32Array {
    // If mono, return directly
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }

    // Mix to mono
    const length = audioBuffer.length;
    const monoData = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        sum += audioBuffer.getChannelData(channel)[i];
      }
      monoData[i] = sum / audioBuffer.numberOfChannels;
    }

    return monoData;
  }

  /**
   * Dispose of the model and free memory
   */
  dispose(): void {
    this.pipeline = null;
    this.modelLoaded = false;
    this.loadingPromise = null;
  }

  /**
   * Check if model is loaded
   */
  get isModelLoaded(): boolean {
    return this.modelLoaded;
  }
}

// Export singleton instance
export const huggingFaceTranscriptionService = new HuggingFaceTranscriptionService();
