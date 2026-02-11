// packages/ai-engine/src/llm/LocalLLM.ts
/**
 * Local LLM integration using Xenova Transformers.js
 * Privacy-first text generation and summarization
 */

import {
  pipeline,
  type TextGenerationPipeline,
  type SummarizationPipeline,
  env,
} from '@xenova/transformers';
import {
  type LocalLLMConfig,
  type GenerationRequest,
  type GenerationResponse,
  type SummarizationRequest,
  type ModelProgress,
  AIError,
  type GenerationCallback,
  type GenerationChunk,
} from '../types';

// Configure transformers.js to use local models only
env.allowLocalModels = true;
env.allowRemoteModels = true; // Allow downloading from Hugging Face

/**
 * Default configuration for local LLM
 */
const DEFAULT_CONFIG: Required<LocalLLMConfig> = {
  modelId: 'Xenova/tinyllama-chat-v1.0',
  quantized: true,
  maxTokens: 256,
  temperature: 0.7,
  topP: 0.9,
  enableProgress: true,
  device: 'cpu',
};

/**
 * Local LLM service for text generation and summarization
 * All processing happens locally in the browser
 */
export class LocalLLM {
  private config: Required<LocalLLMConfig>;
  private generationPipeline: TextGenerationPipeline | null = null;
  private summarizationPipeline: SummarizationPipeline | null = null;
  private isLoading = false;
  private loadingPromise: Promise<void> | null = null;
  private progressCallback?: (progress: ModelProgress) => void;

  constructor(
    config: LocalLLMConfig = DEFAULT_CONFIG,
    onProgress?: (progress: ModelProgress) => void
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.progressCallback = onProgress;
  }

  /**
   * Initialize and load the model
   */
  async initialize(): Promise<void> {
    if (this.generationPipeline) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.loadModel();
    return this.loadingPromise;
  }

