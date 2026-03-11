/* ═══════════════════════════════════════════════════════════════
   THE LINK — Service Worker
   Caches the app shell for offline/fast load
═══════════════════════════════════════════════════════════════ */
const CACHE_NAME = 'thelink-v1';
const SHELL = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// Install: cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for shell, network-first for APIs
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network for API calls (RSS, EIA, PowerBI, TradingView)
  const isApi = url.hostname !== self.location.hostname ||
    url.pathname.includes('/api/') ||
    url.hostname.includes('tradingview') ||
    url.hostname.includes('rss2json') ||
    url.hostname.includes('allorigins') ||
    url.hostname.includes('eia.gov') ||
    url.hostname.includes('powerbi') ||
    url.hostname.includes('anthropic');

  if (isApi) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
