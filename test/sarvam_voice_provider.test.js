/**
 * Project Brahmaputra — Track 4 Phase 2B Test Suite
 * Sarvam Voice Agent Provider Integration, Telephony Guardrails, and Webhook Normalization
 */

import assert from 'node:assert';
import { SarvamVoiceProvider } from '../server/voice/providers/sarvamVoiceProvider.js';
import { getVoiceProvider, resetVoiceProviderRegistry } from '../server/voice/providers/voiceProviderFactory.js';
import { MockVoiceProvider } from '../server/voice/providers/mockVoiceProvider.js';
import { voiceService } from '../server/voice/voiceService.js';
import { processStatusWebhook } from '../server/voice/webhookHandler.js';
import { classifyFromBooleans, normalizeStructuredResult } from '../server/voice/safetyClassifier.js';
import { maskPhone } from '../server/voice/securityGuardrails.js';

console.log('=== [PROJECT BRAHMAPUTRA — TRACK 4 PHASE 2B: SARVAM VOICE PROVIDER TESTS] ===\n');

// Sample test vehicles
const sampleVehicles = [
  {
    id: 'VEH-NER-101',
    regNumber: 'AS-01-GC-4482',
    name: 'Assam Pharma-Logistics MedTruck 01',
    driverName: 'B. Kalita',
    driverPhone: '+91-98640-12345',
    driverGender: 'male',
    assignedCorridor: 'NH-6',
    safetyStatus: 'NOT_CHECKED',
    isFlagged: true,
    flagReason: 'Vehicle delayed near active flood disruption',
  },
  {
    id: 'VEH-NER-204',
    regNumber: 'ML-05-E-9012',
    name: 'Meghalaya Essential Food Supply 04',
    driverName: 'S. Marak',
    driverPhone: '+91-94361-99887',
    driverGender: 'female',
    assignedCorridor: 'NH-10',
    safetyStatus: 'NOT_CHECKED',
    isFlagged: true,
    flagReason: 'Transit checkpoint safety audit',
  },
];

// -------------------------------------------------------------
// 1. Sarvam Provider Request Payload Construction & Mapping
// -------------------------------------------------------------
console.log('1. Testing Sarvam Instant Outbound Payload Construction...');
const providerConfig = {
  apiKey: 'test-sarvam-secret-key-xyz',
  orgId: 'org_ner_brahmaputra_01',
  workspaceId: 'ws_disaster_ops_01',
  agentId: 'agent_driver_safety_v2',
  agentVersion: '2.1',
  connectionId: 'conn_vobiz_india_01',
  agentPhoneNumber: '+911140845678',
  webhookUrl: 'https://brahmaputra.assam.gov.in/api/voice/webhooks/status',
  liveCallsEnabled: false,
};

const sarvamProvider = new SarvamVoiceProvider(providerConfig);
const testSession = { callId: 'CALL-NER-0881', vehicleId: 'VEH-NER-101' };
const payload = sarvamProvider.buildOutboundPayload({
  session: testSession,
  vehicle: sampleVehicles[0],
  flagReason: 'Vehicle delayed near active flood disruption',
});

assert.strictEqual(payload.app_config.app_id, 'agent_driver_safety_v2');
assert.strictEqual(payload.app_config.app_version, '2.1');
assert.strictEqual(payload.app_config.app_type, 'agent');
assert.strictEqual(payload.app_config.connection_config.connection_id, 'conn_vobiz_india_01');
assert.strictEqual(payload.app_config.connection_config.agent_phone_number, '+911140845678');
assert.strictEqual(payload.app_config.app_overrides, undefined, 'Must not override prompt/message without requirement');
console.log('  ✓ Official Sarvam app_config structure correctly constructed.');

// -------------------------------------------------------------
// 2. Correct Endpoint Generation using Org/Workspace IDs
// -------------------------------------------------------------
console.log('2. Testing Endpoint Generation URL...');
const endpointUrl = sarvamProvider.getEndpointUrl();
assert.strictEqual(
  endpointUrl,
  'https://apps.sarvam.ai/api/outbounds/v1/orgs/org_ner_brahmaputra_01/workspaces/ws_disaster_ops_01/outbounds'
);
console.log(`  ✓ Endpoint URL generated correctly: ${endpointUrl}`);

