const CACHE_VERSION = "eipv-pwa-v25";

/*
 * Fichiers qui portent du texte ou de la logique : feuille de style, scripts et
 * surtout les dictionnaires de traduction. Ils sont servis depuis le cache pour
 * la rapidité, mais rafraîchis en arrière-plan à chaque chargement, si bien
 * qu'une version périmée ne survit jamais plus d'une ouverture de l'application.
 * Les images, elles, restent en cache pur : elles ne changent pas.
 */
const REVALIDATE = [
  "/css/styles.css",
  "/js/app.js",
  "/js/i18n.js",
  "/js/pwa.js",
  "/fr/translations.js",
  "/en/translations.js"
];
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
      .then(function (cache) {
        /*
         * `cache: "reload"` court-circuite le cache HTTP du navigateur.
         * Sans lui, une nouvelle version du service worker peut remettre en
         * cache l'ANCIEN fichier, servi par le cache du navigateur : le numéro
         * de version change, le contenu non. C'est ce qui laissait des textes
         * français s'afficher sur la version anglaise après une mise à jour.
         */
        return cache.addAll(APP_SHELL.map(function (url) {
          return new Request(url, { cache: "reload" });
        }));
      })
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

  /*
   * Vidéos et sons : jamais mis en cache, jamais interceptés.
   *
   * Les fichiers de /videos/ pèsent plusieurs dizaines de Mo. Le navigateur les
   * demande par plages (requêtes Range, réponses 206) pour permettre le
   * déplacement dans la vidéo. Les stocker saturerait le quota de l'origine,
   * ferait évincer la coquille de l'application, et rendre une réponse complète
   * en cache à une requête de plage casse le déplacement sur plusieurs
   * navigateurs. On sort donc sans `respondWith` : le navigateur fait sa
   * requête lui-même, avec son propre cache HTTP.
   */
  if (request.destination === "video" || request.destination === "audio" ||
      request.headers.has("range") ||
      /\.(mp4|webm|m4v|mov|mp3|m4a|ogg|wav)$/i.test(new URL(request.url).pathname)) {
    return;
  }

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

  /* Texte et logique : cache d'abord pour la vitesse, mise à jour en fond. */
  var url = new URL(request.url);
  if (url.origin === self.location.origin && REVALIDATE.indexOf(url.pathname) !== -1) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(function (cache) {
        return cache.match(request).then(function (cached) {
          var fromNetwork = fetch(request)
            .then(function (response) {
              if (response && response.status === 200) cache.put(request, response.clone());
              return response;
            })
            .catch(function () { return cached; });

          if (!cached) return fromNetwork;
          event.waitUntil(fromNetwork);
          return cached;
        });
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
