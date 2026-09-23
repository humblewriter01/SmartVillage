import React, { useState, useEffect } from 'react';
import {
  Clock,
  Sprout,
  Plus,
  Volume2,
  Calendar,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Language } from '../utils/translations';
import { voiceService } from '../services/voiceService';
import {
  PlantedCrop,
  CROP_HARVEST_PRESETS,
} from './HarvestCountdownCard';

interface HomeHarvestCountdownProps {
  locale: Language;
  onNavigateToCropHarvest: () => void;
}

export const HomeHarvestCountdown: React.FC<HomeHarvestCountdownProps> = ({
  locale,
  onNavigateToCropHarvest,
}) => {
  const [plantings, setPlantings] = useState<PlantedCrop[]>(() => {
    try {
      const saved = localStorage.getItem('smartvillage.harvest_countdowns');
      if (saved) return JSON.parse(saved);
    } catch {}

    // Default: Initial sample plantings for Albasa (Onion) and Masara (Maize)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 38);
    const onionDateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 22);
    const maizeDateStr = twentyDaysAgo.toISOString().split('T')[0];

    const initial: PlantedCrop[] = [
      {
        id: 'initial-onion',
        cropId: 'onion',
        name: 'Onion',
        hausaName: 'Albasa',
        fieldLabel: 'Gonar Fadama (Kano/Sokoto)',
        plantingDate: onionDateStr,
        maturityDays: 110,
        criticalTipsHa:
          'Idan kashi 50% zuwa 70% na wuyan ganyen albasa suka karkata kasa (neck fall), a dakatar da ban ruwa kwanaki 7-10 kafin kwashewa.',
        criticalTipsEn:
          'When 50%-70% of onion necks collapse and fall over, withhold irrigation 7-10 days before pulling bulbs.',
      },
      {
        id: 'initial-maize',
        cropId: 'maize',
        name: 'Maize',
        hausaName: 'Masara',
        fieldLabel: 'Gonar Masara (Kaduna/Zaria)',
        plantingDate: maizeDateStr,
        maturityDays: 100,
        criticalTipsHa:
          'Idan gashin masara ya zama baki kuma kwayar hatsi ta yi tauri tare da baƙin layi a gindinta (black layer), lokacin girbi ya yi.',
        criticalTipsEn:
          'When silks turn dark brown/dry and the black layer forms at kernel tips, grain moisture is ready for harvest.',
      },
    ];

    try {
      localStorage.setItem('smartvillage.harvest_countdowns', JSON.stringify(initial));
    } catch {}

    return initial;
  });

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('onion');
  const [customPlantingDate, setCustomPlantingDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );
  const [customPlotLabel, setCustomPlotLabel] = useState<string>('');
  const [speakingCropId, setSpeakingCropId] = useState<string | null>(null);

  // Sync with localStorage updates across tabs and components
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('smartvillage.harvest_countdowns');
        if (saved) {
          setPlantings((prev) => {
            if (JSON.stringify(prev) === saved) {
              return prev;
            }
            return JSON.parse(saved);
          });
        }
      } catch {}
    };

    window.addEventListener('smartvillage_harvest_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('smartvillage_harvest_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const persistPlantings = (updated: PlantedCrop[]) => {
    setPlantings(updated);
    try {
      localStorage.setItem('smartvillage.harvest_countdowns', JSON.stringify(updated));
      window.dispatchEvent(new Event('smartvillage_harvest_updated'));
    } catch {}
  };

  // Calculate status for countdown
  const calculateCountdown = (plantingDateStr: string, maturityDays: number) => {
    const pDate = new Date(plantingDateStr);
    const today = new Date();
    pDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - pDate.getTime();
    const daysElapsed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, maturityDays - daysElapsed);
    const progressPercent = Math.min(100, Math.round((daysElapsed / maturityDays) * 100));

    const harvestDate = new Date(pDate);
    harvestDate.setDate(harvestDate.getDate() + maturityDays);
    const formattedHarvestDate = harvestDate.toLocaleDateString(
      locale === 'ha' ? 'ha-NG' : 'en-NG',
      { day: 'numeric', month: 'short' }
    );

    let stageHa = 'Shuka da Fitowa';
    let stageEn = 'Sprouting';
    if (progressPercent >= 100) {
      stageHa = 'Lokacin Girbi ya Yi!';
      stageEn = 'Harvest Ready!';
    } else if (progressPercent >= 75) {
      stageHa = 'Balagar Ƙarshe';
      stageEn = 'Maturing';
    } else if (progressPercent >= 40) {
      stageHa = 'Girma da Ƙarfin Ganye';
      stageEn = 'Vegetative Growth';
    } else if (progressPercent >= 15) {
      stageHa = 'Kafa Tushe';
      stageEn = 'Establishment';
    }

    return {
      daysElapsed,
      daysRemaining,
      progressPercent,
      formattedHarvestDate,
      stageHa,
      stageEn,
      isHarvestReady: daysRemaining <= 0,
    };
  };

  const handleAddNewCrop = () => {
    const preset =
      CROP_HARVEST_PRESETS.find((p) => p.cropId === selectedPresetId) ||
      CROP_HARVEST_PRESETS[0];

    const newCrop: PlantedCrop = {
      id: `crop-${Date.now()}`,
      cropId: preset.cropId,
      name: preset.name,
      hausaName: preset.hausaName,
      fieldLabel:
        customPlotLabel.trim() ||
        `${preset.hausaName} (${preset.name})`,
      plantingDate: customPlantingDate,
      maturityDays: preset.maturityDays,
      criticalTipsHa: preset.criticalTipsHa,
      criticalTipsEn: preset.criticalTipsEn,
    };

    const updated = [newCrop, ...plantings];
    persistPlantings(updated);
    setIsAddingNew(false);
    setCustomPlotLabel('');
  };

  const handleDeleteCrop = (id: string) => {
    const updated = plantings.filter((p) => p.id !== id);
    persistPlantings(updated);
  };

  const handleSpeakStatus = async (p: PlantedCrop) => {
    const status = calculateCountdown(p.plantingDate, p.maturityDays);
    const text =
      locale === 'ha'
        ? `Ƙididdigar girbin ${p.hausaName}: Kwanaki ${status.daysRemaining} suka rage kafin girbi. Kashi ${status.progressPercent} ya cika. Ranar girbi: ${status.formattedHarvestDate}. Shawara: ${p.criticalTipsHa}`
        : `Harvest countdown for ${p.name}: ${status.daysRemaining} days remaining until harvest. ${status.progressPercent}% progress. Expected harvest date: ${status.formattedHarvestDate}. Tip: ${p.criticalTipsEn}`;

    setSpeakingCropId(p.id);
    await voiceService.speak(text, locale, undefined, 'crop');
    setSpeakingCropId(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-emerald-200/90 shadow-sm p-4 sm:p-5 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs shrink-0">
            <Clock className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-black text-sm sm:text-base text-slate-800 tracking-tight">
                {locale === 'ha' ? 'Ƙididdigar Kwanakin Girbi' : 'Harvest Countdown'}
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                {plantings.length} {locale === 'ha' ? 'shuki' : 'active'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {locale === 'ha'
                ? 'Bibiyar kwanakin da suka rage kafin girbin albasa, masara da sauran amfanin gona'
                : 'Track days until harvest for your active field crops'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{locale === 'ha' ? 'Sanya Sabo' : 'Track Crop'}</span>
        </button>
      </div>

      {/* Inline Quick-Add Form */}
      {isAddingNew && (
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3 animate-scale-up">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-xs text-emerald-950">
              {locale === 'ha' ? 'Sanya Sabon Shuki don Bibiya:' : 'Track New Planting:'}
            </span>
            <button
              onClick={() => setIsAddingNew(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
            >
              ✕ {locale === 'ha' ? 'Soke' : 'Cancel'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {locale === 'ha' ? 'Irin Shuka' : 'Crop Type'}
              </label>
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="w-full text-xs font-bold p-2 bg-white border border-emerald-300 rounded-xl focus:ring-1 focus:ring-emerald-500"
              >
                {CROP_HARVEST_PRESETS.map((p) => (
                  <option key={p.cropId} value={p.cropId}>
                    {p.hausaName} ({p.name}) - {p.maturityDays} {locale === 'ha' ? 'kwanaki' : 'days'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {locale === 'ha' ? 'Ranar da aka Shuka' : 'Planting Date'}
              </label>
              <input
                type="date"
                value={customPlantingDate}
                onChange={(e) => setCustomPlantingDate(e.target.value)}
                className="w-full text-xs font-bold p-2 bg-white border border-emerald-300 rounded-xl focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder={
                locale === 'ha'
                  ? 'Sunan Gona (misali: Gonar Fadama ta Kano)'
                  : 'Plot Label (e.g., Riverside Onion Plot)'
              }
              value={customPlotLabel}
              onChange={(e) => setCustomPlotLabel(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
            />
          </div>

          <button
            onClick={handleAddNewCrop}
            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
          >
            {locale === 'ha' ? '✓ Fara Ƙididdigar Kwanakin Girbi' : '✓ Start Harvest Countdown'}
          </button>
        </div>
      )}

      {/* Active Crop Countdown Cards */}
      {plantings.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/60">
          <Sprout className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs font-extrabold text-slate-700">
            {locale === 'ha' ? 'Babu shukan da kake bibiya a yanzu' : 'No active crop countdowns yet'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {locale === 'ha'
              ? 'Danna \'Sanya Sabo\' a sama domin fara bibiyar kwanakin albasa ko masara'
              : 'Click \'Track Crop\' above to begin counting down days to harvest'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plantings.map((p) => {
            const status = calculateCountdown(p.plantingDate, p.maturityDays);
            const isSpeaking = speakingCropId === p.id;

            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  status.isHarvestReady
                    ? 'border-amber-400 bg-amber-50/60 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-emerald-300 shadow-2xs'
                }`}
              >
                <div>
                  {/* Top Bar: Name, Hausa Name & Actions */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-black text-sm text-slate-900 truncate">
                          {p.hausaName} ({p.name})
                        </span>
                        {status.isHarvestReady && (
                          <span className="text-[9px] font-black text-amber-900 bg-amber-200 px-1.5 py-0.2 rounded-full border border-amber-300 animate-pulse shrink-0">
                            {locale === 'ha' ? 'Girbi ya Yi!' : 'Ready!'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                        {p.fieldLabel}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {/* Audio listen button */}
                      <button
                        onClick={() => handleSpeakStatus(p)}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          isSpeaking
                            ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                        title={locale === 'ha' ? 'Saurara da Murya' : 'Listen Aloud'}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteCrop(p.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Primary Countdown Number Display */}
                  <div className="mt-2.5 flex items-baseline justify-between bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        {locale === 'ha' ? 'Kwanaki Sun Rage:' : 'Days Left:'}
                      </span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="font-black text-2xl text-emerald-900 leading-none">
                          {status.daysRemaining}
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          {locale === 'ha' ? 'kwanaki' : 'days'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {locale === 'ha' ? 'Ranar Girbi:' : 'Harvest Date:'}
                      </span>
                      <span className="text-xs font-black text-slate-700">
                        {status.formattedHarvestDate}
                      </span>
                    </div>
                  </div>

                  {/* Growth Stage & Progress Bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-extrabold">
                      <span className="text-emerald-900 flex items-center gap-1">
                        <Sprout className="w-3 h-3 text-emerald-600" />
                        <span>{locale === 'ha' ? status.stageHa : status.stageEn}</span>
                      </span>
                      <span className="text-slate-600">{status.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          status.isHarvestReady
                            ? 'bg-amber-500'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${status.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Micro Tip */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="truncate pr-2">
                    {locale === 'ha' ? `Maturity: kwanaki ${p.maturityDays}` : `Full cycle: ${p.maturityDays}d`}
                  </span>
                  <button
                    onClick={onNavigateToCropHarvest}
                    className="text-emerald-700 hover:text-emerald-900 font-bold underline shrink-0 cursor-pointer"
                  >
                    {locale === 'ha' ? 'Cikakken Bayani →' : 'Details →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Navigation Link to Full Harvest Tracker in Crop Screen */}
      <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-xs">
        <span className="text-[11px] text-slate-500 font-medium">
          {locale === 'ha'
            ? 'Ana lissafa kwanakin da alamomin balaga sarai a rumbunka'
            : 'Maturity calculation runs completely offline on your device'}
        </span>
        <button
          onClick={onNavigateToCropHarvest}
          className="flex items-center space-x-1 font-extrabold text-emerald-700 hover:text-emerald-900 cursor-pointer"
        >
          <span>{locale === 'ha' ? 'Duba Cikakken Rumbu' : 'Open Harvest Tracker'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