// -------------------------------------------------------------
// 3. X-API-Key Header Presence Without Secret Exposure
// -------------------------------------------------------------
console.log('3. Testing X-API-Key Header Handling & Secret Isolation...');
assert(sarvamProvider.apiKey.length > 0);
// Verify that stringifying/printing the provider or payload does NOT leak the API key
const jsonPayload = JSON.stringify(payload);
assert(!jsonPayload.includes(providerConfig.apiKey), 'Payload must NOT leak API key');
console.log('  ✓ API key securely isolated on backend provider instance.');

// -------------------------------------------------------------
// 4. Correct Driver Phone Mapping
// -------------------------------------------------------------
console.log('4. Testing User Config & Phone Mapping...');
assert.strictEqual(payload.user_config.user_phone_number, '+91-98640-12345');
assert.strictEqual(maskPhone(payload.user_config.user_phone_number), '+91-98640-XXXXX');
console.log('  ✓ Driver destination phone mapped to user_config.user_phone_number.');

// -------------------------------------------------------------
// 5. Correct Agent Variables Mapping
// -------------------------------------------------------------
console.log('5. Testing Agent Variables Mapping...');
assert.strictEqual(payload.app_config.agent_variables.driver_name, 'B. Kalita');
assert.strictEqual(payload.app_config.agent_variables.vehicle_id, 'VEH-NER-101');
assert.strictEqual(payload.app_config.agent_variables.flag_reason, 'Vehicle delayed near active flood disruption');
assert.strictEqual(payload.app_config.agent_variables.gender, 'male');
assert.strictEqual(payload.webhook_config.metadata.vehicle_id, 'VEH-NER-101');
assert.strictEqual(payload.webhook_config.metadata.internal_call_id, 'CALL-NER-0881');
console.log('  ✓ Brahmaputra agent_variables and correlation metadata mapped.');

// -------------------------------------------------------------
// 6. Missing Configuration Handling
// -------------------------------------------------------------
console.log('6. Testing Missing Configuration Guardrail...');
const incompleteProvider = new SarvamVoiceProvider({ apiKey: null, orgId: null, liveCallsEnabled: true });
assert.throws(
  () => incompleteProvider.assertConfigured(),
  /Missing required Sarvam configuration/,
  'Unconfigured live provider must throw error'
);
console.log('  ✓ Incomplete credential guardrail asserted.');

// -------------------------------------------------------------
// 7. Live-call Disabled Dry-run Behavior
// -------------------------------------------------------------
console.log('7. Testing Live-Calls Disabled Dry-Run Behavior...');
const dryRunResult = await sarvamProvider.initiateCall({
  session: { callId: 'CALL-NER-0992' },
  vehicle: sampleVehicles[0],
});

assert.strictEqual(dryRunResult.isDryRun, true);
assert.strictEqual(dryRunResult.status, 'QUEUED');
assert(dryRunResult.providerCallId.startsWith('SARVAM-DRYRUN-'));
assert(dryRunResult.dialogueHistory[0].text.includes('DRY-RUN MODE'));
console.log(`  ✓ Safe dry-run call generated with ID: ${dryRunResult.providerCallId} (Zero live telephony egress).`);

// -------------------------------------------------------------
// 8. Test-number Allowlist Enforcement
// -------------------------------------------------------------
console.log('8. Testing Destination Phone Allowlist Protection...');
const allowlistProvider = new SarvamVoiceProvider({
  ...providerConfig,
  allowedTestNumbers: '+91-94361-99887, +91-98765-43210',
});

// Allowed number passes allowlist check
const allowedCheck = allowlistProvider.checkPhoneAllowlist('+91-94361-99887');
assert.strictEqual(allowedCheck.allowed, true);

// Disallowed number fails allowlist check
const blockedCheck = allowlistProvider.checkPhoneAllowlist('+91-98640-12345');
assert.strictEqual(blockedCheck.allowed, false);
assert(blockedCheck.reason.includes('not in SARVAM_ALLOWED_TEST_NUMBERS allowlist'));

