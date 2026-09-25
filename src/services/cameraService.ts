import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

// Web fallback (browser only)
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
      console.warn('Web file picker error:', err);
      resolve(null);
    }
  });
}

// Function to open the CAMERA directly with explicit runtime permission checks
export async function takePhotoWithCamera(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      // Step 1: Check current permissions
      let permissions = await Camera.checkPermissions();

      // Step 2: Request permissions if not granted
      if (permissions.camera !== 'granted') {
        permissions = await Camera.requestPermissions({ permissions: ['camera'] });
      }

      // Step 3: If still not granted, show error and return
      if (permissions.camera !== 'granted') {
        alert('Ba a iya buɗe kyamara ba. Don Allah ka ba da izinin kyamara a saitunan waya.');
        return null;
      }

      // Step 4: Open the camera
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      return photo.base64String || null;
    } else {
      // Web fallback (browser only)
      return await pickImageFromWeb('camera');
    }
  } catch (error: any) {
    const msg = String(error?.message || error);
    if (
      msg.includes('cancelled') ||
      msg.includes('canceled') ||
      msg.includes('User cancelled') ||
      msg.includes('TakePhotoCancelled')
    ) {
      return null;
    }
    console.error('Camera error:', error);
    alert('Ba a iya buɗe kyamara ba. Don Allah ka ba da izinin kyamara a saitunan waya.');
    return null;
  }
}

// Function to open the GALLERY separately (optional)
export async function pickPhotoFromGallery(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      let permissions = await Camera.checkPermissions();
      if (permissions.photos !== 'granted') {
        permissions = await Camera.requestPermissions({ permissions: ['photos'] });
      }

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos, // <--- This opens the Gallery
      });
      return photo.base64String || null;
    } else {
      return await pickImageFromWeb('photos');
    }
  } catch (error: any) {
    const msg = String(error?.message || error);
    if (
      msg.includes('cancelled') ||
      msg.includes('canceled') ||
      msg.includes('User cancelled') ||
      msg.includes('TakePhotoCancelled')
    ) {
      return null;
    }
    console.error('Gallery error:', error);
    return null;
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
