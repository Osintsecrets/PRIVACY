const CACHE_VERSION = 'v1';
const CORE_CACHE = `sra-core-${CACHE_VERSION}`;
const base = new URL('./', self.registration.scope);
const withBase = (path) => new URL(path, base).toString();
const OFFLINE_URL = withBase('offline.html');

const PRECACHE_URLS = [
  withBase(''),
  withBase('index.html'),
  OFFLINE_URL,
  withBase('assets/css/styles.css'),
  withBase('assets/js/main.js'),
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
