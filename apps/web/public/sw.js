const CACHE_VERSION = 'v2';
const CACHE_NAMES = {
  static: `notechain-static-${CACHE_VERSION}`,
  images: `notechain-images-${CACHE_VERSION}`,
  api: `notechain-api-${CACHE_VERSION}`,
  appShell: `notechain-app-shell-${CACHE_VERSION}`,
};

const APP_SHELL_ASSETS = ['/', '/notes', '/settings', '/quick-capture', '/offline.html', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAMES.appShell)
      .then(cache => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const expectedCaches = new Set(Object.values(CACHE_NAMES));

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames =>
        Promise.all(cacheNames.filter(name => !expectedCaches.has(name)).map(name => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationNetworkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || /\.(js|css|woff2?|ttf|otf|eot)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static));
    return;
  }

  if (/\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.images));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, CACHE_NAMES.api));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.appShell));
});

async function navigationNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAMES.appShell);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match('/notes')) ||
      (await cache.match('/')) ||
      (await cache.match('/offline.html')) ||
      new Response('NoteChain is offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
