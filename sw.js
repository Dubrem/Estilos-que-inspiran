const CACHE = 'dubrem-v3';
const SHELL = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase, MercadoPago y APIs externas → siempre red
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('mercadopago') ||
    url.hostname.includes('vercel') ||
    e.request.method !== 'GET'
  ) return;

  // Para la página HTML: caché primero, actualiza en segundo plano
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/').then(cached => {
        const fresh = fetch(e.request)
          .then(res => {
            caches.open(CACHE).then(c => c.put('/', res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  // Imágenes y fuentes: caché primero
  if (
    e.request.destination === 'image' ||
    e.request.destination === 'font' ||
    e.request.destination === 'style' ||
    e.request.destination === 'script'
  ) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        });
      })
    );
  }
});
