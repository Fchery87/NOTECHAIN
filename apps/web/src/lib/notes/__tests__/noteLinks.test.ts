import { describe, expect, it } from 'vitest';
import { noteHref, notePlainText } from '../noteLinks';

describe('noteLinks', () => {
  it('encodes the note id in its link', () => {
    expect(noteHref('a b/c')).toBe('/notes?id=a%20b%2Fc');
  });

  it('keeps blocks apart when stripping tags', () => {
    expect(notePlainText('<h2>Plan</h2><p>Ship&nbsp;it</p><ul><li>one</li><li>two</li></ul>')).toBe(
      'Plan Ship it one two'
    );
  });

  it('keeps an unclosed < as text', () => {
    expect(notePlainText('<p>2 < 3</p>')).toBe('2 < 3');
  });

  it('keeps a stray tag opener when no tag ever closes', () => {
    expect(notePlainText('<p>a <b and more')).toBe('a <b and more');
  });

  it('handles empty input', () => {
    expect(notePlainText('')).toBe('');
  });

  it('stays fast on input with many repeated <', () => {
    const start = performance.now();
    expect(notePlainText('<'.repeat(200_000))).toHaveLength(200_000);
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('stays fast on repeated unterminated tag openers', () => {
    const start = performance.now();
    notePlainText('<a'.repeat(100_000));
    expect(performance.now() - start).toBeLessThan(500);
  });
});
