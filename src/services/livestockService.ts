// Livestock & Poultry Disease Checker for Nigerian Rural Communities

export interface LivestockAnimal {
  id: string;
  name: string;
  hausa_name: string;
  emoji: string;
  commonSymptoms: string[];
  commonSymptomsHausa: string[];
}

export interface LivestockDisease {
  id: string;
  animalId: string;
  name: string;
  hausa_name: string;
  keySymptoms: string[];
  causes: string;
  causes_hausa: string;
  treatment: string;
  treatment_hausa: string;
  prevention: string;
  prevention_hausa: string;
  isUrgentContagious: boolean;
}

export const LIVESTOCK_ANIMALS: LivestockAnimal[] = [
  {
    id: 'chicken',
    name: 'Chicken',
    hausa_name: 'Kaza',
    emoji: '🐔',
    commonSymptoms: [
      'Greenish or bloody diarrhea',
      'Twisted neck / neurological signs',
      'Swollen head & eyes with discharge',
      'Warty scabs on comb & wattle',
      'Drop in egg production',
      'Gasping & rattling breathing',
      'Sudden death in flock',
    ],
    commonSymptomsHausa: [
      'Gudawa mai launin kore ko jini',
      'Lankwasa wuya ko juyawar kai',
      'Kumburin kai da ido mai ruwa',
      'Kuraje ko ƙurji a zanko da wuya',
      'Ragewar kwayayen kwai',
      'Numfashi mai sautin gurnani',
      'Mutuwar kaji ba gaira ba dalili',
    ],
  },
  {
    id: 'goat',
    name: 'Goat',
    hausa_name: 'Akuya',
    emoji: '🐐',
    commonSymptoms: [
      'High fever & nasal discharge',
      'Sores & ulcers around mouth',
      'Foul watery diarrhea',
      'Swollen hard painful udder',
      'Severe limping & foul hoof smell',
      'Swollen belly & gasping (bloat)',
      'Pale gums & bottle jaw swelling',
    ],
    commonSymptomsHausa: [
      'Zazzabi mai zafi da majina a hanci',
      'Gyambon baki da kuraje',
      'Gudawa mai wari da ruwa-ruwa',
      'Kumburin nono mai tauri da zafi',
      'Dingo da wari a kofato',
      'Kumburin ciki da wahalar numfashi',
      'Kumburin maƙogwaro da rashin jini',
    ],
  },
  {
    id: 'sheep',
    name: 'Sheep',
    hausa_name: 'Tinkiya',
    emoji: '🐑',
    commonSymptoms: [
      'Sores around mouth & nostrils',
      'Profuse diarrhea & dehydration',
      'Limping & separation of hoof wall',
      'Swollen head & blueish tongue',
      'Submandibular edema (bottle jaw)',
      'Weight loss despite eating',
    ],
    commonSymptomsHausa: [
      'Gyambon baki da hanci',
      'Gudawa mai tsanani da bushewar jiki',
      'Dingo da rabuwar kofato',
      'Kumburin kai da harshe mai launin shudi',
      'Kumburin ƙarƙashin haba',
      'Ramewa duk da cin abinci',
    ],
  },
  {
    id: 'cattle',
    name: 'Cattle',
    hausa_name: 'Saniya',
    emoji: '🐄',
    commonSymptoms: [
      'Blisters on tongue, gums & hooves with drooling',
      'Sudden high fever & blood from body openings',
      'Severe anemia, lethargy & yellow eyes',
      'Hot painful crackling swelling on thighs/shoulders',
      'Hard swollen quarters with clotted milk',
      'Severe progressive weight loss & rough coat',
    ],
    commonSymptomsHausa: [
      'Kumburin baki da kofato tare da yoyon yau',
      'Zazzabi mai tsanani da fitar jini a jiki',
      'Rashin jini da idanu masu launin rawaya',
      'Kumburi mai zafi dake ƙara a cinyoyi',
      'Taurin nono da madara mai dunƙulewa',
      'Ramewa mai tsanani da gashi mai ƙaiƙayi',
    ],
  },
  {
    id: 'donkey',
    name: 'Donkey',
    hausa_name: 'Jaki',
    emoji: '🫏',
    commonSymptoms: [
      'Severe rolling, pawing ground & belly pain (colic)',
      'Rough dull coat, potbelly & weak stamina',
      'Ulcerated cord-like lumps along legs & neck',
      'Crusty pus & deep cracks between hoof bulbs',
      'Fever, dark red urine & profound weakness',
    ],
    commonSymptomsHausa: [
      'Birgima da buga ƙasa saboda ciwon ciki (colic)',
      'Ramewa, babban ciki da rashin ƙarfi',
      'Gyambon layi da ƙuraje a ƙafafu da wuya',
      'Ruɓar fatar tsakanin kofato da wari',
      'Zazzabi, fitsarin jini da rashin ƙarfi',
    ],
  },
  {
    id: 'camel',
    name: 'Camel',
    hausa_name: 'Rakumi',
    emoji: '🐪',
    commonSymptoms: [
      'Intermittent fever, wasting & anemia (Surra)',
      'Thick crusty scabs on skin during rains (Kirchi)',
      'Chronic watery diarrhea & weight loss',
      'Edema of belly and sheath',
      'Abortion in pregnant female camels',
    ],
    commonSymptomsHausa: [
      'Zazzabi mai dawowa, ramewa da rashin jini (Surra)',
      'Kwakwancewar fatar jiki a damina (Kirchi)',
      'Gudawar ciki mai dorewa da ramewa',
      'Kumburin ƙarƙashin ciki',
      'Bari ko zubar da ciki ga mata',
    ],
  },
  {
    id: 'pig',
    name: 'Pig',
    hausa_name: 'Alade',
    emoji: '🐖',
    commonSymptoms: [
      'High fever & blue-purple blotches on ears & abdomen',
      'Vomiting, bloody diarrhea & sudden flock mortality',
      'Blisters on snout, lips & coronary band',
      'Intense scratching, thick scabs & mange',
      'Late-term abortion in sows',
    ],
    commonSymptomsHausa: [
      'Zazzabi mai zafi da canjin launin kunne zuwa shudi',
      'Amai, gudawar jini da mutuwar aladu da yawa',
      'Kumburin hanci da kofato',
      'Ƙaiƙayi mai tsanani da ɓawon fata (Kazuwa)',
      'Zubar da ciki ga alade mai ciki',
    ],
  },
  {
    id: 'duck',
    name: 'Duck',
    hausa_name: 'Agwagwa',
    emoji: '🦆',
    commonSymptoms: [
      'Limp neck resting on ground (Limberneck/Botulism)',
      'Tremors, wing drooping & greenish diarrhea',
      'Ducklings suddenly dying lying on side with head thrown back',
      'Severe eye crusts & swollen sinuses',
    ],
    commonSymptomsHausa: [
      'Sanyin wuya da kasa ɗaga kai (Limberneck)',
      'Rawa a jiki da gudawa mai koren launi',
      'Matasan agwagwa na mutuwa da kai a juye',
      'Rufe kwayar ido da kura ko ciwo',
    ],
  },
  {
    id: 'turkey',
    name: 'Turkey',
    hausa_name: 'Talo-talo',
    emoji: '🦃',
    commonSymptoms: [
      'Sulfur-yellow diarrhea & darkened head (Blackhead)',
      'Pasty vents, drowsiness & ruffled feathers',
      'Warty nodules on snood, head & eyelids',
      'Emaciation despite voracious eating (worms)',
    ],
    commonSymptomsHausa: [
      'Gudawa mai launin rawaya da duhun kai (Blackhead)',
      'Dattin bayan kaza, bacci-bacci da tashi gashi',
      'Kuraje masu tauri a fuska da kewayen ido',
      'Ramewa mai tsanani duk da yawan cin abinci',
    ],
  },
];

