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
      // Convert Blob to AudioBuffer with format handling
      const audioBuffer = await this.blobToAudioBuffer(audioBlob);

      if (onProgress) onProgress(0.5);

      // Convert AudioBuffer to Float32Array for the model
      const audioData = this.audioBufferToFloat32Array(audioBuffer);

      if (onProgress) onProgress(0.7);

      // Run transcription
      const result = await this.pipeline(audioData, {
        sampling_rate: 16000, // Whisper expects 16kHz
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

  /**
   * Convert audio blob to AudioBuffer, handling various formats
   * Falls back to manual decoding for unsupported formats like webm/opus
   */
  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    try {
      // First try direct decoding (works for WAV, MP3, OGG in most browsers)
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (directDecodeError) {
      // If direct decoding fails (common for webm/opus), try alternative approach
      console.warn('Direct audio decode failed, attempting format conversion:', directDecodeError);

      try {
        // Resample to 16kHz mono using AudioContext
        const audioBuffer = await this.decodeViaAudioElement(blob, audioContext);
        return audioBuffer;
      } catch (conversionError) {
        throw new Error(
          `Failed to decode audio format. Supported formats: WAV, MP3, OGG. Received: ${blob.type}. Error: ${
            conversionError instanceof Error ? conversionError.message : 'Unknown error'
          }`
        );
      }
    } finally {
      // Close audio context to free resources
      audioContext.close();
    }
  }

  /**
   * Alternative decoding method using Audio element for format conversion
   * This handles webm/opus and other formats that decodeAudioData doesn't support
   */
  private async decodeViaAudioElement(
    blob: Blob,
    audioContext: AudioContext
  ): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio();

      audio.oncanplaythrough = async () => {
        try {
          // Create a MediaElementAudioSourceNode
          const source = audioContext.createMediaElementSource(audio);
          const destination = audioContext.createMediaStreamDestination();
          source.connect(destination);

          // Use AudioWorklet or ScriptProcessor to capture raw audio data
          const audioBuffer = await this.captureAudioData(audio, audioContext);

          URL.revokeObjectURL(url);
          resolve(audioBuffer);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load audio from blob (type: ${blob.type})`));
      };

      audio.src = url;
      audio.load();
    });
  }

  /**
   * Capture audio data from an audio element using OfflineAudioContext
   */
  private async captureAudioData(
    audio: HTMLAudioElement,
    _audioContext: AudioContext
  ): Promise<AudioBuffer> {
    // Wait for audio to be ready
    if (audio.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject(new Error('Audio failed to load'));
        audio.load();
      });
    }

    const duration = audio.duration;
    if (!duration || !isFinite(duration) || duration === 0) {
      throw new Error('Invalid audio duration');
    }

    // Create offline context for rendering at 16kHz mono (Whisper requirement)
    const offlineContext = new OfflineAudioContext(1, Math.ceil(duration * 16000), 16000);

    // Fetch and decode the audio data directly
    const response = await fetch(audio.src);
    const arrayBuffer = await response.arrayBuffer();

    try {
      // Try to decode in the offline context
      const decodedBuffer = await offlineContext.decodeAudioData(arrayBuffer);

      // If stereo or multi-channel, mix down to mono
      if (decodedBuffer.numberOfChannels > 1) {
        return this.mixToMono(decodedBuffer, offlineContext);
      }

      return decodedBuffer;
    } catch {
      // If offline context fails, try with the original audio context sample rate
      // then resample
      const tempContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      try {
        const decodedBuffer = await tempContext.decodeAudioData(arrayBuffer);
        return this.resampleTo16kMono(decodedBuffer);
      } finally {
        tempContext.close();
      }
    }
  }

  /**
   * Mix multi-channel audio to mono
   */
  private mixToMono(buffer: AudioBuffer, context: OfflineAudioContext | AudioContext): AudioBuffer {
    const monoBuffer = context.createBuffer(1, buffer.length, buffer.sampleRate);
    const monoData = monoBuffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      let sum = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        sum += buffer.getChannelData(channel)[i];
      }
      monoData[i] = sum / buffer.numberOfChannels;
    }

    return monoBuffer;
  }

  /**
   * Resample audio buffer to 16kHz mono for Whisper
   */
  private resampleTo16kMono(buffer: AudioBuffer): AudioBuffer {
    const targetSampleRate = 16000;
    const offlineContext = new OfflineAudioContext(
      1,
      Math.ceil(buffer.duration * targetSampleRate),
      targetSampleRate
    );

    // Create a new buffer with the source data
    const sourceBuffer = offlineContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      sourceBuffer.copyToChannel(buffer.getChannelData(channel), channel);
    }

    // Return a properly formatted buffer
    const outputBuffer = offlineContext.createBuffer(
      1,
      Math.ceil(buffer.duration * targetSampleRate),
      targetSampleRate
    );
    const outputData = outputBuffer.getChannelData(0);

    // Simple linear interpolation resampling
    const ratio = buffer.sampleRate / targetSampleRate;
    const inputLength = buffer.length;

    for (let i = 0; i < outputData.length; i++) {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;

      if (index + 1 < inputLength) {
        // Mix all channels to mono while resampling
        let sample = 0;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          sample += channelData[index] * (1 - fraction) + channelData[index + 1] * fraction;
        }
        outputData[i] = sample / buffer.numberOfChannels;
      } else if (index < inputLength) {
        let sample = 0;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          sample += buffer.getChannelData(channel)[index];
        }
        outputData[i] = sample / buffer.numberOfChannels;
      }
    }

    return outputBuffer;
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
