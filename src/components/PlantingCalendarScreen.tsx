import React, { useState, useEffect } from 'react';
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
  Bell,
  BellOff,
  BellRing,
  X,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import {
  plantingCalendarService,
  CROP_CALENDAR,
  CropCalendarSchedule,
} from '../services/plantingCalendarService';
import { voiceService } from '../services/voiceService';
import {
  reminderService,
  StoredReminder,
  getPlantingStartDate,
} from '../services/reminderService';

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
  const activePlantingCrops = CROP_CALENDAR.filter((c) =>
    plantingCalendarService.isPlantingActive(c, selectedMonth)
  );

  const activeHarvestCrops = CROP_CALENDAR.filter((c) =>
    plantingCalendarService.isHarvestActive(c, selectedMonth)
  );

  const [isSpeakingHarvest, setIsSpeakingHarvest] = useState(false);

  // Local notification reminders state (persisted via @capacitor/preferences)
  const [reminders, setReminders] = useState<Record<string, StoredReminder>>({});
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingCropForReminder, setPendingCropForReminder] = useState<CropCalendarSchedule | null>(null);

  // Load reminders on mount so they survive app restarts
  useEffect(() => {
    let isMounted = true;
    reminderService.getStoredReminders().then((loaded) => {
      if (isMounted) {
        setReminders(loaded);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSetReminderClick = async (e: React.MouseEvent, crop: CropCalendarSchedule) => {
    e.stopPropagation();

    // Check notification permission
    const perm = await reminderService.checkPermission();
    if (perm === 'granted') {
      await executeScheduleReminder(crop);
    } else {
      // Show friendly pre-permission modal explaining why
      setPendingCropForReminder(crop);
      setShowPermissionModal(true);
    }
  };

  const handleConfirmPermission = async () => {
    if (!pendingCropForReminder) return;
    const cropToSchedule = pendingCropForReminder;
    setShowPermissionModal(false);

    const granted = await reminderService.requestPermission();
    if (granted) {
      await executeScheduleReminder(cropToSchedule);
    } else {
      showToast(
        locale === 'ha'
          ? 'Ba a ba da izinin sanarwa ba. Za ka iya kunna shi a saitunan waya.'
          : 'Notifications not allowed. You can enable them in phone settings.'
      );
    }
    setPendingCropForReminder(null);
  };

  const handleDismissPermission = () => {
    setShowPermissionModal(false);
    setPendingCropForReminder(null);
  };

  const executeScheduleReminder = async (crop: CropCalendarSchedule) => {
    const result = await reminderService.scheduleCropReminder(crop, selectedMonth);
    if (result.success && result.reminder) {
      setReminders((prev) => ({
        ...prev,
        [crop.id]: result.reminder!,
      }));
      const dateText =
        locale === 'ha'
          ? result.reminder.startDateFormattedHa
          : result.reminder.startDateFormattedEn;
      showToast(
        locale === 'ha'
          ? `An saita tunatarwa don ${crop.hausa_name} (${dateText})!`
          : `Reminder scheduled for ${crop.name} (${dateText})!`
      );
    }
  };

  const handleCancelReminderClick = async (e: React.MouseEvent, crop: CropCalendarSchedule) => {
    e.stopPropagation();
    await reminderService.cancelCropReminder(crop.id);
    setReminders((prev) => {
      const next = { ...prev };
      delete next[crop.id];
      return next;
    });
    showToast(
      locale === 'ha'
        ? `An soke tunatarwar ${crop.hausa_name}.`
        : `Cancelled reminder for ${crop.name}.`
    );
  };

  const handleSpeakSeason = async () => {
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    voiceService.stopSpeaking();
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

  const handleSpeakHarvestList = async () => {
    if (isSpeakingHarvest) {
      voiceService.stopSpeaking();
      setIsSpeakingHarvest(false);
      return;
    }

    voiceService.stopSpeaking();
    setIsSpeakingHarvest(true);

    if (activeHarvestCrops.length === 0) {
      const emptyText =
        locale === 'ha'
          ? 'Babu amfanin gona da ake girbi a wannan watan.'
          : 'No crops are ready for harvest this month.';
      await voiceService.speak(emptyText, locale);
      setIsSpeakingHarvest(false);
      return;
    }

    const monthName =
      locale === 'ha'
        ? MONTHS[selectedMonth - 1].hausa
        : MONTHS[selectedMonth - 1].full;

    const headerText =
      locale === 'ha'
        ? `Amfanin gonar da ake girbi a watan ${monthName}.`
        : `Crops ready for harvest in ${monthName}.`;

    const cropList = activeHarvestCrops
      .map((c) => (locale === 'ha' ? `${c.hausa_name} (${c.name})` : `${c.name} (${c.hausa_name})`))
      .join('. ');

    const fullSpeech = `${headerText} ${cropList}.`;
    await voiceService.speak(fullSpeech, locale, (warning) => {
      showToast(warning);
    });
    setIsSpeakingHarvest(false);
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
            {activePlantingCrops.map((crop) => {
              const startDateInfo = getPlantingStartDate(crop, selectedMonth);
              const hasReminder = Boolean(reminders[crop.id]);

              return (
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

                  {/* Planting Start Date & Set/Cancel Reminder Button */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold">
                      <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {locale === 'ha'
                          ? `Fara Shuka: ${startDateInfo.day} ga ${MONTHS[startDateInfo.month - 1].hausa}`
                          : `Planting Starts: ${MONTHS[startDateInfo.month - 1].name} ${startDateInfo.day}`}
                      </span>
                      {startDateInfo.labelEn && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-normal">
                          {locale === 'ha' ? startDateInfo.labelHa : startDateInfo.labelEn}
                        </span>
                      )}
                    </div>

                    {hasReminder ? (
                      <button
                        type="button"
                        onClick={(e) => handleCancelReminderClick(e, crop)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                        title={locale === 'ha' ? 'Soke Tunatarwa' : 'Cancel Reminder'}
                      >
                        <BellOff className="w-3.5 h-3.5 text-amber-700" />
                        <span>{locale === 'ha' ? 'Soke Tunatarwa' : 'Cancel Reminder'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleSetReminderClick(e, crop)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                        title={locale === 'ha' ? 'Saita Tunatarwa' : 'Set Reminder'}
                      >
                        <Bell className="w-3.5 h-3.5 text-emerald-200" />
                        <span>{locale === 'ha' ? 'Saita Tunatarwa' : 'Set Reminder'}</span>
                      </button>
                    )}
                  </div>

                  {hasReminder && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {locale === 'ha'
                          ? `An kunna sanarwar tunatarwa: Lokacin shuka ${crop.hausa_name} ya yi!`
                          : `Reminder active: Time to plant ${crop.name}!`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
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
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {locale === 'ha'
              ? `Amfanin Gonar da Ake Girbi a Watan ${MONTHS[selectedMonth - 1].hausa}:`
              : `Crops Ready for Harvest in ${MONTHS[selectedMonth - 1].full}:`}
          </h3>

          <button
            type="button"
            onClick={handleSpeakHarvestList}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
              isSpeakingHarvest
                ? 'bg-amber-400 text-amber-950 border-amber-500 animate-pulse'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
            }`}
            title={locale === 'ha' ? 'Saurari Amfanin Girbi' : 'Read Aloud Harvest List'}
          >
            <Volume2 className={`w-3.5 h-3.5 ${isSpeakingHarvest ? 'animate-bounce text-amber-950' : ''}`} />
            <span className="text-[10px] font-bold">
              {locale === 'ha' ? 'Saurara' : 'Listen'}
            </span>
          </button>
        </div>

        {activeHarvestCrops.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeHarvestCrops.map((crop) => {
              const activeHarvestWindow = plantingCalendarService.getActiveHarvestWindow(crop, selectedMonth);
              const seasonLabel = activeHarvestWindow
                ? locale === 'ha'
                  ? activeHarvestWindow.seasonLabelHa
                  : activeHarvestWindow.seasonLabelEn
                : null;

              return (
                <span
                  key={crop.id}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 inline-flex items-center gap-1.5"
                >
                  <span>🌾 {crop.name} ({crop.hausa_name})</span>
                  {seasonLabel && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200/70 text-amber-950">
                      {seasonLabel}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 text-xs text-slate-500 italic">
            {locale === 'ha'
              ? 'Babu amfanin gona da ake girbi a wannan watan.'
              : 'No crops are ready for harvest this month.'}
          </div>
        )}
      </div>

      {/* Selected Crop Detail & Planting Reminder Modal */}
      {selectedCrop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 border-b border-emerald-800 flex items-center justify-between bg-emerald-700 text-white">
              <div className="flex items-center space-x-2">
                <Sprout className="w-5 h-5 text-emerald-200" />
                <h3 className="font-extrabold text-base">
                  {selectedCrop.name} ({selectedCrop.hausa_name})
                </h3>
              </div>
              <button
                onClick={() => setSelectedCrop(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-emerald-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800">
              {/* Season & Ideal Climate */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                    {locale === 'ha' ? 'Ruwan Sama' : 'Ideal Rainfall'}
                  </span>
                  <span className="font-bold text-slate-700">{selectedCrop.idealRainfall}</span>
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                    {locale === 'ha' ? 'Zafin Yanayi' : 'Ideal Temperature'}
                  </span>
                  <span className="font-bold text-slate-700">{selectedCrop.idealTemp}</span>
                </div>
              </div>

              {/* Planting Start Date & Windows */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-emerald-600" />
                    <span>{locale === 'ha' ? 'Ranar Fara Shuka' : 'Planting Window Start'}</span>
                  </span>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {locale === 'ha'
                      ? `${getPlantingStartDate(selectedCrop, selectedMonth).day} ga ${MONTHS[getPlantingStartDate(selectedCrop, selectedMonth).month - 1].hausa}`
                      : `${MONTHS[getPlantingStartDate(selectedCrop, selectedMonth).month - 1].full} ${getPlantingStartDate(selectedCrop, selectedMonth).day}`}
                  </span>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed">
                  {locale === 'ha' ? selectedCrop.advice_hausa : selectedCrop.advice}
                </div>
              </div>

              {/* Baby Plant Care */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
                  <Clock className="w-4 h-4" />
                  <span>
                    {locale === 'ha'
                      ? `Kulawar Shuka Mai Tasowa (Makonni ${selectedCrop.carePeriodWeeks} na farko):`
                      : `Baby Plant Care Window (First ${selectedCrop.carePeriodWeeks} weeks):`}
                  </span>
                </div>
                <p className="leading-relaxed">
                  {locale === 'ha' ? selectedCrop.babyPlantCare_hausa : selectedCrop.babyPlantCare}
                </p>
              </div>

              {/* Reminder Section inside Modal */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BellRing className="w-5 h-5 text-emerald-700" />
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-emerald-950">
                        {locale === 'ha' ? 'Tunatarwar Ranar Shuka' : 'Planting Date Notification'}
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        {locale === 'ha'
                          ? 'Sami sanarwa a kan wayarka lokacin da ranar shuka ta yi.'
                          : 'Get a notification on your phone when this planting window opens.'}
                      </p>
                    </div>
                  </div>
                </div>

                {reminders[selectedCrop.id] ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-white/80 border border-emerald-300 px-3 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {locale === 'ha'
                          ? `An saita sanarwa don ${reminders[selectedCrop.id].startDateFormattedHa}: "Lokacin shuka ${selectedCrop.hausa_name} ya yi!"`
                          : `Scheduled for ${reminders[selectedCrop.id].startDateFormattedEn}: "Time to plant ${selectedCrop.name}!"`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleCancelReminderClick(e, selectedCrop)}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <BellOff className="w-4 h-4 text-amber-800" />
                      <span>{locale === 'ha' ? 'Soke Tunatarwa' : 'Cancel Reminder'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleSetReminderClick(e, selectedCrop)}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Bell className="w-4 h-4 text-emerald-200" />
                    <span>{locale === 'ha' ? 'Saita Tunatarwa Yanzu' : 'Set Reminder Now'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedCrop(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                {t(locale, 'close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friendly Notification Pre-Permission Modal */}
      {showPermissionModal && pendingCropForReminder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-emerald-200 space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-extrabold text-base text-slate-800">
                {locale === 'ha' ? 'Ba da Izinin Sanarwa' : 'Enable Planting Reminders'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {locale === 'ha'
                  ? `SmartVillage na buƙatar izinin sanarwa domin tura maka faɗakarwa a ainihin ranar da ya kamata ka fara shuka ${pendingCropForReminder.hausa_name} (${pendingCropForReminder.name}).`
                  : `SmartVillage needs notification permission to send you a reminder alert when it is time to start planting ${pendingCropForReminder.name} (${pendingCropForReminder.hausa_name}).`}
              </p>
            </div>

            {/* Bilingual notification sample preview */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-left text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {locale === 'ha' ? 'Misalin Saƙon Faɗakarwa:' : 'Notification Preview:'}
              </span>
              <p className="font-bold text-slate-800">
                {`Time to plant ${pendingCropForReminder.name}!`}
              </p>
              <p className="font-bold text-emerald-800">
                {`Lokacin shuka ${pendingCropForReminder.hausa_name} ya yi!`}
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={handleDismissPermission}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                {locale === 'ha' ? 'Daga Baya' : 'Not Now'}
              </button>
              <button
                type="button"
                onClick={handleConfirmPermission}
                className="flex-1 py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all active:scale-95"
              >
                {locale === 'ha' ? 'Ba da Izini' : 'Allow & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
