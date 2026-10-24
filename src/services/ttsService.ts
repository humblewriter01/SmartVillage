import { TextToSpeech } from '@capacitor-community/text-to-speech';
import type { TTSWorkerResponse } from '../workers/ttsProtocol';
import { preprocessHausaText, splitSpeechChunks } from '../utils/textPreprocessor';

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
  private worker?: Worker;
  private pending?: { reject: (error: Error) => void };
  private requestId = 0;
  private context?: AudioContext;
  private source?: AudioBufferSourceNode;
  private finishPlayback?: () => void;

  unlock(): void {
    this.context ??= new AudioContext();
    void this.context.resume().catch(() => {});
  }

  private generate(text: string): Promise<Extract<TTSWorkerResponse, { type: 'audio' }>> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const loading = () => window.dispatchEvent(new CustomEvent('murya-loading', { detail: false }));
      const finish = () => {
        clearTimeout(timer);
        this.pending = undefined;
        loading();
      };
      const fail = (error: Error) => {
        finish();
        // ORT session.run cannot be interrupted with a message. Terminate the
        // worker to abort inference and release its model/WASM memory immediately.
        this.worker?.terminate();
        this.worker = undefined;
        reject(error);
      };
      // Includes worker startup, runtime import, model fetch, and inference.
      const timer = setTimeout(() => fail(new Error('Murya exceeded 2 seconds')), 2000);
      this.pending = { reject: fail };
      window.dispatchEvent(new CustomEvent('murya-loading', { detail: true }));
      try {
        this.worker ??= new Worker(new URL('../workers/ttsWorker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = ({ data }: MessageEvent<TTSWorkerResponse>) => {
          if (data.id !== id) return;
          if (data.type === 'error') { fail(new Error(data.message)); return; }
          finish();
          resolve(data);
        };
        this.worker.onerror = event => { event.preventDefault(); fail(new Error(event.message || 'Voice worker failed')); };
        this.worker.onmessageerror = () => fail(new Error('Invalid voice worker response'));
        this.worker.postMessage({ id, text });
      } catch (error) { fail(error instanceof Error ? error : new Error(String(error))); }
    });
  }

  async speak(text: string, isCurrent: () => boolean): Promise<void> {
    if (text.length > 240) throw new Error('Chunk too large for Murya');
    const { samples, sampleRate } = await this.generate(text);
    if (!isCurrent()) return;
    this.context ??= new AudioContext();
    await this.context.resume();
    if (!isCurrent()) return;
    const buffer = this.context.createBuffer(1, samples.length, sampleRate);
    buffer.getChannelData(0).set(samples);
    await new Promise<void>((resolve, reject) => {
      const source = this.context!.createBufferSource();
      this.source = source;
      source.buffer = buffer;
      source.connect(this.context!.destination);
      let ended = false;
      const finish = () => {
        if (ended) return;
        ended = true;
        source.disconnect();
        if (this.source === source) this.source = undefined;
        this.finishPlayback = undefined;
        resolve();
      };
      this.finishPlayback = finish;
      source.onended = finish;
      try { source.start(); } catch (error) { finish(); reject(error); }
    });
  }

  stop(): void {
    this.pending?.reject(new Error('Voice request cancelled'));
    try { this.source?.stop(); } catch { /* Already ended. */ }
    this.finishPlayback?.();
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
    let useMurya = hausa;
    for (const original of splitSpeechChunks(text)) {
      if (!current()) break;
      if (useMurya) {
        try {
          await murya.speak(preprocessHausaText(original), current);
          continue;
        } catch (error) {
          useMurya = false; // Don't impose another timeout on every remaining chunk.
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
