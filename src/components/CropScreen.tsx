import React, { useState, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Leaf,
  ShieldCheck,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import { analyzeCropImage, CropResult } from '../services/cropService';
import { voiceService } from '../services/voiceService';
import { historyService } from '../services/historyService';

interface CropScreenProps {
  locale: Language;
  onRecordSaved?: () => void;
}

// Sample leaf test images for instant evaluation
const SAMPLE_LEAVES = [
  {
    name: 'Healthy Leaf',
    color: '#34a853',
    // SVG data URI for a clean green leaf
    uri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 224 224"><rect width="224" height="224" fill="%23e8f5e9"/><path d="M112 20 C180 60 190 160 112 210 C34 160 44 60 112 20 Z" fill="%232e7d32"/><path d="M112 20 Q112 120 112 210" stroke="%2381c784" stroke-width="3" fill="none"/><path d="M112 80 Q145 70 160 60" stroke="%2381c784" stroke-width="2" fill="none"/><path d="M112 110 Q70 100 55 90" stroke="%2381c784" stroke-width="2" fill="none"/><path d="M112 140 Q150 130 165 120" stroke="%2381c784" stroke-width="2" fill="none"/></svg>`,
  },
  {
    name: 'Blight Leaf',
    color: '#8d6e63',
    uri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 224 224"><rect width="224" height="224" fill="%23f1f8e9"/><path d="M112 20 C180 60 190 160 112 210 C34 160 44 60 112 20 Z" fill="%23558b2f"/><circle cx="95" cy="85" r="24" fill="%233e2723"/><circle cx="95" cy="85" r="18" fill="%234e342e" stroke="%23ffeb3b" stroke-width="2"/><circle cx="135" cy="130" r="18" fill="%233e2723" stroke="%23ffeb3b" stroke-width="2"/><circle cx="80" cy="150" r="14" fill="%23212121"/><path d="M112 20 Q112 120 112 210" stroke="%23aed581" stroke-width="2" fill="none"/></svg>`,
  },
  {
    name: 'Rust Leaf',
    color: '#d84315',
    uri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 224 224"><rect width="224" height="224" fill="%23fff3e0"/><path d="M112 20 C180 60 190 160 112 210 C34 160 44 60 112 20 Z" fill="%23689f38"/><circle cx="80" cy="70" r="6" fill="%23bf360c"/><circle cx="100" cy="65" r="5" fill="%23d84315"/><circle cx="130" cy="90" r="7" fill="%23bf360c"/><circle cx="90" cy="110" r="6" fill="%23d84315"/><circle cx="120" cy="130" r="8" fill="%23e64a19"/><circle cx="105" cy="155" r="6" fill="%23bf360c"/><circle cx="75" cy="135" r="5" fill="%23e64a19"/><path d="M112 20 Q112 120 112 210" stroke="%23c5e1a5" stroke-width="2" fill="none"/></svg>`,
  },
];

export const CropScreen: React.FC<CropScreenProps> = ({ locale, onRecordSaved }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CropResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
      setResult(null);
    }
  };

  const handleSelectSample = (uri: string) => {
    setPhotoUrl(uri);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!photoUrl) {
      showToast(t(locale, 'noPhoto'));
      return;
    }

    setBusy(true);
    try {
      const r = await analyzeCropImage(photoUrl);
      setResult(r);

      // Save to local database / history
      const topPred = r.predictions[0] || { label: 'unknown', confidence: 0 };
      const formattedTitle = topPred.label.replace(/_/g, ' ');
      const detail = r.predictions
        .map((p) => `${p.label.replace(/_/g, ' ')}: ${(p.confidence * 100).toFixed(1)}%`)
        .join('\n');

      historyService.insert({
        type: 'crop',
        createdAt: new Date().toISOString(),
        title: formattedTitle,
        detail,
        advice: r.advice,
        confidence: topPred.confidence,
        imagePath: photoUrl.startsWith('data:') ? photoUrl : undefined,
      });

      onRecordSaved?.();
    } catch (err) {
      showToast('Analysis error. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  const handleSpeak = async () => {
    if (!result) return;
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const topPred = result.predictions[0]?.label.replace(/_/g, ' ') || '';
    const textToSpeak = `${topPred}. ${result.advice}`;
    await voiceService.speak(textToSpeak, locale);
    setIsSpeaking(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1f7a4c]">
          {t(locale, 'crop')}
        </h1>
        <p className="text-sm text-slate-600 mt-1">{t(locale, 'cropSubtitle')}</p>
      </div>

      {/* Image Preview / Upload Area */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-200 p-4 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden group">
        {photoUrl ? (
          <div className="w-full flex flex-col items-center">
            <img
              src={photoUrl}
              alt="Crop leaf"
              className="max-h-64 rounded-xl object-contain shadow-sm border border-emerald-100"
            />
            <button
              onClick={() => {
                setPhotoUrl(null);
                setResult(null);
              }}
              className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium underline cursor-pointer"
            >
              Remove photo
            </button>
          </div>
        ) : (
          <div className="text-center p-6 space-y-2">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Leaf className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-slate-600 font-medium text-sm">
              {t(locale, 'choosePhoto')}
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              Take a focused, well-lit photo of a single leaf showing symptoms
            </p>
          </div>
        )}
      </div>

      {/* Camera and Gallery buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center space-x-2 py-3 px-4 border border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-50 rounded-xl font-medium text-sm transition-colors cursor-pointer"
        >
          <Camera className="w-4 h-4 text-emerald-700" />
          <span>{t(locale, 'takePhoto')}</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center space-x-2 py-3 px-4 border border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-50 rounded-xl font-medium text-sm transition-colors cursor-pointer"
        >
          <ImageIcon className="w-4 h-4 text-emerald-700" />
          <span>{t(locale, 'gallery')}</span>
        </button>
      </div>

      {/* Quick leaf samples */}
      <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
        <span className="text-xs text-emerald-900 font-semibold block mb-2">
          Or try a sample leaf:
        </span>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_LEAVES.map((sample) => (
            <button
              key={sample.name}
              onClick={() => handleSelectSample(sample.uri)}
              className="px-3 py-1.5 bg-white border border-emerald-200 text-xs font-medium rounded-lg hover:border-emerald-500 hover:text-emerald-800 transition-colors cursor-pointer flex items-center space-x-1.5 shadow-2xs"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: sample.color }}
              />
              <span>{sample.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={busy}
        className="w-full py-4 bg-[#1f7a4c] hover:bg-[#19653e] disabled:opacity-60 text-white font-bold rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
      >
        {busy ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>{t(locale, 'analyzing')}</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>{t(locale, 'analyze')}</span>
          </>
        )}
      </button>

      {/* Result Card */}
      {result && (
        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-md space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1f7a4c]">
              {t(locale, 'cropResult')}
            </span>
            <button
              onClick={handleSpeak}
              className="flex items-center space-x-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>{isSpeaking ? 'Stop audio' : t(locale, 'speakResult')}</span>
            </button>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 capitalize">
              {result.predictions[0]?.label.replace(/_/g, ' ') || 'Screening complete'}
            </h2>
            {result.diseaseInfo?.hausa_name && (
              <p className="text-sm text-emerald-700 font-semibold mt-0.5">
                Hausa: {result.diseaseInfo.hausa_name}
              </p>
            )}
          </div>

          {/* Confidence bar */}
          {result.predictions[0] && result.predictions[0].confidence > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>{t(locale, 'confidence')}</span>
                <span>{(result.predictions[0].confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.predictions[0].confidence >= 0.55
                      ? 'bg-[#1f7a4c]'
                      : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${Math.min(100, result.predictions[0].confidence * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Top 3 Predictions */}
          {result.predictions.length > 1 && (
            <div className="bg-slate-50 p-3 rounded-xl space-y-2">
              <span className="text-xs font-bold text-slate-600 block">
                {t(locale, 'topPredictions')}
              </span>
              <div className="space-y-1.5">
                {result.predictions.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 capitalize">
                      {p.label.replace(/_/g, ' ')}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {(p.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Advice */}
          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 text-sm text-slate-800 space-y-1">
            <span className="font-bold text-[#1f7a4c] block text-xs uppercase tracking-wider">
              {t(locale, 'advice')}
            </span>
            <p className="leading-relaxed">{result.advice}</p>
          </div>

          {/* Detailed IPM Management Accordion */}
          {result.diseaseInfo && (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
              <button
                onClick={() => setExpandedDetails(!expandedDetails)}
                className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-slate-700 transition-colors cursor-pointer text-left"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Management guide & organic solutions
                </span>
                {expandedDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {expandedDetails && (
                <div className="p-4 space-y-3 bg-white divide-y divide-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Pathogen & Causes
                    </span>
                    <p className="text-xs text-slate-700 mt-0.5">
                      {result.diseaseInfo.causes}
                    </p>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      {t(locale, 'treatment')}
                    </span>
                    <ul className="text-xs text-slate-700 list-disc list-inside mt-1 space-y-1">
                      <li>
                        <strong>Mild:</strong> {result.diseaseInfo.treatments.mild}
                      </li>
                      <li>
                        <strong>Moderate:</strong> {result.diseaseInfo.treatments.moderate}
                      </li>
                      <li>
                        <strong>Severe:</strong> {result.diseaseInfo.treatments.severe}
                      </li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs font-bold text-emerald-800 uppercase">
                      {t(locale, 'organicAlternative')}
                    </span>
                    <p className="text-xs text-emerald-900 mt-0.5 font-medium">
                      {result.diseaseInfo.organic_alternative}
                    </p>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      {t(locale, 'preventionTips')}
                    </span>
                    <ul className="text-xs text-slate-700 list-disc list-inside mt-1 space-y-1">
                      {result.diseaseInfo.prevention_tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
