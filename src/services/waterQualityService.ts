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
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 160;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(this.getFallbackResult());
            return;
          }

          ctx.drawImage(img, 0, 0, 160, 160);
          const imgData = ctx.getImageData(0, 0, 160, 160);
          const data = imgData.data;

          let totalBrightness = 0;
          let totalR = 0, totalG = 0, totalB = 0;
          let varianceSum = 0;
          let edgeParticles = 0;
          const totalPixels = 160 * 160;

          // First pass: mean brightness and color channels
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            totalBrightness += brightness;
            totalR += r;
            totalG += g;
            totalB += b;
          }

          const avgBrightness = totalBrightness / totalPixels;
          const avgR = totalR / totalPixels;
          const avgG = totalG / totalPixels;
          const avgB = totalB / totalPixels;

          // Second pass: variance and edge contrast (particles/debris)
          for (let y = 1; y < 159; y += 2) {
            for (let x = 1; x < 159; x += 2) {
              const idx = (y * 160 + x) * 4;
              const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
              varianceSum += Math.abs(b - avgBrightness);

              // Simple 2D gradient for visible particulate specks
              const rightIdx = (y * 160 + (x + 1)) * 4;
              const bottomIdx = ((y + 1) * 160 + x) * 4;
              const bRight = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
              const bBottom = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;

              if (Math.abs(b - bRight) > 38 || Math.abs(b - bBottom) > 38) {
                edgeParticles++;
              }
            }
          }

          const localVariation = varianceSum / (totalPixels / 4);
          const particleDensity = edgeParticles / (totalPixels / 4);

          // Color tint flags
          const isMuddyBrown = avgR > avgB + 28 && avgG > avgB + 10 && avgR > 85;
          const isAlgaeGreen = avgG > avgR + 18 && avgG > avgB + 18;
          const isCloudyGrey = avgBrightness < 110 && Math.abs(avgR - avgG) < 15 && Math.abs(avgG - avgB) < 15;
          const isAbnormalColor = isMuddyBrown || isAlgaeGreen || isCloudyGrey;

          // Estimate turbidity on 0-100 scale
          let turbidity = Math.min(
            100,
            Math.round(
              (isAbnormalColor ? 35 : 5) +
                localVariation * 1.2 +
                particleDensity * 120 +
                (avgBrightness < 90 ? 25 : 0)
            )
          );

          const hasParticles = particleDensity > 0.08 || edgeParticles > 500;
          const isClean = turbidity < 32 && !isAbnormalColor && !hasParticles;

          let colorAssessment = 'Clear transparent water';
          let colorAssessmentHausa = 'Ruwa mai haske da tsabta';

          if (isMuddyBrown) {
            colorAssessment = 'Brownish silt / clay sediment detected';
            colorAssessmentHausa = 'An ga laka ko yashi mai launin kasa';
          } else if (isAlgaeGreen) {
            colorAssessment = 'Greenish tint / algae growth detected';
            colorAssessmentHausa = 'An ga launin kore na toka-toka ko ciyawar ruwa';
          } else if (isCloudyGrey) {
            colorAssessment = 'Milky or grayish haze detected';
            colorAssessmentHausa = 'An ga hazo mai launin toka ko fari a cikin ruwan';
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

  getFallbackResult(): WaterQualityResult {
    return {
      status: 'not_clean',
      turbidityScore: 45,
      colorAssessment: 'Image contrast evaluation',
      colorAssessmentHausa: 'Binciken hasken hoton ruwa',
      hasParticles: true,
      verdictTitle: '⚠️ Not Clean – Boil Before Use',
      verdictTitleHausa: '⚠️ Ba shi da Tsabta – Tafasa Kafin Sha',
      advice:
        'When visual analysis is inconclusive, always practice safe water hygiene: filter through clean cloth and boil for 2-3 minutes before drinking or giving to children.',
      adviceHausa:
        'Idan ba a tabbatar da tsabtar ruwa ba, ko da yaushe a tace shi da mayafi sannan a tafasa shi kafin a ba yara ko manya su sha.',
      guidelines: {
        standard: 'WHO Water Safety Plan',
        whoLimit: '< 5 NTU, 0 fecal coliforms',
        nsdwqLimit: 'Potable water must be free from pathogens',
        practicalAdvice: 'Boil water for vulnerable family members (infants, elderly).',
        practicalAdviceHausa: 'Tafasa ruwa musamman ga jarirai da tsofaffi.',
      },
    };
  },
};
