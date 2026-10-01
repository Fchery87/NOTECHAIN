import { readFileSync } from 'node:fs';

/**
 * Packages that break at runtime when two copies are bundled, because they
 * rely on identity checks or module-level state. Jsdom tests resolve one
 * copy and cannot see a duplicate.
 */
export const SINGLETON_PACKAGES = [
  'prosemirror-model',
  'prosemirror-state',
  'prosemirror-transform',
  'prosemirror-view',
  '@tiptap/core',
  'react',
  'react-dom',
] as const;

const LOCK_ENTRY = /^\s+"[^"]+": \["([^"]+)", /;

export function findDuplicates(
  lockText: string,
  names: readonly string[]
): Record<string, string[]> {
  const versions = new Map<string, Set<string>>();
  for (const line of lockText.split('\n')) {
    const spec = LOCK_ENTRY.exec(line)?.[1];
    if (!spec) continue;
    const at = spec.lastIndexOf('@');
    const name = spec.slice(0, at);
    if (!names.includes(name)) continue;
    versions.set(name, (versions.get(name) ?? new Set()).add(spec.slice(at + 1)));
  }
  const duplicates: Record<string, string[]> = {};
  for (const [name, found] of versions) {
    if (found.size > 1) duplicates[name] = [...found].sort();
  }
  return duplicates;
}

if (import.meta.main) {
  const lockPath = process.argv[2] ?? 'bun.lock';
  const duplicates = findDuplicates(readFileSync(lockPath, 'utf8'), SINGLETON_PACKAGES);
  const names = Object.keys(duplicates);
  if (names.length === 0) {
    console.log(`${lockPath}: one copy of each singleton package.`);
  } else {
    for (const name of names) {
      console.error(`${name} resolves to ${duplicates[name].join(', ')}`);
    }
    console.error(
      `\nTwo copies of a singleton package load in the browser and fail at runtime.` +
        `\nRe-resolve the nested pins listed above so each package resolves once.`
    );
    process.exit(1);
  }
}
