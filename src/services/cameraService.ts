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

// Function to open the CAMERA directly using the HTML method (works on ALL Android phones including Tecno)
export async function takePhotoWithCamera(): Promise<string | null> {
  // Force HTML file input method on ALL platforms to bypass Tecno/HiOS restrictions
  return await pickImageFromWeb('camera');
}

// Function to open the GALLERY using the HTML method
export async function pickPhotoFromGallery(): Promise<string | null> {
  // Force HTML file input method on ALL platforms
  return await pickImageFromWeb('photos');
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
