import { describe, expect, test } from 'bun:test';
import { findDuplicates } from './check-lock-singletons';

const entry = (key: string, spec: string) => `    "${key}": ["${spec}", "", {}, "sha512-x"],\n`;

describe('findDuplicates', () => {
  test('reports a hoisted and a nested copy at different versions', () => {
    const lock =
      entry('prosemirror-model', 'prosemirror-model@1.25.12') +
      entry('prosemirror-state/prosemirror-model', 'prosemirror-model@1.25.4') +
      entry('orderedmap', 'orderedmap@2.1.1');
    expect(findDuplicates(lock, ['prosemirror-model'])).toEqual({
      'prosemirror-model': ['1.25.12', '1.25.4'],
    });
  });

  test('ignores the same version listed under several nested keys', () => {
    const lock =
      entry('@tiptap/core', '@tiptap/core@3.31.4') + entry('x/@tiptap/core', '@tiptap/core@3.31.4');
    expect(findDuplicates(lock, ['@tiptap/core'])).toEqual({});
  });

  test('keeps scoped package names intact and skips unlisted packages', () => {
    const lock =
      entry('@tiptap/core', '@tiptap/core@3.31.4') +
      entry('minimatch', 'minimatch@3.1.5') +
      entry('x/minimatch', 'minimatch@10.2.6');
    expect(findDuplicates(lock, ['@tiptap/core'])).toEqual({});
  });
});
