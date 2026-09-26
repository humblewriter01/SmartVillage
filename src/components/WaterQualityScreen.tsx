import React, { useState, useRef } from 'react';
import {
  Droplets,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Flame,
  Sun,
  ShieldCheck,
  Mic,
  MicOff,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import { waterQualityService, WaterQualityResult } from '../services/waterQualityService';
import { voiceService } from '../services/voiceService';
import { historyService } from '../services/historyService';
import { takePhotoWithCamera, pickPhotoFromGallery, cameraService } from '../services/cameraService';

interface WaterQualityScreenProps {
  locale: Language;
  onRecordSaved?: () => void;
}

// Sample water test image data URIs for rapid offline demonstration
const WATER_SAMPLES = [
  {
    name: 'Clean Borehole',
    name_hausa: 'Ruwan Fanfo Mai Tsabta',
    uri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23e0f2fe"/><path d="M40 50 L50 170 C50 185 150 185 150 170 L160 50 Z" fill="%23bae6fd" stroke="%2338bdf8" stroke-width="4"/><ellipse cx="100" cy="50" rx="60" ry="12" fill="%237dd3fc" stroke="%2338bdf8" stroke-width="4"/><path d="M55 80 Q100 90 145 80" stroke="white" stroke-width="3" fill="none" opacity="0.6"/></svg>`,
  },
  {
    name: 'Turbid River Water',
    name_hausa: 'Ruwan Kogin Laka',
    uri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23fef3c7"/><path d="M40 50 L50 170 C50 185 150 185 150 170 L160 50 Z" fill="%23b45309" stroke="%2392400e" stroke-width="4"/><ellipse cx="100" cy="50" rx="60" ry="12" fill="%23d97706" stroke="%2392400e" stroke-width="4"/><circle cx="85" cy="110" r="4" fill="%2378350f"/><circle cx="120" cy="140" r="5" fill="%2378350f"/><circle cx="95" cy="155" r="3" fill="%2378350f"/><circle cx="130" cy="95" r="4" fill="%2378350f"/></svg>`,
  },
  {
    name: 'Algae Water',
    name_hausa: 'Ruwan Ciyawa mai Kore',
    uri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23dcfce7"/><path d="M40 50 L50 170 C50 185 150 185 150 170 L160 50 Z" fill="%2315803d" stroke="%23166534" stroke-width="4"/><ellipse cx="100" cy="50" rx="60" ry="12" fill="%2322c55e" stroke="%23166534" stroke-width="4"/><circle cx="90" cy="120" r="6" fill="%2314532d"/><circle cx="125" cy="100" r="5" fill="%2314532d"/><circle cx="110" cy="150" r="4" fill="%2314532d"/></svg>`,
  },
];

export const WaterQualityScreen: React.FC<WaterQualityScreenProps> = ({
  locale,
  onRecordSaved,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<WaterQualityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
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
    e.target.value = '';
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await takePhotoWithCamera();
      if (photo) {
        const formatted = photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`;
        setPhotoUrl(formatted);
        setResult(null);
        showToast(locale === 'ha' ? 'An ɗauki hoto!' : 'Photo captured!');
      }
    } catch (err) {
      console.warn('Water camera fallback:', err);
      cameraInputRef.current?.click();
    }
  };

  const handlePickGallery = async () => {
    try {
      const photo = await pickPhotoFromGallery();
      if (photo) {
        const formatted = photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`;
        setPhotoUrl(formatted);
        setResult(null);
        showToast(locale === 'ha' ? 'An loda hoto daga gallery!' : 'Photo loaded!');
      }
    } catch (err) {
      console.warn('Water gallery fallback:', err);
      fileInputRef.current?.click();
    }
  };

  const handleAnalyze = async () => {
    if (!photoUrl) {
      showToast(t(locale, 'noPhoto'));
      return;
    }

    setBusy(true);
    try {
      const res = await waterQualityService.analyzeWater(photoUrl);
      setResult(res);

      historyService.insert({
        type: 'water',
        createdAt: new Date().toISOString(),
        title: locale === 'ha' ? res.verdictTitleHausa : res.verdictTitle,
        detail: `Turbidity Index: ${res.turbidityScore}/100 | ${res.colorAssessment}`,
        advice: locale === 'ha' ? res.adviceHausa : res.advice,
        confidence: res.status === 'clean' ? 0.88 : 0.94,
        imagePath: photoUrl.startsWith('data:') ? photoUrl : undefined,
      });

      onRecordSaved?.();
    } catch {
      showToast('Analysis error. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  const handleSpeak = async () => {
    if (!result) return;
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const titleText = locale === 'ha' ? result.verdictTitleHausa : result.verdictTitle;
    const adviceText = locale === 'ha' ? result.adviceHausa : result.advice;
    const textToSpeak = `${titleText}. ${adviceText}`;

    await voiceService.speak(textToSpeak, locale, (warning) => {
      showToast(warning);
    });
    setIsSpeaking(false);
  };

  const handleVoiceListen = async () => {
    if (isListening) {
      await voiceService.stopListening();
      setIsListening(false);
      return;
    }

    const started = await voiceService.startListening(
      locale,
      (text) => {
        showToast(`Heard: "${text}"`);
      },
      (err) => {
        showToast(err);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    if (started) {
      setIsListening(true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Screen Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#173326] flex items-center gap-2">
            <Droplets className="w-6 h-6 text-sky-600" />
            <span>{t(locale, 'checkWater')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t(locale, 'waterSubtitle')}</p>
        </div>

        {/* Grandma Voice Mic Button */}
        <button
          onClick={handleVoiceListen}
          className={`p-2.5 rounded-xl transition-all cursor-pointer ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
          }`}
          title="Voice Command"
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>

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

      {/* Image Preview & Upload Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sky-100 shadow-sm space-y-4">
        {photoUrl ? (
          <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-200">
            <img
              src={photoUrl}
              alt="Water Sample"
              className="max-h-full max-w-full object-contain"
            />
            <button
              onClick={() => {
                setPhotoUrl(null);
                setResult(null);
              }}
              className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-xs cursor-pointer"
            >
              {locale === 'ha' ? 'Canza' : 'Change'}
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-sky-200 bg-sky-50/50 rounded-xl p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
              <Droplets className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {locale === 'ha'
                  ? 'Ɗauki hoton ruwa a cikin kofi ko randa'
                  : 'Capture water sample in a transparent glass or clean container'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {locale === 'ha'
                  ? 'Binciken yana lura da laka, duhu, ciyawa da datti'
                  : 'Screening analyzes turbidity, color tints, and suspended particulate matter'}
              </p>
            </div>
          </div>
        )}

        {/* Single Primary Action: Take Photo with Camera & Secondary Gallery Option */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleTakePhoto}
            className="w-full flex items-center justify-center space-x-2.5 py-3.5 px-4 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white rounded-2xl font-black text-sm sm:text-base shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Camera className="w-5 h-5 text-sky-200" />
            <span>
              {locale === 'ha' ? 'Ɗauki Hoto' : 'Take Photo'}
            </span>
          </button>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handlePickGallery}
              className="inline-flex items-center space-x-1.5 py-1.5 px-3 text-xs font-bold text-sky-800 hover:text-sky-950 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>
                {locale === 'ha' ? 'Zaɓi daga Gallery' : 'Choose from Gallery'}
              </span>
            </button>
          </div>
        </div>

        {/* Test Water Sample Chips */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            {locale === 'ha' ? 'Gwada da hotunan samfuri:' : 'Try test water samples:'}
          </span>
          <div className="flex flex-wrap gap-2">
            {WATER_SAMPLES.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPhotoUrl(s.uri);
                  setResult(null);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 cursor-pointer transition-colors"
              >
                {locale === 'ha' ? s.name_hausa : s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        {photoUrl && !result && (
          <button
            onClick={handleAnalyze}
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{busy ? t(locale, 'analyzing') : t(locale, 'analyze')}</span>
          </button>
        )}
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-white rounded-2xl p-5 border border-sky-200 shadow-sm space-y-4 animate-fade-in">
          {/* Status Header */}
          <div
            className={`p-4 rounded-xl flex items-center justify-between ${
              result.status === 'clean'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              {result.status === 'clean' ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0" />
              )}
              <div>
                <h3 className="font-extrabold text-lg">
                  {locale === 'ha' ? result.verdictTitleHausa : result.verdictTitle}
                </h3>
                <p className="text-xs opacity-90 mt-0.5">
                  {locale === 'ha' ? result.colorAssessmentHausa : result.colorAssessment}
                </p>
              </div>
            </div>

            {/* Read Aloud Button */}
            <button
              onClick={handleSpeak}
              className="p-2.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 shadow-xs cursor-pointer"
              title={t(locale, 'speakResult')}
            >
              <Volume2 className={`w-5 h-5 ${isSpeaking ? 'text-emerald-600 animate-bounce' : ''}`} />
            </button>
          </div>

          {/* Turbidity & Optical Metrics */}
          <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>{t(locale, 'turbidity')}:</span>
              <span>{result.turbidityScore} / 100</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  result.turbidityScore < 30
                    ? 'bg-emerald-500'
                    : result.turbidityScore < 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(8, result.turbidityScore))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Clear (&lt;5 NTU)</span>
              <span>Moderate</span>
              <span>Heavily Muddy</span>
            </div>
          </div>

          {/* Actionable Advice & Boiling Instruction */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-600" />
              <span>{t(locale, 'advice')}</span>
            </h4>
            <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {locale === 'ha' ? result.adviceHausa : result.advice}
            </div>
          </div>

          {/* Purification Methods Checklist */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                <Flame className="w-3.5 h-3.5 text-orange-600" />
                <span>{locale === 'ha' ? '1. Tafasawa' : '1. Boiling'}</span>
              </div>
              <p className="text-[11px] text-slate-600">
                {locale === 'ha'
                  ? 'Tafasa ruwa na minti 1-3 a wuta kafin sha'
                  : 'Rolling boil for 1-3 minutes kills bacteria & viruses'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                <Sun className="w-3.5 h-3.5 text-amber-600" />
                <span>{locale === 'ha' ? '2. SODIS Rana' : '2. SODIS Sun'}</span>
              </div>
              <p className="text-[11px] text-slate-600">
                {locale === 'ha'
                  ? 'Ajiye kwalba a rana mai zafi na awa 6'
                  : 'Leave clear bottle in direct sun for 6 hours'}
              </p>
            </div>
          </div>

          {/* Standards & Guidelines Card */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{result.guidelines.standard}</span>
            </div>
            <p className="text-[11px]">
              {result.guidelines.whoLimit} | {result.guidelines.nsdwqLimit}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
