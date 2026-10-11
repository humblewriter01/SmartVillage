/**
 * Safe Storage & Legacy Android WebView Polyfills
 * 
 * Provides fail-safe localStorage wrappers with in-memory fallback,
 * safe date/time formatters, and polyfills for Chrome 52-69 / Android 7-9 WebViews.
 */

// In-memory fallback map if localStorage throws (e.g. on Android 9 Tecno/HiOS/XOS devices)
const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[safeStorage] getItem failed for key "${key}", using memory store:`, e);
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`[safeStorage] setItem failed for key "${key}", using memory store:`, e);
    }
    memoryStore.set(key, value);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[safeStorage] removeItem failed for key "${key}":`, e);
    }
    memoryStore.delete(key);
  },

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn('[safeStorage] clear failed:', e);
    }
    memoryStore.clear();
  },
};

/**
 * Fallback RFC4122 v4 UUID generator for WebViews lacking crypto.randomUUID
 */
export function safeRandomUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Safe Date Formatter with fallback for Android WebViews where 'ha-NG' or Intl options throw RangeError
 */
export function formatDateSafe(
  dateInput: Date | number | string,
  locale: 'en' | 'ha' = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const tag = locale === 'ha' ? 'ha-NG' : 'en-NG';
    return d.toLocaleDateString(tag, options);
  } catch {
    try {
      const d = new Date(dateInput);
      return d.toLocaleDateString('en-US', options);
    } catch {
      try {
        const d = new Date(dateInput);
        return d.toLocaleDateString();
      } catch {
        const d = new Date(dateInput);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
  }
}

/**
 * Safe Time Formatter with fallback
 */
export function formatTimeSafe(dateInput: Date | number | string = new Date()): string {
  try {
    const d = new Date(dateInput);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    try {
      return new Date(dateInput).toLocaleTimeString();
    } catch {
      const d = new Date(dateInput);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
}

/**
 * Global prototype & modern API polyfills for Chrome 52-69 / Android 7-9 WebViews
 */
export function initLegacyPolyfills(): void {
  if (typeof window === 'undefined') return;

  // 1. Array.prototype.at
  if (!Array.prototype.at) {
    Array.prototype.at = function (n: number) {
      n = Math.trunc(n) || 0;
      if (n < 0) n += this.length;
      if (n < 0 || n >= this.length) return undefined;
      return this[n];
    };
  }

  // 2. Object.hasOwn
  if (!('hasOwn' in Object)) {
    (Object as any).hasOwn = function (obj: any, prop: PropertyKey): boolean {
      if (obj === null || obj === undefined) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      return Object.prototype.hasOwnProperty.call(obj, prop);
    };
  }

  // 3. structuredClone
  if (typeof (window as any).structuredClone !== 'function') {
    (window as any).structuredClone = function <T>(val: T): T {
      if (val === undefined) return undefined as any;
      return JSON.parse(JSON.stringify(val));
    };
  }

  // 4. crypto.randomUUID
  if (!window.crypto) {
    (window as any).crypto = {};
  }
  if (typeof (window.crypto as any).randomUUID !== 'function') {
    (window.crypto as any).randomUUID = safeRandomUUID;
  }
}

/**
 * Diagnostic helper to detect Android System WebView Chrome version
 */
export interface WebViewDiagnostic {
  isAndroid: boolean;
  isWebView: boolean;
  chromeMajorVersion: number | null;
  isOutdated: boolean;
}

export function detectWebViewInfo(): WebViewDiagnostic {
  if (typeof navigator === 'undefined') {
    return { isAndroid: false, isWebView: false, chromeMajorVersion: null, isOutdated: false };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isWebView = isAndroid && (/wv|Version\/[\d.]+/i.test(ua) || (window as any).Capacitor !== undefined);

  let chromeMajorVersion: number | null = null;
  const match = ua.match(/Chrome\/(\d+)/i);
  if (match && match[1]) {
    chromeMajorVersion = parseInt(match[1], 10);
  }

  // Android WebViews below Chrome 80 lack modern CSS/JS engine optimizations
  const isOutdated = isAndroid && chromeMajorVersion !== null && chromeMajorVersion < 80;

  return {
    isAndroid,
    isWebView,
    chromeMajorVersion,
    isOutdated,
  };
}
