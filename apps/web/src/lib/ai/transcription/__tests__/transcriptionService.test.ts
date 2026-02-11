import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranscriptionService } from '../transcriptionService';

// Mock @xenova/transformers
const mockPipeline = vi.fn();
const mockPipelineInstance = vi.fn();

vi.mock('@xenova/transformers', () => ({
  pipeline: mockPipeline,
}));

// Mock AudioContext
const mockAudioBuffer = {
  length: 1000,
  sampleRate: 44100,
  numberOfChannels: 1,
  getChannelData: vi.fn().mockReturnValue(new Float32Array(1000).fill(0.5)),
};

const mockDecodeAudioData = vi.fn().mockResolvedValue(mockAudioBuffer);
const mockAudioContextClose = vi.fn();

const MockAudioContext = vi.fn().mockImplementation(() => ({
  decodeAudioData: mockDecodeAudioData,
  close: mockAudioContextClose,
}));

(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).webkitAudioContext = MockAudioContext;

// Also set on window if it exists
if (typeof window !== 'undefined') {
  (window as any).AudioContext = MockAudioContext;
  (window as any).webkitAudioContext = MockAudioContext;
}

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TranscriptionService();
    mockPipeline.mockResolvedValue(mockPipelineInstance);
    mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);
  });

  describe('initialization', () => {
    it('should create a TranscriptionService instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TranscriptionService);
    });

    it('should have transcribeAudio method', () => {
      expect(typeof service.transcribeAudio).toBe('function');
    });

    it('should have isModelLoaded property', () => {
      expect(service.isModelLoaded).toBeDefined();
      expect(typeof service.isModelLoaded).toBe('boolean');
    });

    it('should return false for isModelLoaded before initialization', () => {
      expect(service.isModelLoaded).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should load the Whisper model on initialize', async () => {
      await service.initialize();

      expect(mockPipeline).toHaveBeenCalledWith(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny.en',
        {
          revision: 'main',
        }
      );
    });

    it('should set modelLoaded to true after successful initialization', async () => {
      expect(service.isModelLoaded).toBe(false);
      await service.initialize();
      expect(service.isModelLoaded).toBe(true);
    });

    it('should only load model once even if called multiple times', async () => {
      await service.initialize();
      await service.initialize();
      await service.initialize();

      expect(mockPipeline).toHaveBeenCalledTimes(1);
    });
  });

  describe('transcribeAudio', () => {
    it('should transcribe audio and return text', async () => {
      mockPipelineInstance.mockResolvedValue({
        text: 'Hello world',
      });

      await service.initialize();
      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });
      const result = await service.transcribeAudio(audioBlob);

      expect(result).toBe('Hello world');
    });

    it('should call onProgress with loading progress', async () => {
      mockPipelineInstance.mockResolvedValue({
        text: 'Test transcription',
      });

      const onProgress = vi.fn();
      await service.initialize();

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });
      await service.transcribeAudio(audioBlob, onProgress);

      // Progress should be called at least twice (start and complete)
      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should handle errors gracefully', async () => {
      mockPipelineInstance.mockRejectedValue(new Error('Transcription failed'));

      await service.initialize();
      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });

      await expect(service.transcribeAudio(audioBlob)).rejects.toThrow('Transcription failed');
    });

    it('should auto-initialize if not already initialized', async () => {
      mockPipelineInstance.mockResolvedValue({
        text: 'Auto initialized',
      });

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });
      const result = await service.transcribeAudio(audioBlob);

      expect(mockPipeline).toHaveBeenCalledTimes(1);
      expect(result).toBe('Auto initialized');
    });

    it('should handle audio blob conversion correctly', async () => {
      mockPipelineInstance.mockResolvedValue({
        text: 'Converted audio',
      });

      await service.initialize();

      // Create a mock audio blob
      const audioBuffer = new ArrayBuffer(1000);
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

      await service.transcribeAudio(audioBlob);

      // Verify pipeline was called with audio data
      expect(mockPipelineInstance).toHaveBeenCalledWith(
        expect.any(Float32Array),
        expect.objectContaining({
          sampling_rate: 44100,
        })
      );
    });
  });
});
