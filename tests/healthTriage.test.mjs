import test from 'node:test';
import assert from 'node:assert/strict';
import {
  triageEvaluate,
  extractSymptomsFromText,
  severityLabel,
  TRIAGE_SYMPTOMS,
  TRIAGE_RULES,
  notRecognizedResult,
  NOT_RECOGNIZED_RULE_ID,
  UNRECOGNIZED_INPUT_WARNING,
} from '../src/data/triageRules.ts';

// ---------------------------------------------------------------------------
// Test 1: Fever + Vomiting + Stiff Neck MUST return Emergency (Meningitis)
// ---------------------------------------------------------------------------
test('Fever + Vomiting + Stiff Neck returns Emergency (Meningitis)', () => {
  const result = triageEvaluate(['fever', 'vomiting', 'stiff_neck']);
  assert.equal(result.severity, 'Emergency');
  assert.equal(result.matchedRuleId, 'meningitis_emergency');
  assert.equal(result.conditionHausa, 'Cutar Sankarau');
  // Verify matched symptoms include all three
  const matchedIds = result.matchedSymptoms.map((s) => s.id);
  assert.ok(matchedIds.includes('fever'));
  assert.ok(matchedIds.includes('vomiting'));
  assert.ok(matchedIds.includes('stiff_neck'));
});

// ---------------------------------------------------------------------------
// Test 2: Fever + Chills (No stiff neck) MUST return Urgent (Malaria)
// ---------------------------------------------------------------------------
test('Fever + Chills (no stiff neck) returns Urgent (Malaria)', () => {
  const result = triageEvaluate(['fever', 'chills']);
  assert.equal(result.severity, 'Urgent');
  assert.equal(result.matchedRuleId, 'malaria_urgent');
  assert.equal(result.conditionHausa, 'Zazzabin Cizon Sauro');
});

// ---------------------------------------------------------------------------
// Test 3: Typing "Ina da zazzabi da taurin wuya" auto-selects fever + stiff_neck
// ---------------------------------------------------------------------------
test('extractSymptomsFromText maps Hausa keywords to symptom IDs', () => {
  const ids = extractSymptomsFromText('Ina da zazzabi da taurin wuya');
  assert.ok(ids.includes('fever'), 'Expected fever to be extracted from "zazzabi"');
  assert.ok(
    ids.includes('stiff_neck'),
    'Expected stiff_neck to be extracted from "taurin wuya"'
  );
  assert.equal(ids.length, 2, 'Expected exactly 2 symptoms matched');
});

// ---------------------------------------------------------------------------
// Test 4: extractSymptomsFromText maps English keywords too
// ---------------------------------------------------------------------------
test('extractSymptomsFromText maps English keywords to symptom IDs', () => {
  const ids = extractSymptomsFromText('fever and vomiting');
  assert.ok(ids.includes('fever'));
  assert.ok(ids.includes('vomiting'));
  assert.equal(ids.length, 2);
});

// ---------------------------------------------------------------------------
// Test 5: Severity label Hausa translations are correct
// ---------------------------------------------------------------------------
test('severityLabel returns correct Hausa translations', () => {
  assert.equal(severityLabel('Emergency', 'ha'), 'Gaggawa');
  assert.equal(severityLabel('Urgent', 'ha'), 'Matsakaici');
  assert.equal(severityLabel('Routine', 'ha'), 'Na Yau da Kullum');
  assert.equal(severityLabel('Emergency', 'en'), 'Emergency');
  assert.equal(severityLabel('Urgent', 'en'), 'Urgent Care');
  assert.equal(severityLabel('Routine', 'en'), 'Routine Care');
});

// ---------------------------------------------------------------------------
// Test 6: Fever + Vomiting + Stiff Neck + High Fever → Meningitis still wins
// ---------------------------------------------------------------------------
test('High fever does not override meningitis when stiff neck present', () => {
  const result = triageEvaluate(['high_fever', 'vomiting', 'stiff_neck']);
  assert.equal(result.severity, 'Emergency');
  assert.equal(result.matchedRuleId, 'meningitis_emergency');
});

// ---------------------------------------------------------------------------
// Test 7: Every symptom in TRIAGE_SYMPTOMS maps to at least one rule
// ---------------------------------------------------------------------------
test('Every symptom in catalogue maps to at least one triage rule', () => {
  const ruleSymptomIds = new Set();
  for (const rule of TRIAGE_RULES) {
    if (rule.requireOneOfSymptoms) {
      for (const id of rule.requireOneOfSymptoms) ruleSymptomIds.add(id);
    }
    if (rule.requireAllSymptoms) {
      for (const id of rule.requireAllSymptoms) ruleSymptomIds.add(id);
    }
    if (rule.requireOneOfEach) {
      for (const group of rule.requireOneOfEach) for (const id of group) ruleSymptomIds.add(id);
    }
    if (rule.excludeSymptoms) {
      for (const id of rule.excludeSymptoms) ruleSymptomIds.add(id);
    }
  }

  for (const symptom of TRIAGE_SYMPTOMS) {
    assert.ok(
      ruleSymptomIds.has(symptom.id),
      `Symptom "${symptom.id}" (${symptom.label}) is not referenced by any rule`
    );
  }
});