export const LIVESTOCK_DISEASES: LivestockDisease[] = [
  // CHICKEN
  {
    id: 'newcastle_chicken',
    animalId: 'chicken',
    name: 'Newcastle Disease',
    hausa_name: 'Ciwon Samore / Bakon Kaza',
    keySymptoms: ['Twisted neck / neurological signs', 'Greenish or bloody diarrhea', 'Sudden death in flock'],
    causes: 'Paramyxovirus type 1 spread through air, water, and droppings.',
    causes_hausa: 'Kwayar cutar virus mai saurin yaduwa ta iska, ruwa da kashi.',
    treatment: 'No antiviral cure. Provide multivitamins and broad-spectrum antibiotics to curb secondary infections.',
    treatment_hausa: 'Babu maganin virus. A ba su sinadarin bitamin da maganin rigakafin bakteriya a ruwan sha.',
    prevention: 'Vaccinate all chicks with Newcastle LaSota / thermostable I-2 vaccine every 3 months. Isolate new birds.',
    prevention_hausa: 'Yi allurar rigakafin LaSota ko I-2 kowanne wata 3. Ware sababbin kaji na kwanaki 14.',
    isUrgentContagious: true,
  },
  {
    id: 'coccidiosis_chicken',
    animalId: 'chicken',
    name: 'Coccidiosis',
    hausa_name: 'Gudawar Jini a Kaji',
    keySymptoms: ['Greenish or bloody diarrhea', 'Drop in egg production'],
    causes: 'Eimeria protozoa multiplying in wet litter and dirty drinkers.',
    causes_hausa: 'Kwayoyin cutar protozoa a cikin jika da dattin ƙasan ɗakin kaji.',
    treatment: 'Administer Amprolium, Toltrazuril, or Sulphadimidine in clean drinking water for 3-5 consecutive days.',
    treatment_hausa: 'A zuba maganin Amprolium ko Sulphadimidine a ruwan sha mai tsabta na kwanaki 3 zuwa 5.',
    prevention: 'Keep wood shavings/litter dry; raise drinkers off ground so droppings cannot fall inside.',
    prevention_hausa: 'Kiyaye ƙasar ɗaki a bushe; ɗaga bokitin ruwa sama don kashi kada ya shiga.',
    isUrgentContagious: false,
  },
  {
    id: 'fowl_pox_chicken',
    animalId: 'chicken',
    name: 'Fowl Pox',
    hausa_name: 'Kambori / Kurajen Zanko',
    keySymptoms: ['Warty scabs on comb & wattle', 'Swollen head & eyes with discharge'],
    causes: 'Avipoxvirus transmitted by mosquitoes and skin abrasions.',
    causes_hausa: 'Kwayar cutar virus da sauro ke yadawa ta hanyar cizon kaji.',
    treatment: 'Gently dab scabs with mild iodine or palm oil; administer antibiotics in water to prevent eye infections.',
    treatment_hausa: 'A shafa man ja ko iodine a kan kurajen a hankali; a ba su maganin ciwon ido a ruwa.',
    prevention: 'Wing-web vaccination at 6-8 weeks of age; control mosquitoes around the poultry house.',
    prevention_hausa: 'Allurar rigakafin kambori a fuka-fuki; kariya daga sauro.',
    isUrgentContagious: false,
  },

  // GOAT
  {
    id: 'ppr_goat',
    animalId: 'goat',
    name: 'Peste des Petits Ruminants (PPR)',
    hausa_name: 'Ciwon Huhu da Gudawar Awaki (PPR)',
    keySymptoms: ['High fever & nasal discharge', 'Sores & ulcers around mouth', 'Foul watery diarrhea'],
    causes: 'Morbillivirus transmitted through direct contact, sneeze droplets, and contaminated feed troughs.',
    causes_hausa: 'Kwayar cutar virus mai matuƙar hadari dake yaduwa ta numfashi da kwano.',
    treatment: 'Isolate immediately! Give supportive antibiotics (oxytetracycline), multivitamin, and oral rehydration salt.',
    treatment_hausa: 'Ware su nan take! A ba su maganin Oxytetracycline da sinadarin ruwan gishiri da sukari (ORS).',
    prevention: 'Annual PPR vaccination of all goats older than 3 months. Quarantine newly purchased market goats for 21 days.',
    prevention_hausa: 'Allurar rigakafin PPR sau ɗaya a shekara. Kada a haɗa sabuwar akuya da tsoffi har sai an tsare ta na kwanaki 21.',
    isUrgentContagious: true,
  },
  {
    id: 'foot_rot_goat',
    animalId: 'goat',
    name: 'Foot Rot',
    hausa_name: 'Rubewar Kofaton Dabbobi',
    keySymptoms: ['Severe limping & foul hoof smell'],
    causes: 'Dichelobacter nodosus bacteria thriving in muddy, waterlogged rainy season pens.',
    causes_hausa: 'Kwayar bakteriya dake zama a laka da ruwan ɗanyen garke a damina.',
    treatment: 'Pare overgrown hoof horn with clean shears; bathe feet in 10% zinc sulfate or copper sulfate solution.',
    treatment_hausa: 'Yanke kofaton da ya ruɓe; tsoma ƙafar a ruwan maganin Zinc Sulfate ko tagulla.',
    prevention: 'Provide dry elevated sleeping platforms; spread dry lime or sand in muddy pen entrances.',
    prevention_hausa: 'Gina dandamali mai bushewa; sanya yashi a ƙofar shiga garken dabbobi.',
    isUrgentContagious: false,
  },
  {
    id: 'bloat_goat',
    animalId: 'goat',
    name: 'Rumen Bloat',
    hausa_name: 'Kumburin Ciki mai Hadari',
    keySymptoms: ['Swollen belly & gasping (bloat)'],
    causes: 'Excessive fermentation gas from sudden gorging on wet young legumes or moldy grains.',
    causes_hausa: 'Tarin iska a ciki sakamakon cin danyen wake ko hatsi mai rubewa.',
    treatment: 'Drench with 100-150 ml vegetable cooking oil or mineral oil. Keep animal standing and walk slowly.',
    treatment_hausa: 'A shayar da ita babban cokali 3-5 na man girki (man gyada ko soya). Kada a bar ta ta kwanta.',
    prevention: 'Feed dry hay before releasing goats onto lush morning pastures wet with dew.',
    prevention_hausa: 'Ba su busasshiyar ciyawa kafin su fita kiwo a kan danyen makiyaya mai raɓa.',
    isUrgentContagious: false,
  },

  // SHEEP
  {
    id: 'parasites_sheep',
    animalId: 'sheep',
    name: 'Gastrointestinal Worms & Liver Fluke',
    hausa_name: 'Tsutsar Ciki da Hantar Tumaki',
    keySymptoms: ['Submandibular edema (bottle jaw)', 'Profuse diarrhea & dehydration', 'Weight loss despite eating'],
    causes: 'Haemonchus contortus (wireworm) and Fasciola gigantica picked up from wet marshy grazing spots.',
    causes_hausa: 'Tsutsa mai shan jini da ake kwashewa a ciyawar fadama.',
    treatment: 'Dose with Albendazole, Levamisole, or Ivermectin injection. Repeat after 21 days.',
    treatment_hausa: 'Ba su maganin tsutsa na ruwa kamar Albendazole ko allurar Ivermectin.',
    prevention: 'Deworm whole flock at start of rainy season and after harvest. Avoid grazing in stagnant flooded areas.',
    prevention_hausa: 'Kore tsutsa a farkon damina da ƙarshen girbi. Kaucewa kiwo a inda ruwa ke kwanciya.',
    isUrgentContagious: false,
  },

  // CATTLE
  {
    id: 'fmd_cattle',
    animalId: 'cattle',
    name: 'Foot and Mouth Disease (FMD)',
    hausa_name: 'Ciwon Bangare da Baki a Shanu',
    keySymptoms: ['Blisters on tongue, gums & hooves with drooling'],
    causes: 'Aphthovirus spreading rapidly via saliva, shared drinking ponds, and cattle routes.',
    causes_hausa: 'Kwayar cutar virus mai saurin kisa da nakasa dake yaduwa a rafi da burtali.',
    treatment: 'Wash mouth lesions with mild salt solution; apply healing spray to feet. Give soft bran gruel and clean water.',
    treatment_hausa: 'Wanke baki da ruwan gishiri mai sauƙi; shafa magani a ƙafa. Ba su kunun dussa mai taushi.',
    prevention: 'Report to local veterinary officer; restrict herd movement; disinfect water troughs.',
    prevention_hausa: 'Sanar da likitan dabbobi; hana shanu yawo a garken wasu.',
    isUrgentContagious: true,
  },
  {
    id: 'trypanosomiasis_cattle',
    animalId: 'cattle',
    name: 'Bovine Trypanosomiasis (Sammore)',
    hausa_name: 'Ciwon Sammore a Shanu',
    keySymptoms: ['Severe anemia, lethargy & yellow eyes', 'Severe progressive weight loss & rough coat'],
    causes: 'Trypanosoma protozoa transmitted by bites of tsetse flies (Glossina) along riverbanks.',
    causes_hausa: 'Kwayar cuta dake shiga ta cizon ƙudan kwaro (kudan kogi/tsetse fly).',
    treatment: 'Administer Diminazene aceturate (Berenil) or Isometamidium chloride exactly according to bodyweight.',
    treatment_hausa: 'Yi allurar Berenil (Diminazene) ko Isometamidium gwargwadon girman dabbar.',
    prevention: 'Deploy tsetse fly traps along river grazing corridors; apply pour-on synthetic pyrethroids.',
    prevention_hausa: 'Sanya tarkon ƙuda a kusa da rafuka da fesa maganin korar ƙwari a jikin shanu.',
    isUrgentContagious: false,
  },

  // DONKEY
  {
    id: 'parasites_donkey',
    animalId: 'donkey',
    name: 'Strongyle & Internal Helminthosis',
    hausa_name: 'Tsutsar Ciki da Taɓar Jakuna',
    keySymptoms: ['Rough dull coat, potbelly & weak stamina', 'Birgima da buga ƙasa saboda ciwon ciki (colic)'],
    causes: 'Strongyle and Trichostrongylus worms endemic in Northeastern Nigeria working donkeys.',
    causes_hausa: 'Tsutsotsin ciki dake addabar jakunan aiki a Arewacin Najeriya.',
    treatment: 'Administer Fenbendazole or Ivermectin paste calibrated for equines; provide mineral lick and clean water.',
    treatment_hausa: 'A ba shi maganin tsutsar jaki na Ivermectin ko Fenbendazole; sanya duwatsun gishirin lashewa.',
    prevention: 'Rotate tethering pastures; avoid feeding moldy dry crop stalks off dirty soil.',
    prevention_hausa: 'Sauya wurin ɗaure jaki; kaucewa ba shi ciyawa mai datti ko rubewa.',
    isUrgentContagious: false,
  },

  // CAMEL
  {
    id: 'surra_camel',
    animalId: 'camel',
    name: 'Surra (Trypanosoma evansi)',
    hausa_name: 'Ciwon Surra a Rakumi',
    keySymptoms: ['Intermittent fever, wasting & anemia (Surra)', 'Abortion in pregnant female camels'],
    causes: 'Trypanosoma evansi transmitted mechanically by Tabanid biting horseflies.',
    causes_hausa: 'Kwayar cutar protozoa da manyan ƙudaje masu cizo (Tabanids) ke yadawa.',
    treatment: 'Inject Melarsomine or Quinapyramine sulfate under veterinary supervision.',
    treatment_hausa: 'Allurar Quinapyramine ko Melarsomine ƙarƙashin jagorancin likitan dabbobi.',
    prevention: 'Smoke fires around camel resting yards at dusk to repel biting flies; monitor body condition.',
    prevention_hausa: 'Hura hayaki a garken rakuma da yamma don korar kudaden cizo.',
    isUrgentContagious: false,
  },

  // PIG
  {
    id: 'asf_pig',
    animalId: 'pig',
    name: 'African Swine Fever (ASF)',
    hausa_name: 'Zazzabin Alade na Afirka (ASF)',
    keySymptoms: [
      'High fever & blue-purple blotches on ears & abdomen',
      'Vomiting, bloody diarrhea & sudden flock mortality',
    ],
    causes: 'Asfarviridae DNA virus spread via swill feeding, tick vectors, and farm visitors.',
    causes_hausa: 'Kwayar cutar virus mai tsananin kisa dake yaduwa ta ragowar abinci da kaska.',
    treatment: 'No treatment exists. Mortality approaches 100%. Notify authorities immediately.',
    treatment_hausa: 'Babu magani. Yana kashe kusan duka. Sanar da jami\'an gwamnati nan take.',
    prevention: 'Strict biosecurity: NEVER feed untreated restaurant swill or food scraps; disinfect boots before entering pen.',
    prevention_hausa: 'Kada a ba su ragowar abincin otal ko gidan cin abinci; a wanke takalmi kafin shiga garke.',
    isUrgentContagious: true,
  },

  // DUCK
  {
    id: 'botulism_duck',
    animalId: 'duck',
    name: 'Botulism (Limberneck)',
    hausa_name: 'Ciwon Sanko da Sanyin Wuya (Limberneck)',
    keySymptoms: ['Limp neck resting on ground (Limberneck/Botulism)'],
    causes: 'Clostridium botulinum neurotoxin ingested from rotting vegetation or decaying carcasses in stagnant ponds.',
    causes_hausa: 'Gubar bakteriya dake shiga ta rubabben gawa ko ciyawar tafkin ruwa.',
    treatment: 'Flock-wide flush with Epsom salts in clean water (1 tablespoon per liter); provide shade and fresh running water.',
    treatment_hausa: 'A ba su ruwa mai gishirin Epsom; a ajiye su a inuwa mai sanyi da ruwa mai gudu.',
    prevention: 'Remove dead birds, dead frogs, and decaying compost from duck foraging ponds immediately.',
    prevention_hausa: 'Cire gawar dabbobi da rubabbun abubuwa daga kududdufin agwagwa.',
    isUrgentContagious: false,
  },

  // TURKEY
  {
    id: 'blackhead_turkey',
    animalId: 'turkey',
    name: 'Histomoniasis (Blackhead Disease)',
    hausa_name: 'Ciwon Duhu a Fuska da Ciki (Blackhead)',
    keySymptoms: ['Sulfur-yellow diarrhea & darkened head (Blackhead)', 'Pasty vents, drowsiness & ruffled feathers'],
    causes: 'Histomonas meleagridis protozoan carried by cecal worm (Heterakis gallinarum) common in chickens.',
    causes_hausa: 'Kwayar protozoa dake zama a cikin tsutsar kaji da ke shafar talo-talo.',
    treatment: 'Administer Dimetridazole or supportive herbal oregano and liver tonics in clean water.',
    treatment_hausa: 'A ba su maganin Dimetridazole ko ruwan maganin ganyen oregano da bitamin.',
    prevention: 'CRITICAL: NEVER rear turkeys together with chickens or on land where chickens ranged in the last 3 years.',
    prevention_hausa: 'KADA a taba ajiye talo-talo tare da kaji a wuri guda, domin kaji suna ɗauke da cutar ba tare da sun mutu ba.',
    isUrgentContagious: true,
  },
];

export interface LivestockCheckResult {
  animal: LivestockAnimal;
  likelyDisease: LivestockDisease;
  matchedCount: number;
  confidence: number;
}

export const livestockService = {
  diagnose(animalId: string, selectedSymptoms: string[]): LivestockCheckResult | null {
    const animal = LIVESTOCK_ANIMALS.find((a) => a.id === animalId);
    if (!animal) return null;

    const diseases = LIVESTOCK_DISEASES.filter((d) => d.animalId === animalId);
    if (diseases.length === 0) return null;

    let bestMatch: LivestockDisease = diseases[0];
    let maxMatches = -1;

    for (const d of diseases) {
      let matches = 0;
      for (const s of selectedSymptoms) {
        if (d.keySymptoms.some((ks) => ks.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ks.toLowerCase()))) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = d;
      }
    }

    const confidence = selectedSymptoms.length === 0 ? 0.35 : Math.min(0.92, 0.45 + (maxMatches / Math.max(1, selectedSymptoms.length)) * 0.45);

    return {
      animal,
      likelyDisease: bestMatch,
      matchedCount: maxMatches,
      confidence,
    };
  },
};
