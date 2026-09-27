import { CameraPreview, CameraPreviewOptions } from '@capgo/camera-preview';
import { Capacitor } from '@capacitor/core';

export function pickImageFromWeb(source: 'camera' | 'photos' = 'camera'): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (source === 'camera') { input.capture = 'environment'; }
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

export async function startEmbeddedCamera(): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) return false;
    const options: CameraPreviewOptions = {
      position: 'rear',
      parent: 'cameraPreviewContainer',
      className: 'embedded-camera',
      toBack: false,
    };
    await CameraPreview.start(options);
    return true;
  } catch (error) {
    console.error('Embedded camera error:', error);
    alert('Ba a iya buɗe kyamara ba. Don Allah ka sake gwadawa.');
    return false;
  }
}

export async function captureEmbeddedPhoto(): Promise<string | null> {
  try {
    if (!Capacitor.isNativePlatform()) return null;
    const result = await CameraPreview.capture({ quality: 90 });
    await CameraPreview.stop();
    return result.value || null;
  } catch (error) {
    console.error('Capture error:', error);
    try { await CameraPreview.stop(); } catch {}
    return null;
  }
}

export async function stopEmbeddedCamera(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) { await CameraPreview.stop(); }
  } catch (error) {
    console.warn('Stop preview error:', error);
  }
}

export async function pickPhotoFromGallery(): Promise<string | null> {
  return await pickImageFromWeb('photos');
}

export const cameraService = {
  startEmbeddedCamera,
  captureEmbeddedPhoto,
  stopEmbeddedCamera,
  pickPhotoFromGallery,
  isNative: () => Capacitor.isNativePlatform(),
};
