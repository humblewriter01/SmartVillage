import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Sprout,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Language } from '../utils/translations';
import { voiceService } from '../services/voiceService';

export interface PlantedCrop {
  id: string;
  cropId: string;
  name: string;
  hausaName: string;
  fieldLabel: string;
  plantingDate: string; // YYYY-MM-DD
  maturityDays: number;
  criticalTipsHa: string;
  criticalTipsEn: string;
}

export const CROP_HARVEST_PRESETS: Array<{
  cropId: string;
  name: string;
  hausaName: string;
  maturityDays: number;
  criticalTipsHa: string;
  criticalTipsEn: string;
}> = [
  {
    cropId: 'onion',
    name: 'Onion',
    hausaName: 'Albasa',
    maturityDays: 110,
    criticalTipsHa:
      'Idan kashi 50% zuwa 70% na wuyan ganyen albasa suka karkata kasa (neck fall), a dakatar da ban ruwa kwanaki 7-10 kafin kwashewa domin kada su rube a rumbu.',
    criticalTipsEn:
      'When 50%-70% of onion necks collapse and fall over, withhold irrigation 7-10 days before pulling bulbs to ensure thick skins and prevent rot.',
  },
  {
    cropId: 'maize',
    name: 'Maize',
    hausaName: 'Masara',
    maturityDays: 100,
    criticalTipsHa:
      'Idan gashin masara ya zama baki kuma kwayar hatsi ta yi tauri tare da baƙin layi a gindinta (black layer), lokacin girbi ya yi.',
    criticalTipsEn:
      'When silks turn dark brown/dry and the black layer forms at kernel tips, grain moisture is ready for harvest.',
  },
  {
    cropId: 'tomato',
    name: 'Tomato',
    hausaName: 'Tumatir',
    maturityDays: 80,
    criticalTipsHa:
      'A tsinke tumatir da sassafe idan ya fara nuna ruwan hoda ko ja (breaker stage) don kada zafin rana ya lalata shi kafin zuwa kasuwa.',
    criticalTipsEn:
      'Harvest in early morning when fruits reach the pink/breaker stage to maintain shelf life during transport.',
  },
  {
    cropId: 'rice',
    name: 'Rice',
    hausaName: 'Shinkafa',
    maturityDays: 120,
    criticalTipsHa:
      'Lokacin da kashi 80% na hatsin zangarniyar shinkafa ya zama launin zinare (dorawa), a fara girbi don hana zubar hatsi a gona.',
    criticalTipsEn:
      'Harvest when 80%-85% of panicle grains turn straw gold to minimize shattering and lodging losses.',
  },
  {
    cropId: 'sorghum',
    name: 'Sorghum',
    hausaName: 'Dawa',
    maturityDays: 120,
    criticalTipsHa:
      'A girbe dawa idan kwayar hatsi ta bushe sosai kuma tsuntsaye ba za su iya huda ta ba.',
    criticalTipsEn:
      'Harvest panicles when grain moisture drops below 20% and seed firmness resists fingernail denting.',
  },
  {
    cropId: 'cowpea',
    name: 'Cowpea (Beans)',
    hausaName: 'Wake',
    maturityDays: 70,
    criticalTipsHa:
      'A kwashe ɓawon waken da suka bushe akai-akai domin kariya daga kwari da ruwan sama na makara.',
    criticalTipsEn:
      'Pick mature dry pods in rounds every few days to protect seeds from pod borers and late rains.',
  },
  {
    cropId: 'groundnut',
    name: 'Groundnut',
    hausaName: 'Gyada',
    maturityDays: 100,
    criticalTipsHa:
      'A cire gyada idan cikin kwasfar ya yi duhun ruwan kasa kuma ganyen ya fara bushewa.',
    criticalTipsEn:
      'Lift vines when inner pod shells develop dark brown markings and lower foliage begins yellowing.',
  },
  {
    cropId: 'wheat',
    name: 'Wheat',
    hausaName: 'Alkama',
    maturityDays: 100,
    criticalTipsHa:
      'A duba zangarniya idan ta bushe sarai ta yi launi mai haske kafin zafin watan Maris ya yi yawa.',
    criticalTipsEn:
      'Harvest irrigated wheat before high March temperatures cause shattering and shriveling.',
  },
  {
    cropId: 'soybeans',
    name: 'Soybeans',
    hausaName: 'Waken Soya',
    maturityDays: 105,
    criticalTipsHa:
      'A girbe waken soya da zaran kashi 90% na ganyen ya zube kuma kwasfar ta bushe zuwa launin ruwan kasa. Idan aka jinkirta kwasfar na fashewa tana zubar da iri.',
    criticalTipsEn:
      'Harvest when 90% of leaves drop and pods turn golden-brown and rattle. Avoid over-drying in the field to prevent severe pod shattering losses.',
  },
];

