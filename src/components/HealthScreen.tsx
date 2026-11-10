// Health Symptom Triage Screen — Offline Rule-Based Engine
// Matches the UI pattern of the Water and Crop screens.

import React, { useState, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Volume2,
  AlertCircle,
  ShieldAlert,
  ListFilter,
  X,
  HeartPulse,
  RotateCcw,
  Activity,
  ShieldCheck,
  RotateCcw as ResetIcon,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import {
  triageEvaluate,
  TriageResult,
  TriageSeverity,
  TRIAGE_SYMPTOMS,
  severityLabel,
  getSymptomById,
  extractSymptomsFromText,
} from '../data/triageRules';
import {
  MANUAL_HEALTH_CONDITIONS,
  ManualHealthCondition,
} from '../services/healthService';
import { voiceService } from '../services/voiceService';
import { historyService } from '../services/historyService';
import {
  pickPhotoFromGallery,
} from '../services/cameraService';
import { FullScreenCameraModal } from './FullScreenCameraModal';

interface HealthScreenProps {
  locale: Language;
  onRecordSaved?: () => void;
}

export const HealthScreen: React.FC<HealthScreenProps> = ({ locale, onRecordSaved }) => {
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<string[]>([]);
  const [autoSelectedSymptomIds, setAutoSelectedSymptomIds] = useState<string[]>([]);
  const [symptomText, setSymptomText] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Which input produced the current result — decides where the result card renders
  const [resultSource, setResultSource] = useState<'symptom' | 'photo'>('symptom');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualCategoryFilter, setManualCategoryFilter] = useState<'all' | 'emergency' | 'infectious' | 'respiratory' | 'skin'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // Generation counter — invalidates a pending (setTimeout) analysis when the
  // user changes inputs mid-flight, so stale results can never surface.
  const analysisRunRef = useRef(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ------------------------------------------------------------------
  // Reset & Start Over Handlers
  // ------------------------------------------------------------------
  const handleResetHealth = () => {
    analysisRunRef.current++;
    voiceService.stopSpeaking();
    setIsSpeaking(false);
    setIsSpeakingSymptomsText(false);
    setBusy(false);
    setSelectedSymptomIds([]);
    setAutoSelectedSymptomIds([]);
    setSymptomText('');
    setPhoto(null);
    setPhotoUrl(null);
    setResult(null);
    setResultSource('symptom');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    showToast(locale === 'ha' ? 'An sake farawa!' : 'Reset complete!');
  };

  const handleCheckAgain = () => {
    voiceService.stopSpeaking();
    setIsSpeaking(false);
    setResult(null);
  };

  // ------------------------------------------------------------------
  // Free-text symptom input handler
  // ------------------------------------------------------------------
  // Mutually exclusive inputs — Scenario B: typing clears any captured photo
  const clearPhotoIfCaptured = (notice: string) => {
    if (photo || photoUrl) {
      analysisRunRef.current++; // cancel any pending photo analysis
      setBusy(false);
      setPhoto(null);
      setPhotoUrl(null);
      setResult(null);
      showToast(notice);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    // Typing takes over the screening — drop the photo from the preview
    clearPhotoIfCaptured(
      locale === 'ha'
        ? 'An cire hoto — rubutu ya karɓi gaba'
        : 'Photo removed — text input takes over'
    );
    setSymptomText(text);
    const extracted = extractSymptomsFromText(text);
    setAutoSelectedSymptomIds(extracted);
  };

  // Clear (Soke) button — wipes the text box and unselects auto-matched chips
  const handleClearTypedText = () => {
    analysisRunRef.current++; // cancel any pending analysis tied to this text
    voiceService.stopSpeaking();
    setIsSpeakingSymptomsText(false);
    setBusy(false);
    setSymptomText('');
    setAutoSelectedSymptomIds([]);
    setResult(null);
  };

  // ------------------------------------------------------------------
  // Photo handlers — a freshly loaded photo wipes text & chips (Scenario A).
  // Photos are analyzed ONLY via the "Bincika / Analyze" button under the image.
  // ------------------------------------------------------------------
  const applyPhoto = (formatted: string) => {
    analysisRunRef.current++; // cancel any analysis tied to the previous state
    // Scenario A: loading a photo immediately clears the text box and ALL chips
    setSymptomText('');
    setSelectedSymptomIds([]);
    setAutoSelectedSymptomIds([]);
    setPhoto(formatted);
    setPhotoUrl(formatted);
    setResult(null);
    // No auto-analysis — wait for the user to tap "Bincika / Analyze" under the image
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      applyPhoto(url);
    }
    e.target.value = '';
  };

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  const handleOpenCamera = () => {
    setIsCameraActive(true);
  };

  const handleCapturePhoto = (captured: string) => {
    const formatted = captured.startsWith('data:') ? captured : `data:image/jpeg;base64,${captured}`;
    // Scenario A — photo wipes text & chips
    applyPhoto(formatted);
    setIsCameraActive(false);
    showToast(locale === 'ha' ? 'An ɗauki hoto!' : 'Photo captured!');
  };

  const handleCloseCamera = () => {
    setIsCameraActive(false);
  };

  const handleGallery = async () => {
    try {
      const picked = await pickPhotoFromGallery();
      if (picked) {
        const formatted = picked.startsWith('data:') ? picked : `data:image/jpeg;base64,${picked}`;
        // Scenario A — photo wipes text & chips
        applyPhoto(formatted);
        showToast(locale === 'ha' ? 'An loda hoto daga gallery!' : 'Photo loaded!');
      }
    } catch (error) {
      console.warn('Gallery picker error:', error);
      showToast(locale === 'ha' ? 'Ba a iya buɗe Gallery ba. Duba izinin hotuna.' : 'Could not open the gallery. Check photo permissions.');
    }
  };

  // ------------------------------------------------------------------
  // Analyze — runs the offline rule-based triage engine
  // ------------------------------------------------------------------
  // Shared offline analysis runner — powers both the top Analyze button
  // (text + chips) and the "Bincika / Analyze" button under the photo.
  // The clinical rule engine priority logic (triageEvaluate) is unchanged.
  const performAnalysis = (
    allSymptomIds: string[],
    photo: string | null,
    source: 'symptom' | 'photo' = 'symptom'
  ) => {
    const hasSelection = allSymptomIds.length > 0;

    if (!hasSelection && !photo) {
      showToast(locale === 'ha' ? 'Zaɓi alamomi ko dauki hoto' : 'Select symptoms or take a photo');
      return;
    }

    const runId = ++analysisRunRef.current;
    setBusy(true);
    setTimeout(() => {
      let r: TriageResult;

      if (hasSelection) {
        // Forward-chaining rule engine over combined symptom IDs
        r = triageEvaluate(allSymptomIds);
      } else {
        // Photo uploaded without symptom selection
        r = {
          severity: 'Routine',
          condition: 'Visible Skin or Health Observation',
          conditionHausa: 'Duba Matsalar Fata ko Kurji',
          action: 'Keep affected skin clean and dry with mild soap. Avoid scratching or applying motor oil/battery acid remedies. Have a health worker inspect in person.',
          actionHausa: 'Wanke wurin da ruwa mai tsabta da sabulu marar zafi. Kada a shafa man inji ko maganin da ba a sani ba. Nemi likita ya duba.',
          firstAid: 'Clean with mild soap and water. Do not scratch.',
          firstAidHausa: 'Yi wanka da sabulu marar zafi da ruwa. Kada a shafa man inji.',
          dangerSigns: 'Spreading redness, pus, fever, increasing pain.',
          dangerSignsHausa: 'Kurje ya farawa, ruwaya, zazzabi, ciwon tsawan motsi.',
          confidence: 0.75,
          matchedRuleId: 'photo_only',
          matchedSymptoms: [],
        };
      }

      if (runId !== analysisRunRef.current) return; // superseded — inputs changed mid-analysis
      setResultSource(source);
      setResult(r);

      // Save to local database / history
      historyService.insert({
        type: 'health',
        createdAt: new Date().toISOString(),
        title: locale === 'ha' ? r.conditionHausa : r.condition,
        detail: hasSelection
          ? `Symptoms: ${allSymptomIds.map((id) => getSymptomById(id)?.label || id).join(', ')}`
          : 'Visual screening',
        advice: `${locale === 'ha' ? r.actionHausa : r.action}\n\n${locale === 'ha' ? severityLabel(r.severity, 'ha') : severityLabel(r.severity, 'en')}`,
        confidence: r.confidence,
        imagePath: photo || undefined,
      });

      onRecordSaved?.();
      setBusy(false);
    }, 350);
  };

  const handleAnalyze = () => {
    // Combine manually selected chips + auto-selected from text input
    const allSymptomIds = [
      ...new Set([...selectedSymptomIds, ...autoSelectedSymptomIds]),
    ];
    performAnalysis(allSymptomIds, photoUrl);
  };

  // Photo analysis — runs only when the user taps "Bincika / Analyze" under
  // the image (a photo is never analyzed just because it was uploaded).
  const handleAnalyzePhoto = () => {
    // Only the photo is analyzed — text/chips are always cleared when a
    // photo is loaded (mutually exclusive inputs).
    performAnalysis([], photoUrl, 'photo');
  };

  // ------------------------------------------------------------------
  // Manual Health Condition Selection Handler
  // ------------------------------------------------------------------
  const handleSelectManualCondition = (cond: ManualHealthCondition) => {
    const severityMap: Record<ManualHealthCondition['urgency'], TriageSeverity> = {
      critical: 'Emergency',
      high: 'Urgent',
      moderate: 'Urgent',
      mild: 'Routine',
    };

    const res: TriageResult = {
      condition: cond.condition,
      conditionHausa: cond.conditionHausa,
      action: `${cond.firstAid} ${cond.clinicalAdvice}`,
      actionHausa: `${cond.firstAidHausa} ${cond.clinicalAdviceHausa}`,
      firstAid: cond.firstAid,
      firstAidHausa: cond.firstAidHausa,
      dangerSigns: cond.dangerSigns,
      dangerSignsHausa: cond.dangerSignsHausa,
      severity: severityMap[cond.urgency],
      confidence: 0.95,
      matchedRuleId: cond.id,
      matchedSymptoms: [],
    };

    setResultSource('symptom');
    setResult(res);
    setShowManualModal(false);

    historyService.insert({
      type: 'health',
      createdAt: new Date().toISOString(),
      title: locale === 'ha' ? cond.conditionHausa : cond.condition,
      detail: `Manual Condition: ${locale === 'ha' ? cond.symptomsHausa : cond.symptoms}`,
      advice: `${locale === 'ha' ? res.actionHausa : res.action}`,
      confidence: 0.95,
    });

    onRecordSaved?.();
    showToast(locale === 'ha' ? 'An ɗora bayanin cutar!' : 'Loaded condition details!');
  };

  // ------------------------------------------------------------------
  // Read-aloud handlers
  // ------------------------------------------------------------------
  const handleSpeak = async () => {
    if (!result) return;
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const titleText = locale === 'ha' ? result.conditionHausa : result.condition;
    const actionText = locale === 'ha' ? result.actionHausa : result.action;
    const severityText = severityLabel(result.severity, locale);
    const textToSpeak = `${titleText}. ${severityText}. ${actionText}`;

    await voiceService.speak(textToSpeak, locale, (warning) => {
      showToast(warning);
    }, 'health');
    setIsSpeaking(false);
  };

  const [isSpeakingHealthHeader, setIsSpeakingHealthHeader] = useState(false);
  const [isSpeakingSymptomsText, setIsSpeakingSymptomsText] = useState(false);

  const handleSpeakHealthHeader = async () => {
    if (isSpeakingHealthHeader) {
      voiceService.stopSpeaking();
      setIsSpeakingHealthHeader(false);
      return;
    }
    setIsSpeakingHealthHeader(true);
    const textToSpeak =
      locale === 'ha'
        ? 'Lafiya. Binciken alamomin zazzabi, amai, cizon maciji da lafiyar iyali.'
        : 'Health. Check symptoms of fever, vomiting, snake bites, and family health.';
    await voiceService.speak(textToSpeak, locale);
    setIsSpeakingHealthHeader(false);
  };

  // Single read-aloud button for the text box (next to the label above the
  // box) — reads exactly what has been typed in the box. Falls back to the
  // selected symptom chips only when the box is empty.
  const handleSpeakSymptomsText = async () => {
    if (isSpeakingSymptomsText) {
      voiceService.stopSpeaking();
      setIsSpeakingSymptomsText(false);
      return;
    }
    voiceService.stopSpeaking();

    const typedText = symptomText.trim();
    if (typedText) {
      setIsSpeakingSymptomsText(true);
      await voiceService.speak(
        typedText,
        locale,
        (warning) => {
          showToast(warning);
        },
        'health'
      );
      setIsSpeakingSymptomsText(false);
      return;
    }

    setIsSpeakingSymptomsText(true);
    const allSymptomIds = [
      ...new Set([...selectedSymptomIds, ...autoSelectedSymptomIds]),
    ];
    const selectedLabels = allSymptomIds
      .map((id) => getSymptomById(id)?.label || id)
      .join(', ');
    const textToSpeak = selectedLabels
      ? (locale === 'ha'
          ? `Alamomin da ka zaɓa: ${selectedLabels}.`
          : `Selected symptoms: ${selectedLabels}.`)
      : (locale === 'ha'
          ? 'Babu abin da za a karanta — rubuta wani abu ko zaɓi alama.'
          : 'Nothing to read yet — type something or pick a symptom.');

    await voiceService.speak(textToSpeak, locale, (warning) => {
      showToast(warning);
    }, 'health');
    setIsSpeakingSymptomsText(false);
  };

  // ------------------------------------------------------------------
  // Multi-select symptom chip handler
  // ------------------------------------------------------------------
  const handleToggleSymptomChip = (symptomId: string) => {
    // Scenario B: selecting a chip clears any captured photo
    clearPhotoIfCaptured(
      locale === 'ha'
        ? 'An cire hoto — zaɓin alamomi ya karɓi gaba'
        : 'Photo removed — symptom selection takes over'
    );
    const isCurrentlySelected = selectedSymptomIds.includes(symptomId);
    if (isCurrentlySelected) {
      setSelectedSymptomIds(selectedSymptomIds.filter((id) => id !== symptomId));
    } else {
      setSelectedSymptomIds([...selectedSymptomIds, symptomId]);
    }

    // Speak the symptom aloud in the current language
    voiceService.stopSpeaking();
    const symptom = getSymptomById(symptomId);
    if (symptom) {
      voiceService.speak(locale === 'ha' ? symptom.labelHausa : symptom.label, locale, undefined, 'health');
    }
  };

  const isSymptomSelected = (symptomId: string) =>
    selectedSymptomIds.includes(symptomId) ||
    autoSelectedSymptomIds.includes(symptomId);

  // ------------------------------------------------------------------
  // Filtered manual conditions
  // ------------------------------------------------------------------
  const filteredConditions = MANUAL_HEALTH_CONDITIONS.filter((c) => {
    if (manualCategoryFilter === 'all') return true;
    return c.category === manualCategoryFilter;
  });

  // Clinical Assessment Result Card — hoisted so it can render in two spots:
  // directly under the "Bincika / Analyze" button for text/chips results
  // (above the chips), or directly under the photo section for photo results.
  const resultCard = result ? (
        <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm space-y-4 animate-scale-up">
          {/* Header with Title and Grandma Listen Button */}
          <div className="flex items-start justify-between gap-3 min-h-0">
            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider block">
                {t(locale, 'healthResult')}
              </span>
              <h3 className="font-extrabold text-lg sm:text-xl text-slate-800 leading-snug break-words">
                {locale === 'ha' ? result.conditionHausa : result.condition}
              </h3>
            </div>

            {/* Grandma-Friendly Read Aloud Button */}
            <button
              onClick={handleSpeak}
              className={`shrink-0 flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs ${isSpeaking ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-300'}`}
              title={t(locale, 'grandmaListen')}
            >
              <Volume2 className="w-4 h-4 text-red-700" />
              <span>{locale === 'ha' ? 'Saurara da Murya' : 'Listen Aloud'}</span>
            </button>
          </div>

          {/* Severity Badge (color-coded) */}
          <div className="p-3 rounded-xl space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider block">
              {t(locale, 'urgency')}
            </span>
            <div className={`font-extrabold text-xs sm:text-sm flex items-center gap-1.5 ${
              result.severity === 'Emergency'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : result.severity === 'Urgent'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {result.severity === 'Emergency' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : result.severity === 'Urgent' ? (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{severityLabel(result.severity, locale)}</span>
            </div>
          </div>

          {/* Matched Symptoms */}
          {result.matchedSymptoms.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                {locale === 'ha' ? 'Alamomin da suka dace:' : 'Matched Symptoms:'}
              </span>
              <div className="flex flex-wrap gap-1">
                {result.matchedSymptoms.map((s) => (
                  <span
                    key={s.id}
                    className="text-[11px] px-2 py-0.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium"
                  >
                    {locale === 'ha' ? s.labelHausa : s.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Medical Advice */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-red-600" />
              <span>{t(locale, 'firstAidHomeCare')}</span>
            </h4>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              {locale === 'ha' ? result.actionHausa : result.action}
            </div>
          </div>

          {/* First Aid */}
          {result.firstAid && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-red-600" />
                <span>{locale === 'ha' ? 'Taimakon Farko' : 'First Aid'}</span>
              </h4>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-900 leading-relaxed font-medium">
                {locale === 'ha' ? result.firstAidHausa : result.firstAid}
              </div>
            </div>
          )}

          {/* Danger Signs */}
          {result.dangerSigns && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{locale === 'ha' ? 'Alamomin Gaggawa' : 'Danger Signs'}</span>
              </h4>
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-900 leading-relaxed font-medium">
                {locale === 'ha' ? result.dangerSignsHausa : result.dangerSigns}
              </div>
            </div>
          )}

          {/* Medical Disclaimer Notice */}
          <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-tight">
            <span className="font-bold mr-1">{locale === 'ha' ? 'Hanyar:' : 'Disclaimer:'}</span>
            {t(locale, 'notMedical')}
          </div>

          {/* Action & Reset Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetHealth}
              className="w-full sm:flex-1 py-3 px-4 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4 text-red-200" />
              <span>{locale === 'ha' ? 'Duba Wata Alama' : 'Check Another Symptom'}</span>
            </button>

            <button
              type="button"
              onClick={handleCheckAgain}
              className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 border border-slate-300 transition-colors cursor-pointer"
            >
              <span>{locale === 'ha' ? 'Sake Dubawa' : 'Check Again'}</span>
            </button>
          </div>
        </div>
        ) : null;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#991b1b]">
              {t(locale, 'health')}
            </h1>
            <button
              type="button"
              onClick={handleSpeakHealthHeader}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${isSpeakingHealthHeader ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'}`}
              title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {locale === 'ha'
              ? 'Binciken alamomin zazzabi, amai, cizon maciji da lafiyar iyali'
              : 'Check symptoms of fever, vomiting, snake bites, and family health'}
          </p>
        </div>

        {/* Large Manual Selector Button & Reset Button */}
        <div className="flex items-center gap-2">
          {(selectedSymptomIds.length > 0 || photoUrl || result) && (
            <button
              type="button"
              onClick={handleResetHealth}
              className="flex items-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs shrink-0"
              title={locale === 'ha' ? 'Sake Farawa' : 'Start Over'}
            >
              <ResetIcon className="w-4 h-4 text-rose-700" />
              <span>{locale === 'ha' ? 'Sake Farawa' : 'Start Over'}</span>
            </button>
          )}

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs shrink-0"
          >
            <ListFilter className="w-4 h-4 text-red-700" />
            <span>{t(locale, 'manualHealthTitle')}</span>
          </button>
        </div>
      </div>

      {/* Symptom Selection Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              {t(locale, 'symptoms')}
            </label>
            <button
              type="button"
              onClick={handleSpeakSymptomsText}
              className={`p-1 rounded-lg border transition-all cursor-pointer active:scale-95 flex items-center justify-center ${isSpeakingSymptomsText ? 'bg-rose-600 text-white border-rose-700 animate-pulse' : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 shadow-2xs'}`}
              title={locale === 'ha' ? 'Karanta rubutun da ke cikin akwatin da murya' : 'Read aloud what is typed in the box'}
              aria-label={locale === 'ha' ? 'Karanta rubutun da ke cikin akwatin da murya' : 'Read aloud what is typed in the box'}
            >
              <Volume2 className={`w-3.5 h-3.5 ${isSpeakingSymptomsText ? 'animate-bounce text-white' : 'text-rose-700'}`} />
            </button>
          </div>
          {selectedSymptomIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                analysisRunRef.current++; // cancel analysis tied to these chips
                setSelectedSymptomIds([]);
                setResult(null);
                setBusy(false);
              }}
              className="text-xs text-rose-600 hover:text-rose-800 cursor-pointer font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{locale === 'ha' ? 'Share dukka' : 'Clear All'}</span>
            </button>
          )}
        </div>

        {/* Free-text symptom input with clear (Soke) button — reads typed text via the speaker above */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={symptomText}
              onChange={handleTextChange}
              placeholder={
                locale === 'ha'
                  ? 'Rubuta alamomi (misa: zazzabi, amai, taurin wuya)...'
                  : 'Type symptoms (e.g., fever, vomiting, stiff neck)...'
              }
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-2xs"
            />
            {/* Clear (Soke) — wipes the text and unselects auto-matched chips */}
            {(symptomText.trim().length > 0 || autoSelectedSymptomIds.length > 0) && (
              <button
                type="button"
                onClick={handleClearTypedText}
                className="p-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 flex items-center justify-center bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800 shadow-2xs"
                title={locale === 'ha' ? 'Soke rubutun (goge duka)' : 'Clear the text box'}
                aria-label={locale === 'ha' ? 'Soke rubutun' : 'Clear text'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Fallback warning when text has content but no keywords matched */}
          {symptomText.trim() && autoSelectedSymptomIds.length === 0 && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-tight">
              {locale === 'ha'
                ? 'Ba mu gane takamaiman alamun ba. Don Allah danna maɓallan alamun da ke sama.'
                : 'We could not automatically detect specific symptoms. Please tap the symptom buttons above for an accurate triage.'}
            </div>
          )}
        </div>

        {/* Analyze Button — top only, directly under the text box.
            Visible only when the user typed text or selected a symptom chip. */}
        {!result &&
          (symptomText.trim().length > 0 ||
            selectedSymptomIds.length > 0 ||
            autoSelectedSymptomIds.length > 0) && (
            <button
              onClick={handleAnalyze}
              disabled={busy}
              className="w-full py-3.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-red-200" />
              <span>{busy ? t(locale, 'analyzing') : t(locale, 'analyze')}</span>
            </button>
          )}

        {/* Text/chips triage result — directly under the Analyze button, above the chips */}
        {resultSource === 'symptom' && resultCard}

        {/* Symptom Chips Grid — multi-select */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 pt-1">
          {TRIAGE_SYMPTOMS.map((symptom) => {
            const selected = isSymptomSelected(symptom.id);
            const label = locale === 'ha' ? symptom.labelHausa : symptom.label;
            return (
              <button
                key={symptom.id}
                type="button"
                onClick={() => handleToggleSymptomChip(symptom.id)}
                aria-pressed={selected}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer flex flex-col items-center gap-1 ${selected ? 'bg-red-700 text-white border-red-700 font-bold shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50/60'}`}
              >
                <span className="text-xs font-bold">{selected ? '✓' : '○'}</span>
                <span className="leading-tight text-center">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full Screen Native Android Camera Modal */}
      <FullScreenCameraModal
        isOpen={isCameraActive}
        locale={locale}
        title={locale === 'ha' ? 'Kyamarar Duba Lafiya' : 'Health Screening Camera'}
        onCapture={handleCapturePhoto}
        onClose={handleCloseCamera}
      />

      {/* Optional Photo Section (Wound, rash, snakebite puncture).
          The Take Photo / Choose from Gallery buttons stay visible; a freshly
          loaded photo appears in a dashed-border box directly underneath them,
          with a "Bincika / Analyze" button right under the image. */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-red-200 p-3.5 flex flex-col items-center min-h-[140px] relative overflow-hidden">
        <div className="text-center p-2 space-y-2 w-full">
          <ShieldAlert className="w-6 h-6 text-red-600 opacity-80 mx-auto" />
          <p className="text-slate-700 font-bold text-xs">
            {locale === 'ha' ? 'Hoton matsalar fata ko cizon maciji (Idan akwai)' : 'Optional photo for rash, bite, or visible wound'}
          </p>
          <div className="space-y-2 pt-1 max-w-xs mx-auto w-full">
            <button
              type="button"
              onClick={handleOpenCamera}
              className="w-full py-3 px-4 bg-red-700 hover:bg-red-800 text-white rounded-2xl font-black text-xs sm:text-sm cursor-pointer shadow-sm flex items-center justify-center space-x-2 active:scale-[0.99] transition-all"
            >
              <Camera className="w-4 h-4 text-red-200" />
              <span>
                {locale === 'ha' ? 'Ɗauki Hoto' : 'Take Photo'}
              </span>
            </button>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleGallery}
                className="inline-flex items-center space-x-1.5 py-1 px-3 text-xs font-bold text-red-800 hover:text-red-950 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-red-600" />
                <span>{locale === 'ha' ? 'Zaɓi daga Gallery' : 'Choose from Gallery'}</span>
              </button>
            </div>
          </div>

          {/* Photo Preview — dashed-border box directly under the buttons */}
          {photoUrl && (
            <div className="mt-3 w-full max-w-sm mx-auto border-2 border-dashed border-red-300 rounded-2xl p-3 bg-red-50/40 flex flex-col items-center gap-2 animate-scale-up">
              <img
                src={photoUrl}
                alt={locale === 'ha' ? 'Hoton da aka ɗauka' : 'Health observation photo'}
                className="max-h-48 rounded-xl object-contain shadow-xs border border-red-100 bg-white"
              />
              {/* Bincika / Analyze — directly under the image. The photo is
                  analyzed only when the user taps this button. */}
              {!result && (
                <button
                  type="button"
                  onClick={handleAnalyzePhoto}
                  disabled={busy}
                  className="w-full py-3 px-4 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-red-200" />
                  <span>{busy ? t(locale, 'analyzing') : t(locale, 'analyze')}</span>
                </button>
              )}
              <button
                onClick={() => {
                  analysisRunRef.current++; // invalidate any pending photo analysis
                  voiceService.stopSpeaking();
                  setPhoto(null);
                  setPhotoUrl(null);
                  setResult(null);
                  setBusy(false);
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium underline cursor-pointer"
              >
                {locale === 'ha' ? 'Cire hoto' : 'Remove photo'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photo-triggered triage result — directly under the photo section */}
      {resultSource === 'photo' && resultCard}

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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-colors cursor-pointer border ${manualCategoryFilter === cat ? 'bg-red-800 text-white border-red-800 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
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
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isEmergency ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}
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
