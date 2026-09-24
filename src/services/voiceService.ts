// Advanced Offline & Web Speech Voice & Audio Recording Service for SmartVillage

export type VoiceMode = 'developer' | 'system';
export type VoiceCategory = 'greeting' | 'crop' | 'health';

export interface VoiceContext {
  type: 'crop' | 'health' | 'livestock' | 'water' | 'general';
  cropId?: string;
  diseaseId?: string;
  healthId?: string;
  conditionId?: string;
  livestockType?: string;
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
let activeRecordingContext: VoiceContext | undefined = undefined;
let lastRecordedAudio: VoiceRecordingResult | null = null;

// PCM 16-bit WAV file generator (100% browser & mobile compatible)
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
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  /* data sub-chunk */
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

// Generate distinct sound waveforms for each crop, crop disease, and health condition
function generateSyntheticVoiceBlob(durationSeconds: number, context?: VoiceContext): Blob {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * Math.max(1.5, Math.min(durationSeconds, 4.5)));
  const samples = new Float32Array(numSamples);

  const ctxType = context?.type || 'general';
  const cropId = (context?.cropId || '').toLowerCase();
  const diseaseId = (context?.diseaseId || '').toLowerCase();
  const healthId = (context?.healthId || context?.conditionId || '').toLowerCase();

