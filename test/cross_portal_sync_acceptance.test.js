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
console.log('PROJECT BRAHMAPUTRA — PHASE 3E USER → ADMIN OPERATIONAL SYNC');
console.log('================================================================\n');

async function runPhase3ESuite() {
  // 1. Setup Isolated Repositories (Shared authoritative store)
  const userRepo = new UserRepository(null);
  const vehRepo = new VehicleRepository(null);
  const depRepo = new DeploymentRepository(null);
  vehRepo.setDeploymentRepository(depRepo);
  vehRepo.setUserRepository(userRepo);
  depRepo.setVehicleRepository(vehRepo);

  // 2. Setup Express App
  const app = express();
  app.use(express.json());

  // Bootstrap Admin Account
  const adminPass = 'Brahmaputra@Admin2026';
  const adminHash = await hashPassword(adminPass);
  const adminUser = await userRepo.createUser({
    id: 'USR-ADMIN-001',
    fullName: 'NER State Director',
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

  // Vehicles Endpoints
  app.get('/api/vehicles', authenticateUser, async (req, res) => {
    const isUser = req.user.role === 'USER';
    const list = isUser
      ? await vehRepo.getAllVehicles({ ownerUserId: req.user.id })
      : await vehRepo.getAllVehicles();

    const projectedList = await Promise.all(
      list.map(async (v) => {
        const projected = await vehRepo.projectActiveDeployment(v);
        if (req.user.role === 'ADMIN') {
          return await vehRepo.attachSafeOwner(projected);
        }
        return projected;
      })
    );
    res.json({ success: true, count: projectedList.length, data: projectedList });
  });

  app.post('/api/vehicles', authenticateUser, async (req, res) => {
    const ownerUserId = req.user.role === 'USER' ? req.user.id : (req.body.ownerUserId || null);
    const created = await vehRepo.createVehicle({ ...req.body, ownerUserId });
    const projected = await vehRepo.projectActiveDeployment(created);
    res.status(201).json({ success: true, data: projected });
  });

  // Deployments Endpoints
  app.get('/api/deployments', authenticateUser, async (req, res) => {
    const isUser = req.user.role === 'USER';
    const list = isUser
      ? await depRepo.getAllDeployments({ ownerUserId: req.user.id })
      : await depRepo.getAllDeployments();
    res.json({ success: true, count: list.length, data: list });
  });

  app.post('/api/deployments', authenticateUser, async (req, res) => {
    const targetVeh = await vehRepo.getVehicleById(req.body.vehicleId);
    if (!targetVeh) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    if (req.user.role === 'USER' && targetVeh.ownerUserId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    const dep = await depRepo.createDeployment(req.body);
    res.status(201).json({ success: true, data: dep });
  });

  app.post('/api/deployments/:id/complete', authenticateUser, async (req, res) => {
    const dep = await depRepo.getDeploymentById(req.params.id);
    if (!dep) return res.status(404).json({ success: false, message: 'Deployment not found' });
    const veh = await vehRepo.getVehicleById(dep.vehicleId);
    if (req.user.role === 'USER' && veh?.ownerUserId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Deployment not found' });
    }
    const completed = await depRepo.completeDeployment(req.params.id);
    res.json({ success: true, data: completed });
  });

  // Flag vehicle endpoint for admin
  app.post('/api/voice/flag-vehicle', authenticateUser, async (req, res) => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin role required.' });
    }
    const updated = await vehRepo.updateVehicle(req.body.vehicleId, {
      isFlagged: true,
      flagReason: req.body.reason || 'Safety Inspection',
    });
    res.json({ success: true, data: updated });
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
    // 1. Authenticate Admin and Register User
    console.log('1. Setting up Admin & Operator sessions...');
    const adminLoginRes = await makeReq('/api/auth/login', {
      method: 'POST',
      body: { email: 'director@brahmaputra.gov.in', password: adminPass },
    });
    assert.strictEqual(adminLoginRes.status, 200);
    const adminToken = adminLoginRes.data.token;

    const userARes = await makeReq('/api/auth/register', {
      method: 'POST',
      body: { fullName: 'Operator Brahmaputra Logistics', email: 'op.brahmaputra@ner.in', password: 'Password@123' },
    });
    assert.strictEqual(userARes.status, 201);
    const userAToken = userARes.data.token;
    const userA = userARes.data.user;
    console.log('  ✓ 1: Admin & Operator tokens generated.');

    // 2. User registers Vehicle X
    console.log('2. User creates Vehicle X...');
    const vehCreateRes = await makeReq('/api/vehicles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: {
        name: 'Kopili Express Heavy Hauler',
        type: 'Heavy Cargo Truck (10-Ton)',
        licensePlate: 'AS-01-KP-9090',
        cargoCapacityKg: 10000,
        driverName: 'Dipankar Borah',
        driverPhone: '+91 98640 54321',
        currentLocationLat: 26.1445,
        currentLocationLng: 91.7362,
        currentLocationName: 'Guwahati Regional Hub',
      },
    });
    assert.strictEqual(vehCreateRes.status, 201);
    const vehicleX = vehCreateRes.data.data;
    console.log('  ✓ 2: User registered Vehicle X.');

    // 3. Admin instantly retrieves Vehicle X with safe owner projection
    console.log('3. Verifying Admin sees Vehicle X from the SAME database...');
    const adminVehRes = await makeReq('/api/vehicles', { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.strictEqual(adminVehRes.status, 200);
    const matchingVeh = adminVehRes.data.data.find((v) => v.id === vehicleX.id);
    assert.ok(matchingVeh, 'Admin must see Vehicle X immediately');
    assert.strictEqual(matchingVeh.licensePlate, 'AS-01-KP-9090');
    assert.ok(matchingVeh.owner, 'Admin projection must include owner details');
    assert.strictEqual(matchingVeh.owner.fullName, 'Operator Brahmaputra Logistics');
    assert.strictEqual(matchingVeh.owner.email, 'op.brahmaputra@ner.in');
    assert.strictEqual(matchingVeh.owner.passwordHash, undefined, 'passwordHash must never be exposed');
    console.log('  ✓ 3: Admin sees Vehicle X with safe owner metadata.');

    // 4. User deploys Vehicle X on Guwahati -> Shillong
    console.log('4. User dispatches Deployment D1 on Vehicle X...');
    const depCreateRes = await makeReq('/api/deployments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: {
        vehicleId: vehicleX.id,
        origin: 'Guwahati',
        destination: 'Shillong',
        assignedCorridor: 'Guwahati - Shillong (GS Road / NH-27)',
        cargo: 'Essential Pharmaceuticals',
        priority: 'HIGH',
        status: 'ACTIVE',
      },
    });
    assert.strictEqual(depCreateRes.status, 201);
    const deploymentD1 = depCreateRes.data.data;
    console.log('  ✓ 4: User dispatched Deployment D1.');

    // 5. Admin instantly sees Deployment D1 in active deployments
    console.log('5. Verifying Admin sees Deployment D1 in active missions...');
    const adminDepRes = await makeReq('/api/deployments', { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.strictEqual(adminDepRes.status, 200);
    const matchingDep = adminDepRes.data.data.find((d) => d.id === deploymentD1.id);
    assert.ok(matchingDep, 'Admin must see Deployment D1 immediately');
    assert.strictEqual(matchingDep.status, 'ACTIVE');
    assert.strictEqual(matchingDep.vehicleId, vehicleX.id);

    const adminVehStatusRes = await makeReq('/api/vehicles', { headers: { Authorization: `Bearer ${adminToken}` } });
    const vehUnderway = adminVehStatusRes.data.data.find((v) => v.id === vehicleX.id);
    assert.strictEqual(vehUnderway.hasActiveDeployment, true);
    assert.strictEqual(vehUnderway.deploymentStatus, 'ACTIVE');
    console.log('  ✓ 5: Admin sees Deployment D1 and vehicle active transit state.');

    // 6. Admin flags Vehicle X for safety inspection
    console.log('6. Admin flags user-owned Vehicle X...');
    const flagRes = await makeReq('/api/voice/flag-vehicle', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { vehicleId: vehicleX.id, reason: 'Weather hazard on NH-27' },
    });
    assert.strictEqual(flagRes.status, 200);
    console.log('  ✓ 6: Admin successfully flagged user-owned vehicle.');

    // 7. User completes Deployment D1
    console.log('7. User marks Deployment D1 completed...');
    const compRes = await makeReq(`/api/deployments/${deploymentD1.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.strictEqual(compRes.status, 200);
    assert.strictEqual(compRes.data.data.status, 'COMPLETED');
    console.log('  ✓ 7: User completed deployment.');

    // 8. Admin view immediately reflects completion and restored availability
    console.log('8. Verifying Admin sees completed status & restored availability...');
    const adminDepAfterRes = await makeReq('/api/deployments', { headers: { Authorization: `Bearer ${adminToken}` } });
    const compDepAdmin = adminDepAfterRes.data.data.find((d) => d.id === deploymentD1.id);
    assert.strictEqual(compDepAdmin.status, 'COMPLETED');

    const adminVehAfterRes = await makeReq('/api/vehicles', { headers: { Authorization: `Bearer ${adminToken}` } });
    const vehRestored = adminVehAfterRes.data.data.find((v) => v.id === vehicleX.id);
    assert.strictEqual(vehRestored.hasActiveDeployment, false);
    assert.strictEqual(vehRestored.deploymentStatus, 'AVAILABLE');
    console.log('  ✓ 8: Single authoritative database model verified across both portals.');

    console.log('\n================================================================');
    console.log('✓ ALL 8 PHASE 3E USER → ADMIN OPERATIONAL SYNC TESTS PASSED');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runPhase3ESuite().catch((err) => {
  console.error('\n❌ PHASE 3E SUITE FAILURE:', err);
  process.exit(1);
});
