import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  X,
  Volume2,
  Mic,
  Sparkles,
} from 'lucide-react';
import { Language } from '../utils/translations';

interface VoiceTrainingScriptModalProps {
  locale: Language;
  onClose: () => void;
}

export const SCRIPT_LINES = [
  '1. Barka da zuwa SmartVillage, mataimakinku a fannin noma da lafiya.',
  '2. Zabi amfanin gona don duba lafiyarsa da gano cututtuka.',
  '3. Duba lafiyar jiki da alamomin zazzabi ko ciwo.',
  '4. Duba yanayin gari da kwanakin girbi ba tare da intanet ba.',
  '5. Sauya harshe zuwa Hausa ko Turanci.',
  "6. Kwanaki saba'in da biyu suka rage kafin girbin albasa a gonar fadama.",
  "7. Kwanaki arba'in da biyar suka rage kafin girbin masara.",
  '8. Lokacin girbi ya yi! Ganyen albasa sun karkata kasa, a dakatar da ban ruwa.',
  '9. Idan gashin masara ya bushe kuma ya yi baki, hatsi ya nuna sosai.',
  '10. Tumatir ya kai matakin tsinkewa, a tsinke shi da sassafe kafin rana ta yi zafi.',
  '11. Shinkafa ta yi launin zinare a zangarniya, a fara girbi don hana zubewar hatsi.',
  '12. An kafa tushe, shuka tana cikin balagar karshe kafin girbi.',
  '13. Ganyen albasa na da digon ruwan hoda da launi mai duhu, cutar Alternaria ce.',
  '14. Ganyen masara yana da tsatsa da digon ruwan kasa.',
  "15. Bakin cutar tumatir ya sa ganye da ya'yan itace sun yi baki.",
  '16. Farin kwari da kwari masu tsotsar ruwan ganye sun bayyana a kasan ganye.',
  '17. A fesa ruwan maganin ganyen lalle ko tokar itace domin magance kwari.',
  '18. Ina jin zazzabi mai zafi, ciwon kai, da sanyin jiki.',
  '19. Yaro yana zazzabi da rashin cin abinci, a ba shi ruwa sosai.',
  '20. Wannan shawara ce ta kariya, tuntubi asibiti ko likita mafi kusa nan da nan.',
  '21. A tafasa ruwan sha ko a tace shi da kyalle mai tsabta kafin sha.',
  '22. Kwanaki: daya, biyu, biyar, goma, ashirin, talatin, hamsin, dari da goma.',
  '23. Digiri talatin da hudu na zafin rana, tare da karancin ruwan sama.',
  '24. Kashi hamsin cikin dari na aikin noma ya kammala.',
  '25. Welcome to SmartVillage, offline-first farm and family guidance.',
  '26. Harvest countdown active: seventy-two days remaining until onion harvest.',
  '27. Stop irrigation seven to ten days before harvesting onion bulbs.',
  '28. Take immediate safety precautions and consult your local healthcare worker.',
];

export const VoiceTrainingScriptModal: React.FC<VoiceTrainingScriptModalProps> = ({
  locale,
  onClose,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLineIndex, setCopiedLineIndex] = useState<number | null>(null);

  const allScriptText = SCRIPT_LINES.join('\n');

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(allScriptText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 3000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = allScriptText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 3000);
    }
  };

  const handleCopyLine = async (line: string, index: number) => {
    try {
      await navigator.clipboard.writeText(line);
      setCopiedLineIndex(index);
      setTimeout(() => setCopiedLineIndex(null), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-scale-up">
        {/* Header */}
        <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-700 rounded-xl">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base">
                {locale === 'ha' ? 'Rubutun Horar da Murya' : 'Voice Training Script'}
              </h2>
              <p className="text-[11px] text-emerald-100">
                {locale === 'ha'
                  ? 'Jumlolin da zaka karanta da murya don horarwa'
                  : 'Phrases to read and record for voice training'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Copy All Sticky Banner */}
        <div className="p-3 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-emerald-950 block">
              {locale === 'ha' ? 'Duk Jumlolin 28' : 'All 28 Sentences'}
            </span>
            <span className="text-[10px] text-emerald-800">
              {locale === 'ha'
                ? 'Danna don kwafi duka a wayarka'
                : 'Click to copy full text to your clipboard'}
            </span>
          </div>
          <button
            onClick={handleCopyAll}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-xs ${
              copiedAll
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95'
            }`}
          >
            {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAll ? (locale === 'ha' ? 'An Kwafa! ✓' : 'Copied! ✓') : (locale === 'ha' ? 'Kwafi Duka' : 'Copy All')}</span>
          </button>
        </div>

        {/* Body with Sentences */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-100 text-xs">
          {SCRIPT_LINES.map((line, idx) => (
            <div
              key={idx}
              className="pt-2 flex items-start justify-between gap-3 group hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
            >
              <p className="text-slate-800 font-semibold leading-relaxed select-all">
                {line}
              </p>
              <button
                onClick={() => handleCopyLine(line, idx)}
                className="shrink-0 p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                title="Copy line"
              >
                {copiedLineIndex === idx ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            {locale === 'ha'
              ? 'Yi amfani da manhajar ɗaukar murya a wayarka (Voice Recorder)'
              : 'Use the standard Voice Recorder app on your phone'}
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
          >
            {locale === 'ha' ? 'Rufe' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
