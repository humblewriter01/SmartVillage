// Offline Rule-Based Health Triage Engine
// Based on WHO Integrated Management of Childhood Illness (IMCI) and NCDC protocols.
// Pure TypeScript/JSON logic — zero AI models, zero internet, 100% deterministic.
//
// Rule evaluation order: Emergency → Urgent → Routine.
// First matching rule wins (highest severity priority).
//
// Matching logic (all conditions must be satisfied):
//   requireOneOfSymptoms: at least one of these IDs must be present   (OR gate)
//   requireAllSymptoms:   all of these IDs must be present            (AND gate)
//   excludeSymptoms:      none of these IDs may be present            (NOT gate)

export type TriageSeverity = 'Emergency' | 'Urgent' | 'Routine';

export interface Symptom {
  id: string;
  label: string;      // English
  labelHausa: string; // Hausa
}

export interface TriageRule {
  id: string;
  condition: string;           // English
  conditionHausa: string;      // Hausa
  severity: TriageSeverity;
  // At least one of these symptom IDs must be present (OR gate)
  requireOneOfSymptoms?: string[];
  // All of these symptom IDs must be present (AND gate)
  requireAllSymptoms?: string[];
  // None of these symptom IDs may be present (NOT gate)
  excludeSymptoms?: string[];
  recommendedAction: string;   // English
  recommendedActionHausa: string; // Hausa
  firstAid?: string;
  firstAidHausa?: string;
  dangerSigns?: string;
  dangerSignsHausa?: string;
  confidence: number;
}

export interface TriageResult {
  severity: TriageSeverity;
  condition: string;
  conditionHausa: string;
  action: string;
  actionHausa: string;
  firstAid?: string;
  firstAidHausa?: string;
  dangerSigns?: string;
  dangerSignsHausa?: string;
  confidence: number;
  matchedRuleId: string;
  matchedSymptoms: Symptom[];
}

// ---------------------------------------------------------------------------
// Symptom catalogue (bilingual)
// ---------------------------------------------------------------------------

export const TRIAGE_SYMPTOMS: Symptom[] = [
  { id: 'fever', label: 'Fever', labelHausa: 'Zazzabi' },
  { id: 'high_fever', label: 'High Fever', labelHausa: 'Zazzabi mai zafi' },
  { id: 'chills', label: 'Chills / Shaking', labelHausa: 'Rawar sanyi' },
  { id: 'vomiting', label: 'Vomiting', labelHausa: 'Amai' },
  { id: 'vomiting_everything', label: 'Vomiting Everything', labelHausa: 'Amai dukka' },
  { id: 'convulsions', label: 'Convulsions / Fits', labelHausa: 'Farfadiya' },
  { id: 'unconscious', label: 'Unconscious / Cannot Wake', labelHausa: 'Ba a iya yi sumewa' },
  { id: 'watery_diarrhea', label: 'Watery Diarrhea', labelHausa: 'Gudawa mai zawayi' },
  { id: 'fast_breathing', label: 'Fast / Difficult Breathing', labelHausa: 'Numfashi mai sauri' },
  { id: 'chest_indrawing', label: 'Chest Drawing In (Indrawing)', labelHausa: 'Kirji ya shiga ciki' },
  { id: 'stiff_neck', label: 'Stiff Neck', labelHausa: 'Taurin wuya' },
  { id: 'snakebite', label: 'Snakebite', labelHausa: 'Cizon maciji' },
  { id: 'rash', label: 'Red Rash', labelHausa: 'Kurje jajaye' },
  { id: 'red_eyes', label: 'Red / Watery Eyes', labelHausa: 'Idanu jajaye' },
  { id: 'abdominal_pain', label: 'Stomach / Belly Pain', labelHausa: 'Ciwon ciki' },
  { id: 'headache', label: 'Headache', labelHausa: 'Ciwon kai' },
  { id: 'muscle_aches', label: 'Muscle / Body Aches', labelHausa: 'Ciwon gabobi' },
  { id: 'loss_of_appetite', label: 'Loss of Appetite', labelHausa: 'Da yawan gumi' },
  { id: 'fainting', label: 'Fainting / Dizziness', labelHausa: 'Sumewa / Jiri' },
  { id: 'hot_dry_skin', label: 'Hot Dry Skin', labelHausa: 'Fata mai zafi da buske' },
  { id: 'skin_rash', label: 'Itchy Skin Rash', labelHausa: 'Kurajen fata mai kaikayi' },
];

