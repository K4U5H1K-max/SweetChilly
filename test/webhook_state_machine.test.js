import assert from 'node:assert';
import {
  processStatusWebhook,
  isValidStateTransition,
  TELEPHONY_STATUSES,
  VALID_TRANSITIONS,
} from '../server/voice/webhookHandler.js';
import { voiceService } from '../server/voice/voiceService.js';
import { resetVoiceProviderRegistry } from '../server/voice/providers/voiceProviderFactory.js';

console.log('=== [TRACK 4 PHASE 2A: WEBHOOK & TELEPHONY STATE MACHINE TESTS] ===\n');

// 1. Telephony State Machine Transition DAG
console.log('1. Testing State Transition Validation Rules...');
assert.strictEqual(isValidStateTransition('QUEUED', 'CALL_INITIATED'), true);
assert.strictEqual(isValidStateTransition('CALL_INITIATED', 'RINGING'), true);
assert.strictEqual(isValidStateTransition('RINGING', 'ANSWERED'), true);
assert.strictEqual(isValidStateTransition('ANSWERED', 'IN_PROGRESS'), true);
assert.strictEqual(isValidStateTransition('IN_PROGRESS', 'COMPLETED'), true);
assert.strictEqual(isValidStateTransition('RINGING', 'NO_ANSWER'), true);
assert.strictEqual(isValidStateTransition('RINGING', 'BUSY'), true);

// Invalid backwards or terminal transitions
assert.strictEqual(isValidStateTransition('COMPLETED', 'RINGING'), false, 'COMPLETED cannot transition to RINGING');
assert.strictEqual(isValidStateTransition('FAILED', 'IN_PROGRESS'), false, 'FAILED cannot transition to IN_PROGRESS');
assert.strictEqual(isValidStateTransition('BUSY', 'ANSWERED'), false, 'BUSY cannot transition to ANSWERED');
console.log('  ✓ State transition validation graph verified.');

// 2. Webhook Processor Integration
console.log('2. Testing Webhook Status Processing & Protections...');

const testVehicles = [
  {
    id: 'VEH-NER-204',
    regNumber: 'ML-05-E-9012',
    name: 'Meghalaya Essential Food Supply 04',
    driverName: 'S. Marak',
    driverPhone: '+91-94361-23456',
    safetyStatus: 'NOT_CHECKED',
  },
];

// Seed a call session
const triggerRes = await voiceService.triggerSafetyCall(testVehicles, {
  vehicleId: 'VEH-NER-204',
  simulatedOutcome: 'SAFE',
  forceOverride: true,
});
const testCallId = triggerRes.session.callId;

// A. Unknown Call ID -> 200 UNMATCHED_CALL (Graceful Acknowledgment)
console.log('  Step A: Unknown Call ID Acknowledgment...');
const unknownRes = await processStatusWebhook({
  headers: {},
  body: { callId: 'CALL-NER-9999', status: 'RINGING' },
});
assert.strictEqual(unknownRes.statusCode, 200);
assert.strictEqual(unknownRes.body.received, true);
assert.strictEqual(unknownRes.body.processed, false);
assert.strictEqual(unknownRes.body.reason, 'UNMATCHED_CALL');
console.log('    -> 200 (UNMATCHED_CALL) correctly returned to prevent provider retries.');

// B. Invalid Status -> 400
console.log('  Step B: Invalid Status Rejection...');
const invalidStatusRes = await processStatusWebhook({
  headers: {},
  body: { callId: testCallId, status: 'EXPLODED' },
});
assert.strictEqual(invalidStatusRes.statusCode, 400);
console.log('    -> 400 correctly returned for unmapped status.');

// C. Valid Telephony Update -> 200
console.log('  Step C: Valid Lifecycle Progression...');
// Reset session status to QUEUED for state transition simulation
const rawSession = voiceService.getRawSessionById(testCallId);
rawSession.status = 'QUEUED';

const initiatedRes = await processStatusWebhook({
  headers: {},
  body: { callId: testCallId, status: 'CALL_INITIATED', eventId: `EVT-${Date.now()}-1` },
});
assert.strictEqual(initiatedRes.statusCode, 200);

const ringingRes = await processStatusWebhook({
  headers: {},
  body: { callId: testCallId, status: 'RINGING', eventId: `EVT-${Date.now()}-2` },
});
assert.strictEqual(ringingRes.statusCode, 200);

const answeredRes = await processStatusWebhook({
  headers: {},
  body: { callId: testCallId, status: 'ANSWERED', eventId: `EVT-${Date.now()}-3` },
});
assert.strictEqual(answeredRes.statusCode, 200);

const completedEventId = `EVT-COMPLETED-${Date.now()}`;
const completedRes = await processStatusWebhook({
  headers: {},
  body: {
    callId: testCallId,
    status: 'COMPLETED',
    eventId: completedEventId,
    transcript: 'Driver confirmed all clear.',
    rawOutcome: { outcome: 'SAFE', confidence: 0.95 },
  },
});
assert.strictEqual(completedRes.statusCode, 200);
console.log('    -> Webhook successfully advanced session through lifecycle to COMPLETED.');

// D. Invalid Transition after Completion -> 409
console.log('  Step D: Invalid State Transition Rejection (Terminal State)...');
const conflictRes = await processStatusWebhook({
  headers: {},
  body: { callId: testCallId, status: 'RINGING', eventId: `EVT-${Date.now()}-5` },
});
assert.strictEqual(conflictRes.statusCode, 409);
console.log('    -> 409 Conflict correctly returned for illegal backwards transition.');

// E. Idempotency (Duplicate Event)
console.log('  Step E: Duplicate Event Idempotency Check...');
const dupRes = await processStatusWebhook({
  headers: {},
  body: { callId: testCallId, status: 'COMPLETED', eventId: completedEventId },
});
assert.strictEqual(dupRes.statusCode, 200);
assert.strictEqual(dupRes.body.message.includes('idempotent'), true);
console.log('    -> Duplicate event cleanly acknowledged as idempotent.');

console.log('\n=== ALL WEBHOOK & STATE MACHINE TESTS PASSED ===\n');
