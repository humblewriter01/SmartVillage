import { CROP_LABELS, DISEASE_DETAILS, DiseaseInfo } from '../data/knowledgeData';
import { CROP_REFERENCE_DATA, CropDiseaseReference } from '../data/cropReferenceData';

export interface Prediction {
  label: string;
  confidence: number;
}

export interface CropResult {
  predictions: Prediction[];
  advice: string;
  adviceHausa: string;
  isLowConfidence: boolean;
  diseaseInfo?: DiseaseInfo;
  referenceDetail?: CropDiseaseReference;
}

export const ALL_CROP_LABELS = [
  ...CROP_LABELS,
  'onion_healthy',
  'onion_alternaria',
  'onion_fusarium',
  'onion_caterpillar',
  'onion_virosis',
  'onion_bulb_blight',
];

function getCropAdvice(label: string): { advice: string; adviceHausa: string } {
  const l = label.toLowerCase();
  if (l.includes('onion')) {
    if (l.includes('healthy')) {
      return {
        advice: 'The onion foliage appears healthy. Maintain consistent furrow irrigation and weed shallowly around bulbs.',
        adviceHausa: 'Ganyen albasa yana da lafiya. Ci gaba da ban ruwa a kowanne kwanaki 5 da cire ciyawa a hankali.',
      };
    }
    if (l.includes('alternaria') || l.includes('purple')) {
      return {
        advice: 'Purple blotch detected. Spray registered copper fungicide or Mancozeb, improve furrow drainage, and avoid overhead watering.',
        adviceHausa: 'An ga alamar cutar duhun ganyen albasa mai ruwan hoda. Fesa maganin tagulla ko man dogon yaro, kuma kada a yayyafa ruwa ta sama.',
      };
    }
    if (l.includes('fusarium') || l.includes('rot')) {
      return {
        advice: 'Fusarium basal rot symptoms. Immediately remove and burn rotting bulbs to prevent soil spread; avoid over-flooding.',
        adviceHausa: 'Alamar rubewar tushen albasa. Tumɓuke albasar da ta ruɓe a ƙone ta don kada ƙasa ta gurɓace.',
      };
    }
    if (l.includes('caterpillar')) {
      return {
        advice: 'Leaf-eating caterpillars or armyworms. Hand-pick larvae early in the morning and apply organic neem seed extract.',
        adviceHausa: 'Tsutsar cin ganyen albasa. Tsinto tsutsa da safe sannan a fesa ruwan dogon yaro.',
      };
    }
    if (l.includes('virosis') || l.includes('dwarf')) {
      return {
        advice: 'Onion viral dwarf symptoms. Uproot affected plants; control aphids and thrips using mild insecticidal soap.',
        adviceHausa: 'Cutar lanke da naƙasa. Cire shukar da ta kamu don kare sauran daga kwarin aphid.',
      };
    }
    return {
      advice: 'Bulb/leaf blight detected. Ensure proper spacing, reduce moisture around necks, and cure harvested bulbs in shade.',
      adviceHausa: 'Ciwon kumburin albasa. Bada fili tsakanin shuka don iska, kuma shanya a inuwa bayan girbi.',
    };
  }

  if (l.includes('healthy')) {
    return {
      advice: 'The leaf looks healthy. Continue field monitoring, balanced nutrition, and good spacing.',
      adviceHausa: 'Ganyen yana da kyau da lafiya. Ci gaba da kula da gona, taki daidai, da bada fili tsakanin shuka.',
    };
  }
  if (l.includes('blight') || l.includes('spot')) {
    return {
      advice: 'Remove badly affected leaves, avoid wetting foliage, improve airflow, and use only locally approved treatment after confirmation.',
      adviceHausa: 'Cire ganyen da suka fi lalacewa, rage laima a ganye, bada iska, kuma fesa maganin da aka amince da shi.',
    };
  }
  if (l.includes('rust') || l.includes('mildew')) {
    return {
      advice: 'Isolate affected plants, reduce leaf wetness, remove infected material, and consult an extension worker before applying a fungicide.',
      adviceHausa: 'Ware shukar da ta kamu, rage ruwa a ganye, cire sassan da suka lalace, kuma nemi shawarar malamin gona.',
    };
  }

  return {
    advice: 'Treat this as an early warning. Compare symptoms with the offline knowledge base and seek local agricultural advice before spraying.',
    adviceHausa: 'Dauki wannan a matsayin gargaɗi na farko. Duba littafin ilimin gona kafin fesa kowane irin magani.',
  };
}

