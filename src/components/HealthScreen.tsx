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
  ListFilter,
  X,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import {
  analyzeHealth,
  HealthResult,
  MANUAL_HEALTH_CONDITIONS,
  ManualHealthCondition,
} from '../services/healthService';
import { voiceService } from '../services/voiceService';
import { historyService } from '../services/historyService';

interface HealthScreenProps {
  locale: Language;
  onRecordSaved?: () => void;
}

const COMMON_SYMPTOM_CHIPS = [
  { label: 'Fever & chills', hausa: 'Zazzabi da rawar sanyi' },
  { label: 'Watery diarrhea & vomiting', hausa: 'Gudawa da zawayi da amai' },
  { label: 'Fast difficult breathing', hausa: 'Numfashi da sauri da wahala' },
  { label: 'Snakebite on leg or foot', hausa: 'Cizon maciji a kafa ko hannu' },
  { label: 'Stiff neck & headache', hausa: 'Taurin wuya da ciwon kai' },
  { label: 'Measles red rash & red eyes', hausa: 'Kurajen kyanda da jan idanu' },
  { label: 'Heat exhaustion & fainting', hausa: 'Zafin rana da jiri ko sumewa' },
  { label: 'Itchy skin rash (scabies)', hausa: 'Kurajen makero da kaikayi' },
];

