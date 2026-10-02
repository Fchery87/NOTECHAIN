import { beforeEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = [
  'allowLocalModels',
  'allowRemoteModels',
  'localModelPath',
  'remoteHost',
  'remotePathTemplate',
] as const;

const INITIAL_ENV = {
  allowLocalModels: true,
  allowRemoteModels: true,
  localModelPath: '/models/',
  remoteHost: 'https://huggingface.co/',
  remotePathTemplate: '{model}/resolve/{revision}/',
};

const mocks = vi.hoisted(() => {
  const extractor = vi.fn(async () => ({ data: new Float32Array([0.1, 0.2, 0.3]) }));
  const env = { backends: { onnx: {} as { wasm?: { wasmPaths?: string } } } } as Record<
    string,
    unknown
  > & { backends: { onnx: { wasm?: { wasmPaths?: string } } } };

  return {
    extractor,
    env,
    delays: [] as number[],
    seen: [] as Array<Record<string, unknown>>,
    pipeline: vi.fn(),
  };
});

vi.mock('@huggingface/transformers', () => ({
  env: mocks.env,
  pipeline: mocks.pipeline,
  Tensor: class {
    ort_tensor = {};
  },
}));

import { EmbeddingService } from '../EmbeddingService';

const pickEnv = () => Object.fromEntries(ENV_KEYS.map(key => [key, mocks.env[key]]));

describe('EmbeddingService model loading', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    Object.assign(mocks.env, INITIAL_ENV);
    mocks.env.backends.onnx = {};
    mocks.delays.length = 0;
    mocks.seen.length = 0;
    mocks.pipeline.mockReset();
    mocks.pipeline.mockImplementation(async () => {
      const delay = mocks.delays.shift() ?? 0;
      for (let i = 0; i < delay; i++) await Promise.resolve();
      mocks.seen.push(pickEnv());
      return mocks.extractor;
    });
  });

  it('runs on wasm by default, since the browser build rejects "cpu"', async () => {
    await new EmbeddingService().initialize();

    expect(mocks.pipeline).toHaveBeenCalledWith(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      expect.objectContaining({ device: 'wasm', dtype: 'q8' })
    );
  });

  it('points the ONNX runtime at the vendored wasm files', async () => {
    await new EmbeddingService().initialize();

    expect(mocks.env.backends.onnx.wasm?.wasmPaths).toBe('/ort/');
  });

  it('loads only from /models/ while loading when no model host is configured', async () => {
    await new EmbeddingService().initialize();

    expect(mocks.seen[0]).toMatchObject({
      allowLocalModels: true,
      allowRemoteModels: false,
      localModelPath: '/models/',
    });
  });

  it('loads only from the configured model host while loading', async () => {
    vi.stubEnv('NEXT_PUBLIC_MODEL_HOST', 'https://models.example.com');
    await new EmbeddingService().initialize();

    expect(mocks.seen[0]).toMatchObject({
      allowLocalModels: false,
      allowRemoteModels: true,
      remoteHost: 'https://models.example.com/',
      remotePathTemplate: '{model}/',
    });
  });

  it('restores the shared loader settings once the model has loaded', async () => {
    vi.stubEnv('NEXT_PUBLIC_MODEL_HOST', 'https://models.example.com');
    await new EmbeddingService().initialize();

    expect(pickEnv()).toEqual(INITIAL_ENV);
  });

  it('restores the shared loader settings when loading fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_MODEL_HOST', 'https://models.example.com');
    mocks.pipeline.mockRejectedValueOnce(new Error('network down'));

    await expect(new EmbeddingService().initialize()).rejects.toThrow(
      'Failed to load embedding model'
    );
    expect(pickEnv()).toEqual(INITIAL_ENV);
  });

  it('keeps the host settings for every service when two load at once', async () => {
    vi.stubEnv('NEXT_PUBLIC_MODEL_HOST', 'https://models.example.com');
    mocks.delays.push(1, 6);

    await Promise.all([new EmbeddingService().initialize(), new EmbeddingService().initialize()]);

    expect(mocks.seen).toHaveLength(2);
    for (const seen of mocks.seen) {
      expect(seen).toMatchObject({
        allowRemoteModels: true,
        remoteHost: 'https://models.example.com/',
      });
    }
    expect(pickEnv()).toEqual(INITIAL_ENV);
  });
});
