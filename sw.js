/*
 * BuzzBlock Site Survey — service worker
 * Precaches the app shell + jsPDF so the whole app (including PDF export)
 * works with zero network connection after the first successful load.
 *
 * IMPORTANT: bump CACHE_NAME any time you redeploy changed files, so
 * returning devices pick up the update instead of serving the old cache.
 */
const CACHE_NAME = 'buzzblock-survey-v1.4';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-first for everything the app shell needs; falls back to network,
// and caches whatever it fetches (same-origin or the jsPDF CDN) for next time.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        try {
          const url = new URL(req.url);
          const sameOrigin = url.origin === self.location.origin;
          const knownCdn = url.hostname === 'cdnjs.cloudflare.com';
          if ((sameOrigin || knownCdn) && res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
        } catch (e) { /* ignore */ }
        return res;
      }).catch(() => cached);
    })
  );
});
