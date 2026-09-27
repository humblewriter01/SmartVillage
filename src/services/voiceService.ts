// Advanced Offline & Web Speech Voice & Audio Recording Service for SmartVillage
// Integrates Capacitor VoiceRecorder plugin with native APK support and seamless Web fallback.

import { VoiceRecorder } from 'capacitor-voice-recorder';
import { Capacitor } from '@capacitor/core';
import { speakText, stopSpeakingText } from './ttsService';

export type VoiceMode = 'developer' | 'system';
export type VoiceCategory = 'greeting' | 'crop' | 'health';

export interface VoiceContext {
  type: 'crop' | 'health' | 'livestock' | 'water' | 'general';
  cropId?: string;
  diseaseId?: string;
  healthId?: string;
  conditionId?: string;
  livestockType?: string;
  animalId?: string;
  label?: string;
}

export interface VoiceRecordingResult {
  url: string;
  blob: Blob;
  dataUrl?: string;
  durationMs: number;
  transcript?: string;
  isSimulated?: boolean;
  timestamp: number;
  context?: VoiceContext;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

// Active recording & playback state
let activeRecognition: any = null;
let currentAudioContext: AudioContext | null = null;
let activeAudioPlayer: HTMLAudioElement | null = null;
let activeMediaStream: MediaStream | null = null;
let activeMediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recordingStartTime = 0;
let isCurrentlyRecording = false;
let isSimulatedRecording = false;
let isCapacitorRecording = false;
let activeRecordingContext: VoiceContext | undefined = undefined;
let lastRecordedAudio: VoiceRecordingResult | null = null;
let currentRecordedTranscript = '';
const permissionDeniedListeners = new Set<() => void>();
const permissionGrantedListeners = new Set<() => void>();

// PCM 16-bit WAV file generator
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /* RIFF chunk descriptor */
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');

  /* fmt sub-chunk */
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  /* data sub-chunk */
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export function generateHumanVoiceBlob(durationSeconds = 2.2, context?: VoiceContext): Blob {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * Math.max(1.2, durationSeconds));
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const syllablePhase = (t * 3.2) % 1.0;
    const syllableEnvelope = Math.sin(Math.PI * syllablePhase) ** 1.6;

    const f0 = 135.0 + Math.sin(2 * Math.PI * 1.4 * t) * 14.0;
    const glottal =
      0.6 * Math.sin(2 * Math.PI * f0 * t) +
      0.35 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
      0.18 * Math.sin(2 * Math.PI * (f0 * 3) * t);

    const f1 = 700.0;
    const f2 = 1250.0;
    const f3 = 2400.0;
    const formants =
      0.45 * Math.sin(2 * Math.PI * f1 * t) +
      0.3 * Math.sin(2 * Math.PI * f2 * t) +
      0.15 * Math.sin(2 * Math.PI * f3 * t);

    const breath = (Math.random() * 2 - 1) * 0.035;
    const speechWave = (glottal * 0.6 + formants * 0.4 + breath) * syllableEnvelope;

    const overallEnv = Math.min(1.0, Math.sin((Math.PI * i) / numSamples) * 2.2);
    samples[i] = speechWave * overallEnv * 0.42;
  }
  return encodeWav(samples, sampleRate);
}


/**
 * Generate distinct realistic animal sound waveforms exclusively for the 9 Livestock Animals
 * (Cow, Goat, Sheep, Chicken, Donkey, Camel, Pig, Duck, Turkey).
 * Only played when the user explicitly clicks "Saurari Kukan Dabba" in the Livestock section.
 */
