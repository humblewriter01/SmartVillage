// SmartVillage Soil Health Management Service
// Tracks pH, Moisture, Soil Type, and provides agronomic remedies for selected crops

export interface SoilRecord {
  id: string;
  plotName: string;
  cropId: string;
  cropName: string;
  cropHausaName: string;
  ph: number;
  moisture: number; // percentage 0 - 100
  soilType: 'sandy_loam' | 'loamy' | 'clay' | 'sandy';
  notes?: string;
  createdAt: string; // ISO date
  advice: SoilConditionAdvice;
}

export interface SoilConditionAdvice {
  phStatus: 'strongly_acidic' | 'slightly_acidic' | 'optimal' | 'alkaline' | 'strongly_alkaline';
  phScoreTextEn: string;
  phScoreTextHa: string;
  phAdviceEn: string;
  phAdviceHa: string;
  moistureStatus: 'critically_dry' | 'moderate' | 'optimal' | 'waterlogged';
  moistureTextEn: string;
  moistureTextHa: string;
  moistureAdviceEn: string;
  moistureAdviceHa: string;
  overallRating: 'excellent' | 'good' | 'fair' | 'poor';
  overallScore: number; // 0 - 100
}

export interface CropSoilRequirement {
  cropId: string;
  name: string;
  hausaName: string;
  emoji: string;
  minPh: number;
  optimalPhMin: number;
  optimalPhMax: number;
  maxPh: number;
  optimalMoistureMin: number;
  optimalMoistureMax: number;
  criticalNotesEn: string;
  criticalNotesHa: string;
}

