import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
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
  Layers,
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
import { SoilHealthScreen } from './components/SoilHealthScreen';
import { MicrophonePermissionModal } from './components/MicrophonePermissionModal';
import {
  CropCategoryReference,
  CropDiseaseReference,
} from './data/cropReferenceData';

export function App() {
  const [tab, setTab] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [locale, setLocale] = useState<Language>(() => {
    return (localStorage.getItem('smartvillage.locale') as Language) || 'en';
  });
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [isWeatherCached, setIsWeatherCached] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showMicPermissionModal, setShowMicPermissionModal] = useState(false);

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

  // Back Button Fix: If drawer is open, close drawer. Otherwise, navigate back to Home before exiting
  useEffect(() => {
    window.history.replaceState({ tab: 0 }, '');
    let lastBackPress = 0;

    const handlePopState = (e: PopStateEvent) => {
      // If drawer is open, close it first
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return;
      }

      setTab((currentTab) => {
        if (currentTab !== 0) {
          // If on another tab, return to Home screen
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
  }, [locale, isDrawerOpen]);

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

    // Check microphone permission state on startup and register listeners
    voiceService.checkMicrophonePermission();

    const unsubDenied = voiceService.onPermissionDenied(() => {
      setShowMicPermissionModal(true);
    });

    const unsubGranted = voiceService.onPermissionGranted(() => {
      setShowMicPermissionModal(false);
    });

    return () => {
      unsubDenied();
      unsubGranted();
    };
  }, []);

  const handleMicPermissionGranted = () => {
    setShowMicPermissionModal(false);
    setToastMessage(t(locale, 'micPermissionSuccess'));
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Primary bottom navigation items: EXACTLY 5 high-priority items
  const bottomNavItems = [
    { id: 0, labelKey: 'home', icon: Home, emoji: '🏠' },
    { id: 1, labelKey: 'crop', icon: Sprout, emoji: '🌾' },
    { id: 2, labelKey: 'health', icon: ShieldAlert, emoji: '🏥' },
    { id: 6, labelKey: 'livestock', icon: Sprout, emoji: '🐄' },
    { id: 7, labelKey: 'map', icon: MapPin, emoji: '🗺️' },
  ];

  // Left Sidebar Drawer items
  const drawerItems = [
    {
      id: 5,
      label: locale === 'ha' ? 'Ruwa' : 'Water Quality',
      subtitle: locale === 'ha' ? 'Duba tsabtar ruwan sha' : 'Drinking water safety',
      icon: Droplets,
      emoji: '💧',
    },
    {
      id: 8,
      label: locale === 'ha' ? 'Kalandar Noma' : 'Farming Calendar',
      subtitle: locale === 'ha' ? 'Lokutan shuka da girbi' : 'Seasonal planting windows',
      icon: Calendar,
      emoji: '📅',
    },
    {
      id: 11,
      label: locale === 'ha' ? 'Lafiyar Ƙasa' : 'Soil Health',
      subtitle: locale === 'ha' ? 'Auna laima da pH na gona' : 'Soil moisture & pH tracker',
      icon: Layers,
      emoji: '🌱',
    },
    {
      id: 4,
      label: locale === 'ha' ? 'Ilimi' : 'Education / Knowledge',
      subtitle: locale === 'ha' ? 'Hanyoyin noma da kiwon lafiya' : 'Farming & health guides',
      icon: BookOpen,
      emoji: '📖',
    },
    {
      id: 10,
      label: locale === 'ha' ? 'Tarihi' : 'History',
      subtitle: locale === 'ha' ? 'Bayanai da aka ajiye' : 'Past saved evaluations',
      icon: History,
      emoji: '🕐',
    },
    {
      id: 3,
      label: locale === 'ha' ? 'Yanayi' : 'Weather',
      subtitle: locale === 'ha' ? 'Hasashen ruwa da zafi na kwanaki 7' : '7-day weather forecast',
      icon: CloudSun,
      emoji: '⛅',
    },
    {
      id: 9,
      label: locale === 'ha' ? 'Laburaren Cututtuka' : 'Crop Disease Library',
      subtitle: locale === 'ha' ? 'Hotunan cututtuka da magunguna' : 'Disease visual catalog',
      icon: BookOpen,
      emoji: '📚',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f6faf7] text-slate-800 antialiased selection:bg-emerald-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Left Sidebar Drawer Backdrop */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 transition-opacity animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-[310px] max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation drawer"
      >
        {/* Drawer Header with SmartVillage Logo */}
        <div className="p-4 border-b border-emerald-800 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white border border-white/30 shadow-xs">
                <Sprout className="w-5 h-5 text-emerald-100" />
              </div>
              <div>
                <h2 className="font-black text-lg tracking-tight leading-tight">SmartVillage</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  100% Offline
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-emerald-200/90 leading-snug">
            {locale === 'ha'
              ? 'Taimako ba tare da intanet ba ga gonaki da iyalai masu lafiya'
              : 'Offline help for healthier farms and families'}
          </p>
        </div>

        {/* Drawer Menu Items List */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin">
          <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
            {locale === 'ha' ? 'Ƙarin Sashe na Manhaja' : 'App Sections'}
          </div>

          {drawerItems.map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigateToTab(item.id);
                  setIsDrawerOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-black border-l-4 border-emerald-600 shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100/90 font-semibold'
                }`}
              >
                <span className="text-xl shrink-0 leading-none">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {item.subtitle}
                  </div>
                </div>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Drawer Bottom Footer with Language Switcher */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
              <span>{locale === 'ha' ? 'Zaɓi Harshe (Language):' : 'Select Language:'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSetLocale('en')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  locale === 'en'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                English 🇬🇧
              </button>
              <button
                type="button"
                onClick={() => handleSetLocale('ha')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  locale === 'ha'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Hausa 🇳🇬
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>SmartVillage</span>
            <span className="text-emerald-700 font-bold">100% Offline Ready</span>
          </div>
        </div>
      </aside>

      {/* Top Application Bar with Hamburger Menu Icon (☰) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-emerald-100 shadow-2xs">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
          {/* Left: Hamburger menu + Logo & Title */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 -ml-1 text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
              aria-label="Open menu"
              title={locale === 'ha' ? 'Buɗe jerin ayyuka' : 'Open menu'}
            >
              <Menu className="w-6 h-6 text-slate-800" />
            </button>

            <div
              onClick={() => navigateToTab(0)}
              className="flex items-center space-x-2 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1f7a4c] flex items-center justify-center text-white shadow-2xs">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#173326]">
                  {t(locale, 'appName')}
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  100% Offline
                </span>
              </div>
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
        {tab === 11 && <SoilHealthScreen locale={locale} />}
      </main>

      {/* Bottom Sticky Navigation Bar: ONLY 5 items for tap-friendly accessibility */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200/80 shadow-lg">
        <div className="max-w-2xl mx-auto px-1 sm:px-2">
          <div className="grid grid-cols-5 h-16 items-center">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateToTab(item.id)}
                  className={`flex flex-col items-center justify-center h-full py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'text-[#1f7a4c] font-black scale-105'
                      : 'text-slate-500 hover:text-slate-800 font-bold'
                  }`}
                  aria-label={t(locale, item.labelKey)}
                >
                  <div
                    className={`px-2.5 py-1 rounded-xl transition-all ${
                      isActive ? 'bg-emerald-100 text-emerald-800 shadow-2xs' : 'bg-transparent'
                    }`}
                  >
                    {item.emoji ? (
                      <span className="text-xl sm:text-2xl leading-none">{item.emoji}</span>
                    ) : (
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </div>
                  <span className="text-[11px] sm:text-xs tracking-tight mt-0.5 whitespace-nowrap truncate max-w-full">
                    {t(locale, item.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Global One-Time Microphone Permission Recovery Modal */}
      <MicrophonePermissionModal
        isOpen={showMicPermissionModal}
        onClose={() => setShowMicPermissionModal(false)}
        locale={locale}
        onPermissionGranted={handleMicPermissionGranted}
      />
    </div>
  );
}
export default App;
