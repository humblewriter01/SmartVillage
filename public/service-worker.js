// Vite replaces the revision at build time, so new releases refresh the cache.
const BUILD_VERSION = '__BUILD_VERSION__';
const SOUND_CACHE = `smartvillage-animal-sounds-${BUILD_VERSION}`;
const SHELL_CACHE = `smartvillage-app-shell-${BUILD_VERSION}`;
const ANIMAL_SOUNDS = ['chicken', 'goat', 'sheep', 'cattle', 'donkey', 'camel', 'pig', 'duck', 'turkey'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const soundCache = await caches.open(SOUND_CACHE);
    await soundCache.addAll(ANIMAL_SOUNDS.map(name => new URL(`sounds/${name}.mp3`, self.registration.scope).href));

    // Development has no generated manifest. In production, fail installation
    // if caching fails so an existing offline-ready worker is not replaced.
    if (BUILD_VERSION !== '__BUILD_VERSION__') {
      const response = await fetch(new URL('precache-assets.json', self.registration.scope), { cache: 'no-store' });
      if (!response.ok) throw new Error('No production asset manifest');
      const assets = await response.json();
      if (!Array.isArray(assets) || assets.some(path => typeof path !== 'string' || !/^assets\/[^.].*/.test(path) || path.includes('..'))) {
        throw new Error('Invalid offline asset manifest');
      }
      const shell = await caches.open(SHELL_CACHE);
      const paths = ['', 'index.html', 'manifest.json', 'favicon.ico', 'logo192.png', 'logo512.png', 'app-icon.png', ...assets];
      await shell.addAll(paths.map(path => new URL(path, self.registration.scope).href));
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('murya-') ||
          (key.startsWith('smartvillage-animal-sounds-') && key !== SOUND_CACHE) ||
          (key.startsWith('smartvillage-app-shell-') && key !== SHELL_CACHE)) {
        await caches.delete(key);
      }
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    // Prefer a current online release, but allow a previously loaded web app to
    // start again offline. Android continues to use its bundled local assets.
    event.respondWith(fetch(event.request).catch(async () =>
      (await caches.match(event.request)) || (await caches.match(self.registration.scope)) || Response.error()
    ));
    return;
  }
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
