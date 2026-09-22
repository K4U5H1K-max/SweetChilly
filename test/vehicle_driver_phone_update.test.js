/**
 * Project Brahmaputra — Track 4 Dynamic Driver Phone Update & Telephony Verification
 *
 * Tests dynamic registration and editing of driver phone numbers, E.164 normalization,
 * input validation, PII masking, and end-to-end flow into SarvamVoiceProvider.
 */

import assert from 'node:assert';
import express from 'express';
import { voiceService } from '../server/voice/voiceService.js';
import {
  validateAndNormalizePhone,
  maskPhone,
  validateFlagRequest,
  validateTriggerRequest,
  resetCooldown,
} from '../server/voice/securityGuardrails.js';
import { SarvamVoiceProvider } from '../server/voice/providers/sarvamVoiceProvider.js';
import { getVoiceProvider, resetVoiceProviderRegistry } from '../server/voice/providers/voiceProviderFactory.js';

console.log('=== [PROJECT BRAHMAPUTRA — DYNAMIC DRIVER PHONE & TRACK 4 VERIFICATION] ===\n');

// 1. Pure Normalization & Validation Unit Tests
console.log('1. Testing Phone Normalization & Validation Logic...');

// Valid 10-digit Indian numbers -> +91XXXXXXXXXX
const tenDigitPass = validateAndNormalizePhone('9864012345');
assert.strictEqual(tenDigitPass.valid, true);
assert.strictEqual(tenDigitPass.phone, '+919864012345', '10-digit Indian number must normalize to +91XXXXXXXXXX');

const tenDigitWithSpaces = validateAndNormalizePhone('98640 12345');
assert.strictEqual(tenDigitWithSpaces.valid, true);
assert.strictEqual(tenDigitWithSpaces.phone, '+919864012345');

const tenDigitWithHyphens = validateAndNormalizePhone('98640-12345');
assert.strictEqual(tenDigitWithHyphens.valid, true);
assert.strictEqual(tenDigitWithHyphens.phone, '+919864012345');

// Valid numbers with 0 prefix -> +91XXXXXXXXXX
const zeroPrefixPass = validateAndNormalizePhone('09864012345');
assert.strictEqual(zeroPrefixPass.valid, true);
assert.strictEqual(zeroPrefixPass.phone, '+919864012345');

// Valid numbers with +91 prefix
const plus91Pass = validateAndNormalizePhone('+91-98640-12345');
assert.strictEqual(plus91Pass.valid, true);
assert.strictEqual(plus91Pass.phone, '+919864012345');

const plus91Clean = validateAndNormalizePhone('+919864012345');
assert.strictEqual(plus91Clean.valid, true);
assert.strictEqual(plus91Clean.phone, '+919864012345');

// Valid international E.164
const intlE164 = validateAndNormalizePhone('+14155552671');
assert.strictEqual(intlE164.valid, true);
assert.strictEqual(intlE164.phone, '+14155552671');

// Invalid Phone Numbers -> Rejection
const tooShort = validateAndNormalizePhone('12345');
assert.strictEqual(tooShort.valid, false);
assert(tooShort.error.includes('Invalid phone number'));

const nonDigits = validateAndNormalizePhone('98640abcde');
assert.strictEqual(nonDigits.valid, false);

const invalidPrefix = validateAndNormalizePhone('0000000000');
assert.strictEqual(invalidPrefix.valid, false);

const nullInput = validateAndNormalizePhone(null);
assert.strictEqual(nullInput.valid, false);

const emptyInput = validateAndNormalizePhone('');
assert.strictEqual(emptyInput.valid, false);

console.log('  ✓ Phone validation correctly normalizes 10-digit/E.164 formats and rejects invalid inputs.\n');

// 2. HTTP Endpoint Integration (PUT /api/vehicles/:id & POST /api/vehicles)
console.log('2. Testing Backend Vehicle Update API (PUT /api/vehicles/:id)...');

const app = express();
app.use(express.json());

