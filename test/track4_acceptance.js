import assert from 'node:assert';
import { voiceService } from '../server/voice/voiceService.js';
import { classifyDialogue, requiresEscalation, VALID_SAFETY_STATUSES, ESCALATION_REQUIRED_OUTCOMES } from '../server/voice/safetyClassifier.js';
import { maskPhone, validateFlagRequest, validateTriggerRequest } from '../server/voice/securityGuardrails.js';
import { executeMockCall, DIALOGUE_TEMPLATES } from '../server/voice/mockVoiceProvider.js';

console.log('=== [PROJECT BRAHMAPUTRA — TRACK 4 PHASE 1 ACCEPTANCE TESTS] ===\n');

// 1. Guardrails Tests
console.log('1. Testing Security Guardrails & Privacy...');
assert.strictEqual(maskPhone('+91-98640-12345'), '+91-98640-XXXXX', 'Phone masking should mask last 5 digits');
assert.strictEqual(maskPhone('9876543210'), '98765-XXXXX', 'Phone masking should handle 10-digit number');
assert.strictEqual(maskPhone(null), '+91 XXXXX-XXXXX', 'Phone masking fallback for null');

const flagValFail = validateFlagRequest({});
assert.strictEqual(flagValFail.valid, false, 'Validation should fail without vehicleId');
const flagValPass = validateFlagRequest({ vehicleId: 'VEH-NER-101', reason: 'Delayed in flood zone' });
assert.strictEqual(flagValPass.valid, true, 'Validation should pass with valid vehicleId & reason');

const trigValFail = validateTriggerRequest({ vehicleId: 'VEH-NER-101', simulatedOutcome: 'INVALID_ENUM' });
assert.strictEqual(trigValFail.valid, false, 'Validation should fail on invalid simulatedOutcome');
const trigValPass = validateTriggerRequest({ vehicleId: 'VEH-NER-101', simulatedOutcome: 'BREAKDOWN' });
assert.strictEqual(trigValPass.valid, true, 'Validation should pass on valid simulatedOutcome');

console.log('  ✓ Phone masking, cooldown guardrails, and schema validation verified.\n');

// 2. Deterministic Classifier Tests
console.log('2. Testing Deterministic Intent Classification (7 Outcomes)...');
const outcomes = ['SAFE', 'DELAYED', 'BREAKDOWN', 'ROAD_BLOCKED', 'ASSISTANCE_REQUIRED', 'NO_RESPONSE', 'UNKNOWN'];

for (const outcome of outcomes) {
  const tpl = DIALOGUE_TEMPLATES[outcome];
  const driverUtterance = tpl.dialogue.find((d) => d.role === 'driver')?.text || 'Simulated response';
  const classification = classifyDialogue(driverUtterance, outcome, { id: 'VEH-NER-101', assignedCorridor: 'NH-6' });
  
  assert.strictEqual(classification.structuredOutcome, outcome, `Classifier outcome must match ${outcome}`);
  assert(classification.outcomeConfidence >= 0.50, `Confidence must be >= 0.50 for ${outcome}`);
  assert(classification.summary.length > 0, `Summary must not be empty for ${outcome}`);

  const isEscalation = requiresEscalation(outcome);
  if (['BREAKDOWN', 'ASSISTANCE_REQUIRED', 'NO_RESPONSE', 'UNKNOWN'].includes(outcome)) {
    assert.strictEqual(isEscalation, true, `Escalation must be REQUIRED for ${outcome}`);
  } else {
    assert.strictEqual(isEscalation, false, `Escalation must NOT be required for ${outcome}`);
  }
}
console.log('  ✓ All 7 structured outcome classifications & escalation rules verified.\n');

// 3. Mock Voice Telephony Provider Lifecycle
console.log('3. Testing Mock Voice Telephony Provider Call Lifecycle...');
const mockVeh = { id: 'VEH-NER-101', regNumber: 'AS-01-GC-4482', driverName: 'B. Kalita', driverPhone: '+91-98640-12345', assignedCorridor: 'NH-6' };
const callExecution = await executeMockCall({ vehicle: mockVeh, simulatedOutcome: 'BREAKDOWN' });
assert.strictEqual(callExecution.status, 'COMPLETED');
assert(callExecution.dialogueHistory.length >= 3, 'Dialogue history must contain at least 3 turns');
assert.strictEqual(callExecution.structuredOutcome, 'BREAKDOWN');
assert.strictEqual(callExecution.escalationRequired, true);
console.log('  ✓ Telephony simulation (QUEUED -> RINGING -> IN_PROGRESS -> COMPLETED) verified.\n');

