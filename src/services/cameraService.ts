import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/**
 * Universal web and mobile file/camera picker fallback.
 * Uses an invisible HTML <input type="file"> with focus and cancel guards
 * to ensure promises never hang indefinitely even if cancelled or blocked.
 */
export function pickImageFromWeb(source: 'camera' | 'photos' = 'camera'): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') {
      input.capture = 'environment';
    }
    input.style.position = 'fixed';
    input.style.top = '-10000px';
    input.style.left = '-10000px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';

    const cleanup = (result: string | null) => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener('focus', onWindowFocus);
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
      resolve(result);
    };

    // When the file dialog closes without selection, window gets focus
    const onWindowFocus = () => {
      setTimeout(() => {
        if (!resolved && (!input.files || input.files.length === 0)) {
          cleanup(null);
        }
      }, 700);
    };

    window.addEventListener('focus', onWindowFocus, { once: true });

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        cleanup(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        cleanup(reader.result as string);
      };
      reader.onerror = () => {
        cleanup(null);
      };
      reader.readAsDataURL(file);
    };

    // Modern browsers fire 'cancel' if the user aborts
    input.addEventListener('cancel', () => {
      cleanup(null);
    });

    document.body.appendChild(input);
    try {
      input.click();
    } catch {
      cleanup(null);
    }
  });
}

/**
 * Open the camera directly.
 * Optimized for Android/Tecno/Transsion phones with resolution capping to avoid OutOfMemory,
 * safe permission requests, and multi-format return (dataUrl, base64, webPath).
 */
export async function takePhotoWithCamera(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      // Step 1: Pre-check permissions cleanly without blocking if already prompt/granted
      try {
        const permStatus = await Camera.checkPermissions().catch(() => null);
        if (permStatus && permStatus.camera !== 'granted') {
          await Camera.requestPermissions({ permissions: ['camera'] }).catch(() => null);
        }
      } catch (permErr) {
        console.warn('Capacitor camera permission check notice:', permErr);
      }

      // Step 2: Open camera with downscaled width/height to avoid Tecno 50MP heap OutOfMemory
      const photo = await Camera.getPhoto({
        quality: 80,
        width: 1280,
        height: 1280,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
        saveToGallery: false,
      });

      // Handle all possible output formats from Android Capacitor Camera plugin
      if (photo.dataUrl) {
        return photo.dataUrl;
      }
      if (photo.base64String) {
        return photo.base64String.startsWith('data:')
          ? photo.base64String
          : `data:image/jpeg;base64,${photo.base64String}`;
      }
      if (photo.webPath) {
        try {
          const resp = await fetch(photo.webPath);
          const blob = await resp.blob();
          return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {
          return photo.webPath;
        }
      }

      return null;
    } catch (error: any) {
      const msg = String(error?.message || error).toLowerCase();
      // If user purposely cancelled, do not trigger fallback or alert
      if (
        msg.includes('cancelled') ||
        msg.includes('canceled') ||
        msg.includes('user cancelled') ||
        msg.includes('takephotocancelled')
      ) {
        return null;
      }

      console.warn('Native Camera.getPhoto error on device, falling back to web file capture:', error);

      // Attempt web/HTML file capture fallback
      try {
        const fallback = await pickImageFromWeb('camera');
        if (fallback) return fallback;
      } catch (fallbackErr) {
        console.warn('Fallback capture error:', fallbackErr);
      }

      // Re-throw so component catch can fire ref input if needed
      throw error;
    }
  } else {
    return await pickImageFromWeb('camera');
  }
}

/**
 * Open the device Gallery / Photo Library.
 */
export async function pickPhotoFromGallery(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      try {
        const permStatus = await Camera.checkPermissions().catch(() => null);
        if (permStatus && permStatus.photos !== 'granted') {
          await Camera.requestPermissions({ permissions: ['photos'] }).catch(() => null);
        }
      } catch (permErr) {
        console.warn('Capacitor gallery permission check notice:', permErr);
      }

      const photo = await Camera.getPhoto({
        quality: 80,
        width: 1280,
        height: 1280,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        correctOrientation: true,
      });

      if (photo.dataUrl) {
        return photo.dataUrl;
      }
      if (photo.base64String) {
        return photo.base64String.startsWith('data:')
          ? photo.base64String
          : `data:image/jpeg;base64,${photo.base64String}`;
      }
      if (photo.webPath) {
        try {
          const resp = await fetch(photo.webPath);
          const blob = await resp.blob();
          return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {
          return photo.webPath;
        }
      }

      return null;
    } catch (error: any) {
      const msg = String(error?.message || error).toLowerCase();
      if (
        msg.includes('cancelled') ||
        msg.includes('canceled') ||
        msg.includes('user cancelled') ||
        msg.includes('takephotocancelled')
      ) {
        return null;
      }
      console.warn('Native gallery error, trying fallback:', error);
      try {
        return await pickImageFromWeb('photos');
      } catch {
        return null;
      }
    }
  } else {
    return await pickImageFromWeb('photos');
  }
}

export const cameraService = {
  takePhotoWithCamera,
  pickPhotoFromGallery,
  capturePhoto: async (options?: { locale?: string; source?: 'camera' | 'photos' }) => {
    if (options?.source === 'photos') {
      return pickPhotoFromGallery();
    }
    return takePhotoWithCamera();
  },
  pickFromGallery: async () => pickPhotoFromGallery(),
  isNative: () => Capacitor.isNativePlatform(),
};
