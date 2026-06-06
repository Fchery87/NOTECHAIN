export const CORE_ROUTE_FILES = [
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/notes/page.tsx',
  'src/app/settings/page.tsx',
  'src/app/quick-capture/page.tsx',
  'src/components/AppLayout.tsx',
] as const;

export const HEAVY_IMPORT_PATTERNS = [
  '@huggingface/transformers',
  '@xenova/transformers',
  'tesseract.js',
  'cytoscape',
  'pdf-lib',
  'recharts',
] as const;

export interface StaticImportBudgetViolation {
  file: string;
  pattern: string;
}

export function findStaticImportBudgetViolations(
  files: Array<{ path: string; content: string }>,
  heavyPatterns: readonly string[] = HEAVY_IMPORT_PATTERNS
): StaticImportBudgetViolation[] {
  const violations: StaticImportBudgetViolation[] = [];

  for (const file of files) {
    for (const pattern of heavyPatterns) {
      const staticImportPattern = new RegExp(
        `(?:import\\s+(?:[^'\"]+?\\s+from\\s+)?|require\\()(['\"])${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`,
        'm'
      );
      if (staticImportPattern.test(file.content)) {
        violations.push({ file: file.path, pattern });
      }
    }
  }

  return violations;
}
