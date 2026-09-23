import React, { useState, useEffect } from 'react';
import {
  Home,
  Sprout,
  ShieldAlert,
  CloudSun,
  BookOpen,
  History,
  Globe,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Language, t } from './utils/translations';
import { weatherService, WeatherDay } from './services/weatherService';
import { historyService, HistoryRecord } from './services/historyService';
import { HomeScreen } from './components/HomeScreen';
import { CropScreen } from './components/CropScreen';
import { HealthScreen } from './components/HealthScreen';
import { WeatherScreen } from './components/WeatherScreen';
import { KnowledgeScreen } from './components/KnowledgeScreen';
import { HistoryScreen } from './components/HistoryScreen';

export function App() {
  const [tab, setTab] = useState(0);
  const [locale, setLocale] = useState<Language>(() => {
    return (localStorage.getItem('smartvillage.locale') as Language) || 'en';
  });
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [isWeatherCached, setIsWeatherCached] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persist language
  const handleSetLocale = (newLocale: Language) => {
    setLocale(newLocale);
    localStorage.setItem('smartvillage.locale', newLocale);
  };

  // Load weather
  const loadWeather = async (lat?: number, lon?: number) => {
    setWeatherLoading(true);
    try {
      const res = await weatherService.load(lat, lon);
      setForecast(res.days);
      setIsWeatherCached(res.isCached);
    } catch {
      setIsWeatherCached(true);
    } finally {
      setWeatherLoading(false);
    }
  };

  // Load history records
  const loadHistory = () => {
    setHistoryRecords(historyService.list());
  };

  useEffect(() => {
    loadWeather();
    loadHistory();
  }, []);

  const navItems = [
    { id: 0, labelKey: 'home', icon: Home },
    { id: 1, labelKey: 'crop', icon: Sprout },
    { id: 2, labelKey: 'health', icon: ShieldAlert },
    { id: 3, labelKey: 'weather', icon: CloudSun },
    { id: 4, labelKey: 'knowledge', icon: BookOpen },
    { id: 5, labelKey: 'history', icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f6faf7] text-slate-800 antialiased selection:bg-emerald-200">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-emerald-100 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo & Title */}
          <div
            onClick={() => setTab(0)}
            className="flex items-center space-x-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1f7a4c] flex items-center justify-center text-white shadow-2xs">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-[#173326]">
                {t(locale, 'appName')}
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Offline First
              </span>
            </div>
          </div>

          {/* Right Actions: Online badge & Language Selector */}
          <div className="flex items-center space-x-2">
            {/* Network pill */}
            <div
              className={`hidden sm:flex items-center space-x-1 text-[11px] font-medium px-2 py-1 rounded-full ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-600" />
                  <span>{t(locale, 'online')}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-600" />
                  <span>{t(locale, 'offline')}</span>
                </>
              )}
            </div>

            {/* Language dropdown */}
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <Globe className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
              <select
                value={locale}
                onChange={(e) => handleSetLocale(e.target.value as Language)}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer pr-1"
                aria-label={t(locale, 'language')}
              >
                <option value="en">{t(locale, 'english')}</option>
                <option value="ha">{t(locale, 'hausa')}</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {tab === 0 && (
          <HomeScreen
            locale={locale}
            onNavigate={setTab}
            forecast={forecast}
            weatherLoading={weatherLoading}
            isWeatherCached={isWeatherCached}
          />
        )}
        {tab === 1 && (
          <CropScreen locale={locale} onRecordSaved={loadHistory} />
        )}
        {tab === 2 && (
          <HealthScreen locale={locale} onRecordSaved={loadHistory} />
        )}
        {tab === 3 && (
          <WeatherScreen
            locale={locale}
            forecast={forecast}
            loading={weatherLoading}
            isCached={isWeatherCached}
            onRefresh={loadWeather}
          />
        )}
        {tab === 4 && <KnowledgeScreen locale={locale} />}
        {tab === 5 && (
          <HistoryScreen
            locale={locale}
            records={historyRecords}
            onReload={loadHistory}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-6 h-16 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                  isActive
                    ? 'text-[#1f7a4c] font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-emerald-100 text-[#1f7a4c]' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] truncate max-w-[54px]">
                  {t(locale, item.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
