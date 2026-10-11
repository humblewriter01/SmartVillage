import React, { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink, X } from 'lucide-react';
import { Language } from '../utils/translations';
import { detectWebViewInfo, safeStorage } from '../utils/safeStorage';

interface WebViewUpdateBannerProps {
  locale: Language;
}

const DISMISS_KEY = 'smartvillage.dismiss_webview_warning';

export const WebViewUpdateBanner: React.FC<WebViewUpdateBannerProps> = ({ locale }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [version, setVersion] = useState<number | null>(null);

  useEffect(() => {
    try {
      const isDismissed = safeStorage.getItem(DISMISS_KEY);
      if (isDismissed) return;

      const info = detectWebViewInfo();
      if (info.isOutdated && info.chromeMajorVersion) {
        setVersion(info.chromeMajorVersion);
        setShowPrompt(true);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    safeStorage.setItem(DISMISS_KEY, 'true');
  };

  const handleOpenPlayStore = () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.google.android.webview';
    try {
      window.open(playStoreUrl, '_system');
    } catch {
      window.location.href = playStoreUrl;
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 animate-fade-in">
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-xl text-slate-800 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {locale === 'ha'
                ? `Android WebView Tsohuwa ce (Chrome ${version})`
                : `Outdated Android WebView (Chrome ${version})`}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            title={locale === 'ha' ? 'Rufe' : 'Dismiss'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {locale === 'ha'
            ? 'Wannan wayar tana amfani da tsohuwar Android System WebView. Sabunta ta a Play Store zai inganta sauri da kwanciyar hankali na manhaja.'
            : 'Your device is using an older Android System WebView. Updating it on Google Play Store will improve reliability and performance.'}
        </p>

        <div className="flex items-center justify-end space-x-2 pt-1">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-amber-100/60 cursor-pointer"
          >
            {locale === 'ha' ? 'Daga Baya' : 'Later'}
          </button>
          <button
            onClick={handleOpenPlayStore}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <span>{locale === 'ha' ? 'Sabunta a Play Store' : 'Update WebView'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
