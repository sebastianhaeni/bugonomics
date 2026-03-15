const APP_SHELL_CACHE = "bugonomics-app-v1";
const RUNTIME_CACHE = "bugonomics-runtime-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./favicon.ico",
  "./apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./screenshots/wide.png",
  "./screenshots/mobile.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      const assetUrls = await getAppAssetUrls();
      await cache.addAll([...new Set([...CORE_ASSETS, ...assetUrls])]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  event.respondWith(handleStaticRequest(request));
});

async function getAppAssetUrls() {
  try {
    const response = await fetch("./index.html", { cache: "no-store" });
    const html = await response.text();
    return [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
      .map((match) => normalizeAssetUrl(match[1]))
      .filter((url) => url.startsWith("./"));
  } catch {
    return [];
  }
}

function normalizeAssetUrl(url) {
  if (url.startsWith("./")) {
    return url;
  }
  if (url.startsWith("assets/")) {
    return `./${url}`;
  }
  return url;
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    await cacheResponse(request, response, RUNTIME_CACHE);
    return response;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match("./")) ||
      (await caches.match("./index.html"))
    );
  }
}

async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  await cacheResponse(request, response, RUNTIME_CACHE);
  return response;
}

async function cacheResponse(request, response, cacheName) {
  if (!response || !response.ok) {
    return;
  }

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}
