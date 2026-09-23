export interface HealthResult {
  condition: string;
  advice: string;
  urgency: string;
  confidence: number;
}

export function analyzeHealth(
  symptomsText: string,
  hasPhoto: boolean
): HealthResult {
  const query = symptomsText.toLowerCase().trim();

  // If both photo and text provided, or text provided:
  if (query) {
    // Malaria check
    if (
      query.includes('fever') ||
      query.includes('chill') ||
      query.includes('malaria') ||
      query.includes('zazzabi') ||
      query.includes('shivering') ||
      query.includes('sauro')
    ) {
      const hasDangerSigns =
        query.includes('breath') ||
        query.includes('convulsion') ||
        query.includes('seizure') ||
        query.includes('confus') ||
        query.includes('dark urine') ||
        query.includes('bleed');

      return {
        condition: hasDangerSigns
          ? 'Emergency fever alert (Possible severe malaria / danger signs)'
          : 'Fever / Malaria screening guidance',
        advice: hasDangerSigns
          ? 'EMERGENCY: Difficulty breathing, confusion, convulsions, dark urine, or abnormal bleeding indicate severe illness. Go to the nearest hospital immediately.'
          : 'Fever, chills, and headache are common with malaria but are not specific. Take plenty of safe fluids, rest, and visit a health center for a rapid diagnostic test (RDT) or blood smear before taking antimalarials.',
        urgency: hasDangerSigns
          ? 'Immediate emergency care required at nearest health facility'
          : 'Prompt health-worker review within 24 hours',
        confidence: hasDangerSigns ? 0.92 : 0.85,
      };
    }

    // Diarrhoea / Cholera
    if (
      query.includes('diarrhea') ||
      query.includes('diarrhoea') ||
      query.includes('stool') ||
      query.includes('vomit') ||
      query.includes('gudawa') ||
      query.includes('amai') ||
      query.includes('cholera') ||
      query.includes('kwalara')
    ) {
      return {
        condition: 'Acute diarrhoea / Dehydration warning',
        advice:
          'Repeated watery diarrhoea can rapidly cause life-threatening dehydration. Prepare oral rehydration salts (ORS) with clean drinking water and drink after each loose stool. Continue feeding and breast milk.',
        urgency:
          'Seek urgent clinic care if there is blood in stool, persistent vomiting, sunken eyes, inability to drink, or extreme weakness.',
        confidence: 0.88,
      };
    }

    // Cough / Respiratory / Tuberculosis
    if (
      query.includes('cough') ||
      query.includes('tari') ||
      query.includes('chest') ||
      query.includes('breath') ||
      query.includes('sweat') ||
      query.includes('fuka')
    ) {
      return {
        condition: 'Respiratory / Persistent cough guidance',
        advice:
          'A cough lasting more than two weeks, night sweats, unexplained weight loss, fever, or coughing blood require formal assessment and sputum testing for tuberculosis or pneumonia.',
        urgency:
          'Visit a primary healthcare center or DOTS clinic. Seek urgent hospital care if breathing is rapid or difficult.',
        confidence: 0.82,
      };
    }

    // Meningitis
    if (
      query.includes('neck') ||
      query.includes('stiff') ||
      query.includes('sankarau') ||
      query.includes('headache') ||
      query.includes('ciwon kai')
    ) {
      if (query.includes('stiff') || query.includes('fever') || query.includes('light')) {
        return {
          condition: 'Meningitis warning signs',
          advice:
            'High fever accompanied by a stiff neck, sensitivity to bright light, severe headache, confusion, or vomiting are critical signs. Do not delay.',
          urgency: 'Immediate emergency hospital evaluation required.',
          confidence: 0.90,
        };
      }
    }

    // Skin concern / Rash
    if (
      query.includes('rash') ||
      query.includes('itch') ||
      query.includes('skin') ||
      query.includes('kurji') ||
      query.includes('fata') ||
      query.includes('blister') ||
      query.includes('wound')
    ) {
      return {
        condition: 'Skin concern / Dermatological screening',
        advice:
          'Keep the affected area clean and dry. Avoid sharing creams or applying unprescribed steroid creams. Wash with clean water and mild soap.',
        urgency:
          'Seek medical evaluation if redness spreads rapidly, pus develops, fever is present, or the eye/face is involved.',
        confidence: 0.80,
      };
    }

    // Yellowing / Jaundice
    if (
      query.includes('yellow') ||
      query.includes('jaundice') ||
      query.includes('shawara') ||
      query.includes('rawaya')
    ) {
      return {
        condition: 'Jaundice / Liver concern screening',
        advice:
          'Yellowing of the whites of the eyes or skin can indicate hepatitis, severe malaria hemolysis, or liver disease. Avoid alcohol and herbal concoctions.',
        urgency: 'Prompt clinical testing and doctor consultation recommended.',
        confidence: 0.86,
      };
    }

    // General symptoms
    return {
      condition: 'Symptoms need a health-worker assessment',
      advice: `Reported symptoms: "${symptomsText}". Keep a note of when symptoms started, temperature if available, fluids taken, and any medicines used. Avoid unverified medications.`,
      urgency: 'Seek care at your nearest clinic if symptoms are severe, sudden, or worsening.',
      confidence: 0.65,
    };
  }

  // If only photo is uploaded without text
  if (hasPhoto) {
    return {
      condition: 'Skin or visible health concern',
      advice:
        'A photo screening cannot replace a medical physical examination. Keep the affected skin clean and dry. Do not scratch or puncture lesions. Avoid applying harsh chemicals or shared creams.',
      urgency:
        'Seek professional care if you experience spreading redness, intense pain, fever, pus, or if lesions do not heal.',
      confidence: 0.70,
    };
  }

  return {
    condition: 'Symptoms need a health-worker assessment',
    advice:
      'Keep a note of symptoms, temperature if available, fluids taken, and any medicines used. Seek a health worker for testing.',
    urgency: 'Seek care if symptoms worsen.',
    confidence: 0.0,
  };
}
