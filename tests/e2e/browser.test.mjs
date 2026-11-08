import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const dist = resolve('dist');
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

async function startServer() {
  await stat(join(dist, 'index.html')).catch(() => { throw new Error('Run npm run build before the browser tests.'); });
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const path = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!path.startsWith(`${dist}/`)) throw new Error('Invalid path');
      const data = await readFile(path);
      res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function startChrome() {
  const executable = process.env.CHROME_BIN;
  if (!executable) throw new Error('Set CHROME_BIN to a Chromium/Chrome executable to run the browser tests.');
  const profile = await mkdtemp(join(tmpdir(), 'smartvillage-chrome-'));
  const child = spawn(executable, [
    '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--disable-background-networking', '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore', env: process.env });
  try {
    let port;
    for (let i = 0; i < 200 && !port; i++) {
      if (child.exitCode !== null) throw new Error(`Chromium exited (${child.exitCode})`);
      try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); }
      catch { await delay(50); }
    }
    if (!port) throw new Error('Chromium did not start its debugging endpoint');
    return { child, profile, port };
  } catch (error) {
    child.kill();
    await rm(profile, { recursive: true, force: true });
    throw error;
  }
}

class DevToolsPage {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
    ws.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) reject(new Error('Browser target closed'));
      this.pending.clear();
    });
  }
  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`DevTools command timed out: ${method}`));
      }, 10000);
      this.pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const reply = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
    return reply.result.value;
  }
  async waitFor(expression, timeout = 8000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      try { if (await this.evaluate(expression)) return; } catch { /* navigation may replace the context */ }
      await delay(50);
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  }
  async click(selector) {
    const clicked = await this.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el || el.disabled) return false; el.click(); return true; })()`);
    assert.ok(clicked, `Could not click ${selector}`);
  }
  async clickButtonText(text) {
    const clicked = await this.evaluate(`(() => { const el = [...document.querySelectorAll('button')].find(e => e.innerText.includes(${JSON.stringify(text)}) && !e.disabled); if (!el) return false; el.click(); return true; })()`);
    assert.ok(clicked, `Could not click button containing ${text}`);
  }
  async close() {
    await this.send('Page.close').catch(() => {});
    this.ws.close();
  }
}

async function newPage(port, origin, setup) {
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  const page = new DevToolsPage(socket);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Network.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `(${setup.toString()})()` });
  await page.send('Page.navigate', { url: origin });
  await page.waitFor("document.readyState !== 'loading' && document.body.innerText.includes('Check Water Quality')");
  return page;
}

function mockWebCamera() {
  window.__camera = { requests: [], stopped: 0, flash: [], delayNext: false };
  window.__speechCalls = 0;
  window.__spokenTexts = [];
  const speak = window.speechSynthesis.speak.bind(window.speechSynthesis);
  window.speechSynthesis.speak = (...args) => {
    window.__speechCalls++;
    window.__spokenTexts.push(args[0].text);
    return speak(...args);
  };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: async options => {
      window.__camera.requests.push(options);
      if (window.__camera.failFront && options.video?.facingMode?.exact === 'user') {
        throw new DOMException('No front camera', 'OverconstrainedError');
      }
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 240;
      const context = canvas.getContext('2d');
      context.fillStyle = 'rgb(35, 170, 40)'; context.fillRect(0, 0, 320, 240);
      const stream = canvas.captureStream(10);
      const track = stream.getVideoTracks()[0];
      const stop = track.stop.bind(track);
      track.stop = () => { window.__camera.stopped++; stop(); };
      track.getCapabilities = () => ({ torch: true });
      track.applyConstraints = async constraints => { window.__camera.flash.push(constraints); };
      if (window.__camera.delayNext) {
        window.__camera.delayNext = false;
        await new Promise(resolve => { window.__releaseCamera = resolve; });
      }
      return stream;
    },
  } });
}

function mockNativeCamera() {
  window.__native = [];
  window.__nativePositions = ['rear', 'front'];
  window.__nativeFlashModes = ['off', 'on'];
  window.androidBridge = {};
  let starts = 0;
  window.Capacitor = {
    PluginHeaders: [{ name: 'CameraPreview', methods: ['start', 'stop', 'getSupportedFlashModes', 'getAvailableDevices', 'setFlashMode', 'flip', 'capture'].map(name => ({ name, rtype: 'promise' })) }],
    nativePromise: async (plugin, method, options) => {
      window.__native.push({ plugin, method, options });
      if (method === 'start') {
        if (++starts === 1) await new Promise(resolve => setTimeout(resolve, 900));
        window.__native.push({ method: 'started' });
        return { width: 390, height: 844, x: 0, y: 0 };
      }
      if (method === 'getSupportedFlashModes') return { result: window.__nativeFlashModes };
      if (method === 'getAvailableDevices') return { devices: window.__nativePositions.map(position => ({ position })) };
      if (method === 'capture') {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 100;
        const context = canvas.getContext('2d'); context.fillStyle = '#f4f4f4'; context.fillRect(0, 0, 100, 100);
        return { value: canvas.toDataURL('image/jpeg').split(',')[1] };
      }
      return {};
    },
  };
}

test('production browser flows, offline sounds and native camera lifecycle', { timeout: 60000 }, async t => {
  const { server, origin } = await startServer();
  let chrome;
  try {
    chrome = await startChrome();
    await t.test('web photo, flash, camera release and all nine sounds while offline', async () => {
      const page = await newPage(chrome.port, origin, mockWebCamera);
      try {
        assert.ok(await page.evaluate("document.body.innerText.includes('SOS — EMERGENCY ALERT')"));
        assert.ok(await page.evaluate("!!document.querySelector('[title=\"Read Aloud\"]')"));
        assert.ok(await page.evaluate("document.body.innerText.includes('Speak')"));
        await page.clickButtonText('Check Water Quality');
        await page.waitFor("document.body.innerText.includes('Take Photo')");
        await page.clickButtonText('Take Photo');
        await page.waitFor("document.querySelector('[aria-label=\"Capture Photo\"]') && !document.querySelector('[aria-label=\"Capture Photo\"]').disabled");
        const layout = await page.evaluate(`(() => {
          const d = document.querySelector('[role="dialog"]').getBoundingClientRect();
          const buttons = [...document.querySelectorAll('[role="dialog"] button')];
          const c = buttons.find(b => b.innerText.trim() === 'Cancel').getBoundingClientRect();
          const s = document.querySelector('[aria-label="Capture Photo"]').getBoundingClientRect();
          return { width:d.width, height:d.height, cancelBottom:c.bottom, shutterBottom:s.bottom };
        })()`);
        assert.equal(layout.width, 390);
        assert.equal(layout.height, 844);
        assert.ok(Math.abs(layout.cancelBottom - layout.shutterBottom) < 2);
        await page.click('[aria-label="Turn flash on"]');
        assert.equal(await page.evaluate('window.__camera.flash[0].advanced[0].torch'), true);
        await page.click('[aria-label="Flip Camera"]');
        await page.waitFor('window.__camera.requests.length === 2 && window.__camera.stopped === 1 && !document.querySelector(\'[aria-label="Capture Photo"]\').disabled');
        assert.equal(await page.evaluate('window.__camera.requests[1].video.facingMode.exact'), 'user');
        await page.click('[aria-label="Capture Photo"]');
        await page.waitFor("document.body.innerText.includes('Bad appearance — Possible Algae Water')");
        assert.equal(await page.evaluate('window.__camera.stopped'), 2);
        assert.ok(await page.evaluate("document.body.innerText.includes('do not drink') && document.body.innerText.includes('kada a sha')"));
        assert.ok(await page.evaluate("document.body.innerText.includes('Not a water safety test')"));
        assert.equal(await page.evaluate("document.querySelector('[role=\"dialog\"]') === null"), true);

        // Closing while getUserMedia is pending must stop the late-arriving track.
        await page.evaluate('window.__camera.delayNext = true');
        await page.clickButtonText('Take Photo');
        await page.waitFor('window.__camera.requests.length === 3 && !!window.__releaseCamera');
        await page.click('[aria-label="Close Camera"]');
        await page.evaluate('window.__releaseCamera()');
        await page.waitFor('window.__camera.stopped === 3');

        // Manual samples remain available and are identified as examples.
        await page.clickButtonText('Clean Borehole');
        await page.waitFor("document.body.innerText.includes('Manual example only')");
        assert.ok(await page.evaluate("document.body.innerText.includes('Good appearance — Clean Borehole-like')"));
        await page.waitFor("window.__spokenTexts.some(text => text.includes('only an example, not a test of your water') && text.includes('germs or chemicals'))");
        await page.click('[aria-label="Livestock"]');
        await page.waitFor("document.body.innerText.includes('9 Animal Sounds')");
        await page.waitFor('!!navigator.serviceWorker.controller');
        await page.waitFor("caches.keys().then(keys => keys.some(key => key.startsWith('smartvillage-animal-sounds-')) && keys.some(key => key.startsWith('smartvillage-app-shell-')))");
        const speechBefore = await page.evaluate('window.__speechCalls');
        await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
        const animals = [
          ['Chicken', 'chicken'], ['Goat', 'goat'], ['Sheep', 'sheep'], ['Cattle', 'cattle'],
          ['Donkey', 'donkey'], ['Camel', 'camel'], ['Pig', 'pig'], ['Duck', 'duck'], ['Turkey', 'turkey'],
        ];
        for (const [name, id] of animals) {
          await page.click(`[title="Play ${name} sound"]`);
          await page.waitFor(`(() => { const a = document.querySelector('audio'); return a && a.currentSrc.endsWith('/sounds/${id}.mp3') && !a.error && a.readyState >= 2 && (a.currentTime > 0 || a.ended); })()`);
        }
        assert.equal(await page.evaluate('window.__speechCalls'), speechBefore, 'animal playback must not invoke speech synthesis');
        // A previously visited production web app can also be reopened offline.
        await page.send('Page.reload');
        await page.waitFor("document.body.innerText.includes('Check Water Quality')");
        await page.clickButtonText('Check Water Quality');
        await page.waitFor("document.body.innerText.includes('Take Photo')");
        await page.clickButtonText('Take Photo');
        await page.waitFor("document.querySelector('[aria-label=\"Capture Photo\"]') && !document.querySelector('[aria-label=\"Capture Photo\"]').disabled");
        await page.click('[aria-label="Capture Photo"]');
        await page.waitFor("document.body.innerText.includes('Bad appearance — Possible Algae Water')");
      } finally {
        await page.close();
      }
    });

    await t.test('web recovers the original camera when the requested front lens is unavailable', async () => {
      const page = await newPage(chrome.port, origin, mockWebCamera);
      try {
        await page.evaluate('window.__camera.failFront = true');
        await page.clickButtonText('Check Water Quality');
        await page.clickButtonText('Take Photo');
        await page.waitFor("document.querySelector('[aria-label=\"Capture Photo\"]') && !document.querySelector('[aria-label=\"Capture Photo\"]').disabled");
        await page.click('[aria-label="Flip Camera"]');
        await page.waitFor("document.body.innerText.includes('The other camera is not available')");
        assert.equal(await page.evaluate('window.__camera.requests.length'), 3);
        assert.equal(await page.evaluate('window.__camera.requests[2].video.facingMode.ideal'), 'environment');
        await page.click('[aria-label="Close Camera"]');
        assert.equal(await page.evaluate('window.__camera.stopped'), 2);
      } finally {
        await page.close();
      }
    });

    await t.test('native start/stop ordering, flash, flip and capture', async () => {
      const page = await newPage(chrome.port, origin, mockNativeCamera);
      try {
        await page.clickButtonText('Check Water Quality');
        await page.clickButtonText('Take Photo');
        await page.waitFor("window.__native.some(entry => entry.method === 'start')");
        await page.click('[aria-label="Close Camera"]');
        await page.clickButtonText('Take Photo');
        await page.waitFor("window.__native.filter(entry => entry.method === 'started').length === 2");
        await page.waitFor("document.querySelector('[aria-label=\"Capture Photo\"]') && !document.querySelector('[aria-label=\"Capture Photo\"]').disabled");
        const events = await page.evaluate('window.__native.map(entry => entry.method)');
        assert.deepEqual(events.slice(0, 5), ['start', 'started', 'stop', 'start', 'started']);
        assert.equal(await page.evaluate('window.__native[0].options.toBack'), true);
        assert.equal(await page.evaluate("document.documentElement.classList.contains('native-camera-open')"), true);
        await page.waitFor("document.querySelector('[aria-label=\"Turn flash on\"]') && !document.querySelector('[aria-label=\"Turn flash on\"]').disabled");
        await page.click('[aria-label="Turn flash on"]');
        await page.click('[aria-label="Flip Camera"]');
        await page.waitFor("window.__native.some(entry => entry.method === 'flip') && !document.querySelector('[aria-label=\"Capture Photo\"]').disabled");
        await page.click('[aria-label="Capture Photo"]');
        await page.waitFor("document.body.innerText.includes('Good appearance — Clean Borehole-like')");
        await page.waitFor("window.__native.filter(entry => entry.method === 'stop').length === 2");
        assert.ok(await page.evaluate("window.__native.some(entry => entry.method === 'setFlashMode' && entry.options.flashMode === 'on')"));
        assert.equal(await page.evaluate("document.documentElement.classList.contains('native-camera-open')"), false);
      } finally {
        await page.close();
      }
    });

    await t.test('native devices without a second lens or flash show disabled controls', async () => {
      const page = await newPage(chrome.port, origin, mockNativeCamera);
      try {
        await page.evaluate("window.__nativePositions = ['rear']; window.__nativeFlashModes = ['off']");
        await page.clickButtonText('Check Water Quality');
        await page.clickButtonText('Take Photo');
        await page.waitFor("document.querySelector('[aria-label=\"Capture Photo\"]') && !document.querySelector('[aria-label=\"Capture Photo\"]').disabled");
        assert.equal(await page.evaluate("document.querySelector('[aria-label=\"Flip Camera\"]').disabled"), true);
        assert.equal(await page.evaluate("document.querySelector('[aria-label=\"Flash unavailable\"]').disabled"), true);
        await page.click('[aria-label="Close Camera"]');
        await page.waitFor("window.__native.some(entry => entry.method === 'stop')");
      } finally {
        await page.close();
      }
    });
  } finally {
    if (chrome) {
      if (chrome.child.exitCode === null) {
        chrome.child.kill();
        await new Promise(resolve => chrome.child.once('exit', resolve));
      }
      await rm(chrome.profile, { recursive: true, force: true });
    }
    await new Promise(resolve => server.close(resolve));
  }
});
