import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HuggingFaceTranscriptionService,
  MOONSHINE_CHUNK_SECONDS,
  MOONSHINE_MIN_NEW_TOKENS,
  TARGET_SAMPLE_RATE,
} from '../huggingfaceTranscriptionService';

// Capture the audio data the model actually receives so we can assert it was
// resampled to 16 kHz before inference (the bug was feeding native-rate audio,
// which made Moonshine return an empty transcript).
const mocks = vi.hoisted(() => ({
  pipelineInstance: vi.fn(),
  pipeline: vi.fn(),
}));

vi.mock('@huggingface/transformers', () => {
  class FakeTensor {
    constructor(
      public type: string,
      public data: unknown,
      public dims: number[]
    ) {}
    // Already exposes `location`, so ensureOnnxTensorLocationCompatibility() is a
    // no-op and never patches Object.prototype during the test.
    get ort_tensor() {
      return { location: 'cpu' };
    }
  }

  return {
    env: {
      allowLocalModels: true,
      allowRemoteModels: false,
      useBrowserCache: true,
      useCustomCache: false,
      backends: { onnx: { wasm: {} } },
    },
    pipeline: mocks.pipeline,
    Tensor: FakeTensor,
  };
});

const NATIVE_RATE = 48000;
const NATIVE_SAMPLES = NATIVE_RATE; // 1 second
const RESAMPLED_SAMPLES = TARGET_SAMPLE_RATE; // 1 second at 16 kHz

const nativeChannel = new Float32Array(NATIVE_SAMPLES).fill(0.9);
const resampledChannel = new Float32Array(RESAMPLED_SAMPLES).fill(0.25);

const decodedBuffer = {
  length: NATIVE_SAMPLES,
  duration: 1,
  sampleRate: NATIVE_RATE,
  numberOfChannels: 1,
  getChannelData: vi.fn().mockReturnValue(nativeChannel),
};

const resampledBuffer = {
  length: RESAMPLED_SAMPLES,
  duration: 1,
  sampleRate: TARGET_SAMPLE_RATE,
  numberOfChannels: 1,
  getChannelData: vi.fn().mockReturnValue(resampledChannel),
};

let offlineCtorArgs: number[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  offlineCtorArgs = [];

  mocks.pipeline.mockResolvedValue(mocks.pipelineInstance);
  mocks.pipelineInstance.mockResolvedValue({ text: 'fellow americans' });

  (globalThis as any).AudioContext = vi.fn(function () {
    return {
      sampleRate: NATIVE_RATE,
      decodeAudioData: vi.fn().mockResolvedValue(decodedBuffer),
      close: vi.fn(),
    };
  });

  (globalThis as any).OfflineAudioContext = vi.fn(function (
    channels: number,
    length: number,
    rate: number
  ) {
    offlineCtorArgs = [channels, length, rate];
    return {
      destination: {},
      createBufferSource: () => ({ buffer: null, connect: vi.fn(), start: vi.fn() }),
      startRendering: vi.fn().mockResolvedValue(resampledBuffer),
    };
  });
});

describe('HuggingFaceTranscriptionService audio resampling', () => {
  it('resamples native-rate audio to 16 kHz before inference', async () => {
    const service = new HuggingFaceTranscriptionService();
    const blob = new Blob([new ArrayBuffer(16)], { type: 'audio/webm' });

    const text = await service.transcribeAudio(blob);

    // Resampling path was used and targeted 16 kHz mono.
    expect((globalThis as any).OfflineAudioContext).toHaveBeenCalled();
    expect(offlineCtorArgs[0]).toBe(1); // mono
    expect(offlineCtorArgs[2]).toBe(TARGET_SAMPLE_RATE); // 16 kHz

    // The model received the resampled 16 kHz audio, NOT the native-rate audio.
    const audioArg = mocks.pipelineInstance.mock.calls[0][0] as Float32Array;
    expect(audioArg).toBe(resampledChannel);
    expect(audioArg.length).toBe(TARGET_SAMPLE_RATE);
    expect(audioArg.length).not.toBe(NATIVE_SAMPLES);

    expect(text).toBe('fellow americans');
  });

  it('uses a non-zero Moonshine token budget for short recordings', async () => {
    const service = new HuggingFaceTranscriptionService();
    const blob = new Blob([new ArrayBuffer(16)], { type: 'audio/webm' });

    await service.transcribeAudio(blob);

    expect(mocks.pipelineInstance.mock.calls[0][1]).toMatchObject({
      max_new_tokens: MOONSHINE_MIN_NEW_TOKENS,
    });
  });

  it('chunks longer Moonshine recordings before inference', async () => {
    const longSamples = Math.floor(TARGET_SAMPLE_RATE * 20.5);
    const longChannel = new Float32Array(longSamples).fill(0.2);

    (globalThis as any).AudioContext = vi.fn(function () {
      return {
        sampleRate: TARGET_SAMPLE_RATE,
        decodeAudioData: vi.fn().mockResolvedValue({
          length: longSamples,
          duration: 20.5,
          sampleRate: TARGET_SAMPLE_RATE,
          numberOfChannels: 1,
          getChannelData: vi.fn().mockReturnValue(longChannel),
        }),
        close: vi.fn(),
      };
    });

    mocks.pipelineInstance
      .mockResolvedValueOnce({ text: 'first chunk' })
      .mockResolvedValueOnce({ text: 'second chunk' })
      .mockResolvedValueOnce({ text: 'final chunk' });

    const service = new HuggingFaceTranscriptionService();
    const blob = new Blob([new ArrayBuffer(16)], { type: 'audio/webm' });

    await expect(service.transcribeAudio(blob)).resolves.toBe(
      'first chunk second chunk final chunk'
    );

    expect(mocks.pipelineInstance).toHaveBeenCalledTimes(3);
    expect((mocks.pipelineInstance.mock.calls[0][0] as Float32Array).length).toBe(
      TARGET_SAMPLE_RATE * MOONSHINE_CHUNK_SECONDS
    );
  });

  it('surfaces an actionable error when Moonshine returns an empty transcript', async () => {
    mocks.pipelineInstance.mockResolvedValueOnce({ text: '   ' });
    const service = new HuggingFaceTranscriptionService();
    const blob = new Blob([new ArrayBuffer(16)], { type: 'audio/webm' });

    await expect(service.transcribeAudio(blob)).rejects.toThrow(
      'The local transcription model returned an empty transcript'
    );
  });

  it('skips resampling when the decoded audio is already 16 kHz', async () => {
    (globalThis as any).AudioContext = vi.fn(function () {
      return {
        sampleRate: TARGET_SAMPLE_RATE,
        decodeAudioData: vi.fn().mockResolvedValue({
          ...decodedBuffer,
          sampleRate: TARGET_SAMPLE_RATE,
          length: RESAMPLED_SAMPLES,
          getChannelData: vi.fn().mockReturnValue(resampledChannel),
        }),
        close: vi.fn(),
      };
    });

    const service = new HuggingFaceTranscriptionService();
    const blob = new Blob([new ArrayBuffer(16)], { type: 'audio/webm' });

    await service.transcribeAudio(blob);

    expect((globalThis as any).OfflineAudioContext).not.toHaveBeenCalled();
    const audioArg = mocks.pipelineInstance.mock.calls[0][0] as Float32Array;
    expect(audioArg).toBe(resampledChannel);
  });
});
