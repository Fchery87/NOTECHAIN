import { OCRService, OCROptions, OCRResult } from './ocrService';

export type { OCROptions, OCRResult };
export { OCRService, ocrService } from './ocrService';

export async function extractTextFromImage(
  file: File,
  options: {
    language?: string;
    isHandwriting?: boolean;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<OCRResult> {
  const service = new OCRService();

  try {
    await service.initialize(options.language);

    if (options.isHandwriting) {
      return await service.recognizeHandwriting(file);
    }

    return await service.extractTextFromImage(file, {
      language: options.language,
      onProgress: options.onProgress,
    });
  } finally {
    await service.terminate();
  }
}
