import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const publicDir = join(process.cwd(), 'public');
const serviceWorker = readFileSync(join(publicDir, 'sw.js'), 'utf8');
const offlinePage = readFileSync(join(publicDir, 'offline.html'), 'utf8');

describe('PWA service worker static contract', () => {
  it('precaches the core app shell and offline fallback', () => {
    expect(serviceWorker).toContain('APP_SHELL_ASSETS');
    expect(serviceWorker).toContain("'/notes'");
    expect(serviceWorker).toContain("'/settings'");
    expect(serviceWorker).toContain("'/offline.html'");
    expect(serviceWorker).toContain("'/manifest.json'");
  });

  it('handles navigation requests with an offline fallback chain', () => {
    expect(serviceWorker).toMatch(/request\.mode\s*===\s*['"]navigate['"]/);
    expect(serviceWorker).toContain('navigationNetworkFirst');
    expect(serviceWorker).toContain("cache.match('/notes')");
    expect(serviceWorker).toContain("cache.match('/offline.html')");
    expect(serviceWorker).toContain('NoteChain is offline');
  });

  it('uses versioned caches and removes old cache versions on activate', () => {
    expect(serviceWorker).toContain('CACHE_VERSION');
    expect(serviceWorker).toContain('expectedCaches');
    expect(serviceWorker).toContain('caches.delete');
    expect(serviceWorker).toContain('self.clients.claim()');
  });

  it('includes a standalone offline page', () => {
    expect(offlinePage).toContain('<title>NoteChain Offline</title>');
    expect(offlinePage).toContain('Offline mode');
    expect(offlinePage).toContain('Open Notes');
  });
});
