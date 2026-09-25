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
  Mic,
  MicOff,
  Sprout,
  Clock,
  RotateCcw,
  Calendar,
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
import {
  CROP_REFERENCE_DATA,
  CropCategoryReference,
  CropDiseaseReference,
} from '../data/cropReferenceData';
import { HarvestCountdownCard } from './HarvestCountdownCard';
import { cameraService } from '../services/cameraService';

interface CropScreenProps {
  locale: Language;
  onRecordSaved?: () => void;
  initialSelectedCrop?: CropCategoryReference;
  initialSelectedDisease?: CropDiseaseReference;
}

// Sample leaf test images for instant evaluation
const SAMPLE_LEAVES = [
  {
    name: 'Healthy Leaf',
    name_hausa: 'Ganye Mai Lafiya',
    color: '#34a853',
    uri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 224 224"><rect width="224" height="224" fill="%23e8f5e9"/><path d="M112 20 C180 60 190 160 112 210 C34 160 44 60 112 20 Z" fill="%232e7d32"/><path d="M112 20 Q112 120 112 210" stroke="%2381c784" stroke-width="3" fill="none"/><path d="M112 80 Q145 70 160 60" stroke="%2381c784" stroke-width="2" fill="none"/><path d="M112 110 Q70 100 55 90" stroke="%2381c784" stroke-width="2" fill="none"/><path d="M112 140 Q150 130 165 120" stroke="%2381c784" stroke-width="2" fill="none"/></svg>`,
  },
  {
    name: 'Onion Purple Blotch',
    name_hausa: 'Duhun Albasa (Alternaria)',
    color: '#7c3aed',
    uri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 224 224"><rect width="224" height="224" fill="%23f3e8ff"/><path d="M70 210 Q85 80 110 30 Q135 80 150 210 Z" fill="%2316a34a"/><ellipse cx="110" cy="110" rx="22" ry="38" fill="%236b21a8" stroke="%234c1d95" stroke-width="2"/><ellipse cx="110" cy="110" rx="14" ry="24" fill="%239333ea"/><ellipse cx="120" cy="170" rx="12" ry="18" fill="%236b21a8"/></svg>`,
  },
  {
    name: 'Tomato Blight',
    name_hausa: 'Bakin Cutar Tumatir',
    color: '#8d6e63',
    uri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 224 224"><rect width="224" height="224" fill="%23f1f8e9"/><path d="M112 20 C180 60 190 160 112 210 C34 160 44 60 112 20 Z" fill="%23558b2f"/><circle cx="95" cy="85" r="24" fill="%233e2723"/><circle cx="95" cy="85" r="18" fill="%234e342e" stroke="%23ffeb3b" stroke-width="2"/><circle cx="135" cy="130" r="18" fill="%233e2723" stroke="%23ffeb3b" stroke-width="2"/><circle cx="80" cy="150" r="14" fill="%23212121"/><path d="M112 20 Q112 120 112 210" stroke="%23aed581" stroke-width="2" fill="none"/></svg>`,
  },
  {
    name: 'Maize Rust',
    name_hausa: 'Tsatsar Masara',
    color: '#d84315',
    uri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 224 224"><rect width="224" height="224" fill="%23fff3e0"/><path d="M112 20 C180 60 190 160 112 210 C34 160 44 60 112 20 Z" fill="%23689f38"/><circle cx="80" cy="70" r="6" fill="%23bf360c"/><circle cx="100" cy="65" r="5" fill="%23d84315"/><circle cx="130" cy="90" r="7" fill="%23bf360c"/><circle cx="90" cy="110" r="6" fill="%23d84315"/><circle cx="120" cy="130" r="8" fill="%23e64a19"/><circle cx="105" cy="155" r="6" fill="%23bf360c"/><circle cx="75" cy="135" r="5" fill="%23e64a19"/><path d="M112 20 Q112 120 112 210" stroke="%23c5e1a5" stroke-width="2" fill="none"/></svg>`,
  },
];

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
  const [isListening, setIsListening] = useState(false);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string | null>(null);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual Selector Modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Sync if initial props change
  useEffect(() => {
    if (initialSelectedCrop) {
      setSelectedCropId(initialSelectedCrop.id);
    }
    if (initialSelectedDisease) {
      setSelectedDisease(initialSelectedDisease);
    }
  }, [initialSelectedCrop, initialSelectedDisease]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const selectedCropCategory =
    CROP_REFERENCE_DATA.find((c) => c.id === selectedCropId) ||
    CROP_REFERENCE_DATA.find((c) => c.id === 'soybeans' && (selectedCropId === 'soybean' || selectedCropId === 'soybeans')) ||
    CROP_REFERENCE_DATA[0];

  // 1-Tap Crop Selection Handler: Sets crop WITHOUT immediately showing results!
  const handleSelectCropOnly = (cropId: string) => {
    setSelectedCropId(cropId);
    setSelectedDisease(null);
    setResult(null); // Clear previous results so user can click Analyze
    setShowManualModal(false);
    setModalStep(1);

    // Update voice audio to this crop's unique sound
    const cropAudio = voiceService.getCropOrHealthAudio({
      type: 'crop',
      cropId,
    });
    setRecordedVoiceUrl(cropAudio.url);

    const crop = CROP_REFERENCE_DATA.find((c) => c.id === cropId);
    showToast(
      locale === 'ha'
        ? `An zaɓi ${crop?.hausa_name || 'Shuka'}! Danna 'Bincika Shuka' a ƙasa.`
        : `Selected ${crop?.crop || 'Crop'}! Click 'Analyze Crop' below to run analysis.`
    );
  };

  // Select a specific suspected disease from the catalog: Sets target WITHOUT immediately showing results!
  const handleSelectDiseaseOnly = (crop: CropCategoryReference, disease: CropDiseaseReference) => {
    setSelectedCropId(crop.id);
    setSelectedDisease(disease);
    setResult(null); // Clear previous results so user can click Analyze
    setShowManualModal(false);
    setModalStep(1);

    // Update voice audio to this specific crop disease's unique sound
    const diseaseAudio = voiceService.getCropOrHealthAudio({
      type: 'crop',
      cropId: crop.id,
      diseaseId: disease.id,
    });
    setRecordedVoiceUrl(diseaseAudio.url);

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

  const handleSelectSample = (uri: string) => {
    setPhotoUrl(uri);
    setResult(null);
    showToast(
      locale === 'ha'
        ? 'An zaɓi samfurin ganye! Danna \'Bincika Shuka\' a ƙasa.'
        : 'Sample leaf selected! Click \'Analyze Crop\' below.'
    );
  };

  const handleTakePhoto = async () => {
    if (cameraService.isNative()) {
      try {
        const photo = await cameraService.capturePhoto({ locale });
        if (photo) {
          setPhotoUrl(photo);
          setResult(null);
          showToast(locale === 'ha' ? 'An ɗauki hoto!' : 'Photo captured!');
          return;
        }
      } catch (err) {
        console.warn('Native camera capture fallback:', err);
      }
    }
    cameraInputRef.current?.click();
  };

  const handlePickGallery = async () => {
    if (cameraService.isNative()) {
      try {
        const photo = await cameraService.pickFromGallery(locale);
        if (photo) {
          setPhotoUrl(photo);
          setResult(null);
          showToast(locale === 'ha' ? 'An loda hoto daga gallery!' : 'Photo loaded from gallery!');
          return;
        }
      } catch (err) {
        console.warn('Gallery pick fallback:', err);
      }
    }
    fileInputRef.current?.click();
  };

  // Perform Analysis: Triggered ONLY when the user clicks the "Analyze Crop" button!
  const handlePerformAnalysis = async () => {
    setBusy(true);

    try {
      let r: CropResult;

      if (photoUrl) {
        // Offline vision analysis prioritized for the selected crop
        r = await analyzeCropImage(photoUrl, selectedCropId, spokenTranscript);
      } else {
        // Diagnosis based on selected crop, optional suspected disease, and spoken symptoms
        r = diagnoseCropSelection(selectedCropId, selectedDisease?.id, spokenTranscript);
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

      // Update recorded voice URL to the diagnosed crop disease sound
      const diseaseId = r.referenceDetail?.id || selectedDisease?.id;
      const diagAudio = voiceService.getCropOrHealthAudio({
        type: 'crop',
        cropId: selectedCropId,
        diseaseId,
      });
      setRecordedVoiceUrl(diagAudio.url);

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

  // Voice-to-Text & Voice Recording: Listen to describe crop problem
  const handleVoiceListen = async () => {
    const currentCropContext = {
      type: 'crop' as const,
      cropId: selectedCropId,
      diseaseId: selectedDisease?.id || result?.referenceDetail?.id,
      label: selectedCropCategory.hausa_name || selectedCropCategory.crop,
    };

    if (isListening) {
      const rec = await voiceService.stopListening();
      setIsListening(false);
      if (rec?.url) {
        setRecordedVoiceUrl(rec.url);
        if (!spokenTranscript) {
          setSpokenTranscript(
            locale === 'ha'
              ? 'Muryar amfanin gona da aka ɗauka'
              : 'Recorded crop voice description'
          );
        }
        showToast(
          locale === 'ha'
            ? 'An ɗauki muryarka! Danna \'Bincika Shuka\' a ƙasa.'
            : 'Voice recorded! Click \'Analyze Crop\' below.'
        );
      }
      return;
    }

    const started = await voiceService.startListening(
      locale === 'ha' ? 'ha-NG' : 'en-NG',
      (recognizedText, rec) => {
        setSpokenTranscript(recognizedText);
        if (rec?.url) {
          setRecordedVoiceUrl(rec.url);
        } else {
          const cropAudio = voiceService.getCropOrHealthAudio(currentCropContext);
          setRecordedVoiceUrl(cropAudio.url);
        }
        showToast(
          locale === 'ha'
            ? 'An ji bayanin murya! Danna \'Bincika Shuka\' a ƙasa.'
            : 'Heard voice description! Click \'Analyze Crop\' below.'
        );
      },
      (err) => {
        setIsListening(false);
      },
      (rec) => {
        setIsListening(false);
        if (rec?.url) {
          setRecordedVoiceUrl(rec.url);
        }
      },
      currentCropContext
    );

    if (started) {
      setIsListening(true);
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
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
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
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              {t(locale, 'cropHealth')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {locale === 'ha'
                ? 'Duba cututtukan albasa da amfanin gona, sannan bibiyi kwanakin girbi'
                : 'Diagnose crop leaf diseases offline and track harvest countdowns'}
            </p>
          </div>
        </div>

        {/* Mode Toggle: Crop Diagnosis vs Harvest Countdown */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('diagnosis')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'diagnosis'
                ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sprout className="w-4 h-4 text-emerald-700" />
            <span>{locale === 'ha' ? 'Duba Cututtuka' : 'Crop Diagnosis'}</span>
          </button>
          <button
            onClick={() => setActiveTab('harvest')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'harvest'
                ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>{locale === 'ha' ? 'Ƙididdigar Girbi' : 'Harvest Countdown'}</span>
          </button>
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

          {/* Voice Symptom Input Banner */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isListening
                ? 'bg-red-50 border-red-300 ring-2 ring-red-400'
                : 'bg-white border-emerald-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleVoiceListen}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                    isListening
                      ? 'bg-red-600 text-white animate-pulse scale-105'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                  title={isListening ? t(locale, 'stop') : t(locale, 'speakDescribeCrop')}
                >
                  {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <div>
                  <h2 className="font-extrabold text-xs sm:text-sm text-slate-800">
                    {isListening
                      ? (locale === 'ha' ? 'Ana sauraron bayanin shuka...' : 'Listening to crop description...')
                      : (locale === 'ha' ? 'Taɓa domin faɗin matsalar shuka da murya' : 'Tap to speak your crop problem aloud')}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {locale === 'ha'
                      ? 'Misali: "Duhun ganye mai ruwan hoda a albasa", "Tsutsa a masara", "Lankwashewar ganyen tumatir"...'
                      : 'E.g., "Onion purple blotch spots", "Maize armyworm eating leaves", "Tomato leaf curl"...'}
                  </p>
                </div>
              </div>

              {isListening && (
                <span className="text-[11px] font-bold text-red-600 animate-pulse bg-red-100/80 px-2.5 py-1 rounded-full border border-red-200">
                  REC
                </span>
              )}
            </div>

            {(spokenTranscript || recordedVoiceUrl) && (
              <div className="mt-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-emerald-900">
                    {locale === 'ha' ? 'Bayanin Shuka da Murya: ' : 'Crop Voice Note: '}
                  </span>
                  <span className="truncate max-w-[200px] sm:max-w-xs">
                    {spokenTranscript ? `"${spokenTranscript}"` : `${selectedCropCategory.crop} (${selectedDisease ? selectedDisease.name : 'Crop Sound'})`}
                  </span>
                </div>
                <div className="flex items-center space-x-2 ml-2 shrink-0">
                  {recordedVoiceUrl && (
                    <button
                      type="button"
                      onClick={() => voiceService.playAudioUrl(recordedVoiceUrl)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-200 hover:bg-emerald-300 text-emerald-900 transition-colors cursor-pointer"
                      title={locale === 'ha' ? 'Saurari bayanin shuka' : 'Play recorded crop voice note'}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{locale === 'ha' ? 'Saurari Bayanin Shuka' : 'Play Crop Note'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSpokenTranscript('');
                      setRecordedVoiceUrl(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
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

          {/* Camera / Gallery Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleTakePhoto}
              className="flex items-center justify-center space-x-2 py-3 px-3 border border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-50 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
            >
              <Camera className="w-4 h-4 text-emerald-700" />
              <span>{t(locale, 'takePhoto')}</span>
            </button>
            <button
              onClick={handlePickGallery}
              className="flex items-center justify-center space-x-2 py-3 px-3 border border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-50 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
            >
              <ImageIcon className="w-4 h-4 text-emerald-700" />
              <span>{t(locale, 'gallery')}</span>
            </button>
          </div>

          {/* Quick Test Samples */}
          <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
              {locale === 'ha' ? 'Gwada da Samfuran Hotuna:' : 'Or Test with Sample Leaves:'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SAMPLE_LEAVES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSample(sample.uri)}
                  className="p-2 bg-white hover:bg-emerald-50 rounded-lg border border-slate-200 text-left transition-all cursor-pointer flex items-center space-x-2"
                >
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: sample.color }}
                  />
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {locale === 'ha' ? sample.name_hausa : sample.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 
            PRIMARY CALL TO ACTION: ANALYZE CROP BUTTON!
            Always clearly visible so the user can click Analyze before the information is shown!
          */}
          <div className="pt-1">
            <button
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
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                    {t(locale, 'cropResult')}
                  </span>
                  <h3 className="font-black text-lg sm:text-xl text-slate-800 capitalize mt-0.5">
                    {result.referenceDetail
                      ? locale === 'ha'
                        ? result.referenceDetail.hausa_name
                        : result.referenceDetail.name
                      : result.predictions[0]?.label.replace(/_/g, ' ') || 'Assessment'}
                  </h3>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">
                    {selectedCropCategory.crop} ({selectedCropCategory.hausa_name})
                  </div>
                </div>

                {/* Grandma-Friendly Read Aloud Button */}
                <button
                  onClick={handleSpeak}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs ${
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
                onClick={() => setShowManualModal(false)}
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
                        onClick={() => {
                          setSelectedCropId(crop.id);
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
                            {crop.diseases.length} {locale === 'ha' ? 'matsaloli' : 'issues'}
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
                      onClick={() => setModalStep(1)}
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
                      {selectedCropCategory.diseases.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => handleSelectDiseaseOnly(selectedCropCategory, d)}
                          className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all cursor-pointer flex items-start space-x-3 bg-white shadow-2xs"
                        >
                          <img
                            src={d.image}
                            alt={d.name}
                            className="w-12 h-12 rounded-lg object-contain shrink-0 border border-slate-200 bg-slate-50 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-xs sm:text-sm text-slate-800 flex items-center justify-between">
                              <span>{locale === 'ha' ? d.hausa_name : d.name}</span>
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                {locale === 'ha' ? 'Zaɓa' : 'Select'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium mt-0.5 line-clamp-2 leading-snug">
                              {locale === 'ha' ? d.symptoms_hausa : d.symptoms}
                            </p>
                          </div>
                        </div>
                      ))}
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
                onClick={() => setShowManualModal(false)}
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