export const CROP_SOIL_REQUIREMENTS: CropSoilRequirement[] = [
  {
    cropId: 'soybeans',
    name: 'Soybeans',
    hausaName: 'Waken Soya',
    emoji: '🫘',
    minPh: 5.8,
    optimalPhMin: 6.0,
    optimalPhMax: 6.8,
    maxPh: 7.5,
    optimalMoistureMin: 50,
    optimalMoistureMax: 70,
    criticalNotesEn:
      'Soybeans require a neutral pH (6.0-6.8) for nitrogen-fixing Rhizobium bacteria in root nodules to thrive. Soil below 5.8 requires lime or wood ash to prevent phosphorus lockout.',
    criticalNotesHa:
      'Waken soya yana buƙatar ƙasa mai daidaito (pH 6.0-6.8) domin ƙwayoyin cutar Rhizobium su kafa kwayar takin nitrogen a saiwa. Ƙasa mai tsami ƙasa da 5.8 tana buƙatar toka ko farar ƙasa.',
  },
  {
    cropId: 'onion',
    name: 'Onion',
    hausaName: 'Albasa',
    emoji: '🧅',
    minPh: 6.0,
    optimalPhMin: 6.2,
    optimalPhMax: 6.8,
    maxPh: 7.5,
    optimalMoistureMin: 55,
    optimalMoistureMax: 75,
    criticalNotesEn:
      'Onions have shallow, delicate root systems highly sensitive to soil acidity. Below pH 6.0, leaves turn yellow and bulb development stunts.',
    criticalNotesHa:
      'Albasa tana da gajeriyar saiwa mai rauni da ba ta son tsamin ƙasa. Idan pH ya faɗi ƙasa da 6.0, ganyenta na yin rawaya albasar ba za ta kumbura ba.',
  },
  {
    cropId: 'maize',
    name: 'Maize',
    hausaName: 'Masara',
    emoji: '🌽',
    minPh: 5.5,
    optimalPhMin: 5.8,
    optimalPhMax: 7.0,
    maxPh: 7.8,
    optimalMoistureMin: 50,
    optimalMoistureMax: 70,
    criticalNotesEn:
      'Maize grows well in pH 5.8-7.0. In acidic soil, phosphorus becomes unavailable, causing purple discoloration on young leaves.',
    criticalNotesHa:
      'Masara tana son pH 5.8-7.0. A ƙasa mai tsami, takin phosphorus yana daskarewa, wanda ke sa ƙananan ganye yin ruwan hoda ko ja.',
  },
  {
    cropId: 'tomato',
    name: 'Tomato',
    hausaName: 'Tumatir',
    emoji: '🍅',
    minPh: 5.8,
    optimalPhMin: 6.0,
    optimalPhMax: 6.8,
    maxPh: 7.5,
    optimalMoistureMin: 50,
    optimalMoistureMax: 68,
    criticalNotesEn:
      'Tomatoes in acidic soil (pH < 6.0) suffer calcium lockout, resulting in severe Blossom End Rot (black sunken fruit bottoms).',
    criticalNotesHa:
      'Tumatir a ƙasa mai tsami (pH < 6.0) ba ya iya shan calcium, wanda ke jawo baƙar rubewar gindin tumatir (Blossom End Rot).',
  },
  {
    cropId: 'rice',
    name: 'Rice',
    hausaName: 'Shinkafa',
    emoji: '🌾',
    minPh: 5.0,
    optimalPhMin: 5.5,
    optimalPhMax: 6.5,
    maxPh: 7.5,
    optimalMoistureMin: 70,
    optimalMoistureMax: 95,
    criticalNotesEn:
      'Lowland rice tolerates slightly acidic conditions (pH 5.0-6.5) well and requires high moisture or saturated standing water (3-5 cm).',
    criticalNotesHa:
      'Shinkafar fadama tana jure ɗan tsamin ƙasa (pH 5.0-6.5) kuma tana son ruwa ko laima mai yawa (santimita 3-5 na ruwa a gona).',
  },
  {
    cropId: 'sorghum',
    name: 'Sorghum',
    hausaName: 'Dawa',
    emoji: '🌾',
    minPh: 5.5,
    optimalPhMin: 6.0,
    optimalPhMax: 7.5,
    maxPh: 8.2,
    optimalMoistureMin: 40,
    optimalMoistureMax: 65,
    criticalNotesEn:
      'Sorghum is remarkably tolerant to wide pH variations (5.5-7.5) and survives low soil moisture better than most cereals.',
    criticalNotesHa:
      'Dawa tana jure yanayin ƙasa daban-daban (pH 5.5-7.5) kuma tana iya rayuwa a ƙasa mai ƙarancin laima fiye da sauran hatsi.',
  },
  {
    cropId: 'wheat',
    name: 'Wheat',
    hausaName: 'Alkama',
    emoji: '🌾',
    minPh: 6.0,
    optimalPhMin: 6.2,
    optimalPhMax: 7.2,
    maxPh: 8.0,
    optimalMoistureMin: 50,
    optimalMoistureMax: 70,
    criticalNotesEn:
      'Irrigated winter wheat requires balanced pH (6.2-7.2) and consistent furrow irrigation every 7-10 days during the cool season.',
    criticalNotesHa:
      'Alkamar rani tana buƙatar ƙasa mai daidaito (pH 6.2-7.2) da kuma shayarwa a kowanne kwanaki 7-10 a lokacin sanyi.',
  },
  {
    cropId: 'groundnut',
    name: 'Groundnut (Peanut)',
    hausaName: 'Gyaɗa',
    emoji: '🥜',
    minPh: 5.5,
    optimalPhMin: 6.0,
    optimalPhMax: 6.8,
    maxPh: 7.2,
    optimalMoistureMin: 45,
    optimalMoistureMax: 65,
    criticalNotesEn:
      'Groundnuts require light sandy-loam and adequate calcium in topsoil. Acidic soil prevents calcium uptake, producing hollow, empty pods ("pops").',
    criticalNotesHa:
      'Gyaɗa tana buƙatar ƙasa mai yashi da laushi da sinadarin calcium. Ƙasa mai tsami na hana samun calcium, wanda ke sa kwasfa zama fayau babu ƙwaya.',
  },
  {
    cropId: 'cassava',
    name: 'Cassava',
    hausaName: 'Rogo',
    emoji: '🥔',
    minPh: 4.8,
    optimalPhMin: 5.5,
    optimalPhMax: 6.8,
    maxPh: 7.5,
    optimalMoistureMin: 40,
    optimalMoistureMax: 65,
    criticalNotesEn:
      'Cassava is highly resilient and tolerates moderate soil acidity (down to pH 5.0), but demands good drainage to avoid tuber rot.',
    criticalNotesHa:
      'Rogo yana da juriya sosai kuma yana iya girma a ƙasa mai ɗan tsami (har zuwa pH 5.0), amma yana son ƙasa mai sauƙin zubar da ruwa don saiwa ba ta rube ba.',
  },
];

