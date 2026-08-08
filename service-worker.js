const CACHE_VERSION = "eipv-pwa-v9";
const APP_SHELL = [
  "/",
  "/fr/",
  "/en/",
  "/enseignements",
  "/archives",
  "/contact",
  "/annonces",
  "/css/styles.css",
  "/js/app.js",
  "/js/i18n.js",
  "/js/pwa.js",
  "/fr/translations.js",
  "/en/translations.js",
  "/manifest.json",
  "/favicon.ico",
  "/favicon.svg",
  "/images/logo.png",
  "/images/croix.png",
  "/images/priere.png",
  "/images/eglise.png",
  "/images/mains-levees.png",
  "/images/pasteur-kossi-francois-abama.jpg",
  "/images/pwa/favicon-16x16.png",
  "/images/pwa/favicon-32x32.png",
  "/images/pwa/apple-touch-icon.png",
  "/images/pwa/icon-192x192.png",
  "/images/pwa/icon-512x512.png",
  "/images/pwa/maskable-icon-192x192.png",
  "/images/pwa/maskable-icon-512x512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key !== CACHE_VERSION) return caches.delete(key);
          return null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;

  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(request, copy); });
          return response;
        })
        .catch(function () {
          return caches.match(request)
            .then(function (cached) { return cached || caches.match("/"); });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(function (cached) {
        if (cached) return cached;

        return fetch(request).then(function (response) {
          if (!response || response.status !== 200 || request.url.indexOf(self.location.origin) !== 0) {
            return response;
          }

          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(request, copy); });
          return response;
        });
      })
  );
});
