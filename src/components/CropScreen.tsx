import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Leaf,
  ShieldCheck,
  ListFilter,
  X,
  Sprout,
  Clock,
  RotateCcw,
  Calendar,
  Bell,
  BellOff,
  BellRing,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import {
  analyzeCropImage,
  diagnoseCropBySymptoms,
  diagnoseCropSelection,
  CropResult,
} from '../services/cropService';
import { voiceService } from '../services/voiceService';
import { historyService } from '../services/historyService';
import { reminderService, StoredReminder, getNotificationIdForKey } from '../services/reminderService';
import {
  CROP_REFERENCE_DATA,
  CropCategoryReference,
  CropDiseaseReference,
} from '../data/cropReferenceData';
import { HarvestCountdownCard } from './HarvestCountdownCard';
import {
  pickPhotoFromGallery,
  cameraService,
} from '../services/cameraService';
import { FullScreenCameraModal } from './FullScreenCameraModal';

interface CropScreenProps {
  locale: Language;
  onRecordSaved?: () => void;
  initialSelectedCrop?: CropCategoryReference;
  initialSelectedDisease?: CropDiseaseReference;
}

export const CropScreen: React.FC<CropScreenProps> = ({
  locale,
  onRecordSaved,
  initialSelectedCrop,
  initialSelectedDisease,
}) => {
  // Navigation mode: Diagnosis vs Harvest Countdown
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'harvest'>('diagnosis');

  // Active selected crop state (Defaults to Onion / Albasa)
  const [selectedCropId, setSelectedCropId] = useState<string>(
    initialSelectedCrop?.id || 'onion'
  );
  const [selectedDisease, setSelectedDisease] = useState<CropDiseaseReference | null>(
    initialSelectedDisease || null
  );

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CropResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeakingCropHeader, setIsSpeakingCropHeader] = useState(false);
  const [isSpeakingDiagnosisTab, setIsSpeakingDiagnosisTab] = useState(false);
  const [isSpeakingHarvestTab, setIsSpeakingHarvestTab] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cropReminders, setCropReminders] = useState<Record<string, StoredReminder>>({});

  useEffect(() => {
    reminderService.getStoredReminders().then(setCropReminders);
  }, []);

  const handleToggleCropFollowupReminder = async () => {
    if (!result) return;
    const cropName = selectedCropCategory.crop;
    const cropHa = selectedCropCategory.hausa_name;
    const diseaseName = result.referenceDetail
      ? (locale === 'ha' ? result.referenceDetail.hausa_name : result.referenceDetail.name)
      : (result.predictions[0]?.label || 'Treatment');
    const key = `crop-followup-${getNotificationIdForKey(cropName + diseaseName)}`;

    if (cropReminders[key]) {
      await reminderService.cancelCropFollowupReminder(key);
      setCropReminders((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      showToast(
        locale === 'ha'
          ? 'An soke tunatarwar duba shuka.'
          : 'Cancelled 7-day crop follow-up reminder.'
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

    await reminderService.scheduleCropFollowupReminder(cropName, cropHa, diseaseName, 7);
    const updated = await reminderService.getStoredReminders();
    setCropReminders(updated);
    showToast(
      locale === 'ha'
        ? `An saita tunatarwar duba warakar ${cropHa} bayan kwanaki 7!`
        : `7-day field recovery check scheduled for ${cropName}!`
    );
  };

  // Helper: Live read-aloud when a crop is selected or tapped (Part 6)
  const speakCropName = (crop: CropCategoryReference) => {
    voiceService.stopSpeaking();
    const textToSpeak = locale === 'ha'
      ? `${crop.hausa_name}. ${crop.crop}`
      : `${crop.crop}. ${crop.hausa_name}`;
    voiceService.speak(textToSpeak, locale, undefined, 'crop');
  };

  // Manual Selector Modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Read aloud section header
  const handleSpeakCropHeader = async () => {
    if (isSpeakingCropHeader) {
      voiceService.stopSpeaking();
      setIsSpeakingCropHeader(false);
      return;
    }
    setIsSpeakingCropHeader(true);
    const textToSpeak =
      locale === 'ha'
        ? 'Lafiyar Shuke-shuke da Gona. Duba cututtukan albasa da amfanin gona, sannan bibiyi kwanakin girbi.'
        : 'Crop and Plant Health. Check onion and crop diseases, then track harvest days.';
    await voiceService.speak(textToSpeak, locale);
    setIsSpeakingCropHeader(false);
  };

  const handleSpeakDiagnosisTab = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeakingDiagnosisTab) {
      voiceService.stopSpeaking();
      setIsSpeakingDiagnosisTab(false);
      return;
    }
    setIsSpeakingDiagnosisTab(true);
    const textToSpeak =
      locale === 'ha'
        ? 'Duba Cututtuka. Gano cututtuka da magungunan shuke-shukenka.'
        : 'Crop Diagnosis. Identify diseases and treatments for your crops.';
    await voiceService.speak(textToSpeak, locale);
    setIsSpeakingDiagnosisTab(false);
  };

  const handleSpeakHarvestTab = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeakingHarvestTab) {
      voiceService.stopSpeaking();
      setIsSpeakingHarvestTab(false);
      return;
    }
    setIsSpeakingHarvestTab(true);
    const textToSpeak =
      locale === 'ha'
        ? 'Ƙididdigar Girbi. Bibiyar kwanakin da suka rage kafin girbin albasa, masara da sauran amfanin gona.'
        : 'Harvest Countdown. Track days until harvest for your active field crops.';
    await voiceService.speak(textToSpeak, locale);
    setIsSpeakingHarvestTab(false);
  };

  // Sync if initial props change
  useEffect(() => {
    if (initialSelectedCrop) {
      setSelectedCropId(initialSelectedCrop.id);
    }
    if (initialSelectedDisease) {
      setSelectedDisease(initialSelectedDisease);
    }
  }, [initialSelectedCrop, initialSelectedDisease]);

  useEffect(() => {
    return () => {
      voiceService.stopSpeaking();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const selectedCropCategory =
    CROP_REFERENCE_DATA.find((c) => c.id === selectedCropId) ||
    CROP_REFERENCE_DATA.find((c) => c.id === 'soybeans' && (selectedCropId === 'soybean' || selectedCropId === 'soybeans')) ||
    CROP_REFERENCE_DATA[0];

  // 1-Tap Crop Selection Handler: Sets crop and immediately speaks crop name aloud (Part 6)
  const handleSelectCropOnly = (cropId: string) => {
    setSelectedCropId(cropId);
    setSelectedDisease(null);
    setResult(null); // Clear previous results so user can click Analyze
    setShowManualModal(false);
    setModalStep(1);

    const crop = CROP_REFERENCE_DATA.find((c) => c.id === cropId);
    if (crop) {
      speakCropName(crop);
    }
    showToast(
      locale === 'ha'
        ? `An zaɓi ${crop?.hausa_name || 'Shuka'}! Danna 'Bincika Shuka' a ƙasa.`
        : `Selected ${crop?.crop || 'Crop'}! Click 'Analyze Crop' below to run analysis.`
    );
  };

  // Select a specific suspected disease from the catalog: Sets target WITHOUT immediately showing results!
  const handleSelectDiseaseOnly = (crop: CropCategoryReference, disease: CropDiseaseReference) => {
    voiceService.stopSpeaking();
    setSpeakingDiseaseCardId(null);
    setSelectedCropId(crop.id);
    setSelectedDisease(disease);
    setResult(null); // Clear previous results so user can click Analyze
    setShowManualModal(false);
    setModalStep(1);

    showToast(
      locale === 'ha'
        ? `An zaɓi cutar ${disease.hausa_name}! Danna 'Bincika Shuka' domin duba magani.`
        : `Selected ${disease.name}! Click 'Analyze Crop' to view diagnosis & treatment.`
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhoto(url);
      setPhotoUrl(url);
      setResult(null);
      showToast(
        locale === 'ha'
          ? 'An loda hoto! Danna \'Bincika Shuka\' a ƙasa.'
          : 'Photo loaded! Click \'Analyze Crop\' below.'
      );
    }
    e.target.value = '';
  };

  const [speakingDiseaseCardId, setSpeakingDiseaseCardId] = useState<string | null>(null);

  // Toggle read-aloud on individual disease card in manual picker modal (Task 1)
  const handleToggleSpeakDiseaseCard = async (e: React.MouseEvent, disease: CropDiseaseReference) => {
    e.stopPropagation();
    if (speakingDiseaseCardId === disease.id) {
      voiceService.stopSpeaking();
      setSpeakingDiseaseCardId(null);
      return;
    }

    voiceService.stopSpeaking();
    setSpeakingDiseaseCardId(disease.id);

    const diseaseName = locale === 'ha' ? disease.hausa_name : disease.name;
    const diseaseDesc = locale === 'ha' ? disease.symptoms_hausa : disease.symptoms;
    const textToSpeak = `${diseaseName}. ${diseaseDesc}`;

    await voiceService.speak(textToSpeak, locale, (warning) => {
      showToast(warning);
    });
    setSpeakingDiseaseCardId(null);
  };

  // Live TTS when tapping sample disease buttons (Task 2)
  const handleSelectSample = (disease: CropDiseaseReference) => {
    // 1. Immediately stop any previous speech & speak full disease name
    voiceService.stopSpeaking();
    const fullDiseaseName = locale === 'ha' ? disease.hausa_name : disease.name;
    voiceService.speak(fullDiseaseName, locale);

    // 2. Existing sample load behavior unchanged
    setPhoto(disease.image);
    setPhotoUrl(disease.image);
    setSelectedDisease(disease);
    setResult(null);
    showToast(
      locale === 'ha'
        ? `An zaɓi samfurin ${disease.hausa_name}! Danna 'Bincika Shuka' a ƙasa.`
        : `Selected ${disease.name} sample! Click 'Analyze Crop' below.`
    );
  };

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  const handleOpenCamera = () => {
    setIsCameraActive(true);
  };

  const handleCapturePhoto = (captured: string) => {
    const formatted = captured.startsWith('data:') ? captured : `data:image/jpeg;base64,${captured}`;
    setPhoto(formatted);
    setPhotoUrl(formatted);
    setResult(null);
    setIsCameraActive(false);
    showToast(locale === 'ha' ? 'An ɗauki hoto!' : 'Photo captured!');
  };

  const handleCloseCamera = () => {
    setIsCameraActive(false);
  };

  const handleGallery = async () => {
    const picked = await pickPhotoFromGallery();
    if (picked) {
      const formatted = picked.startsWith('data:') ? picked : `data:image/jpeg;base64,${picked}`;
      setPhoto(formatted);
      setPhotoUrl(formatted);
      setResult(null);
      showToast(locale === 'ha' ? 'An loda hoto daga gallery!' : 'Photo loaded from gallery!');
    }
  };

  // Perform Analysis: Triggered ONLY when the user clicks the "Analyze Crop" button!
  const handlePerformAnalysis = async () => {
    setBusy(true);

    try {
      let r: CropResult;

      if (selectedDisease) {
        // If a disease was manually selected or chosen from sample, skip AI analysis and return that exact disease!
        r = {
          predictions: [{ label: selectedDisease.id, confidence: 0.98 }],
          advice: selectedDisease.treatment,
          adviceHausa: selectedDisease.treatment_hausa,
          isLowConfidence: false,
          cropId: selectedCropCategory.id,
          cropName: selectedCropCategory.crop,
          cropHausaName: selectedCropCategory.hausa_name,
          referenceDetail: selectedDisease,
        };
      } else if (photoUrl) {
        // Offline vision analysis prioritized for the selected crop
        r = await analyzeCropImage(photoUrl, selectedCropId);
      } else {
        // Diagnosis based on selected crop
        r = diagnoseCropSelection(selectedCropId, undefined);
      }

      setResult(r);

      if (r.needsCropSelection) {
        showToast(
          locale === 'ha'
            ? 'Don Allah zaɓi shukarka da farko domin tabbatar da daidaiton bincike.'
            : 'Please select your specific crop first for accurate diagnosis.'
        );
        setShowManualModal(true);
        return;
      }

      const topPred = r.predictions[0] || { label: 'unknown', confidence: 0 };
      const formattedTitle = r.referenceDetail
        ? `${selectedCropCategory.crop}: ${r.referenceDetail.name}`
        : `${selectedCropCategory.crop} Analysis`;

      historyService.insert({
        type: 'crop',
        createdAt: new Date().toISOString(),
        title: formattedTitle,
        detail: photoUrl ? 'Photo diagnosis' : `Manual check: ${selectedCropCategory.crop}`,
        advice: locale === 'ha' ? r.adviceHausa : r.advice,
        confidence: topPred.confidence,
        imagePath: photoUrl?.startsWith('data:') ? photoUrl : undefined,
      });

      onRecordSaved?.();

      // Smooth scroll down to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch {
      showToast(
        locale === 'ha'
          ? 'Kuskure wajen bincike. Da fatan a sake gwadawa.'
          : 'Analysis error. Please retry.'
      );
    } finally {
      setBusy(false);
    }
  };

  // Speak aloud advice for Grandma / Farmers
  const handleSpeak = async () => {
    if (!result) return;
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const title = result.referenceDetail
      ? locale === 'ha'
        ? result.referenceDetail.hausa_name
        : result.referenceDetail.name
      : result.predictions[0]?.label.replace(/_/g, ' ') || '';
    const advice = locale === 'ha' ? result.adviceHausa : result.advice;
    const textToSpeak = `${title}. ${advice}`;

    await voiceService.speak(textToSpeak, locale, (warning) => {
      showToast(warning);
    }, 'crop');
    setIsSpeaking(false);
  };

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
      {/* Hidden File / Camera Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title & Sub-Navigation Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0 shadow-2xs">
              <Sprout className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  {t(locale, 'cropHealth')}
                </h1>
                <button
                  type="button"
                  onClick={handleSpeakCropHeader}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isSpeakingCropHeader
                      ? 'bg-emerald-500 text-white border-emerald-600 animate-pulse'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                  title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {locale === 'ha'
                  ? 'Duba cututtukan albasa da amfanin gona, sannan bibiyi kwanakin girbi'
                  : 'Check onion and crop diseases, then track harvest days'}
              </p>
            </div>
          </div>
        </div>

        {/* Mode Toggle: Crop Diagnosis vs Harvest Countdown */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <div
            onClick={() => setActiveTab('diagnosis')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'diagnosis'
                ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-1.5 truncate">
              <Sprout className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="truncate">{locale === 'ha' ? 'Duba Cututtuka' : 'Crop Diagnosis'}</span>
            </div>
            <button
              type="button"
              onClick={handleSpeakDiagnosisTab}
              className="p-1 rounded-md hover:bg-emerald-100 text-emerald-700 cursor-pointer shrink-0 transition-colors"
              title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div
            onClick={() => setActiveTab('harvest')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'harvest'
                ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-1.5 truncate">
              <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="truncate">{locale === 'ha' ? 'Ƙididdigar Girbi' : 'Harvest Countdown'}</span>
            </div>
            <button
              type="button"
              onClick={handleSpeakHarvestTab}
              className="p-1 rounded-md hover:bg-emerald-100 text-emerald-700 cursor-pointer shrink-0 transition-colors"
              title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: HARVEST COUNTDOWN */}
      {activeTab === 'harvest' && (
        <HarvestCountdownCard
          locale={locale}
          selectedCropId={selectedCropId}
          onSelectCrop={(cropId) => {
            setSelectedCropId(cropId);
            setSelectedDisease(null);
            setResult(null);
            const crop = CROP_REFERENCE_DATA.find((c) => c.id === cropId);
            if (crop) speakCropName(crop);
          }}
        />
      )}

      {/* VIEW 2: CROP DIAGNOSIS */}
      {activeTab === 'diagnosis' && (
        <div className="space-y-4">
          {/* Quick 1-Tap Crop Carousel */}
          <div className="bg-white rounded-2xl p-3 border border-emerald-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                <span>{locale === 'ha' ? 'Zaɓi Shuka:' : 'Select Crop:'}</span>
              </span>
              <button
                onClick={() => {
                  setModalStep(1);
                  setShowManualModal(true);
                }}
                className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ListFilter className="w-3 h-3" />
                <span>{locale === 'ha' ? 'Duk Shuke-shuke' : 'View All Crops'}</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {CROP_REFERENCE_DATA.map((crop) => {
                const isSelected = crop.id === selectedCropId;
                return (
                  <button
                    key={crop.id}
                    onClick={() => handleSelectCropOnly(crop.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 cursor-pointer transition-all shrink-0 active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-700 border-emerald-800 text-white shadow-xs'
                        : 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-slate-800'
                    }`}
                  >
                    <span>{crop.emoji || '🌱'}</span>
                    <span>{crop.crop}</span>
                    <span
                      className={`text-[11px] ${
                        isSelected ? 'text-emerald-100' : 'text-slate-500 font-normal'
                      }`}
                    >
                      ({crop.hausa_name})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Selected Crop Banner */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/70 border-2 border-emerald-300/80 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 text-xl">
                {selectedCropCategory.emoji || <Sprout className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                  {locale === 'ha' ? 'Shukar da ka zaɓa don bincike:' : 'Active Crop for Analysis:'}
                </span>
                <div className="font-black text-sm sm:text-base text-emerald-950 flex items-center gap-2">
                  <span>
                    {selectedCropCategory.crop} ({selectedCropCategory.hausa_name})
                  </span>
                  {selectedDisease && (
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                      {locale === 'ha' ? selectedDisease.hausa_name : selectedDisease.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  voiceService.playContextSound({
                    type: 'crop',
                    cropId: selectedCropId,
                    diseaseId: selectedDisease?.id || result?.referenceDetail?.id,
                  });
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs active:scale-95"
                title={locale === 'ha' ? `Saurari sautin ${selectedCropCategory.hausa_name}` : `Listen to ${selectedCropCategory.crop} sound`}
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">{locale === 'ha' ? 'Sautin Shuka' : 'Crop Sound'}</span>
              </button>
              <button
                onClick={() => {
                  setModalStep(2);
                  setShowManualModal(true);
                }}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
              >
                {locale === 'ha' ? 'Canza' : 'Change'}
              </button>
            </div>
          </div>

          {/* Camera / Photo Upload Box */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-200 p-4 flex flex-col items-center justify-center min-h-[170px] relative overflow-hidden group">
            {photoUrl ? (
              <div className="w-full flex flex-col items-center">
                <img
                  src={photoUrl}
                  alt="Leaf to analyze"
                  className="max-h-56 rounded-xl object-contain shadow-xs border border-emerald-100"
                />
                <button
                  onClick={() => {
                    setPhoto(null);
                    setPhotoUrl(null);
                    setResult(null);
                  }}
                  className="mt-2 text-xs text-red-600 hover:text-red-700 font-bold underline cursor-pointer"
                >
                  {locale === 'ha' ? 'Cire wannan hoto' : 'Remove photo'}
                </button>
              </div>
            ) : (
              <div className="text-center p-3 space-y-1.5">
                <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Leaf className="w-6 h-6 opacity-80" />
                </div>
                <p className="text-slate-800 font-extrabold text-xs sm:text-sm">
                  {locale === 'ha'
                    ? `Ɗauki hoton ganyen ${selectedCropCategory.hausa_name} ko loda hoto (Zabi ne)`
                    : `Upload or take photo of ${selectedCropCategory.crop} leaf (Optional)`}
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  {locale === 'ha'
                    ? 'Ko ba tare da hoto ba, zaka iya danna \'Bincika Shuka\' domin duba lafiyarta da magunguna.'
                    : 'Even without a photo, you can click \'Analyze Crop\' to diagnose and view treatments.'}
                </p>
              </div>
            )}
          </div>

          {/* Full Screen Native Android Camera Modal */}
          <FullScreenCameraModal
            isOpen={isCameraActive}
            locale={locale}
            title={locale === 'ha' ? `Hoton Ganyen ${selectedCropCategory.hausa_name}` : `${selectedCropCategory.crop} Leaf Camera`}
            onCapture={handleCapturePhoto}
            onClose={handleCloseCamera}
          />

          {/* Single Primary Action: Take Photo with Camera & Secondary Gallery Option */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleOpenCamera}
              className="w-full flex items-center justify-center space-x-2.5 py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white rounded-2xl font-black text-sm sm:text-base shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Camera className="w-5 h-5 text-emerald-200" />
              <span>
                {locale === 'ha' ? 'Ɗauki Hoto' : 'Take Photo'}
              </span>
            </button>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleGallery}
                className="inline-flex items-center space-x-1.5 py-1.5 px-3 text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {locale === 'ha' ? 'Zaɓi daga Gallery' : 'Choose from Gallery'}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Test Samples dynamically built for selected crop */}
          <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-4 border border-slate-200/80 space-y-2.5">
            <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
              {locale === 'ha'
                ? `KO GWADA DA SAMFURAN ${selectedCropCategory.hausa_name.toUpperCase()}:`
                : `OR TEST WITH ${selectedCropCategory.crop.toUpperCase()} SAMPLES:`}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectedCropCategory.diseases.slice(0, 6).map((disease) => {
                const isSelected = selectedDisease?.id === disease.id;
                return (
                  <button
                    key={disease.id}
                    type="button"
                    onClick={() => handleSelectSample(disease)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2.5 shadow-2xs active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400'
                        : 'bg-white hover:bg-emerald-50/50 border-slate-200'
                    }`}
                  >
                    <img
                      src={disease.image}
                      alt={disease.name}
                      className="w-8 h-8 rounded-lg object-contain shrink-0 border border-slate-200 bg-white"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {locale === 'ha' ? disease.hausa_name : disease.name}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold truncate block">
                        {disease.affected_parts.slice(0, 2).join(', ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 
            PRIMARY CALL TO ACTION: ANALYZE CROP BUTTON!
            Rendered when a photo has been selected OR a disease has been selected.
          */}
          {(photoUrl || selectedDisease) && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handlePerformAnalysis}
                disabled={busy}
                className="w-full py-4 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold rounded-2xl text-sm sm:text-base flex items-center justify-center space-x-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer ring-2 ring-emerald-500/20"
              >
                <Sparkles className="w-5 h-5 text-emerald-200" />
                <span>
                  {busy
                    ? locale === 'ha'
                      ? 'Ana binciken amfanin gona...'
                      : 'Analyzing crop...'
                    : locale === 'ha'
                    ? `Bincika ${selectedCropCategory.hausa_name} Yanzu`
                    : `Analyze ${selectedCropCategory.crop} Now`}
                </span>
              </button>
            </div>
          )}

          {/* PROMPT TO SELECT CROP IF UNVERIFIED */}
          {result?.needsCropSelection && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center space-y-2 animate-scale-up">
              <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
              <h4 className="font-extrabold text-sm text-amber-950">
                {locale === 'ha'
                  ? 'Da fatan zaɓi ainihin shukarka'
                  : 'Please Select Your Specific Crop'}
              </h4>
              <p className="text-xs text-amber-800">
                {locale === 'ha'
                  ? 'Domin tabbatar da cewa cututtukan da aka nuna sun dace da shukarka, don Allah zaɓi nau\'in shukar da farko.'
                  : 'To ensure accurate results and avoid mixing plant diseases, please choose your specific crop first.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setModalStep(1);
                  setShowManualModal(true);
                }}
                className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                {locale === 'ha' ? 'Zaɓi Shuka Yanzu' : 'Select Crop Now'}
              </button>
            </div>
          )}

          {/* DIAGNOSTIC RESULT CARD: Only displayed AFTER clicking Analyze and crop is confirmed! */}
          {result && !result.needsCropSelection && (
            <div
              ref={resultRef}
              className="bg-white rounded-2xl border-2 border-emerald-400 p-5 shadow-sm space-y-4 animate-scale-up"
            >
              {/* Header with Title and Grandma Listen Button */}
              <div className="flex items-start justify-between gap-3 min-h-0">
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                    {t(locale, 'cropResult')}
                  </span>
                  <h3 className="font-black text-lg sm:text-xl text-slate-800 capitalize leading-snug break-words">
                    {result.referenceDetail
                      ? locale === 'ha'
                        ? result.referenceDetail.hausa_name
                        : result.referenceDetail.name
                      : result.predictions[0]?.label.replace(/_/g, ' ') || 'Assessment'}
                  </h3>
                  <div className="text-xs text-slate-500 font-semibold break-words">
                    {selectedCropCategory.crop} ({selectedCropCategory.hausa_name})
                  </div>
                </div>

                {/* Grandma-Friendly Read Aloud Button */}
                <button
                  onClick={handleSpeak}
                  className={`shrink-0 flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs ${
                    isSpeaking
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                  title={t(locale, 'grandmaListen')}
                >
                  <Volume2 className="w-4 h-4 text-emerald-700" />
                  <span>{locale === 'ha' ? 'Saurara da Murya' : 'Listen Aloud'}</span>
                </button>
              </div>

              {/* Confidence Bar */}
              {!result.isLowConfidence && result.predictions[0] && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>{t(locale, 'confidence')}</span>
                    <span>{(result.predictions[0].confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all"
                      style={{ width: `${result.predictions[0].confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actionable Advice & Organic Treatment */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{t(locale, 'advice')}</span>
                </h4>
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl text-xs sm:text-sm text-emerald-950 leading-relaxed font-medium">
                  {locale === 'ha' ? result.adviceHausa : result.advice}
                </div>
              </div>

              {/* 7-Day Field Recovery & Spraying Inspection Reminder */}
              {(() => {
                const diseaseName = result.referenceDetail
                  ? (locale === 'ha' ? result.referenceDetail.hausa_name : result.referenceDetail.name)
                  : (result.predictions[0]?.label || 'Treatment');
                const key = `crop-followup-${getNotificationIdForKey(selectedCropCategory.crop + diseaseName)}`;
                const isFollowupSet = Boolean(cropReminders[key]);

                return (
                  <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-300 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-xs text-emerald-950">
                        <BellRing className="w-4 h-4 text-emerald-700" />
                        <span>
                          {locale === 'ha'
                            ? 'Tunatarwar Duba Warakar Shuka (Kwanaki 7)'
                            : '7-Day Field Recovery & Spraying Reminder'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {locale === 'ha' ? 'Duba Gona' : 'Field Inspection'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {locale === 'ha'
                        ? `Saita tunatarwa domin komawa gonar ${selectedCropCategory.hausa_name} bayan kwanaki 7 don duba ko cutar ta lafa ko ana buƙatar ƙarin feshin magani.`
                        : `Get alerted in 7 days to inspect your ${selectedCropCategory.crop} field for recovery and assess if a second booster spray is needed.`}
                    </p>

                    {isFollowupSet ? (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-white/90 border border-emerald-300 px-2 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {locale === 'ha'
                              ? `An saita faɗakarwa: Za a sanar da kai a kan waya bayan kwanaki 7.`
                              : `Scheduled: You will be alerted in 7 days to re-inspect this field.`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleCropFollowupReminder}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <BellOff className="w-3.5 h-3.5 text-amber-700" />
                          <span>{locale === 'ha' ? 'Soke Tunatarwa' : 'Cancel Reminder'}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleToggleCropFollowupReminder}
                        className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                      >
                        <Bell className="w-3.5 h-3.5 text-emerald-200" />
                        <span>{locale === 'ha' ? 'Saita Tunatarwar Kwanaki 7' : 'Set 7-Day Follow-up Reminder'}</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Direct Link to Harvest Countdown for this crop */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-slate-800">
                    {locale === 'ha'
                      ? `Bibiyi kwanakin girbin ${selectedCropCategory.hausa_name}`
                      : `Track ${selectedCropCategory.crop} Harvest Countdown`}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('harvest')}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                >
                  {locale === 'ha' ? 'Duba Kwanaki →' : 'View Countdown →'}
                </button>
              </div>

              {/* Reset / Re-analyze Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <button
                  onClick={() => {
                    setResult(null);
                    setPhotoUrl(null);
                    setPhoto(null);
                    setSelectedDisease(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{locale === 'ha' ? 'Sake Wani Binciken' : 'Start Fresh Check'}</span>
                </button>

                <button
                  onClick={() => {
                    setModalStep(1);
                    setShowManualModal(true);
                  }}
                  className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                >
                  {locale === 'ha' ? 'Canza Shuka →' : 'Change Crop →'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Plant & Disease Picker Modal (Now cleanly selects without auto-triggering results!) */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-700 text-white">
              <div className="flex items-center space-x-2">
                <ListFilter className="w-5 h-5" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  {t(locale, 'manualSelectorTitle')}
                </h3>
              </div>
              <button
                onClick={() => {
                  voiceService.stopSpeaking();
                  setSpeakingDiseaseCardId(null);
                  setShowManualModal(false);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-emerald-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with 2-Step Navigation */}
            <div className="p-4 overflow-y-auto space-y-4">
              {modalStep === 1 ? (
                /* STEP 1: Select Plant */
                <div className="space-y-3">
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
                    <span className="font-bold text-xs text-emerald-950 block">
                      {locale === 'ha' ? 'Mataki na 1: Zaɓi Shuka' : 'Step 1: Choose Your Crop'}
                    </span>
                    <p className="text-[11px] text-emerald-900 mt-0.5">
                      {locale === 'ha'
                        ? 'Danna shukar da kake son dubawa, sannan danna \'Bincika Shuka\' a allon gaba:'
                        : 'Tap any crop below to select it for analysis:'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {CROP_REFERENCE_DATA.map((crop) => (
                      <button
                        key={crop.id}
                        onMouseEnter={() => speakCropName(crop)}
                        onClick={() => {
                          setSelectedCropId(crop.id);
                          speakCropName(crop);
                          setModalStep(2);
                        }}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between shadow-2xs hover:border-emerald-500 hover:shadow-xs active:scale-95 ${
                          crop.id === selectedCropId
                            ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300'
                            : 'bg-white border-slate-200 hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-sm">
                            {crop.emoji || <Sprout className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-800 truncate">
                              {crop.crop}
                            </div>
                            <div className="text-[11px] font-bold text-emerald-700 truncate">
                              {crop.hausa_name}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center justify-between border-t border-slate-100 pt-1.5">
                          <span>
                            {crop.diseases.length} {locale === 'ha' ? (crop.diseases.length === 1 ? 'matsala' : 'matsoli') : (crop.diseases.length === 1 ? 'issue' : 'issues')}
                          </span>
                          <span className="text-emerald-700 font-bold">Zaɓa →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* STEP 2: Selected Crop Options & Diseases */
                <div className="space-y-3.5 animate-scale-up">
                  {/* Step 2 Header with Change Plant Button */}
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => {
                        voiceService.stopSpeaking();
                        setSpeakingDiseaseCardId(null);
                        setModalStep(1);
                      }}
                      className="flex items-center space-x-1 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors shadow-2xs"
                    >
                      <span>← {locale === 'ha' ? 'Canza Shuka' : 'Change Crop'}</span>
                    </button>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        {locale === 'ha' ? 'Shukar da ka zaɓa:' : 'Selected Crop:'}
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-900">
                        {selectedCropCategory.crop} ({selectedCropCategory.hausa_name})
                      </span>
                    </div>
                  </div>

                  {/* Primary 1-Tap Option: Select this crop directly (Leaves results unshown until Analyze is clicked) */}
                  <div
                    onClick={() => handleSelectCropOnly(selectedCropCategory.id)}
                    className="p-3.5 rounded-xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50/60 hover:bg-emerald-100/60 transition-all cursor-pointer shadow-xs flex items-start space-x-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-xs sm:text-sm text-emerald-950 flex items-center gap-1.5">
                        <span>
                          {locale === 'ha'
                            ? `Zaɓi ${selectedCropCategory.hausa_name} don Bincike`
                            : `Select ${selectedCropCategory.crop} for Analysis`}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-1 line-clamp-2">
                        {locale === 'ha'
                          ? selectedCropCategory.description_hausa
                          : selectedCropCategory.description}
                      </p>
                      <button className="mt-2 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1 rounded-lg shadow-2xs cursor-pointer">
                        {locale === 'ha' ? '✓ Zaɓi Wannan Shuka' : '✓ Select This Crop'}
                      </button>
                    </div>
                  </div>

                  {/* Suspected Diseases for this crop */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {locale === 'ha'
                          ? `Ko kuma zaɓi cutar da kake zargi (${selectedCropCategory.diseases.length}):`
                          : `Or choose a specific suspected disease (${selectedCropCategory.diseases.length}):`}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {selectedCropCategory.diseases.map((d) => {
                        const isSpeakingThis = speakingDiseaseCardId === d.id;
                        return (
                          <div
                            key={d.id}
                            onClick={() => handleSelectDiseaseOnly(selectedCropCategory, d)}
                            className="min-h-[72px] p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all cursor-pointer flex items-start space-x-3 bg-white shadow-2xs"
                          >
                            <img
                              src={d.image}
                              alt={d.name}
                              className="w-12 h-12 rounded-lg object-contain shrink-0 border border-slate-200 bg-slate-50 mt-0.5"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 leading-snug break-words">
                                  {locale === 'ha' ? d.hausa_name : d.name}
                                </h4>
                                <div className="flex items-center space-x-1.5 shrink-0">
                                  {/* Read-Aloud Toggle Button for this disease card */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleSpeakDiseaseCard(e, d)}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                                      isSpeakingThis
                                        ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 shadow-2xs'
                                    }`}
                                    title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
                                    aria-label={locale === 'ha' ? 'Karanta bayanin cuta da murya' : 'Read disease details aloud'}
                                  >
                                    <Volume2 className={`w-3.5 h-3.5 ${isSpeakingThis ? 'animate-bounce text-white' : 'text-emerald-700'}`} />
                                  </button>
                                  <span className="shrink-0 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    {locale === 'ha' ? 'Zaɓa' : 'Select'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-600 font-medium leading-relaxed break-words">
                                {locale === 'ha' ? d.symptoms_hausa : d.symptoms}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {locale === 'ha'
                  ? 'Zaɓin shuka zai koma allon bincike'
                  : 'Selection will return to the analysis screen'}
              </span>
              <button
                onClick={() => {
                  voiceService.stopSpeaking();
                  setSpeakingDiseaseCardId(null);
                  setShowManualModal(false);
                }}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                {t(locale, 'close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
