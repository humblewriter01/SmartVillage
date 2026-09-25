import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface CameraOptionsCustom {
  locale?: string;
  source?: 'camera' | 'photos';
}

/**
 * Fallback file picker for web browsers / iframe sandboxes.
 * Creates an input element on the fly to capture an image without triggering
 * pwa-camera-modal which fails with 'No camera found' in web previews.
 */
function pickFromFilePicker(source?: 'camera' | 'photos'): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (source === 'camera') {
        input.capture = 'environment';
      }
      input.style.position = 'fixed';
      input.style.top = '-1000px';
      input.style.opacity = '0';

      let resolved = false;
      const cleanup = () => {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };

      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(null);
          }
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(reader.result as string);
          }
        };
        reader.onerror = () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(null);
          }
        };
        reader.readAsDataURL(file);
      };

      document.body.appendChild(input);
      input.click();
    } catch (err) {
      console.warn('File picker fallback error:', err);
      resolve(null);
    }
  });
}

export const cameraService = {
  /**
   * Capture a photo using @capacitor/camera on native Android/iOS,
   * or native HTML5 file input on web/preview.
   * Prevents the broken 'No camera found' PWA modal from showing on web.
   */
  async capturePhoto(options?: CameraOptionsCustom): Promise<string | null> {
    const isNative = Capacitor.isNativePlatform();
    const source = options?.source === 'photos' ? CameraSource.Photos : CameraSource.Camera;

    // 1. Native platform (Android APK / iOS)
    if (isNative) {
      try {
        const permStatus = await Camera.checkPermissions();
        if (permStatus.camera !== 'granted' || (source === CameraSource.Photos && permStatus.photos !== 'granted')) {
          const requested = await Camera.requestPermissions({
            permissions: source === CameraSource.Photos ? ['camera', 'photos'] : ['camera'],
          });

          if (requested.camera === 'denied' || requested.photos === 'denied') {
            console.warn('Camera permission was denied in native settings');
            return null;
          }
        }

        const image = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source,
          correctOrientation: true,
        });

        return image.dataUrl || (image.webPath ? image.webPath : null);
      } catch (err: any) {
        const errorMsg = String(err?.message || err);

        // Handle user cancellation silently without crash
        if (
          errorMsg.includes('cancelled') ||
          errorMsg.includes('canceled') ||
          errorMsg.includes('User cancelled') ||
          errorMsg.includes('TakePhotoCancelled')
        ) {
          return null;
        }

        console.warn('Capacitor camera captured error on native:', err);
        return null;
      }
    }

    // 2. Web browser / Preview environment
    // Never call Camera.getPhoto() on web because <pwa-camera-modal> displays 'No camera found'.
    return await pickFromFilePicker(options?.source);
  },

  async pickFromGallery(locale?: string): Promise<string | null> {
    return this.capturePhoto({ locale, source: 'photos' });
  },

  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },
};


