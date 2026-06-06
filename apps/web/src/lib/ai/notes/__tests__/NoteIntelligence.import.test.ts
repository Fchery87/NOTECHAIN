import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const NOTE_AI_FILES = [
  'src/lib/ai/notes/NoteIntelligence.ts',
  'src/lib/ai/notes/LinkSuggester.ts',
  'src/lib/ai/notes/RelatedNotesFinder.ts',
];

describe('note AI browser bundle boundaries', () => {
  it('does not import the workspace AI engine into web note intelligence modules', () => {
    for (const file of NOTE_AI_FILES) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source).not.toContain('@notechain/ai-engine');
    }
  });
});
