import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const extractor = vi.fn(async () => ({ data: new Float32Array([0.1, 0.2, 0.3]) }));
  return {
    extractor,
    pipeline: vi.fn(async () => extractor),
    env: {
      allowLocalModels: true,
      allowRemoteModels: true,
      backends: { onnx: {} as { wasm?: { wasmPaths?: string } } },
    } as Record<string, unknown> & { backends: { onnx: { wasm?: { wasmPaths?: string } } } },
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

describe('EmbeddingService model loading', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mocks.pipeline.mockClear();
    mocks.env.allowLocalModels = true;
    mocks.env.allowRemoteModels = true;
    delete mocks.env.remoteHost;
    mocks.env.backends.onnx = {};
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

  it('loads only from /models/ when no model host is configured', async () => {
    await new EmbeddingService().initialize();

    expect(mocks.env).toMatchObject({
      allowLocalModels: true,
      allowRemoteModels: false,
      localModelPath: '/models/',
    });
  });

  it('loads only from the configured model host', async () => {
    vi.stubEnv('NEXT_PUBLIC_MODEL_HOST', 'https://models.example.com');
    await new EmbeddingService().initialize();

    expect(mocks.env).toMatchObject({
      allowLocalModels: false,
      allowRemoteModels: true,
      remoteHost: 'https://models.example.com/',
      remotePathTemplate: '{model}/',
    });
  });
});