// Helper: look up a symptom by id
export function getSymptomById(id: string): Symptom | undefined {
  return TRIAGE_SYMPTOMS.find((s) => s.id === id);
}

// ---------------------------------------------------------------------------
// Bilingual keyword dictionary for free-text → symptom mapping
// ---------------------------------------------------------------------------

export const SYMPTOM_KEYWORD_MAP: Record<string, string[]> = {
  fever: ['fever', 'zazzabi', 'zazabi', 'hot', 'mai zafi', 'body hot'],
  high_fever: ['high fever', 'zazzabi mai zafi', 'very hot', 'severe fever'],
  chills: ['chills', 'rawar sanyi', 'shaking', 'cold', 'shivering'],
  vomiting: ['vomiting', 'amai', 'throw up', 'throwing up', 'nausea'],
  vomiting_everything: ['vomiting everything', 'amai dukka', 'vomits everything', 'cannot keep food'],
  convulsions: ['convulsions', 'fits', 'farfadiya', 'seizure', 'convulsion'],
  unconscious: ['unconscious', 'cannot wake', 'unresponsive', 'ba a iya yi sumewa'],
  watery_diarrhea: ['diarrhea', 'diarrhoea', 'gudawa', 'watery diarrhea', 'gudawa mai zawayi', 'loose stool'],
  fast_breathing: ['fast breathing', 'difficult breathing', 'numfashi mai sauri', 'breathless', 'short of breath'],
  chest_indrawing: ['chest indrawing', 'kirji ya shiga ciki', 'chest drawing in', 'chest pulling in'],
  stiff_neck: ['stiff neck', 'taurin wuya', 'neck stiffness', 'wuya', 'stiffneck', 'neck pain'],
  snakebite: ['snakebite', 'snake bite', 'cizon maciji', 'snake', 'bitten by snake'],
  rash: ['rash', 'red rash', 'kurje jajaye', 'skin rash', 'spots'],
  red_eyes: ['red eyes', 'watery eyes', 'idanu jajaye', 'red eyes', 'eye redness'],
  abdominal_pain: ['stomach pain', 'belly pain', 'abdominal pain', 'ciwon ciki', 'tummy pain'],
  headache: ['headache', 'ciwon kai', 'head pain'],
  muscle_aches: ['muscle aches', 'body aches', 'ciwon gabobi', 'body pain'],
  loss_of_appetite: ['loss of appetite', 'da yawan gumi', 'not eating', 'no appetite'],
  fainting: ['fainting', 'dizziness', 'sumewa', 'jiri', 'faint'],
  hot_dry_skin: ['hot dry skin', 'fata mai zafi da buske', 'dry skin', 'skin hot'],
  skin_rash: ['itchy skin rash', 'skin rash', 'kurajen fata mai kaikayi', 'scabies', 'itchy'],
};

// Extract symptom IDs from free-text input by matching keywords.
export function extractSymptomsFromText(text: string): string[] {
  const lower = text.toLowerCase().trim();
  if (!lower) return [];

  const found = new Set<string>();
  for (const [symptomId, keywords] of Object.entries(SYMPTOM_KEYWORD_MAP)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        found.add(symptomId);
        break; // one match per symptom is enough
      }
    }
  }
  return [...found];
}

// ---------------------------------------------------------------------------
// Triage rules (ordered by severity priority — first match wins)
// ---------------------------------------------------------------------------

