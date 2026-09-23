// Smart Planting Calendar Service for Northern & Middle Belt Nigeria

export interface CropCalendarSchedule {
  id: string;
  name: string;
  hausa_name: string;
  seasonType: 'rainfed' | 'irrigated_dry' | 'both';
  plantingStartMonth: number; // 1-12
  plantingStartDay: number;
  plantingEndMonth: number;
  plantingEndDay: number;
  harvestStartMonth: number;
  harvestEndMonth: number;
  carePeriodWeeks: number; // Baby plant care window
  idealRainfall: string;
  idealTemp: string;
  advice: string;
  advice_hausa: string;
  babyPlantCare: string;
  babyPlantCare_hausa: string;
}

export const CROP_CALENDAR: CropCalendarSchedule[] = [
  {
    id: 'maize',
    name: 'Maize',
    hausa_name: 'Masara',
    seasonType: 'rainfed',
    plantingStartMonth: 5, // May 15
    plantingStartDay: 15,
    plantingEndMonth: 6, // June 10
    plantingEndDay: 10,
    harvestStartMonth: 9,
    harvestEndMonth: 10,
    carePeriodWeeks: 3,
    idealRainfall: '600 - 900 mm',
    idealTemp: '21°C - 30°C',
    advice: 'Wait for at least 2 consecutive soaking rains (>25mm total) before planting to avoid seed scorching in dry soil.',
    advice_hausa: 'A jira a samu ruwan sama mai ƙarfi sau 2 a jere kafin a shuka masara don kada ƙasa mai zafi ta ƙona irin.',
    babyPlantCare: 'Weed at 2 and 5 weeks after sprouting. Apply basal NPK 15:15:15 at planting, and topdress with Urea at 4 weeks.',
    babyPlantCare_hausa: 'Yi ciyawa a mako na 2 da na 5. Sanya takin NPK yayin shuka, sannan a sanya takin Urea a mako na 4.',
  },
  {
    id: 'sorghum',
    name: 'Sorghum',
    hausa_name: 'Dawa',
    seasonType: 'rainfed',
    plantingStartMonth: 5, // May 20
    plantingStartDay: 20,
    plantingEndMonth: 6, // June 15
    plantingEndDay: 15,
    harvestStartMonth: 10,
    harvestEndMonth: 11,
    carePeriodWeeks: 4,
    idealRainfall: '450 - 750 mm',
    idealTemp: '25°C - 34°C',
    advice: 'Sorghum can withstand brief early dry spells better than maize, but needs moist seedbeds for uniform germination.',
    advice_hausa: 'Dawa tana jure ɗan fari fiye da masara, amma tana buƙatar ƙasa mai laima don dukkan irin ya fito tare.',
    babyPlantCare: 'Thin seedlings to 2-3 sturdy stalks per stand at 3 weeks. Watch for stem borer and shoot fly attacks.',
    babyPlantCare_hausa: 'Rage cunkoson shuka zuwa karan 2-3 a kowanne rami bayan mako 3. Kula da tsutsar karan dawa.',
  },
  {
    id: 'millet',
    name: 'Pearl Millet',
    hausa_name: 'Gero',
    seasonType: 'rainfed',
    plantingStartMonth: 6, // June 1
    plantingStartDay: 1,
    plantingEndMonth: 6, // June 20
    plantingEndDay: 20,
    harvestStartMonth: 10,
    harvestEndMonth: 11,
    carePeriodWeeks: 3,
    idealRainfall: '300 - 550 mm',
    idealTemp: '28°C - 36°C',
    advice: 'Very fast maturing crop for drier northern belts (Katsina, Sokoto, Yobe, Borno). Plant shallowly (2-3 cm).',
    advice_hausa: 'Amfanin gona mai saurin nuna a yankunan da ruwa bai cika yawa ba. Kada a binne irin da zurfi sosai.',
    babyPlantCare: 'Keep fields completely clear of striga (witchweed) and grass weeds during the first 20 days.',
    babyPlantCare_hausa: 'Tsaftace gona daga ciyawar wuta (kuduji) da sauran ciyayi a cikin kwanaki 20 na farko.',
  },
  {
    id: 'cowpea',
    name: 'Cowpeas (Beans)',
    hausa_name: 'Wake',
    seasonType: 'rainfed',
    plantingStartMonth: 6, // June 1
    plantingStartDay: 1,
    plantingEndMonth: 7, // July 1
    plantingEndDay: 1,
    harvestStartMonth: 10,
    harvestEndMonth: 11,
    carePeriodWeeks: 3,
    idealRainfall: '400 - 650 mm',
    idealTemp: '24°C - 32°C',
    advice: 'Can be planted as sole crop in late June or intercropped with sorghum. Avoid excessive nitrogen fertilizer.',
    advice_hausa: 'Za a iya shuka shi kaɗai a ƙarshen Yuni ko a haɗa da dawa. Kada a sanya takin zamani mai nitrogen da yawa.',
    babyPlantCare: 'Protect against maruca pod borer and aphids starting at flowering with organic neem or registered bio-pesticide.',
    babyPlantCare_hausa: 'Kare furen wake daga kwarin maruca da kudan wake ta amfani da ruwan dogon yaro yayin fitar fure.',
  },
  {
    id: 'groundnut',
    name: 'Groundnuts',
    hausa_name: 'Gyada',
    seasonType: 'rainfed',
    plantingStartMonth: 5, // May 25
    plantingStartDay: 25,
    plantingEndMonth: 6, // June 20
    plantingEndDay: 20,
    harvestStartMonth: 10,
    harvestEndMonth: 11,
    carePeriodWeeks: 3,
    idealRainfall: '500 - 800 mm',
    idealTemp: '25°C - 30°C',
    advice: 'Plant in well-drained sandy-loam ridges. Treat seeds with fungicide before planting to prevent seedling rot.',
    advice_hausa: 'Shuka a kan kunya mai yashi da laushi. Wanke irin da maganin kwari da fungi kafin shukawa.',
    babyPlantCare: 'Earthing up (hilling ridges) at 4-5 weeks encourages pegging. Avoid weeding once pegs enter soil.',
    babyPlantCare_hausa: "Haɗa ƙasa a jikin kunya a mako 4-5 domin sauƙaƙa shigar 'ya'yan gyada cikin ƙasa.",
  },
  {
    id: 'onion',
    name: 'Onion (Irrigated)',
    hausa_name: 'Albasa (Rani)',
    seasonType: 'irrigated_dry',
    plantingStartMonth: 11, // Nov 1
    plantingStartDay: 1,
    plantingEndMonth: 12, // Dec 20
    plantingEndDay: 20,
    harvestStartMonth: 3,
    harvestEndMonth: 4,
    carePeriodWeeks: 4,
    idealRainfall: '0 - 50 mm (Furrow irrigation every 4-6 days)',
    idealTemp: '15°C - 28°C',
    advice: 'Raise seedlings in nursery in September/October. Transplant pencil-thick seedlings in November/December cool season.',
    advice_hausa: 'Fara reno a watan Satumba ko Oktoba. Dashe shukar da ta yi kaurin fensir a watan Nuwamba ko Disamba a lokacin sanyi.',
    babyPlantCare: 'Maintain steady shallow furrow irrigation; avoid letting soil dry out completely. Side-dress with NPK at 3 weeks.',
    babyPlantCare_hausa: 'Kula da shayarwa akai-akai a kowanne kwanaki 4-6; kada a bar ƙasa ta bushe ƙeƙas.',
  },
  {
    id: 'tomato',
    name: 'Tomato (Fadama / Dry Season)',
    hausa_name: 'Tumatir',
    seasonType: 'both',
    plantingStartMonth: 11, // Nov 15
    plantingStartDay: 15,
    plantingEndMonth: 2, // Feb 28
    plantingEndDay: 28,
    harvestStartMonth: 3,
    harvestEndMonth: 5,
    carePeriodWeeks: 3,
    idealRainfall: 'Furrow / Drip irrigation',
    idealTemp: '18°C - 29°C',
    advice: 'Dry season planting reduces severe early and late blight pressure typical of the rainy season.',
    advice_hausa: 'Nomawa a lokacin rani yana rage cututtukan da ruwan sama ke jawowa sosai.',
    babyPlantCare: 'Stake young plants with bamboo or reeds at 3 weeks to keep foliage off wet soil and mulch heavily with dry grass.',
    babyPlantCare_hausa: 'Ɗaura jikin sandar kara a mako na 3 don ganye ya nisanci ƙasa mai laima, kuma a shimfiɗa ciyawa a ƙasa.',
  },
  {
    id: 'rice',
    name: 'Rice (Lowland / Upland)',
    hausa_name: 'Shinkafa',
    seasonType: 'rainfed',
    plantingStartMonth: 6, // June 15
    plantingStartDay: 15,
    plantingEndMonth: 7, // July 25
    plantingEndDay: 25,
    harvestStartMonth: 10,
    harvestEndMonth: 11,
    carePeriodWeeks: 4,
    idealRainfall: '900 - 1400 mm',
    idealTemp: '24°C - 32°C',
    advice: 'Direct seed in puddled lowlands or transplant 21-day nursery seedlings when steady flooding is established.',
    advice_hausa: 'Dashe shinkafar bayan kwanaki 21 daga reno yayin da ruwa ya fara tsayawa a fadama.',
    babyPlantCare: 'Maintain 3-5 cm water layer in lowland paddies to suppress weeds naturally. Apply Urea in two splits.',
    babyPlantCare_hausa: 'Kula da tsayin ruwa na santimita 3-5 a fadama don hana ciyawa fita. Zuba takin Urea sau biyu.',
  },
  {
    id: 'wheat',
    name: 'Wheat (Irrigated Winter)',
    hausa_name: 'Alkama',
    seasonType: 'irrigated_dry',
    plantingStartMonth: 11, // Nov 10
    plantingStartDay: 10,
    plantingEndMonth: 12, // Dec 15
    plantingEndDay: 15,
    harvestStartMonth: 3,
    harvestEndMonth: 4,
    carePeriodWeeks: 3,
    idealRainfall: 'Irrigated (Harmattan cool cycle)',
    idealTemp: '12°C - 26°C',
    advice: 'Must be planted before December 15th so heading coincides with cool January Harmattan nights for full grain filling.',
    advice_hausa: 'Dole ne a shuka kafin 15 ga Disamba domin furen alkama ya samu sanyin hunturu a watan Janairu.',
    babyPlantCare: 'Irrigate immediately after broadcasting seed, then irrigate every 7-10 days depending on soil type.',
    babyPlantCare_hausa: 'Shayar da gona nan take bayan shuka, sannan a ci gaba da shayarwa kowanne kwanaki 7-10.',
  },
  {
    id: 'soybeans',
    name: 'Soybeans',
    hausa_name: 'Waken Soya',
    seasonType: 'rainfed',
    plantingStartMonth: 6, // June 15
    plantingStartDay: 15,
    plantingEndMonth: 7, // July 15
    plantingEndDay: 15,
    harvestStartMonth: 10,
    harvestEndMonth: 11,
    carePeriodWeeks: 3,
    idealRainfall: '500 - 800 mm',
    idealTemp: '20°C - 30°C',
    advice: 'Plant when rains are well established in late June to early July. Ensure shallow planting (2-3 cm deep) for rapid emergence.',
    advice_hausa: 'A shuka a ƙarshen watan Yuni zuwa tsakiyar Yuli idan damina ta kafu sosai. Kada a binne irin da zurfi sosai don ya fito da sauri.',
    babyPlantCare: 'Weed within the first 3-4 weeks before canopy closes. Inoculate seed with Rhizobium or apply basal SSP fertilizer.',
    babyPlantCare_hausa: 'Yi ciyawa a makonni 3-4 na farko kafin ganye ya rufe gona. Sanya takin sinadarin phosphorus (SSP) yayin shuka.',
  },
];

