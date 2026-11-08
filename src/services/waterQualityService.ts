// Offline visual screening only. These colour thresholds have not been
// validated as a test of drinking-water safety or a measurement of turbidity.
export type WaterClassification = 'clean' | 'turbid' | 'algae' | 'unknown';

export interface WaterQualityResult {
  category: WaterClassification;
  status: 'clean' | 'not_clean' | 'unknown';
  colorAssessment: string;
  colorAssessmentHausa: string;
  verdictTitle: string;
  verdictTitleHausa: string;
  advice: string;
  adviceHausa: string;
}

const RESULTS: Record<WaterClassification, WaterQualityResult> = {
  clean: {
    category: 'clean',
    status: 'clean',
    verdictTitle: 'Good appearance — Clean Borehole-like',
    verdictTitleHausa: 'Yana da haske — kamar ruwan fanfo mai tsabta',
    colorAssessment: 'The photo looks bright and fairly neutral in colour.',
    colorAssessmentHausa: 'Hoton yana da haske kuma ba shi da launi mai ƙarfi.',
    advice: 'Clear-looking water can still contain germs or chemicals. Use a tested safe source. If there is no suspected algae or chemical pollution, bring water to a rolling boil for at least 1 minute before drinking. Boiling does not remove chemicals.',
    adviceHausa: 'Ruwa mai haske na iya ɗauke da ƙwayoyin cuta ko sinadarai. Yi amfani da ruwan da aka gwada. Idan babu zargin ciyawar ruwa ko sinadarai, a tafasa shi sosai na aƙalla minti 1 kafin sha. Tafasawa ba ta cire sinadarai.',
  },
  turbid: {
    category: 'turbid',
    status: 'not_clean',
    verdictTitle: 'Bad appearance — Turbid River Water-like',
    verdictTitleHausa: 'Yana da duhu — kamar ruwan kogi mai laka',
    colorAssessment: 'The photo looks brown, grey, or dark.',
    colorAssessmentHausa: 'Hoton yana kama da ruwan ƙasa, toka-toka ko duhu.',
    advice: 'Do not drink untreated water. If algae or chemical contamination is suspected, use another safe source. Otherwise, let sediment settle, filter through a clean cloth, then bring to a rolling boil for at least 1 minute. Boiling does not remove chemicals.',
    adviceHausa: 'Kada a sha ruwa ba tare da an magance shi ba. Idan ana zargin ciyawar ruwa ko sinadarai, a nemi wani ingantaccen ruwa. In ba haka ba, a bar laka ta sauka, a tace da kyalle mai tsabta, sannan a tafasa sosai na aƙalla minti 1. Tafasawa ba ta cire sinadarai.',
  },
  algae: {
    category: 'algae',
    status: 'not_clean',
    verdictTitle: 'Bad appearance — Possible Algae Water',
    verdictTitleHausa: 'Launi mara kyau — ana zargin ciyawar ruwa',
    colorAssessment: 'The photo has a green tint; this does not prove algae is present.',
    colorAssessmentHausa: 'Hoton yana da launin kore; wannan ba ya tabbatar da ciyawar ruwa.',
    advice: 'If algae or scum is suspected, do not drink or use this water for cooking. Boiling, filtering or chlorine may not remove algae toxins; boiling can make them worse. Use another safe source and contact the local water authority.',
    adviceHausa: 'Idan ana zargin ciyawar ruwa ko kumfa, kada a sha ko dafa abinci da ruwan. Tafasawa, tacewa ko sinadarin chlorine na iya kasa cire gubar ciyawar ruwa; tafasawa na iya ƙara haɗari. A nemi wani ingantaccen ruwa kuma a tuntuɓi hukumar ruwa.',
  },
  unknown: {
    category: 'unknown',
    status: 'unknown',
    verdictTitle: 'Appearance inconclusive',
    verdictTitleHausa: 'Ba a iya tantance kamannin ruwan ba',
    colorAssessment: 'The colour does not match a clear, green, or turbid example.',
    colorAssessmentHausa: 'Launin bai yi kama da ruwa mai haske, kore ko mai laka ba.',
    advice: 'A photo cannot establish water safety. Use a tested safe source. If algae or chemicals are suspected, avoid the water and contact the local water authority.',
    adviceHausa: 'Hoto ba zai tabbatar da amincin ruwa ba. Yi amfani da ruwan da aka gwada. Idan ana zargin ciyawar ruwa ko sinadarai, a guji ruwan kuma a tuntuɓi hukumar ruwa.',
  },
};

/** Classify the average RGB of a small image, ignoring transparent pixels. */
export function classifyWaterPixels(pixels: Uint8ClampedArray): WaterClassification {
  if (pixels.length < 4 || pixels.length % 4 !== 0) throw new Error('No image pixels');
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    red += pixels[i];
    green += pixels[i + 1];
    blue += pixels[i + 2];
    count++;
  }
  if (!count) throw new Error('No visible image pixels');

  red /= count;
  green /= count;
  blue /= count;
  const brightness = (red + green + blue) / 3;
  const max = Math.max(red, green, blue);
  const saturation = max === 0 ? 0 : (max - Math.min(red, green, blue)) / max;

  if (green > red + 8 && green > blue + 8 && saturation > 0.12) return 'algae';
  if ((red > blue + 16 && green > blue + 5 && red >= green - 10) ||
      brightness < 160 || (saturation < 0.16 && brightness < 185)) return 'turbid';
  if (brightness >= 185 && saturation <= 0.23) return 'clean';
  return 'unknown';
}

function resultFor(category: WaterClassification): WaterQualityResult {
  return { ...RESULTS[category] };
}

export const waterQualityService = {
  async analyzeWater(imageSource: string | File): Promise<WaterQualityResult> {
    // Only locally captured/selected data is accepted; never fetch a remote photo.
    if (typeof imageSource === 'string' && !/^(data:image\/|blob:)/i.test(imageSource)) {
      throw new Error('Only local images can be analyzed');
    }
    const objectUrl = typeof imageSource === 'string' ? null : URL.createObjectURL(imageSource);
    const source = objectUrl || imageSource as string;

    try {
      return await new Promise<WaterQualityResult>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          try {
            const width = image.naturalWidth || image.width;
            const height = image.naturalHeight || image.height;
            if (!width || !height) throw new Error('Empty image');
            const canvas = document.createElement('canvas');
            canvas.width = 96;
            canvas.height = 96;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) throw new Error('Canvas unavailable');
            // Analyze the centre square, matching the viewfinder's framing guide.
            const side = Math.min(width, height);
            context.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, 96, 96);
            const pixels = context.getImageData(0, 0, 96, 96).data;
            resolve(resultFor(classifyWaterPixels(pixels)));
          } catch (error) {
            reject(error);
          }
        };
        image.onerror = () => reject(new Error('Could not load image'));
        image.src = source;
      });
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  },
  getCleanBoreholeResult: () => resultFor('clean'),
  getTurbidRiverResult: () => resultFor('turbid'),
  getAlgaeWaterResult: () => resultFor('algae'),
};
