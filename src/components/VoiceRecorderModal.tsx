import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  ExternalLink,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Sparkles,
  X,
  Info,
} from 'lucide-react';
import { Language } from '../utils/translations';
import { voiceService } from '../services/voiceService';

interface VoiceRecorderModalProps {
  locale: Language;
  isOpen: boolean;
  onClose: () => void;
  onSelectPhrase?: (phrase: string) => void;
  context?: 'home' | 'crop' | 'health';
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  locale,
  isOpen,
  onClose,
  onSelectPhrase,
  context = 'home',
}) => {
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const isInIframe = voiceService.isInIframe();

  if (!isOpen) return null;

  const handleStartRecord = async () => {
    setAudioError(null);
    const success = await voiceService.startAudioRecording();
    if (success) {
      setIsRecordingAudio(true);
    } else {
      setAudioError(
        locale === 'ha'
          ? 'An toshe makirufo a shafin preview na ciki. Danna maɓallin \'Buɗe a Sabon Shafi\' a ƙasa domin gwadawa kai-tsaye a wayarka!'
          : 'Microphone is restricted inside the preview window. Click \'Open App in New Tab\' below to test with native microphone access!'
      );
    }
  };

  const handleStopRecord = async () => {
    setIsRecordingAudio(false);
    const dataUrl = await voiceService.stopAudioRecording();
    if (dataUrl) {
      setRecordedAudioUrl(dataUrl);
    }
  };

  const handlePlayRecording = () => {
    if (!recordedAudioUrl) return;
    setIsPlayingAudio(true);
    const audio = new Audio(recordedAudioUrl);
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
    audio.play().catch(() => setIsPlayingAudio(false));
  };

  const handleOpenDirectTab = () => {
    window.open(window.location.href, '_blank');
  };

  // Context-specific test phrases for 1-tap simulation
  const testPhrases =
    context === 'crop'
      ? [
          { en: 'Soybeans have brown rust spots on leaves', ha: 'Waken soya yana da tsatsa da ɗigon ruwan kasa a ganye' },
          { en: 'Onion leaves turning yellow and dying', ha: 'Ganyen albasa ya zama rawaya yana bushewa' },
          { en: 'Maize armyworm eating the funnel leaves', ha: 'Kwarin masara na cin ganyen ciki' },
          { en: 'Tomato fruit rot with black bottoms', ha: 'Tumatir yana rubewa a gindinsa' },
        ]
      : context === 'health'
      ? [
          { en: 'High fever, shaking chills and headache', ha: 'Zazzaɓi mai zafi, ɓari da ciwon kai' },
          { en: 'Severe diarrhea and stomach dehydration', ha: 'Gudawa da amai da bushewar ruwan jiki' },
          { en: 'Itchy skin rash with red blisters', ha: 'Kaikayin fata da ƙuraje masu ja' },
        ]
      : [
          { en: 'Check my maize and soybean crops', ha: 'Duba min amfanin gonar masara da waken soya' },
          { en: 'I have severe fever and malaria symptoms', ha: 'Ina da zazzaɓi mai zafi da alamomin malaria' },
          { en: 'Is this borehole water safe to drink?', ha: 'Shin ruwan wannan rijiyar yana da kyau a sha?' },
          { en: 'Soil pH and moisture tracker', ha: 'Kula da tsamin ƙasa da laima' },
        ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                {locale === 'ha' ? 'Ɗaukar Murya & Makirufo' : 'Voice Input & Microphone'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {locale === 'ha' ? 'Bayanin aiki a shafin gwaji da manhaja' : 'Preview status & native app support'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Why does it fail in preview? Explainer Card */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-amber-900 font-extrabold">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              {locale === 'ha'
                ? 'Shin muryata za ta ɗauku a ainihin manhajar?'
                : 'Can my voice be recorded in the real app?'}
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            {locale === 'ha' ? (
              <>
                <strong className="text-emerald-800">E, 100%!</strong> A ainihin manhajar waya (Android/iOS ko lokacin da ka buɗe a sabon shafi), wayarka tana ba da cikakken lasisin makirufo domin yin magana da ɗaukar sauti.
                <br />
                <span className="text-[11px] text-slate-600 mt-1 block">
                  A wannan shafin gwaji (AI Studio preview), ƙa'idar tsaro ta Google Chrome tana toshe makirufon iframe na wucin-gadi.
                </span>
              </>
            ) : (
              <>
                <strong className="text-emerald-800">Yes, absolutely!</strong> In the deployed mobile app, progressive web app (PWA), or when opened directly in a browser tab, your device prompts for microphone permission and records voice seamlessly.
                <br />
                <span className="text-[11px] text-slate-600 mt-1 block">
                  The embedded preview window runs in a restricted iframe sandbox where browsers block hardware microphone access by default.
                </span>
              </>
            )}
          </p>
        </div>

        {/* Open in Standalone Tab Action */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-emerald-950 font-medium">
            <span className="font-extrabold block">
              {locale === 'ha' ? 'Gwada a Waje (Sabon Shafi):' : 'Test Live in Direct Tab:'}
            </span>
            <span className="text-[11px] text-emerald-800">
              {locale === 'ha' ? 'Yana buɗe cikakken lasisin makirufo' : 'Unlocks native browser microphone permissions'}
            </span>
          </div>
          <button
            onClick={handleOpenDirectTab}
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <span>{locale === 'ha' ? 'Buɗe a Sabon Shafi' : 'Open in New Tab'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Real Audio Clip Recorder Test Widget */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>{locale === 'ha' ? 'Gwajin Ɗaukar Sautin Murya:' : 'Voice Audio Recorder Test:'}</span>
            <span className="text-[10px] uppercase font-bold text-slate-500">MediaRecorder API</span>
          </div>

          <div className="flex items-center space-x-2">
            {!isRecordingAudio ? (
              <button
                onClick={handleStartRecord}
                className="flex-1 flex items-center justify-center space-x-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs py-2 px-3 rounded-xl cursor-pointer shadow-xs transition-all"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{locale === 'ha' ? 'Fara Ɗaukar Murya' : 'Record Voice Audio'}</span>
              </button>
            ) : (
              <button
                onClick={handleStopRecord}
                className="flex-1 flex items-center justify-center space-x-1.5 bg-rose-700 text-white font-bold text-xs py-2 px-3 rounded-xl cursor-pointer animate-pulse"
              >
                <Square className="w-3.5 h-3.5" />
                <span>{locale === 'ha' ? 'Tsaya da Ɗauka' : 'Stop Recording'}</span>
              </button>
            )}

            {recordedAudioUrl && (
              <button
                onClick={handlePlayRecording}
                disabled={isPlayingAudio}
                className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-xl cursor-pointer transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isPlayingAudio ? '...' : (locale === 'ha' ? 'Saurara' : 'Play')}</span>
              </button>
            )}
          </div>

          {audioError && (
            <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
              {audioError}
            </p>
          )}

          {recordedAudioUrl && (
            <div className="flex items-center space-x-1.5 text-[11px] text-emerald-800 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {locale === 'ha' ? 'An yi nasarar ɗaukar muryarka!' : 'Voice audio recorded successfully!'}
              </span>
            </div>
          )}
        </div>

        {/* 1-Tap Voice Simulation Presets for Testing in Preview */}
        {onSelectPhrase && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {locale === 'ha' ? 'Danna domin gwada magana:' : 'Quick Voice Simulation Test:'}
                </span>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">1-tap</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {testPhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const text = locale === 'ha' ? phrase.ha : phrase.en;
                    onSelectPhrase(text);
                    onClose();
                  }}
                  className="text-left bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <span className="truncate mr-2">{locale === 'ha' ? phrase.ha : phrase.en}</span>
                  <span className="text-[10px] text-emerald-700 group-hover:translate-x-0.5 transition-transform font-bold shrink-0">
                    {locale === 'ha' ? 'Zaɓa →' : 'Use →'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Close Button */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            {locale === 'ha' ? 'Rufe' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
