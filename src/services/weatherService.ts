export interface WeatherDay {
  date: string;
  max: number;
  min: number;
  rain: number;
}

export interface NigerianLocation {
  name: string;
  state: string;
  lat: number;
  lon: number;
}

export const NIGERIAN_LOCATIONS: NigerianLocation[] = [
  { name: 'Abuja', state: 'FCT', lat: 9.0579, lon: 7.4951 },
  { name: 'Kano', state: 'Kano', lat: 12.0022, lon: 8.592 },
  { name: 'Kaduna', state: 'Kaduna', lat: 10.5105, lon: 7.4165 },
  { name: 'Ibadan', state: 'Oyo', lat: 7.3775, lon: 3.947 },
  { name: 'Jos', state: 'Plateau', lat: 9.8965, lon: 8.8583 },
  { name: 'Maiduguri', state: 'Borno', lat: 11.8311, lon: 13.151 },
  { name: 'Sokoto', state: 'Sokoto', lat: 13.0059, lon: 5.2476 },
  { name: 'Enugu', state: 'Enugu', lat: 6.4584, lon: 7.5464 },
  { name: 'Port Harcourt', state: 'Rivers', lat: 4.8156, lon: 7.0498 },
  { name: 'Lagos', state: 'Lagos', lat: 6.5244, lon: 3.3792 },
];

const CACHE_KEY = 'smartvillage.weather.cache';

export const weatherService = {
  async load(lat = 9.0579, lon = 7.4951): Promise<{ days: WeatherDay[]; isCached: boolean }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Africa%2FLagos`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const daily = data.daily;
        if (daily && daily.time) {
          const days: WeatherDay[] = daily.time.map((timeStr: string, idx: number) => ({
            date: timeStr,
            max: Number(daily.temperature_2m_max[idx]),
            min: Number(daily.temperature_2m_min[idx]),
            rain: Number(daily.precipitation_sum[idx] ?? 0),
          }));

          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              days,
              timestamp: Date.now(),
              lat,
              lon,
            })
          );

          return { days, isCached: false };
        }
      }
    } catch (err) {
      console.warn('Network weather load failed, attempting cache:', err);
    }

    // Fallback to cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.days)) {
          return { days: parsed.days, isCached: true };
        }
      }
    } catch {}

    // Fallback default forecast if completely empty
    const fallbackDays: WeatherDay[] = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        date: d.toISOString().split('T')[0],
        max: 32 + (i % 3),
        min: 22 + (i % 2),
        rain: i % 2 === 0 ? 1.5 : 0.0,
      };
    });

    return { days: fallbackDays, isCached: true };
  },
};
