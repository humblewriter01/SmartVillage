// Advanced Offline & Web Speech Voice Service for SmartVillage

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

let activeRecognition: any = null;
let currentAudioContext: AudioContext | null = null;

export type VoiceMode = 'developer' | 'system';
export type VoiceCategory = 'greeting' | 'crop' | 'health';

let activeAudioPlayer: HTMLAudioElement | null = null;

export const voiceService = {
  getVoiceMode(): VoiceMode {
    return (localStorage.getItem('smartvillage.voice.mode') as VoiceMode) || 'developer';
  },

  setVoiceMode(mode: VoiceMode): void {
    localStorage.setItem('smartvillage.voice.mode', mode);
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
    });
  },

  isSpeechRecognitionSupported(): boolean {
    const win = window as unknown as IWindow;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  },

  // Play a soft auditory chime to indicate listening started or completed (grandma-friendly feedback)
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

  startListening(
    localeId: string,
    onResult: (text: string) => void,
    onError?: (err: string) => void,
    onEnd?: () => void
  ): boolean {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      onError?.(
        localeId === 'ha'
          ? 'Wayarka ba ta goyi bayan sauraron murya ba a wannan manhaja.'
          : 'Speech recognition is not supported in this browser.'
      );
      return false;
    }

    try {
      if (activeRecognition) {
        activeRecognition.stop();
        activeRecognition = null;
      }

      this.playAudioCue('start');
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
          onResult(transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition event:', event.error);
        onError?.(event.error);
      };

      recognition.onend = () => {
        this.playAudioCue('stop');
        activeRecognition = null;
        onEnd?.();
      };

      recognition.start();
      activeRecognition = recognition;
      return true;
    } catch (e: any) {
      console.warn('Failed to start speech recognition:', e);
      onError?.(e.message || 'Could not start microphone');
      return false;
    }
  },

  stopListening(): void {
    if (activeRecognition) {
      try {
        activeRecognition.stop();
      } catch {}
      activeRecognition = null;
    }
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
        if (lower.includes('albasa') || lower.includes('shuka') || lower.includes('gona') || lower.includes('cuta')) {
          matchedCategory = 'crop';
        } else if (lower.includes('lafiya') || lower.includes('zazzabi') || lower.includes('magani') || lower.includes('asibiti')) {
          matchedCategory = 'health';
        } else {
          matchedCategory = 'greeting';
        }
      }

      const trainedAudio = this.getTrainedVoice(matchedCategory) || this.getTrainedVoice('greeting');
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
      const voiceMode = this.getVoiceMode();

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
        selectedVoice = voices.find(
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
