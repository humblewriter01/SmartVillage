import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Sun,
  ShieldCheck,
  RotateCcw,
  Bell,
  BellOff,
  BellRing,
  Clock,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import { waterQualityService, WaterQualityResult } from '../services/waterQualityService';
import { voiceService } from '../services/voiceService';
import { historyService } from '../services/historyService';
import { reminderService, StoredReminder } from '../services/reminderService';

interface WaterQualityScreenProps {
  locale: Language;
  onRecordSaved?: () => void;
}

interface WaterSample {
  id: 'clean' | 'turbid' | 'algae';
  name: string;
  name_hausa: string;
  icon: string;
  getResult: () => WaterQualityResult;
}

const WATER_SAMPLES: WaterSample[] = [
  {
    id: 'clean',
    name: 'Clean Borehole',
    name_hausa: 'Ruwan Fanfo Mai Tsabta',
    icon: '🚰',
    getResult: () => waterQualityService.getCleanBoreholeResult(),
  },
  {
    id: 'turbid',
    name: 'Turbid River Water',
    name_hausa: 'Ruwan Kogin Laka',
    icon: '🪵',
    getResult: () => waterQualityService.getTurbidRiverResult(),
  },
  {
    id: 'algae',
    name: 'Algae Water',
    name_hausa: 'Ruwan Ciyawa mai Kore',
    icon: '🌿',
    getResult: () => waterQualityService.getAlgaeWaterResult(),
  },
];

interface WaterSafetyTip {
  id: number;
  icon: string;
  textEn: string;
  textHa: string;
}

const WATER_SAFETY_TIPS: WaterSafetyTip[] = [
  {
    id: 1,
    icon: '💧',
    textEn: 'Boil water 1–3 minutes before drinking.',
    textHa: 'Tafasa ruwa minti 1–3 kafin sha.',
  },
  {
    id: 2,
    icon: '🧪',
    textEn: "Use WaterGuard when you can't boil.",
    textHa: 'Yi amfani da WaterGuard idan ba za ka tafasa ba.',
  },
  {
    id: 3,
    icon: '🪣',
    textEn: 'Store water in a covered container.',
    textHa: 'Ajiye ruwa a kwano mai murfi.',
  },
  {
    id: 4,
    icon: '👀',
    textEn: "Don't drink cloudy or smelly water.",
    textHa: 'Kada ka sha ruwa mai duhu ko wari.',
  },
  {
    id: 5,
    icon: '🧼',
    textEn: 'Wash hands with soap before drinking.',
    textHa: 'Wanke hannu da sabulu kafin sha.',
  },
  {
    id: 6,
    icon: '🐐',
    textEn: 'Keep animals away from water sources.',
    textHa: 'Nisantar da dabbobi daga wurin ruwa.',
  },
  {
    id: 7,
    icon: '🏥',
    textEn: 'See a health worker if you get diarrhea.',
    textHa: "Tuntuɓi ma'aikacin lafiya idan ka sami gudawa.",
  },
];

