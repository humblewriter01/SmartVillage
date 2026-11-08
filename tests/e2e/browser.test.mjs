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

async function analyzeWater(page, label = 'Analyze Water') {
  await page.waitFor(`Array.from(document.querySelectorAll('button')).some(button => button.innerText.trim() === ${JSON.stringify(label)} && !button.disabled)`);
  await page.clickButtonText(label);
}

async function assertCompactSamplePreview(page) {
  await page.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await page.evaluate('window.scrollTo(0, 0)');
  const layout = await page.evaluate(`(() => {
    const samples = document.querySelector('[aria-label="Water samples"], [aria-label="Samfuran ruwa"]');
    return { bottom: samples.getBoundingClientRect().bottom, navTop: document.querySelector('nav.fixed').getBoundingClientRect().top };
  })()`);
  assert.ok(layout.bottom < layout.navTop, 'all three example cards should fit above the navigation on a narrow phone');
}

async function assertCompactWaterResult(page, verdict) {
  await page.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await page.evaluate('window.scrollTo(0, 0)');
  const layout = await page.evaluate(`(() => {
    const title = [...document.querySelectorAll('h3')].find(el => el.innerText.includes(${JSON.stringify(verdict)}));
    const nav = document.querySelector('nav.fixed');
    return { titleWidth: title.getBoundingClientRect().width, titleBottom: title.getBoundingClientRect().bottom,
      headerHeight: document.querySelector('h1').getBoundingClientRect().height,
      navTop: nav.getBoundingClientRect().top, pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth };
  })()`);
  assert.ok(layout.pageFits && layout.titleWidth >= 150 && layout.titleBottom < layout.navTop && layout.headerHeight < 30, 'headings should be readable and visible on a narrow phone');
}

