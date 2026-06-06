import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CORE_ROUTE_FILES, findStaticImportBudgetViolations } from '../staticImportBudget';

describe('static import performance budget', () => {
  it('detects heavy static imports', () => {
    expect(
      findStaticImportBudgetViolations([
        {
          path: 'src/app/notes/page.tsx',
          content: "import { pipeline } from '@xenova/transformers';",
        },
      ])
    ).toEqual([{ file: 'src/app/notes/page.tsx', pattern: '@xenova/transformers' }]);
  });

  it('keeps core app shell and routes free of heavy static imports', () => {
    const files = CORE_ROUTE_FILES.filter(path => existsSync(join(process.cwd(), path))).map(
      path => ({
        path,
        content: readFileSync(join(process.cwd(), path), 'utf8'),
      })
    );

    expect(findStaticImportBudgetViolations(files)).toEqual([]);
  });
});