export const TRIAGE_RULES: TriageRule[] = [
  // ─── EMERGENCY ───

  {
    id: 'snakebite_emergency',
    condition: 'Snakebite Emergency',
    conditionHausa: 'Gaggawa: Cizon Maciji',
    severity: 'Emergency',
    requireOneOfSymptoms: ['snakebite'],
    recommendedAction:
      'Go to hospital immediately. Keep the bitten limb still and below heart level. Do NOT cut, suck, or apply black stone or petrol.',
    recommendedActionHausa:
      'Koma asibiti nan take. Daure sanyayyen itace a hankali da yawan gaba ba. KADA a tsaga, a tsotsa, ko a saka dutsen magani / fetur.',
    firstAid:
      'Keep patient calm and still. Immobilize the bitten limb with a splint or cloth.',
    firstAidHausa:
      'Kwantar da mara lafiya ya natsu. Daure sanyayyen itace ko tsumma a hankali.',
    dangerSigns:
      'Bleeding from gums or nose, vomiting blood, paralysis, difficulty breathing.',
    dangerSignsHausa:
      'Jini fita daga hanci ko baki, aman jini, shanyewar jiki, numfashi mai wahala.',
    confidence: 0.98,
  },
  {
    id: 'meningitis_emergency',
    condition: 'Cerebrospinal Meningitis (CSM)',
    conditionHausa: 'Ciwon Sankarau',
    severity: 'Emergency',
    // Fever (any) + Stiff Neck → Suspected Meningitis (WHO IMCI: stiff neck overrides malaria)
    requireOneOfSymptoms: ['fever', 'high_fever'],
    requireAllSymptoms: ['stiff_neck'],
    recommendedAction:
      'Life-threatening emergency — stiff neck with fever requires immediate hospitalization and IV antibiotics. Do NOT treat as malaria.',
    recommendedActionHausa:
      'Gaggawa mai hadarin rai — taurin wuya da zazzabi zai bukatar kasuwar asibiti nan take. KADA a yi maganin malaria.',
    firstAid:
      'Do not delay at home with herbal medicines. Sponge body with cool water on the way to hospital.',
    firstAidHausa:
      'Kada a tsaya a gida da maganin gargajiya. Goge jiki da ruwa a nufi asibiti.',
    dangerSigns:
      'Seizures, inability to wake up, arched back rigidity, purple bruising rash.',
    dangerSignsHausa:
      'Farfadiya, kasa sumewa, taurin baya, kuraje mai launin shunayya.',
    confidence: 0.97,
  },
  {
    id: 'severe_febrile_convulsions_emergency',
    condition: 'Severe Febrile Disease with Convulsions',
    conditionHausa: 'Zazzabi mai Gaggawa da Farfadiya',
    severity: 'Emergency',
    // Fever + Convulsions → Severe Febrile Disease (general danger sign)
    requireOneOfSymptoms: ['fever', 'high_fever'],
    requireAllSymptoms: ['convulsions'],
    recommendedAction:
      'Emergency — fever with convulsions is life-threatening. Go to hospital immediately.',
    recommendedActionHausa:
      'Gaggawa — zazzabi da farfadiya ya iya kashe. Koma asibiti nan take.',
    firstAid:
      'Protect from injury during convulsions. Do not put anything in the mouth. Sponge with cool water.',
    firstAidHausa:
      'Kware da rashin shafa lokacin farfadiya. KADA a saka abu a cikin wani. Goge jiki da ruwa mai sanyi.',
    dangerSigns:
      'Prolonged convulsions, breathing difficulty, blue lips, recurrent seizures.',
    dangerSignsHausa:
      'Farfadiya ya tsaya yawan sa\'o, numfashi mai wahala, leɓe a hannu, farfadiya saute-saute.',
    confidence: 0.96,
  },
  {
    id: 'severe_febrile_unconscious_emergency',
    condition: 'Severe Febrile Disease with Unconsciousness',
    conditionHausa: 'Zazzabi mai Gaggawa da Sumewa',
    severity: 'Emergency',
    // Fever + Unconscious → Severe Febrile Disease
    requireOneOfSymptoms: ['fever', 'high_fever'],
    requireAllSymptoms: ['unconscious'],
    recommendedAction:
      'Emergency — fever with unconsciousness requires immediate hospital care.',
    recommendedActionHausa:
      'Gaggawa — zazzabi da ba a iya yi sumewa zai bukatar kasuwar asibiti nan take.',
    firstAid:
      'Place in recovery position. Keep airway clear. Do not give food or drink by mouth.',
    firstAidHausa:
      'Sanya a cikin kyautar hankali. Rubuta hanyar fitsari. Kada a ba abinci ko ruwa a cikin wani.',
    dangerSigns:
      'Deep coma, breathing stops, no response to pain, pinpoint pupils.',
    dangerSignsHausa:
      'Sumewa mai kyau, numfashi ya sha, ba a yi zumunci a cikin ciwo, dagumai dushi.',
    confidence: 0.96,
  },
  {
    id: 'severe_febrile_vomiting_emergency',
    condition: 'Severe Febrile Disease with Persistent Vomiting',
    conditionHausa: 'Zazzabi mai Gaggawa da Amai Dukka',
    severity: 'Emergency',
    // Fever + Vomiting Everything → Severe Febrile Disease
    requireOneOfSymptoms: ['fever', 'high_fever'],
    requireAllSymptoms: ['vomiting_everything'],
    recommendedAction:
      'Emergency — fever with persistent vomiting can cause rapid dehydration. Go to hospital immediately.',
    recommendedActionHausa:
      'Gaggawa — zazzabi da amai dukka zai iya kashe rashin ruwa a jiki nan take. Koma asibiti nan take.',
    firstAid:
      'Give small frequent sips of ORS or clean water. Do not give large amounts at once.',
    firstAidHausa:
      'Ba da cikakken cikakken ruwan ORS ko ruwa mai tsabta a kai-a-kai. Kada a ba ruwa yawan motsi a yawan sa\'o.',
    dangerSigns:
      'Sunken eyes, no urine, lethargy, blood in vomit.',
    dangerSignsHausa:
      'Idanu sun fada ciki, rashin fitsari, barci, jini a amai.',
    confidence: 0.95,
  },
  {
    id: 'cholera_dehydration_emergency',
    condition: 'Cholera & Acute Dehydration',
    conditionHausa: 'Kwalara da Rashin Ruwa mai Tsanani',
    severity: 'Emergency',
    requireAllSymptoms: ['watery_diarrhea', 'vomiting'],
    recommendedAction:
      'Critical emergency — give Oral Rehydration Solution (ORS) continuously and rush to the nearest hospital or Cholera Treatment Unit immediately.',
    recommendedActionHausa:
      'Gaggawa mai kyau — sha ruwan ORS a kai-a-kai da kai asibitin kusa ko CTU nan take.',
    firstAid:
      'Mix 1 packet ORS in 1 litre of clean boiled water. Give cupfuls after every stool. Keep drinking even while travelling.',
    firstAidHausa:
      'Haɗa ORS a litar ruwa 1 mai tafasa. Sha bayan kowanne zawayi. Koyon sha ruwa.',
    dangerSigns:
      'Sunken eyes, skin pinch stays pinched, no urine for over 6 hours, cold clammy hands, lethargy.',
    dangerSignsHausa:
      'Idanu sun fada ciki, fatar ciki ba ta komawa, rashin fitsari sama da sa\'o 6, hannaye da kafafu.',
    confidence: 0.97,
  },
  {
    id: 'pneumonia_emergency',
    condition: 'Severe Pneumonia / Acute Respiratory Infection',
    conditionHausa: 'Ciwon Kirji mai Tsanani',
    severity: 'Emergency',
    requireAllSymptoms: ['fast_breathing', 'chest_indrawing'],
    recommendedAction:
      'Immediate emergency care — fast breathing with chest indrawing is life-threatening, especially in children. Go to hospital now.',
    recommendedActionHausa:
      'Taimakon gaggawa nan take — numfashi da sauri na kirji hadari ya iya kashe, turare ga yara. Koma asibiti yanzu.',
    firstAid:
      'Keep child upright and supported. Keep warm but not suffocating. Encourage frequent sips of warm fluid or breastmilk.',
    firstAidHausa:
      'Sanya yaro ya zauna a jingine. Rike shi a wuri mai dumi. Bashi ruwan zafi a kai-a-kai.',
    dangerSigns:
      'Bluish lips/tongue, inability to drink or breastfeed, extreme sleepiness, grunting with each breath.',
    dangerSignsHausa:
      'Leɓe / harshe ya koma bulawa, kasa shan nono, barci marar motsi, kukan zafin kirji.',
    confidence: 0.96,
  },

  // ─── URGENT ───

  {
    id: 'malaria_urgent',
    condition: 'Malaria (Suspected)',
    conditionHausa: 'Zazzabin Cizon Sauro (Malaria)',
    severity: 'Urgent',
    // Fever or chills, but NOT stiff neck (stiff neck = meningitis, not malaria)
    requireOneOfSymptoms: ['high_fever', 'chills', 'fever'],
    excludeSymptoms: ['stiff_neck'],
    recommendedAction:
      'Prompt medical care within 24 hours. Confirm with Rapid Diagnostic Test (RDT) before starting Artemisinin-based Combination Therapy (ACT).',
    recommendedActionHausa:
      'Nemi magani cikin sa\'o\'i 24. Tabbatar da cutar RDT kafin shan maganin ACT.',
    firstAid:
      'Take paracetamol for high fever. Sponge with room-temperature water. Drink clean water or ORS.',
    firstAidHausa:
      'Sha paracetamol domin zafin jiki. Goge jiki da ruwa ɗumi-ɗumi. Sha ruwa mai tsabta ko ORS.',
    dangerSigns:
      'Convulsions, unconsciousness, dark urine, yellow eyes, inability to retain fluids.',
    dangerSignsHausa:
      'Farfadiya, numfashi, fitsari mai rawaya, idanu masu rawaya.',
    confidence: 0.92,
  },
  {
    id: 'measles_urgent',
    condition: 'Measles (Rubeola)',
    conditionHausa: 'Ciwon Kyanda',
    severity: 'Urgent',
    requireAllSymptoms: ['rash', 'red_eyes', 'fever'],
    recommendedAction:
      'Highly contagious — isolate the patient, protect the eyes, give Vitamin A, and visit a health centre immediately.',
    recommendedActionHausa:
      'Mai yaduwa mai kyau — ware mara lafiya, kula da idanu, ba da Vitamin A, je asibiti nan take.',
    firstAid:
      'Isolate in a darkened, well-ventilated room. Give Vitamin A drops. Sponge fever with clean water.',
    firstAidHausa:
      'Keɓe a daki mai iska marar haske. Ba da kifin Vitamin A. Goge jiki da ruwa mai tsabta.',
    dangerSigns:
      'Corneal cloudiness, rapid breathing, severe earache with pus, mouth ulcers preventing swallowing.',
    dangerSignsHausa:
      'Fari a ido, numfashi mai sauri, ciwon kunne mai ruwaya, ciwukan baki.',
    confidence: 0.91,
  },
  {
    id: 'typhoid_urgent',
    condition: 'Enteric / Typhoid Fever',
    conditionHausa: 'Zazzabin Taifot',
    severity: 'Urgent',
    requireAllSymptoms: ['high_fever', 'abdominal_pain'],
    recommendedAction:
      'Doctor consultation and lab confirmation required. Prescription antibiotics are strictly needed — do not stop early.',
    recommendedActionHausa:
      'Shawarar likita da gwaji buɗe ba tare da an gama ba. Maganin cuta (antibiotics) zai buɗe.',
    firstAid:
      'Drink exclusively boiled or bottled water. Eat soft, easily digestible foods. Rest completely.',
    firstAidHausa:
      'Sha ruwan da aka tafasa kawai. Ci abinci mai laushi. Huta sosai.',
    dangerSigns:
      'Sudden agonizing belly pain with rigid hardness, vomiting blood, delirium.',
    dangerSignsHausa:
      'Ciwon ciki mai tsanani da taurin ciki, aman jini, susucewa.',
    confidence: 0.89,
  },
  {
    id: 'heat_stroke_urgent',
    condition: 'Heat Stroke / Heat Exhaustion',
    conditionHausa: 'Zafin Rana / Karin Hasken Rana',
    severity: 'Urgent',
    requireAllSymptoms: ['hot_dry_skin', 'fainting'],
    recommendedAction:
      'Cool down immediately — move to shade, remove excess clothing, pour cool water over head and neck, and seek urgent care.',
    recommendedActionHausa:
      'Saukar da zafin jiki nan take — kwashe zuwa inuwa, cire mayafi, zuba ruwa mai sanyi a kai da wuya, nemi taimako gaggawa.',
    firstAid:
      'Fan vigorously, pour cool water over head/neck/chest, offer cool salted water or kunu if conscious.',
    firstAidHausa:
      'Zuba ruwa mai sanyi a kai, wuya, da kirji. Sha ruwa a hankali.',
    dangerSigns:
      'Loss of consciousness, delirium, seizures, vomiting while unconscious.',
    dangerSignsHausa:
      'Sumewa, hauka, farfadiya, amai a lokacin sumewa.',
    confidence: 0.90,
  },
  {
    id: 'dehydration_urgent',
    condition: 'Moderate Dehydration',
    conditionHausa: 'Rashin Ruwa mai Matsakaici',
    severity: 'Urgent',
    requireOneOfSymptoms: ['watery_diarrhea', 'vomiting'],
    recommendedAction:
      'Give Oral Rehydration Solution (ORS) frequently. If symptoms do not improve within a few hours or worsen, go to hospital immediately.',
    recommendedActionHausa:
      'Sha ORS a kai-a-kai. Idan alamomi ba sa aikata ko su tsaye, koma asibiti nan take.',
    firstAid:
      'Mix ORS in clean boiled water. Give sips after every loose stool. Continue breastfeeding infants.',
    firstAidHausa:
      'Haɗa ORS a ruwa mai tsabta da aka tafasa. Sha a kai-a-kai bayan zawayi.',
    dangerSigns:
      'Sunken eyes, no tears, no urine for over 6 hours, lethargy.',
    dangerSignsHausa:
      'Idanu sun fada ciki, rashin hawaye, rashin fitsari sama da 6, barci.',
    confidence: 0.88,
  },

  // ─── ROUTINE ───

  {
    id: 'general_fever_routine',
    condition: 'General Fever / Possible Malaria',
    conditionHausa: 'Zazzabi / Malaria (Kudin Tabbaci)',
    severity: 'Routine',
    // Fever without stiff neck or danger signs
    requireOneOfSymptoms: [
      'fever',
      'headache',
      'muscle_aches',
      'loss_of_appetite',
    ],
    excludeSymptoms: ['stiff_neck', 'convulsions', 'unconscious', 'vomiting_everything'],
    recommendedAction:
      'Visit a local clinic or health post for a Rapid Diagnostic Test (RDT). Rest, drink clean water, and take paracetamol for fever.',
    recommendedActionHausa:
      'Je asibiti ko wurin shan magani domin cutar RDT. Huta, sha ruwa mai tsabta, sha paracetamol domin zazzabi.',
    firstAid:
      'Rest in a cool place. Drink plenty of fluids. Sponge with room-temperature water.',
    firstAidHausa:
      'Huta a inuwa mai iska. Sha ruwa sosai. Goge jiki da ruwa ɗumi-ɗumi.',
    dangerSigns:
      'Fever lasting more than 3 days, convulsions, confusion, difficulty breathing.',
    dangerSignsHausa:
      'Zazzabi ya tsaya yawan sa\'o biyu, farfadiya, susucewa, numfashi mai wahala.',
    confidence: 0.85,
  },
  {
    id: 'skin_rash_routine',
    condition: 'Skin Rash / Possible Scabies',
    conditionHausa: 'Kurajen Fata / Makero (Kudin Tabbaci)',
    severity: 'Routine',
    requireOneOfSymptoms: ['skin_rash', 'rash'],
    recommendedAction:
      'Keep affected skin clean and dry with mild soap. Bathe regularly and wash bedding in hot water. Treat all household contacts at the same time.',
    recommendedActionHausa:
      'Wanke wurin mai shafa mai tsabta da sabulu marar zafi. Yi wanka kare-kare. Magani duk mutanen gida a rana guda.',
    firstAid:
      'Bathe with clean water and mild soap. Avoid scratching. Apply soothing lotion if available.',
    firstAidHausa:
      'Yi wanka da ruwa mai tsabta da sabulu. Kada a shafa man inji.',
    dangerSigns:
      'Yellow crusty pus, spreading boils, fever with rash.',
    dangerSignsHausa:
      'Mugunya mai ruwa rawaya, kuraje masu yaduwa, zazzabi da kurje.',
    confidence: 0.84,
  },
];