  if (ctxType === 'crop' || cropId || diseaseId) {
    // -------------------------------------------------------------
    // CROP SOUND SYNTHESIZER: Individual sonic signature per crop
    // -------------------------------------------------------------
    let baseF0 = 220; // Default A3
    let harmonic2Weight = 0.35;
    let harmonic3Weight = 0.15;
    let vibratoRate = 4.0;
    let vibratoDepth = 6.0;
    let subHarmonicWeight = 0.0;
    let rusticNoise = 0.02;

    if (cropId.includes('onion') || cropId === 'albasa') {
      // Onion (Albasa): Crisp 220Hz with bright odd harmonics (allium sharpness)
      baseF0 = 220.0;
      harmonic2Weight = 0.45;
      harmonic3Weight = 0.3;
      vibratoRate = 5.2;
      vibratoDepth = 8.0;
      rusticNoise = 0.03;
    } else if (cropId.includes('maize') || cropId === 'masara' || cropId.includes('corn')) {
      // Maize (Masara): Deep golden harvest tone (130.8Hz C3) with rich 65.4Hz sub-bass
      baseF0 = 130.8;
      harmonic2Weight = 0.4;
      harmonic3Weight = 0.18;
      subHarmonicWeight = 0.35;
      vibratoRate = 3.2;
      vibratoDepth = 5.0;
    } else if (cropId.includes('tomato') || cropId === 'tumatur') {
      // Tomato (Tumatir): Lush vibrant garden tone (246.9Hz B3) with warm vibrato
      baseF0 = 246.9;
      harmonic2Weight = 0.38;
      harmonic3Weight = 0.12;
      vibratoRate = 4.6;
      vibratoDepth = 10.0;
    } else if (cropId.includes('rice') || cropId === 'shinkafa') {
      // Rice (Shinkafa): Tranquil shimmer (293.7Hz D4) like flooded paddies
      baseF0 = 293.7;
      harmonic2Weight = 0.25;
      harmonic3Weight = 0.35; // Higher sparkling overtone
      vibratoRate = 3.8;
      vibratoDepth = 7.0;
      rusticNoise = 0.04;
    } else if (cropId.includes('sorghum') || cropId === 'dawa') {
      // Sorghum (Dawa): Resonant savanna stalk timbre (146.8Hz D3)
      baseF0 = 146.8;
      harmonic2Weight = 0.35;
      harmonic3Weight = 0.22;
      subHarmonicWeight = 0.2;
      vibratoRate = 3.0;
      vibratoDepth = 6.0;
    } else if (cropId.includes('millet') || cropId === 'gero') {
      // Millet (Gero): Earthy Sahelian cereal tone (174.6Hz F3) with tremolo
      baseF0 = 174.6;
      harmonic2Weight = 0.3;
      harmonic3Weight = 0.2;
      vibratoRate = 6.0;
      vibratoDepth = 9.0;
    } else if (cropId.includes('cowpea') || cropId === 'wake' || cropId.includes('bean')) {
      // Cowpea / Beans (Wake): Dual-tone legume warmth (196.0Hz G3)
      baseF0 = 196.0;
      harmonic2Weight = 0.42;
      harmonic3Weight = 0.15;
      subHarmonicWeight = 0.15;
    } else if (cropId.includes('groundnut') || cropId === 'gyada' || cropId.includes('peanut')) {
      // Groundnut (Gyada): Grounded subterranean resonance (123.5Hz B2)
      baseF0 = 123.5;
      harmonic2Weight = 0.38;
      subHarmonicWeight = 0.3;
    } else if (cropId.includes('cassava') || cropId === 'rogo') {
      // Cassava (Rogo): Deep rooted tuber acoustic resonance (110.0Hz A2)
      baseF0 = 110.0;
      harmonic2Weight = 0.3;
      subHarmonicWeight = 0.4;
    } else if (cropId.includes('yam') || cropId === 'doya') {
      // Yam (Doya): Full-bodied rich tuber harmony (116.5Hz Bb2)
      baseF0 = 116.5;
      harmonic2Weight = 0.35;
      subHarmonicWeight = 0.35;
    } else if (cropId.includes('pepper') || cropId === 'barkono') {
      // Pepper (Barkono): Bright, lively, zesty rapid harmonic pulse (329.6Hz E4)
      baseF0 = 329.6;
      harmonic2Weight = 0.45;
      harmonic3Weight = 0.3;
      vibratoRate = 7.0;
      vibratoDepth = 12.0;
    } else if (cropId.includes('wheat') || cropId === 'alkama') {
      // Wheat (Alkama): Sweeping golden grain acoustic swell (261.6Hz C4)
      baseF0 = 261.6;
      harmonic2Weight = 0.32;
      harmonic3Weight = 0.25;
      rusticNoise = 0.05;
    } else if (cropId.includes('soybean')) {
      // Soybeans (Waken Soya): Balanced protein grain harmonic (185.0Hz F#3)
      baseF0 = 185.0;
      harmonic2Weight = 0.36;
      harmonic3Weight = 0.18;
    }

    // Specific crop disease acoustic modulation
    const isRust = diseaseId.includes('rust') || diseaseId.includes('tsatsa');
    const isBlight = diseaseId.includes('blight') || diseaseId.includes('cuta');
    const isBlast = diseaseId.includes('blast');
    const isAlternaria = diseaseId.includes('alternaria') || diseaseId.includes('purple');
    const isMosaicOrCurl = diseaseId.includes('mosaic') || diseaseId.includes('curl');
    const isPest = diseaseId.includes('caterpillar') || diseaseId.includes('borer') || diseaseId.includes('tsutsa');

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let f0 = baseF0 + Math.sin(2 * Math.PI * vibratoRate * t) * vibratoDepth;

      if (isMosaicOrCurl) {
        // Wavy sinusoidal contour
        f0 += Math.sin(2 * Math.PI * 1.5 * t) * 22;
      } else if (isAlternaria) {
        // Two-tone alternating purple shimmer
        f0 += Math.sin(2 * Math.PI * 3.0 * t) > 0 ? 18 : -14;
      }

      // Smooth attack and release envelope
      const env = Math.sin((Math.PI * i) / numSamples);

      // Synthesis with harmonics
      let wave =
        0.5 * Math.sin(2 * Math.PI * f0 * t) +
        harmonic2Weight * Math.sin(2 * Math.PI * (f0 * 2) * t) +
        harmonic3Weight * Math.sin(2 * Math.PI * (f0 * 3) * t);

      if (subHarmonicWeight > 0) {
        wave += subHarmonicWeight * Math.sin(2 * Math.PI * (f0 * 0.5) * t);
      }

      if (isBlight) {
        // Cautionary minor-third overtone inflection
        wave += 0.22 * Math.sin(2 * Math.PI * (f0 * 1.189) * t);
      }

      if (isRust) {
        // Rustling granular noise
        wave += (Math.random() * 2 - 1) * 0.1;
      } else if (rusticNoise > 0) {
        wave += (Math.random() * 2 - 1) * rusticNoise;
      }

      if (isPest) {
        // 8Hz flutter tremolo
        wave *= 0.75 + 0.25 * Math.sin(2 * Math.PI * 8.0 * t);
      } else if (isBlast) {
        // Staccato pulsing
        wave *= 0.6 + 0.4 * Math.abs(Math.sin(2 * Math.PI * 4.0 * t));
      }

      samples[i] = wave * env * 0.42;
    }
  } else if (ctxType === 'health' || healthId) {
    // -------------------------------------------------------------
    // HEALTH SOUND SYNTHESIZER: Distinct clinical & diagnostic tones
    // -------------------------------------------------------------
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.sin((Math.PI * i) / numSamples);
      let wave = 0;

      if (healthId.includes('malaria') || healthId.includes('sauro')) {
        // Malaria (Fever): 329.6Hz (E4) with rhythmic 75 BPM cardiac pulse heartbeat modulation ("lub-dub")
        const heartPeriod = t % 0.8;
        let heartPulse = 0.35;
        if (heartPeriod < 0.12) {
          heartPulse = 1.0; // Lub
        } else if (heartPeriod >= 0.18 && heartPeriod < 0.3) {
          heartPulse = 0.8; // Dub
        }
        const f0 = 329.6 + Math.sin(2 * Math.PI * 2.0 * t) * 6;
        wave =
          (0.6 * Math.sin(2 * Math.PI * f0 * t) +
            0.25 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
            0.15 * Math.sin(2 * Math.PI * (f0 * 3) * t)) *
          heartPulse;
      } else if (healthId.includes('cholera') || healthId.includes('diarrhea') || healthId.includes('kwalara') || healthId.includes('gudawa')) {
        // Cholera & Diarrhea: Fluid water-drop cascading acoustic harmonics (392Hz G4 with smooth restorative ripple)
        const ripple = Math.sin(2 * Math.PI * 4.5 * t);
        const f0 = 392.0 + ripple * 20;
        wave =
          0.6 * Math.sin(2 * Math.PI * f0 * t) +
          0.3 * Math.sin(2 * Math.PI * (f0 * 1.5) * t) +
          0.1 * Math.sin(2 * Math.PI * (f0 * 2.5) * t);
      } else if (healthId.includes('typhoid') || healthId.includes('taifot')) {
        // Typhoid: Step-ladder rising 3-note melodic sequence (D4 -> F#4 -> A4)
        const step = Math.floor((t * 2.2) % 3);
        const notes = [293.7, 370.0, 440.0];
        const f0 = notes[step];
        wave =
          0.6 * Math.sin(2 * Math.PI * f0 * t) +
          0.28 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
          0.12 * Math.sin(2 * Math.PI * (f0 * 3) * t);
      } else if (healthId.includes('snake') || healthId.includes('maciji')) {
        // Snakebite: Urgent clinical attention two-tone chime (440Hz -> 330Hz)
        const step = Math.floor((t * 3.0) % 2);
        const f0 = step === 0 ? 440.0 : 330.0;
        wave =
          0.65 * Math.sin(2 * Math.PI * f0 * t) +
          0.25 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
          0.1 * Math.sin(2 * Math.PI * (f0 * 3) * t);
      } else if (healthId.includes('pneumonia') || healthId.includes('nimoniya') || healthId.includes('respiratory')) {
        // Pneumonia: 220Hz (A3) with respiratory breath-swell acoustic modulation (gentle in-and-out swell)
        const breathSwell = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.45 * t);
        const f0 = 220.0 + breathSwell * 8;
        wave =
          (0.6 * Math.sin(2 * Math.PI * f0 * t) +
            0.25 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
            0.08 * (Math.random() * 2 - 1)) *
          (0.4 + 0.6 * breathSwell);
      } else if (healthId.includes('measles') || healthId.includes('kyanda')) {
        // Measles: Pediatric soothing bell chime (349.2Hz F4)
        const f0 = 349.2;
        wave =
          0.65 * Math.sin(2 * Math.PI * f0 * t) +
          0.25 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
          0.1 * Math.sin(2 * Math.PI * (f0 * 4) * t);
      } else if (healthId.includes('meningitis') || healthId.includes('sankarau')) {
        // Meningitis: Focused clinical diagnostic tone (370.0Hz F#4)
        const f0 = 370.0;
        wave =
          0.6 * Math.sin(2 * Math.PI * f0 * t) +
          0.3 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
          0.1 * Math.sin(2 * Math.PI * (f0 * 3) * t);
      } else if (healthId.includes('heat') || healthId.includes('zafi')) {
        // Heat exhaustion: Cooling shimmering tremolo (277.2Hz C#4)
        const shimmer = 0.7 + 0.3 * Math.sin(2 * Math.PI * 6.5 * t);
        const f0 = 277.2 + Math.sin(2 * Math.PI * 2.0 * t) * 8;
        wave =
          (0.65 * Math.sin(2 * Math.PI * f0 * t) +
            0.25 * Math.sin(2 * Math.PI * (f0 * 2) * t)) *
          shimmer;
      } else if (healthId.includes('dehydration') || healthId.includes('kishirwa')) {
        // Severe dehydration: Fluid droplet revival cadence (415.3Hz G#4)
        const f0 = 415.3 + Math.sin(2 * Math.PI * 3.5 * t) * 15;
        wave =
          0.6 * Math.sin(2 * Math.PI * f0 * t) +
          0.3 * Math.sin(2 * Math.PI * (f0 * 2) * t);
      } else if (healthId.includes('skin') || healthId.includes('scabies') || healthId.includes('kazuwa') || healthId.includes('fata')) {
        // Skin / Scabies: Gentle dermatologic soothing wave (207.6Hz G#3)
        const f0 = 207.6 + Math.sin(2 * Math.PI * 2.5 * t) * 6;
        wave =
          0.65 * Math.sin(2 * Math.PI * f0 * t) +
          0.25 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
          0.1 * Math.sin(2 * Math.PI * (f0 * 3) * t);
      } else {
        // General clinical tone (330Hz E4)
        const f0 = 330.0 + Math.sin(2 * Math.PI * 3.0 * t) * 8;
        wave =
          0.6 * Math.sin(2 * Math.PI * f0 * t) +
          0.28 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
          0.12 * Math.sin(2 * Math.PI * (f0 * 3) * t);
      }

      samples[i] = wave * env * 0.42;
    }
  } else if (ctxType === 'livestock') {
    // Livestock: Warm pastoral bell harmonics (196.0Hz G3)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.sin((Math.PI * i) / numSamples);
      const f0 = 196.0 + Math.sin(2 * Math.PI * 2.5 * t) * 5;
      const wave =
        0.5 * Math.sin(2 * Math.PI * f0 * t) +
        0.3 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
        0.2 * Math.sin(2 * Math.PI * (f0 * 3) * t);
      samples[i] = wave * env * 0.42;
    }
  } else if (ctxType === 'water') {
    // Water: Crystal water droplet chime (523.2Hz C5)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.sin((Math.PI * i) / numSamples);
      const f0 = 523.2 + Math.sin(2 * Math.PI * 5.0 * t) * 12;
      const wave =
        0.65 * Math.sin(2 * Math.PI * f0 * t) +
        0.25 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
        0.1 * Math.sin(2 * Math.PI * (f0 * 3) * t);
      samples[i] = wave * env * 0.4;
    }
  } else {
    // General / Home: Harmonic major chord greeting (A4 440Hz -> C#5 554.4Hz -> E5 659.3Hz)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.sin((Math.PI * i) / numSamples);
      const step = Math.floor((t * 2.5) % 3);
      const notes = [440.0, 554.4, 659.3];
      const f0 = notes[step];
      const wave =
        0.6 * Math.sin(2 * Math.PI * f0 * t) +
        0.25 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
        0.15 * Math.sin(2 * Math.PI * (f0 * 3) * t);
      samples[i] = wave * env * 0.42;
    }
  }

  return encodeWav(samples, sampleRate);
}

