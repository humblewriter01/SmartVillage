import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  MapPin,
  Send,
  Phone,
  Copy,
  Check,
  Volume2,
  BellRing,
  RefreshCw,
  Share2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Settings,
  X,
  Info,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Language } from '../utils/translations';
import { voiceService } from '../services/voiceService';

interface QuickAlertCardProps {
  locale: Language;
}

interface DistressType {
  id: string;
  nameEn: string;
  nameHa: string;
  emoji: string;
  defaultMessageEn: string;
  defaultMessageHa: string;
}

const DISTRESS_TYPES: DistressType[] = [
  {
    id: 'medical',
    nameEn: 'Medical Emergency / Snake Bite',
    nameHa: 'Gaggawar Lafiya / Cizon Maciji',
    emoji: '🚑',
    defaultMessageEn: 'Critical medical emergency / snakebite in the field! Urgent medical help needed.',
    defaultMessageHa: 'Gaggawar lafiya / cizon maciji ko hadari a gona! Ana neman taimakon likita cikin gaggawa.',
  },
  {
    id: 'security',
    nameEn: 'Security Alert / Kidnapping',
    nameHa: 'Faɗakarwar Tsaro / Neman Ɗauki',
    emoji: '🛡️',
    defaultMessageEn: 'Security threat / distress at farmland! Immediate community or security assistance needed.',
    defaultMessageHa: 'Matsalar tsaro ko barazana a gona! Ana neman ɗaukin jami\'an tsaro ko \'yan sintiri cikin gaggawa.',
  },
  {
    id: 'breakdown',
    nameEn: 'Stranding / Vehicle Breakdown',
    nameHa: 'Makalewa / Lalacewar Taraktoci',
    emoji: '🚜',
    defaultMessageEn: 'Machinery breakdown / vehicle stranded in remote farmland. Assistance required.',
    defaultMessageHa: 'Lalacewar tarakta ko abin hawa a dajin gona. Ana buƙatar ɗauki don janyewa ko gyara.',
  },
  {
    id: 'fire',
    nameEn: 'Bush / Farm Fire',
    nameHa: 'Gobarar Daji / Gona',
    emoji: '🔥',
    defaultMessageEn: 'Wildfire / bushfire threatening farms and crop storage! Urgent firefighting help needed.',
    defaultMessageHa: 'Gobarar daji na barazana ga amfanin gona da rumbuna! Ana neman ɗaukin kashe gobara.',
  },
  {
    id: 'flood',
    nameEn: 'Farm Flood',
    nameHa: 'Ambaliyar Ruwa a Gona',
    emoji: '🌊',
    defaultMessageEn: 'Flash flood or river overflow submerging farm fields! Urgent evacuation or flood response needed.',
    defaultMessageHa: 'Ambaliyar ruwa ko karyewar madatsar ruwa na lalata gona! Ana neman taimakon gaggawa.',
  },
];

const EMERGENCY_CONTACT_KEY = 'smartvillage.emergency_contact';
const DEFAULT_CONTACT = '112';

