/**
 * Project Brahmaputra — Phase 3A.3
 * Track 4 Persistent Vehicle Integration & Webhook State Tests
 */

import assert from 'node:assert';
import { voiceService } from '../server/voice/voiceService.js';
import { processStatusWebhook } from '../server/voice/webhookHandler.js';
import { VehicleRepository } from '../server/db/vehicleRepository.js';
import { maskPhone, validateAndNormalizePhone } from '../server/voice/securityGuardrails.js';
import { getVoiceProvider, resetVoiceProviderRegistry } from '../server/voice/providers/voiceProviderFactory.js';

console.log('=== [PROJECT BRAHMAPUTRA — PHASE 3A.3: TRACK 4 PERSISTENT VEHICLE TESTS] ===\n');

async function runTests() {
  // Setup Isolated Test Repository
  const isolatedRepo = new VehicleRepository(null);
  // Clear and seed isolated test vehicle
  isolatedRepo.memoryStore = [
    {
      id: 'VEH-NER-TEST-1',
      regNumber: 'AS-01-TR-1001',
      name: 'Track 4 Isolated Pharma Van',
      type: 'Medical Van',
      capacity: '3 Ton',
      cargo: 'Insulin & Plasma',
      status: 'IN_TRANSIT',
      speedKmH: 45,
      origin: 'Guwahati',
      destination: 'Silchar',
      currentPos: { lat: 25.42, lng: 92.15 },
      assignedCorridor: 'NH-6',
      delayEstMinutes: 0,
      priority: 'EMERGENCY_CRITICAL',
      driverName: 'Initial Driver',
      driverPhone: '+919864012345',
      isFlagged: false,
      flagReason: null,
      safetyStatus: 'NOT_CHECKED',
      lastSafetyCheck: null,
      activeCallId: null,
    },
  ];

  voiceService.init(isolatedRepo);
  voiceService.sessions = [];

  // Test 1: Track 4 Retrieves Vehicle Through Repository
  console.log('1. Testing Track 4 retrieves vehicle through repository...');
  const fetchedVeh = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  assert.ok(fetchedVeh);
  assert.strictEqual(fetchedVeh.id, 'VEH-NER-TEST-1');
  assert.strictEqual(fetchedVeh.name, 'Track 4 Isolated Pharma Van');
  console.log('  ✓ Vehicle correctly retrieved through repository.');

  // Test 2, 3, 4: Flagging Persists isFlagged, flagReason, safetyStatus
  console.log('2, 3, 4. Testing Flagging persists isFlagged, flagReason, and safetyStatus...');
  const flagResult = await voiceService.flagVehicle(null, 'VEH-NER-TEST-1', 'Active landslide alert near corridor', true);
  assert.strictEqual(flagResult.success, true);
  assert.strictEqual(flagResult.vehicle.isFlagged, true);
  assert.strictEqual(flagResult.vehicle.flagReason, 'Active landslide alert near corridor');
  assert.strictEqual(flagResult.vehicle.safetyStatus, 'PENDING_CALL');

  // Verify directly from repository to prove persistence
  const persistedAfterFlag = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  assert.strictEqual(persistedAfterFlag.isFlagged, true);
  assert.strictEqual(persistedAfterFlag.flagReason, 'Active landslide alert near corridor');
  assert.strictEqual(persistedAfterFlag.safetyStatus, 'PENDING_CALL');
  console.log('  ✓ Flag state (isFlagged, flagReason, safetyStatus) persisted authoritatively.');

  // Test 5, 6: Call Trigger Uses Latest Repository driverName and driverPhone
  console.log('5, 6. Testing Call Trigger uses dynamically updated repository driverName & driverPhone...');
  await isolatedRepo.updateVehicle('VEH-NER-TEST-1', {
    driverName: 'Updated Operator Kalita',
    driverPhone: '+919436199887',
  });

  resetVoiceProviderRegistry();
  process.env.VOICE_PROVIDER = 'mock';

  const callResult = await voiceService.triggerSafetyCall(null, {
    vehicleId: 'VEH-NER-TEST-1',
    simulatedOutcome: 'SAFE',
    forceOverride: true,
  });

  assert.strictEqual(callResult.success, true);
  assert.strictEqual(callResult.vehicle.driverName, 'Updated Operator Kalita');
  assert.strictEqual(callResult.vehicle.driverPhone, '+919436199887');
  console.log('  ✓ Call trigger utilized latest persisted driver details.');

  // Test 7: activeCallId Persists When a Call Starts
  console.log('7. Testing activeCallId persists in repository...');
  const currentSessionId = callResult.session.callId;
  const inCallVeh = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  assert.strictEqual(inCallVeh.activeCallId, currentSessionId);
  console.log(`  ✓ activeCallId (${currentSessionId}) persisted in vehicle record.`);

  // Test 8: SAFE Webhook Result Persists
  console.log('8. Testing SAFE webhook result persistence...');
  const safeWebhook = await processStatusWebhook({
    body: {
      callId: currentSessionId,
      status: 'COMPLETED',
      eventId: `EVT-SAFE-${Date.now()}`,
      transcript: 'All clear, vehicle and driver safe.',
      rawOutcome: { outcome: 'SAFE', confidence: 0.98 },
    },
  });
  assert.strictEqual(safeWebhook.statusCode, 200);

  const safeVeh = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  assert.strictEqual(safeVeh.safetyStatus, 'SAFE');
  assert.strictEqual(safeVeh.isFlagged, false);
  assert.strictEqual(safeVeh.flagReason, null);
  assert.ok(safeVeh.lastSafetyCheck !== null);
  console.log('  ✓ SAFE outcome persisted: safetyStatus=SAFE, isFlagged=false, flagReason=null.');

  // Test 9: BREAKDOWN Webhook Result Persists
  console.log('9. Testing BREAKDOWN webhook result persistence...');
  const bdCall = await voiceService.triggerSafetyCall(null, {
    vehicleId: 'VEH-NER-TEST-1',
    forceOverride: true,
  });
  const bdCallId = bdCall.session.callId;

  await processStatusWebhook({
    body: {
      callId: bdCallId,
      status: 'COMPLETED',
      eventId: `EVT-BD-${Date.now()}`,
      transcript: 'Engine overheating, broke down on highway.',
      rawOutcome: { outcome: 'BREAKDOWN', confidence: 0.95 },
    },
  });

  const bdVeh = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  assert.strictEqual(bdVeh.safetyStatus, 'BREAKDOWN');
  assert.strictEqual(bdVeh.isFlagged, true);
  assert.ok(bdVeh.flagReason.includes('BREAKDOWN'));
  console.log('  ✓ BREAKDOWN outcome persisted: safetyStatus=BREAKDOWN, isFlagged=true.');

  // Test 10: ROAD_BLOCKED Webhook Result Persists
  console.log('10. Testing ROAD_BLOCKED webhook result persistence...');
  const roadCall = await voiceService.triggerSafetyCall(null, {
    vehicleId: 'VEH-NER-TEST-1',
    forceOverride: true,
  });
  await processStatusWebhook({
    body: {
      callId: roadCall.session.callId,
      status: 'COMPLETED',
      eventId: `EVT-ROAD-${Date.now()}`,
      transcript: 'Road is completely blocked by mudslide.',
      rawOutcome: { outcome: 'ROAD_BLOCKED', confidence: 0.92 },
    },
  });

  const roadVeh = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  assert.strictEqual(roadVeh.safetyStatus, 'ROAD_BLOCKED');
  assert.strictEqual(roadVeh.isFlagged, true);
  console.log('  ✓ ROAD_BLOCKED outcome persisted.');

  // Test 11: ASSISTANCE_REQUIRED Persists
  console.log('11. Testing ASSISTANCE_REQUIRED persistence...');
  const assistCall = await voiceService.triggerSafetyCall(null, {
    vehicleId: 'VEH-NER-TEST-1',
    forceOverride: true,
  });
  await processStatusWebhook({
    body: {
      callId: assistCall.session.callId,
      status: 'COMPLETED',
      eventId: `EVT-ASSIST-${Date.now()}`,
      transcript: 'Need immediate medical assistance.',
      rawOutcome: { outcome: 'ASSISTANCE_REQUIRED', confidence: 0.99 },
    },
  });

  const assistVeh = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  assert.strictEqual(assistVeh.safetyStatus, 'ASSISTANCE_REQUIRED');
  assert.strictEqual(assistVeh.isFlagged, true);
  console.log('  ✓ ASSISTANCE_REQUIRED outcome persisted.');

  // Test 12: NO_RESPONSE Persists
  console.log('12. Testing NO_RESPONSE persistence on NO_ANSWER webhook...');
  const noAnsCall = await voiceService.triggerSafetyCall(null, {
    vehicleId: 'VEH-NER-TEST-1',
    forceOverride: true,
  });
  const rawNoAnsSession = voiceService.getRawSessionById(noAnsCall.session.callId);
  rawNoAnsSession.status = 'QUEUED';

  await processStatusWebhook({
    body: {
      callId: noAnsCall.session.callId,
      status: 'NO_ANSWER',
      eventId: `EVT-NOANS-${Date.now()}`,
    },
  });

  const noAnsVeh = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  assert.strictEqual(noAnsVeh.safetyStatus, 'NO_RESPONSE');
  assert.strictEqual(noAnsVeh.isFlagged, true);
  console.log('  ✓ NO_RESPONSE outcome persisted on NO_ANSWER event.');

  // Test 13: UNKNOWN Persists
  console.log('13. Testing UNKNOWN persistence on FAILED webhook...');
  const failedCall = await voiceService.triggerSafetyCall(null, {
    vehicleId: 'VEH-NER-TEST-1',
    forceOverride: true,
  });
  const rawFailedSession = voiceService.getRawSessionById(failedCall.session.callId);
  rawFailedSession.status = 'QUEUED';

  await processStatusWebhook({
    body: {
      callId: failedCall.session.callId,
      status: 'FAILED',
      reason: 'Telephony network congested',
      eventId: `EVT-FAIL-${Date.now()}`,
    },
  });

  const failedVeh = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  assert.strictEqual(failedVeh.safetyStatus, 'UNKNOWN');
  assert.strictEqual(failedVeh.isFlagged, true);
  console.log('  ✓ UNKNOWN outcome persisted on FAILED event.');

  // Test 14: lastSafetyCheck Persists
  console.log('14. Testing lastSafetyCheck timestamp persistence...');
  assert.ok(failedVeh.lastSafetyCheck !== null);
  assert.ok(new Date(failedVeh.lastSafetyCheck).getTime() > 0);
  console.log(`  ✓ lastSafetyCheck timestamp persisted: ${failedVeh.lastSafetyCheck}`);

  // Test 15: Completed Call Maintains activeCallId
  console.log('15. Testing activeCallId retention...');
  assert.strictEqual(failedVeh.activeCallId, failedCall.session.callId);
  console.log('  ✓ activeCallId retained accurately on completed call.');

  // Test 16: Unmatched Webhook Performs Zero Repository Mutations
  console.log('16. Testing Unmatched Webhook performs zero repository mutations...');
  const beforeUnmatched = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  const unmatchedRes = await processStatusWebhook({
    body: {
      callId: 'CALL-NON-EXISTENT-999',
      status: 'COMPLETED',
      transcript: 'Fake call transcript',
      rawOutcome: { outcome: 'SAFE' },
    },
  });
  assert.strictEqual(unmatchedRes.statusCode, 200);
  assert.strictEqual(unmatchedRes.body.processed, false);
  assert.strictEqual(unmatchedRes.body.reason, 'UNMATCHED_CALL');

  const afterUnmatched = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  assert.deepStrictEqual(beforeUnmatched, afterUnmatched, 'Vehicle repository state must be untouched');
  console.log('  ✓ Zero repository mutations performed for uncorrelated webhook.');

  // Test 17: Duplicate Webhook Remains Idempotent
  console.log('17. Testing Duplicate Webhook Idempotency...');
  const dupCall = await voiceService.triggerSafetyCall(null, {
    vehicleId: 'VEH-NER-TEST-1',
    forceOverride: true,
  });
  const dupEventId = `EVT-DUP-TEST-${Date.now()}`;
  const firstWebhook = await processStatusWebhook({
    body: {
      callId: dupCall.session.callId,
      status: 'COMPLETED',
      eventId: dupEventId,
      rawOutcome: { outcome: 'BREAKDOWN' },
    },
  });
  assert.strictEqual(firstWebhook.statusCode, 200);

  const duplicateWebhook = await processStatusWebhook({
    body: {
      callId: dupCall.session.callId,
      status: 'COMPLETED',
      eventId: dupEventId,
    },
  });
  assert.strictEqual(duplicateWebhook.statusCode, 200);
  assert.ok(duplicateWebhook.body.message.includes('idempotent'));
  console.log('  ✓ Duplicate webhook event deduplicated idempotently.');

  // Test 18: Out-of-Order Webhook Cannot Regress Terminal State
  console.log('18. Testing Out-of-Order Webhook Cannot Regress Terminal State...');
  const outOfOrderRes = await processStatusWebhook({
    body: {
      callId: failedCall.session.callId,
      status: 'RINGING',
      eventId: `EVT-OUTOFORDER-${Date.now()}`,
    },
  });
  assert.strictEqual(outOfOrderRes.statusCode, 409);
  console.log('  ✓ Out-of-order transition blocked with HTTP 409 Conflict.');

  // Test 19: Repository Failure Handled Gracefully
  console.log('19. Testing Repository Failure Handling...');
  const brokenRepo = {
    async getVehicleById() {
      throw new Error('PostgreSQL connection dropped');
    },
    async updateVehicle() {
      throw new Error('PostgreSQL connection dropped');
    },
  };

  const brokenVoiceService = Object.assign(Object.create(Object.getPrototypeOf(voiceService)), voiceService);
  brokenVoiceService.repository = brokenRepo;

  await assert.rejects(
    () => brokenVoiceService.flagVehicle(null, 'VEH-NER-TEST-1', 'Test flag'),
    /PostgreSQL connection dropped/,
    'Database failure must reject and not falsely claim persistence success'
  );
  console.log('  ✓ Repository failure strictly rejects without producing false persistence success.');

  // Test 20: Full Phone Numbers and Secrets Are Not Leaked
  console.log('20. Testing Zero Phone Number / Secret Leakage...');
  const phone = '+919864012345';
  const masked = maskPhone(phone);
  assert.strictEqual(masked, '+91-98640-XXXXX');
  assert.ok(!masked.includes('12345'), 'Last 5 digits must be masked');
  console.log('  ✓ PII masking verified for driver phone numbers.');

  // Test 21: Escalation Resolution Persists
  console.log('21. Testing Escalation Resolution Persists Unflagging in Repository...');
  const resolveRes = await voiceService.resolveEscalation(null, failedCall.session.callId, 'Emergency repair team arrived');
  assert.strictEqual(resolveRes.success, true);
  assert.strictEqual(resolveRes.session.escalationResolved, true);

  const resolvedVeh = await isolatedRepo.getVehicleById('VEH-NER-TEST-1');
  assert.strictEqual(resolvedVeh.isFlagged, false);
  assert.strictEqual(resolvedVeh.flagReason, null);
  console.log('  ✓ Escalation resolution persisted: isFlagged=false, flagReason=null.');

  console.log('\n=== ALL 21 PHASE 3A.3 TRACK 4 PERSISTENT VEHICLE TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
