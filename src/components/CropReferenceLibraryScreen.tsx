import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Volume2,
  ChevronDown,
  ChevronUp,
  Sprout,
  ShieldCheck,
  AlertTriangle,
  Info,
  Check,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import {
  CROP_REFERENCE_DATA,
  CropCategoryReference,
  CropDiseaseReference,
} from '../data/cropReferenceData';
import { voiceService } from '../services/voiceService';

interface CropReferenceLibraryScreenProps {
  locale: Language;
  onSelectDiseaseForCropScreen?: (crop: CropCategoryReference, disease: CropDiseaseReference) => void;
}

export const CropReferenceLibraryScreen: React.FC<CropReferenceLibraryScreenProps> = ({
  locale,
  onSelectDiseaseForCropScreen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCropId, setSelectedCropId] = useState<string>('onion');
  const [expandedDiseaseId, setExpandedDiseaseId] = useState<string | null>('onion_alternaria');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSpeakDisease = async (disease: CropDiseaseReference) => {
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const name = locale === 'ha' ? disease.hausa_name : disease.name;
    const symptoms = locale === 'ha' ? disease.symptoms_hausa : disease.symptoms;
    const treatment = locale === 'ha' ? disease.treatment_hausa : disease.treatment;
    const speech = `${name}. ${symptoms}. ${treatment}`;

    await voiceService.speak(speech, locale, (warning) => {
      showToast(warning);
    });
    setIsSpeaking(false);
  };

  const currentCrop =
    CROP_REFERENCE_DATA.find((c) => c.id === selectedCropId) || CROP_REFERENCE_DATA[0];

  const filteredDiseases = currentCrop.diseases.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.hausa_name.toLowerCase().includes(q) ||
      d.causes.toLowerCase().includes(q) ||
      d.symptoms.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Screen Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#173326] flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-emerald-600" />
          <span>{t(locale, 'referenceLibraryTitle')}</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {locale === 'ha'
            ? 'Cikakken littafin hotuna da shawarwarin cututtukan amfanin gona ba tare da intanet ba'
            : 'Offline visual atlas with symptoms, pathogen details, treatment & prevention'}
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            locale === 'ha'
              ? 'Bincika cuta, kwayar cuta, ko alama…'
              : 'Search plant disease, pathogen, symptom…'
          }
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm text-slate-800 shadow-xs"
        />
      </div>

      {/* Crop Categories Horizontal Scroll */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        {CROP_REFERENCE_DATA.map((crop) => {
          const isSelected = selectedCropId === crop.id;
          return (
            <button
              key={crop.id}
              onClick={() => {
                setSelectedCropId(crop.id);
                setExpandedDiseaseId(crop.diseases[0]?.id || null);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>
                {crop.crop || crop.name} ({crop.hausa_name})
              </span>
            </button>
          );
        })}
      </div>

      {/* Crop Information Banner */}
      <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-base text-slate-800">
            {currentCrop.crop || currentCrop.name} ({currentCrop.hausa_name})
          </h2>
          <span className="text-xs text-slate-500">
            {locale === 'ha' ? currentCrop.description_hausa : currentCrop.description}
          </span>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 shrink-0 ml-2">
          {currentCrop.diseases.length} {locale === 'ha' ? 'Cututtuka' : 'Diseases'}
        </span>
      </div>

      {/* Disease Cards List */}
      <div className="space-y-3">
        {filteredDiseases.map((disease) => {
          const isExpanded = expandedDiseaseId === disease.id;

          return (
            <div
              key={disease.id}
              className="bg-white rounded-2xl border border-emerald-100 hover:border-emerald-300 shadow-xs transition-all overflow-hidden"
            >
              {/* Card Header Accordion */}
              <div
                onClick={() => setExpandedDiseaseId(isExpanded ? null : disease.id)}
                className="p-4 flex items-center justify-between cursor-pointer bg-white hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {/* SVG Illustration Thumbnail */}
                  <img
                    src={disease.image}
                    alt={disease.name}
                    className="w-12 h-12 rounded-xl object-contain shrink-0 border border-slate-200 shadow-2xs bg-slate-50"
                  />
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                      {locale === 'ha' ? disease.hausa_name : disease.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {locale === 'ha' ? disease.causes_hausa : disease.causes}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeakDisease(disease);
                    }}
                    className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer"
                    title={t(locale, 'speakResult')}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Detailed Section */}
              {isExpanded && (
                <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-3.5 text-xs sm:text-sm animate-fade-in">
                  {/* Large Diagram Display */}
                  <div className="flex justify-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <img
                      src={disease.image}
                      alt={disease.name}
                      className="w-32 h-32 rounded-lg object-contain shadow-xs"
                    />
                  </div>

                  {/* Symptoms */}
                  <div>
                    <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      {t(locale, 'symptoms')}
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      {locale === 'ha' ? disease.symptoms_hausa : disease.symptoms}
                    </p>
                  </div>

                  {/* Causes */}
                  <div>
                    <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      {t(locale, 'causes')}
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      {locale === 'ha' ? disease.causes_hausa : disease.causes}
                    </p>
                  </div>

                  {/* Recommended Treatment */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                    <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{t(locale, 'treatment')}</span>
                    </h4>
                    <p className="text-emerald-950 leading-relaxed">
                      {locale === 'ha' ? disease.treatment_hausa : disease.treatment}
                    </p>
                  </div>

                  {/* Prevention */}
                  <div>
                    <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      {t(locale, 'preventionTips')}
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      {locale === 'ha' ? disease.prevention_hausa : disease.prevention}
                    </p>
                  </div>

                  {/* Manual Selector Button */}
                  {onSelectDiseaseForCropScreen && (
                    <button
                      onClick={() => onSelectDiseaseForCropScreen(currentCrop, disease)}
                      className="w-full mt-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {locale === 'ha'
                          ? 'Yi amfani da wannan a shafin bincike'
                          : 'Use for Diagnosis on Crop Screen'}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
