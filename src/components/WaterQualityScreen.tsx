import React, { useState, useEffect, useRef } from 'react';
import {
  Droplets,
  Camera,
  Image as ImageIcon,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Flame,
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
import { FullScreenCameraModal } from './FullScreenCameraModal';
import { pickPhotoFromGallery } from '../services/cameraService';
// Inline the illustrative samples so they are available even with no network.
import clearWaterImage from '../assets/water/clear.jpg?inline';
import turbidWaterImage from '../assets/water/turbid.jpg?inline';
import algaeWaterImage from '../assets/water/algae.jpg?inline';

interface WaterQualityScreenProps {
  locale: Language;
  onRecordSaved?: () => void;
}

interface WaterSample {
  id: 'clean' | 'turbid' | 'algae';
  name: string;
  name_hausa: string;
  image: string;
  // Used only by the independent read-aloud button. Sample images use the
  // same offline classifier as photos after the user presses Analyze Water.
  getResult: () => WaterQualityResult;
}

const WATER_SAMPLES: WaterSample[] = [
  {
    id: 'clean',
    name: 'Clean Borehole',
    name_hausa: 'Ruwan Fanfo Mai Tsabta',
    image: clearWaterImage,
    getResult: () => waterQualityService.getCleanBoreholeResult(),
  },
  {
    id: 'turbid',
    name: 'Turbid River Water',
    name_hausa: 'Ruwan Kogin Laka',
    image: turbidWaterImage,
    getResult: () => waterQualityService.getTurbidRiverResult(),
  },
  {
    id: 'algae',
    name: 'Algae Water',
    name_hausa: 'Ruwan Ciyawa mai Kore',
    image: algaeWaterImage,
    getResult: () => waterQualityService.getAlgaeWaterResult(),
  },
];

function sampleSpeech(sample: WaterSample, result: WaterQualityResult, locale: Language): string {
  const exampleWarning = locale === 'ha'
    ? 'Wannan misali ne kawai; ba gwajin ruwanka ba ne.'
    : 'This is only an example, not a test of your water.';
  const name = locale === 'ha' ? sample.name_hausa : sample.name;
  const verdict = locale === 'ha' ? result.verdictTitleHausa : result.verdictTitle;
  const assessment = locale === 'ha' ? result.colorAssessmentHausa : result.colorAssessment;
  const advice = locale === 'ha' ? result.adviceHausa : result.advice;
  return `${exampleWarning} ${name}. ${verdict}. ${assessment} ${advice}`;
}

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
    textEn: 'If algae or chemical pollution is not suspected, boil water for at least 1 minute before drinking.',
    textHa: 'Idan babu zargin ciyawar ruwa ko sinadarai, a tafasa ruwa na aƙalla minti 1 kafin sha.',
  },
  {
    id: 2,
    icon: '🧪',
    textEn: 'For water without suspected algae or chemicals, use WaterGuard as directed if you cannot boil.',
    textHa: 'Idan babu zargin ciyawar ruwa ko sinadarai, yi amfani da WaterGuard bisa umarni idan ba za ka tafasa ba.',
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
  const [resultSource, setResultSource] = useState<'photo' | 'sample' | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState(0);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [galleryError, setGalleryError] = useState(false);
  const previewIdRef = useRef(0);
  const analysisIdRef = useRef(0);
  const galleryRequestIdRef = useRef(0);
  const sampleSpeechIdRef = useRef(0);
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
    return () => { previewIdRef.current++; analysisIdRef.current++; galleryRequestIdRef.current++; sampleSpeechIdRef.current++; };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const saveWaterResult = (res: WaterQualityResult, source: 'photo' | 'sample') => {
    historyService.insert({
      type: 'water',
      createdAt: new Date().toISOString(),
      title: locale === 'ha' ? res.verdictTitleHausa : res.verdictTitle,
      detail: `${source === 'photo' ? 'Photo appearance' : 'Manual example'} (not a safety test) | ${locale === 'ha' ? res.colorAssessmentHausa : res.colorAssessment}`,
      advice: locale === 'ha' ? res.adviceHausa : res.advice,
      // The colour heuristic has no calibrated confidence; do not invent one.
      confidence: 0,
    });
    onRecordSaved?.();
  };

  // Selecting a camera, gallery or example image only prepares its preview.
  const selectImage = (image: string, sample?: WaterSample) => {
    const nextPreviewId = ++previewIdRef.current;
    analysisIdRef.current++;
    galleryRequestIdRef.current++;
    sampleSpeechIdRef.current++;
    setPhotoUrl(image);
    setPreviewId(nextPreviewId);
    setIsPreviewReady(false);
    setPreviewError(false);
    setIsCameraActive(false);
    setSelectedSampleId(sample?.id ?? null);
    setResult(null);
    setResultSource(null);
    setAnalysisError(false);
    setGalleryError(false);
    setIsAnalyzing(false);
    voiceService.stopSpeaking();
    setIsSpeakingWaterHeader(false);
    setIsSpeakingResult(false);
    setIsSpeakingAllTips(false);
    setIsSpeakingSamplesHeader(false);
    setSpeakingSampleId(null);
    setSpeakingTipId(null);
  };

  // The offline canvas analysis and history save happen only after an explicit tap.
  const handleAnalyze = async () => {
    if (!photoUrl || !isPreviewReady || isAnalyzing) return;
    const analysisId = ++analysisIdRef.current;
    const sample = WATER_SAMPLES.find((item) => item.id === selectedSampleId);
    const source = sample ? 'sample' : 'photo';
    sampleSpeechIdRef.current++;
    voiceService.stopSpeaking();
    setIsSpeakingWaterHeader(false);
    setIsSpeakingResult(false);
    setIsSpeakingAllTips(false);
    setIsSpeakingSamplesHeader(false);
    setSpeakingSampleId(null);
    setSpeakingTipId(null);
    setResult(null);
    setResultSource(null);
    setAnalysisError(false);
    setIsAnalyzing(true);
    try {
      const res = await waterQualityService.analyzeWater(photoUrl);
      if (analysisId !== analysisIdRef.current) return;
      setResult(res);
      setResultSource(source);
      saveWaterResult(res, source);

      if (sample) {
        const speechId = ++sampleSpeechIdRef.current;
        setSpeakingSampleId(sample.id);
        // Speak the actual analysis, including the example warning and advice.
        void voiceService.speak(sampleSpeech(sample, res, locale), locale, (warning) => {
          showToast(warning);
        }).catch((error) => {
          console.warn('Water sample speech failed:', error);
        }).finally(() => {
          if (speechId === sampleSpeechIdRef.current) setSpeakingSampleId(null);
        });
      }
    } catch (error) {
      console.warn('Water image analysis failed:', error);
      if (analysisId === analysisIdRef.current) setAnalysisError(true);
    } finally {
      if (analysisId === analysisIdRef.current) setIsAnalyzing(false);
    }
  };

  const handleCapturePhoto = (photo: string) => {
    selectImage(photo);
  };

  const handleOpenCamera = () => {
    galleryRequestIdRef.current++;
    setGalleryError(false);
    setIsCameraActive(true);
  };

  const handleGallery = async () => {
    // Ignore a late picker result after reset, another selection, or unmount.
    // Opening or cancelling the picker must not cancel an existing analysis.
    const requestId = ++galleryRequestIdRef.current;
    setGalleryError(false);
    try {
      const photo = await pickPhotoFromGallery();
      if (requestId === galleryRequestIdRef.current && photo) selectImage(photo);
    } catch (error) {
      console.warn('Gallery picker error:', error);
      if (requestId === galleryRequestIdRef.current) setGalleryError(true);
    }
  };

  const handleToggleWaterReminder = async (type: 'waterguard_30min') => {
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
          ? 'An soke awon minti 30 na WaterGuard.'
          : 'Cancelled 30-minute WaterGuard timer.'
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
        ? 'An saita awon minti 30 na WaterGuard!'
        : '30-minute WaterGuard disinfection timer active!'
    );
  };

  const handleResetWater = () => {
    previewIdRef.current++;
    analysisIdRef.current++;
    galleryRequestIdRef.current++;
    sampleSpeechIdRef.current++;
    setIsAnalyzing(false);
    setIsPreviewReady(false);
    setPreviewError(false);
    setAnalysisError(false);
    setGalleryError(false);
    setPhotoUrl(null);
    setResultSource(null);
    voiceService.stopSpeaking();
    setIsSpeakingWaterHeader(false);
    setIsSpeakingResult(false);
    setIsSpeakingAllTips(false);
    setIsSpeakingSamplesHeader(false);
    setSpeakingSampleId(null);
    setSpeakingTipId(null);
    setSelectedSampleId(null);
    setResult(null);
    showToast(locale === 'ha' ? 'An sake farawa!' : 'Reset complete!');
  };

  const handleSelectSample = (sample: WaterSample) => {
    selectImage(sample.image, sample);
    const speechId = sampleSpeechIdRef.current;
    setSpeakingSampleId(sample.id);
    // Confirm the choice without presenting an unrun analysis as a result.
    const text = locale === 'ha'
      ? `An zaɓi ${sample.name_hausa}. Misali ne kawai, ba gwajin ruwanka ba ne. Danna Bincika Ruwa don duba hoton.`
      : `Selected ${sample.name}. This is only an example, not a test of your water. Tap Analyze Water to check the image.`;
    void voiceService.speak(text, locale, (warning) => showToast(warning)).catch((error) => {
      console.warn('Water sample speech failed:', error);
    }).finally(() => {
      if (speechId === sampleSpeechIdRef.current) setSpeakingSampleId(null);
    });
  };

  // Read Aloud individual sample on clicking speaker icon
  const handleSpeakSampleOnly = async (sample: WaterSample, e: React.MouseEvent) => {
    e.stopPropagation();
    if (speakingSampleId === sample.id) {
      sampleSpeechIdRef.current++;
      voiceService.stopSpeaking();
      setSpeakingSampleId(null);
      return;
    }
    const speechId = ++sampleSpeechIdRef.current;
    voiceService.stopSpeaking();
    setSpeakingSampleId(sample.id);

    const res = sample.getResult();
    await voiceService.speak(sampleSpeech(sample, res, locale), locale, (warning) => {
      showToast(warning);
    });
    if (speechId === sampleSpeechIdRef.current) setSpeakingSampleId(null);
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

    const title = locale === 'ha' ? 'Zaɓi samfurin misali.' : 'Choose a manual example.';
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
    const appearanceText = locale === 'ha' ? result.colorAssessmentHausa : result.colorAssessment;
    const adviceText = locale === 'ha' ? result.adviceHausa : result.advice;
    const disclaimer = locale === 'ha'
      ? 'Hoto ba zai tabbatar da amincin ruwa ba.'
      : 'A photo cannot establish whether water is safe to drink.';
    const sourceText = resultSource === 'sample'
      ? (locale === 'ha' ? 'Wannan misali ne kawai; ba gwajin ruwanka ba ne.' : 'This is only an example, not a test of your water.')
      : '';
    const textToSpeak = `${sourceText} ${titleText}. ${appearanceText} ${disclaimer} ${adviceText}`;

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
        ? 'Tsabtar Ruwa. Duba kamannin ruwa, ko zaɓi samfurin misali. Hoto ba zai tabbatar da amincin ruwa ba.'
        : 'Water Quality. Check the appearance of water or choose an example. A photo cannot establish whether water is safe.';
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
    <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
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
            <h1 className="text-lg sm:text-xl font-extrabold text-[#173326] flex items-center gap-2">
              <Droplets className="w-5 h-5 text-sky-600" />
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
              ? 'Duba kamannin ruwa ba tare da intanet ba; ba gwajin lafiya ba ne.'
              : 'Check water appearance offline; this is not a safety test.'}
          </p>
        </div>

        {/* Header Reset / Start Over Button */}
        {result && (
          <button
            type="button"
            onClick={handleResetWater}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
            aria-label={locale === 'ha' ? 'Sake Farawa' : 'Reset / Start Over'}
            title={locale === 'ha' ? 'Sake Farawa' : 'Reset / Start Over'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden min-[360px]:inline">{locale === 'ha' ? 'Sake Farawa' : 'Reset'}</span>
          </button>
        )}
      </div>

      <FullScreenCameraModal
        isOpen={isCameraActive}
        locale={locale}
        title={locale === 'ha' ? 'Hoton Samfurin Ruwa' : 'Water Sample Camera'}
        onCapture={handleCapturePhoto}
        onClose={() => setIsCameraActive(false)}
      />

      {/* Camera, gallery and sample selections share one preview and analyze action. */}
      <div className="space-y-2">
        <div className="bg-white rounded-2xl border-2 border-dashed border-sky-200 p-3 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
          {photoUrl ? (
            <div className="w-full flex flex-col items-center">
              <img
                key={previewId}
                src={photoUrl}
                alt={locale === 'ha' ? 'Hoton ruwan da za a duba' : 'Water image preview'}
                onLoad={() => {
                  if (previewId === previewIdRef.current) setIsPreviewReady(true);
                }}
                onError={() => {
                  if (previewId === previewIdRef.current) {
                    setIsPreviewReady(false);
                    setPreviewError(true);
                  }
                }}
                className="max-h-28 sm:max-h-40 max-w-full rounded-xl object-contain shadow-xs border border-sky-100"
              />
              <button
                type="button"
                onClick={handleResetWater}
                className="mt-2 text-xs text-red-600 hover:text-red-700 font-bold underline cursor-pointer"
              >
                {locale === 'ha' ? 'Cire wannan hoto' : 'Remove photo'}
              </button>
            </div>
          ) : (
            <div className="text-center p-1 space-y-1">
              <div className="w-9 h-9 bg-sky-50 text-sky-700 rounded-full flex items-center justify-center mx-auto mb-1">
                <Droplets className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-slate-800 font-extrabold text-xs sm:text-sm">
                {locale === 'ha' ? 'Ɗauki ko loda hoton samfurin ruwa' : 'Take or upload a photo of your water sample'}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                {locale === 'ha'
                  ? 'Saka ruwa a kwano mai haske a gaban bango fari. Cika tsakiyar hoton da ruwa.'
                  : 'Place water in a clear container against a white background. Fill the centre of the frame with water.'}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!photoUrl || !isPreviewReady || isAnalyzing}
          aria-busy={isAnalyzing}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-extrabold text-sm shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer"
        >
          <Droplets className="w-5 h-5" />
          <span>{isAnalyzing
            ? (locale === 'ha' ? 'Ana Bincika Ruwa…' : 'Analyzing Water…')
            : (locale === 'ha' ? 'Bincika Ruwa' : 'Analyze Water')}
          </span>
        </button>

        <div className="space-y-1">
          <button
            type="button"
            onClick={handleOpenCamera}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-sky-700 hover:bg-sky-800 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Camera className="w-5 h-5 text-sky-200" />
            <span>{locale === 'ha' ? 'Ɗauki Hoto' : 'Take Photo'}</span>
          </button>
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleGallery}
              className="inline-flex items-center space-x-1.5 py-1.5 px-3 text-xs font-bold text-sky-800 hover:text-sky-950 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>{locale === 'ha' ? 'Zaɓi daga Gallery' : 'Choose from Gallery'}</span>
            </button>
          </div>
        </div>
        {isAnalyzing && <p role="status" className="text-xs text-sky-800 font-semibold">{locale === 'ha' ? 'Ana duba hoto a waya…' : 'Analyzing the image on your device…'}</p>}
        {previewError && <p role="alert" className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{locale === 'ha' ? 'Ba a iya buɗe wannan hoto ba. Zaɓi wani hoto ko samfurin misali.' : 'Could not load this image. Choose another photo or example.'}</p>}
        {analysisError && <p role="alert" className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{locale === 'ha' ? 'Ba a iya duba hoton ba. Sake gwadawa ko zaɓi wani hoto.' : 'Could not analyze the image. Try again or choose another photo.'}</p>}
        {galleryError && <p role="alert" className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{locale === 'ha' ? 'Ba a iya buɗe Gallery ba. Duba izinin hotuna kuma sake gwadawa.' : 'Could not open the gallery. Check photo permissions and try again.'}</p>}
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-white rounded-2xl p-4 border border-sky-200 shadow-sm space-y-3 animate-fade-in">
          {/* Status Header */}
          <div
            className={`p-3 rounded-xl flex flex-col sm:flex-row items-start justify-between gap-2 min-h-[64px] ${
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
                <h3 className="font-extrabold text-sm sm:text-base leading-snug break-words">
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
              className={`shrink-0 flex items-center space-x-1.5 px-3 py-2 ml-10 sm:ml-0 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs ${
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

          <p className="text-xs font-semibold text-slate-600">
            {resultSource === 'photo'
              ? (locale === 'ha' ? 'An duba kamannin hoton a waya kawai.' : 'Photo appearance estimate, processed on this device.')
              : (locale === 'ha' ? 'Samfurin misali ne kawai — ba gwajin ruwanka ba ne.' : 'Manual example only — this does not test your water.')}
          </p>

          {/* Show both languages so the advice is available to everyone nearby. */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-600" />
              <span>{t(locale, 'advice')}</span>
            </h4>
            <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
              <p>{locale === 'ha' ? result.adviceHausa : result.advice}</p>
              <p className="text-slate-600">{locale === 'ha' ? result.advice : result.adviceHausa}</p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs text-amber-950 leading-relaxed" role="note">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>{locale === 'ha' ? 'Ba gwajin lafiya ba ne' : 'Not a water safety test'}</span>
            </div>
            <p>{locale === 'ha'
              ? 'Launi, haske da bango na iya canza sakamako. Hoto ba ya gano ƙwayoyin cuta, guba ko sinadarai. Ruwan da yake da haske ma na iya zama haɗari; a nemi gwajin dakin gwaje-gwaje.'
              : 'Lighting and background affect the result. A photo cannot detect germs, toxins or chemicals. Even clear-looking water can be unsafe; seek a laboratory test.'}</p>
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

      {/* Illustrative example images, with the existing read-aloud controls. */}
      <div className="bg-slate-50/90 rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                {locale === 'ha' ? 'Ko gwada da samfuran ruwa:' : 'Or test with water samples:'}
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
            <p className="text-xs text-slate-500 mt-1">
              {locale === 'ha'
                ? 'Hotunan misali ne kawai; ba gwajin ruwan da kake da shi ba ne.'
                : 'Illustrative examples only; they do not test your water.'}
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

        <div className="grid grid-cols-3 gap-1.5" aria-label={locale === 'ha' ? 'Samfuran ruwa' : 'Water samples'}>
          {WATER_SAMPLES.map((sample) => {
            const isSelected = selectedSampleId === sample.id;
            const isSpeakingThis = speakingSampleId === sample.id;
            return (
              <div
                key={sample.id}
                className={`relative min-w-0 p-1.5 rounded-xl border text-left transition-all shadow-2xs ${
                  isSelected
                    ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-300'
                    : 'bg-white hover:bg-sky-50/50 border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  aria-pressed={isSelected}
                  className="w-full flex flex-col items-start gap-1 min-w-0 text-left cursor-pointer"
                >
                  <img src={sample.image} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200 bg-white" />
                  <span className="w-full min-w-0">
                    <span className="text-[11px] font-bold text-slate-800 leading-tight block break-words">
                      {locale === 'ha' ? sample.name_hausa : sample.name}
                    </span>
                    <span className="text-[10px] text-sky-800 font-semibold leading-tight mt-0.5 block break-words">
                      {locale === 'ha' ? sample.name : sample.name_hausa}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSpeakSampleOnly(sample, e)}
                  aria-label={locale === 'ha' ? `Karanta ${sample.name_hausa} da murya` : `Read ${sample.name} aloud`}
                  className={`absolute top-1 right-1 w-8 h-8 flex items-center justify-center rounded-lg border transition-all cursor-pointer active:scale-95 ${
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

      {/* Water Treatment & Disinfection Reminders */}
      <div className="bg-white rounded-2xl p-4 border border-sky-200 shadow-sm space-y-3">
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

        <div className="grid grid-cols-1 gap-3">
          {/* WaterGuard 30-Minute Chlorination Timer */}
          <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="max-w-md">
              <div className="flex items-center space-x-1.5 font-bold text-xs text-sky-950">
                <Clock className="w-4 h-4 text-sky-700" />
                <span>{locale === 'ha' ? 'Awon Minti 30 na WaterGuard' : '30-Min WaterGuard Timer'}</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {locale === 'ha'
                  ? 'Yi amfani da WaterGuard bisa umarni kawai idan babu zargin ciyawar ruwa ko sinadarai. Jira minti 30; wannan awo ba gwajin lafiya ba ne.'
                  : 'Use WaterGuard as directed only when algae or chemicals are not suspected. Wait 30 minutes; the timer does not verify safety.'}
              </p>
            </div>

            <div className="shrink-0 sm:w-56">
              {reminders['water-waterguard_30min'] ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-white/90 border border-emerald-300 px-2 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{locale === 'ha' ? 'Awo na tafiya: Za a sanar da kai a minti 30' : 'Timer active: You will be alerted in 30 mins'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleWaterReminder('waterguard_30min')}
                    className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs active:scale-95"
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
          </div>
        </div>
      </div>

      {/* Water Safety Tips Section */}
      <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-sm space-y-3">
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
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-sky-50/40 transition-colors flex items-start justify-between gap-2"
              >
                <div className="flex items-start space-x-2 flex-1 min-w-0">
                  <span className="text-xl shrink-0 mt-0.5">{tip.icon}</span>
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
