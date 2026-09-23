import { CROP_LABELS, DISEASE_DETAILS, DiseaseInfo } from '../data/knowledgeData';

export interface Prediction {
  label: string;
  confidence: number;
}

export interface CropResult {
  predictions: Prediction[];
  advice: string;
  diseaseInfo?: DiseaseInfo;
}

function getCropAdvice(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('healthy')) {
    return 'The leaf looks healthy. Continue field monitoring, balanced nutrition, and good spacing.';
  }
  if (l.includes('blight') || l.includes('spot')) {
    return 'Remove badly affected leaves, avoid wetting foliage, improve airflow, and use only locally approved treatment after confirmation.';
  }
  if (l.includes('rust') || l.includes('mildew')) {
    return 'Isolate affected plants, reduce leaf wetness, remove infected material, and consult an extension worker before applying a fungicide.';
  }
  return 'Treat this as an early warning. Compare symptoms with the offline knowledge base and seek local agricultural advice before spraying.';
}

export async function analyzeCropImage(imageSource: string | File): Promise<CropResult> {
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
        const avgB = totalB / totalPixels;
        const plantTextureRatio = (greenDominant + yellowSpots + brownRustSpots + darkSpots) / totalPixels;

        // If not a leaf image or very low plant texture (< 15%)
        if (plantTextureRatio < 0.15) {
          resolve({
            predictions: [{ label: 'uncertain_input', confidence: 0.28 }],
            advice:
              'The image is uncertain (confidence below the safety threshold). Take a clearer photo in daylight, compare the offline guidance, and ask a local extension worker before spraying or removing plants.',
          });
          return;
        }

        // Feature-based class probability evaluation
        const scores: Record<string, number> = {};
        for (const label of CROP_LABELS) {
          scores[label] = 0.05 + Math.random() * 0.04;
        }

        const rustRatio = brownRustSpots / totalPixels;
        const yellowRatio = yellowSpots / totalPixels;
        const darkRatio = darkSpots / totalPixels;
        const whiteRatio = whitePowdery / totalPixels;
        const greenRatio = greenDominant / totalPixels;

        if (greenRatio > 0.55 && darkRatio < 0.08 && yellowRatio < 0.08 && rustRatio < 0.08) {
          scores['healthy_leaf'] += 0.75 + (greenRatio * 0.15);
        } else if (rustRatio > 0.18 || (avgR > avgG && avgR > 110)) {
          scores['maize_rust'] += 0.55 + rustRatio * 0.8;
          scores['wheat_rust'] += 0.50 + rustRatio * 0.7;
          scores['rice_brown_spot'] += 0.35 + rustRatio * 0.5;
        } else if (darkRatio > 0.15) {
          scores['tomato_early_blight'] += 0.58 + darkRatio * 0.7;
          scores['potato_late_blight'] += 0.52 + darkRatio * 0.6;
          scores['rice_blast'] += 0.45 + darkRatio * 0.5;
          scores['rice_leaf_blight'] += 0.40 + darkRatio * 0.4;
        } else if (yellowRatio > 0.18) {
          scores['tomato_leaf_curl'] += 0.62 + yellowRatio * 0.7;
          scores['cotton_leaf_curl'] += 0.55 + yellowRatio * 0.6;
          scores['rice_leaf_blight'] += 0.38 + yellowRatio * 0.4;
        } else if (whiteRatio > 0.12) {
          scores['wheat_powdery_mildew'] += 0.68 + whiteRatio * 0.8;
        } else {
          // General blight/spot distribution
          scores['maize_leaf_spot'] += 0.56;
          scores['tomato_late_blight'] += 0.48;
          scores['potato_black_scurf'] += 0.32;
        }

        // Softmax-like normalization
        const entries = Object.entries(scores);
        const maxScore = Math.max(...entries.map(([, v]) => v));
        const exps = entries.map(([k, v]) => ({
          label: k,
          val: Math.exp((v - maxScore) * 3.5),
        }));
        const sumExp = exps.reduce((acc, curr) => acc + curr.val, 0);

        const ranked: Prediction[] = exps
          .map((e) => ({
            label: e.label,
            confidence: Number((e.val / sumExp).toFixed(4)),
          }))
          .sort((a, b) => b.confidence - a.confidence);

        const top = ranked.slice(0, 3);

        if (top.length === 0 || top[0].confidence < 0.55) {
          resolve({
            predictions: top,
            advice:
              'The image is uncertain (confidence below the safety threshold). Take a clearer photo in daylight, compare the offline guidance, and ask a local extension worker before spraying or removing plants.',
          });
          return;
        }

        const topLabel = top[0].label;
        const advice = getCropAdvice(topLabel);
        const diseaseInfo = DISEASE_DETAILS[topLabel];

        resolve({
          predictions: top,
          advice,
          diseaseInfo,
        });
      } catch (err) {
        resolve({
          predictions: [{ label: 'Needs closer inspection', confidence: 0.0 }],
          advice:
            'Take a clear photo of one leaf in daylight. Separate affected plants, avoid unnecessary spraying, and ask a local extension worker for confirmation.',
        });
      }
    };

    img.onerror = () => {
      resolve({
        predictions: [{ label: 'Needs closer inspection', confidence: 0.0 }],
        advice:
          'Take a clear photo of one leaf in daylight. Separate affected plants, avoid unnecessary spraying, and ask a local extension worker for confirmation.',
      });
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageSource);
    }
  });
}
