// Web Speech API Voice Service

// Type declaration for browser SpeechRecognition
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

export const voiceService = {
  isSpeechRecognitionSupported(): boolean {
    const win = window as unknown as IWindow;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
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
      onError?.('Speech recognition is not supported in this browser.');
      return false;
    }

    try {
      if (activeRecognition) {
        activeRecognition.stop();
        activeRecognition = null;
      }

      const recognition = new SpeechRec();
      recognition.continuous = true;
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

  speak(text: string, language: string): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'ha' ? 'ha-NG' : 'en-NG';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  },

  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },
};
