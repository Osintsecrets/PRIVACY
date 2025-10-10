const CACHE='sra-cache-v1';
const ASSETS=[
  '/', '/PRIVACY/self-audit/discover.html',
  '/PRIVACY/assets/js/discover.js', '/PRIVACY/assets/data/platform-steps.json',
  '/PRIVACY/assets/css/styles.css', '/PRIVACY/assets/css/site.css', '/PRIVACY/assets/css/footer.css'
];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener('fetch',e=>{ e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request))); });
