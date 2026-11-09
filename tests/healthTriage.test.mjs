import test from 'node:test';
import assert from 'node:assert/strict';
import {
  triageEvaluate,
  extractSymptomsFromText,
  severityLabel,
  TRIAGE_SYMPTOMS,
  TRIAGE_RULES,
} from '../src/data/triageRules.ts';

// ---------------------------------------------------------------------------
// Test 1: Fever + Vomiting + Stiff Neck MUST return Emergency (Meningitis)
// ---------------------------------------------------------------------------
test('Fever + Vomiting + Stiff Neck returns Emergency (Meningitis)', () => {
  const result = triageEvaluate(['fever', 'vomiting', 'stiff_neck']);
  assert.equal(result.severity, 'Emergency');
  assert.equal(result.matchedRuleId, 'meningitis_emergency');
  assert.equal(result.conditionHausa, 'Ciwon Sankarau');
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
  assert.equal(result.conditionHausa, 'Zazzabin Cizon Sauro (Malaria)');
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
