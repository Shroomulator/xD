var CACHE_NAME = 'shroomulator-v1';
var URLS_TO_CACHE = [
  './',
  '/xD/assets/icon-192.png',
  '/xD/assets/icon-512.png',
  '/xD/assets/favicon.ico'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Use individual adds so a missing asset doesn't abort the whole install
      return Promise.all(
        URLS_TO_CACHE.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('SW: failed to cache ' + url, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response;
      }
      return fetch(event.request).then(function(networkResponse) {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        var responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(function() {
        return caches.match('./');
      });
    })
  );
});
