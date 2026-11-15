const cacheName = "field-notes-v6";
const sceneAssets = new Set([
  "/orbit.png", "/market.png", "/ship.png", "/outpost.png",
  "/cartridge.png", "/guide.png", "/journal.png",
]);

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("field-notes-") && name !== cacheName)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  const isPage = request.mode === "navigate" && url.pathname === "/";
  const isAsset = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon-")
    || (url.pathname.startsWith("/worlds/") && url.pathname.endsWith(".png")) || sceneAssets.has(url.pathname);
  const isGameData = url.pathname === "/api/world" || url.pathname.startsWith("/api/audio/");
  if (!isPage && !isAsset && !isGameData) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    if (isAsset) {
      const cached = await cache.match(request);
      if (cached) return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok && response.status === 200) await cache.put(request, response.clone()).catch(() => {});
      if (response.ok) return response;
      return await cache.match(request) ?? response;
    } catch {
      return await cache.match(request) ?? Response.error();
    }
  })());
});
