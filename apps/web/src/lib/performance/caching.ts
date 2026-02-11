/**
 * Service Worker and caching configuration
 *
 * This module provides caching strategies and service worker setup
 * for optimal performance and offline support.
 */

/**
 * Cache names for different types of assets
 */
export const CACHE_NAMES = {
  /** Static assets (JS, CSS, fonts) */
  static: 'notechain-static-v1',
  /** Images and media */
  images: 'notechain-images-v1',
  /** API responses */
  api: 'notechain-api-v1',
  /** App shell (core HTML/JS) */
  appShell: 'notechain-app-shell-v1',
} as const;

/**
 * Cache expiration times (in seconds)
 */
export const CACHE_EXPIRATION = {
  /** Static assets: 30 days */
  static: 30 * 24 * 60 * 60,
  /** Images: 7 days */
  images: 7 * 24 * 60 * 60,
  /** API responses: 5 minutes */
  api: 5 * 60,
  /** App shell: 1 day */
  appShell: 24 * 60 * 60,
} as const;

/**
 * Cache strategies
 */
export type CacheStrategy =
  | 'cache-first'
  | 'network-first'
  | 'stale-while-revalidate'
  | 'network-only'
  | 'cache-only';

/**
 * Route configuration for caching
 */
export interface CacheRoute {
  /** URL pattern to match */
  urlPattern: RegExp;
  /** Cache strategy */
  strategy: CacheStrategy;
  /** Cache name */
  cacheName: string;
  /** Expiration time (seconds) */
  maxAge?: number;
  /** Max number of entries */
  maxEntries?: number;
}

/**
 * Default caching routes
 */
export const defaultCacheRoutes: CacheRoute[] = [
  // Static assets - Cache first with long expiration
  {
    urlPattern: /\.(js|css)$/,
    strategy: 'cache-first',
    cacheName: CACHE_NAMES.static,
    maxAge: CACHE_EXPIRATION.static,
  },
  // Fonts - Cache first
  {
    urlPattern: /\.(woff2?|ttf|otf|eot)$/,
    strategy: 'cache-first',
    cacheName: CACHE_NAMES.static,
    maxAge: CACHE_EXPIRATION.static,
  },
  // Images - Stale while revalidate
  {
    urlPattern: /\.(png|jpg|jpeg|gif|svg|webp|avif)$/,
    strategy: 'stale-while-revalidate',
    cacheName: CACHE_NAMES.images,
    maxAge: CACHE_EXPIRATION.images,
    maxEntries: 100,
  },
  // API calls - Network first with fallback
  {
    urlPattern: /\/api\//,
    strategy: 'network-first',
    cacheName: CACHE_NAMES.api,
    maxAge: CACHE_EXPIRATION.api,
    maxEntries: 50,
  },
  // App shell - Cache first
  {
    urlPattern: /\/$/,
    strategy: 'cache-first',
    cacheName: CACHE_NAMES.appShell,
    maxAge: CACHE_EXPIRATION.appShell,
  },
];

/**
 * Service Worker registration options
 */
export interface ServiceWorkerOptions {
  /** Service worker scope */
  scope?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Update check interval (ms) */
  updateInterval?: number;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(
  options: ServiceWorkerOptions = {}
): Promise<ServiceWorkerRegistration | null> {
  const { scope = '/', debug = false, updateInterval = 60 * 60 * 1000 } = options;

  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) {
    if (debug) console.log('[SW] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope,
    });

    if (debug) {
      console.log('[SW] Registered:', registration.scope);
    }

    // Set up update checking
    if (updateInterval > 0) {
      setInterval(() => {
        registration.update();
      }, updateInterval);
    }

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          if (debug) console.log('[SW] New version available');

          // Dispatch event for app to handle
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    return result;
  } catch (error) {
    console.error('[SW] Unregistration failed:', error);
    return false;
  }
}

/**
 * Skip waiting for new service worker
 */
export async function skipWaiting(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Check if app is offline
 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Subscribe to online/offline events
 */
export function subscribeToNetworkStatus(callbacks: {
  onOnline?: () => void;
  onOffline?: () => void;
}): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callbacks.onOnline?.();
  const handleOffline = () => callbacks.onOffline?.();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Cache API helpers
 */

/**
 * Open cache by name
 */
export async function openCache(cacheName: string): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  return caches.open(cacheName);
}

/**
 * Add item to cache
 */
export async function addToCache(
  cacheName: string,
  request: RequestInfo,
  response: Response
): Promise<void> {
  const cache = await openCache(cacheName);
  if (cache) {
    await cache.put(request, response.clone());
  }
}

/**
 * Get item from cache
 */
export async function getFromCache(
  cacheName: string,
  request: RequestInfo
): Promise<Response | undefined> {
  const cache = await openCache(cacheName);
  if (!cache) return undefined;
  return cache.match(request);
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;

  const cacheNames = Object.values(CACHE_NAMES);
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

/**
 * Precache assets during service worker installation
 */
export async function precacheAssets(
  assets: string[],
  cacheName: string = CACHE_NAMES.appShell
): Promise<void> {
  const cache = await openCache(cacheName);
  if (!cache) return;

  await Promise.all(
    assets.map(async url => {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn(`[SW] Failed to precache: ${url}`, error);
      }
    })
  );
}

/**
 * Background sync helper
 */
export async function registerBackgroundSync(tag: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const registration = await navigator.serviceWorker?.ready;
  if ('sync' in registration) {
    await (
      registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> };
      }
    ).sync.register(tag);
  }
}

/**
 * Service Worker message helpers
 */

/**
 * Send message to service worker
 */
export async function sendMessageToSW(message: Record<string, unknown>): Promise<unknown> {
  if (typeof window === 'undefined') return null;

  const registration = await navigator.serviceWorker?.ready;
  if (!registration?.active) return null;

  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = event => {
      resolve(event.data);
    };
    registration.active?.postMessage(message, [channel.port2]);
  });
}

/**
 * Service Worker file content
 * This would be written to public/sw.js in production
 */
export const serviceWorkerContent = `
const CACHE_NAMES = {
  static: 'notechain-static-v1',
  images: 'notechain-images-v1',
  api: 'notechain-api-v1',
  appShell: 'notechain-app-shell-v1',
};

const CACHE_EXPIRATION = {
  static: 30 * 24 * 60 * 60,
  images: 7 * 24 * 60 * 60,
  api: 5 * 60,
  appShell: 24 * 60 * 60,
};

// Precache core assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
];

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.appShell)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !Object.values(CACHE_NAMES).includes(name))
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Static assets - Cache first
  if (/\\.(js|css|woff2?|ttf|otf|eot)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static));
    return;
  }

  // Images - Stale while revalidate
  if (/\\.(png|jpg|jpeg|gif|svg|webp|avif)$/.test(url.pathname)) {
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
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  
  return cached || networkPromise;
}

// Message handling
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
`;

export default {
  CACHE_NAMES,
  CACHE_EXPIRATION,
  defaultCacheRoutes,
  registerServiceWorker,
  unregisterServiceWorker,
  isOffline,
  subscribeToNetworkStatus,
  precacheAssets,
  clearAllCaches,
};