export const QuickAlertCard: React.FC<QuickAlertCardProps> = ({ locale }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDistressId, setSelectedDistressId] = useState<string>('medical');
  const [customNote, setCustomNote] = useState<string>('');
  const [emergencyPhone, setEmergencyPhone] = useState<string>(() => {
    try {
      return localStorage.getItem(EMERGENCY_CONTACT_KEY) || DEFAULT_CONTACT;
    } catch {
      return DEFAULT_CONTACT;
    }
  });
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState(emergencyPhone);

  // Two-Stage Progressive GPS State (Option 2)
  const LAST_KNOWN_GPS_KEY = 'sv_last_known_gps';

  interface GpsLocation {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    isCached?: boolean;
  }

  // Pre-fill immediately with cached last known location from localStorage
  const [coords, setCoords] = useState<GpsLocation | null>(() => {
    try {
      const saved = localStorage.getItem('sv_last_known_gps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          return {
            latitude: Number(parsed.latitude),
            longitude: Number(parsed.longitude),
            accuracy: Math.round(parsed.accuracy || 600),
            timestamp: parsed.timestamp || Date.now(),
            isCached: true,
          };
        }
      }
    } catch {}
    return null;
  });

  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isUnreliable, setIsUnreliable] = useState(false);
  const [showLowAccuracyModal, setShowLowAccuracyModal] = useState(false);

  const bestCoordsRef = useRef<GpsLocation | null>(coords);
  const activeWatchIdRef = useRef<string | null>(null);
  const activeWebWatchIdRef = useRef<number | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Status flags
  const [copied, setCopied] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const sirenTimeoutRef = useRef<number | null>(null);
  const [isSpeakingSosHeader, setIsSpeakingSosHeader] = useState(false);
  const [isSpeakingInnerBox, setIsSpeakingInnerBox] = useState(false);
  const [speakingTypeId, setSpeakingTypeId] = useState<string | null>(null);

  // Option 1: Process incoming GPS fix
  // Updates when accuracy is equal or better, AND when the reading has a newer timestamp within the last 10 seconds.
  const processReading = (pos: { coords: { latitude: number; longitude: number; accuracy: number }; timestamp?: number }) => {
    if (!pos?.coords) return;
    const lat = Number(pos.coords.latitude.toFixed(6));
    const lng = Number(pos.coords.longitude.toFixed(6));
    const acc = Math.round(pos.coords.accuracy);
    const timestamp = pos.timestamp || Date.now();

    setLiveAccuracy(acc);

    const reading: GpsLocation = {
      latitude: lat,
      longitude: lng,
      accuracy: acc,
      timestamp,
      isCached: false,
    };

    const current = bestCoordsRef.current;
    const isNewerWithin10s = !current || (timestamp >= current.timestamp && (Date.now() - timestamp) <= 10000);
    const isBetterOrEqual = !current || acc <= current.accuracy;

    // Do not freeze display: update if no coords, or previous was cached, or better accuracy,
    // OR equal/better accuracy with fresh timestamp.
    if (!current || current.isCached || acc < current.accuracy || (isBetterOrEqual && isNewerWithin10s)) {
      bestCoordsRef.current = reading;
      setCoords(reading);
      setIsUnreliable(acc > 100);
      setGpsError(null);

      // Persist as last known position for immediate display on next launch (Option 2)
      try {
        localStorage.setItem(
          LAST_KNOWN_GPS_KEY,
          JSON.stringify({
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            timestamp,
          })
        );
      } catch {}
    }
  };

  // Option 3: Native-only engine on Android, Web fallback on PWA, continuous watchPosition
  const startGpsAcquisition = async () => {
    isCancelledRef.current = false;
    setGpsLoading(true);
    setGpsError(null);
    setLiveAccuracy(null);

    // 1. Clear previous watch listeners if active
    if (activeWatchIdRef.current) {
      try {
        await Geolocation.clearWatch({ id: activeWatchIdRef.current });
      } catch {}
      activeWatchIdRef.current = null;
    }
    if (activeWebWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(activeWebWatchIdRef.current);
      } catch {}
      activeWebWatchIdRef.current = null;
    }

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // NATIVE ANDROID: Use ONLY @capacitor/geolocation (no dual-listener contention on MediaTek)
      try {
        const perm = await Geolocation.checkPermissions().catch(() => null);
        if (perm?.location !== 'granted') {
          await Geolocation.requestPermissions().catch(() => null);
        }

        // Fast initial query: maximumAge: 15000 (accept 15s cache), timeout: 8000
        Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 15000,
        })
          .then((pos) => {
            if (!isCancelledRef.current && pos?.coords) {
              processReading(pos);
            }
          })
          .catch(() => {});

        // Continuous watch: enableHighAccuracy: true, timeout: 60000, maximumAge: 0
        // Runs without artificial exit loop so hardware GPS can refine over 20-45s
        const watchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 60000,
            maximumAge: 0,
          },
          (position) => {
            if (isCancelledRef.current) return;
            if (position?.coords) {
              processReading(position);
            }
          }
        );
        activeWatchIdRef.current = watchId;
      } catch (err) {
        if (!isCancelledRef.current && !bestCoordsRef.current) {
          setGpsLoading(false);
          setGpsError(
            locale === 'ha'
              ? 'Ba a iya samun daidaiton GPS ba. Bincika ko an kunna izinin wuri.'
              : 'Could not obtain GPS lock. Please check location permissions.'
          );
        }
      }
    } else {
      // WEB/PWA: Use standard navigator.geolocation
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        // Fast initial query
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isCancelledRef.current && pos?.coords) {
              processReading(pos);
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
        );

        // Continuous watch
        const webWatchId = navigator.geolocation.watchPosition(
          (position) => {
            if (isCancelledRef.current) return;
            if (position?.coords) {
              processReading(position);
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 }
        );
        activeWebWatchIdRef.current = webWatchId;
      }
    }
  };

  useEffect(() => {
    startGpsAcquisition();
    return () => {
      isCancelledRef.current = true;
      if (activeWatchIdRef.current) {
        Geolocation.clearWatch({ id: activeWatchIdRef.current }).catch(() => {});
      }
      if (activeWebWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(activeWebWatchIdRef.current);
      }
      stopSiren();
    };
  }, []);

  const selectedDistress =
    DISTRESS_TYPES.find((d) => d.id === selectedDistressId) || DISTRESS_TYPES[0];

  // Compose SMS text with highest precision reading
  const activeDisplayCoords = coords || bestCoordsRef.current;
  const hasCoords = activeDisplayCoords !== null;
  const lat = hasCoords ? activeDisplayCoords.latitude.toFixed(5) : '0.00000';
  const lng = hasCoords ? activeDisplayCoords.longitude.toFixed(5) : '0.00000';
  const mapsUrl = hasCoords ? `https://maps.google.com/?q=${lat},${lng}` : '';
  const accuracyStr = activeDisplayCoords?.accuracy ? ` (±${activeDisplayCoords.accuracy}m)` : '';

  // Crucial: Keep the ±600m warning message in the outgoing SMS body
  const warningLine =
    activeDisplayCoords?.accuracy && (activeDisplayCoords.accuracy > 100 || isUnreliable || activeDisplayCoords.isCached)
      ? `\n⚠️ ${
          locale === 'ha'
            ? `GARGAƊI: Ƙarancin daidaiton GPS (±${activeDisplayCoords.accuracy}m). Wurin na iya zama na kusan (hasumiyar waya).`
            : `WARNING: Low GPS accuracy (±${activeDisplayCoords.accuracy}m). Location is approximate (cell tower).`
        }`
      : '';

  const distressHeadlineEn = selectedDistress.nameEn;
  const distressHeadlineHa = selectedDistress.nameHa;
  const distressMsgEn = selectedDistress.defaultMessageEn;
  const distressMsgHa = selectedDistress.defaultMessageHa;

  const fullSmsBody = `[EMERGENCY / GAGGAWA - SMARTVILLAGE]
${selectedDistress.emoji} ${distressHeadlineEn} (${distressHeadlineHa})
${locale === 'ha' ? distressMsgHa : distressMsgEn}
${customNote ? `Note: "${customNote}"` : ''}

📍 GPS: Lat ${lat}, Long ${lng}${accuracyStr}${warningLine}
${mapsUrl ? `🗺️ Map: ${mapsUrl}\n` : ''}⏱️ Time: ${new Date().toLocaleTimeString()}

Please send help immediately! / A tura agaji cikin gaggawa!`;

  const handleSavePhone = () => {
    const cleaned = tempPhone.trim();
    if (cleaned) {
      setEmergencyPhone(cleaned);
      try {
        localStorage.setItem(EMERGENCY_CONTACT_KEY, cleaned);
      } catch {}
    }
    setIsEditingPhone(false);
  };

  // Option 2: Trigger SMS with confirmation dialog if accuracy > 100m or cached
  const handleSendSms = () => {
    if (activeDisplayCoords?.accuracy && (activeDisplayCoords.accuracy > 100 || activeDisplayCoords.isCached)) {
      setShowLowAccuracyModal(true);
      return;
    }
    proceedWithSms();
  };

  const proceedWithSms = () => {
    setShowLowAccuracyModal(false);
    const cleanPhone = emergencyPhone.replace(/[^0-9+]/g, '');
    const isIOS =
      typeof navigator !== 'undefined' &&
      /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const smsUrl = `sms:${cleanPhone}${separator}body=${encodeURIComponent(
      fullSmsBody
    )}`;

    window.location.href = smsUrl;
  };

  // Copy SMS text
  const handleCopy = () => {
    navigator.clipboard.writeText(fullSmsBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Web Share API
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SOS Alert: ${distressHeadlineEn}`,
          text: fullSmsBody,
          url: mapsUrl,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  // Safely stop siren synthesizer and release audio resources
  const stopSiren = () => {
    if (sirenTimeoutRef.current) {
      clearTimeout(sirenTimeoutRef.current);
      sirenTimeoutRef.current = null;
    }
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch {}
      oscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
      } catch {}
      audioContextRef.current = null;
    }
    if (audioContext) {
      try {
        if (audioContext.state !== 'closed') {
          audioContext.close().catch(() => {});
        }
      } catch {}
      setAudioContext(null);
    }
    setIsAlarmPlaying(false);
  };

  // Cleanup on unmount to prevent leaks or closed AudioContext errors
  useEffect(() => {
    return () => {
      stopSiren();
    };
  }, []);

  // Audible Siren Beep via Web Audio API (100% offline, synthetic synthesizer)
  const toggleSiren = () => {
    if (isAlarmPlaying) {
      stopSiren();
      return;
    }

    try {
      stopSiren();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      setAudioContext(ctx);
      setIsAlarmPlaying(true);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillatorRef.current = osc;

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);

      // Modulate frequency to create an emergency siren wave (700Hz to 1100Hz)
      const now = ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        osc.frequency.setValueAtTime(750, now + i * 0.8);
        osc.frequency.linearRampToValueAtTime(1150, now + i * 0.8 + 0.4);
        osc.frequency.linearRampToValueAtTime(750, now + i * 0.8 + 0.8);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      // Automatically stop after 6.4 seconds
      sirenTimeoutRef.current = window.setTimeout(() => {
        stopSiren();
      }, 6400);
    } catch {
      stopSiren();
    }
  };

  // Voice readout
  const handleSpeakAlert = () => {
    const speech =
      locale === 'ha'
        ? `Faɗakarwar gaggawa! ${distressHeadlineHa}. Ina buƙatar agaji a gona. Matsayin GPS: latitude ${lat}, longitude ${lng}. A aika taimako cikin hanzari.`
        : `Emergency distress alert! ${distressHeadlineEn}. Need urgent assistance at farmland. GPS coordinates: latitude ${lat}, longitude ${lng}. Please dispatch help immediately.`;
    voiceService.speak(speech, locale);
  };

  // Read-Aloud for SOS Header
  const handleSpeakSosHeader = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeakingSosHeader) {
      voiceService.stopSpeaking();
      setIsSpeakingSosHeader(false);
      return;
    }
    voiceService.stopSpeaking();
    setIsSpeakingSosHeader(true);
    const textToSpeak = locale === 'ha' ? 'S.O.S. Faɗakarwar Gaggawa.' : 'SOS. Emergency Alert.';
    await voiceService.speak(textToSpeak, locale);
    setIsSpeakingSosHeader(false);
  };

  // Read-Aloud for each Emergency Type
  const handleSpeakEmergencyType = async (type: DistressType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (speakingTypeId === type.id) {
      voiceService.stopSpeaking();
      setSpeakingTypeId(null);
      return;
    }
    voiceService.stopSpeaking();
    setSpeakingTypeId(type.id);
    const textToSpeak = locale === 'ha' ? type.nameHa : type.nameEn;
    await voiceService.speak(textToSpeak, locale);
    setSpeakingTypeId(null);
  };

  // Read-Aloud for inner GPS & Contact box
  const handleSpeakInnerBox = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeakingInnerBox) {
      voiceService.stopSpeaking();
      setIsSpeakingInnerBox(false);
      return;
    }
    voiceService.stopSpeaking();
    setIsSpeakingInnerBox(true);
    const textToSpeak =
      locale === 'ha'
        ? `Wurin GPS na gaggawa: latitude ${lat}, longitude ${lng}. Lambar tuntuba ta gaggawa: ${emergencyPhone}.`
        : `Emergency GPS location: latitude ${lat}, longitude ${lng}. Emergency contact: ${emergencyPhone}.`;
    await voiceService.speak(textToSpeak, locale);
    setIsSpeakingInnerBox(false);
  };

  return (
    <div className="bg-gradient-to-br from-rose-900 via-red-800 to-rose-950 text-white rounded-3xl p-4 sm:p-5 shadow-lg shadow-rose-950/30 border border-rose-600/40 relative overflow-hidden transition-all">
      {/* Background Decorative Pulsing Radar Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
          <div className="relative flex items-center justify-center shrink-0">
            <span className="w-3 h-3 bg-rose-400 rounded-full animate-ping absolute" />
            <div className="w-9 h-9 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-md border border-rose-400/50">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="font-black text-xs sm:text-base tracking-wide text-white uppercase flex items-center gap-1">
                <span>{locale === 'ha' ? 'S.O.S — Faɗakarwar Gaggawa' : 'SOS — Emergency Alert'}</span>
              </h2>

              {/* Read Aloud Icon for SOS Header */}
              <button
                type="button"
                onClick={handleSpeakSosHeader}
                className={`p-1 sm:p-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0 ${
                  isSpeakingSosHeader
                    ? 'bg-amber-400 text-slate-900 border-amber-300 animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 text-rose-100 border-white/20'
                }`}
                title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
              >
                <Volume2 className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSpeakingSosHeader ? 'animate-bounce text-slate-900' : ''}`} />
              </button>

              <span className="text-[9px] sm:text-[10px] font-extrabold bg-rose-500/80 px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider text-rose-100 border border-rose-400/40 shrink-0">
                Offline SMS
              </span>
            </div>
            <p className="text-[11px] text-rose-200 mt-0.5 truncate">
              {locale === 'ha'
                ? 'Aika coordinates na GPS da saƙon neman ɗauki ta SMS ba tare da intanet ba'
                : 'Broadcast live GPS coordinates & distress signal via SMS without internet'}
            </p>
          </div>
        </div>

        {/* Toggle Expand / Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-white/10 hover:bg-white/20 active:scale-95 text-white px-2 sm:px-2.5 py-1.5 rounded-xl border border-white/20 text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all shrink-0 ml-1"
        >
          <span>{isExpanded ? (locale === 'ha' ? 'Rage' : 'Collapse') : (locale === 'ha' ? 'Faɗaɗa' : 'Open')}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Quick 1-Tap Trigger Banner (Always visible) */}
      <div className="mt-3.5 bg-black/25 backdrop-blur-xs rounded-2xl p-3 border border-rose-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2 text-xs min-w-0">
          <div className="p-1.5 bg-rose-500/30 rounded-lg text-rose-300 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-rose-100 flex flex-wrap items-center gap-1.5">
              <span>GPS:</span>
              {activeDisplayCoords ? (
                <>
                  <span className="font-mono text-white font-black text-xs">
                    {lat}, {lng}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black border ${
                      !isUnreliable && activeDisplayCoords.accuracy < 30
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/60'
                        : !isUnreliable && activeDisplayCoords.accuracy <= 100
                        ? 'bg-amber-500/30 text-amber-200 border-amber-400/60'
                        : 'bg-rose-500/40 text-rose-200 border-rose-400/70'
                    }`}
                  >
                    <span>±{activeDisplayCoords.accuracy}m</span>
                    {activeDisplayCoords.isCached && (
                      <span className="text-[9px] uppercase tracking-wide bg-amber-950/70 px-1 py-0.2 rounded border border-amber-400/40">
                        {locale === 'ha' ? 'Wuri na ƙarshe' : 'Last known'}
                      </span>
                    )}
                    {!activeDisplayCoords.isCached && activeDisplayCoords.accuracy < 30 && (
                      <span className="text-[9px] uppercase tracking-wide bg-emerald-950/70 px-1 py-0.2 rounded border border-emerald-400/40">
                        {locale === 'ha' ? 'GPS na yanzu' : 'Current GPS'}
                      </span>
                    )}
                    {gpsLoading && activeDisplayCoords.accuracy >= 30 && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                    )}
                  </span>
                </>
              ) : (
                <span className="text-amber-200 text-xs font-semibold animate-pulse flex items-center gap-1">
                  <span>{locale === 'ha' ? 'Ana neman GPS...' : 'Searching for GPS...'}</span>
                </span>
              )}

              {/* Real status per Option 1 & 2 (No fake satellite count, honest counter removed) */}
              {activeDisplayCoords ? (
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${
                    activeDisplayCoords.isCached
                      ? 'text-amber-200/90'
                      : activeDisplayCoords.accuracy < 30
                      ? 'text-emerald-300 font-bold'
                      : activeDisplayCoords.accuracy <= 100
                      ? 'text-amber-200/90'
                      : 'text-rose-200/90'
                  }`}
                >
                  {activeDisplayCoords.isCached
                    ? locale === 'ha'
                      ? 'Wuri na ƙarshe (Ana neman sabo...)'
                      : 'Last known location (Acquiring live...)'
                    : activeDisplayCoords.accuracy < 30
                    ? locale === 'ha'
                      ? 'GPS mai kyau'
                      : 'GPS locked'
                    : activeDisplayCoords.accuracy <= 100
                    ? locale === 'ha'
                      ? 'Ana inganta daidaito...'
                      : 'Refining accuracy...'
                    : locale === 'ha'
                    ? 'Ana amfani da hasumiyar waya...'
                    : 'Using cell tower approximate location...'}
                </span>
              ) : null}
            </div>
            <div className="text-[10px] text-rose-300/90 truncate mt-0.5">
              {locale === 'ha' ? 'Lambar Tuntuba:' : 'Contact:'}{' '}
              <span className="font-mono font-bold text-white">{emergencyPhone}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Read Aloud Inner Box Info */}
          <button
            onClick={handleSpeakInnerBox}
            title={locale === 'ha' ? 'Karanta bayanan akwati da murya' : 'Read box details aloud'}
            className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 shrink-0 border ${
              isSpeakingInnerBox
                ? 'bg-amber-400 text-slate-900 border-amber-300 animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-rose-100 border-white/15'
            }`}
          >
            <Volume2 className={`w-4 h-4 ${isSpeakingInnerBox ? 'animate-bounce text-slate-900' : ''}`} />
          </button>

          {/* Refresh GPS */}
          <button
            onClick={startGpsAcquisition}
            disabled={gpsLoading}
            title={locale === 'ha' ? 'Sake bincika GPS' : 'Refresh GPS'}
            className="p-2 bg-white/10 hover:bg-white/20 text-rose-100 rounded-xl transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Sound Alarm Siren */}
          <button
            onClick={toggleSiren}
            title={locale === 'ha' ? 'Ƙarar Ƙararrawa' : 'Siren Alarm'}
            className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 shrink-0 border ${
              isAlarmPlaying
                ? 'bg-amber-400 text-slate-900 border-amber-300 animate-bounce'
                : 'bg-white/10 hover:bg-white/20 text-rose-100 border-white/15'
            }`}
          >
            <BellRing className="w-4 h-4" />
          </button>

          {/* Direct 1-Tap SMS Send */}
          <button
            onClick={handleSendSms}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-rose-500 hover:bg-rose-400 active:scale-95 text-white px-4 py-2 rounded-xl font-black text-xs shadow-md shadow-rose-950/40 border border-rose-300/40 cursor-pointer transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{locale === 'ha' ? 'Aika SMS Nan Take' : 'Send Distress SMS'}</span>
          </button>
        </div>
      </div>

      {/* Expanded Control & Customization Section */}
      {isExpanded && (
        <div className="mt-4 pt-3.5 border-t border-rose-700/50 space-y-4 animate-fade-in">
          {/* Distress Type Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-rose-200 block mb-2">
              {locale === 'ha' ? 'Zaɓi Nau\'in Gaggawa:' : 'Select Distress Reason:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {DISTRESS_TYPES.map((type) => {
                const isSelected = type.id === selectedDistressId;
                const isSpeakingThis = speakingTypeId === type.id;
                return (
                  <div
                    key={type.id}
                    className={`p-2 rounded-xl text-left border transition-all flex items-center justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-white text-rose-950 border-white font-extrabold shadow-sm'
                        : 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 border-rose-700/60 text-xs'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDistressId(type.id)}
                      className="flex items-center space-x-2 flex-1 min-w-0 cursor-pointer text-left py-1"
                    >
                      <span className="text-lg shrink-0">{type.emoji}</span>
                      <span className="text-xs truncate">
                        {locale === 'ha' ? type.nameHa : type.nameEn}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleSpeakEmergencyType(type, e)}
                      className={`p-1.5 rounded-lg shrink-0 transition-all cursor-pointer active:scale-95 ${
                        isSpeakingThis
                          ? 'bg-amber-400 text-rose-950 animate-pulse'
                          : isSelected
                          ? 'hover:bg-rose-100 text-rose-700'
                          : 'hover:bg-rose-800 text-rose-300'
                      }`}
                      title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeakingThis ? 'animate-bounce' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Emergency Recipient Phone Settings */}
          <div className="bg-black/25 rounded-2xl p-3 border border-rose-500/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-rose-400" />
                <span>{locale === 'ha' ? 'Lambar Waya da za a Aika wa:' : 'Distress Recipient Phone Number:'}</span>
              </span>
              {!isEditingPhone ? (
                <button
                  onClick={() => {
                    setTempPhone(emergencyPhone);
                    setIsEditingPhone(true);
                  }}
                  className="text-[11px] text-rose-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>{locale === 'ha' ? 'Canza' : 'Edit'}</span>
                </button>
              ) : (
                <button
                  onClick={handleSavePhone}
                  className="text-[11px] text-emerald-300 hover:text-emerald-200 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>{locale === 'ha' ? 'Ajiye' : 'Save'}</span>
                </button>
              )}
            </div>

            {isEditingPhone ? (
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="tel"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  placeholder="e.g. 08012345678 or 112"
                  className="flex-1 bg-black/40 border border-rose-400 rounded-xl px-3 py-1.5 text-xs text-white placeholder-rose-400/50 focus:outline-none focus:ring-1 focus:ring-rose-300 font-mono font-bold"
                />
                <button
                  onClick={handleSavePhone}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  {locale === 'ha' ? 'Ajiye' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-black text-rose-100 bg-white/10 px-2.5 py-1 rounded-lg">
                  {emergencyPhone}
                </span>
                <span className="text-[10px] text-rose-300">
                  {emergencyPhone === '112'
                    ? (locale === 'ha' ? 'Lambar Gaggawa ta Najeriya' : 'Nigeria National Emergency')
                    : (locale === 'ha' ? 'Lambar da ka ajiye' : 'Saved Custom Contact')}
                </span>
              </div>
            )}
          </div>

          {/* Optional Farm Landmark Note */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-rose-200 block mb-1">
              {locale === 'ha' ? 'Karin Bayani / Alamar Gona (Na Zabi):' : 'Optional Landmark / Specific Details:'}
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder={
                locale === 'ha'
                  ? 'Misali: Gona kusa da babban icen mangoro, kudancin rafi…'
                  : 'e.g. Near the big mango tree, south of the irrigation canal…'
              }
              className="w-full bg-black/30 border border-rose-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-rose-300/40 focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
          </div>

          {/* SMS Message Preview Box */}
          <div className="bg-black/35 rounded-2xl p-3 border border-rose-500/20 text-xs font-mono space-y-1 text-rose-100">
            <div className="flex items-center justify-between border-b border-rose-800/60 pb-1 mb-1 text-[10px] uppercase font-bold text-rose-300">
              <span>{locale === 'ha' ? 'Samfurin Saƙon SMS:' : 'SMS Message Preview:'}</span>
              <span>100% Offline 2G/GSM</span>
            </div>
            <div className="whitespace-pre-line text-[11px] leading-relaxed select-all">
              {fullSmsBody}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Primary SMS Button */}
            <button
              onClick={handleSendSms}
              className="flex-1 flex items-center justify-center space-x-2 bg-white text-rose-900 hover:bg-rose-50 active:scale-95 font-black text-xs py-2.5 px-4 rounded-xl shadow-md cursor-pointer transition-all"
            >
              <Send className="w-4 h-4 text-rose-700" />
              <span>{locale === 'ha' ? 'Bude Manhajar SMS' : 'Launch SMS App Now'}</span>
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-100 active:scale-95 font-bold text-xs py-2.5 px-3 rounded-xl cursor-pointer transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? (locale === 'ha' ? 'An Kwafa!' : 'Copied!') : (locale === 'ha' ? 'Kwafi Saƙo' : 'Copy Text')}</span>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex items-center space-x-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-100 active:scale-95 font-bold text-xs py-2.5 px-3 rounded-xl cursor-pointer transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>{locale === 'ha' ? 'Raba' : 'Share'}</span>
            </button>

            {/* Read Aloud Button */}
            <button
              onClick={handleSpeakAlert}
              className="flex items-center space-x-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-100 active:scale-95 font-bold text-xs py-2.5 px-3 rounded-xl cursor-pointer transition-all"
            >
              <Volume2 className="w-4 h-4" />
              <span>{locale === 'ha' ? 'Karanta' : 'Audio'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Option 2: Low-Accuracy Confirmation Dialog */}
      {showLowAccuracyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm text-amber-300 uppercase tracking-wide">
                  {locale === 'ha' ? 'Daidaiton GPS Bai Cika Ba' : 'GPS Accuracy Notice'}
                </h3>
                <p className="text-xs text-slate-200 mt-1.5 leading-relaxed font-semibold">
                  {locale === 'ha'
                    ? `GPS bai daidaita ba (±${activeDisplayCoords?.accuracy || 600}m). Aika duk da haka?`
                    : `GPS not precise (±${activeDisplayCoords?.accuracy || 600}m). Send anyway?`}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  {activeDisplayCoords?.isCached
                    ? locale === 'ha'
                      ? 'Wannan wuri ne na ƙarshe da aka ajiye a wayar ka, ba sabon binciken yanzu ba.'
                      : 'This is the last cached location saved on your device, not a fresh live fix.'
                    : locale === 'ha'
                    ? 'Wurin yana iya zama na hasumiyar waya, ba ainihin inda kake a gona ba.'
                    : 'The coordinates may reflect a cellular tower instead of your exact position.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowLowAccuracyModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
              >
                {locale === 'ha' ? 'A\'a, Jira GPS' : 'Cancel, Wait'}
              </button>
              <button
                type="button"
                onClick={proceedWithSms}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{locale === 'ha' ? 'Aika duk da haka' : 'Send anyway'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
