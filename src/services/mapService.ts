// Map Service with Offline Persistence for Agricultural Pinning

export interface MapPin {
  id: string;
  type: 'crop_disease' | 'weather_station' | 'water_point' | 'livestock_alert';
  title: string;
  title_hausa: string;
  cropOrAnimal?: string;
  diseaseName?: string;
  severity?: 'low' | 'moderate' | 'high' | 'critical';
  latitude: number;
  longitude: number;
  locationName: string;
  notes: string;
  notes_hausa?: string;
  createdAt: string;
  weatherDetails?: {
    temperature: number;
    rainfall: number;
    humidity: number;
  };
}

const STORAGE_KEY = 'smartvillage.map.pins';

export const INITIAL_COMMUNITY_PINS: MapPin[] = [
  {
    id: 'pin-kano-onion',
    type: 'crop_disease',
    title: 'Onion Purple Blotch Outbreak',
    title_hausa: 'Barkewar Duhun Ganyen Albasa',
    cropOrAnimal: 'Onion (Albasa)',
    diseaseName: 'Alternaria porri',
    severity: 'high',
    latitude: 12.0022,
    longitude: 8.592,
    locationName: 'Kano Fadama Basin',
    notes: 'Purple lesions observed on early onion beds. Farmers advised to spray neem oil or copper fungicide.',
    notes_hausa: 'An ga alamun cutar a gonakin albasa na rani. Manoma su fesa maganin tagulla.',
    createdAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'pin-zaria-maize',
    type: 'crop_disease',
    title: 'Maize Rust Spotting',
    title_hausa: 'Tsatsar Masara a Zariya',
    cropOrAnimal: 'Maize (Masara)',
    diseaseName: 'Puccinia sorghi',
    severity: 'moderate',
    latitude: 11.0855,
    longitude: 7.7199,
    locationName: 'Zaria Agricultural Corridor',
    notes: 'Mild rust pustules on lower leaves following high humidity.',
    notes_hausa: 'Alamun tsatsa a ganyen ƙasa bayan ruwan sama.',
    createdAt: '2026-09-21T08:30:00Z',
  },
  {
    id: 'pin-abuja-weather',
    type: 'weather_station',
    title: 'Gwagwalada Community Weather Station',
    title_hausa: 'Tashar Yanayi ta Gwagwalada',
    latitude: 8.9431,
    longitude: 7.0864,
    locationName: 'Abuja / Gwagwalada Area',
    notes: 'Soil moisture adequate for late-season planting. Humidity 68%.',
    notes_hausa: 'Laimar ƙasa tana da kyau don shuka. Laima kashi 68%.',
    createdAt: '2026-09-22T06:00:00Z',
    weatherDetails: {
      temperature: 30.5,
      rainfall: 14.2,
      humidity: 68,
    },
  },
  {
    id: 'pin-jos-tomato',
    type: 'crop_disease',
    title: 'Tomato Early Blight Alert',
    title_hausa: 'Gargadin Bakin Ciwon Tumatir',
    cropOrAnimal: 'Tomato (Tumatir)',
    diseaseName: 'Alternaria solani',
    severity: 'critical',
    latitude: 9.8965,
    longitude: 8.8583,
    locationName: 'Jos Plateau Highlands',
    notes: 'Target-like rings on foliage. Immediate pruning and staking recommended.',
    notes_hausa: 'Digo-digo masu da\'ira a ganye. A daure jikin sanda a share ƙasa.',
    createdAt: '2026-09-19T14:15:00Z',
  },
  {
    id: 'pin-sokoto-water',
    type: 'water_point',
    title: 'Rima Deep Solar Borehole (Potable)',
    title_hausa: 'Tashar Ruwan Fanfo mai Tsabta ta Rima',
    latitude: 13.0609,
    longitude: 5.2476,
    locationName: 'Sokoto / Rima Valley',
    notes: 'Certified clean drinking water point with solar pumping. Free of coliforms.',
    notes_hausa: 'Ruwan fanfo mai amfani da hasken rana, mai tsabta da aminci don sha.',
    createdAt: '2026-09-18T11:00:00Z',
  },
  {
    id: 'pin-maiduguri-livestock',
    type: 'livestock_alert',
    title: 'Goat PPR Vaccination Camp',
    title_hausa: 'Cibiyar Allurar Rigakafin PPR ta Awaki',
    cropOrAnimal: 'Goat (Akuya)',
    diseaseName: 'Peste des Petits Ruminants',
    severity: 'high',
    latitude: 11.8333,
    longitude: 13.15,
    locationName: 'Maiduguri Livestock Market',
    notes: 'Veterinary team on ground administering free PPR and CBPP vaccines.',
    notes_hausa: 'Likitocin dabbobi na bayar da allurar rigakafin kyauta.',
    createdAt: '2026-09-22T07:45:00Z',
  },
];

export const mapService = {
  getPins(): MapPin[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        // Seed initial pins
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_COMMUNITY_PINS));
        return INITIAL_COMMUNITY_PINS;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_COMMUNITY_PINS;
    } catch {
      return INITIAL_COMMUNITY_PINS;
    }
  },

  addPin(pin: Omit<MapPin, 'id' | 'createdAt'>): MapPin {
    const pins = this.getPins();
    const newPin: MapPin = {
      ...pin,
      id: `pin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newPin, ...pins];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    return newPin;
  },

  deletePin(id: string): void {
    const pins = this.getPins().filter((p) => p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
    } catch {}
  },

  resetDefault(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_COMMUNITY_PINS));
    } catch {}
  },
};
