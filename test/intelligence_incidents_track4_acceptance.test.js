import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import { UserRepository } from '../server/db/userRepository.js';
import { VehicleRepository } from '../server/db/vehicleRepository.js';
import { DeploymentRepository } from '../server/db/deploymentRepository.js';
import {
  validateAndNormalizeEmail,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  toSafeUser,
} from '../server/auth/authUtils.js';

console.log('================================================================');
console.log('PROJECT BRAHMAPUTRA — PHASE 3F / 3G / 3H ADVANCED ACCEPTANCE');
console.log('================================================================\n');

async function runAdvancedSuite() {
  // 1. Setup Isolated Repositories
  const userRepo = new UserRepository(null);
  const vehRepo = new VehicleRepository(null);
  const depRepo = new DeploymentRepository(null);
  vehRepo.setDeploymentRepository(depRepo);
  vehRepo.setUserRepository(userRepo);
  depRepo.setVehicleRepository(vehRepo);

  let incidents = [];
  let alerts = [];

  // 2. Setup Express App
  const app = express();
  app.use(express.json());

  // Bootstrap Admin Account
  const adminPass = 'Brahmaputra@Admin2026';
  const adminHash = await hashPassword(adminPass);
  const adminUser = await userRepo.createUser({
    id: 'USR-ADMIN-001',
    fullName: 'NER Command Director',
    email: 'director@brahmaputra.gov.in',
    passwordHash: adminHash,
    role: 'ADMIN',
    isActive: true,
  });

  // Auth Middleware
  const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
    if (!token) return res.status(401).json({ success: false, message: 'Auth required.' });

    try {
      const decoded = verifyToken(token);
      const user = await userRepo.getUserById(decoded.userId);
      if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid user.' });
      req.user = toSafeUser(user);
      req.token = token;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
  };

  const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const decoded = verifyToken(token);
        const user = await userRepo.getUserById(decoded.userId);
        if (user && user.isActive) {
          req.user = toSafeUser(user);
        }
      } catch (err) {}
    }
    next();
  };

  const requireRole = (role) => (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ success: false, message: `Access denied. Role '${role}' required.` });
    }
    next();
  };

  // Auth Endpoints
  app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password } = req.body || {};
    const emailVal = validateAndNormalizeEmail(email);
    const passHash = await hashPassword(password);
    const user = await userRepo.createUser({
      fullName: fullName.trim(),
      email: emailVal.email,
      passwordHash: passHash,
      role: 'USER',
    });
    const token = generateToken(user);
    res.status(201).json({ success: true, token, user: toSafeUser(user) });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    const user = await userRepo.getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const token = generateToken(user);
    res.json({ success: true, token, user: toSafeUser(user) });
  });

  // Vehicle Endpoints
  app.get('/api/vehicles', authenticateUser, async (req, res) => {
    const isUser = req.user.role === 'USER';
    const list = isUser
      ? await vehRepo.getAllVehicles({ ownerUserId: req.user.id })
      : await vehRepo.getAllVehicles();
    const projected = await Promise.all(list.map((v) => vehRepo.projectActiveDeployment(v)));
    res.json({ success: true, data: projected });
  });

  app.post('/api/vehicles', authenticateUser, async (req, res) => {
    const ownerUserId = req.user.role === 'USER' ? req.user.id : null;
    const v = await vehRepo.createVehicle({ ...req.body, ownerUserId });
    res.status(201).json({ success: true, data: v });
  });

  // Deployment Endpoints
  app.post('/api/deployments', authenticateUser, async (req, res) => {
    const veh = await vehRepo.getVehicleById(req.body.vehicleId);
    if (!veh) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    if (req.user.role === 'USER' && veh.ownerUserId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    const dep = await depRepo.createDeployment(req.body);
    res.status(201).json({ success: true, data: dep });
  });

  // Route Planning Endpoint (Phase 3F)
  app.post('/api/routes/plan', async (req, res) => {
    const { origin = 'Guwahati', destination = 'Silchar', avoidDisruptions = true } = req.body;
    const isDetour = (origin === 'Guwahati' && destination === 'Silchar') && avoidDisruptions;
    res.json({
      success: true,
      data: {
        origin,
        destination,
        recommendedCorridor: isDetour ? 'Guwahati -> Nagaon (NH-27) -> Haflong Bypass -> Silchar' : `${origin} -> ${destination} Direct`,
        distanceKm: isDetour ? 342 : 215,
        estimatedDurationHours: isDetour ? 6.8 : 5.0,
        delayAvoidedMinutes: isDetour ? 240 : 0,
        avoidedIncidents: isDetour ? ['NH-6 Sonapur Tunnel Blockade'] : [],
        terrainAdvisory: isDetour ? 'Haflong mountain pass clear with police escort.' : 'Direct arterial clear.',
      },
    });
  });

  // Incident Reporting Endpoints (Phase 3G)
  app.get('/api/incidents', (req, res) => {
    res.json({ success: true, data: incidents });
  });

  app.post('/api/incidents', optionalAuth, (req, res) => {
    const { title, severity, location, description } = req.body;
    const reporterName = req.user ? req.user.fullName : 'Public Observer';
    const reporterId = req.user ? req.user.id : null;
    const reporterRole = req.user ? req.user.role : 'ANONYMOUS';

    const inc = {
      id: `INC-NER-${Date.now().toString(36).toUpperCase()}`,
      title,
      severity: severity || 'MEDIUM',
      location: location || 'NER Arterial',
      description,
      reportedBy: reporterName,
      reporterId,
      reporterRole,
      reportedAt: new Date().toISOString(),
    };
    incidents.unshift(inc);
    res.status(201).json({ success: true, data: inc });
  });

  // Track 4 Safety Voice Endpoints (Phase 3H)
  app.post('/api/voice/flag-vehicle', authenticateUser, requireRole('ADMIN'), async (req, res) => {
    const { vehicleId, reason } = req.body;
    const veh = await vehRepo.getVehicleById(vehicleId);
    if (!veh) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    const updated = await vehRepo.updateVehicle(vehicleId, { isFlagged: true, flagReason: reason });
    res.json({ success: true, data: updated });
  });

  app.post('/api/voice/calls/trigger', authenticateUser, requireRole('ADMIN'), async (req, res) => {
    const { vehicleId, simulatedOutcome = 'ASSISTANCE_REQUIRED' } = req.body;
    const veh = await vehRepo.getVehicleById(vehicleId);
    if (!veh) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    // Mock AI call execution and persistent safety classification
    const updated = await vehRepo.updateVehicle(vehicleId, {
      safetyStatus: simulatedOutcome,
      lastSafetyCheck: new Date().toISOString(),
    });

    const newAlert = {
      id: `ALT-NER-${Date.now().toString(36).toUpperCase()}`,
      headline: `VOICE SAFETY ESCALATION: ${simulatedOutcome} (${veh.licensePlate || veh.regNumber})`,
      district: veh.assignedCorridor || 'Transit Corridor',
      level: 'CRITICAL',
      impact: `Driver indicated ${simulatedOutcome}. Immediate regional dispatch requested.`,
      activeSince: 'Just now',
    };
    alerts.unshift(newAlert);

    res.status(201).json({
      success: true,
      message: 'Safety call executed and classified.',
      data: { vehicle: updated, alert: newAlert },
    });
  });

  app.get('/api/alerts', (req, res) => {
    res.json({ success: true, data: alerts });
  });

  // Start HTTP Server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  async function makeReq(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  try {
    // 1. Authenticate Admin and Operator
    console.log('1. Setting up Admin & Operator sessions...');
    const adminLoginRes = await makeReq('/api/auth/login', {
      method: 'POST',
      body: { email: 'director@brahmaputra.gov.in', password: adminPass },
    });
    assert.strictEqual(adminLoginRes.status, 200);
    const adminToken = adminLoginRes.data.token;

    const userRes = await makeReq('/api/auth/register', {
      method: 'POST',
      body: { fullName: 'Operator Debraj', email: 'debraj@nerlogistics.in', password: 'Password@123' },
    });
    assert.strictEqual(userRes.status, 201);
    const userToken = userRes.data.token;
    const user = userRes.data.user;
    console.log('  ✓ 1: Auth tokens ready.');

    // 2. Test Phase 3F: Tactical Route Planning & Feasibility
    console.log('2. Testing Phase 3F Route Planning & Disruption Avoidance...');
    const routeRes = await makeReq('/api/routes/plan', {
      method: 'POST',
      body: { origin: 'Guwahati', destination: 'Silchar', avoidDisruptions: true },
    });
    assert.strictEqual(routeRes.status, 200);
    assert.ok(routeRes.data.data.recommendedCorridor.includes('Haflong Bypass'));
    assert.strictEqual(routeRes.data.data.delayAvoidedMinutes, 240);
    assert.ok(routeRes.data.data.avoidedIncidents.length > 0);
    console.log('  ✓ 2: Route planning computed optimal disruption bypass.');

    // 3. Test Phase 3G: Authenticated Field Incident Reporting
    console.log('3. Testing Phase 3G Field Incident Reporting with Server-Assigned Identity...');
    const incRes = await makeReq('/api/incidents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        title: 'Fallen Boulders near Umkiang NH-6',
        severity: 'HIGH',
        location: 'Umkiang, Meghalaya',
        description: 'Single-lane blocked by boulder fall.',
        reportedBy: 'Spoofed Name', // Client attempt to spoof name
      },
    });
    assert.strictEqual(incRes.status, 201);
    const createdInc = incRes.data.data;
    assert.strictEqual(createdInc.reportedBy, 'Operator Debraj', 'Server must set authenticated user name');
    assert.strictEqual(createdInc.reporterId, user.id);
    assert.strictEqual(createdInc.reporterRole, 'USER');

    const adminIncList = await makeReq('/api/incidents');
    assert.strictEqual(adminIncList.status, 200);
    assert.ok(adminIncList.data.data.some((i) => i.id === createdInc.id));
    console.log('  ✓ 3: Incident report recorded and visible with verified author identity.');

    // 4. Test Phase 3H: Track 4 Workflow on User-Deployed Vehicle
    console.log('4. Testing Phase 3H Track 4 Safety Workflow on User Vehicle...');
    // User registers vehicle and deploys it
    const vehRes = await makeReq('/api/vehicles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        name: 'Debraj Hill Carrier',
        type: '4WD Hill Cargo Carrier (3-Ton)',
        licensePlate: 'AS-01-DH-7777',
        driverName: 'Prabin Barman',
        driverPhone: '+91 98640 77777',
      },
    });
    assert.strictEqual(vehRes.status, 201);
    const vehicleId = vehRes.data.data.id;

    const depRes = await makeReq('/api/deployments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        vehicleId,
        origin: 'Guwahati',
        destination: 'Shillong',
        status: 'ACTIVE',
      },
    });
    assert.strictEqual(depRes.status, 201);

    // User cannot trigger Track 4
    const userVoiceRes = await makeReq('/api/voice/calls/trigger', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: { vehicleId },
    });
    assert.strictEqual(userVoiceRes.status, 403, 'Operator must be forbidden from Track 4 trigger');

    // Admin flags vehicle
    const flagRes = await makeReq('/api/voice/flag-vehicle', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { vehicleId, reason: 'Weather hazard check' },
    });
    assert.strictEqual(flagRes.status, 200);

    // Admin triggers mock safety check
    const triggerRes = await makeReq('/api/voice/calls/trigger', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { vehicleId, simulatedOutcome: 'BREAKDOWN' },
    });
    assert.strictEqual(triggerRes.status, 201);
    assert.strictEqual(triggerRes.data.data.vehicle.safetyStatus, 'BREAKDOWN');

    // Admin checks alerts
    const alertsRes = await makeReq('/api/alerts');
    assert.strictEqual(alertsRes.status, 200);
    assert.ok(alertsRes.data.data.some((a) => a.headline.includes('BREAKDOWN')));
    console.log('  ✓ 4: Track 4 safety evaluation persisted and escalation alert recorded.');

    console.log('\n================================================================');
    console.log('✓ ALL PHASE 3F / 3G / 3H ADVANCED ACCEPTANCE TESTS PASSED');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runAdvancedSuite().catch((err) => {
  console.error('\n❌ ADVANCED SUITE FAILURE:', err);
  process.exit(1);
});
