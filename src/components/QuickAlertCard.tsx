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
import { Geolocation } from '@capacitor/geolocation';
import { Language } from '../utils/translations';
import { voiceService } from '../services/voiceService';
import {
  getLastKnownLocation,
  saveLastKnownLocation,
  formatLocationAge,
  fetchQuickPosition,
} from '../services/locationService';

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

  // High-Precision GPS Multi-Read & Warm-Up State
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    isCached?: boolean;
  } | null>(() => {
    // Instant offline retrieval (<1ms): state is never empty!
    const cached = getLastKnownLocation();
    if (cached) {
      return {
        latitude: cached.latitude,
        longitude: cached.longitude,
        accuracy: cached.accuracy,
        timestamp: cached.timestamp,
        isCached: true,
      };
    }
    return null;
  });
  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [readingsCount, setReadingsCount] = useState(0);
  const [isUnreliable, setIsUnreliable] = useState(false);

  const bestCoordsRef = useRef<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    isCached?: boolean;
  } | null>(
    (() => {
      const cached = getLastKnownLocation();
      return cached ? { ...cached, isCached: true } : null;
    })()
  );

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

  // Helper to fetch single position with Capacitor and browser fallback
  const fetchSinglePosition = async (
    enableHigh = true,
    timeoutMs = 12000
  ): Promise<{ coords: { latitude: number; longitude: number; accuracy: number }; timestamp?: number } | null> => {
    // 1. Try Capacitor Geolocation plugin
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: enableHigh,
        timeout: timeoutMs,
        maximumAge: 0,
      });
      if (pos?.coords) return pos;
    } catch {}

    // 2. Try browser navigator.geolocation
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const navPos = await new Promise<{ coords: { latitude: number; longitude: number; accuracy: number }; timestamp?: number } | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { enableHighAccuracy: enableHigh, timeout: timeoutMs, maximumAge: 0 }
          );
        });
        if (navPos) return navPos;
      } catch {}
    }
    return null;
  };

  // Process incoming GPS fix and update coordinates immediately with the best reading
  const processReading = (
    pos: { coords: { latitude: number; longitude: number; accuracy: number }; timestamp?: number },
    isLive = true
  ) => {
    if (!pos?.coords) return;
    const lat = Number(pos.coords.latitude.toFixed(6));
    const lng = Number(pos.coords.longitude.toFixed(6));
    const acc = Math.round(pos.coords.accuracy);
    const timestamp = pos.timestamp || Date.now();

    setLiveAccuracy(acc);
    setReadingsCount((prev) => prev + 1);

    const reading = { latitude: lat, longitude: lng, accuracy: acc, timestamp, isCached: !isLive };

    // When a live GPS fix arrives, persist to offline storage immediately
    if (isLive) {
      saveLastKnownLocation(reading);
    }

    // Always replace cached location with fresh reading, or upgrade if more accurate!
    if (!bestCoordsRef.current || bestCoordsRef.current.isCached || acc < bestCoordsRef.current.accuracy) {
      bestCoordsRef.current = reading;
      setCoords(reading);
      setIsUnreliable(acc > 100);
      setGpsError(null);
    }
  };

  // Start warm-up phase as soon as card is mounted
  const startGpsAcquisition = async () => {
    isCancelledRef.current = false;
    setGpsLoading(true);
    setGpsError(null);
    setIsUnreliable(false);
    setReadingsCount(0);
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

    // 2. Request native permissions with @capacitor/geolocation
    try {
      await Geolocation.requestPermissions().catch(() => null);
    } catch {}

    // 3. Register native watchPosition for real-time satellite updates
    try {
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        },
        (position) => {
          if (isCancelledRef.current) return;
          if (position?.coords) {
            processReading(position, true);
          }
        }
      );
      activeWatchIdRef.current = watchId;
    } catch {}

    // Also register web navigator.geolocation.watchPosition as safety fallback
    if (!activeWatchIdRef.current && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const webWatchId = navigator.geolocation.watchPosition(
          (position) => {
            if (isCancelledRef.current) return;
            if (position?.coords) {
              processReading(position, true);
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
        activeWebWatchIdRef.current = webWatchId;
      } catch {}
    }

    // 4. Fast-pass & Sequential multi-read acquisition loop:
    (async () => {
      // Step A: Instant hardware buffer check (<100ms with maximumAge: 60000 = 60s)
      const quickPos = await fetchQuickPosition(3000, 60000);
      if (quickPos && !isCancelledRef.current && (!bestCoordsRef.current || bestCoordsRef.current.isCached)) {
        processReading({ coords: quickPos, timestamp: quickPos.timestamp }, true);
      }

      // Step B: Live satellite refinement iterations (up to 5 reads) to lock fresh satellite ephemeris
      for (let i = 1; i <= 5; i++) {
        if (isCancelledRef.current) break;

        // If high precision satellite lock (<= 15m) reached, stop early
        if (bestCoordsRef.current && !bestCoordsRef.current.isCached && bestCoordsRef.current.accuracy <= 15) {
          break;
        }

        const fix = await fetchSinglePosition(true, 10000);
        if (fix && !isCancelledRef.current) {
          processReading(fix, true);
        }

        if (i < 5 && (!bestCoordsRef.current || bestCoordsRef.current.isCached || bestCoordsRef.current.accuracy > 15)) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      setGpsLoading(false);

      if (!bestCoordsRef.current) {
        setGpsError(
          locale === 'ha'
            ? 'Ba a iya samun daidaiton GPS ba. Bincika ko an kunna izinin wuri.'
            : 'Could not obtain GPS lock. Please check location permissions.'
        );
      }
    })();
  };

  useEffect(() => {
    startGpsAcquisition();

    // Foreground-only enforcement: stop GPS tracking whenever app is backgrounded
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isCancelledRef.current = true;
        if (activeWatchIdRef.current) {
          Geolocation.clearWatch({ id: activeWatchIdRef.current }).catch(() => {});
          activeWatchIdRef.current = null;
        }
        if (activeWebWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.clearWatch(activeWebWatchIdRef.current);
          activeWebWatchIdRef.current = null;
        }
      } else {
        startGpsAcquisition();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      isCancelledRef.current = true;
      if (activeWatchIdRef.current) {
        Geolocation.clearWatch({ id: activeWatchIdRef.current }).catch(() => {});
        activeWatchIdRef.current = null;
      }
      if (activeWebWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(activeWebWatchIdRef.current);
        activeWebWatchIdRef.current = null;
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

  const ageMeta = activeDisplayCoords?.timestamp ? formatLocationAge(activeDisplayCoords.timestamp) : null;
  const isCachedLocation = activeDisplayCoords?.isCached === true;

  const cachedNotice = isCachedLocation
    ? ` [${locale === 'ha' ? `Wurin da aka sani: ${ageMeta?.ageLabelHa}` : `Last Known: ${ageMeta?.ageLabelEn}`}]`
    : '';

  const warningLine = isCachedLocation
    ? `\n⚠️ ${
        locale === 'ha'
          ? `NOTE: Wannan wurin na baya ne (${ageMeta?.ageLabelHa}). Yayin da ake neman Live GPS a fili.`
          : `NOTE: This is the last known location (${ageMeta?.ageLabelEn}) while live satellite lock is acquiring.`
      }`
    : activeDisplayCoords?.accuracy && (activeDisplayCoords.accuracy > 100 || isUnreliable)
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

  const gpsLine = hasCoords
    ? `📍 GPS: Lat ${lat}, Long ${lng}${accuracyStr}${cachedNotice}${warningLine}`
    : `📍 GPS: ${locale === 'ha' ? 'Ana neman GPS... (Ana haɗawa da tauraro a fili)' : 'Searching for GPS... (Satellite lock acquiring)'}`;

  const fullSmsBody = `[EMERGENCY / GAGGAWA - SMARTVILLAGE]
${selectedDistress.emoji} ${distressHeadlineEn} (${distressHeadlineHa})
${locale === 'ha' ? distressMsgHa : distressMsgEn}
${customNote ? `Note: "${customNote}"` : ''}

${gpsLine}
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

  // Trigger SMS via protocol
  const handleSendSms = () => {
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
    const textToSpeak = hasCoords
      ? locale === 'ha'
        ? `Wurin GPS na gaggawa: latitude ${lat}, longitude ${lng}. Lambar tuntuba ta gaggawa: ${emergencyPhone}.`
        : `Emergency GPS location: latitude ${lat}, longitude ${lng}. Emergency contact: ${emergencyPhone}.`
      : locale === 'ha'
        ? `Ana neman GPS a halin yanzu. Lambar tuntuba ta gaggawa: ${emergencyPhone}.`
        : `Searching for GPS. Emergency contact: ${emergencyPhone}.`;
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
              {coords ? (
                <>
                  <span className="font-mono text-white font-black text-xs">
                    {lat}, {lng}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black border ${
                      coords.isCached
                        ? 'bg-amber-500/25 text-amber-200 border-amber-400/50'
                        : !isUnreliable && coords.accuracy < 30
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/60'
                        : !isUnreliable && coords.accuracy <= 100
                        ? 'bg-amber-500/30 text-amber-200 border-amber-400/60'
                        : 'bg-rose-500/40 text-rose-200 border-rose-400/70'
                    }`}
                  >
                    {coords.isCached ? (
                      <span className="flex items-center gap-1">
                        <span className="text-[9px] uppercase tracking-wide bg-amber-950/70 px-1 py-0.2 rounded border border-amber-400/30">
                          {locale === 'ha' ? 'Wurin Baya' : 'Last Known'}
                        </span>
                        <span>({formatLocationAge(coords.timestamp)[locale === 'ha' ? 'ageLabelHa' : 'ageLabelEn']} • ±{coords.accuracy}m)</span>
                      </span>
                    ) : (
                      <>
                        <span className="text-[9px] uppercase tracking-wide bg-emerald-950/70 px-1 py-0.2 rounded border border-emerald-400/40 text-emerald-300">
                          Live
                        </span>
                        <span>±{coords.accuracy}m</span>
                        {isUnreliable && (
                          <span className="text-[9px] uppercase tracking-wide bg-rose-950/70 px-1 py-0.2 rounded border border-rose-400/40">
                            {locale === 'ha' ? 'Kusan' : 'Approx'}
                          </span>
                        )}
                      </>
                    )}
                    {gpsLoading && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                    )}
                  </span>
                </>
              ) : (
                <span className="text-amber-200 text-xs font-semibold animate-pulse flex items-center gap-1">
                  <span>{locale === 'ha' ? 'Ana neman GPS...' : 'Searching for GPS...'}</span>
                  {liveAccuracy && (
                    <span className="text-[10px] text-amber-300/80 font-normal">
                      ({locale === 'ha' ? 'Hasumiya' : 'Cell'}: ±{liveAccuracy}m)
                    </span>
                  )}
                </span>
              )}

              {gpsLoading && (
                <span className="text-[10px] text-amber-200/90 font-medium whitespace-nowrap">
                  {coords?.isCached
                    ? locale === 'ha'
                      ? 'Ana binciken Live GPS a fili...'
                      : 'Acquiring live satellite lock...'
                    : coords && !isUnreliable
                    ? locale === 'ha'
                      ? 'Ana ƙara inganta daidaito...'
                      : 'Refining satellite accuracy...'
                    : locale === 'ha'
                    ? 'Ana haɗawa da tauraron GPS...'
                    : 'Connecting to GPS satellites...'}
                  {readingsCount > 0 ? ` (${readingsCount}/5)` : ''}
                </span>
              )}
            </div>
            <div className="text-[10px] text-rose-300/90 truncate mt-0.5">
              {locale === 'ha' ? 'Lambar Tuntuba:' : 'Contact:'}{' '}
              <span className="font-mono font-bold text-white">{emergencyPhone}</span>
            </div>
            {coords?.isCached && (
              <div className="text-[10px] text-amber-300/95 font-medium mt-0.5 flex items-center gap-1">
                <span>⚠️ {locale === 'ha' ? 'Wannan wuri na baya ne — ana neman sabon GPS.' : 'This is a last-known location — acquiring live GPS.'}</span>
              </div>
            )}
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
    </div>
  );
};
