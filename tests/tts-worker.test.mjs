import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('src/services/ttsService.ts', 'utf8');
assert.ok(!source.includes('onnxruntime-web'), 'Main thread must not import ONNX');
const js = ts.transpileModule(source.replace(/^import .*;\n/gm, '').replace('import.meta.url', '"https://app.test/ttsService.ts"'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const timers = new Map();
const workers = [];
const spoken = [];
const events = [];
let timerId = 0;
class FakeWorker {
  constructor() { workers.push(this); }
  postMessage(request) { this.request = request; }
  terminate() { this.terminated = true; }
}
const exports = {};
const sandbox = {
  exports, URL, Worker: FakeWorker, console: { warn() {} },
  setTimeout(fn, ms) { assert.equal(ms, 2000); timers.set(++timerId, fn); return timerId; },
  clearTimeout(id) { timers.delete(id); },
  window: { dispatchEvent(event) { events.push(event.detail); } },
  CustomEvent: class { constructor(_, options) { this.detail = options.detail; } },
  TextToSpeech: { async stop() {}, async speak({ text }) { spoken.push(text); } },
  preprocessHausaText: text => text.toLowerCase(),
  splitSpeechChunks: text => text.split('|'),
  AudioContext: class {
    async resume() {}
    createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
    createBufferSource() { return { connect() {}, disconnect() {}, start() { queueMicrotask(() => this.onended()); }, stop() {} }; }
  },
};
vm.runInNewContext(js, sandbox);
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
assert.equal(workers.length, 0, 'No worker/model at startup');
await exports.speakText('English', 'en');
assert.equal(workers.length, 0, 'English never loads model');
const speech = exports.speakText('Sannu|Bakwai', 'ha');
await flush();
assert.equal(workers.length, 1);
assert.equal(events.at(-1), true);
for (const fn of [...timers.values()]) fn();
await speech;
assert.ok(workers[0].terminated, 'Timeout must abort worker, not just ignore audio');
assert.deepEqual(spoken, ['English', 'Sannu', 'Bakwai']);
assert.equal(workers.length, 1, 'Remaining chunks skip repeated timeouts');
assert.equal(events.at(-1), false);
assert.equal(timers.size, 0);
const cancelled = exports.speakText('Cancel', 'ha');
await flush();
await exports.stopSpeakingText();
await cancelled;
assert.ok(workers[1].terminated);
assert.ok(!spoken.includes('Cancel'), 'Cancellation must not fall back or play stale speech');
const success = exports.speakText('Audio', 'ha');
await flush();
const worker = workers.at(-1);
worker.onmessage({ data: { id: worker.request.id, type: 'audio', samples: new Float32Array(8), sampleRate: 22050 } });
await success;
assert.ok(!spoken.includes('Audio'), 'Successful worker audio must not use system voice');
assert.equal(timers.size, 0);
assert.equal(events.at(-1), false);
assert.ok(!fs.readFileSync('public/service-worker.js', 'utf8').includes('cache.addAll'), 'No startup model precache');
console.log('PASS: lazy worker, 2000ms timeout, termination, fallback, cancellation, audio success, loading events');
