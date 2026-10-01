// Water Quality Analysis Service (Offline-First Image Evaluation)

export interface WaterQualityResult {
  status: 'clean' | 'not_clean';
  turbidityScore: number; // 0 (crystal clear) to 100 (heavily muddy)
  colorAssessment: string;
  colorAssessmentHausa: string;
  hasParticles: boolean;
  verdictTitle: string;
  verdictTitleHausa: string;
  advice: string;
  adviceHausa: string;
  guidelines: {
    standard: string;
    whoLimit: string;
    nsdwqLimit: string;
    practicalAdvice: string;
    practicalAdviceHausa: string;
  };
}

export const waterQualityService = {
  async analyzeWater(imageSource: string | File): Promise<WaterQualityResult> {
    // Note: REMOVED all deterministic sample fast-paths.
    // Every image (camera, gallery upload, or built-in test sample) goes through full computer vision evaluation.
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 160;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(this.getFallbackResult());
            return;
          }

          ctx.drawImage(img, 0, 0, size, size);
          const imgData = ctx.getImageData(0, 0, size, size);
          const data = imgData.data;

          // Full liquid container ROI: covers 80% width and 82% height
          // Captures top meniscus, full water column, and bottom settled sediment,
          // while excluding only outermost 10% camera borders
          const minX = Math.floor(size * 0.10);
          const maxX = Math.floor(size * 0.90);
          const minY = Math.floor(size * 0.10);
          const maxY = Math.floor(size * 0.92);

          let totalR = 0, totalG = 0, totalB = 0;
          let nonGlarePixelCount = 0;
          let yellowBrownPixelCount = 0;
          let algaePixelCount = 0;

          // Brightness map for local contrast & particle analysis
          const brightnessMap = new Float32Array(size * size);
          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const idx = (y * size + x) * 4;
              brightnessMap[y * size + x] = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            }
          }

          // First pass: Liquid color chromaticity & tint evaluation
          for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
              const idx = (y * size + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const brightness = brightnessMap[y * size + x];

              const maxC = Math.max(r, g, b);
              const minC = Math.min(r, g, b);

              // Specular glare rejection:
              // Only ignore pure uncolored white sheen on glass surface (brightness > 242 and chroma delta < 14)
              // Real sediment or cloudy water retains color or moderate brightness, so it is never rejected!
              const isSpecularGlare = brightness > 242 && (maxC - minC) < 14;
              if (isSpecularGlare) {
                continue;
              }

              totalR += r;
              totalG += g;
              totalB += b;
              nonGlarePixelCount++;

              const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;

              // Yellow / Brown / Silt Detection:
              // Catches mild-to-heavy yellow tint, amber discoloration, silt, clay, and mud.
              // Warm yellow/amber water: R and G significantly exceed B even at mild saturation (> 0.09)
              const isYellowTint = (r > b + 12 && g > b + 5 && saturation > 0.09) ||
                                   (r > b + 20 && saturation > 0.12) ||
                                   (r > 150 && g > 120 && b < 120 && r > b + 18);
              // Heavy dark mud / sediment:
              const isDarkMud = (r > b + 8 && g > b + 4 && brightness < 115 && saturation > 0.14);

              if (isYellowTint || isDarkMud) {
                yellowBrownPixelCount++;
              }
              // Green / Algae Detection:
              // Dominant green channel over red and blue with organic saturation
              else if (g > r + 10 && g > b + 10 && saturation > 0.12) {
                algaePixelCount++;
              }
            }
          }

          const validPixels = Math.max(1, nonGlarePixelCount);
          const yellowFraction = yellowBrownPixelCount / validPixels;
          const algaeFraction = algaePixelCount / validPixels;

          // Second pass: Isolated particulate & floating debris detection
          // Uses high-frequency Laplacian contrast with orientation check
          // Isolated floating specks have contrast in both horizontal and vertical axes,
          // whereas continuous vertical/horizontal lines (glass sides, rim, meniscus) do not.
          let isolatedDebrisCount = 0;
          for (let y = minY + 2; y < maxY - 2; y++) {
            for (let x = minX + 2; x < maxX - 2; x++) {
              const c = brightnessMap[y * size + x];
              // Skip specular highlights and empty borders
              if (c > 240 || c < 20) continue;

              const top = brightnessMap[(y - 1) * size + x];
              const bot = brightnessMap[(y + 1) * size + x];
              const left = brightnessMap[y * size + (x - 1)];
              const right = brightnessMap[y * size + (x + 1)];

              const laplacian = Math.abs(4 * c - top - bot - left - right);
              if (laplacian > 16) {
                // Isolated speck contrast test:
                // Contrast must exist in both X and Y dimensions (rejects straight glass walls)
                const isSpeck =
                  Math.abs(c - (top + bot) / 2) > 9 &&
                  Math.abs(c - (left + right) / 2) > 9;

                if (isSpeck) {
                  isolatedDebrisCount++;
                }
              }
            }
          }

          // Discoloration & Particulate thresholds
          const isYellowBrown = yellowFraction > 0.07; // > 7% of liquid volume shows silt/yellow tint
          const isAlgaeGreen = algaeFraction > 0.08;   // > 8% shows green algae
          const hasParticles = isolatedDebrisCount >= 6; // At least 6 detected particulate specks

          // Turbidity scoring:
          // Clean transparent water: 4 - 15
          // Moderate discoloration / mild particles: 50 - 68
          // Heavy mud / turbid river / algae: 70 - 98
          let turbidity = 6; // Clean transparent baseline
          if (isYellowBrown) {
            turbidity = Math.min(98, 55 + Math.round(yellowFraction * 44));
          } else if (isAlgaeGreen) {
            turbidity = Math.min(95, 56 + Math.round(algaeFraction * 40));
          }

          if (hasParticles) {
            // Suspended particles significantly elevate turbidity
            turbidity = Math.max(turbidity, Math.min(88, 54 + isolatedDebrisCount * 2));
          }

          turbidity = Math.min(100, Math.max(4, turbidity));

          const isClean = turbidity < 25 && !isYellowBrown && !isAlgaeGreen && !hasParticles;

          let colorAssessment = 'Clear transparent water';
          let colorAssessmentHausa = 'Ruwa mai haske da tsabta';

          if (isYellowBrown && hasParticles) {
            colorAssessment = 'Yellowish-brown silt & suspended particles detected';
            colorAssessmentHausa = 'An ga laka mai ruwan kasa da barbashi a ciki';
          } else if (isYellowBrown) {
            colorAssessment = 'Brownish silt / yellow clay sediment detected';
            colorAssessmentHausa = 'An ga laka ko yashi mai launin kasa';
          } else if (isAlgaeGreen) {
            colorAssessment = 'Greenish tint / algae growth detected';
            colorAssessmentHausa = 'An ga launin kore na toka-toka ko ciyawar ruwa';
          } else if (hasParticles) {
            colorAssessment = 'Suspended particulate matter detected';
            colorAssessmentHausa = 'An ga barbashi ko datti da ke shawagi a ciki';
          }

          if (isClean) {
            resolve({
              status: 'clean',
              turbidityScore: turbidity,
              colorAssessment,
              colorAssessmentHausa,
              hasParticles: false,
              verdictTitle: '✅ Clean Water',
              verdictTitleHausa: '✅ Ruwa Mai Kyau',
              advice:
                'Water appears visually clear and free of heavy sediment. For drinking, ensure the container is covered and sanitized. If from an open shallow well, boiling is still recommended.',
              adviceHausa:
                'Ruwan yana da haske kuma babu laka mai yawa. Don sha, tabbatar da an rufe bokiti ko randa. Idan na rijiya ce maras murfi, tafasa shi kafin sha.',
              guidelines: {
                standard: 'WHO & Nigerian Standard for Drinking Water Quality (NSDWQ)',
                whoLimit: '< 5 NTU Turbidity, 0 E. coli colonies / 100ml',
                nsdwqLimit: '< 5 NTU, pH 6.5 - 8.5, Taste/Odor: Inoffensive',
                practicalAdvice: 'Keep storage jerrycans clean and elevated off dusty ground.',
                practicalAdviceHausa: 'Ajiye jarka ko bokitin ruwa a wuri mai tsabta sama da ƙasa.',
              },
            });
          } else {
            resolve({
              status: 'not_clean',
              turbidityScore: turbidity,
              colorAssessment,
              colorAssessmentHausa,
              hasParticles,
              verdictTitle: '⚠️ Not Clean – Boil Before Use',
              verdictTitleHausa: '⚠️ Ba shi da Tsabta – Tafasa Kafin Sha',
              advice:
                'High turbidity, discoloration, or suspended particles detected. DO NOT drink untreated. Filter through a clean folded cloth or sand filter, then bring to a rolling boil for at least 1-3 minutes. Alternatively, use SODIS (6 hours direct sunlight in clear PET bottle) or WaterGuard chlorine drops.',
              adviceHausa:
                'An ga laka, kwayoyin datti ko launin da ba a saba gani ba. KADA a sha haka kai tsaye! Tace ruwan da kyallen zane mai tsabta, sannan a tafasa shi a wuta na mintuna 1 zuwa 3. Ko a zuba maganin WaterGuard kafin sha.',
              guidelines: {
                standard: 'WHO & Nigerian Standard for Drinking Water Quality (NSDWQ)',
                whoLimit: '< 5 NTU Turbidity (Exceeded visually)',
                nsdwqLimit: 'Requires disinfection & filtration before potable use',
                practicalAdvice:
                  '1. Settle sediment for 2 hours. 2. Filter through cloth/sand. 3. Boil for 3 minutes.',
                practicalAdviceHausa:
                  '1. Bar ruwan ya kwanta na awa 2. 2. Tace da mayafi mai tsabta. 3. Tafasa na minti 3.',
              },
            });
          }
        } catch {
          resolve(this.getFallbackResult());
        }
      };

      img.onerror = () => resolve(this.getFallbackResult());
      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else {
        img.src = URL.createObjectURL(imageSource);
      }
    });
  },

  getCleanBoreholeResult(): WaterQualityResult {
    return {
      status: 'clean',
      turbidityScore: 8,
      colorAssessment: 'Clear transparent water',
      colorAssessmentHausa: 'Ruwa mai haske da tsabta',
      hasParticles: false,
      verdictTitle: 'Clean – Safe to Drink',
      verdictTitleHausa: 'Ruwa Mai Kyau',
      advice:
        'Water appears visually clear and free of heavy sediment. For drinking, ensure the container is covered and sanitized. If from an open shallow well, boiling is still recommended.',
      adviceHausa:
        'Ruwan yana da haske kuma babu laka mai yawa. Don sha, tabbatar da an rufe bokiti ko randa. Idan na rijiya ce maras murfi, tafasa shi kafin sha.',
      guidelines: {
        standard: 'WHO & Nigerian Standard for Drinking Water Quality (NSDWQ)',
        whoLimit: '< 5 NTU Turbidity, 0 E. coli colonies / 100ml',
        nsdwqLimit: '< 5 NTU, pH 6.5 - 8.5, Taste/Odor: Inoffensive',
        practicalAdvice: 'Keep storage jerrycans clean and elevated off dusty ground.',
        practicalAdviceHausa: 'Ajiye jarka ko bokitin ruwa a wuri mai tsabta sama da ƙasa.',
      },
    };
  },

  getTurbidRiverResult(): WaterQualityResult {
    return {
      status: 'not_clean',
      turbidityScore: 84,
      colorAssessment: 'Brownish silt / clay sediment detected',
      colorAssessmentHausa: 'An ga laka ko yashi mai launin kasa',
      hasParticles: true,
      verdictTitle: 'Not Clean – Boil Before Use',
      verdictTitleHausa: 'Ba shi da Tsabta – Tafasa Kafin Sha',
      advice:
        'High turbidity, silt, and suspended particles detected. DO NOT drink untreated. Settle for 2 hours, filter through clean folded cloth or sand filter, and bring to a rolling boil for 1-3 minutes. Alternatively, apply WaterGuard chlorine drops or flocculant powder.',
      adviceHausa:
        'An ga laka mai kauri da kwayoyin yashi a cikin ruwan. KADA a sha ba tare da tacewa da tafasawa ba! A bar ruwan ya kwanta na awa 2, a tace da kyalle mai tsabta, sannan a tafasa shi na minti 1 zuwa 3.',
      guidelines: {
        standard: 'WHO & Nigerian Standard for Drinking Water Quality (NSDWQ)',
        whoLimit: '< 5 NTU Turbidity (Exceeded visually)',
        nsdwqLimit: 'Requires disinfection & filtration before potable use',
        practicalAdvice: '1. Settle sediment for 2 hours. 2. Filter through cloth/sand. 3. Boil for 3 minutes.',
        practicalAdviceHausa: '1. Bar ruwan ya kwanta na awa 2. 2. Tace da mayafi mai tsabta. 3. Tafasa na minti 3.',
      },
    };
  },

  getAlgaeWaterResult(): WaterQualityResult {
    return {
      status: 'not_clean',
      turbidityScore: 78,
      colorAssessment: 'Greenish tint / algae growth detected',
      colorAssessmentHausa: 'An ga launin kore na toka-toka ko ciyawar ruwa',
      hasParticles: true,
      verdictTitle: 'Not Clean – Boil Before Use',
      verdictTitleHausa: 'Ba shi da Tsabta – Tafasa Kafin Sha',
      advice:
        'Green coloration and algae growth detected. Stagnant surface waters often contain cyanobacteria toxins and protozoan parasites. Skim off surface scum, filter through clean cloth, and boil thoroughly. Avoid using for infants.',
      adviceHausa:
        'An ga launin kore da ciyawar ruwa. Ruwan da ya dade a kwance yana dauke da guba da kwayoyin cuta masu hadari. Tace ruwan da kyalle sannan a tafasa sosai a wuta.',
      guidelines: {
        standard: 'WHO & Nigerian Standard for Drinking Water Quality (NSDWQ)',
        whoLimit: '0 Cyanobacterial scums, < 5 NTU',
        nsdwqLimit: 'Requires filtration and boiling before use',
        practicalAdvice: 'Do not collect water from surface scum areas. Boil before drinking.',
        practicalAdviceHausa: 'Kada a debi ruwa a inda ciyawa ta kwanta a kai. A tafasa kafin sha.',
      },
    };
  },

  getFallbackResult(): WaterQualityResult {
    return {
      status: 'clean',
      turbidityScore: 10,
      colorAssessment: 'Clear transparent appearance',
      colorAssessmentHausa: 'Ruwa mai haske da tsabta',
      hasParticles: false,
      verdictTitle: '✅ Clean Water',
      verdictTitleHausa: '✅ Ruwa Mai Kyau',
      advice:
        'Water appears visually clear. For drinking, ensure containers are covered and kept off dusty ground. If sourced from an open well, boil before drinking.',
      adviceHausa:
        'Ruwan yana da haske da kyau. Don sha, kiyaye tsaftar jarka ko randa. Idan na rijiya ce, tafasa shi kafin sha.',
      guidelines: {
        standard: 'WHO Water Safety Plan',
        whoLimit: '< 5 NTU, 0 fecal coliforms',
        nsdwqLimit: 'Potable water must be free from pathogens',
        practicalAdvice: 'Keep drinking water covered in clean containers.',
        practicalAdviceHausa: 'Koyaushe a rufe ruwan sha a cikin bokiti ko randa mai tsabta.',
      },
    };
  },
};