// Check which audio MIME types the device's MediaRecorder supports
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

  // Generates or retrieves on-demand distinctive audio for any crop, disease, or health condition
  getCropOrHealthAudio(context: VoiceContext, durationSeconds = 2.4): VoiceRecordingResult {
    const blob = generateSyntheticVoiceBlob(durationSeconds, context);
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

  // Directly plays the distinctive sound of any crop, disease, or health condition
  async playContextSound(context: VoiceContext, durationSeconds = 2.4): Promise<void> {
    const audioRes = this.getCropOrHealthAudio(context, durationSeconds);
    await this.playAudioUrl(audioRes.url);
  },

  // Grandma Voice: Store trained voice samples in Hausa
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

  clearTrainedVoice(category?: VoiceCategory): void {
    if (category) {
      localStorage.removeItem(`smartvillage.grandma_voice.${category}`);
    } else {
      localStorage.removeItem('smartvillage.grandma_voice.greeting');
      localStorage.removeItem('smartvillage.grandma_voice.crop');
      localStorage.removeItem('smartvillage.grandma_voice.health');
    }
  },

  // Play audio url directly
  playAudioUrl(url: string): Promise<void> {
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
          resolve();
        };
        audio.play().catch(() => {
          activeAudioPlayer = null;
          resolve();
        });
      } catch {
        resolve();
      }
    });
  },

  playLastRecording(): Promise<void> {
    if (lastRecordedAudio?.url) {
      return this.playAudioUrl(lastRecordedAudio.url);
    }
    return Promise.resolve();
  },

  isSpeechRecognitionSupported(): boolean {
    const win = window as unknown as IWindow;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  },

  isMicrophoneSupported(): boolean {
    return Boolean(
      (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia
    );
  },

  // Play a soft auditory chime to indicate listening/recording started or completed
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
      // Tone customization based on context
      if (contextType === 'crop') {
        // Earthy warm wooden/marimba chime
        if (type === 'start') {
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(390, now + 0.14);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (type === 'stop') {
          osc.frequency.setValueAtTime(390, now);
          osc.frequency.exponentialRampToValueAtTime(220, now + 0.14);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
          osc.start(now);
          osc.stop(now + 0.18);
        } else {
          osc.frequency.setValueAtTime(330, now);
          osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
          osc.start(now);
          osc.stop(now + 0.24);
        }
      } else if (contextType === 'health') {
        // Gentle clinical/diagnostic bell chime
        if (type === 'start') {
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
          osc.start(now);
          osc.stop(now + 0.18);
        } else if (type === 'stop') {
          osc.frequency.setValueAtTime(660, now);
          osc.frequency.exponentialRampToValueAtTime(330, now + 0.14);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
          osc.start(now);
          osc.stop(now + 0.16);
        } else {
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(780, now + 0.18);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.22);
        }
      } else {
        if (type === 'start') {
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(580, now + 0.12);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
          osc.start(now);
          osc.stop(now + 0.16);
        } else if (type === 'stop') {
          osc.frequency.setValueAtTime(580, now);
          osc.frequency.exponentialRampToValueAtTime(330, now + 0.14);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
          osc.start(now);
          osc.stop(now + 0.16);
        } else {
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.22);
        }
      }
    } catch {}
  },

  /**
   * Start listening & recording the user's voice.
   * Works seamlessly across:
   * 1. Production on Vercel (HTTPS + native microphone MediaRecorder)
   * 2. Android Codemagic Mobile (WebView/Native with RECORD_AUDIO permission)
   * 3. AI Studio preview iframe (Gracefully falls back to simulated audio capture if iframe blocks mic)
   */
  startListening(
    localeId: string,
    onResult: (text: string, recording?: VoiceRecordingResult) => void,
    onError?: (err: string) => void,
    onEnd?: (recording?: VoiceRecordingResult) => void,
    context?: VoiceContext
  ): boolean {
    // If already recording, stop first
    if (isCurrentlyRecording) {
      this.stopListening();
    }

    isCurrentlyRecording = true;
    isSimulatedRecording = false;
    recordedChunks = [];
    recordingStartTime = Date.now();
    activeRecordingContext = context;
    let latestTranscript = '';

    const cueCategory = context?.type === 'crop' ? 'crop' : context?.type === 'health' ? 'health' : 'general';
    this.playAudioCue('start', cueCategory);

    // 1. Attempt SpeechRecognition in parallel if available
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRec) {
      try {
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
            latestTranscript = transcript.trim();
            onResult(latestTranscript, lastRecordedAudio || undefined);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('SpeechRecognition event:', event.error);
        };

        recognition.onend = () => {
          activeRecognition = null;
        };

        recognition.start();
        activeRecognition = recognition;
      } catch (e) {
        console.warn('SpeechRecognition startup caught:', e);
      }
    }

    // 2. Hardware Microphone Capture via getUserMedia & MediaRecorder
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        .then((stream) => {
          if (!isCurrentlyRecording) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          activeMediaStream = stream;
          const mimeType = getSupportedMimeType();
          const options = mimeType ? { mimeType } : undefined;

          try {
            const recorder = new MediaRecorder(stream, options);
            activeMediaRecorder = recorder;

            recorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                recordedChunks.push(e.data);
              }
            };

            recorder.onstop = () => {
              const mime = recorder.mimeType || 'audio/webm';
              const audioBlob = new Blob(recordedChunks, { type: mime });
              const durationMs = Date.now() - recordingStartTime;
              const audioUrl = URL.createObjectURL(audioBlob);

              const result: VoiceRecordingResult = {
                url: audioUrl,
                blob: audioBlob,
                durationMs,
                transcript: latestTranscript || undefined,
                isSimulated: false,
                timestamp: Date.now(),
                context: activeRecordingContext,
              };

              lastRecordedAudio = result;

              // If no SpeechRecognition transcript was obtained, provide fallback label
              if (!latestTranscript) {
                const defaultLabel =
                  localeId === 'ha' || localeId === 'ha-NG'
                    ? 'Muryar da aka ɗauka'
                    : 'Voice recording recorded';
                onResult(defaultLabel, result);
              }

              onEnd?.(result);
            };

            recorder.start(100);
          } catch (recError) {
            console.warn('MediaRecorder error, falling back to audio generator:', recError);
            isSimulatedRecording = true;
          }
        })
        .catch((micErr) => {
          console.warn('Microphone permission blocked or unavailable, using preview voice simulator:', micErr);
          isSimulatedRecording = true;
        });
    } else {
      isSimulatedRecording = true;
    }

    return true;
  },

  /**
   * Stop voice listening and finalize the audio recording
   */
  stopListening(): Promise<VoiceRecordingResult | null> {
    return new Promise((resolve) => {
      if (!isCurrentlyRecording) {
        resolve(lastRecordedAudio);
        return;
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

      // If simulated preview recording (e.g. preview iframe sandbox)
      if (isSimulatedRecording || !activeMediaRecorder || activeMediaRecorder.state === 'inactive') {
        const durationSec = Math.max(1.5, (Date.now() - recordingStartTime) / 1000);
        const synthBlob = generateSyntheticVoiceBlob(durationSec, activeRecordingContext);
        const synthUrl = URL.createObjectURL(synthBlob);

        const result: VoiceRecordingResult = {
          url: synthUrl,
          blob: synthBlob,
          durationMs: Math.round(durationSec * 1000),
          isSimulated: true,
          timestamp: Date.now(),
          context: activeRecordingContext,
        };

        lastRecordedAudio = result;
        isSimulatedRecording = false;
        resolve(result);
        return;
      }

      // Stop MediaRecorder
      if (activeMediaRecorder) {
        const originalOnStop = activeMediaRecorder.onstop;
        activeMediaRecorder.onstop = (e) => {
          if (originalOnStop) {
            (originalOnStop as any)(e);
          }
          if (activeMediaStream) {
            activeMediaStream.getTracks().forEach((track) => track.stop());
            activeMediaStream = null;
          }
          activeMediaRecorder = null;
          resolve(lastRecordedAudio);
        };

        try {
          activeMediaRecorder.stop();
        } catch {
          resolve(lastRecordedAudio);
        }
      } else {
        if (activeMediaStream) {
          activeMediaStream.getTracks().forEach((track) => track.stop());
          activeMediaStream = null;
        }
        resolve(lastRecordedAudio);
      }
    });
  },

  async speak(
    text: string,
    language: string,
    onWarning?: (warning: string) => void,
    category?: VoiceCategory
  ): Promise<void> {
    const isHausa = language === 'ha' || language === 'ha-NG';

    // If speaking in Hausa, check if user has a custom trained voice recording for Grandma!
    if (isHausa) {
      let matchedCategory = category;
      if (!matchedCategory) {
        const lower = text.toLowerCase();
        if (
          lower.includes('albasa') ||
          lower.includes('shuka') ||
          lower.includes('gona') ||
          lower.includes('cuta') ||
          lower.includes('kasa') ||
          lower.includes('ƙasa')
        ) {
          matchedCategory = 'crop';
        } else if (
          lower.includes('lafiya') ||
          lower.includes('zazzabi') ||
          lower.includes('magani') ||
          lower.includes('asibiti')
        ) {
          matchedCategory = 'health';
        } else {
          matchedCategory = 'greeting';
        }
      }

      const trainedAudio =
        this.getTrainedVoice(matchedCategory) || this.getTrainedVoice('greeting');
      if (trainedAudio) {
        try {
          await this.playAudioUrl(trainedAudio);
          return;
        } catch (e) {
          console.warn('Playback of trained voice failed, falling back to speech synthesis:', e);
        }
      }
    }

    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Check available voices
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice: SpeechSynthesisVoice | undefined;

      if (isHausa) {
        selectedVoice = voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith('ha') ||
            v.name.toLowerCase().includes('hausa')
        );

        if (!selectedVoice) {
          onWarning?.('Don Allah, shigar da muryar Hausa a saitunan waya ko ka ɗauki muryarka.');
          selectedVoice = voices.find(
            (v) =>
              v.lang.includes('NG') ||
              v.name.toLowerCase().includes('nigeria') ||
              v.lang.startsWith('en')
          );
        }
      } else {
        selectedVoice =
          voices.find(
            (v) =>
              v.lang.includes('NG') ||
              v.name.toLowerCase().includes('natural') ||
              (v.lang.startsWith('en') && !v.name.includes('Google'))
          ) || voices.find((v) => v.lang.startsWith('en'));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.lang = isHausa ? 'ha-NG' : 'en-NG';

      // Warm, friendly, clear pacing for rural grandmothers
      utterance.rate = 0.85;
      utterance.pitch = 0.98;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  },

  stopSpeaking(): void {
    if (activeAudioPlayer) {
      try {
        activeAudioPlayer.pause();
        activeAudioPlayer.currentTime = 0;
      } catch {}
      activeAudioPlayer = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },
};
