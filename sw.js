const CACHE_NAME = 'sra-wireframe-v1';

self.addEventListener('install', (event) => {
  // Placeholder for future caching logic
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Placeholder for cleanup logic
  event.waitUntil(self.clients.claim());
});

// Fetch handler intentionally omitted for wireframe phase.
