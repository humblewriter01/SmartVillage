import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, RefreshCw, Zap, ZapOff } from 'lucide-react';
import { Language } from '../utils/translations';
import { cameraService, pickImageFromWeb } from '../services/cameraService';

interface FullScreenCameraModalProps {
  isOpen: boolean;
  locale: Language;
  title?: string;
  onCapture: (base64OrDataUrl: string) => void;
  onClose: () => void;
}

type FacingMode = 'environment' | 'user';
interface CameraSession { active: boolean }

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

export const FullScreenCameraModal: React.FC<FullScreenCameraModalProps> = ({
  isOpen, locale, title, onCapture, onClose,
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [facing, setFacing] = useState<FacingMode>('environment');
  const [canFlip, setCanFlip] = useState(true);
  const [flashAvailable, setFlashAvailable] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const webStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<CameraSession | null>(null);
  const isNative = cameraService.isNative();

  const releaseWebStream = () => {
    webStreamRef.current?.getTracks().forEach((track) => track.stop());
    webStreamRef.current = null;
    if (webVideoRef.current) webVideoRef.current.srcObject = null;
  };

  const startWebStream = async (session: CameraSession, mode: FacingMode, exact: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: exact ? { exact: mode } : { ideal: mode } },
        audio: false,
      });
    } catch (error) {
      // Initial rear-camera preference may not exist on a desktop. An explicit
      // flip must not silently select the same camera instead.
      if (exact || !session.active) throw error;
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    if (!session.active || !webVideoRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    webStreamRef.current = stream;
    webVideoRef.current.srcObject = stream;
    await webVideoRef.current.play().catch(() => {});
    if (!session.active) return;

    const track = stream.getVideoTracks()[0];
    let supportsTorch = false;
    let actualFacing: FacingMode = mode;
    try {
      const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined;
      supportsTorch = capabilities?.torch === true;
      const reportedFacing = track?.getSettings?.().facingMode;
      if (reportedFacing === 'user' || reportedFacing === 'environment') actualFacing = reportedFacing;
    } catch {
      // Some older WebViews expose these methods but cannot report capabilities.
    }
    setFlashAvailable(supportsTorch);
    setFlashOn(false);
    setFacing(actualFacing);
    setIsReady(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const session: CameraSession = { active: true };
    sessionRef.current = session;
    setCameraError(false);
    setNotice(null);
    setIsCapturing(false);
    setIsSwitching(false);
    setIsReady(false);
    setFacing('environment');
    setCanFlip(true);
    setFlashAvailable(false);
    setFlashOn(false);

    if (isNative) {
      // The portal is a direct child of body, so the rest of the opaque app can
      // be hidden while the native preview is composited behind the WebView.
      document.documentElement.classList.add('native-camera-open');
    }

    const start = async () => {
      try {
        if (isNative) {
          const started = await cameraService.startEmbeddedCamera();
          if (!session.active) return;
          if (!started) throw new Error('Camera unavailable');
          const [modes, positions] = await Promise.all([
            cameraService.getEmbeddedFlashModes(),
            cameraService.getEmbeddedCameraPositions(),
          ]);
          if (session.active) {
            setFlashAvailable(modes.includes('on'));
            setCanFlip(!positions || (positions.includes('rear') && positions.includes('front')));
            setIsReady(true);
          }
        } else {
          await startWebStream(session, 'environment', false);
        }
      } catch (error) {
        console.warn('Camera start error:', error);
        if (session.active) setCameraError(true);
      }
    };
    void start();

    return () => {
      session.active = false;
      if (sessionRef.current === session) sessionRef.current = null;
      releaseWebStream();
      if (isNative) {
        document.documentElement.classList.remove('native-camera-open');
        // Queued after a pending start, including a still-open permission prompt.
        void cameraService.stopEmbeddedCamera();
      }
    };
  }, [isOpen, isNative]);

  if (!isOpen) return null;

  const closeCamera = () => {
    if (sessionRef.current) sessionRef.current.active = false;
    releaseWebStream();
    onClose();
  };

  const finishCapture = (photo: string, session: CameraSession) => {
    if (!session.active) return;
    session.active = false;
    releaseWebStream();
    onCapture(photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`);
    onClose();
  };

  const handleCapture = async () => {
    const session = sessionRef.current;
    if (!session?.active || !isReady || isCapturing || isSwitching) return;
    setIsCapturing(true);
    setNotice(null);
    try {
      if (isNative) {
        const photo = await cameraService.captureEmbeddedPhoto();
        if (!photo) throw new Error('Empty camera image');
        finishCapture(photo, session);
      } else {
        const video = webVideoRef.current;
        if (!video || !webStreamRef.current || !video.videoWidth || !video.videoHeight) {
          throw new Error('Camera frame not ready');
        }
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        finishCapture(canvas.toDataURL('image/jpeg', 0.9), session);
      }
    } catch (error) {
      console.warn('Camera capture error:', error);
      if (session.active) setNotice(locale === 'ha' ? 'Ba a iya ɗaukar hoto ba. Sake gwadawa.' : 'Could not capture the photo. Please try again.');
    } finally {
      if (session.active) setIsCapturing(false);
    }
  };

  const handleFlip = async () => {
    const session = sessionRef.current;
    if (!session?.active || !isReady || !canFlip || isSwitching || isCapturing) return;
    const nextFacing: FacingMode = facing === 'environment' ? 'user' : 'environment';
    setIsSwitching(true);
    setNotice(null);
    try {
      if (isNative) {
        if (flashOn) await cameraService.setEmbeddedFlashMode('off');
        await cameraService.flipEmbeddedCamera();
        if (!session.active) return;
        setFacing(nextFacing);
        setFlashOn(false);
        setFlashAvailable(false);
        // Android rebinds the new lens asynchronously after flip() resolves.
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!session.active) return;
        const modes = await cameraService.getEmbeddedFlashModes();
        if (session.active) setFlashAvailable(modes.includes('on'));
      } else {
        // Some phones cannot open both cameras at once, so release the old one first.
        releaseWebStream();
        setIsReady(false);
        try {
          await startWebStream(session, nextFacing, true);
        } catch (error) {
          if (!session.active) return;
          await startWebStream(session, facing, false);
          if (session.active) setNotice(locale === 'ha' ? 'Babu wata kyamara a wannan na’urar.' : 'The other camera is not available on this device.');
        }
      }
    } catch (error) {
      console.warn('Camera flip error:', error);
      if (session.active) {
        if (!isNative) setCameraError(true);
        setNotice(locale === 'ha' ? 'Ba a iya juya kyamara ba.' : 'Could not switch cameras.');
      }
    } finally {
      if (session.active) setIsSwitching(false);
    }
  };

  const handleFlash = async () => {
    const session = sessionRef.current;
    if (!session?.active || !flashAvailable || isSwitching) return;
    try {
      const next = !flashOn;
      if (isNative) {
        await cameraService.setEmbeddedFlashMode(next ? 'on' : 'off');
      } else {
        const track = webStreamRef.current?.getVideoTracks()[0];
        if (!track) throw new Error('No video track');
        const torchConstraint: MediaTrackConstraintSet & { torch: boolean } = { torch: next };
        await track.applyConstraints({ advanced: [torchConstraint] });
      }
      if (session.active) setFlashOn(next);
    } catch (error) {
      console.warn('Flash error:', error);
      if (session.active) setNotice(locale === 'ha' ? 'Ba a iya kunna walƙiya ba.' : 'Could not change the flash on this device.');
    }
  };

  const flashLabel = !flashAvailable
    ? (locale === 'ha' ? 'Babu walƙiya' : 'Flash unavailable')
    : flashOn
      ? (locale === 'ha' ? 'Kashe walƙiya' : 'Turn flash off')
      : (locale === 'ha' ? 'Kunna walƙiya' : 'Turn flash on');

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className={`h-[100dvh] w-full fixed inset-0 z-50 flex flex-col overflow-hidden select-none ${isNative ? 'bg-transparent' : 'bg-black'}`}
    >
      {isNative ? (
        <div id="cameraPreviewContainer" className="absolute inset-0 h-full w-full bg-transparent" />
      ) : (
        <video ref={webVideoRef} playsInline autoPlay muted className="absolute inset-0 h-full w-full object-cover bg-black" />
      )}

      <div className="relative z-10 w-full px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <span id="camera-modal-title" className="text-white text-xs sm:text-sm font-black tracking-wide drop-shadow-md">
          {title || (locale === 'ha' ? 'Kyamarar SmartVillage' : 'SmartVillage Camera')}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleFlash} disabled={!flashAvailable || isSwitching || !isReady}
            aria-label={flashLabel} aria-pressed={flashOn} title={flashLabel}
            className="w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            {flashOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
          </button>
          <button type="button" onClick={closeCamera}
            aria-label={locale === 'ha' ? 'Rufe Kyamara' : 'Close Camera'}
            className="w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 pointer-events-none">
        {cameraError ? (
          <div role="alert" className="pointer-events-auto max-w-xs text-center p-4 bg-slate-900/95 border border-slate-700 rounded-2xl text-white space-y-3 shadow-2xl">
            <Camera className="w-7 h-7 text-amber-400 mx-auto" />
            <p className="text-xs sm:text-sm font-semibold leading-relaxed">
              {locale === 'ha' ? 'Ba a iya buɗe kyamara ba. Duba izinin kyamara ko yi amfani da kyamarar waya.' : 'Could not access the camera. Check camera permission or open the system camera.'}
            </p>
            <button type="button" onClick={async () => {
              const session = sessionRef.current;
              const picked = await pickImageFromWeb('camera');
              if (picked && session) finishCapture(picked, session);
            }} className="w-full py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer">
              {locale === 'ha' ? 'Ɗauki Hoto da Kyamarar Waya' : 'Open System Camera'}
            </button>
            <button type="button" onClick={closeCamera} className="w-full py-2 px-4 bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer">
              {locale === 'ha' ? 'Koma Baya' : 'Go Back'}
            </button>
          </div>
        ) : (
          <div className="w-64 h-64 max-w-[75vw] max-h-[45vh] sm:w-72 sm:h-72 border-2 border-white/60 rounded-3xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.2)]">
            <span className="text-[11px] font-bold text-white bg-black/50 px-3 py-1 rounded-full">
              {!isReady ? (locale === 'ha' ? 'Ana buɗe kyamara…' : 'Starting camera…') : (locale === 'ha' ? 'Daidaita Hoton a Tsakiya' : 'Align Subject in Center')}
            </span>
          </div>
        )}
        {notice && <p role="status" className="absolute bottom-3 max-w-xs text-center text-xs font-semibold text-white bg-slate-900/90 rounded-xl px-3 py-2">{notice}</p>}
      </div>

      <div className="relative z-10 w-full px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <div className="grid grid-cols-3 items-end max-w-sm mx-auto gap-2">
          <button type="button" onClick={closeCamera} className="flex flex-col items-center gap-1 text-white font-bold text-[11px] cursor-pointer">
            <span className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center border border-white/20"><X className="w-6 h-6" /></span>
            <span>{locale === 'ha' ? 'Soke' : 'Cancel'}</span>
          </button>
          <button type="button" onClick={handleCapture} disabled={!isReady || isCapturing || isSwitching || cameraError}
            aria-label={locale === 'ha' ? 'Ɗauki Hoto' : 'Capture Photo'}
            className="flex flex-col items-center gap-1 text-white font-bold text-[11px] cursor-pointer disabled:opacity-50">
            <span className="w-20 h-20 rounded-full border-4 border-white p-1 flex items-center justify-center"><span className={`w-full h-full rounded-full ${isCapturing ? 'bg-red-500' : 'bg-white'}`} /></span>
            <span>{locale === 'ha' ? 'Ɗauka' : 'Capture'}</span>
          </button>
          <button type="button" onClick={handleFlip} disabled={!isReady || !canFlip || isSwitching || isCapturing || cameraError}
            aria-label={locale === 'ha' ? 'Juya Kyamara' : 'Flip Camera'}
            title={!canFlip ? (locale === 'ha' ? 'Babu wata kyamara' : 'No other camera available') : undefined}
            className="flex flex-col items-center gap-1 text-white font-bold text-[11px] cursor-pointer disabled:opacity-50">
            <span className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center border border-white/20"><RefreshCw className="w-6 h-6" /></span>
            <span>{locale === 'ha' ? 'Juya' : 'Flip'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
