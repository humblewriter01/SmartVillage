// Keep loader and binary versions paired after every dependency install.
import { copyFileSync } from 'node:fs';
for (const name of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  copyFileSync(new URL(`../node_modules/onnxruntime-web/dist/${name}`, import.meta.url),
    new URL(`../public/models/murya/${name}`, import.meta.url));
}
