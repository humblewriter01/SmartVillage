import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Sprout,
  Sun,
  CloudRain,
  Wind,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import {
  plantingCalendarService,
  CROP_CALENDAR,
  CropCalendarSchedule,
} from '../services/plantingCalendarService';
import { voiceService } from '../services/voiceService';

interface PlantingCalendarScreenProps {
  locale: Language;
}

export const PlantingCalendarScreen: React.FC<PlantingCalendarScreenProps> = ({ locale }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedCrop, setSelectedCrop] = useState<CropCalendarSchedule | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const seasonInfo = plantingCalendarService.getCurrentSeason(selectedMonth);

  // Month labels
  const MONTHS = [
    { num: 1, name: 'Jan', full: 'January', hausa: 'Janairu' },
    { num: 2, name: 'Feb', full: 'February', hausa: 'Fabrairu' },
    { num: 3, name: 'Mar', full: 'March', hausa: 'Maris' },
    { num: 4, name: 'Apr', full: 'April', hausa: 'Afirilu' },
    { num: 5, name: 'May', full: 'May', hausa: 'Mayu' },
    { num: 6, name: 'Jun', full: 'June', hausa: 'Yuni' },
    { num: 7, name: 'Jul', full: 'July', hausa: 'Yuli' },
    { num: 8, name: 'Aug', full: 'August', hausa: 'Agusta' },
    { num: 9, name: 'Sep', full: 'September', hausa: 'Satumba' },
    { num: 10, name: 'Oct', full: 'October', hausa: 'Oktoba' },
    { num: 11, name: 'Nov', full: 'November', hausa: 'Nuwamba' },
    { num: 12, name: 'Dec', full: 'December', hausa: 'Disamba' },
  ];

  // Filter crops suitable for this month
  const activePlantingCrops = CROP_CALENDAR.filter((c) => {
    if (c.plantingStartMonth <= c.plantingEndMonth) {
      return selectedMonth >= c.plantingStartMonth && selectedMonth <= c.plantingEndMonth;
    }
    return selectedMonth >= c.plantingStartMonth || selectedMonth <= c.plantingEndMonth;
  });

  const activeHarvestCrops = CROP_CALENDAR.filter((c) => {
    if (c.harvestStartMonth <= c.harvestEndMonth) {
      return selectedMonth >= c.harvestStartMonth && selectedMonth <= c.harvestEndMonth;
    }
    return selectedMonth >= c.harvestStartMonth || selectedMonth <= c.harvestEndMonth;
  });

  const handleSpeakSeason = async () => {
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const seasonText = locale === 'ha' ? seasonInfo.name_hausa : seasonInfo.name;
    const descText = locale === 'ha' ? seasonInfo.description_hausa : seasonInfo.description;

    let cropListText = '';
    if (activePlantingCrops.length > 0) {
      const names = activePlantingCrops
        .map((c) => (locale === 'ha' ? c.hausa_name : c.name))
        .join(', ');
      cropListText =
        locale === 'ha'
          ? `Amfanin gonar da za a shuka yanzu: ${names}.`
          : `Recommended crops to plant now: ${names}.`;
    }

    const fullSpeech = `${seasonText}. ${descText}. ${cropListText}`;
    await voiceService.speak(fullSpeech, locale, (warning) => {
      showToast(warning);
    });
    setIsSpeaking(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#173326] flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            <span>{t(locale, 'calendarSubtitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {locale === 'ha'
              ? 'Jagoran shuka da kulawar shuka mai tasowa a Arewacin Najeriya'
              : 'Northern & Middle Belt Nigeria seasonal cycles & baby plant care'}
          </p>
        </div>

        <button
          onClick={handleSpeakSeason}
          className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200"
          title="Speak Season Guidance"
        >
          <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-bounce' : ''}`} />
        </button>
      </div>

      {/* Month Horizontal Picker */}
      <div className="bg-white rounded-2xl p-3 border border-emerald-100 shadow-sm">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          {MONTHS.map((m) => {
            const isSelected = selectedMonth === m.num;
            const isCurrentRealMonth = new Date().getMonth() + 1 === m.num;

            return (
              <button
                key={m.num}
                onClick={() => setSelectedMonth(m.num)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex flex-col items-center min-w-[54px] border ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{locale === 'ha' ? m.hausa.slice(0, 3) : m.name}</span>
                {isCurrentRealMonth && (
                  <span
                    className={`text-[9px] mt-0.5 ${
                      isSelected ? 'text-emerald-200' : 'text-emerald-700 font-extrabold'
                    }`}
                  >
                    • {locale === 'ha' ? 'Yau' : 'Now'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Season Card */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-3 rounded-xl text-white ${
                seasonInfo.season === 'rainy'
                  ? 'bg-emerald-600'
                  : seasonInfo.season === 'harmattan'
                  ? 'bg-amber-600'
                  : 'bg-orange-500'
              }`}
            >
              {seasonInfo.season === 'rainy' && <CloudRain className="w-6 h-6" />}
              {seasonInfo.season === 'harmattan' && <Wind className="w-6 h-6" />}
              {seasonInfo.season === 'dry' && <Sun className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {locale === 'ha' ? 'Lokacin Shekara' : 'Seasonal Cycle'}
              </span>
              <h2 className="font-extrabold text-lg text-slate-800">
                {locale === 'ha' ? seasonInfo.name_hausa : seasonInfo.name}
              </h2>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {locale === 'ha' ? seasonInfo.description_hausa : seasonInfo.description}
        </p>

        {seasonInfo.harmattanWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {locale === 'ha'
                ? 'Gargadin Harmattan: Busasshen iska da sanyi na dare. Kare shukar fadama da ciyawar bushewa (mulch) domin kiyaye laimar ƙasa.'
                : 'Harmattan Alert: Cold nights and drying dust winds. Mulch onion and vegetable beds heavily to prevent extreme moisture loss.'}
            </span>
          </div>
        )}
      </div>

      {/* Crops to Plant This Month */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-[#173326] flex items-center gap-2">
          <Sprout className="w-4 h-4 text-emerald-600" />
          <span>
            {locale === 'ha'
              ? `Abubuwan da Za a Shuka a Watan ${MONTHS[selectedMonth - 1].hausa}`
              : `Recommended to Plant in ${MONTHS[selectedMonth - 1].full}`}
          </span>
        </h3>

        {activePlantingCrops.length > 0 ? (
          <div className="space-y-3">
            {activePlantingCrops.map((crop) => (
              <div
                key={crop.id}
                onClick={() => setSelectedCrop(crop)}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 hover:border-emerald-300 shadow-sm cursor-pointer transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-800">
                      {crop.name}{' '}
                      <span className="text-xs font-normal text-emerald-700">
                        ({crop.hausa_name})
                      </span>
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      Ideal Rainfall: {crop.idealRainfall} • Temp: {crop.idealTemp}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                    {locale === 'ha' ? 'Lokacin Shuka' : 'Planting Window'}
                  </span>
                </div>

                {/* Planting Advice */}
                <p className="text-xs text-slate-700 leading-relaxed">
                  {locale === 'ha' ? crop.advice_hausa : crop.advice}
                </p>

                {/* Baby Plant Care Window */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-950 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {locale === 'ha'
                        ? `Kulawar Shuka Mai Tasowa (Makonni ${crop.carePeriodWeeks} na farko):`
                        : `Baby Plant Care Window (First ${crop.carePeriodWeeks} weeks):`}
                    </span>
                  </div>
                  <p>{locale === 'ha' ? crop.babyPlantCare_hausa : crop.babyPlantCare}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 space-y-2">
            <Sprout className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-xs text-slate-600 font-medium">
              {locale === 'ha'
                ? 'Babu babban shuka na gonar sama a wannan watan. Duba noman rani ko gyaran gona.'
                : 'No major rainfed field planting in this month. Focus on fadama irrigation or land prep.'}
            </p>
          </div>
        )}
      </div>

      {/* Harvest Window in this Month */}
      {activeHarvestCrops.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {locale === 'ha'
              ? `Amfanin Gonar da Ake Girbi a Watan ${MONTHS[selectedMonth - 1].hausa}:`
              : `Crops Ready for Harvest in ${MONTHS[selectedMonth - 1].full}:`}
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeHarvestCrops.map((crop) => (
              <span
                key={crop.id}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200"
              >
                🌾 {crop.name} ({crop.hausa_name})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
