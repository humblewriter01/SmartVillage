import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin as MapPinIcon,
  Navigation,
  Volume2,
  Filter,
  Trash2,
  CloudSun,
  Sprout,
  Droplets,
  AlertTriangle,
  X,
  Sparkles,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { Language, t } from '../utils/translations';
import { MapPin, mapService } from '../services/mapService';
import { voiceService } from '../services/voiceService';

interface OfflineMapScreenProps {
  locale: Language;
}

export const OfflineMapScreen: React.FC<OfflineMapScreenProps> = ({ locale }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [pins, setPins] = useState<MapPin[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [newPinCoord, setNewPinCoord] = useState<{ lat: number; lng: number } | null>(null);

  // GPS three states: 'loading' | 'success' | 'error' | 'idle'
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [dismissErrorBanner, setDismissErrorBanner] = useState(false);

  // New pin form state
  const [pinType, setPinType] = useState<MapPin['type']>('crop_disease');
  const [pinTitle, setPinTitle] = useState('');
  const [pinCropOrAnimal, setPinCropOrAnimal] = useState('');
  const [pinSeverity, setPinSeverity] = useState<MapPin['severity']>('moderate');
  const [pinNotes, setPinNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadPins = () => {
    const list = mapService.getPins();
    setPins(list);
  };

  useEffect(() => {
    loadPins();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center of Nigeria
      const map = L.map(mapContainerRef.current, {
        center: [9.082, 8.6753],
        zoom: 6,
        minZoom: 4,
        maxZoom: 18,
        attributionControl: false,
      });

      // Standard OSM tile layer
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      });
      tileLayer.addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      // Click on map to add pin
      map.on('click', (e: L.LeafletMouseEvent) => {
        setNewPinCoord({ lat: Number(e.latlng.lat.toFixed(4)), lng: Number(e.latlng.lng.toFixed(4)) });
        setIsAddingPin(true);
      });

      mapInstanceRef.current = map;
    }

    // Auto-fetch GPS on initial screen load
    fetchGpsLocation(false);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Robust GPS location fetch with Capacitor Geolocation & web fallback
  const fetchGpsLocation = async (isManualPin = false) => {
    setGpsStatus('loading');
    setDismissErrorBanner(false);

    let lat: number | null = null;
    let lng: number | null = null;

    // 1. Try Capacitor Geolocation Plugin
    try {
      const permCheck = await Geolocation.checkPermissions().catch(() => null);
      if (permCheck && permCheck.location !== 'granted') {
        const req = await Geolocation.requestPermissions().catch(() => null);
        if (req && req.location === 'denied') {
          console.warn('Geolocation permission denied by user');
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 9000,
      });

      if (position?.coords) {
        lat = Number(position.coords.latitude.toFixed(4));
        lng = Number(position.coords.longitude.toFixed(4));
      }
    } catch (pluginErr) {
      console.warn('Capacitor Geolocation exception, attempting navigator fallback:', pluginErr);
    }

    // 2. Fallback to browser navigator.geolocation for Vercel PWA
    if (lat === null || lng === null) {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          await new Promise<void>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                lat = Number(pos.coords.latitude.toFixed(4));
                lng = Number(pos.coords.longitude.toFixed(4));
                resolve();
              },
              (err) => reject(err),
              { enableHighAccuracy: true, timeout: 8000 }
            );
          });
        } catch (navErr) {
          console.warn('navigator.geolocation failed:', navErr);
        }
      }
    }

    // 3. Handle Three States: Loading, Success, Error
    if (lat !== null && lng !== null) {
      setGpsStatus('success');

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 13);

        // Add or update live position marker
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
        } else {
          const userIcon = L.divIcon({
            html: `<div style="background:#2563eb;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(37,99,235,0.7);"></div>`,
            className: 'user-loc-pin',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          const marker = L.marker([lat, lng], { icon: userIcon });
          marker.addTo(mapInstanceRef.current);
          userMarkerRef.current = marker;
        }
      }

      if (isManualPin) {
        setNewPinCoord({ lat, lng });
        setIsAddingPin(true);
      }

      showToast(locale === 'ha' ? 'An gano wurin GPS cikin nasara!' : 'GPS location found successfully!');
    } else {
      setGpsStatus('error');
    }
  };

  // Create custom marker icon
  const createPinIcon = (pin: MapPin) => {
    let colorClass = '#b91c1c';
    let iconLetter = '🌱';

    if (pin.type === 'weather_station') {
      colorClass = '#0284c7';
      iconLetter = '⛅';
    } else if (pin.type === 'water_point') {
      colorClass = '#059669';
      iconLetter = '💧';
    } else if (pin.type === 'livestock_alert') {
      colorClass = '#7c3aed';
      iconLetter = '🐔';
    }

    const html = `
      <div style="
        background: ${colorClass};
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        cursor: pointer;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 15px;
        ">${iconLetter}</span>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-leaflet-pin',
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -32],
    });
  };

  // Render markers whenever pins or filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filtered =
      filterType === 'all' ? pins : pins.filter((p) => p.type === filterType);

    filtered.forEach((pin) => {
      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: createPinIcon(pin),
      });

      marker.on('click', () => {
        setSelectedPin(pin);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [pins, filterType]);

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinCoord || !pinTitle.trim()) {
      showToast(locale === 'ha' ? 'Da fatan ka rubuta sunan alamar.' : 'Please enter a pin title.');
      return;
    }

    const created = mapService.addPin({
      type: pinType,
      title: pinTitle.trim(),
      title_hausa: pinTitle.trim(),
      cropOrAnimal: pinCropOrAnimal.trim() || undefined,
      severity: pinSeverity,
      latitude: newPinCoord.lat,
      longitude: newPinCoord.lng,
      locationName: `Lat ${newPinCoord.lat}, Lng ${newPinCoord.lng}`,
      notes: pinNotes.trim() || 'Community agricultural pin.',
      notes_hausa: pinNotes.trim() || 'Alamar gona da al\'umma suka sanya.',
    });

    loadPins();
    setIsAddingPin(false);
    setSelectedPin(created);
    setPinTitle('');
    setPinCropOrAnimal('');
    setPinNotes('');
    showToast(locale === 'ha' ? 'An adana alama a taswira!' : 'Pin saved to offline map!');
  };

  const handleDeletePin = (id: string) => {
    mapService.deletePin(id);
    loadPins();
    setSelectedPin(null);
    showToast(locale === 'ha' ? 'An goge alama.' : 'Pin deleted.');
  };

  const handleSpeakPin = async (pin: MapPin) => {
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const titleText = locale === 'ha' ? pin.title_hausa || pin.title : pin.title;
    const notesText = locale === 'ha' ? pin.notes_hausa || pin.notes : pin.notes;
    const locationText = pin.locationName;
    const speech = `${titleText}. ${locationText}. ${notesText}`;

    await voiceService.speak(speech, locale);
    setIsSpeaking(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#173326] flex items-center gap-2">
            <MapPinIcon className="w-6 h-6 text-emerald-600" />
            <span>{t(locale, 'mapSubtitle')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {locale === 'ha'
              ? 'Taswirar lura da cututtukan gona, yanayi, da wuraren ruwa mai tsabta'
              : 'Cached geographic view for pinning crop outbreaks, weather gauges & water'}
          </p>
        </div>

        {/* Quick GPS Pin Button */}
        <button
          onClick={() => fetchGpsLocation(true)}
          disabled={gpsStatus === 'loading'}
          className="flex items-center space-x-1.5 bg-[#1f7a4c] hover:bg-[#19653e] active:scale-95 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs cursor-pointer transition-all"
        >
          {gpsStatus === 'loading' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
          <span>{locale === 'ha' ? 'GPS Wuri' : 'GPS Pin'}</span>
        </button>
      </div>

      {/* GPS Status Banners: Three States */}
      {gpsStatus === 'loading' && (
        <div className="bg-sky-50 border border-sky-200 text-sky-900 px-3.5 py-2.5 rounded-2xl flex items-center space-x-2.5 text-xs font-semibold animate-pulse">
          <Loader2 className="w-4 h-4 text-sky-600 animate-spin shrink-0" />
          <span>{locale === 'ha' ? 'Ana neman GPS...' : 'Searching for GPS...'}</span>
        </div>
      )}

      {gpsStatus === 'error' && !dismissErrorBanner && (
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-2xl shadow-md border border-slate-700 flex items-center justify-between gap-2 text-xs animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold">
              {locale === 'ha'
                ? 'Kasa samun GPS. Taɓa kan taswira.'
                : 'Unable to get GPS. Tap on the map.'}
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => fetchGpsLocation(false)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{locale === 'ha' ? 'Sake gwadawa' : 'Retry'}</span>
            </button>
            <button
              onClick={() => setDismissErrorBanner(true)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {gpsStatus === 'success' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-xl flex items-center justify-between text-xs">
          <span className="font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping inline-block" />
            {locale === 'ha' ? 'An haɗa GPS daidai' : 'GPS centered on your position'}
          </span>
          <button
            onClick={() => setGpsStatus('idle')}
            className="text-emerald-700 hover:text-emerald-900 text-[11px] font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: t(locale, 'allPins'), icon: Filter },
          { id: 'crop_disease', label: t(locale, 'cropDiseasePin'), icon: Sprout },
          { id: 'weather_station', label: t(locale, 'weatherStationPin'), icon: CloudSun },
          { id: 'water_point', label: t(locale, 'waterPointPin'), icon: Droplets },
          { id: 'livestock_alert', label: t(locale, 'livestockPin'), icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = filterType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                active
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Leaflet Map Card */}
      <div className="relative rounded-2xl overflow-hidden border border-emerald-200/80 shadow-sm bg-[#e5ece8] h-[360px] sm:h-[420px]">
        {/* Leaflet Map Div */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Instructions Banner */}
        <div className="absolute top-2 left-2 right-2 z-20 pointer-events-none">
          <div className="bg-white/90 backdrop-blur text-[11px] text-slate-700 px-3 py-1.5 rounded-xl shadow-xs border border-slate-200/80 flex items-center justify-between">
            <span className="truncate">
              {locale === 'ha'
                ? '💡 Taɓa ko\'ina a taswira don sanya sabuwar alama'
                : '💡 Tap anywhere on the map to pin an agricultural observation'}
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md ml-2 shrink-0">
              {pins.length} {locale === 'ha' ? 'Alamomi' : 'Pins'}
            </span>
          </div>
        </div>
      </div>

      {/* Selected Pin Detail Sheet */}
      {selectedPin && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 shadow-sm space-y-3 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`p-2.5 rounded-xl text-white ${
                  selectedPin.type === 'crop_disease'
                    ? 'bg-red-600'
                    : selectedPin.type === 'weather_station'
                    ? 'bg-sky-600'
                    : selectedPin.type === 'water_point'
                    ? 'bg-emerald-600'
                    : 'bg-purple-600'
                }`}
              >
                {selectedPin.type === 'crop_disease' && <Sprout className="w-5 h-5" />}
                {selectedPin.type === 'weather_station' && <CloudSun className="w-5 h-5" />}
                {selectedPin.type === 'water_point' && <Droplets className="w-5 h-5" />}
                {selectedPin.type === 'livestock_alert' && <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {selectedPin.locationName}
                </span>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-800">
                  {locale === 'ha' ? selectedPin.title_hausa || selectedPin.title : selectedPin.title}
                </h3>
              </div>
            </div>

            <button
              onClick={() => setSelectedPin(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-xs sm:text-sm text-slate-700 space-y-1.5 border border-slate-100">
            {selectedPin.cropOrAnimal && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">
                  {locale === 'ha' ? 'Nau\'i:' : 'Crop/Subject:'}
                </span>
                <span className="font-bold text-slate-800">{selectedPin.cropOrAnimal}</span>
              </div>
            )}

            {selectedPin.severity && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">
                  {t(locale, 'pinSeverity')}:
                </span>
                <span
                  className={`font-bold uppercase text-[11px] px-2 py-0.5 rounded-full ${
                    selectedPin.severity === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : selectedPin.severity === 'high'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedPin.severity}
                </span>
              </div>
            )}

            <p className="mt-2 text-slate-600 leading-relaxed">
              {locale === 'ha' ? selectedPin.notes_hausa || selectedPin.notes : selectedPin.notes}
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => handleSpeakPin(selectedPin)}
              className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-emerald-700" />
              <span>{isSpeaking ? t(locale, 'stop') : t(locale, 'speakResult')}</span>
            </button>

            <button
              onClick={() => handleDeletePin(selectedPin.id)}
              className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-800 p-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t(locale, 'deleteRecord')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Pin Modal */}
      {isAddingPin && newPinCoord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <MapPinIcon className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base">
                  {t(locale, 'addPin')}
                </h3>
              </div>
              <button
                onClick={() => setIsAddingPin(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {locale === 'ha' ? 'Nau\'in Alama:' : 'Category:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'crop_disease', label: t(locale, 'cropDiseasePin') },
                    { id: 'weather_station', label: t(locale, 'weatherStationPin') },
                    { id: 'water_point', label: t(locale, 'waterPointPin') },
                    { id: 'livestock_alert', label: t(locale, 'livestockPin') },
                  ].map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setPinType(cat.id as MapPin['type'])}
                      className={`p-2 rounded-xl text-left font-semibold border transition-all cursor-pointer ${
                        pinType === cat.id
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t(locale, 'pinTitle')}
                </label>
                <input
                  type="text"
                  value={pinTitle}
                  onChange={(e) => setPinTitle(e.target.value)}
                  placeholder={locale === 'ha' ? 'Misali: Cutar albasa a gona' : 'E.g., Onion purple blotch on farm'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {locale === 'ha' ? 'Amfanin Gona / Dabba (Idan akwai):' : 'Crop / Animal (Optional):'}
                </label>
                <input
                  type="text"
                  value={pinCropOrAnimal}
                  onChange={(e) => setPinCropOrAnimal(e.target.value)}
                  placeholder={locale === 'ha' ? 'Misali: Albasa, Masara, Saniya...' : 'E.g., Onion, Maize, Cattle...'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t(locale, 'pinSeverity')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'moderate', 'high', 'critical'] as MapPin['severity'][]).slice(0, 3).map((sev) => (
                    <button
                      type="button"
                      key={sev}
                      onClick={() => setPinSeverity(sev)}
                      className={`p-2 rounded-xl text-center font-bold uppercase text-[11px] border cursor-pointer transition-all ${
                        pinSeverity === sev
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t(locale, 'pinNotes')}
                </label>
                <textarea
                  value={pinNotes}
                  onChange={(e) => setPinNotes(e.target.value)}
                  rows={2}
                  placeholder={locale === 'ha' ? 'Ƙarin bayani...' : 'Observations and notes...'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingPin(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  {locale === 'ha' ? 'Fasa' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {t(locale, 'save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
