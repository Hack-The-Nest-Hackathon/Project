const cacheName = "field-notes-v16";
const sceneAssets = new Set([
  "/orbit.png", "/market.png", "/ship.png", "/outpost.png",
  "/cartridge.png", "/guide.png", "/guide-baker.png", "/guide-scout.png",
  "/journal.png", "/survey-rocket.png", "/menu-theme.wav", "/map-theme.wav", "/shutter.wav",
]);

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));

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
    || url.pathname === "/favicon.ico"
    || (url.pathname.startsWith("/worlds/") && url.pathname.endsWith(".png")) || sceneAssets.has(url.pathname);
  if (!isPage && !isAsset) return;

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
