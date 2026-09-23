export interface CropDiseaseReference {
  id: string;
  name: string;
  hausa_name: string;
  image: string; // SVG data URI or image URL
  affected_parts: string[];
  causes: string;
  causes_hausa: string;
  symptoms: string;
  symptoms_hausa: string;
  treatment: string;
  treatment_hausa: string;
  prevention: string;
  prevention_hausa: string;
}

export interface CropReference {
  id: string;
  crop: string;
  name?: string;
  hausa_name: string;
  healthy_image: string;
  description: string;
  description_hausa: string;
  diseases: CropDiseaseReference[];
}

export type CropCategoryReference = CropReference;

// Generate stylized SVG images for offline visual reference
function makeLeafSvg(color: string, spotColor?: string, spots = false, extra = ''): string {
  const spotsSvg = spots
    ? `<circle cx="85" cy="80" r="14" fill="${spotColor || '#b71c1c'}" opacity="0.85"/>
       <circle cx="130" cy="120" r="18" fill="${spotColor || '#b71c1c'}" opacity="0.85"/>
       <circle cx="95" cy="150" r="10" fill="${spotColor || '#b71c1c'}" opacity="0.85"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#f0fdf4" rx="16"/>
    <path d="M100 20 C160 55 170 145 100 185 C30 145 40 55 100 20 Z" fill="${color}"/>
    <path d="M100 20 Q100 100 100 185" stroke="#a7f3d0" stroke-width="2.5" fill="none"/>
    <path d="M100 70 Q130 60 145 50" stroke="#a7f3d0" stroke-width="2" fill="none"/>
    <path d="M100 100 Q65 90 50 80" stroke="#a7f3d0" stroke-width="2" fill="none"/>
    <path d="M100 130 Q135 120 150 110" stroke="#a7f3d0" stroke-width="2" fill="none"/>
    ${spotsSvg}
    ${extra}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const CROP_REFERENCE_DATA: CropReference[] = [
  {
    id: 'onion',
    crop: 'Onion',
    hausa_name: 'Albasa',
    healthy_image: makeLeafSvg('#2e7d32', undefined, false, '<circle cx="100" cy="170" r="22" fill="#8e24aa" opacity="0.9"/>'),
    description: 'Vital cash crop grown in dry season under irrigation in Kano, Sokoto, and Kebbi.',
    description_hausa: 'Muhimmin amfanin gona da ake nomawa a lokacin rani ta hanyar ban ruwa a Kano, Sokoto, da Kebbi.',
    diseases: [
      {
        id: 'onion_alternaria',
        name: 'Purple Blotch (Alternaria)',
        hausa_name: 'Duhun Ganye mai Ruwan Hoda',
        image: makeLeafSvg('#43a047', '#4a148c', true),
        affected_parts: ['Leaves', 'Seed stalks'],
        causes: 'Fungus (Alternaria porri) favored by warm, humid rainy or dew conditions.',
        causes_hausa: 'Naman gwari (Alternaria porri) mai yaduwa a lokacin dumi da laima ko raɓa mai yawa.',
        symptoms: 'Small water-soaked lesions that turn purple to dark brown with yellow rings around borders.',
        symptoms_hausa: 'Ƙananan raunuka masu ruwan hoda da duhu tare da kewayen launin rawaya.',
        treatment: 'Apply recommended copper fungicide or Mancozeb. Spray neem oil solution every 7 days.',
        treatment_hausa: 'Fesa maganin naman gwari mai tagulla ko Mancozeb. Ko fesa ruwan maganin dogon-yaro kowanne kwanaki 7.',
        prevention: 'Wide spacing for ventilation, 3-year crop rotation without garlic or shallots.',
        prevention_hausa: 'Bada fili tsakanin shuka don iska, canza shuka na shekaru 3 ba tare da tafarnuwa ba.',
      },
      {
        id: 'onion_fusarium',
        name: 'Fusarium Basal Rot',
        hausa_name: 'Rubewar Tushen Albasa',
        image: makeLeafSvg('#7cb342', '#b71c1c', true, '<circle cx="100" cy="170" r="22" fill="#b71c1c"/>'),
        affected_parts: ['Roots', 'Bulb base', 'Leaves'],
        causes: 'Soil-borne fungus (Fusarium oxysporum) surviving in soil for many years.',
        causes_hausa: 'Kwayar cutar naman gwari a cikin ƙasa (Fusarium oxysporum).',
        symptoms: 'Yellowing and curling of leaf tips, roots rot and turn pinkish brown; bulb decays with white mold.',
        symptoms_hausa: 'Ganyen yana yin rawaya yana lankwashewa, saiwar tana rube tana canza launi zuwa ja/kasa.',
        treatment: 'No chemical cure once bulb rots. Rogue and burn infected bulbs; solarize nursery beds.',
        treatment_hausa: 'Babu maganin feshin da ke warkar da rubewa. Cire wadanda suka kamu a ƙone su.',
        prevention: 'Use certified clean seedlings, rotate with maize or sorghum, avoid planting in flooded soil.',
        prevention_hausa: 'Yi amfani da ingantaccen iri, canza shuka da masara ko dawa, kaucewa ruwa mai tsayawa.',
      },
      {
        id: 'onion_caterpillar',
        name: 'Armyworm & Leaf Caterpillars',
        hausa_name: 'Tsutsar Cin Ganye',
        image: makeLeafSvg('#558b2f', '#ff6f00', true),
        affected_parts: ['Hollow leaves', 'Shoots'],
        causes: 'Larvae of Spodoptera moths feeding inside hollow leaves.',
        causes_hausa: 'Tsutsa mai cin ciki da wajen ganyen albasa.',
        symptoms: 'Holes in hollow onion leaves, chewed leaf tips, window-paning, dark frass inside leaf tubes.',
        symptoms_hausa: 'Huda-huda a jikin ganye, cin bakin ganye, da kashin tsutsa a cikin ganye.',
        treatment: 'Hand-pick caterpillars in morning; spray Bacillus thuringiensis (Bt) or neem seed extract.',
        treatment_hausa: 'Tsinto tsutsotsi da safe; fesa ruwan ƙwayar dogon-yaro ko maganin kwari mai inganci.',
        prevention: 'Pheromone traps, light traps at night, destroy crop residue after harvest.',
        prevention_hausa: 'Tarkon kwari da daddare, tsaftace gona bayan girbi.',
      },
      {
        id: 'onion_virosis',
        name: 'Onion Yellow Dwarf Virus',
        hausa_name: 'Cutar Rawaya da Naƙasa',
        image: makeLeafSvg('#cddc39', '#fbc02d', true),
        affected_parts: ['Entire foliage', 'Flower stems'],
        causes: 'Virus transmitted by aphids from infected volunteer onions or weeds.',
        causes_hausa: 'Kwayar cutar virus da ƙananan kwarin ciyawa (aphids) ke yadawa.',
        symptoms: 'Short yellow streaks along leaves, flattened crinkled foliage, severe plant stunting.',
        symptoms_hausa: 'Launin rawaya a layi a ganye, lankwashewa da rashin girma.',
        treatment: 'Viruses cannot be cured with fungicide. Uproot infected plants to prevent aphid transmission.',
        treatment_hausa: 'Ba a warkar da cutar virus da magani. Cire shukar da ta kamu don hana yaduwa.',
        prevention: 'Control aphids with soap spray or neem; use clean virus-free onion sets.',
        prevention_hausa: 'Kare gona daga kwarin aphid ta amfani da sabulun ruwa ko man dogon yaro.',
      },
      {
        id: 'onion_bulb_blight',
        name: 'Bacterial Bulb & Leaf Blight',
        hausa_name: 'Kumburin Ganye da Albasa',
        image: makeLeafSvg('#689f38', '#3e2723', true),
        affected_parts: ['Neck of bulb', 'Foliage'],
        causes: 'Bacteria (Pantoea / Burkholderia) entering through hail, storm wounds, or overhead irrigation.',
        causes_hausa: 'Kwayar cutar bakteriya da ke shiga ta hanyar rauni ko ruwa mai yawa.',
        symptoms: 'Water-soaked soft brown lesions on inner leaf scales, foul odor, slippery neck.',
        symptoms_hausa: 'Ganye mai ruwa-ruwa da wari, tushen albasa mai sulbi da rubewa.',
        treatment: 'Ensure proper drying/curing before storage. Spray copper hydroxide if noticed early.',
        treatment_hausa: 'Shanya albasa da kyau kafin ajiya. Fesa maganin tagulla da wuri.',
        prevention: 'Avoid overhead sprinkler watering, harvest in dry weather, cure bulbs 2 weeks in shade.',
        prevention_hausa: 'Kaucewa watsa ruwa ta sama, girbi a lokacin da babu ruwan sama, shanya a inuwa.',
      },
    ],
  },
  {
    id: 'maize',
    crop: 'Maize',
    hausa_name: 'Masara',
    healthy_image: makeLeafSvg('#2e7d32'),
    description: 'Primary grain crop across Northern and Middle Belt Nigeria.',
    description_hausa: 'Babban hatsi a Arewacin Najeriya da tsakiyar ƙasar.',
    diseases: [
      {
        id: 'maize_rust',
        name: 'Common Maize Rust',
        hausa_name: 'Tsatsar Masara',
        image: makeLeafSvg('#689f38', '#bf360c', true),
        affected_parts: ['Leaves', 'Sheaths'],
        causes: 'Fungus (Puccinia sorghi) carried by wind during cool, moist periods.',
        causes_hausa: 'Naman gwari (Puccinia sorghi) da iska ke ɗauka a lokacin sanyi da laima.',
        symptoms: 'Cinnamon-brown powdery pustules on both upper and lower leaf surfaces.',
        symptoms_hausa: 'Ƙuraje masu launin kasa-kasa/ja a gaban da bayan ganye.',
        treatment: 'Plant early to avoid peak rust periods. Apply triazole fungicide if disease appears before tasseling.',
        treatment_hausa: 'Shuka da wuri don gujewa lokacin tsatsa. Fesa magani idan ya bayyana kafin fitar zaren masara.',
        prevention: 'Use resistant hybrid maize varieties (e.g. SAMMAZ series).',
        prevention_hausa: 'Shuka nau\'in masara mai jure cuta kamar ire-iren SAMMAZ.',
      },
      {
        id: 'maize_leaf_blight',
        name: 'Northern Corn Leaf Blight',
        hausa_name: 'Ciwon Ganyen Masara',
        image: makeLeafSvg('#558b2f', '#3e2723', true),
        affected_parts: ['Leaves', 'Husk'],
        causes: 'Exserohilum turcicum fungus persisting in crop residue.',
        causes_hausa: 'Naman gwari mai zama a ragowar masarar da aka girbe.',
        symptoms: 'Long, cigar-shaped gray-green to tan lesions on leaves.',
        symptoms_hausa: 'Dogayen raunuka masu launin toka-kore a ganye kamar sigari.',
        treatment: 'Rotate fields with non-grasses (legumes like cowpea/soybean); remove severe debris.',
        treatment_hausa: 'Canza gona da wake ko waken soya; share ragowar shuka.',
        prevention: 'Fungicide seed dressing and resistant seed selection.',
        prevention_hausa: 'Maganin iri kafin shuka da zaben iri mai juriya.',
      },
    ],
  },
  {
    id: 'sorghum',
    crop: 'Sorghum',
    hausa_name: 'Dawa',
    healthy_image: makeLeafSvg('#388e3c'),
    description: 'Drought-tolerant staple grain central to Northern Nigerian food security.',
    description_hausa: 'Abincin gargajiya mai jure fari da ake amfani da shi sosai a Arewa.',
    diseases: [
      {
        id: 'sorghum_anthracnose',
        name: 'Sorghum Anthracnose',
        hausa_name: 'Ciwo mai Digo a Dawa',
        image: makeLeafSvg('#689f38', '#b71c1c', true),
        affected_parts: ['Leaves', 'Stalk', 'Panicle'],
        causes: 'Colletotrichum sublineolum favored by high humidity and rain splashes.',
        causes_hausa: 'Naman gwari mai yaduwa ta hanyar ruwan sama da laima.',
        symptoms: 'Circular to elliptical spots with red, purple or brown borders with black fungal spots.',
        symptoms_hausa: 'Digo-digo masu kewayen ja da baki a jikin ganye da karan dawa.',
        treatment: 'Rotate with cowpea or groundnut. Treat seed with Thiram/Mancozeb before planting.',
        treatment_hausa: 'Canza shuka da wake ko gyada. Wanke iri da maganin Thiram kafin shuka.',
        prevention: 'Deep plowing of residue, avoid excessive nitrogen fertilizer.',
        prevention_hausa: 'Karye ragowar shuka da gona mai kyau, kaucewa taki mai yawa na nitrogen.',
      },
    ],
  },
  {
    id: 'millet',
    crop: 'Pearl Millet',
    hausa_name: 'Gero',
    healthy_image: makeLeafSvg('#2e7d32'),
    description: 'Fast-maturing, resilient crop grown across the semi-arid northern belts.',
    description_hausa: 'Shuka mai saurin nuna da ke jure fari a yankin arewa mai zafi.',
    diseases: [
      {
        id: 'millet_downy_mildew',
        name: 'Downy Mildew (Green Ear)',
        hausa_name: 'Ciwon Furen Gero (Kunne Kore)',
        image: makeLeafSvg('#8bc34a', '#f57f17', true),
        affected_parts: ['Leaves', 'Ear head'],
        causes: 'Sclerospora graminicola oospores in soil and on seeds.',
        causes_hausa: 'Kwayoyin cuta dake zama a cikin ƙasa ko jikin iri.',
        symptoms: 'Chlorotic yellow leaf streaks with white downy growth underneath; ear head turns into leafy bush.',
        symptoms_hausa: 'Ganye na zama rawaya da fari a ƙasa; kan geron yana zama ganye maimakon hatsi.',
        treatment: 'Rogue out infected green-ear plants immediately before spores spread.',
        treatment_hausa: 'Tumɓuke shukar da ta nuna wannan alama da sauri a ƙone ta.',
        prevention: 'Seed dressing with metalaxyl; plant SOSAT-C88 resistant variety.',
        prevention_hausa: 'Maganin iri da Metalaxyl; shuka nau\'in SOSAT-C88 mai jurewa.',
      },
    ],
  },
  {
    id: 'tomato',
    crop: 'Tomato',
    hausa_name: 'Tumatir',
    healthy_image: makeLeafSvg('#2e7d32'),
    description: 'Valued vegetable grown across Fadama irrigation plains in Kano, Kaduna, and Plateau.',
    description_hausa: 'Kayan lambu mai muhimmanci a fadama a Kano, Kaduna, da Filato.',
    diseases: [
      {
        id: 'tomato_early_blight',
        name: 'Early Blight',
        hausa_name: 'Bakin Ciwon Ganyen Tumatir',
        image: makeLeafSvg('#558b2f', '#424242', true),
        affected_parts: ['Lower leaves', 'Stem', 'Fruit'],
        causes: 'Alternaria solani fungus thriving in alternating wet and dry conditions.',
        causes_hausa: 'Naman gwari mai son jika da bushewa.',
        symptoms: 'Target-like concentric dark brown rings with yellow halo on older lower leaves.',
        symptoms_hausa: 'Digo-digo masu da\'ira kamar manufa masu launin kasa mai duhu.',
        treatment: 'Prune infected lower leaves, stake plants to keep leaves off damp soil, spray copper.',
        treatment_hausa: 'Datse ƙananan ganyen da suka kamu, ɗaure shukar a jikin sanda, fesa maganin tagulla.',
        prevention: 'Mulching with clean straw, drip or furrow irrigation instead of splashing overhead.',
        prevention_hausa: 'Sanya ciyawa mai tsabta a ƙasa, ban ruwa a tushe ba ta sama ba.',
      },
      {
        id: 'tomato_leaf_curl',
        name: 'Tomato Yellow Leaf Curl Virus',
        hausa_name: 'Ciwon Lanke Ganyen Tumatir',
        image: makeLeafSvg('#9ccc65', '#fbc02d', true),
        affected_parts: ['Upper leaves', 'Shoots'],
        causes: 'Virus vectored by Whiteflies (Bemisia tabaci).',
        causes_hausa: 'Kwayar cuta da farar ƙuda (whitefly) ke yadawa.',
        symptoms: 'Severe upward curling and cupping of leaflets, bushy stunted growth, fruit drops.',
        symptoms_hausa: 'Ganye na lankwashewa sama kamar kofi, shuka tana tsayawa ba girma.',
        treatment: 'Uproot severely stunted plants. Control whiteflies with yellow sticky cards or neem spray.',
        treatment_hausa: 'Tumɓuke shukar da ta naƙasa. Kashe farar ƙuda da man dogon yaro.',
        prevention: 'Use insect-proof nursery netting for seedlings; plant border rows of maize.',
        prevention_hausa: 'Rufe gandun shuka da raga; shuka masara a kewayen lambun.',
      },
    ],
  },
  {
    id: 'cowpea',
    crop: 'Cowpea (Beans)',
    hausa_name: 'Wake',
    healthy_image: makeLeafSvg('#388e3c'),
    description: 'Vital protein legume for human food and fodder across Nigeria.',
    description_hausa: 'Abincin gina jiki mai muhimmanci ga mutane da dabbobi.',
    diseases: [
      {
        id: 'cowpea_bacterial_blight',
        name: 'Bacterial Blight',
        hausa_name: 'Ciwon Bakteriya a Wake',
        image: makeLeafSvg('#689f38', '#ff8f00', true),
        affected_parts: ['Leaves', 'Stems', 'Pods'],
        causes: 'Xanthomonas axonopodis pv. vignicola transmitted via infected seeds.',
        causes_hausa: 'Kwayar bakteriya da ke shiga ta jikin iri.',
        symptoms: 'Water-soaked spots turning reddish-brown with broad yellow margins; pod lesions.',
        symptoms_hausa: 'Digo-digo masu ruwa-ruwa dake zama ja/kasa tare da gefe mai rawaya.',
        treatment: 'Remove infected plants early. Avoid working in the farm while leaves are wet.',
        treatment_hausa: 'Cire masu ciwo da wuri. Kada ka yi aiki a gona yayin da ganyen ke da jika.',
        prevention: 'Use certified IITA/NIHORT disease-free seeds; practice crop rotation.',
        prevention_hausa: 'Yi amfani da ingantaccen irin IITA wanda ba shi da cuta.',
      },
    ],
  },
  {
    id: 'groundnut',
    crop: 'Groundnut (Peanut)',
    hausa_name: 'Gyada',
    healthy_image: makeLeafSvg('#2e7d32'),
    description: 'High-value oilseed and staple legume grown across the savanna.',
    description_hausa: 'Shukar mai da abinci mai daraja a yankin savanna.',
    diseases: [
      {
        id: 'groundnut_rosette',
        name: 'Groundnut Rosette Virus',
        hausa_name: 'Ciwon Rosette na Gyada',
        image: makeLeafSvg('#7cb342', '#fbc02d', true),
        affected_parts: ['Entire shoot', 'Leaves'],
        causes: 'Complex of viruses spread by groundnut aphids (Aphis craccivora).',
        causes_hausa: 'Cutar virus da kwarin gyada (aphid) ke yadawa.',
        symptoms: 'Severe stunting, bunched leaves forming compact rosette cushions, bright yellow chlorosis.',
        symptoms_hausa: 'Shuka na zama ƙanƙanuwa ganye na taruwa a wuri guda yana yin rawaya.',
        treatment: 'Uproot early infected plants to halt aphid feeding chain; spray neem extract.',
        treatment_hausa: 'Tumɓuke masu cuta da wuri; fesa ruwan dogon yaro.',
        prevention: 'Plant at close spacing early in the season to form dense canopy that repels aphids.',
        prevention_hausa: 'Shuka da wuri kuma a matse domin inuwar ganyen na korar kwari.',
      },
    ],
  },
  {
    id: 'rice',
    crop: 'Rice',
    hausa_name: 'Shinkafa',
    healthy_image: makeLeafSvg('#2e7d32'),
    description: 'Primary grain grown under lowland, upland, and irrigation ecologies.',
    description_hausa: 'Shuka mai muhimmanci da ake nomawa a fadama da tudu.',
    diseases: [
      {
        id: 'rice_blast',
        name: 'Rice Blast',
        hausa_name: 'Ciwon Blast na Shinkafa',
        image: makeLeafSvg('#558b2f', '#4e342e', true),
        affected_parts: ['Leaves', 'Neck of panicle', 'Nodes'],
        causes: 'Magnaporthe oryzae fungus triggered by high humidity, cloudy days, and excessive nitrogen.',
        causes_hausa: 'Naman gwari mai yaduwa saboda laima da yawan taki.',
        symptoms: 'Diamond- or spindle-shaped lesions with gray or white centers and brown or reddish-brown borders.',
        symptoms_hausa: 'Raunuka masu siffar diamond da tsakiya mai launin toka da baki a gefe.',
        treatment: 'Drain field briefly to aerate roots; apply tricyclazole if infection starts before heading.',
        treatment_hausa: 'Zubar da ruwa na ɗan lokaci don samun iska; fesa maganin tricyclazole.',
        prevention: 'Split nitrogen applications; avoid dense sowing; plant FARO varieties.',
        prevention_hausa: 'Kada a zuba taki lokaci ɗaya; shuka nau\'in FARO mai jurewa.',
      },
    ],
  },
  {
    id: 'cassava',
    crop: 'Cassava',
    hausa_name: 'Rogo',
    healthy_image: makeLeafSvg('#388e3c'),
    description: 'Resilient root tuber feeding millions across Nigeria.',
    description_hausa: 'Tushen abinci mai gina jiki da juriya a dukkan Najeriya.',
    diseases: [
      {
        id: 'cassava_mosaic',
        name: 'Cassava Mosaic Disease (CMD)',
        hausa_name: 'Ciwon Tabon Ganyen Rogo',
        image: makeLeafSvg('#689f38', '#fbc02d', true),
        affected_parts: ['Leaves', 'Tubers'],
        causes: 'Geminivirus spread by whiteflies and infected stem cuttings.',
        causes_hausa: 'Kwayar cutar virus dake shiga ta kwayar kwaro da sandar rogo da aka shuka.',
        symptoms: 'Distorted mottled leaves with distinct green-yellow patches, twisted leaflets, stunted roots.',
        symptoms_hausa: 'Ganye mai tabon kore da rawaya yana lankwashewa, saiwa bata girma ba.',
        treatment: 'No chemical remedy. Rogue infected plants; do not take stem cuttings from sick plants.',
        treatment_hausa: 'Babu maganin feshi. Cire masu ciwo; kada a shuka sandar da ta fito daga mai ciwo.',
        prevention: 'Plant resistant TME 419 or TMS 30572 varieties from certified IITA agro-dealers.',
        prevention_hausa: 'Shuka nau\'in TME 419 ko TMS 30572 masu juriya.',
      },
    ],
  },
  {
    id: 'yam',
    crop: 'Yam',
    hausa_name: 'Doya',
    healthy_image: makeLeafSvg('#2e7d32'),
    description: 'Cultural and nutritional king tuber cultivated heavily in Benue, Niger, and Taraba.',
    description_hausa: 'Sarkin abinci a jihar Binuwai, Neja, da Taraba.',
    diseases: [
      {
        id: 'yam_anthracnose',
        name: 'Yam Anthracnose (Dieback)',
        hausa_name: 'Kona Ganyen Doya',
        image: makeLeafSvg('#558b2f', '#212121', true),
        affected_parts: ['Vines', 'Leaves', 'Tubers'],
        causes: 'Colletotrichum gloeosporioides fungus exacerbated by high rainfall.',
        causes_hausa: 'Naman gwari mai son ruwan sama da laima.',
        symptoms: 'Dark brown to black necrotic spots coalescing into severe scorching and vine dieback.',
        symptoms_hausa: 'Digo-digo baƙaƙe a ganye da jikin igiyar doya har igiyar ta bushe.',
        treatment: 'Spray with Mancozeb upon first sign; stake vines high off muddy ridges.',
        treatment_hausa: 'Fesa Mancozeb da zaran an gani; ɗaura igiyar doya a kan sanduna masu tsawo.',
        prevention: 'Treat seed yams with ash and fungicide dip before planting.',
        prevention_hausa: 'Wanke irin doya da toka da maganin fungi kafin shukawa.',
      },
    ],
  },
  {
    id: 'pepper',
    crop: 'Pepper (Chili / Atarodo)',
    hausa_name: 'Barkono',
    healthy_image: makeLeafSvg('#388e3c'),
    description: 'High-value condiment cultivated in home gardens and commercial plots.',
    description_hausa: 'Kayan lambu mai riba da ake buƙata a kowanne gida.',
    diseases: [
      {
        id: 'pepper_bacterial_spot',
        name: 'Bacterial Leaf Spot',
        hausa_name: 'Duhun Ganyen Barkono',
        image: makeLeafSvg('#689f38', '#3e2723', true),
        affected_parts: ['Leaves', 'Fruit'],
        causes: 'Xanthomonas campestris spread by raindrops and overhead irrigation.',
        causes_hausa: 'Kwayar bakteriya mai yaduwa ta hanyar yayyafin ruwa.',
        symptoms: 'Small, circular dark spots with water-soaked halos; severe defoliation and sunscald.',
        symptoms_hausa: 'Ƙananan digo masu duhu dake sa ganye zubewa gaba ɗaya.',
        treatment: 'Spray copper-based bactericide at early symptom onset; remove fallen leaves.',
        treatment_hausa: 'Fesa maganin tagulla da wuri; share ganyen da suka zube a ƙone su.',
        prevention: 'Avoid sprinkler irrigation; rotate with non-solanaceous crops.',
        prevention_hausa: 'Kada a watsa ruwa ta sama; canza shuka da amfanin gonar da ba barkono ko tumatir ba.',
      },
    ],
  },
  {
    id: 'wheat',
    crop: 'Wheat',
    hausa_name: 'Alkama',
    healthy_image: makeLeafSvg('#2e7d32'),
    description: 'Irrigated cool-season winter cereal cultivated across Kano, Jigawa, and Borno basin.',
    description_hausa: 'Hatsi na lokacin sanyi da ake nomawa a fadama a Kano, Jigawa, da Borno.',
    diseases: [
      {
        id: 'wheat_stem_rust',
        name: 'Wheat Stem Rust',
        hausa_name: 'Tsatsar Karan Alkama',
        image: makeLeafSvg('#558b2f', '#d84315', true),
        affected_parts: ['Stems', 'Leaf sheaths'],
        causes: 'Puccinia graminis fungus spread by airborne spores in mild, damp weather.',
        causes_hausa: 'Naman gwari dake yawo a iska a lokacin sanyi da laima.',
        symptoms: 'Reddish-brown, elongated pustules breaking through epidermal layers of stems.',
        symptoms_hausa: 'Ƙuraje masu launin ja-kasa da ke ɓallewa a jikin karan alkama.',
        treatment: 'Apply systemic fungicide (e.g. tebuconazole) when rust pustules are first observed.',
        treatment_hausa: 'Fesa maganin tebuconazole da zaran an ga alamar tsatsa.',
        prevention: 'Plant certified wheat varieties resistant to current rust strains.',
        prevention_hausa: 'Shuka ingantaccen irin alkama mai jure cutar tsatsa.',
      },
    ],
  },
];