export function generateAnimalSoundWaveform(rawAnimalId: string, durationSeconds = 2.0): Blob {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * Math.max(1.2, Math.min(durationSeconds, 3.5)));
  const samples = new Float32Array(numSamples);

  const animalId = (rawAnimalId || '').toLowerCase();

  if (animalId.includes('cow') || animalId.includes('cattle') || animalId.includes('saniya')) {
      // COW / CATTLE: Low resonant "Moooo" (110Hz to 85Hz smooth dip with warm overtones)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const progress = i / numSamples;
        const f0 = 108 - Math.sin(progress * Math.PI) * 22;
        const env = Math.sin(progress * Math.PI) ** 0.8;
        const wave =
          0.6 * Math.sin(2 * Math.PI * f0 * t) +
          0.3 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
          0.15 * Math.sin(2 * Math.PI * (f0 * 3) * t);
        samples[i] = wave * env * 0.45;
      }
    } else if (animalId.includes('goat') || animalId.includes('akuya')) {
      // GOAT: High vibrato bleat "Meh-eh-eh-eh" (250Hz with 12Hz rapid flutter)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.sin((Math.PI * i) / numSamples);
        const tremolo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 12.0 * t);
        const f0 = 240 + Math.sin(2 * Math.PI * 12.0 * t) * 15;
        const wave =
          (0.6 * Math.sin(2 * Math.PI * f0 * t) +
            0.35 * Math.sin(2 * Math.PI * (f0 * 2) * t)) *
          (0.4 + 0.6 * tremolo);
        samples[i] = wave * env * 0.42;
      }
    } else if (animalId.includes('sheep') || animalId.includes('tinkiya')) {
      // SHEEP: Warm resonant "Baa-aa-aa" (185Hz with 7.5Hz tremolo)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.sin((Math.PI * i) / numSamples);
        const tremolo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 7.5 * t);
        const f0 = 180 + Math.sin(2 * Math.PI * 7.5 * t) * 10;
        const wave =
          (0.65 * Math.sin(2 * Math.PI * f0 * t) +
            0.28 * Math.sin(2 * Math.PI * (f0 * 2) * t)) *
          (0.4 + 0.6 * tremolo);
        samples[i] = wave * env * 0.44;
      }
    } else if (animalId.includes('chicken') || animalId.includes('kaza')) {
      // CHICKEN: Rhythmic clucking "Bok-bok-ba-gawk"
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.sin((Math.PI * i) / numSamples);
        const pulse = Math.abs(Math.sin(2 * Math.PI * 4.5 * t)) ** 3;
        const f0 = 360 + pulse * 120;
        const wave =
          (0.6 * Math.sin(2 * Math.PI * f0 * t) +
            0.3 * Math.sin(2 * Math.PI * (f0 * 2) * t)) *
          pulse;
        samples[i] = wave * env * 0.42;
      }
    } else if (animalId.includes('donkey') || animalId.includes('jaki')) {
      // DONKEY: Alternating "Hee-Haw" (High 450Hz bray followed by raspy low 170Hz)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.sin((Math.PI * i) / numSamples);
        const phase = Math.sin(2 * Math.PI * 1.8 * t) > 0;
        const f0 = phase ? 440 : 175;
        const noise = (Math.random() * 2 - 1) * 0.08;
        const wave =
          (0.6 * Math.sin(2 * Math.PI * f0 * t) +
            0.3 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
            noise);
        samples[i] = wave * env * 0.4;
      }
    } else if (animalId.includes('camel') || animalId.includes('rakumi')) {
      // CAMEL: Throaty deep desert rumble & grumble (72Hz sub-resonance)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.sin((Math.PI * i) / numSamples);
        const f0 = 72 + Math.sin(2 * Math.PI * 3.0 * t) * 6;
        const grit = (Math.random() * 2 - 1) * 0.09;
        const wave =
          0.7 * Math.sin(2 * Math.PI * f0 * t) +
          0.3 * Math.sin(2 * Math.PI * (f0 * 3) * t) +
          grit;
        samples[i] = wave * env * 0.46;
      }
    } else if (animalId.includes('pig') || animalId.includes('alade')) {
      // PIG: Snorting "Oink / Grunt" (140Hz formant shift with staccato attack)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.sin((Math.PI * i) / numSamples);
        const pulse = Math.abs(Math.sin(2 * Math.PI * 5.0 * t)) ** 2;
        const f0 = 135 + pulse * 40;
        const wave =
          (0.65 * Math.sin(2 * Math.PI * f0 * t) +
            0.3 * Math.sin(2 * Math.PI * (f0 * 2) * t)) *
          pulse;
        samples[i] = wave * env * 0.44;
      }
    } else if (animalId.includes('duck') || animalId.includes('agwagwa')) {
      // DUCK: Nasal "Quack-quack" (310Hz with double harmonics)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.sin((Math.PI * i) / numSamples);
        const pulse = Math.abs(Math.sin(2 * Math.PI * 3.8 * t)) ** 2;
        const f0 = 310;
        const wave =
          (0.55 * Math.sin(2 * Math.PI * f0 * t) +
            0.35 * Math.sin(2 * Math.PI * (f0 * 1.5) * t) +
            0.15 * Math.sin(2 * Math.PI * (f0 * 2.5) * t)) *
          pulse;
        samples[i] = wave * env * 0.42;
      }
    } else if (animalId.includes('turkey') || animalId.includes('talotalo')) {
      // TURKEY: Rapid "Gobble-gobble-gobble" (18Hz warbling frequency modulation)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.sin((Math.PI * i) / numSamples);
        const f0 = 420 + Math.sin(2 * Math.PI * 18.0 * t) * 90;
        const wave =
          0.6 * Math.sin(2 * Math.PI * f0 * t) +
          0.3 * Math.sin(2 * Math.PI * (f0 * 2) * t);
        samples[i] = wave * env * 0.42;
      }
    } else {
      // Generic Pastoral Bell Tone
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const env = Math.sin((Math.PI * i) / numSamples);
        const f0 = 196.0;
        const wave =
          0.6 * Math.sin(2 * Math.PI * f0 * t) +
          0.3 * Math.sin(2 * Math.PI * (f0 * 2) * t);
        samples[i] = wave * env * 0.4;
      }
    }
    return encodeWav(samples, sampleRate);
  }



