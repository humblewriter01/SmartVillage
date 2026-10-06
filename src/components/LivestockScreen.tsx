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
  X,
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

export interface LivestockScheduleItem {
  id: string;
  nameEn: string;
  nameHa: string;
  intervalDays: number;
  descEn: string;
  descHa: string;
}

export const LIVESTOCK_VACCINATION_SCHEDULES: Record<string, LivestockScheduleItem[]> = {
  chicken: [
    {
      id: 'newcastle_chicken',
      nameEn: 'Newcastle Disease Vaccine (LaSota / I-2)',
      nameHa: 'Allurar Cutar Samore / Bakon Kaza (LaSota)',
      intervalDays: 90,
      descEn: 'Routine vaccination every 3 months protects flock from sudden paralysis and high mortality.',
      descHa: 'Allura ko maganin ruwa na kowane wata 3 domin kariya daga samore mai kisa da lankwasa wuya.',
    },
    {
      id: 'gumboro_fowlpox_chicken',
      nameEn: 'Gumboro (IBD) & Fowl Pox Prevention',
      nameHa: 'Kariya daga Cutar Gumboro da Ƙyandar Kaji',
      intervalDays: 120,
      descEn: 'Periodic booster for infectious bursal disease and pox protection in backyard poultry.',
      descHa: 'Rigakafin cutar gumboro da ƙyandar kaji don kiyaye garkuwar jikinsu.',
    },
    {
      id: 'deworm_chicken',
      nameEn: 'Flock Deworming (Piperazine / Levamisole)',
      nameHa: 'Maganin Tsutsar Ciki na Kaji',
      intervalDays: 60,
      descEn: 'Water-soluble dewormer every 60 days to boost egg production and weight gain.',
      descHa: 'Ba da maganin tsutsar ciki a cikin ruwan sha kowane kwanaki 60 don inganta ƙwai da ƙiba.',
    },
  ],
  goat: [
    {
      id: 'ppr_goat',
      nameEn: 'PPR Vaccine (Peste des Petits Ruminants)',
      nameHa: 'Allurar Rigakafin Ciwon Huhu da Zawayi (PPR)',
      intervalDays: 365,
      descEn: 'Annual protective vaccination against viral pneumonia and severe diarrhea in goats.',
      descHa: 'Allurar shekara-shekara domin kare awaki daga zazzabi, gyambon baki da zawayi mai kisa.',
    },
    {
      id: 'deworm_goat',
      nameEn: 'Quarterly Deworming (Albendazole / Ivermectin)',
      nameHa: 'Maganin Tsutsa na Awaki',
      intervalDays: 90,
      descEn: 'Parasite control every 90 days to prevent bottle jaw (edema) and severe anemia.',
      descHa: 'Shafe tsutsar ciki kowane wata 3 don magance kumburin haba da rashin jini.',
    },
    {
      id: 'enterotoxemia_ccpp_goat',
      nameEn: 'Enterotoxemia & CCPP Booster',
      nameHa: 'Allurar Ciwon Hanji da Ciwon Huhu (CCPP)',
      intervalDays: 180,
      descEn: 'Semi-annual booster against bacterial enterotoxemia and contagious pleuropneumonia.',
      descHa: 'Allurar watanni 6 don kariya daga ciwon hanji na kwatsam da ciwon huhun awaki.',
    },
  ],
  sheep: [
    {
      id: 'ppr_sheeppox_sheep',
      nameEn: 'PPR & Sheep Pox Vaccine',
      nameHa: 'Allurar Rigakafin PPR da Ƙyandar Tumaki',
      intervalDays: 365,
      descEn: 'Annual protective vaccination against respiratory pneumonia and pox lesions.',
      descHa: 'Allurar kowace shekara don kariya daga ciwon huhu da ƙurajen ƙyandar tumaki.',
    },
    {
      id: 'deworm_sheep',
      nameEn: 'Liver Fluke & Roundworm Drenching',
      nameHa: 'Maganin Tsutsar Hanta da Ciki',
      intervalDays: 90,
      descEn: 'Essential every 3 months, especially when grazing near damp fadama floodplains.',
      descHa: 'Maganin tsutsa a kowanne wata 3 musamman a wuraren kiwon fadama masu laima.',
    },
    {
      id: 'anthrax_sheep',
      nameEn: 'Anthrax & Clostridial Booster',
      nameHa: 'Allurar Rigakafin Cutar Dankanau (Anthrax)',
      intervalDays: 365,
      descEn: 'Mandatory annual spore vaccine to protect sheep from sudden fatal anthrax infection.',
      descHa: 'Allurar shekara-shekara kafin damina don kariya daga cutar dankanau mai saurin kisa.',
    },
  ],
  cattle: [
    {
      id: 'cbpp_cattle',
      nameEn: 'CBPP Vaccine (Contagious Bovine Pleuropneumonia)',
      nameHa: 'Allurar Cutar Huhu ta Shanu (CBPP)',
      intervalDays: 365,
      descEn: 'Annual herd vaccination against contagious bovine pleuropneumonia before migration.',
      descHa: 'Allurar kowace shekara domin kare garken shanu daga ciwon huhu kafin damina.',
    },
    {
      id: 'blackleg_hs_cattle',
      nameEn: 'Blackleg & Hemorrhagic Septicemia (HS)',
      nameHa: 'Allurar Cutar Harba da Ƙirji (Blackleg / HS)',
      intervalDays: 180,
      descEn: 'Protects young and grazing cattle from sudden fatal muscle and throat swelling.',
      descHa: 'Allurar kariya daga kumburin cinyoyi da ƙirji mai saurin kashe shanu cikin sa\'o\'i.',
    },
    {
      id: 'deworm_tryp_cattle',
      nameEn: 'Herd Deworming & Trypanosomiasis Check',
      nameHa: 'Maganin Tsutsa da Kariya daga Cutar Sammore',
      intervalDays: 90,
      descEn: 'Routine deworming and tsetse fly trypanosome screen for milking cows and work oxen.',
      descHa: 'Ba da maganin tsutsa kowane wata 3 don samun ƙarin madara, lafiya da ƙarfin noma.',
    },
  ],
  donkey: [
    {
      id: 'tetanus_ahs_donkey',
      nameEn: 'Equine Tetanus & African Horse Sickness (AHS)',
      nameHa: 'Rigakafin Cutar Ɗankare (Tetanus) da Zazzabi',
      intervalDays: 365,
      descEn: 'Annual vaccination against tetanus from harnesses/wounds and viral horse sickness.',
      descHa: 'Allurar shekara domin kariya daga cutar ɗankare sanadiyyar rauni ko gogayyar igiya.',
    },
    {
      id: 'deworm_donkey',
      nameEn: 'Strongyle Deworming (Ivermectin / Fenbendazole)',
      nameHa: 'Maganin Tsutsar Ciki na Jakuna',
      intervalDays: 90,
      descEn: 'Prevents large strongyle bloodworms that cause fatal colic and poor draft stamina.',
      descHa: 'Maganin tsutsar ciki kowane wata 3 don hana ciwon ciki (colic) da ramewa a wurin aiki.',
    },
    {
      id: 'hoof_care_donkey',
      nameEn: 'Hoof Trimming & Antiseptic Wash',
      nameHa: 'Kulawa da Wanke Kofaton Jaki',
      intervalDays: 30,
      descEn: 'Monthly hoof cleaning and thrush check to prevent deep frog decay and severe lameness.',
      descHa: 'Duba da wanke kofato kowane wata don hana ruɓewa da dingo a wurin aiki.',
    },
  ],
  camel: [
    {
      id: 'surra_prophylaxis_camel',
      nameEn: 'Trypanosomiasis (Surra) Prophylaxis',
      nameHa: 'Rigakafi da Maganin Cutar Surra na Raƙumi',
      intervalDays: 120,
      descEn: 'Screening and prophylactic trypanocide administration against fly-borne Surra parasite.',
      descHa: 'Maganin kariya daga cutar Surra da ƙudan ƙuda ke sawa kowane wata 4.',
    },
    {
      id: 'mange_ticks_camel',
      nameEn: 'Mange (Kirchi) & Ectoparasite Dip/Wash',
      nameHa: 'Maganin Kazuwar Fata (Kirchi) da Kaska',
      intervalDays: 60,
      descEn: 'Acaricide skin treatment every 2 months against Sarcoptic mange mites and camel ticks.',
      descHa: 'Wanke jiki da maganin kashe ƙaiƙayi da kaska kowane wata 2 don hana zubar gashi.',
    },
    {
      id: 'camel_pox_enterotoxemia',
      nameEn: 'Camel Pox & Enterotoxemia Vaccine',
      nameHa: 'Allurar Ƙyandar Raƙumi da Ciwon Hanji',
      intervalDays: 365,
      descEn: 'Annual immunization against camel pox virus and clostridial enterotoxemia.',
      descHa: 'Allurar shekara-shekara don kariya daga cutar ƙyandar raƙuma da ciwon hanji.',
    },
  ],
  pig: [
    {
      id: 'asf_biosecurity_pig',
      nameEn: 'African Swine Fever (ASF) Biosecurity Audit',
      nameHa: 'Kariyar Cutar Zazzabin Alade (ASF)',
      intervalDays: 30,
      descEn: 'Monthly disinfection and strict biosecurity inspection (no commercial vaccine exists for ASF).',
      descHa: 'Fesa maganin feshi a ɗakunan aladu kowane wata saboda babu allurar ASF a kasuwa.',
    },
    {
      id: 'erysipelas_parvo_pig',
      nameEn: 'Swine Erysipelas & Parvovirus Vaccine',
      nameHa: 'Allurar Cutar Ƙirjin Lu\'u-lu\'u da Zubar Ciki',
      intervalDays: 180,
      descEn: 'Bi-annual vaccination against red diamond skin lesions and sow reproductive failure.',
      descHa: 'Allurar kowane wata 6 don hana jajayen tabo a fata da zubar da ciki ga mata.',
    },
    {
      id: 'deworm_mange_pig',
      nameEn: 'Deworming & Sarcoptic Mange Control',
      nameHa: 'Maganin Tsutsa da Kazuwar Fata',
      intervalDays: 60,
      descEn: 'Injectable or feed-grade ivermectin for roundworms, lungworms, and severe skin itching.',
      descHa: 'Maganin tsutsar ciki da ta huhu tare da kariya daga ƙaiƙayin fata kowane wata 2.',
    },
  ],
  duck: [
    {
      id: 'duck_plague_vaccine',
      nameEn: 'Duck Viral Enteritis (Duck Plague) Vaccine',
      nameHa: 'Allurar Rigakafin Zazzabin Agwagwa (Duck Plague)',
      intervalDays: 180,
      descEn: 'Semi-annual vaccination against duck plague herpesvirus that causes high mortality and limberneck.',
      descHa: 'Allurar watanni 6 domin kare agwagwa daga zazzabin virus mai saurin kisa da sanyin wuya.',
    },
    {
      id: 'duck_hepatitis_vaccine',
      nameEn: 'Duck Viral Hepatitis Prevention',
      nameHa: 'Kariyar Ciwon Hanta na Matasan Agwagwa',
      intervalDays: 120,
      descEn: 'Protective breeding stock vaccination to safeguard newly hatched ducklings.',
      descHa: 'Rigakafin cutar hanta ga iyayen agwagwa don kare \'ya\'ya bayan ƙyanƙyashewa.',
    },
    {
      id: 'water_sanitize_duck',
      nameEn: 'Water Sanitization & Routine Deworming',
      nameHa: 'Tsabtace Ruwan Wanka da Maganin Tsutsa',
      intervalDays: 60,
      descEn: 'Routine deworming and water trough chlorination to prevent botulism and gapeworms.',
      descHa: 'Maganin tsutsar ciki kowane wata 2 da wanke kwandon ruwa don hana guba da tsutsa.',
    },
  ],
  turkey: [
    {
      id: 'newcastle_cholera_turkey',
      nameEn: 'Newcastle Disease & Fowl Cholera Vaccine',
      nameHa: 'Allurar Samore da Ciwon Kwale-kwale na Talo-talo',
      intervalDays: 90,
      descEn: 'Quarterly vaccination against Newcastle disease and Pasteurella (fowl cholera).',
      descHa: 'Allurar kowane wata 3 domin kariya daga samore da cutar kwale-kwale mai kisa kwatsam.',
    },
    {
      id: 'blackhead_caecal_turkey',
      nameEn: 'Blackhead Prevention & Caecal Deworming',
      nameHa: 'Rigakafin Cutar Blackhead da Maganin Tsutsa',
      intervalDays: 60,
      descEn: 'Crucial deworming targeting Heterakis worms that transmit fatal blackhead disease to turkeys.',
      descHa: 'Maganin tsutsar hanji kowane wata 2 don hana cutar baƙar fuska (Blackhead) da gudawar rawaya.',
    },
    {
      id: 'fowlpox_sinus_turkey',
      nameEn: 'Fowl Pox & Respiratory Complex Protection',
      nameHa: 'Rigakafin Ƙyandar Talo-talo da Ciwon Hanci',
      intervalDays: 120,
      descEn: 'Wing-web pox vaccination and protective sinus care against dry harmattan dust.',
      descHa: 'Allurar fiffike ta ƙyanda da kariya daga ƙurar harmattan a hanci da idanu.',
    },
  ],
};

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
  const [showSchedulesModal, setShowSchedulesModal] = useState(false);

  const schedules =
    LIVESTOCK_VACCINATION_SCHEDULES[selectedAnimal.id] || [
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
    ];

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

  // Live Text-to-Speech on symptom tap (single-select radio behavior)
  const handleToggleSymptom = (sym: string, symHausa?: string) => {
    setCheckedSymptoms((prev) =>
      prev.includes(sym) ? [] : [sym]
    );

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
        ? 'Likitancin Dabbobi da Kaji. Duba kaji, awaki, tumaki, shanu, jakuna, rakuma, aladu, agwagi, da talotalo.'
        : 'Livestock and Poultry Care. Check chickens, goats, sheep, cattle, donkeys, camels, pigs, ducks, and turkeys.';
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

        {/* Compact Secondary Action Button for Schedules & Reminders */}
        <div className="flex justify-end pt-1 pb-1">
          <button
            type="button"
            onClick={() => setShowSchedulesModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95 hover:border-emerald-300"
          >
            <Bell className="w-3.5 h-3.5 text-emerald-600" />
            <span>{locale === 'ha' ? 'Allura da Tunatarwa' : 'Vaccination & Reminders'}</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full">
              {schedules.length}
            </span>
          </button>
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

      {/* Vaccination & Prevention Schedule Modal */}
      {showSchedulesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowSchedulesModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-emerald-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                  <span>{selectedAnimal.emoji}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <BellRing className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                      {locale === 'ha'
                        ? `Allura da Tunatarwa: ${selectedAnimal.hausa_name}`
                        : `Vaccination & Reminders: ${selectedAnimal.name}`}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block truncate">
                    {locale === 'ha'
                      ? 'Jadawalin alluran rigakafi da magungunan tsutsa'
                      : 'Vaccination, deworming & prevention schedule'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSchedulesModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 scrollbar-thin">
              {/* Veterinary Advisory Disclaimer */}
              <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  {locale === 'ha'
                    ? 'Gargaɗin Likitan Dabbobi: Wannan jadawalin allura da magungunan tsutsa ya dace da ƙa\'idodin kula da dabbobi na Najeriya (NVRI Vom). Koyaushe tuntuɓi ƙwararren likitan dabbobi ko ma\'aikacin lafiyar dabbobi (CAHW) don ainihin magani da yanayin yankinku.'
                    : 'Veterinary Advisory: These vaccination and deworming schedules follow Nigerian national veterinary recommendations (NVRI Vom). Always consult a licensed veterinarian or Community Animal Health Worker (CAHW) for proper dosage, local outbreak alerts, and specific flock/herd management.'}
                </p>
              </div>

              {/* Schedules List */}
              <div className="space-y-2.5">
                {schedules.map((v) => {
                  const key = `livestock-${selectedAnimal.id}-${getNotificationIdForKey(v.nameEn)}`;
                  const isReminderSet = Boolean(reminders[key]);

                  return (
                    <div
                      key={v.id}
                      className="p-3.5 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl border border-slate-200 transition-all space-y-2"
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
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-lg">
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

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowSchedulesModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer active:scale-95"
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
