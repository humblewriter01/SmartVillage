import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as ort from 'onnxruntime-web/wasm';

const source = fs.readFileSync('src/utils/textPreprocessor.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { preprocessHausaText, splitSpeechChunks } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
assert.equal(preprocessHausaText('Mancozeb onion pH GPS 7 dogon-yaro'), 'mankozeb aniyan pi eich ji pi es bakwai dogon yaro');
assert.equal(preprocessHausaText('0 1 2 3 4 5 6 7 8 9 10'), 'sifili ɗaya biyu uku huɗu biyar shida bakwai takwas tara goma');
assert.ok(splitSpeechChunks('sannu '.repeat(100)).every(chunk => chunk.length <= 180));
assert.deepEqual(splitSpeechChunks('Sannu! Yaya?'), ['Sannu!', 'Yaya?']);
const config = JSON.parse(fs.readFileSync('public/models/murya/murya.onnx.json'));
assert.ok(!config.phoneme_id_map['🙂'], 'Unmapped characters must trigger fallback, not be dropped');
for (const name of ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.jsep.wasm', 'ort-wasm-simd-threaded.jsep.mjs']) {
  assert.ok(fs.readFileSync(`public/models/murya/${name}`).equals(fs.readFileSync(`node_modules/onnxruntime-web/dist/${name}`)), `${name} version mismatch`);
}
ort.env.wasm.numThreads = 1;
const session = await ort.InferenceSession.create(fs.readFileSync('public/models/murya/murya.onnx'), { executionProviders: ['wasm'] });
const map = config.phoneme_id_map;
const ids = [...map['^'], ...map['_']];
for (const c of preprocessHausaText('Sannu 7')) ids.push(...map[c], ...map['_']);
ids.push(...map['$']);
const feeds = {
  input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
  input_lengths: new ort.Tensor('int64', BigInt64Array.of(BigInt(ids.length)), [1]),
  scales: new ort.Tensor('float32', Float32Array.of(.667, 1, .8), [3]),
  sid: new ort.Tensor('int64', BigInt64Array.of(BigInt(0)), [1]),
};
try {
  const output = await session.run(feeds);
  const samples = output[session.outputNames[0]].data;
  assert.ok(samples instanceof Float32Array && samples.length > 0 && samples.every(Number.isFinite));
  console.log(`PASS: preprocessing, chunking, asset versions and real WASM inference (${samples.length} samples)`);
  Object.values(output).forEach(tensor => tensor.dispose());
} finally {
  Object.values(feeds).forEach(tensor => tensor.dispose());
  await session.release();
}
