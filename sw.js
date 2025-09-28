const CACHE_VERSION = 'v4';
const CORE_CACHE = `sra-core-${CACHE_VERSION}`;
const RUNTIME_CACHE = `sra-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = './offline.html';

const PRECACHE_URLS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/js/components.js',
  './assets/js/disclaimer.js',
  './assets/js/router.js',
  './assets/js/pages/guides.js',
  './assets/js/utils/modal.js',
  './assets/js/utils/tooltip.js',
  './data/guides.json',
  './data/disclaimer.txt',
  './data/ethics.en.md',
  './data/ethics.he.md',
  './i18n/en.json',
  './i18n/he.json',
  './icons-s/1.png',
  './icons-s/2.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('sra-') && key !== CORE_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() => notifyClients()),
  );
});

function notifyClients() {
  return self.clients
    .matchAll({ includeUncontrolled: true, type: 'window' })
    .then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'updateavailable' }));
    })
    .catch((error) => console.error('[SW] notify error', error));
}

async function cacheFirst(request) {
  const cache = await caches.open(CORE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
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
    .catch(() => undefined);
  return cached || fetchPromise;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || Response.error();
        }),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    if (PRECACHE_URLS.some((path) => url.pathname.endsWith(path.replace('./', '/')))) {
      event.respondWith(cacheFirst(request));
      return;
    }
    if (request.destination === 'script' || request.destination === 'style') {
      event.respondWith(cacheFirst(request));
      return;
    }
  }

  if (request.destination === 'document') {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.destination === 'image' || request.destination === 'font' || request.destination === 'json') {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  const { data } = event;
  if (!data) return;
  if (data.type === 'skipWaiting' || data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
