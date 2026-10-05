// Offline-First Location Service for SmartVillage
// Solves offline cold-start latency, provides safe last-known position fallback with explicit age metadata,
// and manages progressive satellite GPS lock.

import { Geolocation, Position } from '@capacitor/geolocation';

export interface CachedLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  source: 'live_satellite' | 'cached_recent' | 'cached_stored';
}

export interface FormattedLocationStatus {
  ageLabelEn: string;
  ageLabelHa: string;
  isRecent: boolean; // < 1 hour
  isOld: boolean; // > 12 hours
}

const STORAGE_KEY = 'smartvillage.last_known_location';

/**
 * Synchronously retrieves the last known location from persistent offline storage (< 1ms).
 * Ensures UI and emergency states are NEVER empty while waiting for hardware satellite lock.
 */
export function getLastKnownLocation(): CachedLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
      return {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        accuracy: parsed.accuracy || 100,
        timestamp: parsed.timestamp || Date.now(),
        source: 'cached_stored',
      };
    }
  } catch (err) {
    console.warn('Failed to parse cached location:', err);
  }
  return null;
}

/**
 * Persists a high-quality GPS fix to offline storage.
 */
export function saveLastKnownLocation(coords: { latitude: number; longitude: number; accuracy: number; timestamp?: number }): void {
  try {
    const payload: CachedLocation = {
      latitude: Number(coords.latitude.toFixed(6)),
      longitude: Number(coords.longitude.toFixed(6)),
      accuracy: Math.round(coords.accuracy),
      timestamp: coords.timestamp || Date.now(),
      source: 'cached_stored',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to store cached location:', err);
  }
}

/**
 * Generates human-readable time elapsed labels for the location in English and Hausa.
 * Critical for safety: Ensures farmers and rescue teams clearly distinguish a 5-minute-old
 * location from a 12-hour-old location.
 */
export function formatLocationAge(timestamp: number): FormattedLocationStatus {
  const elapsedMs = Math.max(0, Date.now() - timestamp);
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedMinutes < 1) {
    return {
      ageLabelEn: 'Just now',
      ageLabelHa: 'Yanzu-yanzu',
      isRecent: true,
      isOld: false,
    };
  }

  if (elapsedMinutes < 60) {
    return {
      ageLabelEn: `${elapsedMinutes}m ago`,
      ageLabelHa: `minti ${elapsedMinutes} da suka wuce`,
      isRecent: true,
      isOld: false,
    };
  }

  if (elapsedHours < 24) {
    return {
      ageLabelEn: `${elapsedHours}h ago`,
      ageLabelHa: `awa ${elapsedHours} da suka wuce`,
      isRecent: false,
      isOld: elapsedHours >= 12,
    };
  }

  const days = Math.floor(elapsedHours / 24);
  return {
    ageLabelEn: `${days}d ago`,
    ageLabelHa: `kwanaki ${days} da suka wuce`,
    isRecent: false,
    isOld: true,
  };
}

/**
 * Fast-pass single location fetcher:
 * 1. Checks Capacitor native with acceptable cached age (fast hardware buffer retrieval in <100ms)
 * 2. Falls back to web navigator.geolocation
 */
export async function fetchQuickPosition(
  timeoutMs = 4000,
  maxAgeMs = 60000 // 60 seconds fast-pass threshold
): Promise<CachedLocation | null> {
  // 1. Try Capacitor Geolocation plugin
  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: maxAgeMs,
    });
    if (pos?.coords) {
      return {
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6)),
        accuracy: Math.round(pos.coords.accuracy),
        timestamp: pos.timestamp || Date.now(),
        source: 'cached_recent',
      };
    }
  } catch {}

  // 2. Try browser navigator.geolocation
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const navPos = await new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: maxAgeMs }
        );
      });
      if (navPos?.coords) {
        return {
          latitude: Number(navPos.coords.latitude.toFixed(6)),
          longitude: Number(navPos.coords.longitude.toFixed(6)),
          accuracy: Math.round(navPos.coords.accuracy),
          timestamp: navPos.timestamp || Date.now(),
          source: 'cached_recent',
        };
      }
    } catch {}
  }

  return null;
}
