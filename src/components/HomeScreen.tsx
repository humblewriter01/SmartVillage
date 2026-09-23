import React from 'react';
import { Sprout, ShieldAlert, CloudSun, ArrowRight, Info, Sparkles } from 'lucide-react';
import { Language, t } from '../utils/translations';
import { WeatherDay } from '../services/weatherService';

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
  const todayWeather = forecast.length > 0 ? forecast[0] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173326] leading-tight">
          {t(locale, 'tagline')}
        </h1>
        <p className="text-sm text-emerald-800/80 mt-1">
          {locale === 'ha'
            ? 'Binciken amfanin gona da shawarar lafiya a kowanne lokaci'
            : 'Offline diagnostics, local agro-weather, and rural health guidance'}
        </p>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 gap-4">
        {/* Check Crop Card */}
        <button
          onClick={() => onNavigate(1)}
          className="w-full text-left bg-[#1f7a4c] hover:bg-[#19653e] active:scale-[0.99] transition-all text-white rounded-2xl p-5 shadow-md shadow-emerald-900/10 flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/15 rounded-xl text-white">
              <Sprout className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t(locale, 'checkCrop')}</h2>
              <p className="text-white/80 text-sm mt-0.5">{t(locale, 'cropSubtitle')}</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Check Health Card */}
        <button
          onClick={() => onNavigate(2)}
          className="w-full text-left bg-[#c44747] hover:bg-[#b03b3b] active:scale-[0.99] transition-all text-white rounded-2xl p-5 shadow-md shadow-red-900/10 flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/15 rounded-xl text-white">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t(locale, 'checkHealth')}</h2>
              <p className="text-white/80 text-sm mt-0.5">{t(locale, 'healthSubtitle')}</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Weather Preview */}
      <div
        onClick={() => onNavigate(3)}
        className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-[#1f7a4c] font-bold">
            <CloudSun className="w-5 h-5" />
            <span>{t(locale, 'weatherTitle')}</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
            {weatherLoading
              ? t(locale, 'loading')
              : isWeatherCached
              ? t(locale, 'cached')
              : t(locale, 'online')}
          </span>
        </div>

        {todayWeather ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {Math.round(todayWeather.max)}° / {Math.round(todayWeather.min)}°C
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                {t(locale, 'rain')}: {todayWeather.rain.toFixed(1)} mm
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-[#1f7a4c] flex items-center gap-1">
                {t(locale, 'weather')}
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t(locale, 'noWeather')}</p>
        )}
      </div>

      {/* Offline Knowledge Banner */}
      <div
        onClick={() => onNavigate(4)}
        className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-emerald-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#173326] text-sm sm:text-base">
              {t(locale, 'knowledgeTitle')}
            </h3>
            <p className="text-xs text-emerald-800/80">
              {locale === 'ha'
                ? 'Shawarwari kan amfanin gona, ruwa, kaji da lafiya'
                : '30+ verified guides for crops, livestock, water & health'}
            </p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-emerald-700" />
      </div>

      {/* Disclaimer Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 text-slate-600 text-xs flex items-start space-x-3">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">{t(locale, 'notMedical')}</p>
      </div>
    </div>
  );
};
