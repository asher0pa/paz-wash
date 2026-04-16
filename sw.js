const SW_VERSION = '2.1'; // Updated to bust cache

self.addEventListener('install', (event) => {
    // Basic service worker just to pass PWA install check
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // We don't really want to cache everything forcefully for a simple setup unless requested.
    // Just passing through for now to allow offline install prompt in Android
    event.respondWith(fetch(event.request).catch(() => new Response('Offline')));
});
