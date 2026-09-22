import assert from 'node:assert';
import http from 'node:http';

console.log('=== [PROJECT BRAHMAPUTRA — INTEGRATION & REGRESSION VERIFICATION] ===\n');

// Import the express app from server/index.js if we separate it or run a quick test on the running instance / sub-server
// Let's verify through node test against all module endpoints and test Express handlers
import express from 'express';
import { voiceService } from '../server/voice/voiceService.js';
import { validateFlagRequest, validateTriggerRequest, resetCooldown } from '../server/voice/securityGuardrails.js';

const app = express();
app.use(express.json());

resetCooldown();

let testVehicles = [
  {
    id: 'VEH-NER-101',
    regNumber: 'AS-01-GC-4482',
    name: 'Assam Pharma-Logistics MedTruck 01',
    type: 'Refrigerated Medical Van',
    capacity: '3.5 Ton',
    cargo: 'Vaccines, Blood Plasma & Insulin',
    status: 'IN_TRANSIT',
    speedKmH: 48,
    origin: 'Guwahati',
    destination: 'Silchar',
    currentPos: { lat: 25.4200, lng: 92.1500 },
    assignedCorridor: 'NH-6',
    delayEstMinutes: 180,
    priority: 'EMERGENCY_CRITICAL',
    driverName: 'B. Kalita',
    driverPhone: '+91-98640-12345',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
];

// Wire test routes identical to server/index.js
app.post('/api/voice/flag-vehicle', async (req, res) => {
  const validation = validateFlagRequest(req.body);
  if (!validation.valid) return res.status(400).json({ success: false, message: validation.message });
  const { vehicleId, reason, flagged = true } = req.body;
  const result = await voiceService.flagVehicle(testVehicles, vehicleId, reason, flagged);
  if (!result.success) return res.status(404).json({ success: false, message: result.error });
  res.json({ success: true, data: result.vehicle });
});

app.post('/api/voice/calls/trigger', async (req, res) => {
  const validation = validateTriggerRequest(req.body);
  if (!validation.valid) return res.status(400).json({ success: false, message: validation.message });
  const result = await voiceService.triggerSafetyCall(testVehicles, req.body);
  if (!result.success) return res.status(400).json({ success: false, message: result.error });
  res.status(201).json({ success: true, data: { session: result.session, vehicle: result.vehicle } });
});

app.get('/api/voice/calls', (req, res) => {
  const { vehicleId } = req.query;
  const sessions = voiceService.getSessions(vehicleId);
  res.json({ success: true, count: sessions.length, data: sessions });
});

app.get('/api/voice/calls/:callId', (req, res) => {
  const session = voiceService.getSessionById(req.params.callId);
  if (!session) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: session });
});

app.post('/api/voice/calls/:callId/resolve', async (req, res) => {
  const result = await voiceService.resolveEscalation(testVehicles, req.params.callId, req.body.notes);
  if (!result.success) return res.status(404).json({ success: false, message: result.error });
  res.json({ success: true, data: result.session });
});

const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    console.log(`1. Testing POST /api/voice/flag-vehicle on ${baseUrl}...`);
    const flagResp = await fetch(`${baseUrl}/api/voice/flag-vehicle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId: 'VEH-NER-101', reason: 'Near Sonapur landslide', flagged: true }),
    });
    const flagData = await flagResp.json();
    assert.strictEqual(flagResp.status, 200);
    assert.strictEqual(flagData.success, true);
    assert.strictEqual(flagData.data.isFlagged, true);
    assert.strictEqual(flagData.data.safetyStatus, 'PENDING_CALL');
    console.log('   ✓ Vehicle flagged via API with PENDING_CALL');

    console.log('2. Testing POST /api/voice/calls/trigger (Simulate BREAKDOWN)...');
    const trigResp = await fetch(`${baseUrl}/api/voice/calls/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId: 'VEH-NER-101', simulatedOutcome: 'BREAKDOWN', forceOverride: true }),
    });
    const trigData = await trigResp.json();
    assert.strictEqual(trigResp.status, 201);
    assert.strictEqual(trigData.data.session.structuredOutcome, 'BREAKDOWN');
    assert.strictEqual(trigData.data.session.escalationRequired, true);
    assert.strictEqual(trigData.data.vehicle.safetyStatus, 'BREAKDOWN');
    const callId = trigData.data.session.callId;
    console.log(`   ✓ Call triggered via API -> Session ID: ${callId}, EscalationRequired: true`);

    console.log('3. Testing GET /api/voice/calls and GET /api/voice/calls/:callId...');
    const listResp = await fetch(`${baseUrl}/api/voice/calls?vehicleId=VEH-NER-101`);
    const listData = await listResp.json();
    assert.strictEqual(listResp.status, 200);
    assert(listData.count >= 1);

    const singleResp = await fetch(`${baseUrl}/api/voice/calls/${callId}`);
    const singleData = await singleResp.json();
    assert.strictEqual(singleResp.status, 200);
    assert.strictEqual(singleData.data.callId, callId);
    console.log('   ✓ Call retrieval by ID and vehicleId verified');

    console.log('4. Testing POST /api/voice/calls/:callId/resolve...');
    const resolveResp = await fetch(`${baseUrl}/api/voice/calls/${callId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Tow truck reached vehicle location' }),
    });
    const resolveData = await resolveResp.json();
    assert.strictEqual(resolveResp.status, 200);
    assert.strictEqual(resolveData.data.escalationResolved, true);
    console.log('   ✓ Escalation resolution API verified');

    console.log('\n=== ALL API INTEGRATION TESTS PASSED ===\n');
  } finally {
    server.close();
  }
});