export const evaluateSoilConditions = (
  cropId: string,
  ph: number,
  moisture: number
): SoilConditionAdvice => {
  const req =
    CROP_SOIL_REQUIREMENTS.find((c) => c.cropId === cropId) ||
    CROP_SOIL_REQUIREMENTS.find((c) => c.cropId === 'soybeans') ||
    CROP_SOIL_REQUIREMENTS[0];

  // Evaluate pH
  let phStatus: SoilConditionAdvice['phStatus'] = 'optimal';
  let phScoreTextEn = 'Optimal pH';
  let phScoreTextHa = 'Daidaitaccen Tsami';
  let phAdviceEn = '';
  let phAdviceHa = '';
  let phScore = 100;

  if (ph < 5.5) {
    phStatus = 'strongly_acidic';
    phScoreTextEn = 'Strongly Acidic (Severe)';
    phScoreTextHa = 'Tsami Mai Tsanani';
    phScore = 40;
    phAdviceEn = `Critical acidity! At pH ${ph.toFixed(1)}, vital nutrients (phosphorus, calcium, magnesium) are chemically locked out. For ${req.name}, apply agricultural lime (calcium carbonate) at 400-500 kg/ha or broadcast sifted dry wood ash (toka) at 600 kg/ha onto beds. Work in well-rotted cow/goat manure (takin gargajiya) to buffer the soil. Avoid Ammonium Sulfate fertilizer.`;
    phAdviceHa = `Ƙasar tana da tsami mai tsanani (pH ${ph.toFixed(1)})! Wannan na hana ${req.hausaName} shan takin phosphorus da calcium. Shawara: Zuba farar ƙasa (agricultural lime) ko tokar itace (toka) kilo 500 a kan gona kafin shuka. Sanya takin gargajiya na dabbobi don gyara ƙasa. Kada a yi amfani da takin Ammonium Sulfate.`;
  } else if (ph < req.optimalPhMin) {
    phStatus = 'slightly_acidic';
    phScoreTextEn = 'Slightly Acidic';
    phScoreTextHa = 'Ɗan Tsami';
    phScore = 70;
    phAdviceEn = `Slightly below optimal pH (${ph.toFixed(1)} vs target ${req.optimalPhMin}-${req.optimalPhMax}). For ${req.name}, broadcast 2-3 bags of dry cooking wood ash (toka) or 150 kg of dolomite lime per hectare, and incorporate farmyard compost during ridge preparation.`;
    phAdviceHa = `Ƙasar tana da ɗan tsami (${ph.toFixed(1)} maimakon ${req.optimalPhMin}-${req.optimalPhMax}). Domin ${req.hausaName}, zuba buhu 2-3 na tokar itace (toka) ko takin dolomite a gona, sannan a sa takin gargajiya yayin shuka kunya.`;
  } else if (ph > req.optimalPhMax + 0.7) {
    phStatus = 'strongly_alkaline';
    phScoreTextEn = 'Strongly Alkaline (High Salinity)';
    phScoreTextHa = 'Gishiri/Alkaline Mai Yawa';
    phScore = 45;
    phAdviceEn = `Soil is excessively alkaline (pH ${ph.toFixed(1)}). Micronutrients like iron, zinc, and manganese are precipitated out. For ${req.name}, incorporate generous amounts of well-composted organic matter, cattle manure, or elemental sulfur (50-100 kg/ha). Mulch heavily with neem leaves to slowly lower pH.`;
    phAdviceHa = `Ƙasar tana da gishirin alkaline mai yawa (pH ${ph.toFixed(1)}). Wannan na hana ${req.hausaName} shan sinadarin iron da zinc. Shawara: Zuba takin kaji ko shanu mai yawa, ko takin sulfur. Sanya ciyawa ko ganyen dogon-yaro a matsayin shinfiɗa (mulch) domin rage alkalinity a hankali.`;
  } else if (ph > req.optimalPhMax) {
    phStatus = 'alkaline';
    phScoreTextEn = 'Moderately Alkaline';
    phScoreTextHa = 'Ɗan Gishirin Alkaline';
    phScore = 75;
    phAdviceEn = `Slightly alkaline for ${req.name} (pH ${ph.toFixed(1)} vs target ${req.optimalPhMin}-${req.optimalPhMax}). Top-dress with composted organic manure and avoid hard water with high calcium bicarbonate when irrigating.`;
    phAdviceHa = `Ƙasar tana da ɗan gishirin alkaline ga ${req.hausaName} (${ph.toFixed(1)}). Zuba takin gargajiya mai kyau a gona kuma a kiyaye yin ban ruwa da ruwa mai tsananin gishiri.`;
  } else {
    phStatus = 'optimal';
    phScoreTextEn = `Optimal for ${req.name} (${req.optimalPhMin} - ${req.optimalPhMax})`;
    phScoreTextHa = `Daidaitaccen Yanayi ga ${req.hausaName}`;
    phScore = 100;
    phAdviceEn = `Soil pH ${ph.toFixed(1)} is in the prime sweet spot for ${req.name}! Root absorption of N-P-K and microbial activity are performing at peak potential. Maintain current organic soil management practices.`;
    phAdviceHa = `Ma'aunin pH ${ph.toFixed(1)} ya cika daidai ga ${req.hausaName}! Saiwar shuka na shan dukkan takin NPK da sauran sinadarai yadda ya kamata. Ci gaba da kula da gonar da takin gargajiya.`;
  }

  // Evaluate Moisture
  let moistureStatus: SoilConditionAdvice['moistureStatus'] = 'optimal';
  let moistureTextEn = 'Optimal Moisture';
  let moistureTextHa = 'Daidaitacciyar Laima';
  let moistureAdviceEn = '';
  let moistureAdviceHa = '';
  let moistureScore = 100;

  if (moisture < 35) {
    moistureStatus = 'critically_dry';
    moistureTextEn = 'Critically Dry (Drought Stress)';
    moistureTextHa = 'Bushewa Mai Tsanani';
    moistureScore = 40;
    moistureAdviceEn = `Soil moisture is low (${moisture}%). Plants are facing drought stress. Irrigate immediately in early morning or late evening. Apply a 5-8 cm mulch blanket using rice straw, groundnut haulms, or dried sorghum stalks to prevent rapid evaporation under hot Harmattan winds.`;
    moistureAdviceHa = `Laimar ƙasa ta yi ƙasa sosai (${moisture}%). Shuka na fuskantar bushewa da fari. Shayar da gona da gaggawa da sassafe ko da yamma. Shimfiɗa ciyawa, karan dawa, ko danyar shinkafa (mulch) santimita 5-8 don hana iskar rani busar da ƙasa.`;
  } else if (moisture < req.optimalMoistureMin) {
    moistureStatus = 'moderate';
    moistureTextEn = 'Low to Moderate Moisture';
    moistureTextHa = 'Matsakaiciyar Laima';
    moistureScore = 75;
    moistureAdviceEn = `Moisture level (${moisture}%) is slightly below optimal range (${req.optimalMoistureMin}%-${req.optimalMoistureMax}%). Schedule a light furrow irrigation within the next 48 hours to prevent moisture stress during critical growth stages.`;
    moistureAdviceHa = `Laimar ƙasa (${moisture}%) ta ɗan yi ƙasa da buƙata (${req.optimalMoistureMin}%-${req.optimalMoistureMax}%). Yi shirin shayarwa a cikin sa'o'i 48 masu zuwa don shuka ba ta dakata da girma ba.`;
  } else if (cropId !== 'rice' && moisture > 80) {
    moistureStatus = 'waterlogged';
    moistureTextEn = 'Waterlogged / Flooded Soil';
    moistureTextHa = 'Ruwa Ya Yi Yawa / Ambaliya';
    moistureScore = 45;
    moistureAdviceEn = `Soil is oversaturated (${moisture}%). Danger of root suffocation, Pythium damping-off, and Fusarium crown rot for ${req.name}. Deepen drain channels between ridges to let excess water escape immediately. Withhold irrigation until topsoil dries to touch.`;
    moistureAdviceHa = `Ruwa ya cika a gonar ${req.hausaName} (${moisture}%). Wannan na iya sa saiwa ta rube sakamakon cutar ruwa. Bude magudanar ruwa a tsakanin kunyoyi don ruwa ya gudu. Dakatar da ban ruwa har sai ƙasar ta sha iska.`;
  } else {
    moistureStatus = 'optimal';
    moistureTextEn = `Optimal Moisture (${req.optimalMoistureMin}% - ${req.optimalMoistureMax}%)`;
    moistureTextHa = `Laima Mai Kyau ga ${req.hausaName}`;
    moistureScore = 100;
    moistureAdviceEn = `Soil moisture (${moisture}%) is ideal! Provides excellent root aeration and nutrient dissolution for ${req.name}. Continue your current irrigation interval.`;
    moistureAdviceHa = `Laimar ƙasa (${moisture}%) tana da kyau sosai! Tana ba saiwar ${req.hausaName} damar numfashi da shan sinadarai ba tare da matsi ba. Ci gaba da wannan tsari na ban ruwa.`;
  }

  const overallScore = Math.round((phScore * 0.6) + (moistureScore * 0.4));
  let overallRating: SoilConditionAdvice['overallRating'] = 'good';
  if (overallScore >= 90) overallRating = 'excellent';
  else if (overallScore >= 70) overallRating = 'good';
  else if (overallScore >= 50) overallRating = 'fair';
  else overallRating = 'poor';

  return {
    phStatus,
    phScoreTextEn,
    phScoreTextHa,
    phAdviceEn,
    phAdviceHa,
    moistureStatus,
    moistureTextEn,
    moistureTextHa,
    moistureAdviceEn,
    moistureAdviceHa,
    overallRating,
    overallScore,
  };
};

