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
  Droplets,
  Calendar,
  MapPin,
  Volume2,
  Mic,
} from 'lucide-react';
import { Language, t } from './utils/translations';
import { weatherService, WeatherDay } from './services/weatherService';
import { historyService, HistoryRecord } from './services/historyService';
import { voiceService, VoiceMode } from './services/voiceService';
import { HomeScreen } from './components/HomeScreen';
import { CropScreen } from './components/CropScreen';
import { HealthScreen } from './components/HealthScreen';
import { WeatherScreen } from './components/WeatherScreen';
import { KnowledgeScreen } from './components/KnowledgeScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { WaterQualityScreen } from './components/WaterQualityScreen';
import { LivestockScreen } from './components/LivestockScreen';
import { OfflineMapScreen } from './components/OfflineMapScreen';
import { PlantingCalendarScreen } from './components/PlantingCalendarScreen';
import { CropReferenceLibraryScreen } from './components/CropReferenceLibraryScreen';
import {
  CropCategoryReference,
  CropDiseaseReference,
} from './data/cropReferenceData';

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected crop/disease passed from Reference Library into CropScreen
  const [selectedLibraryCrop, setSelectedLibraryCrop] = useState<CropCategoryReference | undefined>();
  const [selectedLibraryDisease, setSelectedLibraryDisease] = useState<CropDiseaseReference | undefined>();

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

  // Back Button Fix: When on any tab other than Home, navigate back to Home instead of exiting app
  useEffect(() => {
    window.history.replaceState({ tab: 0 }, '');
    let lastBackPress = 0;

    const handlePopState = (e: PopStateEvent) => {
      setTab((currentTab) => {
        if (currentTab !== 0) {
          // If on analysis or another tab, return to Home screen
          window.history.pushState({ tab: 0 }, '');
          return 0;
        } else {
          // On Home tab: double back press within 2 seconds
          const now = Date.now();
          if (now - lastBackPress < 2000) {
            return 0;
          } else {
            lastBackPress = now;
            window.history.pushState({ tab: 0 }, '');
            setToastMessage(
              locale === 'ha'
                ? 'Danna baya kuma domin fita'
                : 'Press back again to exit SmartVillage'
            );
            setTimeout(() => setToastMessage(null), 2500);
            return 0;
          }
        }
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [locale]);

  const navigateToTab = (newTab: number) => {
    setTab(newTab);
    window.history.pushState({ tab: newTab }, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSetLocale = (newLocale: Language) => {
    setLocale(newLocale);
    localStorage.setItem('smartvillage.locale', newLocale);
  };

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

  const loadHistory = () => {
    setHistoryRecords(historyService.list());
  };

  useEffect(() => {
    loadWeather();
    loadHistory();
  }, []);

  // Primary bottom navigation items
  const navItems = [
    { id: 0, labelKey: 'home', icon: Home },
    { id: 1, labelKey: 'crop', icon: Sprout },
    { id: 2, labelKey: 'health', icon: ShieldAlert },
    { id: 5, labelKey: 'water', icon: Droplets },
    { id: 6, labelKey: 'livestock', icon: Sprout, isEmoji: '🐔' },
    { id: 7, labelKey: 'map', icon: MapPin },
    { id: 8, labelKey: 'calendar', icon: Calendar },
    { id: 4, labelKey: 'knowledge', icon: BookOpen },
    { id: 10, labelKey: 'history', icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f6faf7] text-slate-800 antialiased selection:bg-emerald-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-emerald-100 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo & Title */}
          <div
            onClick={() => navigateToTab(0)}
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
                100% Offline
              </span>
            </div>
          </div>

          {/* Right Actions: Online Badge & Language Selector */}
          <div className="flex items-center space-x-1.5">
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
                <option value="en">English</option>
                <option value="ha">Hausa</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24">
        {tab === 0 && (
          <HomeScreen
            locale={locale}
            onNavigate={navigateToTab}
            forecast={forecast}
            weatherLoading={weatherLoading}
            isWeatherCached={isWeatherCached}
          />
        )}
        {tab === 1 && (
          <CropScreen
            locale={locale}
            onRecordSaved={loadHistory}
            initialSelectedCrop={selectedLibraryCrop}
            initialSelectedDisease={selectedLibraryDisease}
          />
        )}
        {tab === 2 && <HealthScreen locale={locale} onRecordSaved={loadHistory} />}
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
        {tab === 5 && <WaterQualityScreen locale={locale} onRecordSaved={loadHistory} />}
        {tab === 6 && <LivestockScreen locale={locale} onRecordSaved={loadHistory} />}
        {tab === 7 && <OfflineMapScreen locale={locale} />}
        {tab === 8 && <PlantingCalendarScreen locale={locale} />}
        {tab === 9 && (
          <CropReferenceLibraryScreen
            locale={locale}
            onSelectDiseaseForCropScreen={(crop, disease) => {
              setSelectedLibraryCrop(crop);
              setSelectedLibraryDisease(disease);
              navigateToTab(1); // Jump to Crop Screen
            }}
          />
        )}
        {tab === 10 && (
          <HistoryScreen
            locale={locale}
            records={historyRecords}
            onReload={loadHistory}
          />
        )}
      </main>

      {/* Bottom Sticky Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200/80 shadow-lg">
        <div className="max-w-3xl mx-auto px-2">
          <div className="flex items-center justify-between overflow-x-auto py-1.5 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateToTab(item.id)}
                  className={`flex flex-col items-center justify-center min-w-[58px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'text-[#1f7a4c] font-bold scale-105'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  <div
                    className={`p-1 rounded-lg ${
                      isActive ? 'bg-emerald-100/80' : 'bg-transparent'
                    }`}
                  >
                    {item.isEmoji ? (
                      <span className="text-lg leading-none">{item.isEmoji}</span>
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                    {t(locale, item.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
export default App;
