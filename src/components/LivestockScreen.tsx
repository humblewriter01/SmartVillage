import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Volume2,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  Music,
  Info,
  ChevronRight,
  Bell,
  BellOff,
  BellRing,
  Calendar,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import {
  LIVESTOCK_ANIMALS,
  LivestockAnimal,
  livestockService,
  LivestockCheckResult,
  DifferentialMatch,
} from '../services/livestockService';
import { voiceService } from '../services/voiceService';
import { historyService } from '../services/historyService';
import { reminderService, StoredReminder, getNotificationIdForKey } from '../services/reminderService';

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
  const [playingAnimalId, setPlayingAnimalId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Record<string, StoredReminder>>({});

  useEffect(() => {
    reminderService.getStoredReminders().then(setReminders);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleVaccineReminder = async (
    v: { id: string; nameEn: string; nameHa: string; intervalDays: number }
  ) => {
    const key = `livestock-${selectedAnimal.id}-${getNotificationIdForKey(v.nameEn)}`;
    if (reminders[key]) {
      await reminderService.cancelLivestockReminder(key);
      setReminders((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      showToast(
        locale === 'ha'
          ? `An soke tunatarwar ${v.nameHa}.`
          : `Cancelled reminder for ${v.nameEn}.`
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

    await reminderService.scheduleLivestockVaccination(
      selectedAnimal.id,
      selectedAnimal.name,
      selectedAnimal.hausa_name,
      v.nameEn,
      v.nameHa,
      v.intervalDays
    );

    const updated = await reminderService.getStoredReminders();
    setReminders(updated);
    showToast(
      locale === 'ha'
        ? `An saita tunatarwar ${v.nameHa} (bayan kwanaki ${v.intervalDays})!`
        : `Vaccination reminder scheduled for ${v.nameEn} (in ${v.intervalDays} days)!`
    );
  };

  // Live Text-to-Speech on symptom tap (single-selection radio button behavior)
  const handleToggleSymptom = (sym: string, symHausa?: string) => {
    if (checkedSymptoms.includes(sym)) {
      setCheckedSymptoms([]);
    } else {
      setCheckedSymptoms([sym]);
    }

    // Immediately speak the tapped symptom aloud in the selected language
    // Stop any previous speech so rapid taps don't overlap
    voiceService.stopSpeaking();
    const textToSpeak = locale === 'ha' ? (symHausa || sym) : sym;
    voiceService.speak(textToSpeak, locale, undefined, 'livestock');
  };

  const [isSpeakingLivestockHeader, setIsSpeakingLivestockHeader] = useState(false);
  const [speakingAnimalCardId, setSpeakingAnimalCardId] = useState<string | null>(null);

  const handleSpeakLivestockHeader = async () => {
    if (isSpeakingLivestockHeader) {
      voiceService.stopSpeaking();
      setIsSpeakingLivestockHeader(false);
      return;
    }
    setIsSpeakingLivestockHeader(true);
    const textToSpeak =
      locale === 'ha'
        ? 'Likitancin Dabbobi da Kaji. Duba kaji, awaki, tumaki, shanu, jakuna, da rakuma.'
        : 'Livestock and Poultry Care. Check chickens, goats, sheep, cattle, donkeys, and camels.';
    await voiceService.speak(textToSpeak, locale);
    setIsSpeakingLivestockHeader(false);
  };

  const handleSpeakAnimalCard = async (animal: LivestockAnimal, e: React.MouseEvent) => {
    e.stopPropagation();
    if (speakingAnimalCardId === animal.id) {
      voiceService.stopSpeaking();
      setSpeakingAnimalCardId(null);
      return;
    }
    setSpeakingAnimalCardId(animal.id);
    const textToSpeak =
      locale === 'ha'
        ? `${animal.hausa_name} (${animal.name}). Likitancin dabbobi.`
        : `${animal.name} (${animal.hausa_name}). Livestock health and care.`;
    await voiceService.speak(textToSpeak, locale);
    setSpeakingAnimalCardId(null);
  };

  const handleSelectAnimal = (animal: LivestockAnimal) => {
    setSelectedAnimal(animal);
    setCheckedSymptoms([]);
    setResult(null);
  };

  const handleResetCheck = () => {
    voiceService.stopSpeaking();
    setIsSpeaking(false);
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

      // Save to history ONLY if a valid disease match was determined
      if (diag.hasMatch && diag.likelyDisease) {
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
    }
  };

  const handleSelectAlternativeDisease = (diff: DifferentialMatch) => {
    if (!result) return;
    setResult({
      ...result,
      likelyDisease: diff.disease,
      confidence: diff.score / 100,
      matchedSymptoms: diff.matchedSymptoms,
    });
  };

  const handleSpeak = async () => {
    if (!result) return;
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    let textToSpeak = '';

    if (!result.hasMatch || !result.likelyDisease) {
      textToSpeak = locale === 'ha'
        ? (result.noMatchMessageHa || 'Ba a sami cutar da ta dace ba. Don Allah zaɓi ƙarin alamomi ko tuntuɓi likitan dabbobi.')
        : (result.noMatchMessageEn || 'No matching disease found. Please select more symptoms or consult a local vet.');
    } else {
      const dis = result.likelyDisease;
      const diseaseName = locale === 'ha' ? dis.hausa_name : dis.name;
      const matchPercent = Math.round(result.confidence * 100);
      const treatmentText = locale === 'ha' ? dis.treatment_hausa : dis.treatment;
      const preventionText = locale === 'ha' ? dis.prevention_hausa : dis.prevention;
      textToSpeak = locale === 'ha'
        ? `${diseaseName}. Daidaito kashi ${matchPercent}. ${treatmentText}. ${preventionText}`
        : `${diseaseName}. ${matchPercent}% match. ${treatmentText}. ${preventionText}`;
    }

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

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header - Mic Button completely removed per Part 7 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#173326] flex items-center gap-2">
            <button
              type="button"
              onClick={handleSpeakLivestockHeader}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isSpeakingLivestockHeader
                  ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
              }`}
              title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
            >
              <Volume2 className="w-5 h-5 text-emerald-700" />
            </button>
            <span>{locale === 'ha' ? 'Likitancin Dabbobi da Kaji' : 'Livestock and Poultry Care'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {locale === 'ha'
              ? 'Duba kaji, awaki, tumaki, shanu, jakuna, da rakuma'
              : 'Check chickens, goats, sheep, cattle, donkeys, and camels'}
          </p>
        </div>
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

        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5">
          {LIVESTOCK_ANIMALS.map((animal) => {
            const isSelected = selectedAnimal.id === animal.id;
            const isPlayingThis = playingAnimalId === animal.id;
            const isSpeakingThisCard = speakingAnimalCardId === animal.id;

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
                <span className="text-xs font-bold text-center leading-tight mb-1 truncate w-full">
                  {locale === 'ha' ? animal.hausa_name : animal.name}
                </span>

                {/* Individual Action Buttons: Sound + Read Aloud */}
                <div className="mt-1 flex items-center gap-1 w-full justify-center">
                  <button
                    type="button"
                    onClick={(e) => handlePlayAnimalSound(animal, e)}
                    className={`flex items-center justify-center space-x-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-800 hover:bg-emerald-900 text-emerald-100 border border-emerald-600'
                        : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200'
                    } ${isPlayingThis ? 'animate-pulse ring-2 ring-emerald-400' : ''}`}
                    title={locale === 'ha' ? `Saurari kukan ${animal.hausa_name}` : `Play ${animal.name} sound`}
                  >
                    <Music className="w-2.5 h-2.5" />
                    <span>{isPlayingThis ? '...' : (locale === 'ha' ? 'Kuka' : 'Sound')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSpeakAnimalCard(animal, e)}
                    className={`p-1 rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-800 hover:bg-emerald-900 text-emerald-100 border border-emerald-600'
                        : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200'
                    } ${isSpeakingThisCard ? 'animate-pulse ring-2 ring-emerald-400' : ''}`}
                    title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
                  >
                    <Volume2 className="w-2.5 h-2.5" />
                  </button>
                </div>
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

      {/* Vaccination & Routine Prevention Reminders */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BellRing className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {locale === 'ha'
                ? `Rigakafi da Jadawalin Alluran ${selectedAnimal.hausa_name}`
                : `Vaccination & Prevention for ${selectedAnimal.name}`}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
            {locale === 'ha' ? 'Tunatarwar Waya' : 'Local Reminders'}
          </span>
        </div>

        <div className="space-y-2.5">
          {((selectedAnimal.id === 'kaza'
            ? [
                {
                  id: 'newcastle',
                  nameEn: 'Newcastle Disease Vaccine (LaSota / I-2)',
                  nameHa: 'Allurar Cutar Ɗangana (Newcastle)',
                  intervalDays: 90,
                  descEn: 'Routine vaccination every 3 months protects flock from sudden paralysis and high mortality.',
                  descHa: 'Allurar kowane wata 3 domin kiyaye kaji daga cutar ɗangana mai kisa ba zato.',
                },
                {
                  id: 'deworm_poultry',
                  nameEn: 'Flock Deworming & Vitamin Booster',
                  nameHa: 'Maganin Tsutsar Ciki da Sinadarin Ƙarfi',
                  intervalDays: 60,
                  descEn: 'Water-soluble dewormer every 60 days to boost egg production and weight gain.',
                  descHa: 'Ba da maganin tsutsar ciki a cikin ruwan sha kowane kwanaki 60.',
                },
              ]
            : selectedAnimal.id === 'akuya'
            ? [
                {
                  id: 'ppr_goat',
                  nameEn: 'PPR Vaccine (Peste des Petits Ruminants)',
                  nameHa: 'Allurar Rigakafin Ciwon Huhu da Zawayi (PPR)',
                  intervalDays: 180,
                  descEn: 'Bi-annual protective vaccination against viral pneumonia and diarrhea in goats.',
                  descHa: 'Kariyar watanni 6 daga ciwon huhu da gudawa mai kashe awaki.',
                },
                {
                  id: 'deworm_goat',
                  nameEn: 'Quarterly Deworming (Albendazole)',
                  nameHa: 'Maganin Tsutsa na Awaki',
                  intervalDays: 90,
                  descEn: 'Parasite control every 90 days to prevent bottle jaw and severe anemia.',
                  descHa: 'Shafe tsutsar ciki kowane wata 3 don hana kumburin haba da rashin jini.',
                },
              ]
            : selectedAnimal.id === 'tunkiya'
            ? [
                {
                  id: 'ppr_sheep',
                  nameEn: 'PPR & Sheep Pox Vaccine',
                  nameHa: 'Allurar PPR da Cutar Ƙyandar Tumaki',
                  intervalDays: 180,
                  descEn: 'Protects flock against respiratory distress and fever lesions.',
                  descHa: 'Kariya daga ciwon numfashi da zazzabin tumaki.',
                },
                {
                  id: 'deworm_sheep',
                  nameEn: 'Fluke & Worm Drenching',
                  nameHa: 'Maganin Tsutsar Hanta da Ciki',
                  intervalDays: 90,
                  descEn: 'Essential every 3 months, especially after grazing in low-lying fadama plains.',
                  descHa: 'Maganin tsutsa a kowanne wata 3 musamman a wuraren kiwon fadama.',
                },
              ]
            : selectedAnimal.id === 'saniya'
            ? [
                {
                  id: 'cbpp_cattle',
                  nameEn: 'CBPP & Blackleg Cattle Vaccine',
                  nameHa: 'Allurar Cutar Huhu (CBPP) da Harba na Shanu',
                  intervalDays: 180,
                  descEn: 'Herd vaccination twice yearly before rainy season grazing migration.',
                  descHa: 'Yi wa garken shanu allura sau biyu a shekara kafin damina.',
                },
                {
                  id: 'deworm_cattle',
                  nameEn: 'Herd Deworming & Trypanosomiasis Check',
                  nameHa: 'Maganin Tsutsa da Kariya daga Cutar Sammore',
                  intervalDays: 90,
                  descEn: 'Routine deworming every 3 months for optimal milk yield and draft power.',
                  descHa: 'Bada maganin tsutsa kowane wata 3 don samun ƙarin madara da ƙarfin noma.',
                },
              ]
            : [
                {
                  id: `routine_deworm_${selectedAnimal.id}`,
                  nameEn: `Routine Deworming (${selectedAnimal.name})`,
                  nameHa: `Maganin Tsutsar Ciki na ${selectedAnimal.hausa_name}`,
                  intervalDays: 90,
                  descEn: `Every 90 days internal parasite drenching keeps ${selectedAnimal.name} healthy and resilient.`,
                  descHa: `Maganin tsutsa kowane wata 3 domin kiyaye lafiyar ${selectedAnimal.hausa_name}.`,
                },
                {
                  id: `vitamin_booster_${selectedAnimal.id}`,
                  nameEn: `Seasonal Vitamin & Mineral Booster`,
                  nameHa: `Sinadaran Ƙarfi da Lafiyar Jiki`,
                  intervalDays: 60,
                  descEn: `Multivitamin booster protects against dry and harmattan season stress.`,
                  descHa: `Sinadaran ƙarin ƙarfi kafin lokacin sanyin harmattan ko rani.`,
                },
              ])
          ).map((v) => {
            const key = `livestock-${selectedAnimal.id}-${getNotificationIdForKey(v.nameEn)}`;
            const isReminderSet = Boolean(reminders[key]);

            return (
              <div
                key={v.id}
                className="p-3 bg-slate-50 hover:bg-emerald-50/40 rounded-xl border border-slate-200 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">
                      {locale === 'ha' ? v.nameHa : v.nameEn}
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">
                      {locale === 'ha' ? `Kowane kwanaki ${v.intervalDays}` : `Every ${v.intervalDays} days`}
                    </span>
                  </div>

                  {isReminderSet ? (
                    <button
                      type="button"
                      onClick={() => handleToggleVaccineReminder(v)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 shrink-0"
                    >
                      <BellOff className="w-3 h-3 text-amber-700" />
                      <span>{locale === 'ha' ? 'Soke' : 'Cancel'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleVaccineReminder(v)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 shrink-0"
                    >
                      <Bell className="w-3 h-3 text-emerald-200" />
                      <span>{locale === 'ha' ? 'Saita Tunatarwa' : 'Set Reminder'}</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {locale === 'ha' ? v.descHa : v.descEn}
                </p>

                {isReminderSet && (
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-1 rounded-md">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>
                      {locale === 'ha'
                        ? `An saita faɗakarwa: Za a sanar da kai a kan waya lokacin allurar ${v.nameHa}.`
                        : `Reminder scheduled: You will be alerted when ${v.nameEn} is due.`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
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
                onClick={() => handleToggleSymptom(sym, symHausa)}
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

      {/* Result Card: Case 1 - No Match Found */}
      {result && !result.hasMatch && (
        <div className="bg-white rounded-2xl p-5 border-2 border-amber-300 shadow-sm space-y-4 animate-fade-in text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-800">
                {t(locale, 'noMatchingDiseaseTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {locale === 'ha' ? result.noMatchMessageHa : result.noMatchMessageEn}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetCheck}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t(locale, 'checkAnotherAnimal')}</span>
            </button>

            <button
              type="button"
              onClick={handleResetCheck}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-[0.99]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t(locale, 'checkAgain')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Result Card: Case 2 - Diagnosed with Match */}
      {result && result.hasMatch && result.likelyDisease && (
        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {t(locale, 'diagnosis')}
                </span>

                {/* Confidence Badge */}
                {(() => {
                  const score = Math.round(result.confidence * 100);
                  const isStrong = score >= 80;
                  const isModerate = score >= 50 && score < 80;
                  const badgeClass = isStrong
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isModerate
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-orange-100 text-orange-800 border-orange-300';
                  const label = isStrong
                    ? t(locale, 'strongMatch')
                    : isModerate
                    ? t(locale, 'moderateMatch')
                    : t(locale, 'weakMatch');

                  return (
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${badgeClass}`}>
                      <span>{score}%</span>
                      <span>·</span>
                      <span>{label}</span>
                    </span>
                  );
                })()}
              </div>

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
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer shadow-xs shrink-0"
              title={t(locale, 'speakResult')}
            >
              <Volume2
                className={`w-5 h-5 ${isSpeaking ? 'text-emerald-700 animate-bounce' : ''}`}
              />
            </button>
          </div>

          {/* Weak Match Caution */}
          {Math.round(result.confidence * 100) < 50 && (
            <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-orange-900 text-xs flex items-center space-x-2">
              <Info className="w-4 h-4 text-orange-600 shrink-0" />
              <span>{t(locale, 'consultVetNotice')}</span>
            </div>
          )}

          {/* Matched Symptoms Breakdown */}
          {result.matchedSymptoms && result.matchedSymptoms.length > 0 && (
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                {t(locale, 'matchedSymptomsLabel')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {result.matchedSymptoms.map((sym, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>{sym}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

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

          {/* Differential Diagnoses (Top 2-3) */}
          {result.differentials && result.differentials.length > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2.5">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t(locale, 'differentialDiagnosesTitle')}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {t(locale, 'differentialDiagnosesSubtitle')}
                </p>
              </div>

              <div className="space-y-2">
                {result.differentials.map((diff, idx) => {
                  const isCurrent = diff.disease.id === result.likelyDisease?.id;
                  const isStrong = diff.score >= 80;
                  const isModerate = diff.score >= 50 && diff.score < 80;
                  const badgeClass = isStrong
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isModerate
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-orange-100 text-orange-800 border-orange-300';
                  const label = isStrong
                    ? t(locale, 'strongMatch')
                    : isModerate
                    ? t(locale, 'moderateMatch')
                    : t(locale, 'weakMatch');

                  return (
                    <div
                      key={diff.disease.id}
                      onClick={() => !isCurrent && handleSelectAlternativeDisease(diff)}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-emerald-50/60 border-emerald-400 ring-1 ring-emerald-300'
                          : 'bg-slate-50 hover:bg-emerald-50/40 border-slate-200 cursor-pointer'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-extrabold text-slate-800 truncate">
                            {idx + 1}. {locale === 'ha' ? diff.disease.hausa_name : diff.disease.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-sm">
                              {locale === 'ha' ? 'Wanda aka duba' : 'Active'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {diff.matchedSymptoms.length} {locale === 'ha' ? 'alamomin da suka dace' : 'matching symptoms'}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                          {diff.score}% · {label}
                        </span>
                        {!isCurrent && (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Reset Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetCheck}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t(locale, 'checkAnotherAnimal')}</span>
            </button>

            <button
              type="button"
              onClick={handleResetCheck}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-[0.99]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t(locale, 'checkAgain')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
