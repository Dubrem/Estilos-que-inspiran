const CACHE = 'dubrem-v4';
const IMG_CACHE = 'dubrem-img-v1';
const IMG_MAX = 300;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/'])));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

async function trimImages(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - IMG_MAX; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Página: red primero para mostrar siempre la versión publicada; caché solo sin conexión
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            e.waitUntil(caches.open(CACHE).then(c => c.put('/', copy)));
          }
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Fotos de productos: la URL lleva versión (v=hash), así que nunca cambian
  if (url.origin === self.location.origin && url.pathname === '/api/img' && url.searchParams.has('v')) {
    e.respondWith(
      caches.open(IMG_CACHE).then(async cache => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) e.waitUntil(cache.put(req, res.clone()).then(() => trimImages(cache)));
        return res;
      })
    );
  }
});
