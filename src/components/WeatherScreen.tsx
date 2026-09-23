import React, { useState } from 'react';
import {
  CloudSun,
  RefreshCw,
  Droplets,
  Thermometer,
  MapPin,
  Calendar,
  CloudRain,
  Sun,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import {
  WeatherDay,
  NIGERIAN_LOCATIONS,
  NigerianLocation,
} from '../services/weatherService';

interface WeatherScreenProps {
  locale: Language;
  forecast: WeatherDay[];
  loading: boolean;
  isCached: boolean;
  onRefresh: (lat?: number, lon?: number) => void;
}

export const WeatherScreen: React.FC<WeatherScreenProps> = ({
  locale,
  forecast,
  loading,
  isCached,
  onRefresh,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<NigerianLocation>(
    NIGERIAN_LOCATIONS[0]
  );
  const [detectingGps, setDetectingGps] = useState(false);

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const loc = NIGERIAN_LOCATIONS.find((l) => l.name === e.target.value);
    if (loc) {
      setSelectedLocation(loc);
      onRefresh(loc.lat, loc.lon);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingGps(false);
        const { latitude, longitude } = pos.coords;
        setSelectedLocation({
          name: 'Current GPS',
          state: 'Nigeria',
          lat: latitude,
          lon: longitude,
        });
        onRefresh(latitude, longitude);
      },
      () => {
        setDetectingGps(false);
        onRefresh(selectedLocation.lat, selectedLocation.lon);
      },
      { timeout: 8000 }
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(locale === 'ha' ? 'ha-NG' : 'en-NG', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const getWeatherAgroTip = (day: WeatherDay) => {
    if (day.rain > 10) {
      return locale === 'ha'
        ? 'Ruwa mai yawa: Kula da magudanar ruwa, kada a fesa magani a yau.'
        : 'Heavy rain: Check field drainage; avoid spraying chemical products today.';
    }
    if (day.rain > 1.5) {
      return locale === 'ha'
        ? 'Akwai damshi: Yanayi mai kyau ga shuka ko ciyawa.'
        : 'Good planting moisture: Favorable for germination and weeding.';
    }
    if (day.max > 35) {
      return locale === 'ha'
        ? 'Zafi mai tsanani: Samar da inuwa da ruwa ga dabbobi da kananan shuke-shuke.'
        : 'High heat: Provide shade and water for livestock and vulnerable seedlings.';
    }
    return locale === 'ha'
      ? 'Yanayi matsakaici: Ya dace da duban gona da shirin girbi.'
      : 'Moderate weather: Suitable for routine field scouting and harvest planning.';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1f7a4c]">
            {t(locale, 'weatherTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {isCached ? t(locale, 'cached') : t(locale, 'online')} · Open-Meteo
          </p>
        </div>

        <button
          onClick={() => onRefresh(selectedLocation.lat, selectedLocation.lon)}
          disabled={loading}
          className="p-2.5 bg-white border border-emerald-200 rounded-xl text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer shadow-2xs"
          title={t(locale, 'refresh')}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Location Selector */}
      <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#1f7a4c]" />
            {t(locale, 'selectLocation')}
          </label>
          <button
            onClick={handleDetectLocation}
            disabled={detectingGps}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
          >
            {detectingGps ? 'Detecting GPS…' : 'Use My GPS'}
          </button>
        </div>

        <select
          value={selectedLocation.name}
          onChange={handleLocationChange}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {NIGERIAN_LOCATIONS.map((loc) => (
            <option key={loc.name} value={loc.name}>
              {loc.name} ({loc.state} State)
            </option>
          ))}
          {selectedLocation.name === 'Current GPS' && (
            <option value="Current GPS">Current GPS Location</option>
          )}
        </select>
      </div>

      {/* Forecast list */}
      <div className="space-y-3">
        {forecast.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
            <CloudSun className="w-12 h-12 mx-auto text-slate-400 mb-2" />
            <p className="text-sm">{t(locale, 'noWeather')}</p>
          </div>
        ) : (
          forecast.map((day, idx) => {
            const isToday = idx === 0;
            return (
              <div
                key={day.date}
                className={`bg-white rounded-2xl p-4 border transition-all ${
                  isToday
                    ? 'border-emerald-300 ring-1 ring-emerald-200 shadow-sm'
                    : 'border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        day.rain > 2
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {day.rain > 2 ? (
                        <CloudRain className="w-5 h-5" />
                      ) : (
                        <Sun className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-base">
                          {formatDate(day.date)}
                        </span>
                        {isToday && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                        <span>
                          {t(locale, 'rain')}: {day.rain.toFixed(1)} mm
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-800">
                      {Math.round(day.max)}° / {Math.round(day.min)}°C
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {t(locale, 'max')} / {t(locale, 'min')}
                    </div>
                  </div>
                </div>

                {/* Farming tip based on weather */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600 flex items-start space-x-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                    Farm tip
                  </span>
                  <p className="flex-1">{getWeatherAgroTip(day)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
