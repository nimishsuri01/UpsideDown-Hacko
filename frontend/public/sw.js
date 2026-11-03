// PayRevive Mobile PWA Service Worker
const CACHE_NAME = 'payrevive-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through network-first strategy for live websocket and APIs
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