// ---------------------------------------------------------------------------
// Phantom results: empty input returns null (no result card)
// ---------------------------------------------------------------------------
test('triageEvaluate returns null for empty input', () => {
  assert.equal(triageEvaluate([]), null);
});

// ---------------------------------------------------------------------------
// Malaria requires Fever AND (Chills OR Headache)
// ---------------------------------------------------------------------------
test('Fever + Headache returns Malaria (Urgent)', () => {
  const result = triageEvaluate(['fever', 'headache']);
  assert.equal(result.matchedRuleId, 'malaria_urgent');
  assert.equal(result.severity, 'Urgent');
});

test('Headache alone falls through to fallback titled Ciwon Kai', () => {
  const result = triageEvaluate(['headache']);
  assert.equal(result.matchedRuleId, 'default_routine');
  assert.equal(result.severity, 'Routine');
  assert.equal(result.condition, 'Headache');
  assert.equal(result.conditionHausa, 'Ciwon Kai');
  assert.equal(
    result.action,
    'No emergency signs detected. Rest, drink clean water, and monitor your symptoms. Visit a hospital if the symptoms do not improve.'
  );
});

test('Chills alone does not match malaria (needs fever)', () => {
  const result = triageEvaluate(['chills']);
  assert.notEqual(result.matchedRuleId, 'malaria_urgent');
});

// ---------------------------------------------------------------------------
// Fallback titles
// ---------------------------------------------------------------------------
test('Single unmatched symptom uses its own bilingual title', () => {
  const result = triageEvaluate(['abdominal_pain']);
  assert.equal(result.matchedRuleId, 'default_routine');
  assert.equal(result.conditionHausa, 'Ciwon Ciki');
});

test('Multiple unmatched symptoms use the routine fallback title', () => {
  const result = triageEvaluate(['abdominal_pain', 'red_eyes']);
  assert.equal(result.matchedRuleId, 'default_routine');
  assert.equal(result.condition, 'General Symptoms');
  assert.equal(result.conditionHausa, 'Alamomi Na Yau da Kullum');
});

// ---------------------------------------------------------------------------
// Authoritative Hausa titles
// ---------------------------------------------------------------------------
test('Authoritative Hausa titles for rule conditions', () => {
  assert.equal(triageEvaluate(['snakebite']).conditionHausa, 'Cizon Maciji');
  assert.equal(triageEvaluate(['fever', 'vomiting', 'stiff_neck']).conditionHausa, 'Cutar Sankarau');
  assert.equal(triageEvaluate(['fever', 'chills']).conditionHausa, 'Zazzabin Cizon Sauro');
  assert.equal(
    triageEvaluate(['watery_diarrhea', 'vomiting']).conditionHausa,
    'Gudawa mai Hadari'
  );
  assert.equal(triageEvaluate(['fast_breathing', 'chest_indrawing']).conditionHausa, 'Ciwon Huhu');
  assert.equal(triageEvaluate(['high_fever', 'abdominal_pain']).conditionHausa, 'Zazzabin Taifod');
  assert.equal(triageEvaluate(['rash', 'red_eyes', 'fever']).conditionHausa, 'Kyanda');
  assert.equal(triageEvaluate(['fever', 'muscle_aches']).conditionHausa, 'Zazzabi');
});

// ---------------------------------------------------------------------------
// "Not recognized" state and bilingual warning
// ---------------------------------------------------------------------------
test('Not-recognized result uses the exact bilingual title and advice', () => {
  const r = notRecognizedResult();
  assert.equal(r.matchedRuleId, NOT_RECOGNIZED_RULE_ID);
  assert.equal(r.condition, 'Symptoms Not Recognized');
  assert.equal(r.conditionHausa, 'Ba a Gane Alamun Ba');
  assert.equal(
    r.actionHausa,
    'Ba mu gane takamaiman alamun da kuka rubuta ba. Don Allah danna maɓallan alamun da ke ƙasa don samun ingantaccen bincike.'
  );
  assert.deepEqual(r.matchedSymptoms, []);
});

test('Unrecognized input warning uses the exact bilingual strings', () => {
  assert.equal(
    UNRECOGNIZED_INPUT_WARNING.en,
    "We couldn't automatically detect specific symptoms. Please tap the symptom buttons below."
  );
  assert.equal(
    UNRECOGNIZED_INPUT_WARNING.ha,
    'Ba mu gane takamaiman alamun ba. Don Allah danna maɓallan alamun da ke ƙasa.'
  );
});
