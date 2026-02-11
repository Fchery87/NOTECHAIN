const CACHE_NAMES = {
  static: 'notechain-static-v1',
  images: 'notechain-images-v1',
  api: 'notechain-api-v1',
  appShell: 'notechain-app-shell-v1',
};

// eslint-disable-next-line no-unused-vars
const CACHE_EXPIRATION = {
  static: 30 * 24 * 60 * 60,
  images: 7 * 24 * 60 * 60,
  api: 5 * 60,
  appShell: 24 * 60 * 60,
};

// Precache core assets
const PRECACHE_ASSETS = ['/', '/index.html'];

// Install event - precache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAMES.appShell)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => !Object.values(CACHE_NAMES).includes(name))
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Static assets - Cache first
  if (/\.(js|css|woff2?|ttf|otf|eot)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static));
    return;
  }

  // Images - Stale while revalidate
  if (/\.(png|jpg|jpeg|gif|svg|webp|avif)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.images));
    return;
  }

  // API - Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, CACHE_NAMES.api));
    return;
  }
});

// Cache strategies
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
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

// Message handling
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
