import { describe, expect, it, vi } from 'vitest';
import { createQuickCaptureDraft, quickCaptureSearchParams } from '../quickCapture';

describe('quick capture helpers', () => {
  it('creates an inbox capture draft from shared text and URL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));

    const draft = createQuickCaptureDraft({
      title: 'Shared title',
      text: 'Shared text',
      url: 'https://example.com',
    });

    expect(draft.title).toBe('Shared title');
    expect(draft.content).toContain('_Captured to NoteChain Inbox_');
    expect(draft.content).toContain('Captured: 2026-04-01T00:00:00.000Z');
    expect(draft.content).toContain('Shared text');
    expect(draft.content).toContain('Source: https://example.com');

    vi.useRealTimers();
  });

  it('falls back to Inbox Capture title', () => {
    expect(createQuickCaptureDraft({ text: 'hello' }).title).toBe('Inbox Capture');
  });

  it('extracts Web Share Target search params', () => {
    const params = new URLSearchParams({ title: 'T', text: 'Body', url: 'https://example.com' });

    expect(quickCaptureSearchParams(params)).toEqual({
      title: 'T',
      text: 'Body',
      url: 'https://example.com',
    });
  });
});
