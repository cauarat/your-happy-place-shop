const CACHE_NAME = 'villaoro-cache-v2';
const urlsToCache = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache core assets (never fail install on a missing asset)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        urlsToCache.map((url) => cache.add(url).catch(() => undefined))
      )
    )
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, falling back to cache
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests to our own origin
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // API calls should always go to network
  if (request.url.includes('/api/')) {
    return;
  }

  // NEVER cache HTML/navigations. A stale index.html points at asset hashes that
  // no longer exist after a deploy, which produces a permanent white screen.
  const isNavigation =
    request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  if (isNavigation) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        // Must always resolve to a Response — returning undefined breaks the request.
        const cached = await caches.match(request);
        return cached || Response.error();
      })
  );
});
