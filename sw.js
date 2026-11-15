const CACHE_NAME = 'studyflow-pen-lab-v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icons/studyflow.svg', './icons/studyflow-192.png', './icons/studyflow-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // Pre-cache the hashed Vite entry files so the first installed launch can work offline.
    const response = await fetch('./index.html');
    if (response.ok) {
      const html = await response.clone().text();
      await cache.put('./index.html', response);
      const assetPaths = [...html.matchAll(/(?:src|href)=\"([^\"]+\.(?:js|css))(?:\?[^\"]*)?\"/g)]
        .map((match) => match[1])
        .filter((path) => path && !path.startsWith('http'));
      await cache.addAll(assetPaths);
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && (url.pathname.includes('/assets/') || url.pathname.endsWith('.svg'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(async () => {
        if (request.mode === 'navigate') {
          return (await caches.match('./index.html')) ?? Response.error();
        }
        return Response.error();
      });
    }),
  );
});