// ---------------------------------------------------------------------------
// Forward-chaining rule engine
// ---------------------------------------------------------------------------

/**
 * Evaluates an array of selected symptom IDs against the triage rules.
 * Rules are checked in order of severity priority (Emergency first).
 * A rule matches only when ALL its conditions are satisfied:
 *   - requireOneOfSymptoms: at least one ID present (OR)
 *   - requireAllSymptoms:   all IDs present (AND)
 *   - excludeSymptoms:      none of the IDs present (NOT)
 * Returns the first (highest-severity) matching rule, or a default Routine result.
 */
export function triageEvaluate(selectedSymptomIds: string[]): TriageResult {
  const selected = new Set(selectedSymptomIds.map((id) => id.toLowerCase().trim()));

  // Forward-chain: evaluate rules in priority order, first match wins.
  for (const rule of TRIAGE_RULES) {
    let matched = true;

    // requireOneOfSymptoms: at least one must be present
    if (
      rule.requireOneOfSymptoms &&
      rule.requireOneOfSymptoms.length > 0
    ) {
      matched =
        matched &&
        rule.requireOneOfSymptoms.some((id) =>
          selected.has(id.toLowerCase().trim())
        );
    }

    // requireAllSymptoms: all must be present
    if (matched && rule.requireAllSymptoms && rule.requireAllSymptoms.length > 0) {
      matched =
        matched &&
        rule.requireAllSymptoms.every((id) =>
          selected.has(id.toLowerCase().trim())
        );
    }

    // excludeSymptoms: none must be present
    if (matched && rule.excludeSymptoms && rule.excludeSymptoms.length > 0) {
      matched =
        matched &&
        !rule.excludeSymptoms.some((id) =>
          selected.has(id.toLowerCase().trim())
        );
    }

    if (matched) {
      const matchedSymptoms = TRIAGE_SYMPTOMS.filter((s) => selected.has(s.id));
      return {
        severity: rule.severity,
        condition: rule.condition,
        conditionHausa: rule.conditionHausa,
        action: rule.recommendedAction,
        actionHausa: rule.recommendedActionHausa,
        firstAid: rule.firstAid,
        firstAidHausa: rule.firstAidHausa,
        dangerSigns: rule.dangerSigns,
        dangerSignsHausa: rule.dangerSignsHausa,
        confidence: rule.confidence,
        matchedRuleId: rule.id,
        matchedSymptoms,
      };
    }
  }

  // No rule matched — default Routine guidance.
  return {
    severity: 'Routine',
    condition: 'General Symptoms — Monitor',
    conditionHausa: 'Alamomin Aiki — Ji Albarkatar',
    action:
      'No clear emergency pattern detected. Keep hydrated with clean water, rest, and note when symptoms started. Visit a health centre if symptoms persist or worsen.',
    actionHausa:
      'Babu babban pattern gaggawa ta hanyar gaya. Sha ruwa mai tsafta, huta, da rubuta ranar da matsalar ta fara. Je asibiti idan matsalar ta dore.',
    confidence: 0.70,
    matchedRuleId: 'default_routine',
    matchedSymptoms: TRIAGE_SYMPTOMS.filter((s) => selected.has(s.id)),
  };
}

// ---------------------------------------------------------------------------
// Severity label helpers (bilingual)
// ---------------------------------------------------------------------------

export function severityLabel(severity: TriageSeverity, locale: 'en' | 'ha'): string {
  const labels: Record<TriageSeverity, { en: string; ha: string }> = {
    Emergency: { en: 'Emergency', ha: 'Gaggawa' },
    Urgent: { en: 'Urgent Care', ha: 'Matsakaici' },
    Routine: { en: 'Routine Care', ha: 'Na Yau da Kullum' },
  };
  return locale === 'ha' ? labels[severity].ha : labels[severity].en;
}
