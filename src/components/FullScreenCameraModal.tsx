import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { Language } from '../utils/translations';
import { cameraService, pickImageFromWeb } from '../services/cameraService';

interface FullScreenCameraModalProps {
  isOpen: boolean;
  locale: Language;
  title?: string;
  onCapture: (base64OrDataUrl: string) => void;
  onClose: () => void;
}

export const FullScreenCameraModal: React.FC<FullScreenCameraModalProps> = ({
  isOpen,
  locale,
  title,
  onCapture,
  onClose,
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const webStreamRef = useRef<MediaStream | null>(null);
  const isNative = cameraService.isNative();

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setCameraError(null);
    setIsCapturing(false);

    const initCamera = async () => {
      if (isNative) {
        // Small delay to ensure DOM container #cameraPreviewContainer is mounted
        await new Promise((r) => setTimeout(r, 60));
        if (!mounted) return;
        const started = await cameraService.startEmbeddedCamera();
        if (!started && mounted) {
          setCameraError(
            locale === 'ha'
              ? 'Ba a iya buɗe kyamara ba. Don Allah ba da izinin kyamara a wayarka.'
              : 'Could not access camera. Please allow camera permissions on your device.'
          );
        }
      } else {
        // Web browser environment: use navigator.mediaDevices.getUserMedia directly
        try {
          if (navigator.mediaDevices?.getUserMedia) {
            let stream: MediaStream | null = null;
            try {
              // Try environment (rear) camera first
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false,
              });
            } catch {
              // Fallback to any available video stream if environment failed
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
              });
            }

            if (!mounted) {
              stream?.getTracks().forEach((t) => t.stop());
              return;
            }
            if (stream) {
              webStreamRef.current = stream;
              if (webVideoRef.current) {
                webVideoRef.current.srcObject = stream;
                await webVideoRef.current.play().catch(() => {});
              }
            }
          } else {
            setCameraError(
              locale === 'ha'
                ? 'Burawza ba ta ba da damar kyamara a wannan shafi ba. Zaka iya amfani da kyamarar waya kai-tsaye:'
                : 'Browser iframe blocked direct camera streaming. You can launch your camera directly:'
            );
          }
        } catch (err) {
          console.warn('Web camera error:', err);
          if (mounted) {
            setCameraError(
              locale === 'ha'
                ? 'Burawza ta toshe kyamara saboda tsaron iframe. Zaka iya ɗaukar hoto kai-tsaye:'
                : 'Camera stream blocked by browser iframe security. You can take a photo directly:'
            );
          }
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (isNative) {
        cameraService.stopEmbeddedCamera().catch(() => {});
      }
      if (webStreamRef.current) {
        webStreamRef.current.getTracks().forEach((t) => t.stop());
        webStreamRef.current = null;
      }
    };
  }, [isOpen, isNative, locale]);

  if (!isOpen) return null;

  const handleCaptureClick = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      if (isNative) {
        const photo = await cameraService.captureEmbeddedPhoto();
        if (photo) {
          const formatted = photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`;
          onCapture(formatted);
          onClose();
          return;
        }
      } else if (webVideoRef.current && webStreamRef.current) {
        // Web snapshot via HTML5 canvas
        const video = webVideoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          onCapture(dataUrl);
          onClose();
          return;
        }
      }
    } catch (e) {
      console.warn('Capture error:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCloseClick = async () => {
    if (isNative) {
      await cameraService.stopEmbeddedCamera().catch(() => {});
    }
    if (webStreamRef.current) {
      webStreamRef.current.getTracks().forEach((t) => t.stop());
      webStreamRef.current = null;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col justify-between overflow-hidden select-none"
      style={{
        margin: 0,
        padding: 0,
        width: '100vw',
        height: '100dvh',
      }}
    >
      {/* Native Camera Preview Container (CapGo CameraPreview attaches here) */}
      {isNative ? (
        <div
          id="cameraPreviewContainer"
          className="absolute inset-0 w-full h-full bg-black"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        /* Web fallback: fullscreen video element */
        <video
          ref={webVideoRef}
          playsInline
          autoPlay
          muted
          className="absolute inset-0 w-full h-full object-cover bg-black"
        />
      )}

      {/* Top Overlay Bar: Minimal, translucent camera chrome */}
      <div className="relative z-10 w-full px-5 pt-4 pb-3 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          <span className="text-white text-xs sm:text-sm font-black tracking-wide drop-shadow-md">
            {title || (locale === 'ha' ? 'Kyamarar SmartVillage' : 'SmartVillage Camera')}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCloseClick}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg"
          aria-label={locale === 'ha' ? 'Rufe Kyamara' : 'Close Camera'}
          title={locale === 'ha' ? 'Rufe Kyamara' : 'Close Camera'}
        >
          <X className="w-5 h-5 text-white stroke-[2.5]" />
        </button>
      </div>

      {/* Center Viewfinder Reticle / Framing Target */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 pointer-events-none">
        {cameraError ? (
          <div className="pointer-events-auto max-w-xs text-center p-4 bg-slate-900/90 border border-slate-700 rounded-2xl backdrop-blur-md text-white space-y-3.5 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-200">{cameraError}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  const picked = await pickImageFromWeb('camera');
                  if (picked) {
                    onCapture(picked);
                    onClose();
                  }
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md flex items-center justify-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>{locale === 'ha' ? 'Ɗauki Hoto da Kyamarar Waya' : 'Open System Camera'}</span>
              </button>
              <button
                type="button"
                onClick={handleCloseClick}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                {locale === 'ha' ? 'Koma Baya' : 'Go Back'}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-64 h-64 sm:w-72 sm:h-72 border-2 border-white/60 rounded-3xl relative flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]">
            {/* Viewfinder Corners */}
            <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg"></div>
            <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg"></div>
            <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg"></div>
            <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-lg"></div>
            <span className="text-[11px] font-bold text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
              {locale === 'ha' ? 'Daidaita Hoton a Tsakiya' : 'Align Subject in Center'}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Camera Action Bar: Pure Android Camera Controls */}
      <div className="relative z-10 w-full px-6 pt-3 pb-8 sm:pb-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-around sm:justify-center sm:gap-14">
        {/* Cancel / Close Action */}
        <button
          type="button"
          onClick={handleCloseClick}
          className="flex flex-col items-center space-y-1 text-white/90 hover:text-white active:scale-95 transition-all cursor-pointer p-2"
        >
          <div className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center backdrop-blur-md border border-white/20">
            <X className="w-6 h-6 text-white" />
          </div>
          <span className="text-[11px] font-bold tracking-tight">
            {locale === 'ha' ? 'Soke' : 'Cancel'}
          </span>
        </button>

        {/* Big Shutter / Capture Button (Standard Android Camera ring) */}
        <button
          type="button"
          onClick={handleCaptureClick}
          disabled={isCapturing || Boolean(cameraError)}
          className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white bg-transparent p-1 active:scale-90 transition-transform cursor-pointer shadow-2xl disabled:opacity-50"
          aria-label={locale === 'ha' ? 'Ɗauki Hoto' : 'Capture Photo'}
          title={locale === 'ha' ? 'Ɗauki Hoto' : 'Capture Photo'}
        >
          <span
            className={`w-full h-full rounded-full transition-all ${
              isCapturing ? 'bg-red-500 scale-75 animate-ping' : 'bg-white hover:bg-slate-100'
            }`}
          />
        </button>

        {/* Info / Hint indicator */}
        <div className="flex flex-col items-center space-y-1 text-white/80 p-2 min-w-[50px]">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
            <Camera className="w-5 h-5 text-emerald-300" />
          </div>
          <span className="text-[11px] font-bold tracking-tight">
            {locale === 'ha' ? 'Ɗauka' : 'Capture'}
          </span>
        </div>
      </div>
    </div>
  );
};