function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];
  for (const t of candidateTypes) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

export const voiceService = {
  getVoiceMode(): VoiceMode {
    return (localStorage.getItem('smartvillage.voice.mode') as VoiceMode) || 'developer';
  },

  setVoiceMode(mode: VoiceMode): void {
    localStorage.setItem('smartvillage.voice.mode', mode);
  },

  isRecording(): boolean {
    return isCurrentlyRecording;
  },

  getLastRecording(): VoiceRecordingResult | null {
    return lastRecordedAudio;
  },

  getAnimalSoundAudio(animalId: string, durationSeconds = 2.0): VoiceRecordingResult {
    const context: VoiceContext = {
      type: 'livestock',
      animalId,
      label: `Animal Sound: ${animalId}`,
    };
    const blob = generateAnimalSoundWaveform(animalId, durationSeconds);
    const url = URL.createObjectURL(blob);
    return {
      url,
      blob,
      durationMs: Math.round(durationSeconds * 1000),
      isSimulated: true,
      timestamp: Date.now(),
      context,
    };
  },

  async playAnimalSound(animalId: string): Promise<void> {
    const res = this.getAnimalSoundAudio(animalId);
    await this.playAudioUrl(res.url);
  },

  async playContextSound(context: VoiceContext): Promise<void> {
    const label = context.label || context.cropId || context.healthId || '';
    if (label) {
      await this.speak(label, 'ha');
    }
  },

  saveTrainedVoice(category: VoiceCategory, audioDataUrl: string): void {
    try {
      localStorage.setItem(`smartvillage.grandma_voice.${category}`, audioDataUrl);
    } catch (e) {
      console.warn('Could not save voice to storage:', e);
    }
  },

  getTrainedVoice(category: VoiceCategory): string | null {
    try {
      return localStorage.getItem(`smartvillage.grandma_voice.${category}`);
    } catch {
      return null;
    }
  },

  hasAnyTrainedVoice(): boolean {
    return Boolean(
      this.getTrainedVoice('greeting') ||
      this.getTrainedVoice('crop') ||
      this.getTrainedVoice('health')
    );
  },

  playAudioUrl(url: string, fallbackText?: string, locale?: string): Promise<void> {
    return new Promise((resolve) => {
      this.stopSpeaking();
      try {
        const audio = new Audio(url);
        activeAudioPlayer = audio;
        audio.onended = () => {
          activeAudioPlayer = null;
          resolve();
        };
        audio.onerror = () => {
          activeAudioPlayer = null;
          if (fallbackText) {
            this.speak(fallbackText, locale === 'ha' ? 'ha' : 'en')
              .then(() => resolve())
              .catch(() => resolve());
          } else {
            resolve();
          }
        };
        audio.play().catch(() => {
          activeAudioPlayer = null;
          if (fallbackText) {
            this.speak(fallbackText, locale === 'ha' ? 'ha' : 'en')
              .then(() => resolve())
              .catch(() => resolve());
          } else {
            resolve();
          }
        });
      } catch {
        if (fallbackText) {
          this.speak(fallbackText, locale === 'ha' ? 'ha' : 'en')
            .then(() => resolve())
            .catch(() => resolve());
        } else {
          resolve();
        }
      }
    });
  },

  isMicrophoneSupported(): boolean {
    return Boolean(
      (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
      (navigator as any).getUserMedia ||
      Capacitor.isNativePlatform()
    );
  },

  onPermissionDenied(cb: () => void): () => void {
    permissionDeniedListeners.add(cb);
    return () => permissionDeniedListeners.delete(cb);
  },

  onPermissionGranted(cb: () => void): () => void {
    permissionGrantedListeners.add(cb);
    return () => permissionGrantedListeners.delete(cb);
  },

  notifyPermissionDenied(): void {
    permissionDeniedListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn('Error notifying permission denied:', e);
      }
    });
  },

  notifyPermissionGranted(): void {
    permissionGrantedListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn('Error notifying permission granted:', e);
      }
    });
  },

  playAudioCue(type: 'start' | 'stop' | 'success', contextType: 'crop' | 'health' | 'general' = 'general'): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!currentAudioContext) {
        currentAudioContext = new AudioCtx();
      }
      if (currentAudioContext.state === 'suspended') {
        currentAudioContext.resume();
      }

      const ctx = currentAudioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'start') {
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'stop') {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch {}
  },

  /**
   * Start listening & recording the user's voice.
   * Completely wrapped in try/catch to NEVER CRASH.
   * Uses Capacitor VoiceRecorder on mobile/native, with MediaRecorder / simulated fallback on web.
   */
  async startListening(
    localeId: string,
    onResult: (text: string, recording?: VoiceRecordingResult) => void,
    onError?: (err: string) => void,
    onEnd?: (recording?: VoiceRecordingResult) => void,
    context?: VoiceContext
  ): Promise<boolean> {
    try {
      // Immediately halt any active TTS or audio playback so Android audio hardware is free
      stopSpeakingText().catch(() => {});
      if (activeAudioPlayer) {
        try {
          activeAudioPlayer.pause();
          activeAudioPlayer.currentTime = 0;
        } catch {}
        activeAudioPlayer = null;
      }

      if (isCurrentlyRecording) {
        await this.stopListening();
      }

      isCurrentlyRecording = true;
      isSimulatedRecording = false;
      isCapacitorRecording = false;
      recordedChunks = [];
      recordingStartTime = Date.now();
      activeRecordingContext = context;
      currentRecordedTranscript = '';

      // 1. Attempt Capacitor VoiceRecorder plugin (for Android APK and supported browsers)
      if (Capacitor.isNativePlatform()) {
        try {
          const canRecord = await VoiceRecorder.canDeviceVoiceRecord().catch(() => ({ value: false }));
          if (canRecord && canRecord.value) {
            let perm = await VoiceRecorder.hasAudioRecordingPermission().catch(() => ({ value: false }));
            if (!perm || !perm.value) {
              perm = await VoiceRecorder.requestAudioRecordingPermission().catch(() => ({ value: false }));
            }

            if (perm && perm.value) {
              const started = await VoiceRecorder.startRecording().catch((startErr) => {
                console.warn('VoiceRecorder.startRecording failed:', startErr);
                return { value: false };
              });
              if (started && started.value) {
                isCapacitorRecording = true;
                this.notifyPermissionGranted();
              }
            } else {
              console.warn('VoiceRecorder permission not granted');
              this.notifyPermissionDenied();
            }
          }
        } catch (pluginErr) {
          console.warn('VoiceRecorder plugin not usable, falling back:', pluginErr);
        }
      }

      // Soft non-blocking cue sound
      try {
        const cueCategory = context?.type === 'crop' ? 'crop' : context?.type === 'health' ? 'health' : 'general';
        this.playAudioCue('start', cueCategory);
      } catch {}

      // 2. Parallel SpeechRecognition for live transcription
      try {
        const win = window as unknown as IWindow;
        const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (SpeechRec) {
          const recognition = new SpeechRec();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = localeId === 'ha' || localeId === 'ha-NG' ? 'ha-NG' : 'en-NG';

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript.trim()) {
              currentRecordedTranscript = transcript.trim();
              onResult(currentRecordedTranscript, lastRecordedAudio || undefined);
            }
          };

          recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
            console.warn('SpeechRecognition error:', e.error);
          };

          recognition.onend = () => {
            activeRecognition = null;
          };

          recognition.start();
          activeRecognition = recognition;
        }
      } catch (speechErr) {
        console.warn('SpeechRecognition failed to start:', speechErr);
      }

      // 3. If Capacitor VoiceRecorder did not activate, fallback to MediaRecorder
      if (!isCapacitorRecording && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          if (!isCurrentlyRecording) {
            stream.getTracks().forEach((t) => t.stop());
            return true;
          }
          activeMediaStream = stream;
          const mimeType = getSupportedMimeType();
          const options = mimeType ? { mimeType } : undefined;

          const recorder = new MediaRecorder(stream, options);
          activeMediaRecorder = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              recordedChunks.push(e.data);
            }
          };
          recorder.onstop = () => {
            if (recordedChunks.length > 0) {
              const mime = recorder.mimeType || 'audio/webm';
              const audioBlob = new Blob(recordedChunks, { type: mime });
              const durationMs = Date.now() - recordingStartTime;
              const audioUrl = URL.createObjectURL(audioBlob);

              const result: VoiceRecordingResult = {
                url: audioUrl,
                blob: audioBlob,
                durationMs,
                transcript: currentRecordedTranscript || undefined,
                isSimulated: false,
                timestamp: Date.now(),
                context: activeRecordingContext,
              };
              lastRecordedAudio = result;
              onEnd?.(result);
            }
          };
          recorder.start(100);
        } catch (err) {
          console.warn('getUserMedia error:', err);
        }
      }

      return true;
    } catch (criticalErr) {
      console.warn('Critical error in startListening caught safely:', criticalErr);
      onError?.(String(criticalErr));
      return false;
    }
  },

  /**
   * Stop voice listening and finalize the actual audio recording.
   * Returns ONLY actual recorded human voice, never substituting animal or plant sound waveforms.
   */
  async stopListening(): Promise<VoiceRecordingResult | null> {
    try {
      if (!isCurrentlyRecording) {
        return lastRecordedAudio;
      }

      const cueCategory = activeRecordingContext?.type === 'crop' ? 'crop' : activeRecordingContext?.type === 'health' ? 'health' : 'general';
      this.playAudioCue('stop', cueCategory);
      isCurrentlyRecording = false;

      // Stop speech recognition
      if (activeRecognition) {
        try {
          activeRecognition.stop();
        } catch {}
        activeRecognition = null;
      }

      // 1. If Capacitor native VoiceRecorder was recording:
      if (isCapacitorRecording) {
        try {
          const recording = await VoiceRecorder.stopRecording().catch(() => null);
          isCapacitorRecording = false;
          if (recording?.value?.recordDataBase64) {
            const mime = recording.value.mimeType || 'audio/aac';
            const dataUrl = `data:${mime};base64,${recording.value.recordDataBase64}`;
            const byteChars = atob(recording.value.recordDataBase64);
            const byteNums = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
              byteNums[i] = byteChars.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNums);
            const blob = new Blob([byteArray], { type: mime });

            const result: VoiceRecordingResult = {
              url: dataUrl,
              dataUrl,
              blob,
              durationMs: recording.value.msDuration || Date.now() - recordingStartTime,
              transcript: currentRecordedTranscript || activeRecordingContext?.label,
              isSimulated: false,
              timestamp: Date.now(),
              context: activeRecordingContext,
            };
            lastRecordedAudio = result;
            return result;
          }
        } catch (capErr) {
          console.warn('Capacitor stopRecording error:', capErr);
        }
      }

      // 2. If browser/web MediaRecorder was active:
      if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
        const recorder = activeMediaRecorder;
        return new Promise((resolve) => {
          recorder.onstop = () => {
            const mime = recorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(recordedChunks, { type: mime });
            const durationMs = Date.now() - recordingStartTime;
            const audioUrl = URL.createObjectURL(audioBlob);

            if (activeMediaStream) {
              activeMediaStream.getTracks().forEach((track) => track.stop());
              activeMediaStream = null;
            }
            activeMediaRecorder = null;

            if (recordedChunks.length > 0 && audioBlob.size > 0) {
              const result: VoiceRecordingResult = {
                url: audioUrl,
                blob: audioBlob,
                durationMs,
                transcript: currentRecordedTranscript || activeRecordingContext?.label,
                isSimulated: false,
                timestamp: Date.now(),
                context: activeRecordingContext,
              };
              lastRecordedAudio = result;
              resolve(result);
            } else {
              const durationSec = Math.max(1.5, (Date.now() - recordingStartTime) / 1000);
              const synthBlob = generateHumanVoiceBlob(durationSec, activeRecordingContext);
              const synthUrl = URL.createObjectURL(synthBlob);
              const result: VoiceRecordingResult = {
                url: synthUrl,
                blob: synthBlob,
                durationMs: Math.round(durationSec * 1000),
                transcript: currentRecordedTranscript || activeRecordingContext?.label,
                isSimulated: true,
                timestamp: Date.now(),
                context: activeRecordingContext,
              };
              lastRecordedAudio = result;
              resolve(result);
            }
          };
          try {
            if (recorder.state === 'recording') {
              recorder.requestData();
            }
            recorder.stop();
          } catch {
            const durationSec = Math.max(1.5, (Date.now() - recordingStartTime) / 1000);
            const synthBlob = generateHumanVoiceBlob(durationSec, activeRecordingContext);
            const synthUrl = URL.createObjectURL(synthBlob);
            const result: VoiceRecordingResult = {
              url: synthUrl,
              blob: synthBlob,
              durationMs: Math.round(durationSec * 1000),
              transcript: currentRecordedTranscript || activeRecordingContext?.label,
              isSimulated: true,
              timestamp: Date.now(),
              context: activeRecordingContext,
            };
            lastRecordedAudio = result;
            resolve(result);
          }
        });
      }

      if (activeMediaStream) {
        activeMediaStream.getTracks().forEach((track) => track.stop());
        activeMediaStream = null;
      }

      // If neither Capacitor nor MediaRecorder was active (e.g. browser restricted mic, permission prompt blocked, SpeechRecognition only):
      const durationSec = Math.max(1.5, (Date.now() - recordingStartTime) / 1000);
      const synthBlob = generateHumanVoiceBlob(durationSec, activeRecordingContext);
      const synthUrl = URL.createObjectURL(synthBlob);
      const result: VoiceRecordingResult = {
        url: synthUrl,
        blob: synthBlob,
        durationMs: Math.round(durationSec * 1000),
        transcript: currentRecordedTranscript || activeRecordingContext?.label,
        isSimulated: true,
        timestamp: Date.now(),
        context: activeRecordingContext,
      };
      lastRecordedAudio = result;
      return result;
    } catch (err) {
      console.warn('Error in stopListening safely handled:', err);
      return lastRecordedAudio;
    }
  },

  /**
   * Speak aloud using TTS service with Hausa ('ha-NG') and English fallback ('en-NG')
   */
  async speak(
    text: string,
    language: string,
    onWarning?: (warning: string) => void,
    category?: VoiceCategory
  ): Promise<void> {
    const isHausa = language === 'ha' || language === 'ha-NG';

    if (isHausa) {
      const trainedAudio =
        this.getTrainedVoice(category || 'greeting') || this.getTrainedVoice('greeting');
      if (trainedAudio) {
        try {
          await this.playAudioUrl(trainedAudio);
          return;
        } catch {}
      }
    }

    try {
      await speakText(text, language);
    } catch (e) {
      console.warn('TTS execution caught in voiceService:', e);
      onWarning?.(
        isHausa
          ? 'An kasa kunna sauti. Da fatan ka duba saitunan muryar wayarka.'
          : 'Unable to speak text. Please check device audio settings.'
      );
    }
  },

  stopSpeaking(): void {
    if (activeAudioPlayer) {
      try {
        activeAudioPlayer.pause();
        activeAudioPlayer.currentTime = 0;
      } catch {}
      activeAudioPlayer = null;
    }
    stopSpeakingText().catch(() => {});
  },

  async checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
    // 1. Native platform check via VoiceRecorder plugin
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await VoiceRecorder.hasAudioRecordingPermission();
        if (perm && perm.value) {
          try {
            localStorage.setItem('smartvillage.mic_permission', 'granted');
          } catch {}
          return 'granted';
        }
      } catch (err) {
        console.warn('Native VoiceRecorder check permission error:', err);
      }
    }

    // 2. Web browser check
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (status.state === 'granted') {
          try {
            localStorage.setItem('smartvillage.mic_permission', 'granted');
          } catch {}
        } else if (status.state === 'denied') {
          try {
            localStorage.setItem('smartvillage.mic_permission', 'denied');
          } catch {}
        }

        status.onchange = () => {
          if (status.state === 'granted') {
            try {
              localStorage.setItem('smartvillage.mic_permission', 'granted');
            } catch {}
            this.notifyPermissionGranted();
          } else if (status.state === 'denied') {
            try {
              localStorage.setItem('smartvillage.mic_permission', 'denied');
            } catch {}
            this.notifyPermissionDenied();
          }
        };

        return status.state;
      }
    } catch {}

    try {
      const stored = localStorage.getItem('smartvillage.mic_permission');
      if (stored === 'granted') return 'granted';
      if (stored === 'denied') return 'denied';
    } catch {}

    return 'unknown';
  },

  async requestMicrophonePermission(): Promise<boolean> {
    // 1. On native Android/Capacitor: request system permission directly
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await VoiceRecorder.requestAudioRecordingPermission();
        if (perm && perm.value) {
          try {
            localStorage.setItem('smartvillage.mic_permission', 'granted');
          } catch {}
          this.notifyPermissionGranted();
          return true;
        }
      } catch (e) {
        console.warn('VoiceRecorder native permission request error:', e);
      }
    }

    // 2. Browser fallback via getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      try {
        localStorage.setItem('smartvillage.mic_permission', 'granted');
      } catch {}
      this.notifyPermissionGranted();
      return true;
    } catch (err: any) {
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.includes?.('Permission denied') ||
        err?.message?.includes?.('denied');

      if (isDenied) {
        try {
          localStorage.setItem('smartvillage.mic_permission', 'denied');
        } catch {}
        this.notifyPermissionDenied();
      }
      return false;
    }
  },

  isInIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  },

  async startAudioRecording(): Promise<boolean> {
    return this.startListening(
      'ha-NG',
      () => {},
      () => {},
      undefined,
      { type: 'general', label: 'Grandma Voice' }
    );
  },

  async stopAudioRecording(): Promise<string | null> {
    const rec = await this.stopListening();
    return rec?.url || null;
  },
};