await assert.rejects(
  async () => {
    await allowlistProvider.initiateCall({
      session: { callId: 'CALL-NER-0993' },
      vehicle: sampleVehicles[0], // Has +91-98640-12345
    });
  },
  /Telephony guardrail blocked/,
  'Disallowed phone must be rejected before call'
);
console.log('  ✓ Allowlist filter successfully blocked non-whitelisted destination number.');

// -------------------------------------------------------------
// 9. Provider Call ID <-> Internal Call ID Mapping in VoiceService
// -------------------------------------------------------------
console.log('9. Testing Provider Call ID <-> Internal Call ID Bi-directional Correlation...');
resetVoiceProviderRegistry();
process.env.VOICE_PROVIDER = 'sarvam';
process.env.SARVAM_LIVE_CALLS_ENABLED = 'false';

const serviceCallRes = await voiceService.triggerSafetyCall(sampleVehicles, {
  vehicleId: 'VEH-NER-204',
  flagReason: 'Routine corridor safety audit',
  forceOverride: true,
});

assert.strictEqual(serviceCallRes.success, true);
const createdSession = serviceCallRes.session;
const internalId = createdSession.callId;
const providerId = createdSession.providerCallId;

assert(internalId.startsWith('CALL-NER-'));
assert(providerId.startsWith('SARVAM-DRYRUN-'));
assert.strictEqual(createdSession.provider, 'sarvam');

// Lookup by internal ID
const foundByInternal = voiceService.getRawSessionById(internalId);
assert.strictEqual(foundByInternal.callId, internalId);

// Lookup by provider ID
const foundByProvider = voiceService.getRawSessionById(providerId);
assert.strictEqual(foundByProvider.callId, internalId);
console.log(`  ✓ Internal ID (${internalId}) correctly mapped to Provider ID (${providerId}).`);

// -------------------------------------------------------------
// 10. Webhook Idempotency & Lifecycle Progression
// -------------------------------------------------------------
console.log('10. Testing Webhook State Progression & Idempotency...');
const evtId1 = `SARVAM-EVT-${Date.now()}-1`;
const ansWebhookRes = await processStatusWebhook({
  headers: {},
  body: {
    callId: internalId,
    status: 'ANSWERED',
    eventId: evtId1,
  },
});
assert.strictEqual(ansWebhookRes.statusCode, 200);

// Duplicate webhook with same eventId
const dupWebhookRes = await processStatusWebhook({
  headers: {},
  body: {
    callId: internalId,
    status: 'ANSWERED',
    eventId: evtId1,
  },
});
assert.strictEqual(dupWebhookRes.statusCode, 200);
assert(dupWebhookRes.body.message.includes('idempotent'));
console.log('  ✓ Webhook state advanced to ANSWERED and duplicate event deduplicated.');

// -------------------------------------------------------------
// 11. ROAD_BLOCKED Classification from Real Sarvam Outputs
// -------------------------------------------------------------
console.log('11. Testing ROAD_BLOCKED Normalization (Real Sarvam Observed Result)...');
const sarvamRoadBlockedOutput = {
  driver_safe: 'YES',
  vehicle_operational: 'YES',
  road_passable: 'BLOCKED',
  assistance_required: 'YES',
  call_summary:
    'The AI bot contacted the driver to check on their safety due to a road disruption. The driver confirmed they are safe and the vehicle is operational, but reported that the road is blocked and requested assistance, which the bot forwarded to the Command Center.',
};

const roadBlockedClassified = classifyFromBooleans({
  driverSafe: sarvamRoadBlockedOutput.driver_safe,
  vehicleOperational: sarvamRoadBlockedOutput.vehicle_operational,
  roadPassable: sarvamRoadBlockedOutput.road_passable,
  assistanceRequired: sarvamRoadBlockedOutput.assistance_required,
  summary: sarvamRoadBlockedOutput.call_summary,
});

