import React, { useState } from 'react';
import {
  Info,
  Volume2,
  VolumeX,
  Code2,
  Mail,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Heart,
  Scale,
  Sparkles,
  MapPin,
  User,
  ArrowLeft,
} from 'lucide-react';
import { Language } from '../utils/translations';
import { voiceService } from '../services/voiceService';
import packageJson from '../../package.json';

interface AboutScreenProps {
  locale: Language;
  onNavigateBack?: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ locale, onNavigateBack }) => {
  const [speakingSection, setSpeakingSection] = useState<string | null>(null);

  const version = packageJson.version || '1.3.3';

  const handleToggleSpeak = async (sectionId: string, textEn: string, textHa: string) => {
    if (speakingSection === sectionId) {
      voiceService.stopSpeaking();
      setSpeakingSection(null);
      return;
    }

    voiceService.stopSpeaking();
    setSpeakingSection(sectionId);
    const textToSpeak = locale === 'ha' ? textHa : textEn;
    await voiceService.speak(textToSpeak, locale);
    setSpeakingSection(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title={locale === 'ha' ? 'Koma Gida' : 'Back to Home'}
            >
              <ArrowLeft className="w-5 h-5 text-slate-800" />
            </button>
          )}
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {locale === 'ha' ? 'Game da SmartVillage' : 'About SmartVillage'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {locale === 'ha'
                ? 'Bayanai game da manhaja, masu haɓakawa da ƙa\'idodi'
                : 'Application information, creators & licensing'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            handleToggleSpeak(
              'overview',
              `SmartVillage version ${version}. Offline-first app for healthier farms, families, and communities in rural Nigeria. Built by Hausa Cybertech, Kano, Nigeria.`,
              `SmartVillage sigar ${version}. Manhaja mai aiki ba tare da intanet ba domin lafiyar gonaki, iyalai, da al'ummar karkara a Najeriya. Hausa Cybertech ce ta haɓaka ta daga Kano, Najeriya.`
            )
          }
          className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
            speakingSection === 'overview'
              ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse'
              : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
          title={locale === 'ha' ? 'Saurari duka bayanin' : 'Listen to overview'}
        >
          {speakingSection === 'overview' ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-700" />
          )}
          <span className="hidden sm:inline">
            {locale === 'ha' ? 'Saurari Bayani' : 'Listen'}
          </span>
        </button>
      </div>

      {/* 1. App Identity Card */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md shrink-0">
              <img
                src="/app-icon.png"
                alt="SmartVillage"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">SmartVillage</h2>
                <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-400 text-emerald-950 px-2.5 py-0.5 rounded-full shadow-2xs">
                  v{version}
                </span>
              </div>
              <p className="text-emerald-200 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
                {locale === 'ha'
                  ? "Manhaja mai aiki ba tare da intanet ba domin lafiyar gonaki, iyalai, da al'ummar karkara a Najeriya."
                  : 'Offline-first app for healthier farms, families, and communities in rural Nigeria.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              handleToggleSpeak(
                'intro',
                'SmartVillage. Offline-first app for healthier farms, families, and communities in rural Nigeria.',
                "SmartVillage. Manhaja mai aiki ba tare da intanet ba domin lafiyar gonaki, iyalai, da al'ummar karkara a Najeriya."
              )
            }
            className={`p-2.5 rounded-xl border transition-all cursor-pointer self-start sm:self-center shrink-0 ${
              speakingSection === 'intro'
                ? 'bg-white text-emerald-900 border-white animate-pulse'
                : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border-emerald-700/60'
            }`}
            title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2. Built By Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                <Code2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {locale === 'ha' ? 'Wanda ya Ƙirƙira' : 'Built By'}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {locale === 'ha' ? 'Kamfani da Mahalicci' : 'Developer & Founder'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleToggleSpeak(
                  'builder',
                  'Built by Hausa Cybertech. Founder: Ameenu Umar Jaafar. Pen name: Humble-writer. Location: Kano, Nigeria.',
                  'Hausa Cybertech ce ta haɓaka. Wanda ya kafa: Ameenu Umar Jaafar. Sunan marubuci: Humble-writer. Wuri: Kano, Najeriya.'
                )
              }
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                speakingSection === 'builder'
                  ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse'
                  : 'bg-slate-50 hover:bg-emerald-50 text-emerald-800 border-slate-200'
              }`}
              title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-1">
              <div className="font-black text-sm text-emerald-950">Hausa Cybertech</div>
              <div className="text-[11px] text-emerald-800 font-semibold">
                Technology for Rural Empowerment & Agriculture
              </div>
            </div>

            <div className="space-y-2 pt-1 font-medium">
              <div className="flex items-center space-x-2 text-slate-700">
                <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>
                  <strong className="text-slate-900">{locale === 'ha' ? 'Wanda ya kafa' : 'Founder'}:</strong> Ameenu Umar Jaafar
                </span>
              </div>

              <div className="flex items-center space-x-2 text-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  <strong className="text-slate-900">{locale === 'ha' ? 'Sunan marubuci' : 'Pen name'}:</strong> Humble-writer
                </span>
              </div>

              <div className="flex items-center space-x-2 text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>
                  <strong className="text-slate-900">{locale === 'ha' ? 'Wuri' : 'Location'}:</strong> Kano, Nigeria
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Contact Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                <Mail className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {locale === 'ha' ? 'Hanyoyin Tuntuɓa' : 'Contact & Support'}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {locale === 'ha' ? 'Sadarwa da Tambayoyi' : 'Get in touch'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleToggleSpeak(
                  'contact',
                  'Contact details: Email: ameenujaafar432@gmail.com. WhatsApp: +234 806 371 2192. Website: hausacybertech.vercel.app.',
                  'Hanyoyin tuntuɓa: Imel: ameenujaafar432@gmail.com. WhatsApp: +234 806 371 2192. Yanar gizo: hausacybertech.vercel.app.'
                )
              }
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                speakingSection === 'contact'
                  ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse'
                  : 'bg-slate-50 hover:bg-emerald-50 text-emerald-800 border-slate-200'
              }`}
              title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <a
              href="mailto:ameenujaafar432@gmail.com"
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 transition-colors group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Email</span>
                  <span className="font-bold text-slate-800 group-hover:text-emerald-800">
                    ameenujaafar432@gmail.com
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 shrink-0" />
            </a>

            <a
              href="https://wa.me/2348063712192"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 transition-colors group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">WhatsApp</span>
                  <span className="font-bold text-slate-800 group-hover:text-emerald-800">
                    +234 806 371 2192
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 shrink-0" />
            </a>

            <a
              href="https://hausacybertech.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 transition-colors group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Website</span>
                  <span className="font-bold text-slate-800 group-hover:text-emerald-800">
                    https://hausacybertech.vercel.app/
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 shrink-0" />
            </a>
          </div>
        </div>
      </div>

      {/* 4. Acknowledgements & 5. License */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Acknowledgements Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                <Heart className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {locale === 'ha' ? 'Godiya da Yabo' : 'Acknowledgements'}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {locale === 'ha' ? 'Kayan aikin da aka yi amfani da su' : 'Open-source components'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleToggleSpeak(
                  'ack',
                  'Acknowledgements: Weather powered by Open-Meteo. Icons by Lucide. Text to speech by capacitor community text to speech.',
                  'Godiya da yabo: Bayanan yanayi daga Open-Meteo. Hotunan gumaka daga Lucide. Karanta murya daga capacitor community text to speech.'
                )
              }
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                speakingSection === 'ack'
                  ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse'
                  : 'bg-slate-50 hover:bg-emerald-50 text-emerald-800 border-slate-200'
              }`}
              title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-800">
                {locale === 'ha' ? 'Hasashen Yanayi' : 'Weather Services'}:
              </span>
              <span className="font-extrabold text-emerald-700">Open-Meteo</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-800">
                {locale === 'ha' ? 'Hotunan Gumaka' : 'Icon Library'}:
              </span>
              <span className="font-extrabold text-emerald-700">Lucide</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-800">
                {locale === 'ha' ? 'Muryar Karatu (TTS)' : 'Text-to-Speech'}:
              </span>
              <span className="font-extrabold text-emerald-700">@capacitor-community/text-to-speech</span>
            </div>
          </div>
        </div>

        {/* License Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center font-bold">
                  <Scale className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    {locale === 'ha' ? 'Lasisi da Mallaka' : 'Dual License'}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {locale === 'ha' ? 'AGPL-3.0 + Lasisin Kasuwanci' : 'AGPL-3.0 + Commercial'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleToggleSpeak(
                    'license',
                    'License: Dual-licensed under AGPL-3.0 for open-source community use, and commercial license for proprietary use. Copyright 2026 Hausa Cybertech.',
                    'Lasisi: Lasisin hadin gwiwa na AGPL-3.0 domin amfanin al\'umma kyauta, da lasisin kasuwanci domin kamfanoni. Hakkin mallaka 2026 Hausa Cybertech.'
                  )
                }
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  speakingSection === 'license'
                    ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse'
                    : 'bg-slate-50 hover:bg-emerald-50 text-emerald-800 border-slate-200'
                }`}
                title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-black text-sm text-indigo-950">AGPL-3.0 + Commercial</div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-200/70 text-indigo-900">
                  Dual License
                </span>
              </div>
              <div className="font-semibold text-indigo-800">
                © 2026 Hausa Cybertech
              </div>
              <div className="space-y-1.5 text-[11px] text-indigo-950/85 leading-relaxed pt-1">
                <p>
                  <strong className="text-indigo-950">• AGPL-3.0 (Community):</strong>{' '}
                  {locale === 'ha'
                    ? "Kyauta domin amfanin al'umma da manoma. Duk gyare-gyaren da aka yi kan yanar gizo dole ne a buɗe lambobin su a ƙarƙashin AGPL-3.0."
                    : 'Free for open-source and community empowerment. Any modifications made available over a network must release source code under AGPL-3.0.'}
                </p>
                <p>
                  <strong className="text-indigo-950">• Commercial:</strong>{' '}
                  {locale === 'ha'
                    ? 'Akwai lasisin kasuwanci ga kamfanoni da ke buƙatar amfani da manhajar a sirrance ko neman cikakken goyon bayan fasaha.'
                    : 'Available for organizations wishing to use SmartVillage in proprietary products or needing warranty and commercial support.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Medical & Veterinary Disclaimer */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-800" />
            </div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-950">
              {locale === 'ha' ? 'Gargaɗi da Sanarwa (Disclaimer)' : 'Disclaimer'}
            </h3>
          </div>

          <button
            type="button"
            onClick={() =>
              handleToggleSpeak(
                'disclaimer',
                'Disclaimer: This app is a screening and guidance tool only. It is not a medical or veterinary diagnosis. Always consult a qualified professional for urgent or serious cases.',
                'Gargaɗi: Wannan manhaja kayan aiki ne na bincike da shawara kawai. Ba ganewar likita ko likitan dabbobi ba ce. Koyaushe tuntuɓi ƙwararren ƙwararru don gaggawa ko manyan lamurra.'
              )
            }
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              speakingSection === 'disclaimer'
                ? 'bg-amber-700 text-white border-amber-800 animate-pulse'
                : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-300'
            }`}
            title={locale === 'ha' ? 'Karanta da Murya' : 'Read Aloud'}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-medium">
          {locale === 'ha'
            ? 'Wannan manhaja kayan aiki ne na bincike da shawara kawai. Ba ganewar likita ko likitan dabbobi ba ce. Koyaushe tuntuɓi ƙwararren ƙwararru don gaggawa ko manyan lamurra.'
            : 'This app is a screening and guidance tool only. It is not a medical or veterinary diagnosis. Always consult a qualified professional for urgent or serious cases.'}
        </p>
      </div>
    </div>
  );
};
