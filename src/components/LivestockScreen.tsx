import React, { useState } from 'react';
import {
  AlertTriangle,
  Volume2,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  Mic,
  MicOff,
  Music,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import {
  LIVESTOCK_ANIMALS,
  LivestockAnimal,
  livestockService,
  LivestockCheckResult,
} from '../services/livestockService';
import { voiceService } from '../services/voiceService';
import { historyService } from '../services/historyService';

interface LivestockScreenProps {
  locale: Language;
  onRecordSaved?: () => void;
}

export const LivestockScreen: React.FC<LivestockScreenProps> = ({
  locale,
  onRecordSaved,
}) => {
  const [selectedAnimal, setSelectedAnimal] = useState<LivestockAnimal>(LIVESTOCK_ANIMALS[0]);
  const [checkedSymptoms, setCheckedSymptoms] = useState<string[]>([]);
  const [result, setResult] = useState<LivestockCheckResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [playingAnimalId, setPlayingAnimalId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleSymptom = (sym: string) => {
    if (checkedSymptoms.includes(sym)) {
      setCheckedSymptoms(checkedSymptoms.filter((s) => s !== sym));
    } else {
      setCheckedSymptoms([...checkedSymptoms, sym]);
    }
  };

  const handleSelectAnimal = (animal: LivestockAnimal) => {
    setSelectedAnimal(animal);
    setCheckedSymptoms([]);
    setResult(null);
  };

  const handlePlayAnimalSound = async (animal: LivestockAnimal, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPlayingAnimalId(animal.id);
    try {
      await voiceService.playAnimalSound(animal.id);
    } catch (err) {
      console.warn('Audio playback error:', err);
    } finally {
      setPlayingAnimalId(null);
    }
  };

  const handleDiagnose = () => {
    if (checkedSymptoms.length === 0) {
      showToast(
        locale === 'ha'
          ? 'Da fatan zaɓi aƙalla alama ɗaya daga jikin dabbar.'
          : 'Please select at least one symptom observed.'
      );
      return;
    }

    const diag = livestockService.diagnose(selectedAnimal.id, checkedSymptoms);
    if (diag) {
      setResult(diag);

      // Save to history
      const title = `${selectedAnimal.emoji} ${diag.likelyDisease.name} (${diag.likelyDisease.hausa_name})`;
      historyService.insert({
        type: 'livestock',
        createdAt: new Date().toISOString(),
        title,
        detail: `Symptoms: ${checkedSymptoms.join(', ')}`,
        advice: locale === 'ha' ? diag.likelyDisease.treatment_hausa : diag.likelyDisease.treatment,
        confidence: diag.confidence,
      });

      onRecordSaved?.();
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
    const dis = result.likelyDisease;
    const diseaseName = locale === 'ha' ? dis.hausa_name : dis.name;
    const treatmentText = locale === 'ha' ? dis.treatment_hausa : dis.treatment;
    const preventionText = locale === 'ha' ? dis.prevention_hausa : dis.prevention;
    const textToSpeak = `${diseaseName}. ${treatmentText}. ${preventionText}`;

    try {
      await voiceService.speak(textToSpeak, locale, (warning) => {
        showToast(warning);
      });
    } catch (err) {
      console.warn('TTS speak error:', err);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleVoiceListen = async () => {
    if (isListening) {
      await voiceService.stopListening();
      setIsListening(false);
      return;
    }

    try {
      const started = await voiceService.startListening(
        locale,
        (text) => {
          showToast(`Heard: "${text}"`);
          const lower = text.toLowerCase();
          for (const a of LIVESTOCK_ANIMALS) {
            if (
              lower.includes(a.name.toLowerCase()) ||
              lower.includes(a.hausa_name.toLowerCase())
            ) {
              handleSelectAnimal(a);
              break;
            }
          }
        },
        (err) => {
          showToast(err);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        },
        {
          type: 'livestock',
          animalId: selectedAnimal.id,
          label: selectedAnimal.name,
        }
      );

      if (started) {
        setIsListening(true);
      }
    } catch (err) {
      console.warn('Voice listen error caught:', err);
      setIsListening(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#173326] flex items-center gap-2">
            <span>🐔</span>
            <span>{t(locale, 'checkLivestock')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t(locale, 'livestockSubtitle')}</p>
        </div>

        {/* Voice Note Button */}
        <button
          onClick={handleVoiceListen}
          className={`p-2.5 rounded-xl transition-all cursor-pointer ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
          }`}
          title="Voice Input"
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>

      {/* Animal Selection Grid (9 Animals) with Individual Sound Buttons */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            {t(locale, 'selectAnimalPrompt')}
          </label>
          <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <Music className="w-3 h-3 text-emerald-600" />
            <span>{locale === 'ha' ? 'Sautin dabbobi 9' : '9 Animal Sounds'}</span>
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {LIVESTOCK_ANIMALS.map((animal) => {
            const isSelected = selectedAnimal.id === animal.id;
            const isPlayingThis = playingAnimalId === animal.id;

            return (
              <div
                key={animal.id}
                onClick={() => handleSelectAnimal(animal)}
                className={`flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="text-2xl mb-1">{animal.emoji}</span>
                <span className="text-xs font-bold text-center leading-tight mb-1">
                  {locale === 'ha' ? animal.hausa_name : animal.name}
                </span>

                {/* Individual Sound Button for every animal */}
                <button
                  type="button"
                  onClick={(e) => handlePlayAnimalSound(animal, e)}
                  className={`mt-1 flex items-center justify-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-800 hover:bg-emerald-900 text-emerald-100 border border-emerald-600'
                      : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200'
                  } ${isPlayingThis ? 'animate-pulse ring-2 ring-emerald-400' : ''}`}
                  title={locale === 'ha' ? `Saurari kukan ${animal.hausa_name}` : `Play ${animal.name} sound`}
                >
                  <Volume2 className="w-3 h-3 text-emerald-600" />
                  <span>{isPlayingThis ? '...' : (locale === 'ha' ? 'Kuka' : 'Sound')}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Selected Animal Audio Banner */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">{selectedAnimal.emoji}</span>
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                {locale === 'ha' ? 'Dabbar da aka zaɓa' : 'Selected Animal'}
              </span>
              <span className="font-extrabold text-sm text-slate-800">
                {locale === 'ha' ? selectedAnimal.hausa_name : selectedAnimal.name}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handlePlayAnimalSound(selectedAnimal)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-200" />
            <span>
              {locale === 'ha'
                ? `Saurari Kukan ${selectedAnimal.hausa_name}`
                : `Play ${selectedAnimal.name} Sound`}
            </span>
          </button>
        </div>
      </div>

      {/* Symptoms Checklist */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {t(locale, 'symptomsChecklist')}
          </label>
          {checkedSymptoms.length > 0 && (
            <button
              onClick={() => setCheckedSymptoms([])}
              className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{locale === 'ha' ? 'Share zaɓi' : 'Reset'}</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {selectedAnimal.commonSymptoms.map((sym, index) => {
            const isChecked = checkedSymptoms.includes(sym);
            const symHausa = selectedAnimal.commonSymptomsHausa[index] || sym;
            const displayText = locale === 'ha' ? symHausa : sym;

            return (
              <div
                key={index}
                onClick={() => handleToggleSymptom(sym)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  isChecked
                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-900 font-semibold'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      isChecked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span className="text-xs sm:text-sm">{displayText}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Diagnose Button */}
        <button
          onClick={handleDiagnose}
          className="w-full py-3.5 mt-2 rounded-xl bg-[#1f7a4c] hover:bg-[#19653e] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t(locale, 'diagnoseAnimal')}</span>
        </button>
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {t(locale, 'diagnosis')}
              </span>
              <h3 className="font-extrabold text-lg sm:text-xl text-slate-800 mt-1 flex items-center gap-1.5">
                <span>{selectedAnimal.emoji}</span>
                <span>
                  {locale === 'ha'
                    ? result.likelyDisease.hausa_name
                    : result.likelyDisease.name}
                </span>
              </h3>
            </div>

            {/* Read Aloud Button */}
            <button
              onClick={handleSpeak}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer shadow-xs"
              title={t(locale, 'speakResult')}
            >
              <Volume2
                className={`w-5 h-5 ${isSpeaking ? 'text-emerald-700 animate-bounce' : ''}`}
              />
            </button>
          </div>

          {/* Contagious Alert Banner */}
          {result.likelyDisease.isUrgentContagious && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs sm:text-sm flex items-start space-x-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{t(locale, 'quarantineWarning')}</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  {locale === 'ha'
                    ? 'Kada a bari sauran dabbobi su sha ruwa a kwano ɗaya ko su kwanta a garke guda.'
                    : 'Prevent shared feeding troughs or drinking pools until full recovery.'}
                </p>
              </div>
            </div>
          )}

          {/* Causes */}
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-500 uppercase">
              {t(locale, 'causes')}
            </h4>
            <p className="text-xs sm:text-sm text-slate-700">
              {locale === 'ha' ? result.likelyDisease.causes_hausa : result.likelyDisease.causes}
            </p>
          </div>

          {/* Treatment */}
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-emerald-700 uppercase">
              {t(locale, 'treatment')}
            </h4>
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-950 leading-relaxed font-medium">
              {locale === 'ha'
                ? result.likelyDisease.treatment_hausa
                : result.likelyDisease.treatment}
            </div>
          </div>

          {/* Prevention */}
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-500 uppercase">
              {t(locale, 'preventionTips')}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {locale === 'ha'
                ? result.likelyDisease.prevention_hausa
                : result.likelyDisease.prevention}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
