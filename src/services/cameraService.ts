import { CameraPreview, type CameraPreviewFlashMode, type CameraPreviewOptions } from '@capgo/camera-preview';
import { Capacitor } from '@capacitor/core';
import { createCameraOperationQueue } from './cameraOperationQueue';

const enqueueCameraOperation = createCameraOperationQueue();

export function pickImageFromWeb(source: 'camera' | 'photos' = 'camera'): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (source === 'camera') input.capture = 'environment';
      input.style.position = 'fixed';
      input.style.top = '-1000px';
      input.style.opacity = '0';
      input.onchange = () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.addEventListener('cancel', () => {
        input.remove();
        resolve(null);
      }, { once: true });
      document.body.appendChild(input);
      input.click();
    } catch (err) {
      console.warn('Web file picker error:', err);
      resolve(null);
    }
  });
}

export function startEmbeddedCamera(): Promise<boolean> {
  return enqueueCameraOperation(async () => {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const options: CameraPreviewOptions = {
        position: 'rear',
        // The native preview must be behind the WebView for HTML controls to work.
        toBack: true,
        aspectMode: 'cover',
        disableAudio: true,
        storeToFile: false,
      };
      await CameraPreview.start(options);
      return true;
    } catch (error) {
      console.error('Embedded camera error:', error);
      return false;
    }
  });
}

export function captureEmbeddedPhoto(): Promise<string | null> {
  return enqueueCameraOperation(async () => {
    if (!Capacitor.isNativePlatform()) return null;
    const result = await CameraPreview.capture({ quality: 90 });
    return result.value || null;
  });
}

export function stopEmbeddedCamera(): Promise<void> {
  return enqueueCameraOperation(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await CameraPreview.stop();
    } catch (error) {
      // The preview may never have started (e.g. permission was denied).
      console.warn('Stop preview error:', error);
    }
  });
}

export function flipEmbeddedCamera(): Promise<void> {
  return enqueueCameraOperation(() => CameraPreview.flip());
}

export function setEmbeddedFlashMode(flashMode: 'on' | 'off'): Promise<void> {
  return enqueueCameraOperation(() => CameraPreview.setFlashMode({ flashMode }));
}

export function getEmbeddedFlashModes(): Promise<CameraPreviewFlashMode[]> {
  return enqueueCameraOperation(async () => {
    try {
      const { result } = await CameraPreview.getSupportedFlashModes();
      return result;
    } catch {
      return [];
    }
  });
}

export function getEmbeddedCameraPositions(): Promise<('rear' | 'front')[] | null> {
  return enqueueCameraOperation(async () => {
    try {
      const { devices } = await CameraPreview.getAvailableDevices();
      return devices.length ? devices.map(device => device.position) : null;
    } catch {
      // If the device list is unavailable, still let the user try flipping.
      return null;
    }
  });
}

export async function pickPhotoFromGallery(): Promise<string | null> {
  return pickImageFromWeb('photos');
}

export const cameraService = {
  startEmbeddedCamera,
  captureEmbeddedPhoto,
  stopEmbeddedCamera,
  flipEmbeddedCamera,
  setEmbeddedFlashMode,
  getEmbeddedFlashModes,
  getEmbeddedCameraPositions,
  pickPhotoFromGallery,
  isNative: () => Capacitor.isNativePlatform(),
};
