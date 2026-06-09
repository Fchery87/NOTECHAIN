/**
 * Hugging Face Transformers Transcription Service (v3)
 *
 * Fallback transcription service using @huggingface/transformers.
 * This runs entirely in the browser using ONNX Runtime Web.
 *
 * Benefits:
 * - Works in all modern browsers (including Brave, Firefox, Safari)
 * - Privacy-focused: audio never leaves the device
 * - No cloud services required after model download/cache warm-up
 * - Uses lightweight Moonshine Tiny ONNX by default for faster local inference
 *
 * Limitations:
 * - First use requires downloading model assets unless they are already cached
 * - Browser privacy tooling can block the first download from the model host
 * - Requires WebAssembly support; WebGPU is used opportunistically when available
 */

import {
  env,
  pipeline,
  Tensor as TransformersTensor,
  type AutomaticSpeechRecognitionPipeline,
  type DataType,
  type DeviceType,
} from '@huggingface/transformers';

export const LOCAL_TRANSCRIPTION_MODEL = '/models/moonshine-tiny-ONNX';
export const LOCAL_ONNX_RUNTIME_PATH = '/ort/';
export const DEFAULT_TRANSCRIPTION_MODEL = LOCAL_TRANSCRIPTION_MODEL;

// Moonshine/Whisper feature extractors expect 16 kHz mono audio. The browser
// decodes recordings at the device's native rate (often 44.1/48 kHz), and
// Transformers.js does NOT resample a raw Float32Array, so we must resample to
// this rate ourselves before inference or the model receives time-distorted
// audio and returns an empty/garbage transcript.
export const TARGET_SAMPLE_RATE = 16000;
export const MOONSHINE_MIN_NEW_TOKENS = 24;
export const MOONSHINE_TOKENS_PER_SECOND = 8;
export const MOONSHINE_MAX_NEW_TOKENS = 448;
export const MOONSHINE_CHUNK_SECONDS = 8;

interface PipelineProgress {
  status: string;
  progress?: number;
}

interface SpeechPipelineOptions {
  dtype: DataType | Record<string, DataType>;
  device: DeviceType;
  local_files_only?: boolean;
  progress_callback?: (progress: PipelineProgress) => void;
}

