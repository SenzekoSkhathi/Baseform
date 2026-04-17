const CACHE_NAME = "baseform-shell-v5";
const OFFLINE_URL = "/offline.html";

// Only precache static assets that won't redirect or require auth.
// Do NOT include "/" — it redirects to /dashboard for logged-in users and
// that redirect response breaks cache.addAll, which aborts the entire install.
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/icon.png" ||
    pathname === "/apple-touch-icon.png" ||
    /\.(?:css|js|mjs|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/i.test(pathname)
  );
}

// Per-URL cache.put so one failure doesn't abort the whole install.
async function precacheResilient(cache, urls) {
  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "reload", redirect: "follow" });
        if (res.ok) await cache.put(url, res);
      } catch {
        // Swallow — SW install must still succeed even if a single asset fails.
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await precacheResilient(cache, PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Baseform", body: event.data.text(), href: "/notifications" };
  }

  const title = payload.title ?? "Baseform";
  const options = {
    body: payload.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { href: payload.href ?? "/notifications" },
    tag: payload.tag ?? "baseform-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href ?? "/notifications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(href);
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(href);
      })
  );
});

// ── Fetch handler ─────────────────────────────────────────────────────────────

function isCacheable(response) {
  return (
    response &&
    response.ok &&
    response.status >= 200 &&
    response.status < 300 &&
    response.type !== "opaqueredirect" &&
    response.type !== "error"
  );
}

// Always returns a valid Response — never undefined. Falls back to the
// offline page for navigations and to a minimal error Response otherwise.
async function fallbackResponse(request) {
  if (request.mode === "navigate") {
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
  }
  const cached = await caches.match(request);
  if (cached) return cached;
  return new Response("", {
    status: 503,
    statusText: "Offline",
    headers: { "Content-Type": "text/plain" },
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  const acceptHeader = request.headers.get("accept") || "";
  const isRscRequest = url.searchParams.has("_rsc") || acceptHeader.includes("text/x-component");
  const shouldUseNetworkFirst = request.mode === "navigate" || isRscRequest;

  if (shouldUseNetworkFirst) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request, { redirect: "follow" });
          if (isCacheable(response)) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)).catch(() => {});
          }
          return response;
        } catch {
          return fallbackResponse(request);
        }
      })()
    );
    return;
  }

  if (!isStaticAsset(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request, { redirect: "follow" });
          if (isCacheable(response)) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)).catch(() => {});
          }
          return response;
        } catch {
          return fallbackResponse(request);
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request, { redirect: "follow" });
        if (isCacheable(response)) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)).catch(() => {});
        }
        return response;
      } catch {
        return fallbackResponse(request);
      }
    })()
  );
});
