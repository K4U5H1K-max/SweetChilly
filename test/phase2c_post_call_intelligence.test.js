/**
 * Project Brahmaputra — Track 4 Phase 2C
 * Post-Call Intelligence + Webhook -> Vehicle/Dashboard Integration Tests
 */

import assert from 'assert';
import { voiceService } from '../server/voice/voiceService.js';
import { processStatusWebhook } from '../server/voice/webhookHandler.js';
import { SarvamVoiceProvider, sanitizeDiagnosticText } from '../server/voice/providers/sarvamVoiceProvider.js';
import { normalizeStructuredResult, classifyDialogue, classifyFromBooleans } from '../server/voice/safetyClassifier.js';
import { maskPhone, validateAndNormalizePhone } from '../server/voice/securityGuardrails.js';

console.log('=== [PROJECT BRAHMAPUTRA — TRACK 4 PHASE 2C: POST-CALL INTELLIGENCE & WEBHOOK TESTS] ===\n');

// Mock in-memory vehicle fleet store
let testFleet = [
  {
    id: 'VEH-NER-101',
    regNumber: 'AS-01-GC-4482',
    name: 'Assam Pharma-Logistics MedTruck 01',
    driverName: 'B. Kalita',
    driverPhone: '+919864012345',
    isFlagged: true,
    flagReason: 'Scheduled safety check',
    safetyStatus: 'PENDING_CALL',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-204',
    regNumber: 'ML-05-E-9012',
    name: 'Meghalaya Essential Food Supply 04',
    driverName: 'S. Marak',
    driverPhone: '+919436123456',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
];

// Initialize voiceService with test fleet
voiceService.init(() => testFleet);

let escalationAlerts = [];
voiceService.registerEscalationHook(({ session, vehicle, outcome, summary }) => {
  escalationAlerts.push({
    alertId: `ALT-TEST-${escalationAlerts.length + 1}`,
    callId: session.callId,
    vehicleId: vehicle?.id,
    outcome,
    summary,
  });
});

async function runTests() {
  // Test 1: Provider Call ID <-> Internal Call ID Correlation
  console.log('1. Testing Provider Call ID <-> Internal Call ID correlation...');
  voiceService.sessions = [
    {
      callId: 'CALL-NER-0101',
      vehicleId: 'VEH-NER-101',
      providerCallId: 'SARVAM-JOB-998811',
      status: 'QUEUED',
      driverPhone: '+919864012345',
      updatedAt: new Date().toISOString(),
    },
  ];

  const sessionByProviderId = voiceService.getRawSessionById('SARVAM-JOB-998811');
  assert.ok(sessionByProviderId, 'Session must be retrieved by providerCallId');
  assert.strictEqual(sessionByProviderId.callId, 'CALL-NER-0101');
  console.log('  ✓ Provider Call ID (SARVAM-JOB-998811) maps to Internal Call ID (CALL-NER-0101).');

  // Test 2: Internal Call ID <-> Vehicle ID Mapping
  console.log('2. Testing Internal Call ID <-> Vehicle ID mapping...');
  const sessionByVehicleId = voiceService.getRawSessionByAnyId('VEH-NER-101');
  assert.ok(sessionByVehicleId, 'Session must be retrieved by vehicleId');
  assert.strictEqual(sessionByVehicleId.callId, 'CALL-NER-0101');
  const vehicle = voiceService.findVehicle(null, sessionByVehicleId.vehicleId);
  assert.ok(vehicle, 'Vehicle must be found in fleet store');
  assert.strictEqual(vehicle.id, 'VEH-NER-101');
  console.log('  ✓ Internal Call ID correctly correlates with Vehicle ID (VEH-NER-101).');

  // Test 3: Duplicate Webhook Idempotent Handling
  console.log('3. Testing duplicate webhook idempotency...');
  const webhookPayload = {
    eventId: 'EVT-IDEMPOTENT-001',
    job_id: 'SARVAM-JOB-998811',
    status: 'ANSWERED',
    metadata: {
      internal_call_id: 'CALL-NER-0101',
      vehicle_id: 'VEH-NER-101',
    },
  };

  const firstDelivery = await processStatusWebhook({ body: webhookPayload });
  assert.strictEqual(firstDelivery.statusCode, 200);

  const duplicateDelivery = await processStatusWebhook({ body: webhookPayload });
  assert.strictEqual(duplicateDelivery.statusCode, 200);
  assert.strictEqual(duplicateDelivery.body.message, 'Duplicate webhook event ignored (idempotent).');
  console.log('  ✓ Duplicate webhook event deduplicated idempotently.');

  // Test 4: SAFE Transcript -> SAFE Outcome & No Unnecessary Escalation
  console.log('4. Testing SAFE transcript -> SAFE outcome...');
  const safeWebhook = {
    eventId: 'EVT-SAFE-001',
    job_id: 'SARVAM-JOB-998811',
    status: 'COMPLETED',
    transcript: 'All safe here. Truck is running fine, road is clear and moving on schedule.',
    metadata: { internal_call_id: 'CALL-NER-0101', vehicle_id: 'VEH-NER-101' },
  };

  const safeResult = await processStatusWebhook({ body: safeWebhook });
  assert.strictEqual(safeResult.statusCode, 200);
  const updatedSession = voiceService.getRawSessionById('CALL-NER-0101');
  assert.strictEqual(updatedSession.outcome, 'SAFE');
  assert.strictEqual(updatedSession.driverSafe, true);
  assert.strictEqual(updatedSession.vehicleOperational, true);
  assert.strictEqual(updatedSession.roadPassable, true);
  assert.strictEqual(updatedSession.assistanceRequired, false);
  assert.strictEqual(updatedSession.escalationRequired, false);
  assert.strictEqual(vehicle.safetyStatus, 'SAFE');
  assert.strictEqual(vehicle.isFlagged, false);
  assert.strictEqual(vehicle.flagReason, null);
  console.log('  ✓ SAFE conversation classified as SAFE with escalationRequired=false and vehicle unflagged.');

  // Test 5: Breakdown Transcript -> BREAKDOWN Outcome & Escalation
  console.log('5. Testing Breakdown transcript -> BREAKDOWN outcome...');
  voiceService.sessions.push({
    callId: 'CALL-NER-0102',
    vehicleId: 'VEH-NER-101',
    providerCallId: 'SARVAM-JOB-BREAKDOWN',
    status: 'IN_PROGRESS',
    driverPhone: '+919864012345',
  });

  const breakdownWebhook = {
    eventId: 'EVT-BREAKDOWN-001',
    job_id: 'SARVAM-JOB-BREAKDOWN',
    status: 'COMPLETED',
    transcript: 'Engine overheated and stalled near Sonapur. Broken down, need mechanical assistance.',
    metadata: { internal_call_id: 'CALL-NER-0102', vehicle_id: 'VEH-NER-101' },
  };

  await processStatusWebhook({ body: breakdownWebhook });
  const breakdownSession = voiceService.getRawSessionById('CALL-NER-0102');
  assert.strictEqual(breakdownSession.outcome, 'BREAKDOWN');
  assert.strictEqual(breakdownSession.escalationRequired, true);
  assert.strictEqual(vehicle.safetyStatus, 'BREAKDOWN');
  assert.strictEqual(vehicle.isFlagged, true);
  assert.ok(vehicle.flagReason.includes('BREAKDOWN'));
  console.log('  ✓ BREAKDOWN classified with escalationRequired=true and vehicle flagged.');

  // Test 6: Road Obstruction Transcript -> ROAD_BLOCKED Outcome & Escalation
  console.log('6. Testing Road obstruction transcript -> ROAD_BLOCKED outcome...');
  voiceService.sessions.push({
    callId: 'CALL-NER-0103',
    vehicleId: 'VEH-NER-101',
    providerCallId: 'SARVAM-JOB-ROCKFALL',
    status: 'IN_PROGRESS',
    driverPhone: '+919864012345',
  });

  const roadBlockWebhook = {
    eventId: 'EVT-ROADBLOCK-001',
    job_id: 'SARVAM-JOB-ROCKFALL',
    status: 'COMPLETED',
    transcript: 'Driver safe and truck is fine, but major landslide and rockfall ahead. Road blocked completely.',
    variables: {
      driver_safe: true,
      vehicle_operational: true,
      road_passable: false,
      assistance_required: false,
    },
    metadata: { internal_call_id: 'CALL-NER-0103', vehicle_id: 'VEH-NER-101' },
  };

  await processStatusWebhook({ body: roadBlockWebhook });
  const roadSession = voiceService.getRawSessionById('CALL-NER-0103');
  assert.strictEqual(roadSession.outcome, 'ROAD_BLOCKED');
  assert.strictEqual(roadSession.roadPassable, false);
  assert.strictEqual(vehicle.safetyStatus, 'ROAD_BLOCKED');
  console.log('  ✓ ROAD_BLOCKED classified with roadPassable=false and vehicle safetyStatus updated.');

  // Test 7: Explicit Help Request -> ASSISTANCE_REQUIRED Outcome
  console.log('7. Testing explicit help request -> ASSISTANCE_REQUIRED...');
  const assistResult = classifyDialogue('Medical emergency and injury reported, need immediate emergency assistance!');
  assert.strictEqual(assistResult.outcome, 'ASSISTANCE_REQUIRED');
  assert.strictEqual(assistResult.escalationRequired, true);
  console.log('  ✓ Medical/help request classified as ASSISTANCE_REQUIRED with high escalation.');

  // Test 8: Unanswered Call / Disconnect -> NO_RESPONSE
  console.log('8. Testing unanswered call -> NO_RESPONSE...');
  voiceService.sessions.push({
    callId: 'CALL-NER-0104',
    vehicleId: 'VEH-NER-101',
    providerCallId: 'SARVAM-JOB-NOANS',
    status: 'RINGING',
    driverPhone: '+919864012345',
  });

  const noAnswerWebhook = {
    eventId: 'EVT-NOANS-001',
    job_id: 'SARVAM-JOB-NOANS',
    status: 'NO_ANSWER',
    reason: 'Driver mobile rang out without answer',
    metadata: { internal_call_id: 'CALL-NER-0104', vehicle_id: 'VEH-NER-101' },
  };

  await processStatusWebhook({ body: noAnswerWebhook });
  const noAnsSession = voiceService.getRawSessionById('CALL-NER-0104');
  assert.strictEqual(noAnsSession.outcome, 'NO_RESPONSE');
  assert.strictEqual(noAnsSession.escalationRequired, true);
  assert.strictEqual(vehicle.safetyStatus, 'NO_RESPONSE');
  console.log('  ✓ NO_ANSWER webhook normalized to NO_RESPONSE with operator escalation.');

  // Test 9: Inconclusive / Garbled Conversation -> UNKNOWN
  console.log('9. Testing inconclusive dialogue -> UNKNOWN...');
  const unknownResult = classifyDialogue('...garbled static noise on telephone line...');
  assert.strictEqual(unknownResult.outcome, 'UNKNOWN');
  assert.strictEqual(unknownResult.escalationRequired, true);
  console.log('  ✓ Inconclusive dialogue classified as UNKNOWN requiring operator review.');

  // Test 10: Sarvam "not_evaluated" Fallback to Transcript / Summary
  console.log('10. Testing Sarvam "not_evaluated" fallback classification...');
  const notEvalPayload = {
    goal_evaluated: 'not_evaluated',
    outcome: 'not_evaluated',
    transcript: 'Road ahead is completely blocked due to a severe landslide.',
    call_summary: 'Driver reported landslide obstruction on corridor.',
  };

  const normalizedNotEval = normalizeStructuredResult(notEvalPayload);
  assert.strictEqual(normalizedNotEval.outcome, 'ROAD_BLOCKED');
  assert.strictEqual(normalizedNotEval.roadPassable, false);
  assert.strictEqual(normalizedNotEval.driverSafe, true);
  console.log('  ✓ "not_evaluated" safely falls back to transcript keyword classification (ROAD_BLOCKED).');

  // Test 11 & 12: Vehicle State & lastSafetyCheck Timestamp Synchronization
  console.log('11 & 12. Testing Vehicle State & timestamp synchronization...');
  assert.ok(vehicle.lastSafetyCheck, 'Vehicle lastSafetyCheck timestamp must be set');
  assert.strictEqual(vehicle.activeCallId, 'CALL-NER-0104');
  console.log(`  ✓ Vehicle lastSafetyCheck timestamp verified: ${vehicle.lastSafetyCheck}`);

  // Test 13 & 14: Escalation Verification
  console.log('13 & 14. Testing Operational Alert Escalation Dispatch...');
  assert.ok(escalationAlerts.length >= 2, 'Escalations must be dispatched for non-safe outcomes');
  console.log(`  ✓ ${escalationAlerts.length} operational alerts recorded without contacting emergency services.`);

  // Test 15: Public Session PII Sanitization
  console.log('15. Testing PII masking in public session endpoints...');
  const publicSession = voiceService.getSessionById('CALL-NER-0101');
  assert.ok(publicSession.driverPhone.includes('XXXXX') || publicSession.driverPhone.includes('***'));
  assert.ok(!publicSession.driverPhone.includes('12345'), 'Full phone digits must never appear in public session');
  console.log(`  ✓ Public driver phone masked safely: ${publicSession.driverPhone}`);

  // Test 16: Diagnostic Log Sanitization
  console.log('16. Testing diagnostic log sanitization & zero secret leakage...');
  const dirtyDiagnostic = 'Error with key sk_live_sarvam_secret_9988 calling +919864012345';
  const cleanDiagnostic = sanitizeDiagnosticText(dirtyDiagnostic, 'sk_live_sarvam_secret_9988');
  assert.ok(!cleanDiagnostic.includes('sk_live_sarvam_secret_9988'), 'Secrets must be redacted');
  assert.ok(cleanDiagnostic.includes('[REDACTED_SECRET]'), 'Redaction placeholder must be present');
  assert.ok(!cleanDiagnostic.includes('9864012345'), 'Phone numbers must be masked in logs');
  console.log('  ✓ Secrets and phone numbers sanitized in diagnostic text.');

  // Test 17: Mock Provider Preservation
  console.log('17. Testing Mock Provider functionality...');
  process.env.VOICE_PROVIDER = 'mock';
  const mockCall = await voiceService.triggerSafetyCall(testFleet, {
    vehicleId: 'VEH-NER-204',
    simulatedOutcome: 'SAFE',
    forceOverride: true,
  });
  assert.strictEqual(mockCall.success, true);
  assert.strictEqual(mockCall.session.structuredOutcome, 'SAFE');
  console.log('  ✓ Mock Provider operates seamlessly with zero regressions.');

  // Test 18: Uncorrelated Webhook Failure Behavior (HTTP 200, processed: false, reason: UNMATCHED_CALL)
  console.log('18. Testing Uncorrelated Webhook handling...');
  const alertsCountBefore = escalationAlerts.length;
  const uncorrelatedWebhook = {
    eventId: 'EVT-UNCORRELATED-999',
    job_id: 'SARVAM-UNKNOWN-JOB-000',
    status: 'COMPLETED',
    metadata: {
      internal_call_id: 'CALL-NON-EXISTENT-999',
      vehicle_id: 'VEH-NON-EXISTENT',
    },
  };
  const uncorrRes = await processStatusWebhook({ body: uncorrelatedWebhook });
  assert.strictEqual(uncorrRes.statusCode, 200, 'Uncorrelated webhook must return HTTP 200 to prevent provider retry loops');
  assert.strictEqual(uncorrRes.body.received, true);
  assert.strictEqual(uncorrRes.body.processed, false);
  assert.strictEqual(uncorrRes.body.reason, 'UNMATCHED_CALL');
  assert.strictEqual(vehicle.id, 'VEH-NER-101');
  assert.strictEqual(escalationAlerts.length, alertsCountBefore, 'Zero escalation alerts must be generated for uncorrelated calls');
  console.log('  ✓ Uncorrelated webhook acknowledged with HTTP 200 (processed=false, UNMATCHED_CALL) with zero fleet corruption.');

  // Test 19: Out-of-Order Lifecycle Event (COMPLETED -> IN_PROGRESS) Rejection
  console.log('19. Testing Out-of-Order Lifecycle Event handling...');
  const outOfOrderWebhook = {
    eventId: 'EVT-OUT-OF-ORDER-001',
    job_id: 'SARVAM-JOB-998811',
    status: 'IN_PROGRESS',
    metadata: {
      internal_call_id: 'CALL-NER-0101',
      vehicle_id: 'VEH-NER-101',
    },
  };
  const outOfOrderRes = await processStatusWebhook({ body: outOfOrderWebhook });
  assert.strictEqual(outOfOrderRes.statusCode, 409, 'Late IN_PROGRESS event after COMPLETED must return 409 conflict');
  const finishedSession = voiceService.getRawSessionById('CALL-NER-0101');
  assert.strictEqual(finishedSession.status, 'COMPLETED', 'Session status must NOT regress to IN_PROGRESS');
  console.log('  ✓ Out-of-order event prevented from regressing terminal COMPLETED state.');

  // Test 20: Unknown / Empty Webhook Payload Fallback
  console.log('20. Testing Unknown / sparse webhook payload normalization...');
  const sparseResult = normalizeStructuredResult({});
  assert.strictEqual(sparseResult.outcome, 'UNKNOWN');
  assert.strictEqual(sparseResult.escalationRequired, true);
  assert.strictEqual(sparseResult.driverSafe, false);
  console.log('  ✓ Sparse/unknown payload cleanly resolves to UNKNOWN with operator escalation.');

  // Test 21: Structural Webhook Diagnostics Logging
  console.log('21. Testing Structural Webhook Diagnostics...');
  const sarvamProvider = new SarvamVoiceProvider();
  const testPayload = {
    job_id: 'SARVAM-TEST-DIAG-01',
    event: 'call_completed',
    status: 'COMPLETED',
    transcript: 'Truck is safe and clear.',
    call_summary: 'All clear on corridor.',
    variables: { driver_safe: true, road_passable: true },
    metadata: { internal_call_id: 'CALL-NER-0101', vehicle_id: 'VEH-NER-101' },
    data: { custom_key: 'test' },
  };
  const valResult = sarvamProvider.validateWebhook({ rawBody: testPayload });
  assert.strictEqual(valResult.valid, true);
  assert.strictEqual(valResult.event.callId, 'CALL-NER-0101');
  assert.strictEqual(valResult.event.providerCallId, 'SARVAM-TEST-DIAG-01');
  console.log('  ✓ Structural diagnostic validation and event extraction verified.');

  console.log('\n=== ALL PHASE 2C POST-CALL INTELLIGENCE & READINESS TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
