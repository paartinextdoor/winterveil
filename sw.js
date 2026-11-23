// ===========================================================
// Service worker: lets the app open with no internet connection.
//
// - App files (HTML, CSS, JS, data): always fetched fresh when online,
//   with the saved copy used only when offline. So edits you publish
//   (new codes, text changes) show up right away; nothing to bump.
// - Images, fonts and National Dex data: saved the first time they load,
//   then served from the saved copy.
// ===========================================================
const SHELL = "winterveil-shell-v1";
const MEDIA = "winterveil-media-v1";
const MAX_MEDIA = 600;           // cap on saved images / PokéAPI responses
const NETWORK_TIMEOUT = 4000;    // ms before falling back to the saved copy

const CORE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/tokens.css", "./css/base.css", "./css/components.css", "./css/screens.css",
  "./js/main.js", "./js/config.js", "./js/data.js", "./js/store.js", "./js/router.js", "./js/art.js",
  "./js/ui.js", "./js/snow.js", "./js/sound.js", "./js/achievements.js", "./js/codes.js", "./js/secret.js", "./js/pokeapi.js",
  "./js/screens/home.js", "./js/screens/dex.js", "./js/screens/detail.js", "./js/screens/gift.js",
  "./js/screens/achievements.js", "./js/screens/national.js", "./js/screens/ending.js",
  "./js/screens/map.js", "./js/tt-map.js", "./css/map.css", "./data/places.json",
  "./data/pokemon.json", "./data/types.json", "./data/codes.json", "./data/achievements.json", "./data/research-notes.json",
  "./assets/icons/icon.svg", "./assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    // Cache files one by one so a single missing file can't break installation.
    await Promise.all(CORE.map((url) => shell.add(new Request(url, { cache: "reload" })).catch(() => {})));

    // Also save every Winterveil artwork file that exists, so the Pokédex works offline.
    try {
      const pokemon = await (await fetch("./data/pokemon.json", { cache: "reload" })).json();
      const media = await caches.open(MEDIA);
      await Promise.all(pokemon.map((p) => p.artwork?.src && media.add(p.artwork.src).catch(() => {})));
    } catch { /* offline during install: fine */ }

    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = [SHELL, MEDIA];
    for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

/** Fresh from the network when possible; saved copy when offline or very slow. */
async function networkFirst(request, cacheKey = request) {
  const cache = await caches.open(SHELL);
  try {
    const response = await Promise.race([fetch(request), timeout(NETWORK_TIMEOUT)]);
    if (response.ok) cache.put(cacheKey, response.clone());
    return response;
  } catch {
    const saved = await cache.match(cacheKey, { ignoreSearch: true });
    if (saved) return saved;
    if (request.mode === "navigate") return cache.match("./index.html");
    return Response.error();
  }
}

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_MEDIA; i++) await cache.delete(keys[i]);
}

/** Saved copy if we have one; otherwise fetch it and save it. */
async function cacheFirst(request) {
  const cache = await caches.open(MEDIA);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    cache.put(request, response.clone()).then(() => trim(cache));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // The app page itself (hash routes live after the #, so it's always index.html).
  const scope = new URL(self.registration.scope).pathname;
  if (request.mode === "navigate" && (url.pathname === scope || url.pathname === scope + "index.html")) {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  if (url.origin === location.origin) {
    // Winterveil artwork and icons rarely change → cache first. Everything else → network first.
    if (url.pathname.includes("/assets/")) event.respondWith(cacheFirst(request).catch(() => Response.error()));
    else event.respondWith(networkFirst(request));
    return;
  }

  // Google Fonts, PokéAPI data, and PokéAPI artwork.
  if (/fonts\.(googleapis|gstatic)\.com$|pokeapi\.co$|raw\.githubusercontent\.com$/.test(url.hostname)) {
    event.respondWith(cacheFirst(request).catch(() => Response.error()));
  }
});