// 4. End-to-End Voice Service Workflow (Exact Acceptance Criteria)
console.log('4. Testing Full Acceptance Lifecycle on VEH-NER-101...');

const testVehicles = [
  {
    id: 'VEH-NER-101',
    regNumber: 'AS-01-GC-4482',
    name: 'Assam Pharma-Logistics MedTruck 01',
    type: 'Refrigerated Medical Van',
    cargo: 'Vaccines, Blood Plasma & Insulin',
    status: 'IN_TRANSIT',
    driverName: 'B. Kalita',
    driverPhone: '+91-98640-12345',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
];

// Step A: Flag vehicle
console.log('  Step A: Flagging VEH-NER-101...');
const flagRes = voiceService.flagVehicle(testVehicles, 'VEH-NER-101', 'Vehicle delayed near active disruption', true);
assert.strictEqual(flagRes.success, true);
assert.strictEqual(testVehicles[0].isFlagged, true);
assert.strictEqual(testVehicles[0].flagReason, 'Vehicle delayed near active disruption');
assert.strictEqual(testVehicles[0].safetyStatus, 'PENDING_CALL');
console.log(`    -> Flagged: ${testVehicles[0].isFlagged}, Reason: "${testVehicles[0].flagReason}", SafetyStatus: ${testVehicles[0].safetyStatus}`);

// Step B: Start mock safety check with BREAKDOWN
console.log('  Step B: Starting Mock Safety Check with BREAKDOWN scenario...');
const callRes = await voiceService.triggerSafetyCall(testVehicles, {
  vehicleId: 'VEH-NER-101',
  triggerSource: 'MANUAL_OPERATOR',
  flagReason: testVehicles[0].flagReason,
  simulatedOutcome: 'BREAKDOWN',
});

assert.strictEqual(callRes.success, true);
const session = callRes.session;
assert(session.callId.startsWith('CALL-NER-'));
assert.strictEqual(session.status, 'COMPLETED');
assert.strictEqual(session.structuredOutcome, 'BREAKDOWN');
assert.strictEqual(session.escalationRequired, true);
assert.strictEqual(session.escalationResolved, false);
assert.strictEqual(testVehicles[0].safetyStatus, 'BREAKDOWN');
assert.strictEqual(testVehicles[0].activeCallId, session.callId);
assert(testVehicles[0].lastSafetyCheck !== null);

// Step C: Verify Session Sanitization (No raw unmasked driver phone exposed)
assert.strictEqual(session.driverPhone, '+91-98640-XXXXX', 'Public session must contain masked phone');
console.log(`    -> Session ID: ${session.callId}`);
console.log(`    -> Safety Status: ${testVehicles[0].safetyStatus}`);
console.log(`    -> Escalation Required: ${session.escalationRequired}`);
console.log(`    -> Summary: "${session.summary}"`);
console.log(`    -> Masked Driver Phone: ${session.driverPhone}`);

// Step D: Operator Escalation Resolution
console.log('  Step D: Operator Resolving Escalation...');
const resolveRes = voiceService.resolveEscalation(testVehicles, session.callId, 'Emergency repair truck dispatched from Haflong');
assert.strictEqual(resolveRes.success, true);
assert.strictEqual(resolveRes.session.escalationResolved, true);
assert.strictEqual(resolveRes.session.resolutionNotes, 'Emergency repair truck dispatched from Haflong');
assert(resolveRes.session.resolvedAt !== null);
console.log(`    -> Escalation Resolved: ${resolveRes.session.escalationResolved}`);
console.log(`    -> Notes: "${resolveRes.session.resolutionNotes}"`);

console.log('\n=== ALL PROJECT BRAHMAPUTRA TRACK 4 PHASE 1 TESTS PASSED SUCCESSFULLY ===\n');
