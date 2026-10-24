import { TextToSpeech } from '@capacitor-community/text-to-speech';
import * as ort from 'onnxruntime-web';
import { preprocessHausaText, splitSpeechChunks } from '../utils/textPreprocessor';

ort.env.wasm.wasmPaths = '/models/murya/';
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

interface PiperConfig {
  phoneme_type: string;
  phoneme_id_map: Record<string, number[]>;
  audio: { sample_rate: number };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
}

export class SystemTTSEngine {
  private finish?: () => void;

  async speak(text: string, lang: string): Promise<void> {
    for (const language of [...new Set([lang, 'en-NG'])]) {
      try {
        await TextToSpeech.speak({ text, lang: language, rate: 0.9, pitch: 1, volume: 1 });
        return;
      } catch (error) {
        console.warn('System voice unavailable:', language, error);
      }
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    await new Promise<void>(resolve => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      const finish = () => { this.finish = undefined; resolve(); };
      this.finish = finish;
      utterance.onend = finish;
      utterance.onerror = finish;
      try { window.speechSynthesis.speak(utterance); } catch { finish(); }
    });
  }

  async stop(): Promise<void> {
    this.finish?.();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    await TextToSpeech.stop().catch(() => {});
  }
}

export class MuryaTTSEngine {
  private ready?: Promise<{ config: PiperConfig; session: ort.InferenceSession }>;
  private context?: AudioContext;
  private source?: AudioBufferSourceNode;

  // Call before the first await to preserve the browser's user-gesture activation.
  unlock(): void {
    this.context ??= new AudioContext();
    void this.context.resume().catch(() => {});
  }

  private load() {
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

  async speak(text: string, isCurrent: () => boolean): Promise<void> {
    if (text.length > 240) throw new Error('Chunk too large for Murya');
    const { config, session } = await this.load();
    if (!isCurrent()) return;
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
      if (!isCurrent()) return;
      const samples = outputs[session.outputNames[0]].data;
      if (!(samples instanceof Float32Array) || !samples.length) throw new Error('Invalid Murya audio');
      this.context ??= new AudioContext();
      await this.context.resume();
      if (!isCurrent()) return;
      const buffer = this.context.createBuffer(1, samples.length, config.audio.sample_rate);
      buffer.getChannelData(0).set(samples);
      await new Promise<void>((resolve, reject) => {
        const source = this.context!.createBufferSource();
        this.source = source;
        source.buffer = buffer;
        source.connect(this.context!.destination);
        source.onended = () => {
          source.disconnect();
          if (this.source === source) this.source = undefined;
          resolve();
        };
        try { source.start(); } catch (error) { source.disconnect(); this.source = undefined; reject(error); }
      });
    } finally {
      Object.values(feeds).forEach(tensor => tensor.dispose());
      if (outputs) Object.values(outputs).forEach(tensor => tensor.dispose());
    }
  }

  stop(): void {
    try { this.source?.stop(); } catch { /* Already ended. */ }
    this.source = undefined;
  }
}

const murya = new MuryaTTSEngine();
const system = new SystemTTSEngine();
let generation = 0;
// Serialize requests so a cancelled inference cannot overlap another inference.
let queue: Promise<void> = Promise.resolve();

export async function speakText(text: string, langCode: string): Promise<void> {
  const id = ++generation;
  const current = () => generation === id;
  const hausa = langCode === 'ha' || langCode === 'ha-NG';
  if (hausa) { try { murya.unlock(); } catch { /* System fallback below. */ } }
  murya.stop();
  const stopped = system.stop();
  const run = async () => {
    await stopped;
    if (!current()) return;
    for (const original of splitSpeechChunks(text)) {
      if (!current()) break;
      if (hausa) {
        try {
          await murya.speak(preprocessHausaText(original), current);
          continue;
        } catch (error) {
          console.warn('Murya chunk failed; using system TTS:', error);
        }
      }
      if (current()) await system.speak(original, hausa ? 'ha-NG' : 'en-NG');
    }
  };
  queue = queue.then(run, run).catch(error => { console.warn('Speech failed:', error); });
  return queue;
}

export async function stopSpeakingText(): Promise<void> {
  ++generation;
  murya.stop();
  await system.stop();
}
