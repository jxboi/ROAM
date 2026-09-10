/// <reference lib="webworker" />
// A deliberately small service worker. The build injects the list of shell
// files below; everything else here is policy, kept readable on purpose
// because a stale or over-eager cache is the classic way to break a deploy.
type PrecacheEntry = { url: string; revision: string };
/** Replaced at build time with the list of shell files and their revisions. */
declare const self: ServiceWorkerGlobalScope & { __ROAM_SHELL__: PrecacheEntry[] };

const manifest: PrecacheEntry[] = self.__ROAM_SHELL__ ?? [];

/** FNV-1a over the injected manifest: a new build gets a new cache. */
function fingerprint(entries: PrecacheEntry[]): string {
  const source = entries.map(entry => `${entry.url}:${entry.revision}`).join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

const SHELL_CACHE = `roam-shell-${fingerprint(manifest)}`;
const IMAGE_CACHE = 'roam-images-v1';
const IMAGE_LIMIT = 60;
const SHELL_URLS = new Set(manifest.map(entry => new URL(entry.url, self.location.origin).pathname));
const DOCUMENT = '/index.html';
/** Files that must come from the network, never the app shell. */
const PASS_THROUGH = /^\/(robots\.txt|sitemap\.xml)$/;

async function precache(): Promise<void> {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.all([...SHELL_URLS].map(async url => {
    // Bypass the HTTP cache while installing. index.html is served with
    // must-revalidate, and precaching a copy of the previous build's document
    // would point every navigation at assets this build no longer has.
    const response = await fetch(new Request(url, { cache: 'reload' }));
    if (!response.ok) throw new Error(`ROAM: cannot precache ${url} (${response.status})`);
    // A host that redirects to a tidier URL hands back a response marked as
    // redirected, and returning one of those for a navigation is a hard error.
    // Store a plain copy instead.
    await cache.put(url, response.redirected ? new Response(response.body, response) : response);
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(precache());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith('roam-') && name !== SHELL_CACHE && name !== IMAGE_CACHE)
        .map(name => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

// The page asks for this only when someone accepts the update prompt, so a
// visitor mid-plan is never swapped onto a new build under their feet.
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

/**
 * Photography is answered from the cache and refreshed behind it. The image
 * cache deliberately outlives a deploy, and these filenames carry no content
 * hash, so a cache-first policy with no revalidation would pin a replaced photo
 * in place for good.
 */
async function imageResponse(request: Request): Promise<{ response: Response; refresh: Promise<unknown> }> {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async response => {
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
        await trim(cache);
      }
      return response;
    })
    .catch(() => undefined);
  if (cached) return { response: cached, refresh: network };
  const fresh = await network;
  return { response: fresh ?? Response.error(), refresh: Promise.resolve() };
}

/** Keeps the runtime image cache from growing without bound, oldest first. */
async function trim(cache: Cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - IMAGE_LIMIT))) await cache.delete(key);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (PASS_THROUGH.test(url.pathname)) return;

  // Every route renders from the same document.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match(DOCUMENT, { cacheName: SHELL_CACHE });
      if (cached) return cached;
      try {
        return await fetch(request);
      } catch {
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }

  if (SHELL_URLS.has(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(url.pathname, { cacheName: SHELL_CACHE });
      return cached ?? fetch(request);
    })());
    return;
  }

  if (request.destination === 'image') {
    const settled = imageResponse(request).catch(() => ({ response: Response.error(), refresh: Promise.resolve() }));
    // The refresh has to outlive the response, or the fetch is cancelled the
    // moment the cached copy is handed over.
    event.waitUntil(settled.then(({ refresh }) => refresh));
    event.respondWith(settled.then(({ response }) => response));
  }
});

