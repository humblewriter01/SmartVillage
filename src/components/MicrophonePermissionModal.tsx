import React, { useState } from 'react';
import { Mic, MicOff, Lock, CheckCircle2, X, RefreshCw, Volume2 } from 'lucide-react';
import { Language, t } from '../utils/translations';
import { voiceService } from '../services/voiceService';

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Language;
  onPermissionGranted?: () => void;
}

export function MicrophonePermissionModal({
  isOpen,
  onClose,
  locale,
  onPermissionGranted,
}: MicrophonePermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    setErrorMsg(null);
    try {
      const granted = await voiceService.requestMicrophonePermission();
      if (granted) {
        onPermissionGranted?.();
        onClose();
      } else {
        setErrorMsg(
          locale === 'ha'
            ? 'Har yanzu an toshe damar murya. Don Allah danna alamar kwado 🔒 a saman burauza ka canza shi zuwa "Allow".'
            : 'Microphone is still blocked in browser settings. Please tap the 🔒 icon in your browser address bar and set Microphone to "Allow".'
        );
      }
    } catch {
      setErrorMsg(
        locale === 'ha'
          ? 'An sami matsala wajen neman izini. Don Allah canza a saitin burauza.'
          : 'Unable to open microphone. Please change permission in your browser address bar.'
      );
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Header decoration banner */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-xs">
              <MicOff className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {t(locale, 'micPermissionTitle')}
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                {locale === 'ha' ? 'Izinin Lasifikar Murya' : 'One-time Browser Permission'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs leading-relaxed text-slate-600">
            {t(locale, 'micPermissionDesc')}
          </p>

          {/* Step by Step Guide with visual icons */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
              <span>{locale === 'ha' ? 'Matakai 3 Don Bada Dama:' : '3 Simple Steps to Enable:'}</span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-1 font-semibold text-slate-900">
                    <Lock className="w-3.5 h-3.5 text-amber-800" />
                    <span>{t(locale, 'micPermissionStep1')}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {locale === 'ha'
                      ? 'Duba sama kusa da adireshi a wayarka ko kwamfuta'
                      : 'Look at the address bar near the top of your screen'}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-1 font-semibold text-slate-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t(locale, 'micPermissionStep2')}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {locale === 'ha'
                      ? 'A karkashin "Permissions" canza Microphone zuwa "Allow"'
                      : 'Under Site Settings / Permissions, toggle Microphone to "Allow"'}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-1 font-semibold text-slate-900">
                    <Mic className="w-3.5 h-3.5 text-amber-800" />
                    <span>{t(locale, 'micPermissionStep3')}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {locale === 'ha'
                      ? 'Danna maɓallin da ke ƙasa domin tabbatar da izini sau ɗaya'
                      : 'Tap the button below once to confirm access'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback error if still blocked */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start space-x-2">
              <span className="font-bold text-red-600">!</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-[#1f7a4c] hover:bg-[#18633d] text-white rounded-2xl text-xs font-bold cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{locale === 'ha' ? 'Ana neman izini…' : 'Checking permission…'}</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>{t(locale, 'allowMicNow')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold cursor-pointer transition-colors"
            >
              {locale === 'ha' ? 'Rufe' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