type SpeechPipelineFactory = (
  task: 'automatic-speech-recognition',
  model: string,
  options: SpeechPipelineOptions
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

interface AudioStats {
  durationSeconds: number;
  rms: number;
  peak: number;
}

export class HuggingFaceTranscriptionService {
  private pipeline: AutomaticSpeechRecognitionPipeline | null = null;
  private modelLoaded = false;
  private loadingPromise: Promise<void> | null = null;
  private options: HuggingFaceTranscriptionOptions;

  constructor(options: HuggingFaceTranscriptionOptions = {}) {
    this.options = {
      model: DEFAULT_TRANSCRIPTION_MODEL,
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

      const model = this.options.model ?? DEFAULT_TRANSCRIPTION_MODEL;

      // Configure environment for browser usage. We self-host the default model and
      // ONNX Runtime WASM files so Private Mode does not need Hugging Face/jsDelivr.
      env.allowLocalModels = true;
      env.allowRemoteModels = model !== LOCAL_TRANSCRIPTION_MODEL;
      env.useBrowserCache = true;
      env.useCustomCache = false;
      this.configureLocalOnnxRuntime();
      this.ensureOnnxTensorLocationCompatibility();

      this.options.onProgress?.(0.2);

      const attempts = this.buildModelLoadAttempts(model);
      let lastError: unknown = null;

      for (const attempt of attempts) {
        try {
          this.options.onProgress?.(0.3);
          this.pipeline = await createSpeechPipeline(
            'automatic-speech-recognition',
            attempt.model,
            {
              dtype: attempt.dtype,
              device: attempt.device,
              local_files_only: attempt.local_files_only,
              progress_callback: progress => this.handlePipelineProgress(progress),
            }
          );
          lastError = null;
          break;
        } catch (pipelineError) {
          lastError = pipelineError;
          console.warn(
            `[HuggingFaceTranscriptionService] Failed to load ${attempt.model} on ${attempt.device}; trying next fallback...`,
            pipelineError
          );
        }
      }

      if (!this.pipeline) {
        throw lastError instanceof Error ? lastError : new Error('No transcription model loaded');
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
      const userFriendlyError = this.toUserFriendlyLoadError(errorMessage);

      this.options.onError?.(`Failed to load transcription model: ${userFriendlyError}`);
      throw new Error(`Failed to load transcription model: ${userFriendlyError}`);
    }
  }

  private buildModelLoadAttempts(model: string): Array<{ model: string } & SpeechPipelineOptions> {
    const supportsWebGpu = this.canUseWebGpu();
    const localOnly = model === LOCAL_TRANSCRIPTION_MODEL;
    const attempts: Array<{ model: string } & SpeechPipelineOptions> = [];

    // Try WASM first. Some browsers (notably Brave/Chrome installs without a usable
    // GPU adapter) expose `navigator.gpu` but fail ONNX Runtime WebGPU init. In
    // Transformers.js/ONNX Runtime, a failed first backend init can poison the shared
    // init promise for later attempts, so WebGPU must not be the first default path.
    attempts.push({
      model,
      device: 'wasm',
      local_files_only: localOnly,
      // Moonshine is sensitive to encoder quantization. Use a full-precision
      // encoder and compact decoder, matching the known-good browser examples.
      dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
    });

    if (supportsWebGpu) {
      attempts.push({
        model,
        device: 'webgpu',
        local_files_only: localOnly,
        // Keep the encoder full precision here too; Moonshine output quality is
        // sensitive to encoder quantization across both WASM and WebGPU.
        dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
      });
    }

    return attempts;
  }

  private configureLocalOnnxRuntime(): void {
    const onnxEnv = env.backends.onnx as {
      wasm?: {
        wasmPaths?: string;
        numThreads?: number;
      };
    };

    onnxEnv.wasm ??= {};
    onnxEnv.wasm.wasmPaths = LOCAL_ONNX_RUNTIME_PATH;
  }

  private ensureOnnxTensorLocationCompatibility(): void {
    // ONNX Runtime Web 1.22 expects feed tensors to expose `.location`, but the
    // Tensor constructor available through this Transformers.js build can produce
    // CPU tensors without that property. Patch the shared ORT Tensor prototype so
    // processor-created tensors serialize as CPU inputs instead of failing with:
    // "invalid data location: undefined for input \"input_values\"".
    const probe = new TransformersTensor('float32', new Float32Array([0]), [1]) as unknown as {
      ort_tensor?: object;
    };
    const ortTensor = probe.ort_tensor;

    if (!ortTensor || 'location' in ortTensor) {
      return;
    }

    const prototype = Object.getPrototypeOf(ortTensor) as object | null;
    if (!prototype || Object.getOwnPropertyDescriptor(prototype, 'location')) {
      return;
    }

    Object.defineProperty(prototype, 'location', {
      configurable: true,
      get() {
        return 'cpu';
      },
    });
  }

  private canUseWebGpu(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  private handlePipelineProgress(progress: PipelineProgress): void {
    if (progress.status !== 'progress' || typeof progress.progress !== 'number') {
      return;
    }

    // Transformers.js reports progress as either 0..1 or 0..100 depending on the
    // asset loader path. Normalize before mapping download progress to 30%..80% UI.
    const normalized = progress.progress > 1 ? progress.progress / 100 : progress.progress;
    const bounded = Math.min(Math.max(normalized, 0), 1);
    this.options.onProgress?.(0.3 + bounded * 0.5);
  }

  private toUserFriendlyLoadError(errorMessage: string): string {
    const lower = errorMessage.toLowerCase();

    if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch')) {
      return 'Failed to download AI model. Private Mode uses a lightweight self-hosted Moonshine model, but the first run still needs to download and cache local model/runtime files from this app. This may be blocked by browser privacy settings (Brave Shields, ad blockers), VPN/firewall rules, or Content Security Policy. Try temporarily disabling shields or using Chrome/Edge.';
    }

    if (lower.includes('cors') || lower.includes('cross-origin')) {
      return 'Cross-origin request blocked while downloading the AI model. Please check browser extensions/privacy settings or try a different browser.';
    }

    if (lower.includes('webgpu') || lower.includes('gpu adapter') || lower.includes('fp16')) {
      return `${errorMessage}. The app tried WebGPU first and then falls back to WebAssembly; if this persists, your browser may not support the required local inference backend.`;
    }

    return errorMessage;
  }

  private getLoadedModelType(): string | undefined {
    return (this.pipeline as unknown as { model?: { config?: { model_type?: string } } })?.model
      ?.config?.model_type;
  }

  private isMoonshineModel(): boolean {
    return (
      this.getLoadedModelType() === 'moonshine' ||
      (this.options.model ?? DEFAULT_TRANSCRIPTION_MODEL) === LOCAL_TRANSCRIPTION_MODEL
    );
  }

  private getTranscriptionOptions(audioSampleCount?: number): Record<string, unknown> {
    // Moonshine's Transformers.js pipeline passes all kwargs directly to generate(),
    // so Whisper-only options like language/task/return_timestamps should be omitted.
    // Transformers.js also uses Math.floor(durationSeconds) * 6 as Moonshine's
    // default max_new_tokens. That becomes 0 for sub-second clips and is often too
    // small for short manual recordings, producing an empty transcript with no
    // thrown error. Override it with a small floor and a bounded per-second budget.
    if (this.isMoonshineModel()) {
      const durationSeconds = audioSampleCount ? audioSampleCount / TARGET_SAMPLE_RATE : 0;
      const tokenBudget = Math.ceil(durationSeconds) * MOONSHINE_TOKENS_PER_SECOND;

      return {
        max_new_tokens: Math.min(
          MOONSHINE_MAX_NEW_TOKENS,
          Math.max(MOONSHINE_MIN_NEW_TOKENS, tokenBudget)
        ),
      };
    }

    return {
      language: this.options.language,
      task: this.options.task,
      return_timestamps: this.options.returnTimestamps,
    };
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
      const audioStats = this.getAudioStats(audioData, audioBuffer.sampleRate);
      onProgress?.(0.7);

      const text = await this.transcribeAudioData(audioData, audioStats, onProgress);
      onProgress?.(1.0);
      return text;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Transcription failed: ${errorMessage}`);
    }
  }

  private async transcribeAudioData(
    audioData: Float32Array,
    audioStats: AudioStats,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.pipeline) {
      throw new Error('Transcription model not loaded');
    }

    if (!this.isMoonshineModel()) {
      const text = this.extractTranscriptionText(
        (await this.pipeline(audioData, this.getTranscriptionOptions(audioData.length))) as
          | HuggingFaceTranscriptionResult
          | string
      );

      if (text) return text;
      throw new Error('Unexpected transcription result format');
    }

    const chunkSize = TARGET_SAMPLE_RATE * MOONSHINE_CHUNK_SECONDS;
    const chunks: Float32Array[] = [];

    for (let start = 0; start < audioData.length; start += chunkSize) {
      const end = Math.min(start + chunkSize, audioData.length);
      const chunk = audioData.subarray(start, end);
      if (chunk.length > 0) chunks.push(chunk);
    }

    const texts: string[] = [];

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const result = (await this.pipeline(chunk, this.getTranscriptionOptions(chunk.length))) as
        | HuggingFaceTranscriptionResult
        | string;
      const text = this.extractTranscriptionText(result);

      if (text) {
        texts.push(text);
      }

      onProgress?.(0.7 + ((index + 1) / chunks.length) * 0.25);
    }

    const transcript = texts.join(' ').replace(/\s+/g, ' ').trim();
    if (transcript) return transcript;

    throw new Error(this.getEmptyTranscriptError(audioStats));
  }

  private extractTranscriptionText(result: HuggingFaceTranscriptionResult | string): string {
    if (typeof result === 'string') {
      return result.trim();
    }

    if (result && typeof result === 'object' && 'text' in result) {
      return result.text.trim();
    }

    throw new Error('Unexpected transcription result format');
  }

  /**
   * Convert audio blob to a 16 kHz mono AudioBuffer.
   *
   * The recording is decoded at the device's native sample rate, then resampled
   * to {@link TARGET_SAMPLE_RATE} via an OfflineAudioContext. Without this step
   * the model receives audio at the wrong rate and produces an empty transcript.
   */
  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    // Decode at the native rate first; not every browser can decode directly
    // into a 16 kHz context, so we resample separately below.
    const decodeContext = new AudioContextCtor();
    let decoded: AudioBuffer;
    try {
      decoded = await decodeContext.decodeAudioData(arrayBuffer);
    } finally {
      void decodeContext.close();
    }

    if (decoded.sampleRate === TARGET_SAMPLE_RATE) {
      return decoded;
    }

    return this.resampleToTarget(decoded);
  }

  /**
   * Resample a decoded AudioBuffer to 16 kHz mono using an OfflineAudioContext.
   */
  private async resampleToTarget(decoded: AudioBuffer): Promise<AudioBuffer> {
    const OfflineCtor =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;

    const frameCount = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
    const offline = new OfflineCtor(1, frameCount, TARGET_SAMPLE_RATE);

    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);

    return offline.startRendering();
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

  private getAudioStats(audioData: Float32Array, sampleRate: number): AudioStats {
    let sumSquares = 0;
    let peak = 0;

    for (const sample of audioData) {
      const abs = Math.abs(sample);
      sumSquares += sample * sample;
      if (abs > peak) peak = abs;
    }

    return {
      durationSeconds: audioData.length / sampleRate,
      rms: audioData.length ? Math.sqrt(sumSquares / audioData.length) : 0,
      peak,
    };
  }

  private getEmptyTranscriptError(stats: AudioStats): string {
    const details = `duration=${stats.durationSeconds.toFixed(1)}s, rms=${stats.rms.toFixed(4)}, peak=${stats.peak.toFixed(4)}`;

    if (stats.rms < 0.003 && stats.peak < 0.02) {
      return `The recording decoded as silence or near-silence (${details}). Your microphone may work in other apps, but this browser recording did not contain usable audio. Try reloading the page and re-granting microphone permission.`;
    }

    return `The local transcription model returned an empty transcript even though audio was captured (${details}). Try a 5–10 second test phrase; if this persists, the captured browser audio format/model settings need further adjustment.`;
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
