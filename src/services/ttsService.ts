import { TextToSpeech } from '@capacitor-community/text-to-speech';

/**
 * Text-to-Speech with Hausa ('ha-NG') and English fallback ('en-NG').
 * Uses @capacitor-community/text-to-speech with browser SpeechSynthesis fallback.
 * Wrapped in try/catch so it never crashes.
 */
export async function speakText(text: string, langCode: string): Promise<void> {
  const targetLang = langCode === 'ha' || langCode === 'ha-NG' ? 'ha-NG' : 'en-NG';

  try {
    await TextToSpeech.stop().catch(() => {});
    await TextToSpeech.speak({
      text,
      lang: targetLang,
      rate: 0.9,
      pitch: 1.0,
      volume: 1.0,
    });
  } catch (error) {
    console.warn('TTS failed for target language, falling back to English', error);
    try {
      await TextToSpeech.speak({
        text,
        lang: 'en-NG',
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
      });
    } catch (fallbackError) {
      console.warn('Capacitor TTS fallback failed, trying browser SpeechSynthesis:', fallbackError);
      // Browser SpeechSynthesis fallback for Web / PWA preview
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = targetLang === 'ha-NG' ? 'ha-NG' : 'en-US';
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        } catch (synthErr) {
          console.warn('Web speech synthesis fallback failed:', synthErr);
        }
      }
    }
  }
}

export async function stopSpeakingText(): Promise<void> {
  try {
    await TextToSpeech.stop().catch(() => {});
  } catch {}
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}
