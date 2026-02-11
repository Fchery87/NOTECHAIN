import { pipeline, Pipeline } from '@xenova/transformers';

export class TranscriptionService {
  private pipeline: Pipeline | null = null;
  private modelLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  get isModelLoaded(): boolean {
    return this.modelLoaded;
  }

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
      this.pipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        revision: 'main',
      });
      this.modelLoaded = true;
    } catch (error) {
      this.modelLoaded = false;
      this.loadingPromise = null;
      throw new Error(
        `Failed to load transcription model: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async transcribeAudio(audioBlob: Blob, onProgress?: (progress: number) => void): Promise<string> {
    // Auto-initialize if not already loaded
    if (!this.modelLoaded) {
      if (onProgress) onProgress(0.1);
      await this.initialize();
      if (onProgress) onProgress(0.3);
    }

    if (!this.pipeline) {
      throw new Error('Transcription model not loaded');
    }

    try {
      // Convert Blob to AudioBuffer
      const audioBuffer = await this.blobToAudioBuffer(audioBlob);

      if (onProgress) onProgress(0.5);

      // Convert AudioBuffer to Float32Array for the model
      const audioData = this.audioBufferToFloat32Array(audioBuffer);

      if (onProgress) onProgress(0.7);

      // Run transcription
      const result = await this.pipeline(audioData, {
        sampling_rate: audioBuffer.sampleRate,
      });

      if (onProgress) onProgress(1.0);

      // Extract text from result
      if (typeof result === 'object' && result !== null) {
        if ('text' in result) {
          return String(result.text).trim();
        }

        // Handle array result format
        if (Array.isArray(result) && result.length > 0 && 'text' in result[0]) {
          return String(result[0].text).trim();
        }
      }

      throw new Error('Unexpected transcription result format');
    } catch (error) {
      if (onProgress) onProgress(1.0);
      throw new Error(
        `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      throw new Error(
        `Failed to decode audio: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      // Close audio context to free resources
      audioContext.close();
    }
  }

  private audioBufferToFloat32Array(audioBuffer: AudioBuffer): Float32Array {
    // If mono, return the first channel directly
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }

    // For stereo or multi-channel, mix down to mono by averaging channels
    const length = audioBuffer.length;
    const monoData = new Float32Array(length);
    const channels: Float32Array[] = [];

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let channel = 0; channel < channels.length; channel++) {
        sum += channels[channel][i];
      }
      monoData[i] = sum / channels.length;
    }

    return monoData;
  }

  /**
   * Dispose of the model and free up memory
   */
  dispose(): void {
    this.pipeline = null;
    this.modelLoaded = false;
    this.loadingPromise = null;
  }
}

// Export singleton instance for easy access
export const transcriptionService = new TranscriptionService();
