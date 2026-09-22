import assert from 'node:assert';
import { BaseVoiceProvider } from '../server/voice/providers/baseProvider.js';
import { MockVoiceProvider } from '../server/voice/providers/mockVoiceProvider.js';
import { RealVoiceProviderSkeleton } from '../server/voice/providers/realVoiceProviderSkeleton.js';
import { getVoiceProvider, resetVoiceProviderRegistry } from '../server/voice/providers/voiceProviderFactory.js';
import {
  BRAHMAPUTRA_AGENT_IDENTITY,
  SUPPORTED_LANGUAGES,
  buildSystemPrompt,
  buildGreetingMessage,
  GREETING_TEMPLATES,
} from '../server/voice/agentPrompt.js';
import { normalizeStructuredResult, OUTCOME_BOOLEAN_MATRIX } from '../server/voice/safetyClassifier.js';

console.log('=== [TRACK 4 PHASE 2A: VOICE PROVIDER ABSTRACTION & PROMPT TESTS] ===\n');

// 1. Abstract Base Class Enforcement
console.log('1. Testing BaseVoiceProvider Abstract Contract...');
assert.throws(
  () => new BaseVoiceProvider('test'),
  /Cannot construct BaseVoiceProvider instances directly/,
  'BaseVoiceProvider cannot be instantiated directly'
);

class IncompleteProvider extends BaseVoiceProvider {}
const incomplete = new IncompleteProvider('incomplete');
assert.rejects(() => incomplete.initiateCall({}), /initiateCall\(\) is not implemented/);
console.log('  ✓ BaseVoiceProvider interface contract enforced.');

// 2. Provider Factory & Provider Switching
console.log('2. Testing Provider Factory Resolution...');
resetVoiceProviderRegistry();
const mockProv = getVoiceProvider('mock');
assert(mockProv instanceof MockVoiceProvider, 'Should resolve MockVoiceProvider for "mock"');
assert.strictEqual(mockProv.name, 'mock');

resetVoiceProviderRegistry();
const realProv = getVoiceProvider('real-skeleton');
assert(realProv instanceof RealVoiceProviderSkeleton, 'Should resolve RealVoiceProviderSkeleton for "real-skeleton"');
console.log('  ✓ Provider factory dynamic resolution verified.');

// 3. Unconfigured Real Provider Guardrail
console.log('3. Testing Real Provider Unconfigured Guardrail...');
assert.throws(
  () => realProv.assertConfigured(),
  /Provider credentials are not configured/,
  'Real provider must reject unconfigured execution'
);
console.log('  ✓ Real provider credential guardrail enforced.');

// 4. Agent Identity & Prompt Architecture
console.log('4. Testing AI Driver Safety Agent Prompts & Languages...');
assert.strictEqual(BRAHMAPUTRA_AGENT_IDENTITY, 'Brahmaputra Driver Safety Assistant');
assert.strictEqual(SUPPORTED_LANGUAGES.length, 4);

const testVeh = {
  id: 'VEH-NER-101',
  regNumber: 'AS-01-GC-4482',
  driverName: 'B. Kalita',
  assignedCorridor: 'NH-6',
  cargo: 'Vaccines',
};

// Check greeting for all 4 languages
for (const lang of ['en', 'hi', 'as', 'bn']) {
  const greeting = buildGreetingMessage(testVeh, lang);
  assert(greeting.length > 20, `Greeting for ${lang} must not be empty`);
  assert(greeting.includes('AS-01-GC-4482') || greeting.includes('VEH-NER-101'), `Greeting must include vehicle reference for ${lang}`);

  const prompt = buildSystemPrompt({ vehicle: testVeh, language: lang, flagReason: 'Disruption near Sonapur' });
  assert(prompt.includes(BRAHMAPUTRA_AGENT_IDENTITY), `Prompt must contain identity for ${lang}`);
  assert(prompt.includes('NEVER pretend to be a human operator'), 'Prompt must include AI disclosure guardrail');
  assert(prompt.includes('NEVER promise that emergency services'), 'Prompt must include emergency dispatch guardrail');
}
console.log('  ✓ Multilingual prompt builder (en, hi, as, bn) and strict guardrails verified.');

// 5. Normalized 5-Tuple Structured Outcome
console.log('5. Testing Normalized 5-Tuple Boolean Flags Schema...');
const testCases = [
  { outcome: 'SAFE', expected: { driverSafe: true, vehicleOperational: true, roadPassable: true, assistanceRequired: false, esc: false } },
  { outcome: 'DELAYED', expected: { driverSafe: true, vehicleOperational: true, roadPassable: true, assistanceRequired: false, esc: false } },
  { outcome: 'BREAKDOWN', expected: { driverSafe: true, vehicleOperational: false, roadPassable: true, assistanceRequired: true, esc: true } },
  { outcome: 'ROAD_BLOCKED', expected: { driverSafe: true, vehicleOperational: true, roadPassable: false, assistanceRequired: false, esc: false } },
  { outcome: 'ASSISTANCE_REQUIRED', expected: { driverSafe: false, vehicleOperational: false, roadPassable: false, assistanceRequired: true, esc: true } },
  { outcome: 'NO_RESPONSE', expected: { driverSafe: false, vehicleOperational: false, roadPassable: true, assistanceRequired: true, esc: true } },
  { outcome: 'UNKNOWN', expected: { driverSafe: false, vehicleOperational: false, roadPassable: false, assistanceRequired: true, esc: true } },
];

for (const tc of testCases) {
  const normalized = normalizeStructuredResult({ outcome: tc.outcome });
  assert.strictEqual(normalized.outcome, tc.outcome);
  assert.strictEqual(normalized.driverSafe, tc.expected.driverSafe, `driverSafe failed for ${tc.outcome}`);
  assert.strictEqual(normalized.vehicleOperational, tc.expected.vehicleOperational, `vehicleOperational failed for ${tc.outcome}`);
  assert.strictEqual(normalized.roadPassable, tc.expected.roadPassable, `roadPassable failed for ${tc.outcome}`);
  assert.strictEqual(normalized.assistanceRequired, tc.expected.assistanceRequired, `assistanceRequired failed for ${tc.outcome}`);
  assert.strictEqual(normalized.escalationRequired, tc.expected.esc, `escalationRequired failed for ${tc.outcome}`);
}
console.log('  ✓ All 7 structured outcome 5-tuple boolean matrices verified.');

console.log('\n=== ALL TRACK 4 PHASE 2A ABSTRACTION TESTS PASSED ===\n');
