const CACHE_NAME = "tradelike-pwa-v2";
const DELTA_TAG = "tl-delta";
const DELTA_INTERVAL_MS = 30000;
const APP_SHELL = ["/", "/index.html", "/favicon.svg", "/icons.svg"];

let apiBaseUrl = "";
let authToken = "";
let cursor = "";

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  const data = event.data || {};

  if (data.type === "TL_DELTA_CONFIG") {
    apiBaseUrl = data.apiBaseUrl || apiBaseUrl;
    authToken = data.token || authToken;
    cursor = data.cursor || cursor;
    event.waitUntil(registerDeltaSync());
  }

  if (data.type === "TL_DELTA_SYNC_NOW") {
    event.waitUntil(runDeltaSync());
  }
});

self.addEventListener("sync", event => {
  if (event.tag === DELTA_TAG) {
    event.waitUntil(runDeltaSync());
  }
});

self.addEventListener("periodicsync", event => {
  if (event.tag === DELTA_TAG) {
    event.waitUntil(runDeltaSync());
  }
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      return response;
    }))
  );
});

setInterval(() => {
  runDeltaSync();
}, DELTA_INTERVAL_MS);

async function registerDeltaSync() {
  if (self.registration.sync) {
    await self.registration.sync.register(DELTA_TAG).catch(() => undefined);
  }

  if (self.registration.periodicSync) {
    await self.registration.periodicSync.register(DELTA_TAG, {
      minInterval: DELTA_INTERVAL_MS,
    }).catch(() => undefined);
  }
}

async function runDeltaSync() {
  await broadcast({ type: "TL_DELTA_TICK", tag: DELTA_TAG });

  if (!apiBaseUrl || !authToken) {
    return;
  }

  const response = await fetch(`${apiBaseUrl}/sync/changes${cursor ? `?since=${encodeURIComponent(cursor)}` : ""}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  }).catch(() => null);

  if (!response || !response.ok) {
    return;
  }

  const payload = await response.json();
  cursor = payload.cursor || cursor;

  await broadcast({
    type: "TL_DELTA_CHANGES",
    tag: DELTA_TAG,
    payload,
  });
}

async function broadcast(message) {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window",
  });

  for (const client of clients) {
    client.postMessage(message);
  }
}
