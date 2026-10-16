// Barn Cat: Midnight Prowler - offline helper (a "service worker").
// It keeps a copy of the game on the phone, so it still works without internet.
// When there IS internet, it always fetches the newest files first, so updates show up right away.
// If you add a new file the game needs, add it to FILES below and raise VERSION by 1.

const VERSION = 1;
const CACHE = "barncat-v" + VERSION;
const FILES = [
  "./",
  "index.html",
  "style.css",
  "game.js",
  "install.js",
  "manifest.webmanifest",
  "fonts/lilita-one-400.woff2",
  "fonts/atkinson-hyperlegible-400.woff2",
  "fonts/atkinson-hyperlegible-700.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon.png",
];

// First visit: save a copy of every file.
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

// Throw away copies saved by older versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("barncat-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Every request: try the internet first (and refresh the saved copy); if that fails, use the saved copy.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((cache) => cache.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html")))
  );
});
