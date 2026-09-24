import React, { useState } from 'react';
import {
  Sprout,
  ShieldAlert,
  CloudSun,
  ArrowRight,
  Droplets,
  Calendar,
  MapPin,
  BookOpen,
  Volume2,
  Mic,
  MicOff,
  Sparkles,
  VolumeX,
  Clock,
  Layers,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import { WeatherDay } from '../services/weatherService';
import { voiceService } from '../services/voiceService';
import { HomeHarvestCountdown } from './HomeHarvestCountdown';
import { QuickAlertCard } from './QuickAlertCard';

interface HomeScreenProps {
  locale: Language;
  onNavigate: (tab: number) => void;
  forecast: WeatherDay[];
  weatherLoading: boolean;
  isWeatherCached: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  locale,
  onNavigate,
  forecast,
  weatherLoading,
  isWeatherCached,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const todayWeather = forecast.length > 0 ? forecast[0] : null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleVoiceListen = async () => {
    if (isListening) {
      const rec = await voiceService.stopListening();
      setIsListening(false);
      if (rec?.url) {
        setRecordedVoiceUrl(rec.url);
        showToast(locale === 'ha' ? 'An ɗauki muryarka cikin nasara!' : 'Voice recorded successfully!');
      }
      return;
    }

    const started = voiceService.startListening(
      locale,
      (text, rec) => {
        if (rec?.url) {
          setRecordedVoiceUrl(rec.url);
        }
        showToast(`${locale === 'ha' ? 'An ji' : 'Heard'}: "${text}"`);
        const lower = text.toLowerCase();
        if (lower.includes('crop') || lower.includes('gona') || lower.includes('shuka') || lower.includes('albasa') || lower.includes('masara')) {
          onNavigate(1); // Crop
        } else if (lower.includes('health') || lower.includes('lafiya') || lower.includes('fever') || lower.includes('zazzabi')) {
          onNavigate(2); // Health
        } else if (lower.includes('water') || lower.includes('ruwa') || lower.includes('boil')) {
          onNavigate(5); // Water
        } else if (lower.includes('animal') || lower.includes('livestock') || lower.includes('dabba') || lower.includes('kaza') || lower.includes('akuya')) {
          onNavigate(6); // Livestock
        } else if (lower.includes('map') || lower.includes('taswira') || lower.includes('pin')) {
          onNavigate(7); // Map
        } else if (lower.includes('calendar') || lower.includes('kalanda') || lower.includes('shuka lokaci')) {
          onNavigate(8); // Calendar
        } else if (lower.includes('learn') || lower.includes('library') || lower.includes('ilimi')) {
          onNavigate(9); // Library
        } else if (lower.includes('soil') || lower.includes('kasa') || lower.includes('ƙasa') || lower.includes('laima') || lower.includes('moisture') || lower.includes('ph')) {
          onNavigate(11); // Soil Health
        } else if (lower.includes('sos') || lower.includes('alert') || lower.includes('gaggawa') || lower.includes('taimako') || lower.includes('help')) {
          showToast(locale === 'ha' ? 'An kunna sashin Gaggawa (Quick Alert SOS)!' : 'Quick Alert SOS active below!');
        }
      },
      (err) => {
        setIsListening(false);
      },
      (rec) => {
        setIsListening(false);
        if (rec?.url) {
          setRecordedVoiceUrl(rec.url);
        }
      }
    );

    if (started) {
      setIsListening(true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Hero Welcome & Grandma Voice Prompt */}
      <div className="bg-gradient-to-br from-[#1f7a4c] to-[#155a36] text-white rounded-3xl p-5 sm:p-6 shadow-md shadow-emerald-950/20 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs">
              {locale === 'ha' ? '100% Ba tare da Intanet ba' : '100% Offline-First'}
            </span>

            <div className="flex items-center space-x-2">
              {recordedVoiceUrl && (
                <button
                  type="button"
                  onClick={() => voiceService.playAudioUrl(recordedVoiceUrl)}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-all cursor-pointer shadow-xs"
                  title={locale === 'ha' ? 'Saurari muryarka' : 'Play recorded voice'}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{locale === 'ha' ? 'Saurari Murya' : 'Play Voice'}</span>
                </button>
              )}

              {/* Grandma Mic Button */}
              <button
                onClick={handleVoiceListen}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-white text-emerald-900 hover:bg-emerald-50 shadow-xs'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? t(locale, 'stop') : locale === 'ha' ? 'Yi Magana' : 'Speak'}</span>
              </button>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            {t(locale, 'tagline')}
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed max-w-lg">
            {locale === 'ha'
              ? 'Danna ko yi magana da murya domin duba amfanin gona, lafiya, ruwa, dabbobi da yanayin noma.'
              : 'Tap or speak in English or Hausa for crop health, symptom triage, water purity, livestock checks & maps.'}
          </p>
        </div>
      </div>

      {/* Emergency Distress Quick Alert (100% Offline SMS + GPS) */}
      <QuickAlertCard locale={locale} />

      {/* Active Crop Harvest Countdown Component */}
      <HomeHarvestCountdown
        locale={locale}
        onNavigateToCropHarvest={() => onNavigate(1)}
      />

      {/* Grid of Primary Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* 1. Crop Disease Check */}
        <button
          onClick={() => onNavigate(1)}
          className="text-left bg-white hover:bg-emerald-50/50 border border-emerald-200/80 p-4 rounded-2xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-2xs">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-800 group-hover:text-emerald-800 transition-colors">
                {t(locale, 'checkCrop')}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{t(locale, 'cropSubtitle')}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 2. Health Symptom Check */}
        <button
          onClick={() => onNavigate(2)}
          className="text-left bg-white hover:bg-rose-50/50 border border-rose-200/80 p-4 rounded-2xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-rose-600 text-white rounded-xl shadow-2xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-800 group-hover:text-rose-800 transition-colors">
                {t(locale, 'checkHealth')}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{t(locale, 'healthSubtitle')}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-rose-700 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 3. Water Quality Check */}
        <button
          onClick={() => onNavigate(5)}
          className="text-left bg-white hover:bg-sky-50/50 border border-sky-200/80 p-4 rounded-2xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-sky-600 text-white rounded-xl shadow-2xs">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-800 group-hover:text-sky-800 transition-colors">
                {t(locale, 'checkWater')}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{t(locale, 'waterSubtitle')}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-sky-700 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 4. Livestock & Poultry Doctor */}
        <button
          onClick={() => onNavigate(6)}
          className="text-left bg-white hover:bg-purple-50/50 border border-purple-200/80 p-4 rounded-2xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-purple-600 text-white rounded-xl shadow-2xs">
              <span className="text-2xl">🐔</span>
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-800 group-hover:text-purple-800 transition-colors">
                {t(locale, 'checkLivestock')}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{t(locale, 'livestockSubtitle')}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 5. Offline Geographic Map */}
        <button
          onClick={() => onNavigate(7)}
          className="text-left bg-white hover:bg-emerald-50/50 border border-emerald-200/80 p-4 rounded-2xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-teal-600 text-white rounded-xl shadow-2xs">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-800 group-hover:text-teal-800 transition-colors">
                {t(locale, 'checkMap')}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{t(locale, 'mapSubtitle')}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 6. Smart Planting Calendar */}
        <button
          onClick={() => onNavigate(8)}
          className="text-left bg-white hover:bg-amber-50/50 border border-amber-200/80 p-4 rounded-2xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-amber-600 text-white rounded-xl shadow-2xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-800 group-hover:text-amber-800 transition-colors">
                {t(locale, 'checkCalendar')}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{t(locale, 'calendarSubtitle')}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 7. Soil Health & Moisture Tracker */}
        <button
          onClick={() => onNavigate(11)}
          className="text-left bg-white hover:bg-lime-50/50 border border-lime-200/80 p-4 rounded-2xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-between group cursor-pointer sm:col-span-2"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-lime-700 text-white rounded-xl shadow-2xs">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-base text-slate-800 group-hover:text-lime-900 transition-colors">
                  {t(locale, 'checkSoil')}
                </h2>
                <span className="text-[10px] font-extrabold uppercase bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full border border-lime-300">
                  pH & Moisture
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">{t(locale, 'soilSubtitle')}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-lime-700 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Secondary Row: Plant Reference Library & Weather */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Plant Library Link */}
        <div
          onClick={() => onNavigate(9)}
          className="bg-white rounded-2xl p-4 border border-emerald-100 hover:border-emerald-300 shadow-xs cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">
                {t(locale, 'referenceLibraryTitle')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {locale === 'ha' ? 'Duba hotunan cututtuka da magani' : 'Visual atlas of crop diseases'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Weather Snapshot */}
        <div
          onClick={() => onNavigate(3)}
          className="bg-white rounded-2xl p-4 border border-emerald-100 hover:border-emerald-300 shadow-xs cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-100 text-sky-800 rounded-xl">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm text-slate-800">{t(locale, 'weatherTitle')}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                  {weatherLoading ? '...' : isWeatherCached ? 'Cached' : 'Live'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {todayWeather
                  ? `${Math.round(todayWeather.max)}° / ${Math.round(todayWeather.min)}°C • ${todayWeather.rain.toFixed(1)}mm rain`
                  : '7-day forecast'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
};