export const WaterQualityScreen: React.FC<WaterQualityScreenProps> = ({
  locale,
  onRecordSaved,
}) => {
  const [selectedSampleId, setSelectedSampleId] = useState<'clean' | 'turbid' | 'algae' | null>(null);
  const [result, setResult] = useState<WaterQualityResult | null>(null);
  const [isSpeakingResult, setIsSpeakingResult] = useState(false);
  const [isSpeakingWaterHeader, setIsSpeakingWaterHeader] = useState(false);
  const [isSpeakingSamplesHeader, setIsSpeakingSamplesHeader] = useState(false);
  const [speakingSampleId, setSpeakingSampleId] = useState<string | null>(null);
  const [isSpeakingAllTips, setIsSpeakingAllTips] = useState(false);
  const [speakingTipId, setSpeakingTipId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Record<string, StoredReminder>>({});

  useEffect(() => {
    reminderService.getStoredReminders().then(setReminders);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleWaterReminder = async (type: 'waterguard_30min' | 'storage_refresh_24h') => {
    const key = `water-${type}`;
    if (reminders[key]) {
      await reminderService.cancelWaterReminder(type);
      setReminders((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      showToast(
        locale === 'ha'
          ? 'An soke tunatarwar tsaftar ruwa.'
          : 'Cancelled water safety reminder.'
      );
      return;
    }

    const perm = await reminderService.checkPermission();
    if (perm !== 'granted') {
      const granted = await reminderService.requestPermission();
      if (!granted) {
        showToast(
          locale === 'ha'
            ? 'Ba a ba da izinin sanarwa ba. Za ka iya kunna shi a saitunan waya.'
            : 'Notifications not allowed. You can enable them in phone settings.'
        );
        return;
      }
    }

    await reminderService.scheduleWaterTreatmentReminder(type);
    const updated = await reminderService.getStoredReminders();
    setReminders(updated);
    showToast(
      locale === 'ha'
        ? (type === 'waterguard_30min' ? 'An saita awon minti 30 na WaterGuard!' : 'An saita tunatarwar awanni 24 ta ruwan sha!')
        : (type === 'waterguard_30min' ? '30-minute WaterGuard disinfection timer active!' : '24-hour safe water refresh reminder scheduled!')
    );
  };

  const handleResetWater = () => {
    voiceService.stopSpeaking();
    setIsSpeakingResult(false);
    setIsSpeakingAllTips(false);
    setIsSpeakingSamplesHeader(false);
    setSpeakingSampleId(null);
    setSpeakingTipId(null);
    setSelectedSampleId(null);
    setResult(null);
    showToast(locale === 'ha' ? 'An sake farawa!' : 'Reset complete!');
  };

  const handleSelectSample = async (sample: WaterSample) => {
    voiceService.stopSpeaking();
    setIsSpeakingResult(false);
    setIsSpeakingAllTips(false);
    setIsSpeakingSamplesHeader(false);
    setSpeakingTipId(null);
    setSelectedSampleId(sample.id);
    setSpeakingSampleId(sample.id);

    const res = sample.getResult();
    setResult(res);

    historyService.insert({
      type: 'water',
      createdAt: new Date().toISOString(),
      title: locale === 'ha' ? res.verdictTitleHausa : res.verdictTitle,
      detail: `Turbidity: ${res.turbidityScore}/100 | ${locale === 'ha' ? res.colorAssessmentHausa : res.colorAssessment}`,
      advice: locale === 'ha' ? res.adviceHausa : res.advice,
      confidence: res.status === 'clean' ? 0.98 : 0.96,
    });

    onRecordSaved?.();

    // Live Read-Aloud TTS when selecting/tapping sample
    const sampleName = locale === 'ha' ? sample.name_hausa : sample.name;
    const verdict = locale === 'ha' ? res.verdictTitleHausa : res.verdictTitle;
    const assessment = locale === 'ha' ? res.colorAssessmentHausa : res.colorAssessment;
    const textToSpeak = `${sampleName}. ${verdict}. ${assessment}.`;

    await voiceService.speak(textToSpeak, locale, (warning) => {
      showToast(warning);
    });
    setSpeakingSampleId(null);
  };

  // Read Aloud individual sample on clicking speaker icon
  const handleSpeakSampleOnly = async (sample: WaterSample, e: React.MouseEvent) => {
    e.stopPropagation();
    if (speakingSampleId === sample.id) {
      voiceService.stopSpeaking();
      setSpeakingSampleId(null);
      return;
    }
    voiceService.stopSpeaking();
    setSpeakingSampleId(sample.id);

    const res = sample.getResult();
    const sampleName = locale === 'ha' ? sample.name_hausa : sample.name;
    const verdict = locale === 'ha' ? res.verdictTitleHausa : res.verdictTitle;
    const assessment = locale === 'ha' ? res.colorAssessmentHausa : res.colorAssessment;
    const textToSpeak = `${sampleName}. ${verdict}. ${assessment}.`;

    await voiceService.speak(textToSpeak, locale, (warning) => {
      showToast(warning);
    });
    setSpeakingSampleId(null);
  };

  // Read Aloud the header and list of samples
  const handleSpeakSamplesHeader = async () => {
    if (isSpeakingSamplesHeader) {
      voiceService.stopSpeaking();
      setIsSpeakingSamplesHeader(false);
      return;
    }
    voiceService.stopSpeaking();
    setIsSpeakingSamplesHeader(true);

    const title = locale === 'ha' ? 'Zaɓi Samfurin Ruwa don Gwaji.' : 'Choose a Water Sample to Test.';
    const samplesSummary = WATER_SAMPLES.map(
      (s, idx) => `${idx + 1}: ${locale === 'ha' ? s.name_hausa : s.name}`
    ).join('. ');
    const fullSpeech = `${title} ${samplesSummary}.`;

    await voiceService.speak(fullSpeech, locale, (warning) => {
      showToast(warning);
    });
    setIsSpeakingSamplesHeader(false);
  };

  // Read Aloud inside Water Quality result box
  const handleSpeakResult = async () => {
    if (!result) return;
    if (isSpeakingResult) {
      voiceService.stopSpeaking();
      setIsSpeakingResult(false);
      return;
    }

    voiceService.stopSpeaking();
    setIsSpeakingResult(true);
    const titleText = locale === 'ha' ? result.verdictTitleHausa : result.verdictTitle;
    const scoreText =
      locale === 'ha'
        ? `Matsayin laka da duhu: ${result.turbidityScore} cikin 100.`
        : `Turbidity score: ${result.turbidityScore} out of 100.`;
    const adviceText = locale === 'ha' ? result.adviceHausa : result.advice;
    const textToSpeak = `${titleText}. ${scoreText} ${adviceText}`;

    await voiceService.speak(textToSpeak, locale, (warning) => {
      showToast(warning);
    });
    setIsSpeakingResult(false);
  };

  const handleSpeakWaterHeader = async () => {
    if (isSpeakingWaterHeader) {
      voiceService.stopSpeaking();
      setIsSpeakingWaterHeader(false);
      return;
    }
    voiceService.stopSpeaking();
    setIsSpeakingWaterHeader(true);
    const textToSpeak =
      locale === 'ha'
        ? 'Tsabtar Ruwa. Gwajin samfurin ruwa: Ruwa Mai Kyau ko Tafasa Kafin Sha.'
        : 'Water Quality. Test water samples: Safe or Boil Before Drinking.';
    await voiceService.speak(textToSpeak, locale);
    setIsSpeakingWaterHeader(false);
  };

  // Read Aloud all Water Safety Tips
  const handleSpeakAllTips = async () => {
    if (isSpeakingAllTips) {
      voiceService.stopSpeaking();
      setIsSpeakingAllTips(false);
      return;
    }

    voiceService.stopSpeaking();
    setIsSpeakingAllTips(true);

    const header = locale === 'ha' ? 'Shawarwarin Tsaftar Ruwa.' : 'Water Safety Tips.';
    const tipsContent = WATER_SAFETY_TIPS.map(
      (tip, idx) => `${idx + 1}. ${locale === 'ha' ? tip.textHa : tip.textEn}`
    ).join(' ');

    const fullSpeech = `${header} ${tipsContent}`;
    await voiceService.speak(fullSpeech, locale, (warning) => {
      showToast(warning);
    });
    setIsSpeakingAllTips(false);
  };

  // Read Aloud a single Water Safety Tip
  const handleSpeakSingleTip = async (tip: WaterSafetyTip) => {
    if (speakingTipId === tip.id) {
      voiceService.stopSpeaking();
      setSpeakingTipId(null);
      return;
    }

    voiceService.stopSpeaking();
    setSpeakingTipId(tip.id);

    const textToSpeak = locale === 'ha' ? tip.textHa : tip.textEn;
    await voiceService.speak(textToSpeak, locale, (warning) => {
      showToast(warning);
    });
    setSpeakingTipId(null);
  };

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Screen Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#173326] flex items-center gap-2">
              <Droplets className="w-6 h-6 text-sky-600" />
              <span>{locale === 'ha' ? 'Tsabtar Ruwa' : 'Water Quality'}</span>
            </h1>
            <button
              type="button"
              onClick={handleSpeakWaterHeader}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isSpeakingWaterHeader
                  ? 'bg-sky-600 text-white border-sky-700 animate-pulse'
                  : 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100 shadow-2xs'
              }`}
              title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {locale === 'ha'
              ? 'Gwajin samfurin ruwa: Ruwa Mai Kyau ko Tafasa Kafin Sha'
              : 'Test water samples: Safe or Boil Before Drinking'}
          </p>
        </div>

        {/* Header Reset / Start Over Button */}
        {result && (
          <button
            type="button"
            onClick={handleResetWater}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
            title={locale === 'ha' ? 'Sake Farawa' : 'Reset / Start Over'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{locale === 'ha' ? 'Sake Farawa' : 'Reset'}</span>
          </button>
        )}
      </div>

      {/* Sample Buttons Section */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-800">
                {locale === 'ha' ? 'Zaɓi Samfurin Ruwa don Gwaji:' : 'Choose a Water Sample to Test:'}
              </h2>
              <button
                type="button"
                onClick={handleSpeakSamplesHeader}
                className={`p-1 rounded-lg border transition-all cursor-pointer ${
                  isSpeakingSamplesHeader
                    ? 'bg-sky-600 text-white border-sky-700 animate-pulse'
                    : 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100 shadow-2xs'
                }`}
                title={locale === 'ha' ? 'Karanta jerin samfuran' : 'Read samples list'}
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeakingSamplesHeader ? 'animate-bounce text-white' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {locale === 'ha'
                ? 'Danna ɗaya daga cikin samfuran don duba inganci da shawara'
                : 'Tap any sample below to check its safety verdict and turbidity score'}
            </p>
          </div>

          {result && (
            <button
              type="button"
              onClick={handleResetWater}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200 shrink-0"
              title={locale === 'ha' ? 'Share sakamako' : 'Clear result'}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{locale === 'ha' ? 'Share' : 'Clear'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {WATER_SAMPLES.map((sample) => {
            const isSelected = selectedSampleId === sample.id;
            const isSpeakingThis = speakingSampleId === sample.id;
            return (
              <div
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.98] ${
                  isSelected
                    ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-300 font-bold shadow-xs'
                    : 'bg-slate-50/70 hover:bg-sky-50/50 border-slate-200 hover:border-sky-300'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <span className="text-2xl shrink-0">{sample.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {locale === 'ha' ? sample.name_hausa : sample.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {locale === 'ha' ? sample.name : sample.name_hausa}
                    </div>
                  </div>
                </div>

                {/* Individual Sample Read-Aloud Icon */}
                <button
                  type="button"
                  onClick={(e) => handleSpeakSampleOnly(sample, e)}
                  className={`p-1.5 rounded-lg border shrink-0 transition-all cursor-pointer active:scale-95 ${
                    isSpeakingThis
                      ? 'bg-sky-600 text-white border-sky-700 animate-pulse'
                      : isSelected
                      ? 'bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-sky-50 hover:text-sky-800'
                  }`}
                  title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isSpeakingThis ? 'animate-bounce text-white' : 'text-sky-700'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-white rounded-2xl p-5 border border-sky-200 shadow-sm space-y-4 animate-fade-in">
          {/* Status Header */}
          <div
            className={`p-4 rounded-xl flex items-start justify-between gap-3 min-h-[72px] ${
              result.status === 'clean'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              {result.status === 'clean' ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0 space-y-0.5">
                <h3 className="font-extrabold text-base sm:text-lg leading-snug break-words">
                  {locale === 'ha' ? result.verdictTitleHausa : result.verdictTitle}
                </h3>
                <p className="text-xs opacity-90 leading-relaxed break-words">
                  {locale === 'ha' ? result.colorAssessmentHausa : result.colorAssessment}
                </p>
              </div>
            </div>

            {/* Read Aloud Button */}
            <button
              onClick={handleSpeakResult}
              className={`shrink-0 flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs ${
                isSpeakingResult
                  ? 'bg-sky-600 text-white animate-pulse'
                  : 'bg-white/90 hover:bg-white text-slate-800 border border-slate-300'
              }`}
              title={locale === 'ha' ? 'Karanta sakamako da murya' : 'Read result aloud'}
            >
              <Volume2 className={`w-4 h-4 ${isSpeakingResult ? 'text-white animate-bounce' : 'text-sky-700'}`} />
              <span>{locale === 'ha' ? 'Saurara' : 'Listen'}</span>
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

          {/* Action & Reset Buttons */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleResetWater}
              className="w-full py-3 px-4 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4 text-sky-200" />
              <span>{locale === 'ha' ? 'Sake Farawa (Duba Wani Ruwa)' : 'Reset (Check Another Sample)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Water Treatment & Disinfection Reminders */}
      <div className="bg-white rounded-2xl p-5 border border-sky-200 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BellRing className="w-5 h-5 text-sky-700" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
              {locale === 'ha' ? 'Tunatarwar Tace Ruwa da Awo' : 'Water Treatment & Safe Storage Reminders'}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
            {locale === 'ha' ? 'Kariya da Lafiya' : 'Health & Safety'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* WaterGuard 30-Minute Chlorination Timer */}
          <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl flex flex-col justify-between space-y-2.5">
            <div>
              <div className="flex items-center space-x-1.5 font-bold text-xs text-sky-950">
                <Clock className="w-4 h-4 text-sky-700" />
                <span>{locale === 'ha' ? 'Awon Minti 30 na WaterGuard' : '30-Min WaterGuard Timer'}</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {locale === 'ha'
                  ? 'Bayan zuba murfin WaterGuard a jarka, a jira minti 30 kafin sha domin kashe kwayoyin cuta.'
                  : 'Wait 30 minutes after adding WaterGuard before drinking to ensure complete disinfection.'}
              </p>
            </div>

            {reminders['water-waterguard_30min'] ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-white/90 border border-emerald-300 px-2 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{locale === 'ha' ? 'Awo na tafiya: Za a sanar da kai a minti 30' : 'Timer active: You will be alerted in 30 mins'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleWaterReminder('waterguard_30min')}
                  className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                >
                  <BellOff className="w-3 h-3 text-amber-700" />
                  <span>{locale === 'ha' ? 'Soke Awon' : 'Cancel Timer'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleWaterReminder('waterguard_30min')}
                className="w-full py-2 px-3 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
              >
                <Bell className="w-3.5 h-3.5 text-sky-200" />
                <span>{locale === 'ha' ? 'Fara Awon Minti 30' : 'Start 30-Min Timer'}</span>
              </button>
            )}
          </div>

          {/* 24-Hour Safe Storage Refresh */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col justify-between space-y-2.5">
            <div>
              <div className="flex items-center space-x-1.5 font-bold text-xs text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>{locale === 'ha' ? 'Sabunta Ruwan Sha (Awanni 24)' : '24-Hour Safe Storage Check'}</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {locale === 'ha'
                  ? 'Kiyaye ruwan sha a rufe; a sabunta ko a sake tafasa ruwan da ya wuce awanni 24 a kwano.'
                  : 'WHO guideline: inspect covered containers and replenish fresh treated drinking water daily.'}
              </p>
            </div>

            {reminders['water-storage_refresh_24h'] ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-white/90 border border-emerald-300 px-2 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{locale === 'ha' ? 'An saita tunatarwar gobe a kan waya' : 'Reminder active for tomorrow'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleWaterReminder('storage_refresh_24h')}
                  className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                >
                  <BellOff className="w-3 h-3 text-amber-700" />
                  <span>{locale === 'ha' ? 'Soke Tunatarwa' : 'Cancel Reminder'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleWaterReminder('storage_refresh_24h')}
                className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
              >
                <Bell className="w-3.5 h-3.5 text-emerald-200" />
                <span>{locale === 'ha' ? 'Saita Tunatarwar Awanni 24' : 'Set 24-Hour Reminder'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Water Safety Tips Section */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>{locale === 'ha' ? 'Shawarwarin Tsaftar Ruwa' : 'Water Safety Tips'}</span>
            </h2>
            <button
              type="button"
              onClick={handleSpeakAllTips}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isSpeakingAllTips
                  ? 'bg-sky-600 text-white border-sky-700 animate-pulse'
                  : 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100 shadow-2xs'
              }`}
              title={locale === 'ha' ? 'Saurari dukkan shawarwari' : 'Listen to all tips'}
            >
              <Volume2 className={`w-4 h-4 ${isSpeakingAllTips ? 'animate-bounce text-white' : ''}`} />
            </button>
          </div>

          <span className="text-[11px] font-semibold text-slate-500">
            {WATER_SAFETY_TIPS.length} {locale === 'ha' ? 'shawarwari' : 'tips'}
          </span>
        </div>

        {/* Tip Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {WATER_SAFETY_TIPS.map((tip) => {
            const isSpeakingThis = speakingTipId === tip.id;
            return (
              <div
                key={tip.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-sky-50/40 transition-colors flex items-start justify-between gap-2.5"
              >
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <span className="text-2xl shrink-0 mt-0.5">{tip.icon}</span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                      {locale === 'ha' ? tip.textHa : tip.textEn}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {locale === 'ha' ? tip.textEn : tip.textHa}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSpeakSingleTip(tip)}
                  className={`p-1.5 rounded-lg border shrink-0 transition-all cursor-pointer active:scale-95 ${
                    isSpeakingThis
                      ? 'bg-sky-600 text-white border-sky-700 animate-pulse'
                      : 'bg-white hover:bg-sky-50 text-slate-600 border-slate-200 hover:border-sky-300'
                  }`}
                  title={locale === 'ha' ? 'Saurara' : 'Listen'}
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isSpeakingThis ? 'animate-bounce text-white' : 'text-sky-700'}`} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 bg-sky-50/60 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed">
          <p className="font-medium text-center sm:text-left">
            {locale === 'ha'
              ? 'Waɗannan shawarwari ne na gama-gari. Don gwajin ingancin ruwa na musamman, tuntuɓi hukumar lafiya ko ruwa ta yankinka.'
              : 'These are general safety tips. For specific water quality testing, consult your local health or water authority.'}
          </p>
        </div>
      </div>
    </div>
  );
};