async function chooseGalleryFile(page, path) {
  // Drive the actual browser file input without opening an OS dialog.
  await page.send('Page.setInterceptFileChooserDialog', { enabled: true });
  await page.clickButtonText('Choose from Gallery');
  const document = await page.send('DOM.getDocument');
  const input = await page.send('DOM.querySelector', { nodeId: document.root.nodeId, selector: 'input[type="file"]' });
  assert.ok(input.nodeId, 'gallery should open a file input');
  await page.send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [resolve(path)] });
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
    PluginHeaders: [
      { name: 'CameraPreview', methods: ['start', 'stop', 'getSupportedFlashModes', 'getAvailableDevices', 'setFlashMode', 'flip', 'capture'].map(name => ({ name, rtype: 'promise' })) },
      { name: 'Camera', methods: [{ name: 'getPhoto', rtype: 'promise' }] },
    ],
    nativePromise: async (plugin, method, options) => {
      window.__native.push({ plugin, method, options });
      if (plugin === 'Camera' && method === 'getPhoto') {
        if (window.__galleryError) throw new Error(window.__galleryError);
        if (window.__delayGallery) {
          window.__delayGallery = false;
          await new Promise(resolve => { window.__releaseGallery = resolve; });
        }
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 100;
        const context = canvas.getContext('2d'); context.fillStyle = '#f4f4f4'; context.fillRect(0, 0, 100, 100);
        return { dataUrl: canvas.toDataURL('image/jpeg') };
      }
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

test('production browser flows, offline sounds and native camera lifecycle', { timeout: 90000 }, async t => {
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
        const historyBeforePhoto = await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length");
        await page.click('[aria-label="Capture Photo"]');
        await page.waitFor("document.querySelector('img[alt=\"Water image preview\"]')?.naturalWidth > 0");
        assert.equal(await page.evaluate("document.body.innerText.includes('Bad appearance — Possible Algae Water')"), false);
        assert.equal(await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length"), historyBeforePhoto);
        await analyzeWater(page);
        await page.waitFor("document.body.innerText.includes('Bad appearance — Possible Algae Water')");
        assert.ok(await page.evaluate("document.querySelector('img[alt=\"Water image preview\"]').src.startsWith('data:image/')"));
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

        // Manual samples first replace the preview, then are identified as examples after analysis.
        await page.clickButtonText('Clean Borehole');
        assert.equal(await page.evaluate("document.body.innerText.includes('Bad appearance — Possible Algae Water')"), false);
        assert.equal(await page.evaluate("document.body.innerText.includes('Manual example only')"), false);
        await analyzeWater(page);
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
        await analyzeWater(page);
        await page.waitFor("document.body.innerText.includes('Bad appearance — Possible Algae Water')");
      } finally {
        await page.close();
      }
    });

    await t.test('water sample thumbnails, previews, analysis and translations work offline', async () => {
      const page = await newPage(chrome.port, origin, mockWebCamera);
      try {
        await page.clickButtonText('Check Water Quality');
        await page.waitFor("document.body.innerText.includes('Choose from Gallery')");
        const initial = await page.evaluate(`(() => {
          const preview = document.querySelector('.border-dashed');
          const action = preview.nextElementSibling;
          return { dashed: getComputedStyle(preview).borderTopStyle, action: action.innerText.trim(), disabled: action.disabled };
        })()`);
        assert.deepEqual(initial, { dashed: 'dashed', action: 'Analyze Water', disabled: true });
        assert.equal(await page.evaluate("document.querySelectorAll('[aria-label^=\"Read \" i][aria-label$=\" aloud\" i]').length"), 3);
        assert.ok(await page.evaluate("!!document.querySelector('[title=\"Read Aloud\"]') && !!document.querySelector('[title=\"Read samples list\"]') && !!document.querySelector('[title=\"Listen to all tips\"]')"));
        assert.equal(await page.evaluate("document.querySelectorAll('button[title=\"Listen\"]').length"), 7);
        for (const locale of ['en', 'ha']) {
          if (locale === 'ha') {
            await page.evaluate("(() => { const select = document.querySelector('select[aria-label=\"Language\"]'); select.value = 'ha'; select.dispatchEvent(new Event('change', { bubbles: true })); })()");
            await page.waitFor("document.body.innerText.includes('Bincika Ruwa')");
          }
          for (const width of [320, 360, 390, 1024]) {
            await page.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 1024 });
            const grid = await page.evaluate(`(() => {
              const container = document.querySelector('[aria-label="Water samples"], [aria-label="Samfuran ruwa"]');
              const cards = [...container.children];
              return {
                columns: getComputedStyle(container).gridTemplateColumns.split(' ').length,
                pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
                sameRow: cards.every(card => Math.abs(card.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 1),
                samples: cards.map(card => {
                  const button = card.querySelector('button[aria-pressed]');
                  const speaker = card.querySelector('button[aria-label]');
                  return { label: button.innerText, loaded: button.querySelector('img').complete && button.querySelector('img').naturalWidth > 0,
                    fits: card.scrollWidth <= card.clientWidth && button.scrollWidth <= button.clientWidth,
                    speakerVisible: !!speaker && speaker.getBoundingClientRect().width >= 30 };
                }),
              };
            })()`);
            assert.equal(grid.columns, 3, `${locale} ${width}px: three compact columns`);
            assert.equal(grid.pageFits && grid.sameRow, true, `${locale} ${width}px: no horizontal overflow`);
            assert.equal(grid.samples.length, 3);
            assert.ok(grid.samples.every(sample => sample.loaded && sample.fits && sample.speakerVisible), `${locale} ${width}px: labels and speakers fit`);
            assert.match(grid.samples[0].label, /Clean Borehole/);
            assert.match(grid.samples[0].label, /Ruwan Fanfo Mai Tsabta/);
          }
        }
        await page.evaluate("(() => { const select = document.querySelector('select[aria-label=\"Harshe\"]'); select.value = 'en'; select.dispatchEvent(new Event('change', { bubbles: true })); })()");
        await page.waitFor("document.body.innerText.includes('Analyze Water')");
        await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

        await page.waitFor('!!navigator.serviceWorker.controller');
        await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
        await page.evaluate(`(() => {
          const original = CanvasRenderingContext2D.prototype.getImageData;
          window.__waterPixelReads = 0;
          CanvasRenderingContext2D.prototype.getImageData = function(...args) {
            window.__waterPixelReads++;
            if (window.__failWaterAnalysis) throw new Error('Simulated canvas failure');
            return original.apply(this, args);
          };
        })()`);
        const samples = [
          ['Clean Borehole', 'Good appearance — Clean Borehole-like'],
          ['Turbid River Water', 'Bad appearance — Turbid River Water-like'],
          ['Algae Water', 'Bad appearance — Possible Algae Water'],
        ];
        for (const [name, verdict] of samples) {
          const previousReads = await page.evaluate('window.__waterPixelReads');
          const previousHistory = await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length");
          await page.clickButtonText(name);
          await page.waitFor("document.querySelector('img[alt=\"Water image preview\"]')?.naturalWidth > 0");
          await page.waitFor("Array.from(document.querySelectorAll('button')).some(button => button.innerText.trim() === 'Analyze Water' && !button.disabled)");
          await delay(100);
          assert.equal(await page.evaluate('window.__waterPixelReads'), previousReads, 'selection must not run the canvas analyzer');
          assert.equal(await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length"), previousHistory, 'selection must not save history');
          assert.equal(await page.evaluate("document.body.innerText.includes('Manual example only')"), false, 'selection must clear the previous result');
          const preview = await page.evaluate(`(() => {
            const image = document.querySelector('img[alt="Water image preview"]');
            const selected = document.querySelector('[aria-label="Water samples"] button[aria-pressed="true"] img');
            return { loaded: image.complete && image.naturalWidth > 0, sameImage: image.src === selected.src };
          })()`);
          assert.deepEqual(preview, { loaded: true, sameImage: true });
          if (name === 'Clean Borehole') {
            await assertCompactSamplePreview(page);
            await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
          }
          await analyzeWater(page);
          await page.waitFor(`window.__waterPixelReads > ${previousReads} && document.body.innerText.includes(${JSON.stringify(verdict)})`);
          assert.ok(await page.evaluate("document.body.innerText.includes('Manual example only')"));
          assert.ok(await page.evaluate("!!document.querySelector('button[title=\"Read result aloud\"]')"));
          assert.equal(await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length"), previousHistory + 1);
        }
        await page.waitFor("window.__spokenTexts.some(text => text.includes('Tap Analyze Water to check the image'))");
        const selectedPreview = await page.evaluate("document.querySelector('img[alt=\"Water image preview\"]').src");
        await page.click('[aria-label="Read Turbid River Water aloud"]');
        await page.waitFor("window.__spokenTexts.some(text => text.includes('Turbid River Water') && text.includes('only an example'))");
        assert.equal(await page.evaluate("document.querySelector('img[alt=\"Water image preview\"]').src"), selectedPreview, 'speaker must not change the selected image');

        // A failed canvas read must not retain the previous result or report clean; retry is possible.
        const historyBeforeFailure = await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length");
        await page.evaluate('window.__failWaterAnalysis = true');
        await page.clickButtonText('Clean Borehole');
        await analyzeWater(page);
        await page.waitFor("document.body.innerText.includes('Could not analyze the image')");
        assert.equal(await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length"), historyBeforeFailure);
        assert.equal(await page.evaluate("document.body.innerText.includes('Manual example only')"), false);
        assert.equal(await page.evaluate("document.querySelector('img[alt=\"Water image preview\"]').src === document.querySelector('[aria-label=\"Water samples\"] button[aria-pressed=\"true\"] img').src"), true);
        await page.evaluate('window.__failWaterAnalysis = false');
        await analyzeWater(page);
        await page.waitFor("document.body.innerText.includes('Good appearance — Clean Borehole-like')");
        assert.equal(await page.evaluate("document.body.innerText.includes('Could not analyze the image')"), false);
        await assertCompactWaterResult(page, 'Good appearance — Clean Borehole-like');
        await page.clickButtonText('Remove photo');
        assert.equal(await page.evaluate("!!document.querySelector('img[alt=\"Water image preview\"]')"), false);
        assert.equal(await page.evaluate("document.querySelectorAll('[aria-label=\"Water samples\"] button[aria-pressed=\"true\"]').length"), 0);
        assert.equal(await page.evaluate("Array.from(document.querySelectorAll('button')).find(button => button.innerText.trim() === 'Analyze Water').disabled"), true);

        // A previously cached app still has all three examples after an offline reload.
        await page.send('Page.reload');
        await page.waitFor("document.body.innerText.includes('Check Water Quality')");
        await page.clickButtonText('Check Water Quality');
        await page.clickButtonText('Algae Water');
        assert.equal(await page.evaluate("document.body.innerText.includes('Bad appearance — Possible Algae Water')"), false);
        await analyzeWater(page);
        await page.waitFor("document.body.innerText.includes('Bad appearance — Possible Algae Water')");
        assert.ok(await page.evaluate("document.querySelector('img[alt=\"Water image preview\"]').naturalWidth > 0"));

        // The controls, preview description and both sample labels switch to Hausa.
        await page.evaluate("(() => { const select = document.querySelector('select[aria-label=\"Language\"]'); select.value = 'ha'; select.dispatchEvent(new Event('change', { bubbles: true })); })()");
        await page.waitFor("document.body.innerText.includes('Zaɓi daga Gallery')");
        assert.ok(await page.evaluate("!!document.querySelector('img[alt=\"Hoton ruwan da za a duba\"]')"));
        assert.match(await page.evaluate("document.querySelector('[aria-label=\"Samfuran ruwa\"] button[aria-pressed]').innerText"), /Ruwan Fanfo Mai Tsabta[\s\S]*Clean Borehole/);
        await page.clickButtonText('Ruwan Fanfo Mai Tsabta');
        assert.equal(await page.evaluate("document.body.innerText.includes('Yana da haske — kamar ruwan fanfo mai tsabta')"), false);
        await assertCompactSamplePreview(page);
        await analyzeWater(page, 'Bincika Ruwa');
        await page.waitFor("document.body.innerText.includes('Yana da haske — kamar ruwan fanfo mai tsabta')");
        await assertCompactWaterResult(page, 'Yana da haske — kamar ruwan fanfo mai tsabta');
        await page.evaluate("(() => { const select = document.querySelector('select[aria-label=\"Harshe\"]'); select.value = 'en'; select.dispatchEvent(new Event('change', { bubbles: true })); })()");
      } finally {
        await page.close();
      }
    });

    await t.test('web gallery opens a file picker and analyzes the chosen image offline', async () => {
      const page = await newPage(chrome.port, origin, mockWebCamera);
      try {
        await page.clickButtonText('Check Water Quality');
        await page.clickButtonText('Clean Borehole');
        await analyzeWater(page);
        await page.waitFor("document.body.innerText.includes('Good appearance — Clean Borehole-like')");
        const example = await page.evaluate("document.querySelector('img[alt=\"Water image preview\"]').src");
        const historyBeforeGallery = await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length");
        await page.waitFor('!!navigator.serviceWorker.controller');
        await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
        await chooseGalleryFile(page, 'src/assets/water/turbid.jpg');
        await page.waitFor(`(() => { const image = document.querySelector('img[alt="Water image preview"]'); return image?.naturalWidth > 0 && image.src !== ${JSON.stringify(example)}; })()`);
        const gallery = await page.evaluate(`(() => {
          const image = document.querySelector('img[alt="Water image preview"]');
          return { src: image.src, loaded: image.complete && image.naturalWidth > 0,
            selected: document.querySelectorAll('[aria-label="Water samples"] button[aria-pressed="true"]').length,
            oldResult: document.body.innerText.includes('Good appearance — Clean Borehole-like'),
            photoResult: document.body.innerText.includes('Photo appearance estimate, processed on this device.') };
        })()`);
        assert.ok(gallery.src.startsWith('data:image/'));
        assert.notEqual(gallery.src, example);
        assert.equal(gallery.loaded, true);
        assert.equal(gallery.selected, 0);
        assert.equal(gallery.oldResult || gallery.photoResult, false);
        assert.equal(await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length"), historyBeforeGallery);
        await analyzeWater(page);
        await page.waitFor("document.body.innerText.includes('Bad appearance — Turbid River Water-like')");
        assert.ok(await page.evaluate("document.body.innerText.includes('Photo appearance estimate, processed on this device.')"));
        await page.clickButtonText('Remove photo');
        assert.equal(await page.evaluate("!!document.querySelector('img[alt=\"Water image preview\"]')"), false);
        assert.equal(await page.evaluate("document.body.innerText.includes('Bad appearance — Turbid River Water-like')"), false);

        // A corrupt/non-image selection never enables analysis, and a new valid image recovers.
        await chooseGalleryFile(page, 'README.md');
        await page.waitFor("document.body.innerText.includes('Could not load this image')");
        assert.equal(await page.evaluate("Array.from(document.querySelectorAll('button')).find(button => button.innerText.trim() === 'Analyze Water').disabled"), true);
        await page.clickButtonText('Algae Water');
        await analyzeWater(page);
        await page.waitFor("document.body.innerText.includes('Bad appearance — Possible Algae Water')");
        assert.equal(await page.evaluate("document.body.innerText.includes('Could not load this image')"), false);
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

    await t.test('native gallery selection, cancellation, errors and stale picker results', async () => {
      const page = await newPage(chrome.port, origin, mockNativeCamera);
      try {
        await page.clickButtonText('Check Water Quality');
        await page.waitFor('!!navigator.serviceWorker.controller');
        await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
        // Keep a sample decode pending while the gallery is opened and cancelled.
        await page.evaluate(`(() => {
          const OriginalImage = window.Image;
          window.__delayNextWaterImage = true;
          window.Image = function(...args) {
            const image = new OriginalImage(...args);
            if (window.__delayNextWaterImage) {
              window.__delayNextWaterImage = false;
              let onload;
              Object.defineProperty(image, 'onload', { configurable: true, get: () => onload, set: handler => {
                onload = handler;
                image.addEventListener('load', () => { window.__releaseWaterAnalysis = () => handler.call(image, new Event('load')); }, { once: true });
              } });
            }
            return image;
          };
        })()`);
        await page.clickButtonText('Algae Water');
        await analyzeWater(page);
        await page.waitFor('!!window.__releaseWaterAnalysis');
        assert.equal(await page.evaluate("Array.from(document.querySelectorAll('button')).find(button => button.innerText.trim() === 'Analyzing Water…').disabled"), true);
        assert.ok(await page.evaluate("document.querySelector('[role=\"status\"]').innerText.includes('Analyzing')"));
        await page.evaluate("window.__galleryError = 'User cancelled photos app'");
        await page.clickButtonText('Choose from Gallery');
        await page.waitFor("window.__native.filter(entry => entry.plugin === 'Camera' && entry.method === 'getPhoto').length === 1");
        await page.evaluate('window.__releaseWaterAnalysis()');
        await page.waitFor("document.body.innerText.includes('Bad appearance — Possible Algae Water')");
        await page.evaluate('window.__galleryError = null');
        await page.clickButtonText('Choose from Gallery');
        await page.waitFor("window.__native.filter(entry => entry.plugin === 'Camera' && entry.method === 'getPhoto').length === 2 && document.querySelector('img[alt=\"Water image preview\"]')?.src.startsWith('data:image/jpeg') && !document.body.innerText.includes('Manual example only')");
        assert.equal(await page.evaluate("document.body.innerText.includes('Good appearance — Clean Borehole-like')"), false);
        await analyzeWater(page);
        await page.waitFor("document.body.innerText.includes('Good appearance — Clean Borehole-like')");
        const picker = await page.evaluate("window.__native.find(entry => entry.plugin === 'Camera' && entry.method === 'getPhoto').options");
        assert.equal(picker.source, 'PHOTOS');
        assert.equal(picker.resultType, 'dataUrl');
        assert.equal(await page.evaluate("window.__native.some(entry => entry.plugin === 'CameraPreview' && entry.method === 'start')"), false);
        const originalPreview = await page.evaluate("document.querySelector('img[alt=\"Water image preview\"]').src");
        assert.ok(originalPreview.startsWith('data:image/jpeg'));
        assert.equal(await page.evaluate("document.querySelectorAll('[aria-label=\"Water samples\"] button[aria-pressed=\"true\"]').length"), 0);

        await page.evaluate("window.__galleryError = 'User cancelled photos app'");
        await page.clickButtonText('Choose from Gallery');
        await page.waitFor("window.__native.filter(entry => entry.plugin === 'Camera' && entry.method === 'getPhoto').length === 3");
        assert.equal(await page.evaluate("document.querySelector('img[alt=\"Water image preview\"]').src"), originalPreview);
        assert.equal(await page.evaluate("document.body.innerText.includes('Could not open the gallery')"), false);

        await page.evaluate("window.__galleryError = 'Permission denied'");
        await page.clickButtonText('Choose from Gallery');
        await page.waitFor("document.body.innerText.includes('Could not open the gallery')");
        assert.equal(await page.evaluate("document.querySelector('img[alt=\"Water image preview\"]').src"), originalPreview);
        assert.ok(await page.evaluate("document.body.innerText.includes('Good appearance — Clean Borehole-like')"));

        // A delayed picker response cannot overwrite a newer sample selection.
        await page.evaluate('window.__galleryError = null; window.__delayGallery = true');
        await page.clickButtonText('Choose from Gallery');
        await page.waitFor('!!window.__releaseGallery');
        await page.clickButtonText('Algae Water');
        await page.waitFor("document.querySelector('[aria-label=\"Water samples\"] button[aria-pressed=\"true\"]') !== null");
        const samplePreview = await page.evaluate("document.querySelector('img[alt=\"Water image preview\"]').src");
        await page.evaluate('window.__releaseGallery()');
        await delay(100);
        assert.equal(await page.evaluate("document.querySelector('img[alt=\"Water image preview\"]').src"), samplePreview);
        assert.equal(await page.evaluate("document.body.innerText.includes('Manual example only')"), false);
        await analyzeWater(page);
        await page.waitFor("document.body.innerText.includes('Bad appearance — Possible Algae Water')");
        assert.ok(await page.evaluate("document.body.innerText.includes('Manual example only')"));

        // A late analysis must not publish or save a result for a replaced preview.
        const historyBeforeRace = await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length");
        await page.evaluate('window.__releaseWaterAnalysis = null; window.__delayNextWaterImage = true');
        await page.clickButtonText('Clean Borehole');
        await analyzeWater(page);
        await page.waitFor('!!window.__releaseWaterAnalysis');
        await page.clickButtonText('Turbid River Water');
        await page.evaluate('window.__releaseWaterAnalysis()');
        await delay(150);
        assert.equal(await page.evaluate("document.body.innerText.includes('Good appearance — Clean Borehole-like') || document.body.innerText.includes('Manual example only')"), false);
        assert.equal(await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length"), historyBeforeRace);
        await analyzeWater(page);
        await page.waitFor("document.body.innerText.includes('Bad appearance — Turbid River Water-like')");
        assert.equal(await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length"), historyBeforeRace + 1);

        // Reset while analyzing also invalidates the pending result.
        const historyBeforeReset = await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length");
        await page.evaluate('window.__releaseWaterAnalysis = null; window.__delayNextWaterImage = true');
        await page.clickButtonText('Clean Borehole');
        await analyzeWater(page);
        await page.waitFor('!!window.__releaseWaterAnalysis');
        await page.clickButtonText('Remove photo');
        await page.evaluate('window.__releaseWaterAnalysis()');
        await delay(150);
        assert.equal(await page.evaluate("document.body.innerText.includes('Manual example only')"), false);
        assert.equal(await page.evaluate("JSON.parse(localStorage.getItem('smartvillage.history.records') || '[]').length"), historyBeforeReset);
        assert.equal(await page.evaluate("Array.from(document.querySelectorAll('button')).find(button => button.innerText.trim() === 'Analyze Water').disabled"), true);
      } finally {
        await page.close();
      }
    });

    await t.test('shared native gallery remains usable in crop and health screens', async () => {
      const page = await newPage(chrome.port, origin, mockNativeCamera);
      try {
        await page.click('[aria-label="Crop"]');
        await page.waitFor("document.body.innerText.includes('Choose from Gallery')");
        await page.clickButtonText('Choose from Gallery');
        await page.waitFor("document.querySelector('img[alt=\"Leaf to analyze\"]')?.src.startsWith('data:image/jpeg')");
        await page.evaluate("window.__galleryError = 'Permission denied'");
        await page.clickButtonText('Choose from Gallery');
        await page.waitFor("document.body.innerText.includes('Could not open the gallery')");
        assert.ok(await page.evaluate("document.querySelector('img[alt=\"Leaf to analyze\"]').src.startsWith('data:image/jpeg')"));

        await page.click('[aria-label="Health"]');
        await page.waitFor("document.body.innerText.includes('Choose from Gallery')");
        await page.clickButtonText('Choose from Gallery');
        await page.waitFor("document.body.innerText.includes('Could not open the gallery')");
        await page.evaluate('window.__galleryError = null');
        await page.clickButtonText('Choose from Gallery');
        await page.waitFor("document.querySelector('img[alt=\"Health observation\"]')?.src.startsWith('data:image/jpeg')");
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
        await page.waitFor("document.querySelector('img[alt=\"Water image preview\"]')?.naturalWidth > 0");
        assert.equal(await page.evaluate("document.body.innerText.includes('Good appearance — Clean Borehole-like')"), false);
        await analyzeWater(page);
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
