import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Downloads the on-device model files from Hugging Face into
 * `<outDir>/<model id>/<file>`, the layout NEXT_PUBLIC_MODEL_HOST expects.
 * Upload the output directory to the bucket root.
 */
export const MODELS: Record<string, string[]> = {
  'Xenova/all-MiniLM-L6-v2': [
    'config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'special_tokens_map.json',
    'onnx/model_quantized.onnx',
  ],
};

export function fileUrl(modelId: string, file: string): string {
  return `https://huggingface.co/${modelId}/resolve/main/${file}`;
}

if (import.meta.main) {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('usage: bun scripts/models/fetch-models.ts <outDir>');
    process.exit(1);
  }

  for (const [modelId, files] of Object.entries(MODELS)) {
    for (const file of files) {
      const response = await fetch(fileUrl(modelId, file));
      if (!response.ok) throw new Error(`${response.status} for ${fileUrl(modelId, file)}`);
      const target = join(outDir, modelId, file);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, new Uint8Array(await response.arrayBuffer()));
      console.log(`${modelId}/${file}`);
    }
  }
}