assert.strictEqual(roadBlockedClassified.outcome, 'ROAD_BLOCKED');
assert.strictEqual(roadBlockedClassified.driverSafe, true);
assert.strictEqual(roadBlockedClassified.vehicleOperational, true);
assert.strictEqual(roadBlockedClassified.roadPassable, false);
assert.strictEqual(roadBlockedClassified.assistanceRequired, true);
assert.strictEqual(roadBlockedClassified.escalationRequired, true);
console.log('  ✓ Real Sarvam road blockage scenario normalized to ROAD_BLOCKED with escalationRequired=true.');

// Complete session via webhook with ROAD_BLOCKED variables
const compWebhookRes = await processStatusWebhook({
  headers: {},
  body: {
    callId: internalId,
    status: 'COMPLETED',
    eventId: `SARVAM-EVT-${Date.now()}-COMPLETED`,
    summary: sarvamRoadBlockedOutput.call_summary,
    variables: sarvamRoadBlockedOutput,
  },
});
assert.strictEqual(compWebhookRes.statusCode, 200);
const completedSession = voiceService.getRawSessionById(internalId);
assert.strictEqual(completedSession.outcome, 'ROAD_BLOCKED');
assert.strictEqual(completedSession.escalationRequired, true);
console.log('  ✓ Webhook completed session with ROAD_BLOCKED outcome in active session ledger.');

// -------------------------------------------------------------
// 12. BREAKDOWN Classification from Sarvam Outputs
// -------------------------------------------------------------
console.log('12. Testing BREAKDOWN Classification from Structured Output...');
const breakdownOutput = classifyFromBooleans({
  driverSafe: true,
  vehicleOperational: false,
  roadPassable: true,
  assistanceRequired: true,
  summary: 'Driver reported engine overheating near Lumding.',
});
assert.strictEqual(breakdownOutput.outcome, 'BREAKDOWN');
assert.strictEqual(breakdownOutput.vehicleOperational, false);
assert.strictEqual(breakdownOutput.escalationRequired, true);
console.log('  ✓ BREAKDOWN classification verified.');

// -------------------------------------------------------------
// 13. SAFE Classification from Sarvam Outputs
// -------------------------------------------------------------
console.log('13. Testing SAFE Classification from Structured Output...');
const safeOutput = classifyFromBooleans({
  driverSafe: true,
  vehicleOperational: true,
  roadPassable: true,
  assistanceRequired: false,
  summary: 'Driver confirmed all clear and transit on schedule.',
});
assert.strictEqual(safeOutput.outcome, 'SAFE');
assert.strictEqual(safeOutput.escalationRequired, false);
console.log('  ✓ SAFE classification verified.');

// -------------------------------------------------------------
// 14. NO_RESPONSE & Telephony Failure Handling
// -------------------------------------------------------------
console.log('14. Testing NO_RESPONSE & Failure Handling...');
const noResponseResult = await sarvamProvider.handleCallFailed({
  callId: 'CALL-NER-0994',
  reason: 'NO_ANSWER',
});
assert.strictEqual(noResponseResult.status, 'FAILED');
assert.strictEqual(noResponseResult.outcome, 'NO_RESPONSE');
assert.strictEqual(noResponseResult.escalationRequired, true);
console.log('  ✓ NO_RESPONSE / Call failure properly escalated.');

// -------------------------------------------------------------
// 15. Existing Mock Voice Provider Regression Test
// -------------------------------------------------------------
console.log('15. Testing Mock Provider Fallback & Zero Regression...');
resetVoiceProviderRegistry();
process.env.VOICE_PROVIDER = 'mock';
const defaultProvider = getVoiceProvider();
assert(defaultProvider instanceof MockVoiceProvider, 'Must resolve MockVoiceProvider by default');

const mockCall = await voiceService.triggerSafetyCall(sampleVehicles, {
  vehicleId: 'VEH-NER-101',
  simulatedOutcome: 'DELAYED',
  forceOverride: true,
});
assert.strictEqual(mockCall.success, true);
assert.strictEqual(mockCall.session.structuredOutcome, 'DELAYED');
assert.strictEqual(mockCall.session.provider, 'mock');
console.log('  ✓ Mock voice provider functions seamlessly with zero regressions.');

