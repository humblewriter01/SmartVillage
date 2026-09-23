import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
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
    nameEn: 'Medical / Snakebite',
    nameHa: 'Gaggawar Lafiya / Cizon Maciji',
    emoji: '🚑',
    defaultMessageEn: 'Critical medical emergency / snakebite in the field! Urgent medical help needed.',
    defaultMessageHa: 'Gaggawar lafiya / cizon maciji ko hadari a gona! Ana neman taimakon likita cikin gaggawa.',
  },
  {
    id: 'security',
    nameEn: 'Security Alert / Threat',
    nameHa: 'Faɗakarwar Tsaro / Neman Ɗauki',
    emoji: '🛡️',
    defaultMessageEn: 'Security threat / distress at farmland! Immediate community or security assistance needed.',
    defaultMessageHa: 'Matsalar tsaro ko barazana a gona! Ana neman ɗaukin jami\'an tsaro ko \'yan sintiri cikin gaggawa.',
  },
  {
    id: 'breakdown',
    nameEn: 'Stranded / Tractor Breakdown',
    nameHa: 'Makalewa / Lalacewar Taraktoci',
    emoji: '🚜',
    defaultMessageEn: 'Machinery breakdown / vehicle stranded in remote farmland. Assistance required.',
    defaultMessageHa: 'Lalacewar tarakta ko abin hawa a dajin gona. Ana buƙatar ɗauki don janyewa ko gyara.',
  },
  {
    id: 'fire',
    nameEn: 'Farm Fire Outbreak',
    nameHa: 'Gobarar Daji / Gona',
    emoji: '🔥',
    defaultMessageEn: 'Wildfire / bushfire threatening farms and crop storage! Urgent firefighting help needed.',
    defaultMessageHa: 'Gobarar daji na barazana ga amfanin gona da rumbuna! Ana neman ɗaukin kashe gobara.',
  },
  {
    id: 'flood',
    nameEn: 'Flash Flood / Dam Overflow',
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

  // GPS State
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: number;
  } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Status flags
  const [copied, setCopied] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Automatically fetch GPS when card is mounted or requested
  const fetchLocation = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!('geolocation' in navigator)) {
      setGpsError(
        locale === 'ha'
          ? 'Wayarka ba ta da na\'urar GPS ko an kashe ta.'
          : 'Geolocation is not supported by your device.'
      );
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp,
        });
        setGpsLoading(false);
      },
      (err) => {
        console.warn('GPS Error:', err.message);
        // Fallback default coordinates (e.g., Kano Agricultural Zone: 11.9604, 8.5167)
        setCoords({
          latitude: 11.9604,
          longitude: 8.5167,
          accuracy: 50,
          timestamp: Date.now(),
        });
        setGpsError(
          locale === 'ha'
            ? 'Ba a samu cikakken GPS ba. An sanya coordinates na yankin noma na kusa.'
            : 'Using estimated agricultural coordinates. Enable GPS permissions for high accuracy.'
        );
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const selectedDistress =
    DISTRESS_TYPES.find((d) => d.id === selectedDistressId) || DISTRESS_TYPES[0];

  // Compose SMS text
  const lat = coords ? coords.latitude.toFixed(5) : '11.96040';
  const lng = coords ? coords.longitude.toFixed(5) : '8.51670';
  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
  const accuracyStr = coords?.accuracy ? ` (~${coords.accuracy}m accuracy)` : '';

  const distressHeadlineEn = selectedDistress.nameEn;
  const distressHeadlineHa = selectedDistress.nameHa;
  const distressMsgEn = selectedDistress.defaultMessageEn;
  const distressMsgHa = selectedDistress.defaultMessageHa;

  const fullSmsBody = `[EMERGENCY / GAGGAWA - SMARTVILLAGE]
${selectedDistress.emoji} ${distressHeadlineEn} (${distressHeadlineHa})
${locale === 'ha' ? distressMsgHa : distressMsgEn}
${customNote ? `Note: "${customNote}"` : ''}

📍 GPS: Lat ${lat}, Long ${lng}${accuracyStr}
🗺️ Map: ${mapsUrl}
⏱️ Time: ${new Date().toLocaleTimeString()}

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

  // Audible Siren Beep via Web Audio API (100% offline, synthetic synthesizer)
  const toggleSiren = () => {
    if (isAlarmPlaying) {
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      setIsAlarmPlaying(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      setAudioContext(ctx);
      setIsAlarmPlaying(true);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

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
      setTimeout(() => {
        try {
          osc.stop();
          ctx.close();
        } catch {}
        setIsAlarmPlaying(false);
        setAudioContext(null);
      }, 6400);
    } catch {
      setIsAlarmPlaying(false);
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

  return (
    <div className="bg-gradient-to-br from-rose-900 via-red-800 to-rose-950 text-white rounded-3xl p-4 sm:p-5 shadow-lg shadow-rose-950/30 border border-rose-600/40 relative overflow-hidden transition-all">
      {/* Background Decorative Pulsing Radar Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 bg-rose-400 rounded-full animate-ping absolute" />
            <div className="w-9 h-9 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-md border border-rose-400/50">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-black text-sm sm:text-base tracking-wide text-white uppercase flex items-center gap-1.5">
                <span>{locale === 'ha' ? 'S.O.S Faɗakarwar Gaggawa' : 'Quick Alert SOS'}</span>
              </h2>
              <span className="text-[10px] font-extrabold bg-rose-500/80 px-2 py-0.5 rounded-full uppercase tracking-wider text-rose-100 border border-rose-400/40">
                Offline SMS
              </span>
            </div>
            <p className="text-[11px] text-rose-200 mt-0.5 line-clamp-1">
              {locale === 'ha'
                ? 'Aika coordinates na GPS da saƙon neman ɗauki ta SMS ba tare da intanet ba'
                : 'Broadcast live GPS coordinates & distress signal via SMS without internet'}
            </p>
          </div>
        </div>

        {/* Toggle Expand / Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-white/10 hover:bg-white/20 active:scale-95 text-white px-2.5 py-1.5 rounded-xl border border-white/20 text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all shrink-0"
        >
          <span>{isExpanded ? (locale === 'ha' ? 'Rage' : 'Collapse') : (locale === 'ha' ? 'Faɗaɗa' : 'Open')}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Quick 1-Tap Trigger Banner (Always visible) */}
      <div className="mt-3.5 bg-black/25 backdrop-blur-xs rounded-2xl p-3 border border-rose-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2 text-xs">
          <div className="p-1.5 bg-rose-500/30 rounded-lg text-rose-300">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-rose-100 flex items-center space-x-1">
              <span>GPS:</span>
              <span className="font-mono text-white font-black text-xs">
                {lat}, {lng}
              </span>
              {coords?.accuracy && (
                <span className="text-[10px] text-rose-300 font-normal">
                  (±{coords.accuracy}m)
                </span>
              )}
            </div>
            <div className="text-[10px] text-rose-300/90 truncate">
              {locale === 'ha' ? 'Lambar Tuntuba:' : 'Contact:'}{' '}
              <span className="font-mono font-bold text-white">{emergencyPhone}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh GPS */}
          <button
            onClick={fetchLocation}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DISTRESS_TYPES.map((type) => {
                const isSelected = type.id === selectedDistressId;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedDistressId(type.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center space-x-2 ${
                      isSelected
                        ? 'bg-white text-rose-950 border-white font-extrabold shadow-sm'
                        : 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 border-rose-700/60 text-xs'
                    }`}
                  >
                    <span className="text-lg shrink-0">{type.emoji}</span>
                    <span className="text-xs truncate">
                      {locale === 'ha' ? type.nameHa : type.nameEn}
                    </span>
                  </button>
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
