import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

// Fallback for browser/PWA only
export function pickImageFromWeb(source: 'camera' | 'photos' = 'camera'): Promise<string | null> {
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

      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      document.body.appendChild(input);
      input.click();
    } catch (err) {
      console.warn('Web file picker error:', err);
      resolve(null);
    }
  });
}

// Camera capture using native plugin with proper Android setup
export async function takePhotoWithCamera(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      // Request permission
      let permissions = await Camera.checkPermissions();
      if (permissions.camera !== 'granted') {
        try {
          permissions = await Camera.requestPermissions({ permissions: ['camera'] });
        } catch {
          permissions = await Camera.requestPermissions();
        }
      }

      if (permissions.camera !== 'granted') {
        alert('Ba a iya buɗe kyamara ba. Don Allah ka ba da izinin kyamara a saitunan waya.');
        return null;
      }

      // Open the camera using the native plugin
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        promptLabelHeader: 'SmartVillage',
        promptLabelPicture: 'Ɗauki Hoto',
        promptLabelPhoto: 'Zaɓi daga Gallery',
        promptLabelCancel: 'Soke'
      });

      return photo.base64String || null;
    } else {
      return await pickImageFromWeb('camera');
    }
  } catch (error: any) {
    const msg = String(error?.message || error).toLowerCase();
    if (msg.includes('cancel')) {
      return null;
    }
    console.error('Camera error:', error);
    alert('Ba a iya buɗe kyamara ba. Don Allah ka sake gwadawa.');
    return null;
  }
}

// Gallery picker
export async function pickPhotoFromGallery(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });
      return photo.base64String || null;
    } else {
      return await pickImageFromWeb('photos');
    }
  } catch (error: any) {
    const msg = String(error?.message || error).toLowerCase();
    if (msg.includes('cancel')) {
      return null;
    }
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
