import React, { useState, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  AlertCircle,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import { analyzeHealth, HealthResult } from '../services/healthService';
import { voiceService } from '../services/voiceService';
import { historyService } from '../services/historyService';

interface HealthScreenProps {
  locale: Language;
  onRecordSaved?: () => void;
}

const COMMON_SYMPTOM_CHIPS = [
  { label: 'Fever & chills', hausa: 'Zazzabi da rawar sanyi' },
  { label: 'Persistent cough', hausa: 'Tari mai tsawo' },
  { label: 'Watery diarrhea', hausa: 'Gudawa da zawayi' },
  { label: 'Stiff neck & headache', hausa: 'Taurin wuya da ciwon kai' },
  { label: 'Itchy skin rash', hausa: 'Kurajen fata da kaikayi' },
  { label: 'Yellow eyes (Jaundice)', hausa: 'Rawaya a idanu' },
];

export const HealthScreen: React.FC<HealthScreenProps> = ({ locale, onRecordSaved }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState<HealthResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
      setResult(null);
    }
  };

  const toggleListening = () => {
    if (listening) {
      voiceService.stopListening();
      setListening(false);
      return;
    }

    const started = voiceService.startListening(
      locale === 'ha' ? 'ha-NG' : 'en-NG',
      (recognizedText) => {
        setSymptoms((prev) => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed} ${recognizedText}` : recognizedText;
        });
      },
      (err) => {
        showToast(`Voice error: ${err}`);
        setListening(false);
      },
      () => {
        setListening(false);
      }
    );

    if (started) {
      setListening(true);
    }
  };

  const handleAnalyze = async () => {
    if (!photoUrl && !symptoms.trim()) {
      showToast(t(locale, 'noPhoto') + ' or enter symptoms');
      return;
    }

    setBusy(true);
    setTimeout(() => {
      const r = analyzeHealth(symptoms, Boolean(photoUrl));
      setResult(r);

      // Save to local database / history
      historyService.insert({
        type: 'health',
        createdAt: new Date().toISOString(),
        title: r.condition,
        detail: symptoms.trim() || 'Visual screening',
        advice: `${r.advice}\n\nUrgency: ${r.urgency}`,
        confidence: r.confidence,
        imagePath: photoUrl || undefined,
      });

      onRecordSaved?.();
      setBusy(false);
    }, 450);
  };

  const handleSpeak = async () => {
    if (!result) return;
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const textToSpeak = `${result.condition}. ${result.advice}. ${result.urgency}`;
    await voiceService.speak(textToSpeak, locale);
    setIsSpeaking(false);
  };

  const addSymptomChip = (chip: { label: string; hausa: string }) => {
    const textToAdd = locale === 'ha' ? chip.hausa : chip.label;
    setSymptoms((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return textToAdd;
      if (trimmed.toLowerCase().includes(textToAdd.toLowerCase())) return prev;
      return `${trimmed}, ${textToAdd}`;
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#c44747]">
          {t(locale, 'health')}
        </h1>
        <p className="text-sm text-slate-600 mt-1">{t(locale, 'healthSubtitle')}</p>
      </div>

      {/* Photo Preview / Upload Area (Optional for skin/visible signs) */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-red-200 p-4 flex flex-col items-center justify-center min-h-[170px] relative overflow-hidden group">
        {photoUrl ? (
          <div className="w-full flex flex-col items-center">
            <img
              src={photoUrl}
              alt="Health concern"
              className="max-h-56 rounded-xl object-contain shadow-sm border border-red-100"
            />
            <button
              onClick={() => {
                setPhotoUrl(null);
                setResult(null);
              }}
              className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium underline cursor-pointer"
            >
              Remove photo
            </button>
          </div>
        ) : (
          <div className="text-center p-4 space-y-2">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-1">
              <ShieldAlert className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-slate-700 font-medium text-sm">
              Optional skin / visual photo
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              Upload a clear photo if there is a rash, bite, wound, or skin discoloration
            </p>
          </div>
        )}
      </div>

      {/* Photo source buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center space-x-2 py-2.5 px-3 border border-red-300 text-red-800 bg-white hover:bg-red-50 rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer"
        >
          <Camera className="w-4 h-4 text-red-700" />
          <span>{t(locale, 'takePhoto')}</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center space-x-2 py-2.5 px-3 border border-red-300 text-red-800 bg-white hover:bg-red-50 rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer"
        >
          <ImageIcon className="w-4 h-4 text-red-700" />
          <span>{t(locale, 'gallery')}</span>
        </button>
      </div>

      {/* Symptoms Text Area & Voice Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            {t(locale, 'symptoms')}
          </label>
          <button
            onClick={toggleListening}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              listening
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            {listening ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>{t(locale, 'stop')}</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>{t(locale, 'voice')}</span>
              </>
            )}
          </button>
        </div>

        <textarea
          rows={4}
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder={t(locale, 'symptomsHint')}
          className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />

        {/* Quick Symptom Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {COMMON_SYMPTOM_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => addSymptomChip(chip)}
              className="text-xs px-2.5 py-1 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              + {locale === 'ha' ? chip.hausa : chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={busy}
        className="w-full py-4 bg-[#c44747] hover:bg-[#b03b3b] disabled:opacity-60 text-white font-bold rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
      >
        {busy ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>{t(locale, 'analyzing')}</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>{t(locale, 'analyze')}</span>
          </>
        )}
      </button>

      {/* Result Card */}
      {result && (
        <div className="bg-white rounded-2xl p-5 border border-red-200 shadow-md space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#c44747]">
              {t(locale, 'healthResult')}
            </span>
            <button
              onClick={handleSpeak}
              className="flex items-center space-x-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>{isSpeaking ? 'Stop audio' : t(locale, 'speakResult')}</span>
            </button>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">
              {result.condition}
            </h2>
          </div>

          {/* Urgency Badge */}
          <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-xl border border-red-200/80 text-xs text-red-900">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block uppercase tracking-wider">
                {t(locale, 'urgency')}:
              </span>
              <p className="mt-0.5">{result.urgency}</p>
            </div>
          </div>

          {/* Action Advice */}
          <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-800 space-y-1">
            <span className="font-bold text-[#c44747] block text-xs uppercase tracking-wider">
              {t(locale, 'advice')}
            </span>
            <p className="leading-relaxed whitespace-pre-line">{result.advice}</p>
          </div>

          {/* Medical Disclaimer */}
          <div className="border-t border-slate-100 pt-3 flex items-start space-x-2 text-slate-500 text-xs">
            <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
            <p>{t(locale, 'notMedical')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
