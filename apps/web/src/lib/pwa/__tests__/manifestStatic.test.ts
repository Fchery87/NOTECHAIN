import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const manifest = JSON.parse(readFileSync(join(process.cwd(), 'public/manifest.json'), 'utf8'));
const serviceWorker = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');

describe('PWA manifest static contract', () => {
  it('declares quick-capture as a Web Share Target', () => {
    expect(manifest.share_target).toEqual({
      action: '/quick-capture',
      method: 'GET',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    });
  });

  it('pre-caches the quick-capture route in the app shell', () => {
    expect(serviceWorker).toContain("'/quick-capture'");
  });
});