const fleet = [
  {
    id: 'VEH-NER-301',
    regNumber: 'AS-01-FL-9912',
    name: 'Assam Medical Response Unit 01',
    type: 'Refrigerated Van',
    capacity: '3.5 Ton',
    cargo: 'Vaccines & Cold Chain Supplies',
    status: 'IN_TRANSIT',
    speedKmH: 50,
    origin: 'Guwahati',
    destination: 'Silchar',
    currentPos: { lat: 25.4200, lng: 92.1500 },
    assignedCorridor: 'NH-6',
    delayEstMinutes: 15,
    priority: 'HIGH',
    driverName: 'R. Debbarma',
    driverPhone: '+91-98640-00000',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
];

// Replicate server vehicle routes
app.put('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const idx = fleet.findIndex((v) => v.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: `Vehicle ${id} not found.` });
  }

  const updates = { ...req.body };
  if (updates.driverPhone !== undefined) {
    const phoneVal = validateAndNormalizePhone(updates.driverPhone);
    if (!phoneVal.valid) {
      return res.status(400).json({ success: false, message: phoneVal.error });
    }
    updates.driverPhone = phoneVal.phone;
  }

  fleet[idx] = {
    ...fleet[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  res.json({ success: true, data: fleet[idx] });
});

app.post('/api/voice/calls/trigger', async (req, res) => {
  const { vehicleId, triggerSource = 'MANUAL_OPERATOR', flagReason, forceOverride = true } = req.body;
  const result = await voiceService.triggerSafetyCall(fleet, {
    vehicleId,
    triggerSource,
    flagReason,
    forceOverride,
  });

  if (!result.success) {
    return res.status(400).json({ success: false, message: result.error });
  }

  res.status(201).json({
    success: true,
    data: { session: result.session, vehicle: result.vehicle },
  });
});

const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // A. Attempt update with INVALID phone number -> expect HTTP 400
    console.log('  Step A: Testing update rejection on invalid phone...');
    const badResp = await fetch(`${baseUrl}/api/vehicles/VEH-NER-301`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverPhone: 'not-a-number' }),
    });
    const badData = await badResp.json();
    assert.strictEqual(badResp.status, 400);
    assert.strictEqual(badData.success, false);
    assert(badData.message.includes('Invalid phone number'));
    console.log('    ✓ Invalid phone correctly rejected with HTTP 400.');

    // B. Update with VALID 10-digit number -> expect HTTP 200 and +91 normalization
    console.log('  Step B: Testing dynamic update with 10-digit number (9864012345)...');
    const updateResp = await fetch(`${baseUrl}/api/vehicles/VEH-NER-301`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driverName: 'R. Debbarma (Updated)',
        driverPhone: '9864012345',
        speedKmH: 58,
      }),
    });
    const updateData = await updateResp.json();
    assert.strictEqual(updateResp.status, 200);
    assert.strictEqual(updateData.data.driverName, 'R. Debbarma (Updated)');
    assert.strictEqual(updateData.data.driverPhone, '+919864012345', 'Backend must store normalized E.164');
    assert.strictEqual(updateData.data.cargo, 'Vaccines & Cold Chain Supplies', 'Unrelated fields must be preserved');
    assert.strictEqual(updateData.data.assignedCorridor, 'NH-6', 'Corridor must remain intact');
    assert.strictEqual(updateData.data.speedKmH, 58);
    console.log('    ✓ Vehicle driverPhone dynamically updated to normalized +919864012345.');

    // C. PII Masking Verification
    console.log('  Step C: Testing PII Phone Masking for public dashboard...');
    const masked = maskPhone(updateData.data.driverPhone);
    assert.strictEqual(masked, '+91-98640-XXXXX');
    console.log(`    ✓ Public representation correctly masked: ${masked}`);

    // D. End-to-End Track 4 Integration with Updated Phone
    console.log('  Step D: Triggering Track 4 Safety Call using dynamic vehicle.driverPhone...');
    resetVoiceProviderRegistry();
    process.env.VOICE_PROVIDER = 'sarvam';
    process.env.SARVAM_LIVE_CALLS_ENABLED = 'false';
    resetCooldown();

    const trigResp = await fetch(`${baseUrl}/api/voice/calls/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: 'VEH-NER-301',
        flagReason: 'Active flash flood advisory near Sonapur',
        forceOverride: true,
      }),
    });

    const trigData = await trigResp.json();
    assert.strictEqual(trigResp.status, 201);
    assert.strictEqual(trigData.success, true);

    const session = trigData.data.session;
    assert.strictEqual(session.provider, 'sarvam');
    assert.strictEqual(session.isDryRun, true);
    assert(session.providerCallId.startsWith('SARVAM-DRYRUN-'));
    assert.strictEqual(session.driverPhone, '+91-98640-XXXXX', 'Public session must contain masked phone');
    console.log(`    ✓ Sarvam Provider executed dry-run outbound call for session: ${session.callId}`);
    console.log(`    ✓ Session Masked Phone: ${session.driverPhone}`);

    // E. Verify Sarvam Provider constructs payload using the updated vehicle.driverPhone
    console.log('  Step E: Verifying Sarvam Provider payload target...');
    const sarvamProv = getVoiceProvider('sarvam');
    const builtPayload = sarvamProv.buildOutboundPayload({
      session: { callId: 'TEST-CALL-01' },
      vehicle: fleet[0],
    });

    assert.strictEqual(builtPayload.user_config.user_phone_number, '+919864012345');
    assert.strictEqual(builtPayload.app_config.agent_variables.driver_name, 'R. Debbarma (Updated)');
    console.log('    ✓ Outbound payload destination verified: ' + maskPhone(builtPayload.user_config.user_phone_number));

    // F. Server-side Allowlist Protection Verification
    console.log('  Step F: Testing server-side Allowlist Protection with updated number...');
    const restrictedProvider = new SarvamVoiceProvider({
      liveCallsEnabled: true,
      allowedTestNumbers: '+919999988888', // Target +919864012345 is NOT allowed
      apiKey: 'test-key',
      orgId: 'test-org',
      workspaceId: 'test-ws',
      agentId: 'test-agent',
    });

    const allowlistCheck = restrictedProvider.checkPhoneAllowlist(fleet[0].driverPhone);
    assert.strictEqual(allowlistCheck.allowed, false);
    assert(allowlistCheck.reason.includes('not in SARVAM_ALLOWED_TEST_NUMBERS allowlist'));
    console.log('    ✓ Allowlist protection verified for dynamic destination number.');

    console.log('\n=== ALL DYNAMIC DRIVER PHONE & TRACK 4 TESTS PASSED SUCCESSFULLY ===\n');
  } finally {
    server.close();
  }
});
