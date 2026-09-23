import React, { useState, useEffect } from 'react';
import {
  Layers,
  Droplets,
  Sprout,
  Plus,
  Trash2,
  Volume2,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  History,
  Calendar,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { Language } from '../utils/translations';
import {
  soilService,
  SoilRecord,
  CROP_SOIL_REQUIREMENTS,
  evaluateSoilConditions,
} from '../services/soilService';
import { voiceService } from '../services/voiceService';

interface SoilHealthScreenProps {
  locale: Language;
}

export const SoilHealthScreen: React.FC<SoilHealthScreenProps> = ({ locale }) => {
  const [records, setRecords] = useState<SoilRecord[]>(() => soilService.getRecords());
  const [showLogForm, setShowLogForm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [plotName, setPlotName] = useState('Gona ta Farko (Plot 1)');
  const [selectedCropId, setSelectedCropId] = useState('soybeans');
  const [ph, setPh] = useState(6.4);
  const [moisture, setMoisture] = useState(55);
  const [soilType, setSoilType] = useState<SoilRecord['soilType']>('sandy_loam');
  const [notes, setNotes] = useState('');

  // Selected Record Modal or Expanded view
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setRecords(soilService.getRecords());
    };
    window.addEventListener('smartvillage_soil_updated', handleUpdate);
    return () => window.removeEventListener('smartvillage_soil_updated', handleUpdate);
  }, []);

  const activeCropReq =
    CROP_SOIL_REQUIREMENTS.find((c) => c.cropId === selectedCropId) ||
    CROP_SOIL_REQUIREMENTS[0];

  // Dynamic preview evaluation
  const liveAdvice = evaluateSoilConditions(selectedCropId, ph, moisture);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    soilService.addRecord(plotName, selectedCropId, ph, moisture, soilType, notes);
    setRecords(soilService.getRecords());
    setShowLogForm(false);
    showToast(
      locale === 'ha'
        ? 'An yi nasarar adana gwajin ƙasa!'
        : 'Soil test record successfully saved!'
    );
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soilService.deleteRecord(id);
    setRecords(soilService.getRecords());
    showToast(locale === 'ha' ? 'An goge bayanin.' : 'Record deleted.');
  };

  const handleSpeakAdvice = (recordAdvice = liveAdvice, cropName = activeCropReq.name, cropHa = activeCropReq.hausaName) => {
    const text =
      locale === 'ha'
        ? `Shawarar ƙasa ga ${cropHa}: ${recordAdvice.phAdviceHa} ${recordAdvice.moistureAdviceHa}`
        : `Soil advice for ${cropName}: ${recordAdvice.phAdviceEn} ${recordAdvice.moistureAdviceEn}`;
    voiceService.speak(text, locale);
  };

  // Color helper for pH
  const getPhColorClass = (val: number) => {
    if (val < 5.5) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (val < 6.0) return 'text-amber-600 bg-amber-50 border-amber-200';
    if (val <= 7.2) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (val <= 7.8) return 'text-teal-700 bg-teal-50 border-teal-200';
    return 'text-purple-700 bg-purple-50 border-purple-200';
  };

  // Color helper for Moisture
  const getMoistureColorClass = (val: number) => {
    if (val < 35) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (val < 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    if (val <= 75) return 'text-sky-700 bg-sky-50 border-sky-200';
    return 'text-indigo-700 bg-indigo-50 border-indigo-200';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-emerald-100 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{locale === 'ha' ? 'Kula da Lafiyar Ƙasa' : 'Soil Health & Moisture'}</span>
              </h1>
              <p className="text-xs text-slate-500">
                {locale === 'ha'
                  ? 'Gwajin pH, auna laima, da shawarwarin takin gargajiya da toka'
                  : 'Track pH, moisture levels over time & get crop-specific soil remedies'}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          className="flex items-center justify-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-xs active:scale-95 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{showLogForm ? (locale === 'ha' ? 'Rufe Fom' : 'Close Form') : (locale === 'ha' ? 'Yi Sabon Gwaji' : 'Log Soil Test')}</span>
        </button>
      </div>

      {/* Interactive Soil Test Logger Form */}
      {showLogForm && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl p-5 border-2 border-emerald-300 shadow-md space-y-4 animate-scale-up"
        >
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                {locale === 'ha' ? 'Rubuta Sabon Gwajin Ƙasa' : 'Record New Soil Test'}
              </h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Live Analysis
            </span>
          </div>

          {/* Plot Name & Crop Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                {locale === 'ha' ? 'Sunan Gona / Shuka:' : 'Plot / Farmland Name:'}
              </label>
              <input
                type="text"
                required
                value={plotName}
                onChange={(e) => setPlotName(e.target.value)}
                placeholder="e.g. North Plot - Soybeans"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
                {locale === 'ha' ? 'Amfanin Gonar da Ake Dubawa:' : 'Target Crop for Plot:'}
              </label>
              <select
                value={selectedCropId}
                onChange={(e) => setSelectedCropId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {CROP_SOIL_REQUIREMENTS.map((c) => (
                  <option key={c.cropId} value={c.cropId}>
                    {c.emoji} {c.name} ({c.hausaName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive pH Slider with Gauge */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-slate-800 block">
                  {locale === 'ha' ? 'Ma\'aunin Tsamin Ƙasa (Soil pH):' : 'Soil pH Level:'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeCropReq.name} target: {activeCropReq.optimalPhMin} - {activeCropReq.optimalPhMax} pH
                </span>
              </div>
              <div
                className={`font-black text-sm px-3 py-1 rounded-xl border ${getPhColorClass(
                  ph
                )}`}
              >
                pH {ph.toFixed(1)}
              </div>
            </div>

            <input
              type="range"
              min="4.0"
              max="9.0"
              step="0.1"
              value={ph}
              onChange={(e) => setPh(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-gradient-to-r from-red-500 via-emerald-500 to-purple-600 rounded-lg appearance-none cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-bold px-1">
              <span>4.0 (Acidic)</span>
              <span>6.0 - 7.0 (Optimal)</span>
              <span>9.0 (Alkaline)</span>
            </div>
          </div>

          {/* Interactive Moisture Slider with Gauge */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-slate-800 block">
                  {locale === 'ha' ? 'Laimar Ƙasa (Soil Moisture %):' : 'Soil Moisture %:'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeCropReq.name} target: {activeCropReq.optimalMoistureMin}% - {activeCropReq.optimalMoistureMax}%
                </span>
              </div>
              <div
                className={`font-black text-sm px-3 py-1 rounded-xl border ${getMoistureColorClass(
                  moisture
                )}`}
              >
                {moisture}% Moisture
              </div>
            </div>

            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={moisture}
              onChange={(e) => setMoisture(parseInt(e.target.value, 10))}
              className="w-full h-2.5 bg-gradient-to-r from-orange-400 via-sky-500 to-indigo-700 rounded-lg appearance-none cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-bold px-1">
              <span>10% (Dry / Fari)</span>
              <span>55% (Ideal)</span>
              <span>100% (Saturated)</span>
            </div>
          </div>

          {/* Soil Texture / Type Selection */}
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1.5">
              {locale === 'ha' ? 'Nau\'in Ƙasa (Soil Texture):' : 'Soil Texture Type:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'sandy_loam', labelEn: 'Sandy-Loam', labelHa: 'Yashi da Laushi' },
                { id: 'loamy', labelEn: 'Rich Loam', labelHa: 'Ƙasa mai Laushi' },
                { id: 'clay', labelEn: 'Clay / Heavy', labelHa: 'Ƙasa mai Danko' },
                { id: 'sandy', labelEn: 'Coarse Sand', labelHa: 'Yashi Zalla' },
              ].map((type) => {
                const isSelected = soilType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSoilType(type.id as SoilRecord['soilType'])}
                    className={`py-2 px-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div>{locale === 'ha' ? type.labelHa : type.labelEn}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes field */}
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-600 block mb-1">
              {locale === 'ha' ? 'Karin Lura ko Takin da Aka Sanya:' : 'Field Notes / Applied Amendments:'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Broadcast wood ash 2 weeks ago; good seedling vigor"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Live Analysis Preview Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <span>{activeCropReq.emoji}</span>
                <span>
                  {locale === 'ha'
                    ? `Binciken Ƙasa na Nan Take ga ${activeCropReq.hausaName}`
                    : `Instant Diagnosis for ${activeCropReq.name}`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleSpeakAdvice()}
                className="text-xs text-emerald-800 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-2xs"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{locale === 'ha' ? 'Saurara' : 'Listen'}</span>
              </button>
            </div>

            <div className="text-xs text-slate-800 space-y-1.5 leading-relaxed">
              <p>
                <strong className="text-emerald-950">
                  {locale === 'ha' ? 'Tsamin Ƙasa (pH): ' : 'pH Remedy: '}
                </strong>
                {locale === 'ha' ? liveAdvice.phAdviceHa : liveAdvice.phAdviceEn}
              </p>
              <p>
                <strong className="text-emerald-950">
                  {locale === 'ha' ? 'Laimar Ƙasa: ' : 'Moisture Remedy: '}
                </strong>
                {locale === 'ha' ? liveAdvice.moistureAdviceHa : liveAdvice.moistureAdviceEn}
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              {locale === 'ha' ? 'Soke' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
            >
              {locale === 'ha' ? 'Ajiye a Tarihi' : 'Save Soil Record'}
            </button>
          </div>
        </form>
      )}

      {/* Agronomic Crop pH Reference Quick Strip */}
      <div className="bg-white rounded-3xl p-4 border border-emerald-100 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Sprout className="w-4 h-4 text-emerald-600" />
            <span>{locale === 'ha' ? 'Matsayin pH da Ya Dace da Shuke-shuke' : 'Crop Optimal pH Benchmarks'}</span>
          </h2>
          <span className="text-[10px] text-slate-500 font-bold">Savanna Soils</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CROP_SOIL_REQUIREMENTS.slice(0, 4).map((c) => (
            <div
              key={c.cropId}
              onClick={() => {
                setSelectedCropId(c.cropId);
                setShowLogForm(true);
              }}
              className="bg-slate-50 hover:bg-emerald-50/70 p-2.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-1.5 mb-1">
                <span className="text-base">{c.emoji}</span>
                <span className="text-xs font-bold text-slate-800 truncate">{c.name}</span>
              </div>
              <div className="text-[10px] font-black text-emerald-800">
                pH {c.optimalPhMin} - {c.optimalPhMax}
              </div>
              <div className="text-[9px] text-slate-500 truncate">
                {c.optimalMoistureMin}-{c.optimalMoistureMax}% moisture
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logged Soil Readings Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-emerald-700" />
            <h2 className="font-extrabold text-sm text-slate-800">
              {locale === 'ha' ? 'Tarihin Gwaje-gwajen Ƙasa' : 'Soil Test Log & History'}
            </h2>
            <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              {records.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-semibold">
            {locale === 'ha' ? 'An jera daga na kusa' : 'Sorted by latest'}
          </span>
        </div>

        {records.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-300 text-center space-y-2">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {locale === 'ha' ? 'Babu bayanan gwajin ƙasa tukuna' : 'No soil tests recorded yet'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {locale === 'ha'
                ? 'Danna \'Yi Sabon Gwaji\' domin auna tsamin ƙasa da laima don samun shawarwari.'
                : 'Click \'Log Soil Test\' to measure your soil acidity, moisture, and get customized remedies.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((r) => {
              const isExpanded = expandedRecordId === r.id;
              const dateStr = new Date(r.createdAt).toLocaleDateString(
                locale === 'ha' ? 'ha-NG' : 'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }
              );

              return (
                <div
                  key={r.id}
                  onClick={() => setExpandedRecordId(isExpanded ? null : r.id)}
                  className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 shadow-2xs transition-all cursor-pointer space-y-3"
                >
                  {/* Top Bar of Record */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-slate-900">{r.plotName}</span>
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {locale === 'ha' ? r.cropHausaName : r.cropName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span className="capitalize">{r.soilType.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={(e) => handleDelete(r.id, e)}
                        title="Delete Record"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Badges Bar: pH, Moisture, Overall Status */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`font-black px-2.5 py-1 rounded-xl border ${getPhColorClass(
                        r.ph
                      )}`}
                    >
                      pH {r.ph.toFixed(1)}
                    </span>
                    <span
                      className={`font-black px-2.5 py-1 rounded-xl border ${getMoistureColorClass(
                        r.moisture
                      )}`}
                    >
                      {r.moisture}% Moisture
                    </span>
                    <span
                      className={`font-bold px-2 py-1 rounded-xl border text-[11px] ${
                        r.advice.overallRating === 'excellent'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : r.advice.overallRating === 'good'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : r.advice.overallRating === 'fair'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {locale === 'ha'
                        ? r.advice.overallRating === 'excellent'
                          ? 'Madalla (Kyakkyawa)'
                          : r.advice.overallRating === 'good'
                          ? 'Yana da Kyau'
                          : r.advice.overallRating === 'fair'
                          ? 'Matsakaici'
                          : 'Yana Bukatar Gyara'
                        : `${r.advice.overallRating.toUpperCase()} Condition`}
                    </span>
                  </div>

                  {/* Notes summary */}
                  {r.notes && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                      "{r.notes}"
                    </div>
                  )}

                  {/* Expandable Detailed Advice */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-800 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-emerald-950 text-xs">
                          {locale === 'ha' ? 'Cikakken Jagoran Gyaran Ƙasa:' : 'Soil Improvement Guidance:'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpeakAdvice(r.advice, r.cropName, r.cropHausaName);
                          }}
                          className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{locale === 'ha' ? 'Saurari Shawara' : 'Listen'}</span>
                        </button>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 leading-relaxed">
                        <div>
                          <strong className="text-slate-900 block font-bold mb-0.5">
                            {locale === 'ha' ? '1. Gyaran Tsami (pH):' : '1. Soil pH Amendment:'}
                          </strong>
                          <p className="text-slate-700">
                            {locale === 'ha' ? r.advice.phAdviceHa : r.advice.phAdviceEn}
                          </p>
                        </div>
                        <div>
                          <strong className="text-slate-900 block font-bold mb-0.5">
                            {locale === 'ha' ? '2. Kula da Laima da Ban Ruwa:' : '2. Moisture & Irrigation Strategy:'}
                          </strong>
                          <p className="text-slate-700">
                            {locale === 'ha' ? r.advice.moistureAdviceHa : r.advice.moistureAdviceEn}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-right">
                    <span className="text-[10px] text-emerald-700 font-bold hover:underline">
                      {isExpanded
                        ? (locale === 'ha' ? 'Rage Cikakken Bayani ▲' : 'Show Less ▲')
                        : (locale === 'ha' ? 'Duba Shawara Cikakkiya ▼' : 'View Full Advice ▼')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
