const CACHE_VERSION = 'v2';
const STATIC_CACHE = `sra-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `sra-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = './offline.html';

const APP_SHELL = [
  './index.html',
  OFFLINE_URL,
  './manifest.json',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/js/components.js',
  './assets/js/disclaimer.js',
  './assets/js/guides.js',
  './assets/js/i18n.js',
  './assets/js/router.js',
  './assets/js/pages/ethics.js',
  './assets/js/utils/tooltip.js',
  './data/categories.json',
  './data/platforms.json',
  './data/guides-facebook.json',
  './data/disclaimer.txt',
  './data/ethics.md',
  './i18n/en.json',
  './i18n/he.json',
  './icons-s/1.png',
  './icons-s/2.png',
];

const BASE_URL = (self.registration && self.registration.scope) || self.location.origin + '/';
const APP_SHELL_ABSOLUTE = new Set(APP_SHELL.map((path) => new URL(path, BASE_URL).href));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((error) => {
        console.error('[SW] Failed to precache', error);
      }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('sra-') && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() => notifyClientsAboutUpdate()),
  );
});

function notifyClientsAboutUpdate() {
  return self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'updateavailable' }));
    })
    .catch((error) => console.error('[SW] Failed to notify clients', error));
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    if (request.mode === 'navigate') {
      const offlineCache = await cache.match(OFFLINE_URL);
      if (offlineCache) return offlineCache;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  return cached || fetchPromise.then((response) => response || cached);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          const offline = await cache.match(OFFLINE_URL);
          return offline || Response.error();
        }),
    );
    return;
  }

  if (APP_SHELL_ABSOLUTE.has(request.url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'document') {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.destination === 'image' || request.destination === 'font' || request.destination === 'json') {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