const STORAGE_KEY = 'smartvillage.soil_records';

const INITIAL_RECORDS: SoilRecord[] = [
  {
    id: 'soil-seed-1',
    plotName: 'Gona ta Arewa (North Field)',
    cropId: 'soybeans',
    cropName: 'Soybeans',
    cropHausaName: 'Waken Soya',
    ph: 6.4,
    moisture: 58,
    soilType: 'sandy_loam',
    notes: 'Applied wood ash 3 weeks ago; excellent root nodulation observed.',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    advice: evaluateSoilConditions('soybeans', 6.4, 58),
  },
  {
    id: 'soil-seed-2',
    plotName: 'Gona kusa da Rijiya (Well Plot)',
    cropId: 'onion',
    cropName: 'Onion',
    cropHausaName: 'Albasa',
    ph: 5.7,
    moisture: 65,
    soilType: 'loamy',
    notes: 'Leaf tips slightly yellow; need to broadcast wood ash before bulb formation.',
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    advice: evaluateSoilConditions('onion', 5.7, 65),
  },
  {
    id: 'soil-seed-3',
    plotName: 'Fadama Plot (River Basin)',
    cropId: 'rice',
    cropName: 'Rice',
    cropHausaName: 'Shinkafa',
    ph: 6.0,
    moisture: 88,
    soilType: 'clay',
    notes: 'Standing water maintained at 4 cm; good vegetative tillering.',
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    advice: evaluateSoilConditions('rice', 6.0, 88),
  },
];

export const soilService = {
  getRecords(): SoilRecord[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RECORDS));
      return INITIAL_RECORDS;
    } catch {
      return INITIAL_RECORDS;
    }
  },

  addRecord(
    plotName: string,
    cropId: string,
    ph: number,
    moisture: number,
    soilType: SoilRecord['soilType'],
    notes?: string
  ): SoilRecord {
    const req =
      CROP_SOIL_REQUIREMENTS.find((c) => c.cropId === cropId) ||
      CROP_SOIL_REQUIREMENTS[0];
    const advice = evaluateSoilConditions(cropId, ph, moisture);

    const newRecord: SoilRecord = {
      id: `soil-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      plotName: plotName.trim() || 'Gonata (My Field)',
      cropId: req.cropId,
      cropName: req.name,
      cropHausaName: req.hausaName,
      ph: Number(ph.toFixed(1)),
      moisture: Math.round(moisture),
      soilType,
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      advice,
    };

    const current = this.getRecords();
    const updated = [newRecord, ...current];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('smartvillage_soil_updated'));
    } catch {}

    return newRecord;
  },

  deleteRecord(id: string): void {
    const current = this.getRecords();
    const updated = current.filter((r) => r.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('smartvillage_soil_updated'));
    } catch {}
  },
};
