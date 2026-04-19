// Self-unregistering stub. Replaces the previous PWA service worker.
// Existing installs fetch /sw.js on update checks; this version tears itself
// down and wipes caches so returning users stop hitting stale/broken state.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {}
      try {
        await self.registration.unregister();
      } catch {}
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((client) => client.navigate(client.url));
      } catch {}
    })()
  );
});