export const HealthScreen: React.FC<HealthScreenProps> = ({ locale, onRecordSaved }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState<HealthResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualCategoryFilter, setManualCategoryFilter] = useState<'all' | 'emergency' | 'infectious' | 'respiratory' | 'skin'>('all');
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

  // Voice-to-Text: Speak symptoms aloud
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

        // Automatically run instant analysis on the spoken words
        const res = analyzeHealth(recognizedText, Boolean(photoUrl));
        setResult(res);
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
      showToast(locale === 'ha' ? 'Shigar da alamomi ko dauki hoto' : 'Enter symptoms or take a photo');
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
        title: locale === 'ha' ? r.conditionHausa : r.condition,
        detail: symptoms.trim() || 'Visual screening',
        advice: `${locale === 'ha' ? r.adviceHausa : r.advice}\n\n${locale === 'ha' ? r.urgencyHausa : r.urgency}`,
        confidence: r.confidence,
        imagePath: photoUrl || undefined,
      });

      onRecordSaved?.();
      setBusy(false);
    }, 350);
  };

  // Manual Health Condition Selection Handler
  const handleSelectManualCondition = (cond: ManualHealthCondition) => {
    const res: HealthResult = {
      condition: cond.condition,
      conditionHausa: cond.conditionHausa,
      advice: `${cond.firstAid} ${cond.clinicalAdvice}`,
      adviceHausa: `${cond.firstAidHausa} ${cond.clinicalAdviceHausa}`,
      urgency: cond.urgencyLabel,
      urgencyHausa: cond.urgencyLabelHausa,
      confidence: 0.95,
      firstAid: cond.firstAid,
      firstAidHausa: cond.firstAidHausa,
    };

    setSymptoms(locale === 'ha' ? cond.symptomsHausa : cond.symptoms);
    setResult(res);
    setShowManualModal(false);

    historyService.insert({
      type: 'health',
      createdAt: new Date().toISOString(),
      title: locale === 'ha' ? cond.conditionHausa : cond.condition,
      detail: `Manual Condition: ${locale === 'ha' ? cond.symptomsHausa : cond.symptoms}`,
      advice: `${locale === 'ha' ? res.adviceHausa : res.advice}`,
      confidence: 0.95,
    });

    onRecordSaved?.();
    showToast(locale === 'ha' ? 'An ɗora bayanin cutar!' : 'Loaded condition details!');
  };

  const handleSpeak = async () => {
    if (!result) return;
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const titleText = locale === 'ha' ? result.conditionHausa : result.condition;
    const adviceText = locale === 'ha' ? result.adviceHausa : result.advice;
    const urgencyText = locale === 'ha' ? result.urgencyHausa : result.urgency;
    const textToSpeak = `${titleText}. ${adviceText}. ${urgencyText}`;

    await voiceService.speak(textToSpeak, locale, (warning) => {
      showToast(warning);
    }, 'health');
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

  const filteredConditions = MANUAL_HEALTH_CONDITIONS.filter((c) => {
    if (manualCategoryFilter === 'all') return true;
    return c.category === manualCategoryFilter;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
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

      {/* Header & Manual Selector Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#991b1b]">
            {t(locale, 'health')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {locale === 'ha'
              ? 'Binciken alamomin zazzabi, amai, cizon maciji da lafiyar iyali'
              : 'Offline rural health symptom guidance, first aid & triage'}
          </p>
        </div>

        {/* Large Manual Selector Button */}
        <button
          onClick={() => setShowManualModal(true)}
          className="flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs shrink-0"
        >
          <ListFilter className="w-4 h-4 text-red-700" />
          <span>{t(locale, 'manualHealthTitle')}</span>
        </button>
      </div>

      {/* Voice-to-Text Recording Banner for Grandma & Patients */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          listening
            ? 'bg-red-50 border-red-300 ring-2 ring-red-400'
            : 'bg-gradient-to-r from-red-50 to-rose-50/50 border-red-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleListening}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                listening
                  ? 'bg-red-600 text-white animate-pulse scale-105'
                  : 'bg-red-700 hover:bg-red-800 text-white'
              }`}
              title={listening ? t(locale, 'stop') : t(locale, 'speakDescribeHealth')}
            >
              {listening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-800">
                {listening ? t(locale, 'listeningNow') : t(locale, 'speakDescribeHealth')}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t(locale, 'healthSpeechHint')}
              </p>
            </div>
          </div>

          {listening && (
            <span className="text-[11px] font-bold text-red-600 animate-pulse bg-red-100/80 px-2.5 py-1 rounded-full border border-red-200">
              REC
            </span>
          )}
        </div>
      </div>

      {/* Symptoms Text Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            {t(locale, 'symptoms')}
          </label>
          {symptoms && (
            <button
              onClick={() => {
                setSymptoms('');
                setResult(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-medium"
            >
              Clear
            </button>
          )}
        </div>

        <textarea
          rows={3}
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder={t(locale, 'symptomsHint')}
          className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-2xs"
        />

        {/* Quick Symptom Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {COMMON_SYMPTOM_CHIPS.map((chip, idx) => {
            const label = locale === 'ha' ? chip.hausa : chip.label;
            const isIncluded = symptoms.toLowerCase().includes(label.toLowerCase());
            return (
              <button
                key={idx}
                onClick={() => addSymptomChip(chip)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  isIncluded
                    ? 'bg-red-700 text-white border-red-700 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50/60'
                }`}
              >
                + {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional Photo Section (Wound, rash, snakebite puncture) */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-red-200 p-3.5 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
        {photoUrl ? (
          <div className="w-full flex flex-col items-center">
            <img
              src={photoUrl}
              alt="Health observation"
              className="max-h-48 rounded-xl object-contain shadow-xs border border-red-100"
            />
            <button
              onClick={() => {
                setPhotoUrl(null);
                setResult(null);
              }}
              className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium underline cursor-pointer"
            >
              {locale === 'ha' ? 'Cire hoto' : 'Remove photo'}
            </button>
          </div>
        ) : (
          <div className="text-center p-2 space-y-1.5">
            <ShieldAlert className="w-6 h-6 text-red-600 opacity-80 mx-auto" />
            <p className="text-slate-700 font-bold text-xs">
              {locale === 'ha' ? 'Hoton matsalar fata ko cizon maciji (Idan akwai)' : 'Optional photo for rash, bite, or visible wound'}
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="py-1.5 px-3 border border-red-300 text-red-800 bg-white hover:bg-red-50 rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5 inline mr-1 text-red-700" />
                <span>{t(locale, 'takePhoto')}</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-1.5 px-3 border border-red-300 text-red-800 bg-white hover:bg-red-50 rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
              >
                <ImageIcon className="w-3.5 h-3.5 inline mr-1 text-red-700" />
                <span>{t(locale, 'gallery')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Analyze Button */}
      {(symptoms.trim() || photoUrl) && !result && (
        <button
          onClick={handleAnalyze}
          disabled={busy}
          className="w-full py-3.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-red-200" />
          <span>{busy ? t(locale, 'analyzing') : t(locale, 'analyze')}</span>
        </button>
      )}

      {/* Clinical Assessment Result Card */}
      {result && (
        <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm space-y-4 animate-scale-up">
          {/* Header with Title and Grandma Listen Button */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                {t(locale, 'healthResult')}
              </span>
              <h3 className="font-extrabold text-lg sm:text-xl text-slate-800 mt-0.5">
                {locale === 'ha' ? result.conditionHausa : result.condition}
              </h3>
            </div>

            {/* Grandma-Friendly Read Aloud Button */}
            <button
              onClick={handleSpeak}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs ${
                isSpeaking
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-300'
              }`}
              title={t(locale, 'grandmaListen')}
            >
              <Volume2 className="w-4 h-4 text-red-700" />
              <span>{locale === 'ha' ? 'Saurara da Murya' : 'Listen Aloud'}</span>
            </button>
          </div>

          {/* Urgency Badge */}
          <div className="p-3 bg-red-50/90 border border-red-200 rounded-xl space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-800 block">
              {t(locale, 'urgency')}
            </span>
            <div className="font-extrabold text-xs sm:text-sm text-red-950 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{locale === 'ha' ? result.urgencyHausa : result.urgency}</span>
            </div>
          </div>

          {/* Actionable Medical Advice & First Aid */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-red-600" />
              <span>{t(locale, 'firstAidHomeCare')}</span>
            </h4>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              {locale === 'ha' ? result.adviceHausa : result.advice}
            </div>
          </div>

          {/* Medical Disclaimer Notice */}
          <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-tight">
            {t(locale, 'notMedical')}
          </div>
        </div>
      )}

      {/* Corrected Manual Health Condition Picker Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-red-800 text-white">
              <div className="flex items-center space-x-2">
                <HeartPulse className="w-5 h-5 text-red-200" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  {t(locale, 'manualHealthTitle')}
                </h3>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-red-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filter Tabs */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex gap-1.5 overflow-x-auto">
              {(['all', 'emergency', 'infectious', 'respiratory', 'skin'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setManualCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-colors cursor-pointer border ${
                    manualCategoryFilter === cat
                      ? 'bg-red-800 text-white border-red-800 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat === 'all'
                    ? locale === 'ha' ? 'Duk Cututtuka' : 'All Conditions'
                    : cat === 'emergency'
                    ? locale === 'ha' ? 'Gaggawa (Hatsari)' : 'Emergencies'
                    : cat === 'infectious'
                    ? locale === 'ha' ? 'Zazzabi / Kamuwa' : 'Infectious'
                    : cat === 'respiratory'
                    ? locale === 'ha' ? 'Numfashi' : 'Respiratory'
                    : locale === 'ha' ? 'Fata' : 'Skin'}
                </button>
              ))}
            </div>

            {/* Modal List of Conditions */}
            <div className="p-4 overflow-y-auto space-y-3">
              {filteredConditions.map((cond) => {
                const isEmergency = cond.urgency === 'critical';
                return (
                  <div
                    key={cond.id}
                    onClick={() => handleSelectManualCondition(cond)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-red-400 hover:bg-red-50/50 transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                        {locale === 'ha' ? cond.conditionHausa : cond.condition}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isEmergency
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {locale === 'ha' ? cond.urgencyLabelHausa : cond.urgencyLabel}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      <strong className="text-slate-700">
                        {locale === 'ha' ? 'Alamomi: ' : 'Symptoms: '}
                      </strong>
                      {locale === 'ha' ? cond.symptomsHausa : cond.symptoms}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-red-700 font-bold flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {locale === 'ha' ? 'Danna domin Zaɓa da Sauraro' : 'Tap to Select & Listen'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                {locale === 'ha' ? 'Rufe' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
