import * as ort from 'onnxruntime-web/wasm';
import type { TTSWorkerRequest, TTSWorkerResponse } from './ttsProtocol';

// SIMD WASM runs entirely in this worker. Unsupported browsers use system TTS.
ort.env.wasm.wasmPaths = '/models/murya/';
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

interface PiperConfig {
  phoneme_type: string;
  phoneme_id_map: Record<string, number[]>;
  audio: { sample_rate: number };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
}

class WorkerEngine {
  private ready?: Promise<{ config: PiperConfig; session: ort.InferenceSession }>;
  load() {
    this.ready ??= (async () => {
      const response = await fetch('/models/murya/murya.onnx.json');
      if (!response.ok) throw new Error(`Murya config: HTTP ${response.status}`);
      const config: PiperConfig = await response.json();
      if (config.phoneme_type !== 'text' || !config.phoneme_id_map) {
        throw new Error('Murya requires a text-phoneme Piper config');
      }
      const session = await ort.InferenceSession.create('/models/murya/murya.onnx', {
        executionProviders: ['wasm'],
      });
      return { config, session };
    })().catch(error => { this.ready = undefined; throw error; });
    return this.ready;
  }


  async synthesize(text: string) {
    if (!text.trim() || text.length > 240) throw new Error('Invalid Murya chunk');
    const { config, session } = await this.load();
    const map = config.phoneme_id_map;
    const lookup = (symbol: string) => {
      if (!map[symbol]?.length) throw new Error(`Unmapped Murya phoneme: ${symbol}`);
      return map[symbol];
    };
    // Piper text phonemes: BOS, padding, then each symbol + padding, EOS.
    const ids = [...lookup('^'), ...lookup('_')];
    for (const symbol of text) ids.push(...lookup(symbol), ...lookup('_'));
    ids.push(...lookup('$'));
    const feeds: Record<string, ort.Tensor> = {
      input: new ort.Tensor('int64', BigInt64Array.from(ids, id => BigInt(id)), [1, ids.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.of(BigInt(ids.length)), [1]),
      scales: new ort.Tensor('float32', Float32Array.of(
        config.inference.noise_scale, config.inference.length_scale, config.inference.noise_w), [3]),
    };
    // The uploaded model has eight speakers; select the first trained voice.
    if (session.inputNames.includes('sid')) {
      feeds.sid = new ort.Tensor('int64', BigInt64Array.of(BigInt(0)), [1]);
    }
    let outputs: Record<string, ort.Tensor> | undefined;
    try {
      outputs = await session.run(feeds);
      const samples = outputs[session.outputNames[0]].data;
      if (!(samples instanceof Float32Array) || !samples.length) throw new Error('Invalid Murya audio');
      // Copy out of ORT-owned memory before disposing tensors; transfer, don't clone.
      return { samples: new Float32Array(samples), sampleRate: config.audio.sample_rate };
    } finally {
      Object.values(feeds).forEach(tensor => tensor.dispose());
      if (outputs) Object.values(outputs).forEach(tensor => tensor.dispose());
    }
  }
}
const engine = new WorkerEngine();
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<TTSWorkerRequest>) => void) | null;
  postMessage(message: TTSWorkerResponse, transfer?: Transferable[]): void;
};
scope.onmessage = async ({ data }) => {
  try {
    const { samples, sampleRate } = await engine.synthesize(data.text);
    scope.postMessage({ id: data.id, type: 'audio', samples, sampleRate }, [samples.buffer]);
  } catch (error) {
    scope.postMessage({ id: data.id, type: 'error', message: String(error) });
  }
};
