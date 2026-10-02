import { env, Tensor } from '@huggingface/transformers';
import { configuredModelHost, modelEnvPatch } from './modelHost';

export const ONNX_RUNTIME_PATH = '/ort/';

/**
 * ONNX Runtime Web 1.22 expects feed tensors to expose `.location`, but the
 * Tensor built through this Transformers.js release can omit it, which fails
 * with `invalid data location: undefined`. Default it to CPU on the shared
 * ORT Tensor prototype.
 */
function ensureTensorLocation(): void {
  const probe = new Tensor('float32', new Float32Array([0]), [1]) as unknown as {
    ort_tensor?: object;
  };
  const ortTensor = probe.ort_tensor;
  if (!ortTensor || 'location' in ortTensor) return;

  const prototype = Object.getPrototypeOf(ortTensor) as object | null;
  if (!prototype || prototype === Object.prototype) return;
  if (Object.getOwnPropertyDescriptor(prototype, 'location')) return;

  Object.defineProperty(prototype, 'location', { configurable: true, get: () => 'cpu' });
}

const ENV_KEYS = [
  'allowLocalModels',
  'allowRemoteModels',
  'localModelPath',
  'remoteHost',
  'remotePathTemplate',
] as const;

let loadQueue: Promise<unknown> = Promise.resolve();

/**
 * Transformers.js keeps its model source in one global `env`. Apply ours only
 * while a model loads and restore it afterwards, and run loads one at a time
 * so a load that finishes cannot reset the settings under one still running.
 */
export function withOnDeviceRuntime<T>(load: () => Promise<T>): Promise<T> {
  const run = loadQueue.then(async () => {
    const previous = Object.fromEntries(ENV_KEYS.map(key => [key, env[key]]));
    Object.assign(env, modelEnvPatch(configuredModelHost()));

    const onnx = env.backends.onnx as { wasm?: { wasmPaths?: string } };
    onnx.wasm ??= {};
    onnx.wasm.wasmPaths = ONNX_RUNTIME_PATH;

    ensureTensorLocation();

    try {
      return await load();
    } finally {
      Object.assign(env, previous);
    }
  });
  loadQueue = run.catch(() => undefined);
  return run;
}
