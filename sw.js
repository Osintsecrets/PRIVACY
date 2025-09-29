const CACHE_VERSION = 'v1';
const CORE_CACHE = `sra-core-${CACHE_VERSION}`;
const OFFLINE_URL = '/PRIVACY/offline.html';

const PRECACHE_URLS = [
  '/PRIVACY/',
  '/PRIVACY/index.html',
  '/PRIVACY/offline.html',
  '/PRIVACY/assets/css/styles.css',
  '/PRIVACY/assets/js/main.js',
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
      .then((keys) => Promise.all(keys.filter((key) => key !== CORE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