interface HarvestCountdownCardProps {
  locale: Language;
  selectedCropId?: string;
  onSelectCrop?: (cropId: string) => void;
}

export const HarvestCountdownCard: React.FC<HarvestCountdownCardProps> = ({
  locale,
  selectedCropId,
  onSelectCrop,
}) => {
  const [plantings, setPlantings] = useState<PlantedCrop[]>(() => {
    try {
      const saved = localStorage.getItem('smartvillage.harvest_countdowns');
      if (saved) return JSON.parse(saved);
    } catch {}

    // Default: Initial sample plantings for Albasa (Onion) and Masara
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 38);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    return [
      {
        id: 'initial-onion',
        cropId: 'onion',
        name: 'Onion',
        hausaName: 'Albasa',
        fieldLabel: 'Gonar Albasa (Kano/Sokoto)',
        plantingDate: dateStr,
        maturityDays: 110,
        criticalTipsHa:
          'Idan kashi 50% zuwa 70% na wuyan ganyen albasa suka karkata kasa (neck fall), a dakatar da ban ruwa kwanaki 7-10 kafin kwashewa.',
        criticalTipsEn:
          'When 50%-70% of onion necks collapse and fall over, withhold irrigation 7-10 days before pulling bulbs.',
      },
    ];
  });

  const [activeCropId, setActiveCropId] = useState<string>(selectedCropId || 'onion');
  const [customPlantingDate, setCustomPlantingDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [fieldLabel, setFieldLabel] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);

  // Sync with selectedCropId prop if provided
  useEffect(() => {
    if (selectedCropId) {
      setActiveCropId(selectedCropId);
    }
  }, [selectedCropId]);

  // Listen for sync from HomeScreen or other tabs with equality guard
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

  const persistUpdatedPlantings = (updated: PlantedCrop[]) => {
    setPlantings(updated);
    try {
      localStorage.setItem('smartvillage.harvest_countdowns', JSON.stringify(updated));
      window.dispatchEvent(new Event('smartvillage_harvest_updated'));
    } catch {}
  };

  // Calculate countdown status
  const calculateStatus = (plantingDateStr: string, maturityDays: number) => {
    const pDate = new Date(plantingDateStr);
    const today = new Date();
    // Normalize to midnight
    pDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - pDate.getTime();
    const daysElapsed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, maturityDays - daysElapsed);
    const progressPercent = Math.min(100, Math.round((daysElapsed / maturityDays) * 100));

    // Expected harvest date
    const harvestDate = new Date(pDate);
    harvestDate.setDate(harvestDate.getDate() + maturityDays);
    const formattedHarvestDate = harvestDate.toLocaleDateString(
      locale === 'ha' ? 'ha-NG' : 'en-NG',
      { day: 'numeric', month: 'short', year: 'numeric' }
    );

    // Growth stage
    let stageHa = 'Shuka da Fitowa';
    let stageEn = 'Germination & Sprouting';
    if (progressPercent >= 100) {
      stageHa = 'Lokacin Girbi ya Yi!';
      stageEn = 'Harvest Ready!';
    } else if (progressPercent >= 75) {
      stageHa = 'Balagar Ƙarshe da Kafa Kai';
      stageEn = 'Maturation & Sizing';
    } else if (progressPercent >= 40) {
      stageHa = 'Girma da Ƙarfin Ganye';
      stageEn = 'Vegetative Growth';
    } else if (progressPercent >= 15) {
      stageHa = 'Cire Ciyawa da Karin Ƙasa';
      stageEn = 'Early Establishment';
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

  const handleAddNew = () => {
    const preset =
      CROP_HARVEST_PRESETS.find(
        (p) =>
          p.cropId === activeCropId ||
          (p.cropId === 'soybeans' && activeCropId === 'soybean') ||
          (p.cropId === 'soybean' && activeCropId === 'soybeans')
      ) || CROP_HARVEST_PRESETS[0];
    const newPlanting: PlantedCrop = {
      id: `crop-${Date.now()}`,
      cropId: preset.cropId,
      name: preset.name,
      hausaName: preset.hausaName,
      fieldLabel: fieldLabel.trim() || `${preset.hausaName} (${preset.name})`,
      plantingDate: customPlantingDate,
      maturityDays: preset.maturityDays,
      criticalTipsHa: preset.criticalTipsHa,
      criticalTipsEn: preset.criticalTipsEn,
    };

    const updated = [newPlanting, ...plantings];
    persistUpdatedPlantings(updated);
    setIsAddingNew(false);
    setFieldLabel('');
    if (onSelectCrop) onSelectCrop(preset.cropId);
  };

  const handleDelete = (id: string) => {
    const updated = plantings.filter((p) => p.id !== id);
    persistUpdatedPlantings(updated);
  };

  const handleSpeakCountdown = async (planting: PlantedCrop) => {
    const status = calculateStatus(planting.plantingDate, planting.maturityDays);
    const textToSpeak =
      locale === 'ha'
        ? `Ƙididdigar girbin ${planting.hausaName}: Kwanaki ${status.daysRemaining} suka rage kafin girbi. Kashi ${status.progressPercent} na girman shuka ya cika. Mataki: ${status.stageHa}. Shawara: ${planting.criticalTipsHa}`
        : `Harvest countdown for ${planting.name}: ${status.daysRemaining} days remaining until harvest. ${status.progressPercent}% maturity reached. Stage: ${status.stageEn}. Note: ${planting.criticalTipsEn}`;

    setIsSpeakingId(planting.id);
    await voiceService.speak(textToSpeak, locale);
    setIsSpeakingId(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs">
            <Clock className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-1.5">
              <span>{locale === 'ha' ? 'Ƙididdigar Kwanakin Girbi' : 'Harvest Countdown'}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {plantings.length} {locale === 'ha' ? 'shuki' : 'active'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {locale === 'ha'
                ? 'Bibiyar kwanakin da suka rage kafin girbin albasa, masara, da sauran amfanin gona'
                : 'Track days left to harvest, maturity stages & readiness signs'}
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

      {/* Add New Planting Form */}
      {isAddingNew && (
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 animate-scale-up">
          <div className="font-bold text-xs text-emerald-950 flex items-center justify-between">
            <span>{locale === 'ha' ? 'Sanya Sabuwar Shuka:' : 'Track New Planting:'}</span>
            <button
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-normal"
            >
              ✕ {locale === 'ha' ? 'Soke' : 'Cancel'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Crop Type */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                {locale === 'ha' ? 'Irin Shuka' : 'Crop Type'}
              </label>
              <select
                value={activeCropId}
                onChange={(e) => setActiveCropId(e.target.value)}
                className="w-full text-xs font-bold p-2 bg-white border border-emerald-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
              >
                {CROP_HARVEST_PRESETS.map((p) => (
                  <option key={p.cropId} value={p.cropId}>
                    {p.name} ({p.hausaName}) - {p.maturityDays} {locale === 'ha' ? 'kwanaki' : 'days'}
                  </option>
                ))}
              </select>
            </div>

            {/* Planting Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                {locale === 'ha' ? 'Ranar da aka Shuka' : 'Planting Date'}
              </label>
              <input
                type="date"
                value={customPlantingDate}
                onChange={(e) => setCustomPlantingDate(e.target.value)}
                className="w-full text-xs font-bold p-2 bg-white border border-emerald-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Quick Date Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px]">
            <span className="text-slate-500 font-semibold">{locale === 'ha' ? 'Gajerun Hanyoyi:' : 'Quick:'}</span>
            <button
              type="button"
              onClick={() => setCustomPlantingDate(new Date().toISOString().split('T')[0])}
              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {locale === 'ha' ? 'Yau' : 'Today'}
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 20);
                setCustomPlantingDate(d.toISOString().split('T')[0]);
              }}
              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {locale === 'ha' ? 'Kwanaki 20 baya' : '20d ago'}
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 40);
                setCustomPlantingDate(d.toISOString().split('T')[0]);
              }}
              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {locale === 'ha' ? 'Kwanaki 40 baya' : '40d ago'}
            </button>
          </div>

          {/* Optional Plot Name */}
          <div>
            <input
              type="text"
              placeholder={
                locale === 'ha'
                  ? 'Sunan Gona (misali: Gonar Fadama ta Kano)'
                  : 'Plot Label (e.g. Riverbank Onion Plot)'
              }
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
            />
          </div>

          <button
            onClick={handleAddNew}
            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer"
          >
            {locale === 'ha' ? '✓ Fara Ƙididdigar Kwanaki' : '✓ Start Harvest Countdown'}
          </button>
        </div>
      )}

      {/* List of Tracked Plantings */}
      <div className="space-y-3">
        {plantings.map((p) => {
          const status = calculateStatus(p.plantingDate, p.maturityDays);
          const isSpeaking = isSpeakingId === p.id;

          return (
            <div
              key={p.id}
              className={`p-3.5 rounded-xl border transition-all ${
                status.isHarvestReady
                  ? 'border-amber-400 bg-amber-50/50 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {p.name} ({p.hausaName})
                    </span>
                    {status.isHarvestReady ? (
                      <span className="text-[10px] font-extrabold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                        {locale === 'ha' ? 'Girbi ya Yi!' : 'Harvest Ready!'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {status.daysRemaining} {locale === 'ha' ? 'kwanaki sun rage' : 'days left'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {p.fieldLabel} • {locale === 'ha' ? 'An shuka: ' : 'Planted: '}
                    {new Date(p.plantingDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center space-x-1.5">
                  {/* Speak button for grandma */}
                  <button
                    onClick={() => handleSpeakCountdown(p)}
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
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Countdown Metric Highlights */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center bg-slate-50/80 p-2 rounded-xl border border-slate-200/70">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {locale === 'ha' ? 'Kwanakin Baya' : 'Elapsed'}
                  </span>
                  <span className="font-extrabold text-xs sm:text-sm text-slate-800">
                    {status.daysElapsed} {locale === 'ha' ? 'kwanaki' : 'days'}
                  </span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    {locale === 'ha' ? 'Kwanaki Sun Rage' : 'Remaining'}
                  </span>
                  <span className="font-black text-sm sm:text-base text-emerald-700">
                    {status.daysRemaining}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {locale === 'ha' ? 'Ranar Girbi' : 'Harvest Date'}
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-slate-800">
                    {status.formattedHarvestDate}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Growth Stage */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-emerald-900 flex items-center gap-1">
                    <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{locale === 'ha' ? status.stageHa : status.stageEn}</span>
                  </span>
                  <span className="text-slate-600">{status.progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      status.isHarvestReady
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    }`}
                    style={{ width: `${status.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Critical Readiness Tip */}
              <div className="mt-2.5 p-2 bg-emerald-50/80 rounded-lg border border-emerald-100 text-[11px] text-emerald-950 flex items-start space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  {locale === 'ha' ? p.criticalTipsHa : p.criticalTipsEn}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