export interface PlantingRecommendation {
  crop: CropCalendarSchedule;
  status: 'optimal' | 'upcoming' | 'past' | 'care_window';
  title: string;
  title_hausa: string;
  reason: string;
  reason_hausa: string;
}

export const plantingCalendarService = {
  getCurrentSeason(month: number): {
    season: 'rainy' | 'dry' | 'harmattan';
    name: string;
    name_hausa: string;
    description: string;
    description_hausa: string;
    harmattanWarning: boolean;
  } {
    // 1-indexed month
    if (month >= 5 && month <= 9) {
      return {
        season: 'rainy',
        name: 'Rainy Season (Damina)',
        name_hausa: 'Lokacin Damina',
        description: 'Primary planting and vegetative growth period across Nigeria.',
        description_hausa: 'Babban lokacin shuka da noman rani a Arewacin Najeriya.',
        harmattanWarning: false,
      };
    } else if (month === 12 || month === 1 || month === 2) {
      return {
        season: 'harmattan',
        name: 'Harmattan Season (Kakika / Hunturu)',
        name_hausa: 'Lokacin Hunturu da Kura (Harmattan)',
        description: 'Dry, dusty north-easterly winds and cold nights. Ideal for irrigated onion and wheat.',
        description_hausa: 'Lokacin sanyi, busasshen iska da kura. Lokaci mai kyau ga noman rani na albasa da alkama.',
        harmattanWarning: true,
      };
    } else {
      return {
        season: 'dry',
        name: 'Dry Season / Early Heat (Rani / Bazara)',
        name_hausa: 'Lokacin Rani da Bazara',
        description: 'Hot, dry conditions. Storage, land preparation, and fadama irrigation.',
        description_hausa: 'Zafi da bushewar ƙasa. Lokacin gyaran gona da ajiye hatsi.',
        harmattanWarning: false,
      };
    }
  },

  getRecommendationsForDate(date: Date = new Date()): PlantingRecommendation[] {
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();

    return CROP_CALENDAR.map((crop) => {
      const isStartMonth = month === crop.plantingStartMonth;
      const isEndMonth = month === crop.plantingEndMonth;
      const isWithinMonths =
        (crop.plantingStartMonth <= crop.plantingEndMonth &&
          month >= crop.plantingStartMonth &&
          month <= crop.plantingEndMonth) ||
        (crop.plantingStartMonth > crop.plantingEndMonth &&
          (month >= crop.plantingStartMonth || month <= crop.plantingEndMonth));

      let isOptimal = false;
      if (isStartMonth && isEndMonth) {
        isOptimal = day >= crop.plantingStartDay && day <= crop.plantingEndDay;
      } else if (isStartMonth) {
        isOptimal = day >= crop.plantingStartDay;
      } else if (isEndMonth) {
        isOptimal = day <= crop.plantingEndDay;
      } else if (isWithinMonths) {
        isOptimal = true;
      }

      if (isOptimal) {
        return {
          crop,
          status: 'optimal' as const,
          title: `This week is a prime time to plant ${crop.name}`,
          title_hausa: `Wannan makon lokaci ne mai kyau sosai na shuka ${crop.hausa_name}`,
          reason: `Current calendar window matches peak planting time. ${crop.advice}`,
          reason_hausa: `Lokacin ya yi daidai da kwanakin shuka. ${crop.advice_hausa}`,
        };
      }

      // Check upcoming (within next 30 days)
      const daysUntilStart = (crop.plantingStartMonth - month) * 30 + (crop.plantingStartDay - day);
      if (daysUntilStart > 0 && daysUntilStart <= 35) {
        return {
          crop,
          status: 'upcoming' as const,
          title: `Prepare fields for ${crop.name} soon`,
          title_hausa: `Shirya gonarka don shuka ${crop.hausa_name} nan bada jimawa ba`,
          reason: `Planting window opens in approximately ${Math.round(daysUntilStart)} days. Secure certified seeds now.`,
          reason_hausa: `Za a fara shuka a cikin kimanin kwanaki ${Math.round(daysUntilStart)}. Samu ingantaccen iri yanzu.`,
        };
      }

      // Check baby care window (1-4 weeks after planting)
      return {
        crop,
        status: 'care_window' as const,
        title: `${crop.name} Farm Advisory`,
        title_hausa: `Shawarar Noman ${crop.hausa_name}`,
        reason: crop.babyPlantCare,
        reason_hausa: crop.babyPlantCare_hausa,
      };
    });
  },
};
