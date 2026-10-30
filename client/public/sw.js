/*
 * Compare's service worker: makes the site installable, opens it offline, and serves the
 * map pieces saved with a trip ("My trip") when there's no network.
 * Prices are never cached here: /api always goes to the network, so a fare on screen is
 * always the server's current answer.
 */
const CACHE = "compare-shell-v2";
/** Written by the page when a trip is saved (client/src/lib/trips.ts). */
const MAP_CACHE = "compare-map-v1";
const SHELL = ["/", "/offline.html", "/icons/icon-192.png"];
const TILES = "https://tiles.openfreemap.org";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE && k !== MAP_CACHE)
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Tile URLs carry a map version ("/planet/20261025_.../8/130/122.pbf"); saved ones don't. */
const offlineTileKey = url => {
  const m = url.pathname.match(/^\/planet\/[^/]+\/(\d+\/\d+\/\d+)\.pbf$/);
  return m ? `${TILES}/__offline/${m[1]}.pbf` : null;
};

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Map: saved pieces when we have them, the network otherwise.
  if (url.origin === TILES) {
    const tile = offlineTileKey(url);
    if (tile) {
      event.respondWith(caches.match(tile).then(hit => hit || fetch(req)));
      return;
    }
    // The map index and fonts: network first, the copy saved with a trip when offline.
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req.url).then(hit => hit || Response.error())
      )
    );
    return;
  }

  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Pages: the network, keeping the latest app page so Compare (and My trip) opens offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put("/", copy));
          }
          return res;
        })
        .catch(() =>
          caches.match("/").then(hit => hit || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Built files have a content hash in their name, so a cached copy never goes stale.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then(
        hit =>
          hit ||
          fetch(req).then(res => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