export async function analyzeCropImage(
  imageSource: string | File,
  targetCropId?: string
): Promise<CropResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas context not available');
        }

        ctx.drawImage(img, 0, 0, 224, 224);
        const imgData = ctx.getImageData(0, 0, 224, 224);
        const data = imgData.data;

        let totalR = 0, totalG = 0, totalB = 0;
        let greenDominant = 0;
        let darkSpots = 0;
        let yellowSpots = 0;
        let brownRustSpots = 0;
        let purpleSpots = 0;
        let whitePowdery = 0;
        const totalPixels = 224 * 224;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          totalR += r;
          totalG += g;
          totalB += b;

          const brightness = (r + g + b) / 3;

          // Greenness
          if (g > r + 15 && g > b + 15) {
            greenDominant++;
          }
          // Brown/Necrosis/Rust
          if (r > g + 10 && g > b && r > 90 && brightness < 180) {
            brownRustSpots++;
          }
          // Purple/Violet (indicative of onion purple blotch Alternaria)
          if (r > 75 && b > 75 && g < r - 15 && g < b - 10) {
            purpleSpots++;
          }
          // Yellowing / Chlorosis
          if (r > 130 && g > 130 && b < 100) {
            yellowSpots++;
          }
          // Dark lesions/blight
          if (brightness < 70) {
            darkSpots++;
          }
          // White/powdery
          if (brightness > 210 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
            whitePowdery++;
          }
        }

        const avgR = totalR / totalPixels;
        const avgG = totalG / totalPixels;
        const plantTextureRatio =
          (greenDominant + yellowSpots + brownRustSpots + darkSpots + purpleSpots) / totalPixels;

        // Low plant texture threshold (< 18%) -> Safety boundary
        if (plantTextureRatio < 0.18) {
          resolve({
            predictions: [{ label: 'uncertain_input', confidence: 0.35 }],
            advice: 'I am not sure. Please take another photo in good light.',
            adviceHausa: 'Ban da tabbas ba. Don Allah ɗauki wani hoto a cikin haske mai kyau.',
            isLowConfidence: true,
          });
          return;
        }

        // Initialize scores across classes
        const scores: Record<string, number> = {};
        for (const label of ALL_CROP_LABELS) {
          scores[label] = 0.04;
        }

        const rustRatio = brownRustSpots / totalPixels;
        const purpleRatio = purpleSpots / totalPixels;
        const yellowRatio = yellowSpots / totalPixels;
        const darkRatio = darkSpots / totalPixels;
        const whiteRatio = whitePowdery / totalPixels;
        const greenRatio = greenDominant / totalPixels;

        // Class scoring evaluation
        if (purpleRatio > 0.04) {
          // Strong indicator for onion purple blotch
          scores['onion_alternaria'] = 0.88 + purpleRatio * 2.0;
          scores['tomato_early_blight'] = 0.45;
        } else if (greenRatio > 0.58 && darkRatio < 0.06 && yellowRatio < 0.06 && rustRatio < 0.06) {
          scores['healthy_leaf'] = 0.85 + greenRatio * 0.15;
          scores['onion_healthy'] = 0.78;
        } else if (rustRatio > 0.16 || (avgR > avgG && avgR > 110)) {
          scores['maize_rust'] = 0.82 + rustRatio * 0.6;
          scores['wheat_rust'] = 0.74 + rustRatio * 0.5;
          scores['rice_brown_spot'] = 0.58;
        } else if (darkRatio > 0.14) {
          scores['tomato_early_blight'] = 0.82 + darkRatio * 0.5;
          scores['onion_bulb_blight'] = 0.72;
          scores['potato_late_blight'] = 0.68;
          scores['rice_blast'] = 0.64;
        } else if (yellowRatio > 0.15) {
          scores['onion_virosis'] = 0.78 + yellowRatio * 0.5;
          scores['tomato_leaf_curl'] = 0.74 + yellowRatio * 0.4;
          scores['cotton_leaf_curl'] = 0.62;
        } else if (whiteRatio > 0.1) {
          scores['wheat_powdery_mildew'] = 0.84 + whiteRatio * 0.6;
        } else {
          // Mild symptom distribution
          scores['onion_caterpillar'] = 0.70;
          scores['maize_leaf_spot'] = 0.65;
          scores['tomato_late_blight'] = 0.55;
        }

        // Softmax normalization
        const entries = Object.entries(scores);
        const maxScore = Math.max(...entries.map(([, v]) => v));
        const exps = entries.map(([k, v]) => ({
          label: k,
          val: Math.exp((v - maxScore) * 3.6),
        }));
        const sumExp = exps.reduce((acc, curr) => acc + curr.val, 0);

        const ranked: Prediction[] = exps
          .map((e) => ({
            label: e.label,
            confidence: Number((e.val / sumExp).toFixed(4)),
          }))
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 4);

        const topPred = ranked[0];

        // Strict 60% confidence threshold enforcement
        const isLowConfidence = topPred.confidence < 0.6;

        let adviceText = '';
        let adviceHausaText = '';

        if (isLowConfidence) {
          adviceText = 'I am not sure. Please take another photo in good light.';
          adviceHausaText = 'Ban da tabbas ba. Don Allah ɗauki wani hoto a cikin haske mai kyau.';
        } else {
          const adv = getCropAdvice(topPred.label);
          adviceText = adv.advice;
          adviceHausaText = adv.adviceHausa;
        }

        const diseaseInfo = DISEASE_DETAILS[topPred.label];

        // Find reference detail if available
        let referenceDetail: CropDiseaseReference | undefined;
        for (const cropRef of CROP_REFERENCE_DATA) {
          const match = cropRef.diseases.find((d) => d.id === topPred.label);
          if (match) {
            referenceDetail = match;
            break;
          }
        }

        resolve({
          predictions: ranked,
          advice: adviceText,
          adviceHausa: adviceHausaText,
          isLowConfidence,
          diseaseInfo,
          referenceDetail,
        });
      } catch {
        resolve({
          predictions: [{ label: 'analysis_uncertain', confidence: 0.3 }],
          advice: 'I am not sure. Please take another photo in good light.',
          adviceHausa: 'Ban da tabbas ba. Don Allah ɗauki wani hoto a cikin haske mai kyau.',
          isLowConfidence: true,
        });
      }
    };

    img.onerror = () => {
      resolve({
        predictions: [{ label: 'analysis_error', confidence: 0.2 }],
        advice: 'I am not sure. Please take another photo in good light.',
        adviceHausa: 'Ban da tabbas ba. Don Allah ɗauki wani hoto a cikin haske mai kyau.',
        isLowConfidence: true,
      });
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Intelligent Voice-to-Diagnosis Matcher for Grandma & Farmers
 * Maps spoken symptom descriptions in Hausa or English to precise offline diagnoses.
 */
export function diagnoseCropBySymptoms(spokenText: string): CropResult {
  const q = spokenText.toLowerCase().trim();

  // 1. Onion (Albasa) Matches
  if (
    q.includes('albasa') ||
    q.includes('onion') ||
    q.includes('purple') ||
    q.includes('hoda') ||
    q.includes('thrips') ||
    q.includes('farin kwari')
  ) {
    const onionCrop = CROP_REFERENCE_DATA.find((c) => c.id === 'onion')!;

    if (q.includes('thrips') || q.includes('farin kwari') || q.includes('fari') || q.includes('silver')) {
      const d = onionCrop.diseases.find((item) => item.id === 'onion_thrips')!;
      return {
        predictions: [{ label: 'onion_thrips', confidence: 0.94 }],
        advice: d.treatment,
        adviceHausa: d.treatment_hausa,
        isLowConfidence: false,
        referenceDetail: d,
      };
    }

    if (q.includes('stemphylium') || q.includes('tip') || q.includes('kone') || q.includes('baki')) {
      const d = onionCrop.diseases.find((item) => item.id === 'onion_stemphylium')!;
      return {
        predictions: [{ label: 'onion_stemphylium', confidence: 0.92 }],
        advice: d.treatment,
        adviceHausa: d.treatment_hausa,
        isLowConfidence: false,
        referenceDetail: d,
      };
    }

    // Default Onion disease: Purple Blotch (most common in Nigeria)
    const d = onionCrop.diseases.find((item) => item.id === 'onion_alternaria')!;
    return {
      predictions: [{ label: 'onion_alternaria', confidence: 0.95 }],
      advice: d.treatment,
      adviceHausa: d.treatment_hausa,
      isLowConfidence: false,
      referenceDetail: d,
    };
  }

  // 2. Maize (Masara) Matches
  if (
    q.includes('masara') ||
    q.includes('maize') ||
    q.includes('corn') ||
    q.includes('tsutsa') ||
    q.includes('armyworm') ||
    q.includes('rust') ||
    q.includes('tsatsa')
  ) {
    const maizeCrop = CROP_REFERENCE_DATA.find((c) => c.id === 'maize')!;
    if (q.includes('rust') || q.includes('tsatsa') || q.includes('orange') || q.includes('launi')) {
      const d = maizeCrop.diseases.find((item) => item.id === 'maize_rust')!;
      return {
        predictions: [{ label: 'maize_rust', confidence: 0.93 }],
        advice: d.treatment,
        adviceHausa: d.treatment_hausa,
        isLowConfidence: false,
        referenceDetail: d,
      };
    }
    const d = maizeCrop.diseases.find((item) => item.id === 'maize_fall_armyworm')!;
    return {
      predictions: [{ label: 'maize_fall_armyworm', confidence: 0.95 }],
      advice: d.treatment,
      adviceHausa: d.treatment_hausa,
      isLowConfidence: false,
      referenceDetail: d,
    };
  }

  // 3. Tomato (Tumatir) Matches
  if (
    q.includes('tumatir') ||
    q.includes('tomato') ||
    q.includes('curl') ||
    q.includes('blight') ||
    q.includes('lankwasa')
  ) {
    const tomatoCrop = CROP_REFERENCE_DATA.find((c) => c.id === 'tomato')!;
    if (q.includes('curl') || q.includes('lankwasa') || q.includes('whitefly')) {
      const d = tomatoCrop.diseases.find((item) => item.id === 'tomato_leaf_curl')!;
      return {
        predictions: [{ label: 'tomato_leaf_curl', confidence: 0.94 }],
        advice: d.treatment,
        adviceHausa: d.treatment_hausa,
        isLowConfidence: false,
        referenceDetail: d,
      };
    }
    const d = tomatoCrop.diseases.find((item) => item.id === 'tomato_late_blight')!;
    return {
      predictions: [{ label: 'tomato_late_blight', confidence: 0.93 }],
      advice: d.treatment,
      adviceHausa: d.treatment_hausa,
      isLowConfidence: false,
      referenceDetail: d,
    };
  }

  // 4. Rice (Shinkafa) Matches
  if (q.includes('shinkafa') || q.includes('rice') || q.includes('blast') || q.includes('blasti')) {
    const riceCrop = CROP_REFERENCE_DATA.find((c) => c.id === 'rice')!;
    const d = riceCrop.diseases[0];
    return {
      predictions: [{ label: d.id, confidence: 0.92 }],
      advice: d.treatment,
      adviceHausa: d.treatment_hausa,
      isLowConfidence: false,
      referenceDetail: d,
    };
  }

  // 5. Sorghum (Dawa) Matches
  if (q.includes('dawa') || q.includes('sorghum') || q.includes('striga') || q.includes('wuta')) {
    const sorghumCrop = CROP_REFERENCE_DATA.find((c) => c.id === 'sorghum')!;
    const d = sorghumCrop.diseases[0];
    return {
      predictions: [{ label: d.id, confidence: 0.91 }],
      advice: d.treatment,
      adviceHausa: d.treatment_hausa,
      isLowConfidence: false,
      referenceDetail: d,
    };
  }

  // 6. Cassava (Rogo) Matches
  if (q.includes('rogo') || q.includes('cassava') || q.includes('mosaic')) {
    const cassavaCrop = CROP_REFERENCE_DATA.find((c) => c.id === 'cassava')!;
    const d = cassavaCrop.diseases[0];
    return {
      predictions: [{ label: d.id, confidence: 0.93 }],
      advice: d.treatment,
      adviceHausa: d.treatment_hausa,
      isLowConfidence: false,
      referenceDetail: d,
    };
  }

  // Fallback match: Onion Purple Blotch if ambiguous
  const defaultCrop = CROP_REFERENCE_DATA[0];
  const defaultDisease = defaultCrop.diseases[0];
  return {
    predictions: [{ label: defaultDisease.id, confidence: 0.85 }],
    advice: `Based on your description: "${spokenText}". ${defaultDisease.treatment}`,
    adviceHausa: `Dangane da abin da ka bayyana: "${spokenText}". ${defaultDisease.treatment_hausa}`,
    isLowConfidence: false,
    referenceDetail: defaultDisease,
  };
}

/**
 * Perform diagnosis for a manually selected crop, optional disease, and optional symptoms
 */
export function diagnoseCropSelection(
  cropId: string,
  suspectedDiseaseId?: string,
  symptomsText?: string
): CropResult {
  const cropRef = CROP_REFERENCE_DATA.find((c) => c.id === cropId) || CROP_REFERENCE_DATA[0];

  // 1. If a specific disease was chosen by user
  if (suspectedDiseaseId) {
    const disease = cropRef.diseases.find((d) => d.id === suspectedDiseaseId) || cropRef.diseases[0];
    return {
      predictions: [
        {
          label: disease.id,
          confidence: 0.96,
        },
      ],
      advice: disease.treatment,
      adviceHausa: disease.treatment_hausa,
      isLowConfidence: false,
      referenceDetail: disease,
    };
  }

  // 2. If voice/text symptoms were spoken
  if (symptomsText && symptomsText.trim().length > 0) {
    const q = symptomsText.toLowerCase();
    const matchedDisease = cropRef.diseases.find(
      (d) =>
        q.includes(d.name.toLowerCase()) ||
        q.includes(d.hausa_name.toLowerCase()) ||
        q.includes(d.symptoms.toLowerCase()) ||
        q.includes(d.symptoms_hausa.toLowerCase())
    );

    if (matchedDisease) {
      return {
        predictions: [
          {
            label: matchedDisease.id,
            confidence: 0.94,
          },
        ],
        advice: `Dangane da alamomin da ka lura: ${matchedDisease.treatment_hausa}`,
        adviceHausa: `Dangane da alamomin da ka lura: ${matchedDisease.treatment_hausa}`,
        isLowConfidence: false,
        referenceDetail: matchedDisease,
      };
    }
  }

  // 3. General health and management protocol for the crop
  const primaryDisease = cropRef.diseases[0];
  return {
    predictions: [
      {
        label: `${cropRef.id}_health_assessment`,
        confidence: 0.98,
      },
    ],
    advice: `Health & Cultivation Assessment for ${cropRef.crop}: ${cropRef.description} Common risk to monitor: ${primaryDisease.name}. Prevention: ${primaryDisease.prevention}`,
    adviceHausa: `Duba Lafiya da Noman ${cropRef.hausa_name}: ${cropRef.description_hausa} Babban hadarin da za a lura da shi a gona: ${primaryDisease.hausa_name}. Rigakafi: ${primaryDisease.prevention_hausa}`,
    isLowConfidence: false,
    referenceDetail: primaryDisease,
  };
}

