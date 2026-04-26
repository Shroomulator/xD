var CACHE_VERSION = 'shroomulator-v3';
var CORE_URL = '/xD/';
var URLS_TO_CACHE = [
  '/xD/',
  '/xD/assets/icon-192.png',
  '/xD/assets/icon-512.png',
  '/xD/assets/favicon.ico'
];

// INSTALL — cache core assets, wait for explicit skipWaiting from user
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return Promise.all(
        URLS_TO_CACHE.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('SW: failed to cache ' + url, err);
          });
        })
      );
    })
  );
  // Do NOT skipWaiting here — page shows update toast, user confirms
});

// ACTIVATE — delete all old caches, claim clients
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE_VERSION) {
          return caches.delete(key);
        }
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// FETCH — cache-first, update in background, offline fallback to main HTML
self.addEventListener('fetch', function(event) {
  var req = event.request;

  // Only handle GET on our origin
  if (req.method !== 'GET') return;
  try {
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
  } catch(e) { return; }

  event.respondWith(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.match(req).then(function(cached) {

        // Background network fetch — always try to refresh cache
        var networkFetch = fetch(req).then(function(response) {
          if (response && response.status === 200 && response.type !== 'opaque') {
            cache.put(req, response.clone());
          }
          return response;
        }).catch(function() { return null; });

        // Serve cached version immediately if available
        if (cached) {
          return cached;
        }

        // Nothing cached — wait for network
        return networkFetch.then(function(response) {
          if (response) return response;
          // Network failed — return HTML shell as offline fallback
          return caches.match(CORE_URL).then(function(fallback) {
            return fallback || new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        });
      });
    })
  );
});

// MESSAGE — receive SKIP_WAITING from update toast button
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
