// Skeet Tracker — Service Worker
// Caches the app shell (HTML + manifest) so the app loads offline.
// Firebase Firestore handles offline data sync independently.

const CACHE_NAME = "skeet-tracker-v4";
const SHELL = [
  "./index.html",
  "./desktop.html",
  "./skeet_mobile.html",
  "./manifest.json"
];

// Install: cache the app shell immediately.
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// Activate: remove any old caches from previous versions.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve the app shell from cache; fall back to network.
// Firebase SDK and Firestore requests always go to the network.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Let Firebase, Google APIs, and CDN requests pass through to the network.
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("firestore")
  ) {
    return;
  }

  // For navigation requests (loading the app), try cache first, then network.
  if (e.request.mode === "navigate") {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
    return;
  }

  // For other app-shell files, cache first then network.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // Cache successful same-origin responses.
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
