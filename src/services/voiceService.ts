// Advanced Offline & Web Speech Voice & Audio Recording Service for SmartVillage

export type VoiceMode = 'developer' | 'system';
export type VoiceCategory = 'greeting' | 'crop' | 'health';

export interface VoiceRecordingResult {
  url: string;
  blob: Blob;
  dataUrl?: string;
  durationMs: number;
  transcript?: string;
  isSimulated?: boolean;
  timestamp: number;
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

// Generate realistic vocal-pitch audio waveform for preview fallback when iframe blocks hardware mic
function generateSyntheticVoiceBlob(durationSeconds: number): Blob {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * Math.max(1.2, Math.min(durationSeconds, 4.0)));
  const samples = new Float32Array(numSamples);

  // Fundamental vocal pitch for human speech (150Hz) with formants & slight vibrato
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const f0 = 155 + Math.sin(2 * Math.PI * 3.5 * t) * 12; // Natural human pitch fluctuation
    const envelope = Math.sin((Math.PI * i) / numSamples); // Smooth in & out ramp

    // 1st, 2nd, and 3rd speech formants
    const wave =
      0.55 * Math.sin(2 * Math.PI * f0 * t) +
      0.30 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
      0.15 * Math.sin(2 * Math.PI * (f0 * 3) * t) +
      0.05 * (Math.random() * 2 - 1); // Subtle breathiness

    samples[i] = wave * envelope * 0.45;
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
  playAudioCue(type: 'start' | 'stop' | 'success'): void {
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
    onEnd?: (recording?: VoiceRecordingResult) => void
  ): boolean {
    // If already recording, stop first
    if (isCurrentlyRecording) {
      this.stopListening();
    }

    isCurrentlyRecording = true;
    isSimulatedRecording = false;
    recordedChunks = [];
    recordingStartTime = Date.now();
    let latestTranscript = '';

    this.playAudioCue('start');

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
          // Do not abort voice recording on recognition network/not-allowed events
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
            // Already stopped before stream resolved
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

            recorder.start(100); // 100ms chunk intervals
          } catch (recError) {
            console.warn('MediaRecorder error, falling back to audio generator:', recError);
            isSimulatedRecording = true;
          }
        })
        .catch((micErr) => {
          // In an iframe sandbox (e.g. preview) where microphone permission is blocked by parent policy:
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

      this.playAudioCue('stop');
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
        const durationSec = Math.max(1.0, (Date.now() - recordingStartTime) / 1000);
        const synthBlob = generateSyntheticVoiceBlob(durationSec);
        const synthUrl = URL.createObjectURL(synthBlob);

        const result: VoiceRecordingResult = {
          url: synthUrl,
          blob: synthBlob,
          durationMs: Math.round(durationSec * 1000),
          isSimulated: true,
          timestamp: Date.now(),
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
