import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { ANIMAL_SOUND_FILES } from '../src/services/animalSoundService.ts';

test('service worker precaches recordings and the production shell for offline use', async () => {
  const script = (await readFile(new URL('../public/service-worker.js', import.meta.url), 'utf8'))
    .replace('__BUILD_VERSION__', 'test-version');
  const listeners = {};
  const cached = new Map();
  const deleted = [];
  let skipped = false;
  let claimed = false;
  const self = {
    registration: { scope: 'https://example.test/app/' },
    clients: { claim: async () => { claimed = true; } },
    addEventListener: (event, fn) => { listeners[event] = fn; },
    skipWaiting: async () => { skipped = true; },
  };
  const caches = {
    open: async () => ({ addAll: async urls => { for (const url of urls) cached.set(url, `cached:${url}`); } }),
    keys: async () => ['murya-old', 'smartvillage-animal-sounds-v0', 'smartvillage-app-shell-v0',
      'smartvillage-animal-sounds-test-version', 'smartvillage-app-shell-test-version', 'unrelated'],
    delete: async key => { deleted.push(key); },
    match: async request => cached.get(typeof request === 'string' ? request : request.url),
  };
  const fetch = async url => {
    if (String(url).endsWith('precache-assets.json')) {
      return { ok: true, json: async () => ['assets/app-123.js', 'assets/app-123.css'] };
    }
    throw new Error('offline');
  };
  vm.runInNewContext(script, { self, caches, URL, fetch });
  let promise;
  listeners.install({ waitUntil: p => { promise = p; } });
  await promise;
  assert.equal(skipped, true);
  for (const file of Object.values(ANIMAL_SOUND_FILES)) assert.ok(cached.has(`https://example.test/app/sounds/${file}`));
  assert.ok(cached.has('https://example.test/app/'));
  assert.ok(cached.has('https://example.test/app/assets/app-123.js'));
  assert.ok(cached.has('https://example.test/app/assets/app-123.css'));
  listeners.activate({ waitUntil: p => { promise = p; } });
  await promise;
  assert.deepEqual(deleted, ['murya-old', 'smartvillage-animal-sounds-v0', 'smartvillage-app-shell-v0']);
  assert.equal(claimed, true);
  listeners.fetch({ request: { method: 'GET', url: 'https://example.test/app/sounds/goat.mp3' }, respondWith: p => { promise = p; } });
  assert.equal(await promise, 'cached:https://example.test/app/sounds/goat.mp3');
  listeners.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://example.test/app/other' }, respondWith: p => { promise = p; } });
  assert.equal(await promise, 'cached:https://example.test/app/');
});

test('a failed production shell precache does not activate a replacement worker', async () => {
  const script = (await readFile(new URL('../public/service-worker.js', import.meta.url), 'utf8'))
    .replace('__BUILD_VERSION__', 'new-version');
  let install;
  let skipped = false;
  const self = {
    registration: { scope: 'https://example.test/' },
    addEventListener: (event, fn) => { if (event === 'install') install = fn; },
    skipWaiting: async () => { skipped = true; },
  };
  const caches = { open: async () => ({ addAll: async () => {} }) };
  vm.runInNewContext(script, { self, caches, URL, fetch: async () => { throw new Error('offline'); } });
  let promise;
  install({ waitUntil: p => { promise = p; } });
  await assert.rejects(promise, /offline/);
  assert.equal(skipped, false);
});
