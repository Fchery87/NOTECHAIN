import { getPrdAiProvider } from './providers';
import type { GeneratePrdAiInput, GeneratePrdAiResult } from './types';

export async function generatePrdWithAi(input: GeneratePrdAiInput): Promise<GeneratePrdAiResult> {
  const provider = getPrdAiProvider();
  return provider.generatePrd(input);
}
