const CACHE_NAME = 'dms-hub-v1';
const OFFLINE_URL = '/offline.html';

// Assets da pre-cachare per funzionamento offline base
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.png',
  '/manifest.json',
];

// Install: pre-cache le risorse essenziali
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: pulisci cache vecchie
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first con fallback offline per navigazione
self.addEventListener('fetch', (event) => {
  // Solo richieste GET
  if (event.request.method !== 'GET') return;

  // Per le chiamate API, non usare cache
  if (event.request.url.includes('/api/')) return;

  // Per la navigazione (pagine HTML): network-first con fallback offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Per gli asset statici: cache-first
  if (event.request.url.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