// -------------------------------------------------------------
// 16. Upstream Sarvam HTTP 422 JSON Error Diagnostic Formatting
// -------------------------------------------------------------
console.log('16. Testing Upstream Sarvam HTTP 422 JSON Error Diagnostics...');
const liveTestProvider = new SarvamVoiceProvider({
  ...providerConfig,
  liveCallsEnabled: true,
});

const originalFetch = global.fetch;
try {
  // Mock Sarvam returning HTTP 422 with {"detail":"Invalid app_version"}
  global.fetch = async () => ({
    ok: false,
    status: 422,
    statusText: 'Unprocessable Entity',
    text: async () => JSON.stringify({ detail: 'Invalid app_version' }),
    json: async () => ({ detail: 'Invalid app_version' }),
  });

  await assert.rejects(
    async () => {
      await liveTestProvider.initiateCall({
        session: { callId: 'CALL-NER-0995' },
        vehicle: sampleVehicles[0],
      });
    },
    (err) => {
      assert(err instanceof Error);
      assert(!err.message.includes('[object Object]'), 'Error message must NOT contain [object Object]');
      assert(err.message.includes('Status: 422'), 'Error message must include HTTP status');
      assert(err.message.includes('{"detail":"Invalid app_version"}'), 'Error message must include parsed body');
      assert(err.message.includes('[SarvamVoiceProvider] Sarvam API error'));
      return true;
    },
    'Should surface clean diagnostic error on HTTP 422'
  );
  console.log('  ✓ HTTP 422 JSON error surfaced with clean status and body string without [object Object].');
} finally {
  global.fetch = originalFetch;
}

// -------------------------------------------------------------
// 17. Telephony Error Sanitization & Masking (Secret & PII Guardrails)
// -------------------------------------------------------------
console.log('17. Testing Error Sanitization & PII Masking...');
try {
  // Mock Sarvam returning error containing sensitive API key and raw phone number
  global.fetch = async () => ({
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    text: async () =>
      JSON.stringify({
        error: {
          code: 'UNVERIFIED_CALLER',
          message: 'Key test-sarvam-secret-key-xyz cannot call +919864012345',
        },
      }),
  });

  await assert.rejects(
    async () => {
      await liveTestProvider.initiateCall({
        session: { callId: 'CALL-NER-0996' },
        vehicle: sampleVehicles[0],
      });
    },
    (err) => {
      assert(!err.message.includes('test-sarvam-secret-key-xyz'), 'Must redact API key');
      assert(!err.message.includes('+919864012345'), 'Must mask raw phone number');
      assert(err.message.includes('[REDACTED_SECRET]'), 'Must replace API key with [REDACTED_SECRET]');
      assert(err.message.includes('+91-98640-XXXXX'), 'Must format masked phone number');
      assert(!err.message.includes('[object Object]'), 'Must not contain [object Object]');
      return true;
    },
    'Should redact secrets and mask phone numbers in error diagnostics'
  );
  console.log('  ✓ API keys redacted and phone numbers masked in diagnostic logs.');
} finally {
  global.fetch = originalFetch;
}

// -------------------------------------------------------------
// 18. Non-JSON Raw Error Handling (e.g. 502 Bad Gateway HTML)
// -------------------------------------------------------------
console.log('18. Testing Non-JSON / Plaintext Error Responses...');
try {
  global.fetch = async () => ({
    ok: false,
    status: 502,
    statusText: 'Bad Gateway',
    text: async () => '<html><body>502 Bad Gateway</body></html>',
  });

  await assert.rejects(
    async () => {
      await liveTestProvider.initiateCall({
        session: { callId: 'CALL-NER-0997' },
        vehicle: sampleVehicles[0],
      });
    },
    (err) => {
      assert(err.message.includes('Status: 502'));
      assert(err.message.includes('502 Bad Gateway'));
      assert(!err.message.includes('[object Object]'));
      return true;
    },
    'Should surface plaintext error cleanly'
  );
  console.log('  ✓ Non-JSON raw error bodies cleanly captured.');
} finally {
  global.fetch = originalFetch;
}

console.log('\n=== ALL 18 SARVAM VOICE PROVIDER PHASE 2B TESTS PASSED SUCCESSFULLY ===\n');