  /**
   * Load the text generation model
   */
  private async loadModel(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      this.reportProgress({
        state: 'downloading',
        progress: 0,
        message: 'Starting model download...',
      });

      // Load text generation pipeline
      this.generationPipeline = await pipeline('text-generation', this.config.modelId, {
        quantized: this.config.quantized,
        progress_callback: (progress: unknown) => {
          this.handleProgressCallback(progress);
        },
      });

      this.reportProgress({
        state: 'ready',
        progress: 100,
        message: 'Model loaded successfully',
      });
    } catch (error) {
      this.reportProgress({
        state: 'error',
        progress: 0,
        message: 'Failed to load model',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AIError('MODEL_LOAD_ERROR', 'Failed to load text generation model', error);
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  /**
   * Handle progress callbacks from transformers.js
   */
  private handleProgressCallback(progress: unknown): void {
    if (typeof progress !== 'object' || progress === null) return;

    const p = progress as {
      status?: string;
      file?: string;
      progress?: number;
      loaded?: number;
      total?: number;
    };

    const modelProgress: ModelProgress = {
      state: this.mapStatusToState(p.status),
      progress: p.progress ?? 0,
      message: this.getProgressMessage(p),
      file: p.file,
      loaded: p.loaded,
      total: p.total,
    };

    this.reportProgress(modelProgress);
  }

  /**
   * Map transformers.js status to our state enum
   */
  private mapStatusToState(status?: string): ModelProgress['state'] {
    switch (status) {
      case 'progress':
        return 'loading';
      case 'done':
        return 'ready';
      case 'error':
        return 'error';
      default:
        return 'downloading';
    }
  }

  /**
   * Get human-readable progress message
   */
  private getProgressMessage(progress: { status?: string; file?: string }): string {
    if (progress.status === 'progress') {
      return `Loading ${progress.file || 'model'}...`;
    }
    if (progress.status === 'done') {
      return 'Model ready';
    }
    return 'Initializing...';
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: ModelProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Check if model is ready
   */
  private ensureModelLoaded(): void {
    if (!this.generationPipeline) {
      throw new AIError('MODEL_NOT_LOADED', 'Model not loaded. Call initialize() first.');
    }
  }

  /**
   * Format prompt for chat models
   */
  private formatPrompt(request: GenerationRequest): string {
    const { prompt, systemPrompt } = request;

    if (systemPrompt) {
      return `<|system|>\n${systemPrompt}</s>\n<|user|>\n${prompt}</s>\n<|assistant|>\n`;
    }

    return `<|user|>\n${prompt}</s>\n<|assistant|>\n`;
  }

  /**
   * Generate text completion
   */
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    await this.initialize();
    this.ensureModelLoaded();

    const startTime = performance.now();

    try {
      const formattedPrompt = this.formatPrompt(request);
      const maxTokens = request.maxTokens ?? this.config.maxTokens;
      const temperature = request.temperature ?? this.config.temperature;
      const topP = request.topP ?? this.config.topP;

      const output = await this.generationPipeline!(formattedPrompt, {
        max_new_tokens: maxTokens,
        temperature,
        top_p: topP,
        do_sample: temperature > 0,
        return_full_text: false,
      });

      const duration = performance.now() - startTime;

      // Extract generated text
      const generatedText = Array.isArray(output)
        ? (output[0] as { generated_text: string }).generated_text
        : (output as { generated_text: string }).generated_text;

      // Clean up the response (remove prompt artifacts if any)
      const cleanText = this.cleanGeneratedText(generatedText);

      return {
        text: cleanText,
        tokensGenerated: this.estimateTokens(cleanText),
        duration: Math.round(duration),
        truncated: cleanText.length >= maxTokens * 4, // Rough estimation
      };
    } catch (error) {
      throw new AIError('GENERATION_ERROR', 'Text generation failed', error);
    }
  }

  /**
   * Stream text generation with callbacks
   */
  async generateStream(request: GenerationRequest, callback: GenerationCallback): Promise<void> {
    await this.initialize();
    this.ensureModelLoaded();

    try {
      const formattedPrompt = this.formatPrompt(request);
      const maxTokens = request.maxTokens ?? this.config.maxTokens;
      const temperature = request.temperature ?? this.config.temperature;

      // Note: Transformers.js streaming support varies by model
      // For now, we'll simulate streaming by generating and chunking
      const output = await this.generationPipeline!(formattedPrompt, {
        max_new_tokens: maxTokens,
        temperature,
        top_p: request.topP ?? this.config.topP,
        do_sample: temperature > 0,
        return_full_text: false,
      });

      const generatedText = Array.isArray(output)
        ? (output[0] as { generated_text: string }).generated_text
        : (output as { generated_text: string }).generated_text;

      const cleanText = this.cleanGeneratedText(generatedText);

      // Stream character by character for effect
      const chunkSize = 3;
      for (let i = 0; i < cleanText.length; i += chunkSize) {
        const chunk: GenerationChunk = {
          text: cleanText.slice(i, i + chunkSize),
          done: i + chunkSize >= cleanText.length,
        };
        await callback(chunk);
      }
    } catch (error) {
      throw new AIError('GENERATION_ERROR', 'Streaming generation failed', error);
    }
  }

  /**
   * Summarize text
   */
  async summarize(request: SummarizationRequest): Promise<GenerationResponse> {
    await this.initialize();

    // If we have a dedicated summarization pipeline, use it
    // Otherwise, use the generation model with a summarization prompt
    const startTime = performance.now();

    try {
      const { text, style = 'concise', maxLength = 150, minLength: _minLength = 30 } = request;

      // Truncate very long texts
      const maxInputLength = 4000;
      const truncatedText =
        text.length > maxInputLength ? text.slice(0, maxInputLength) + '...' : text;

      let prompt: string;
      switch (style) {
        case 'bullet-points':
          prompt = `Summarize the following text as bullet points:\n\n${truncatedText}\n\nBullet points summary:`;
          break;
        case 'detailed':
          prompt = `Provide a detailed summary of the following text:\n\n${truncatedText}\n\nDetailed summary:`;
          break;
        case 'concise':
        default:
          prompt = `Summarize the following text concisely:\n\n${truncatedText}\n\nSummary:`;
          break;
      }

      const result = await this.generate({
        prompt,
        maxTokens: maxLength,
        temperature: 0.3, // Lower temperature for more focused summaries
      });

      const duration = performance.now() - startTime;

      return {
        ...result,
        duration: Math.round(duration),
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      throw new AIError('GENERATION_ERROR', 'Summarization failed', error);
    }
  }

  /**
   * Clean up generated text by removing artifacts
   */
  private cleanGeneratedText(text: string): string {
    // Remove special tokens and artifacts
    let cleaned = text
      .replace(/<\|system\|>.*?<\/s>/gs, '')
      .replace(/<\|user\|>.*?<\/s>/gs, '')
      .replace(/<\|assistant\|>/g, '')
      .replace(/<\/s>/g, '')
      .replace(/<\|.*?\|>/g, '')
      .trim();

    // Remove common prefixes the model might add
    const prefixesToRemove = ['Assistant:', 'AI:', 'Bot:'];
    for (const prefix of prefixesToRemove) {
      if (cleaned.startsWith(prefix)) {
        cleaned = cleaned.slice(prefix.length).trim();
      }
    }

    return cleaned;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.generationPipeline !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<LocalLLMConfig> {
    return { ...this.config };
  }

  /**
   * Dispose of model and free memory
   */
  dispose(): void {
    this.generationPipeline = null;
    this.summarizationPipeline = null;
    this.loadingPromise = null;
  }
}
