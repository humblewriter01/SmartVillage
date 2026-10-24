// Bump when the model or pinned ONNX Runtime assets change.
const MURYA_CACHE = 'murya-ort-1.30.0-v1';
const MURYA_ASSETS = [
  '/models/murya/murya.onnx',
  '/models/murya/murya.onnx.json',
  '/models/murya/MODEL_ATTRIBUTION.txt',
  '/models/murya/ort-wasm-simd-threaded.mjs',
  '/models/murya/ort-wasm-simd-threaded.wasm',
  '/models/murya/ort-wasm-simd-threaded.jsep.mjs',
  '/models/murya/ort-wasm-simd-threaded.jsep.wasm',
];
// Model/runtime assets are cached only on demand, never during startup.
self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('murya-') && key !== MURYA_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && MURYA_ASSETS.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(MURYA_CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
