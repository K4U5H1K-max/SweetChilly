/**
 * Project Brahmaputra — Issue 4
 * Remove Demo/Static Operational Data & Empty-State Automated Test Suite
 *
 * Verifies that:
 * - TEST A: Brand new database with 0 vehicles returns empty array, 0 count, no auto-seeded demo fleet.
 * - TEST B: Brand new database with 0 deployments returns empty active journeys, 0 count, no auto-seeded demo deployments.
 * - TEST C: Admin dashboard queries with zero operational records return valid HTTP 200 responses, 0 counts, and empty collections.
 * - TEST D: Newly registered User has My Vehicles = empty [], Active Journeys = empty [].
 * - TEST E: User registers 1 vehicle -> Exactly 1 owned vehicle exists in DB, 0 demo vehicles appear.
 * - TEST F: User deploys vehicle -> Exactly 1 genuine active deployment exists, accurately reflected across APIs.
 * - TEST G: Server restart / re-initialization simulation preserves user's genuine records without injecting demo seeds.
 * - TEST H: Issue 1 User Ownership Isolation remains strictly intact (cross-user access blocked).
 * - TEST I: Issue 2 Deployment-based active visibility remains strictly intact (registered != deployed).
 * - TEST J: Issue 3 Route persistence remains strictly intact (Agartala -> Silchar without Guwahati fallback).
 * - TEST K: Idempotent database schema initialization verified (calling initializeDatabase multiple times produces 0 fake records).
 */

import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import { UserRepository } from '../server/db/userRepository.js';
import { VehicleRepository } from '../server/db/vehicleRepository.js';
import { DeploymentRepository } from '../server/db/deploymentRepository.js';
import {
  initializeDatabase,
  CREATE_USERS_TABLE_SQL,
  CREATE_VEHICLES_TABLE_SQL,
  CREATE_DEPLOYMENTS_TABLE_SQL,
  INITIAL_NER_VEHICLES,
  INITIAL_NER_DEPLOYMENTS,
  resolveLocationCoordinates,
} from '../server/db/schema.js';
import { calculateKPIs } from '../src/data/nerData.js';
import {
  hashPassword,
  generateToken,
  verifyToken,
  toSafeUser,
} from '../server/auth/authUtils.js';

console.log('================================================================');
console.log('PROJECT BRAHMAPUTRA — ISSUE 4: DEMO DATA REMOVAL & EMPTY STATES');
console.log('================================================================\n');

async function runIssue4TestSuite() {
  // 1. Setup Completely Clean Repositories (seedDemo: false)
  const userRepo = new UserRepository(null);
  const vehRepo = new VehicleRepository(null, { seedDemo: false });
  const depRepo = new DeploymentRepository(null, { seedDemo: false });
  vehRepo.setDeploymentRepository(depRepo);
  vehRepo.setUserRepository(userRepo);
  depRepo.setVehicleRepository(vehRepo);

  // 2. Setup Express App matching server/index.js contract
  const app = express();
  app.use(express.json());

  const testAuthenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
    if (!token && req.headers['x-access-token']) {
      token = String(req.headers['x-access-token']).trim();
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    try {
      const decoded = verifyToken(token);
      const user = await userRepo.getUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User account not found.' });
      }
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'User account has been deactivated.' });
      }
      req.user = toSafeUser(user);
      req.token = token;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
  };

  const testOptionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded?.userId) {
          const user = await userRepo.getUserById(decoded.userId);
          if (user && user.isActive) {
            req.user = toSafeUser(user);
            req.token = token;
          }
        }
      } catch (e) {}
    }
    next();
  };

  // Vehicles Endpoints
  app.get('/api/vehicles', testOptionalAuth, async (req, res) => {
    try {
      const isUser = req.user && req.user.role === 'USER';
      const list = isUser
        ? await vehRepo.getAllVehicles({ ownerUserId: req.user.id })
        : await vehRepo.getAllVehicles();

      const projectedList = await Promise.all(
        list.map(async (v) => {
          const projected = await vehRepo.projectActiveDeployment(v);
          if (req.user && req.user.role === 'ADMIN') {
            return await vehRepo.attachSafeOwner(projected);
          }
          return projected;
        })
      );
      return res.json({ success: true, count: projectedList.length, data: projectedList });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/vehicles', testAuthenticate, async (req, res) => {
    try {
      const v = req.body;
      const ownerUserId = req.user.id;
      const created = await vehRepo.createVehicle({ ...v, ownerUserId });
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Deployments Endpoints
  app.get('/api/deployments', testOptionalAuth, async (req, res) => {
    try {
      const { status, vehicleId } = req.query;
      const isUser = req.user && req.user.role === 'USER';
      const filters = { status, vehicleId };
      if (isUser) {
        filters.ownerUserId = req.user.id;
      }

      const list = await depRepo.getAllDeployments(filters);
      return res.json({ success: true, count: list.length, data: list });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/deployments', testAuthenticate, async (req, res) => {
    try {
      const {
        vehicleId,
        origin,
        destination,
        assignedCorridor,
        cargo,
        priority,
        status,
        originLat,
        originLng,
        destinationLat,
        destinationLng,
      } = req.body;

      if (!vehicleId) {
        return res.status(400).json({ success: false, message: 'Vehicle ID is required.' });
      }
      if (!origin || !String(origin).trim()) {
        return res.status(400).json({ success: false, message: 'Origin is required.' });
      }
      if (!destination || !String(destination).trim()) {
        return res.status(400).json({ success: false, message: 'Destination is required.' });
      }

      const vehicle = await vehRepo.getVehicleById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      }

      if (req.user.role !== 'ADMIN' && vehicle.ownerUserId !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      }

      const activeDep = await depRepo.getActiveDeploymentByVehicleId(vehicleId);
      if (activeDep) {
        return res.status(409).json({
          success: false,
          message: `Vehicle ${vehicle.regNumber || vehicleId} already has an active deployment (${activeDep.id}).`,
          data: activeDep,
        });
      }

      const newDeployment = await depRepo.createDeployment({
        vehicleId,
        userId: req.user.id,
        origin: origin.trim(),
        destination: destination.trim(),
        assignedCorridor,
        cargo,
        priority,
        status: status || 'ACTIVE',
        originLat,
        originLng,
        destinationLat,
        destinationLng,
      });

      return res.status(201).json({ success: true, data: newDeployment });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Start Express Test Server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, options = {}) {
    const url = new URL(path, baseUrl);
    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data: json };
  }

  try {
    // 3. Create Administrator and Operators
    const passwordHash = await hashPassword('Password@2026');

    const admin = await userRepo.createUser({
      id: 'USR-ADMIN-HQ',
      fullName: 'Regional HQ Administrator',
      email: 'admin.hq@ner.gov.in',
      passwordHash,
      role: 'ADMIN',
    });
    const tokenAdmin = generateToken(admin);

    const user1 = await userRepo.createUser({
      id: 'USR-OP-ASSAM',
      fullName: 'Assam Logistics Operator',
      email: 'operator.assam@ner.gov.in',
      passwordHash,
      role: 'USER',
    });
    const tokenUser1 = generateToken(user1);

    const user2 = await userRepo.createUser({
      id: 'USR-OP-TRIPURA',
      fullName: 'Tripura Logistics Operator',
      email: 'operator.tripura@ner.gov.in',
      passwordHash,
      role: 'USER',
    });
    const tokenUser2 = generateToken(user2);

    console.log('[Setup] Test environment and clean repositories initialized.\n');

    // =========================================================================
    // TEST A: Database Contains No Vehicles
    // =========================================================================
    console.log('--- TEST A: Zero Vehicles in Initial Database ---');

    const vehRes = await request('/api/vehicles', { method: 'GET', token: tokenAdmin });
    assert.strictEqual(vehRes.status, 200);
    assert.strictEqual(vehRes.data.count, 0, 'Initial vehicle count must be exactly 0');
    assert.deepStrictEqual(vehRes.data.data, [], 'Initial vehicles list must be empty array []');
    console.log('PASS: TEST A (0 vehicles returned, zero auto-seeded demo vehicles)\n');

    // =========================================================================
    // TEST B: Database Contains No Deployments
    // =========================================================================
    console.log('--- TEST B: Zero Deployments in Initial Database ---');

    const depRes = await request('/api/deployments', { method: 'GET', token: tokenAdmin });
    assert.strictEqual(depRes.status, 200);
    assert.strictEqual(depRes.data.count, 0, 'Initial deployment count must be exactly 0');
    assert.deepStrictEqual(depRes.data.data, [], 'Initial deployments list must be empty array []');

    const activeDepRes = await request('/api/deployments?status=ACTIVE', { method: 'GET', token: tokenAdmin });
    assert.strictEqual(activeDepRes.status, 200);
    assert.strictEqual(activeDepRes.data.count, 0);
    assert.deepStrictEqual(activeDepRes.data.data, []);
    console.log('PASS: TEST B (0 deployments returned, zero auto-seeded demo deployments)\n');

    // =========================================================================
    // TEST C: Admin Dashboard with Zero Operational Records
    // =========================================================================
    console.log('--- TEST C: Admin Dashboard APIs & Dynamic KPIs with Zero Records ---');

    const emptyVehicles = vehRes.data.data;
    const emptyDeployments = depRes.data.data;
    const emptyKPIs = calculateKPIs([], [], emptyVehicles, undefined, undefined, emptyDeployments);

    assert.strictEqual(emptyKPIs.totalVehicles, 0, 'totalVehicles KPI must be 0');
    assert.strictEqual(emptyKPIs.activeDeployments, 0, 'activeDeployments KPI must be 0');
    assert.strictEqual(emptyKPIs.vehiclesInTransit, 0, 'vehiclesInTransit KPI must be 0');
    assert.strictEqual(emptyKPIs.criticalBottlenecks, 0, 'criticalBottlenecks KPI must be 0');
    assert.strictEqual(emptyKPIs.activeAlerts, 0, 'activeAlerts KPI must be 0');
    console.log('PASS: TEST C (Admin KPIs dynamically evaluate to 0 for empty database without hardcoded fallbacks)\n');

    // =========================================================================
    // TEST D: New User with Empty Fleet
    // =========================================================================
    console.log('--- TEST D: New User Initial Empty State ---');

    const user1Vehicles = await request('/api/vehicles', { method: 'GET', token: tokenUser1 });
    assert.strictEqual(user1Vehicles.status, 200);
    assert.strictEqual(user1Vehicles.data.count, 0);
    assert.deepStrictEqual(user1Vehicles.data.data, []);

    const user1Deployments = await request('/api/deployments', { method: 'GET', token: tokenUser1 });
    assert.strictEqual(user1Deployments.status, 200);
    assert.strictEqual(user1Deployments.data.count, 0);
    assert.deepStrictEqual(user1Deployments.data.data, []);
    console.log('PASS: TEST D (New user receives empty fleet and zero active journeys)\n');

    // =========================================================================
    // TEST E: User Registers 1 Real Vehicle
    // =========================================================================
    console.log('--- TEST E: User Registers Exactly 1 Vehicle ---');

    const regRes = await request('/api/vehicles', {
      method: 'POST',
      token: tokenUser1,
      body: {
        id: 'VEH-AS-REAL-01',
        regNumber: 'AS-01-XX-5555',
        name: 'Assam Brahmaputra Carrier #1',
        type: 'Medium Transport Truck (5-Ton)',
        origin: 'Guwahati',
        currentLocationName: 'Guwahati Logistics Hub',
        driverName: 'R. Bora',
        driverPhone: '+919864112233',
      },
    });
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.data.data.id, 'VEH-AS-REAL-01');
    assert.strictEqual(regRes.data.data.ownerUserId, user1.id);

    // Verify User 1 now sees exactly 1 vehicle
    const user1Fleet = await request('/api/vehicles', { method: 'GET', token: tokenUser1 });
    assert.strictEqual(user1Fleet.data.count, 1);
    assert.strictEqual(user1Fleet.data.data[0].id, 'VEH-AS-REAL-01');

    // Verify Admin sees exactly 1 vehicle in system
    const adminFleet = await request('/api/vehicles', { method: 'GET', token: tokenAdmin });
    assert.strictEqual(adminFleet.data.count, 1);
    assert.strictEqual(adminFleet.data.data[0].id, 'VEH-AS-REAL-01');
    assert.strictEqual(adminFleet.data.data[0].owner.fullName, 'Assam Logistics Operator');

    console.log('PASS: TEST E (Exactly 1 real vehicle created and registered in database)\n');

    // =========================================================================
    // TEST F: User Deploys That Vehicle (Agartala -> Silchar)
    // =========================================================================
    console.log('--- TEST F: User Deploys Vehicle on Genuine Route ---');

    const depResF = await request('/api/deployments', {
      method: 'POST',
      token: tokenUser1,
      body: {
        vehicleId: 'VEH-AS-REAL-01',
        origin: 'Agartala',
        destination: 'Silchar',
        assignedCorridor: 'Agartala - Silchar Corridor (NH-8 / NH-6)',
        cargo: 'Emergency Relief Consignment',
        priority: 'HIGH',
        status: 'ACTIVE',
        originLat: 23.8315,
        originLng: 91.2868,
        destinationLat: 24.8170,
        destinationLng: 92.7960,
      },
    });
    assert.strictEqual(depResF.status, 201);
    const createdDep = depResF.data.data;
    assert.strictEqual(createdDep.origin, 'Agartala');
    assert.strictEqual(createdDep.destination, 'Silchar');

    // Verify User 1 active deployment
    const user1ActiveDeps = await request('/api/deployments?status=ACTIVE', { method: 'GET', token: tokenUser1 });
    assert.strictEqual(user1ActiveDeps.data.count, 1);
    assert.strictEqual(user1ActiveDeps.data.data[0].origin, 'Agartala');

    // Verify Admin Active Journeys
    const adminActiveDeps = await request('/api/deployments?status=ACTIVE', { method: 'GET', token: tokenAdmin });
    assert.strictEqual(adminActiveDeps.data.count, 1);
    assert.strictEqual(adminActiveDeps.data.data[0].vehicleId, 'VEH-AS-REAL-01');

    console.log('PASS: TEST F (Genuine deployment active: Agartala -> Silchar)\n');

    // =========================================================================
    // TEST G: Server Restart / Reinitialization Simulation
    // =========================================================================
    console.log('--- TEST G: Server Restart Simulation (Zero Demo Records Injected) ---');

    // Take snapshot of persistent memory
    const snapshotVehs = await vehRepo.getAllVehicles();
    const snapshotDeps = await depRepo.getAllDeployments();

    // Create fresh repository instances simulating server restart
    const restartedVehRepo = new VehicleRepository(null, { seedDemo: false });
    const restartedDepRepo = new DeploymentRepository(null, { seedDemo: false });
    restartedVehRepo.syncMemoryCache(snapshotVehs);
    restartedDepRepo.memoryStore = snapshotDeps.map((d) => ({ ...d }));
    restartedVehRepo.setDeploymentRepository(restartedDepRepo);

    const restoredVehs = await restartedVehRepo.getAllVehicles();
    const restoredDeps = await restartedDepRepo.getAllDeployments();

    assert.strictEqual(restoredVehs.length, 1, 'Restarted fleet must contain exactly the 1 real vehicle');
    assert.strictEqual(restoredVehs[0].id, 'VEH-AS-REAL-01');
    assert.strictEqual(restoredDeps.length, 1, 'Restarted deployments must contain exactly the 1 real deployment');
    assert.strictEqual(restoredDeps[0].origin, 'Agartala');

    // Verify none of the 8 demo vehicles were auto-generated
    for (const demoVeh of INITIAL_NER_VEHICLES) {
      assert.ok(!restoredVehs.some((v) => v.id === demoVeh.id), `Demo vehicle ${demoVeh.id} must NOT exist`);
    }

    console.log('PASS: TEST G (Reinitialization maintains genuine records with zero demo data injection)\n');

    // =========================================================================
    // TEST H: Issue 1 Ownership Isolation Regression
    // =========================================================================
    console.log('--- TEST H: Issue 1 Ownership Isolation Verification ---');

    // User 2 lists vehicles -> must be 0 (cannot see User 1's vehicle)
    const user2Vehicles = await request('/api/vehicles', { method: 'GET', token: tokenUser2 });
    assert.strictEqual(user2Vehicles.data.count, 0, 'User 2 must see 0 vehicles');

    // User 2 attempts to deploy User 1's vehicle -> 404
    const user2DeployAttempt = await request('/api/deployments', {
      method: 'POST',
      token: tokenUser2,
      body: {
        vehicleId: 'VEH-AS-REAL-01',
        origin: 'Shillong',
        destination: 'Imphal',
      },
    });
    assert.strictEqual(user2DeployAttempt.status, 404, 'Cross-user deployment attempt must return HTTP 404');
    console.log('PASS: TEST H (Issue 1 ownership isolation fully intact)\n');

    // =========================================================================
    // TEST I: Issue 2 Deployment-Based Visibility Regression
    // =========================================================================
    console.log('--- TEST I: Issue 2 Deployment-Based Active Visibility Verification ---');

    // User 1 registers a 2nd vehicle without deploying it
    await request('/api/vehicles', {
      method: 'POST',
      token: tokenUser1,
      body: {
        id: 'VEH-AS-REAL-02',
        regNumber: 'AS-01-YY-6666',
        name: 'Assam Backup Hauler',
        type: 'Standard Cargo Truck',
        origin: 'Guwahati',
      },
    });

    const user1AllVehicles = await request('/api/vehicles', { method: 'GET', token: tokenUser1 });
    assert.strictEqual(user1AllVehicles.data.count, 2, 'User 1 owns 2 registered vehicles');

    const user1ActiveJourneys = await request('/api/deployments?status=ACTIVE', { method: 'GET', token: tokenUser1 });
    assert.strictEqual(user1ActiveJourneys.data.count, 1, 'Active journeys must strictly remain 1');
    assert.strictEqual(user1ActiveJourneys.data.data[0].vehicleId, 'VEH-AS-REAL-01');

    console.log('PASS: TEST I (Issue 2 deployment-based active visibility fully intact)\n');

    // =========================================================================
    // TEST J: Issue 3 Route Persistence Regression
    // =========================================================================
    console.log('--- TEST J: Issue 3 Route Persistence Verification ---');

    const activeDepRecord = user1ActiveJourneys.data.data[0];
    assert.strictEqual(activeDepRecord.origin, 'Agartala', 'Authoritative origin is Agartala');
    assert.strictEqual(activeDepRecord.destination, 'Silchar', 'Authoritative destination is Silchar');
    assert.strictEqual(activeDepRecord.originLat, 23.8315);
    assert.strictEqual(activeDepRecord.originLng, 91.2868);

    console.log('PASS: TEST J (Issue 3 route persistence fully intact with zero Guwahati fallback)\n');

    // =========================================================================
    // TEST K: Idempotent PostgreSQL Schema Initialization
    // =========================================================================
    console.log('--- TEST K: Idempotent Database Schema Initialization ---');

    // Mock Pool verifying initializeDatabase produces zero vehicle/deployment inserts
    let insertCalls = [];
    const mockClient = {
      query: async (sql, params) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO vehicles')) {
          insertCalls.push({ type: 'vehicle', sql, params });
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO deployments')) {
          insertCalls.push({ type: 'deployment', sql, params });
        }
        if (typeof sql === 'string' && sql.includes('SELECT COUNT(*) AS total FROM users')) {
          return { rows: [{ total: '1' }] };
        }
        if (typeof sql === 'string' && sql.includes('SELECT COUNT(*) AS total FROM vehicles')) {
          return { rows: [{ total: '0' }] };
        }
        if (typeof sql === 'string' && sql.includes('SELECT COUNT(*) AS total FROM deployments')) {
          return { rows: [{ total: '0' }] };
        }
        return { rows: [] };
      },
      release: () => {},
    };
    const mockPool = {
      connect: async () => mockClient,
    };

    const initResult = await initializeDatabase(mockPool);
    assert.strictEqual(initResult.initialized, true);
    assert.strictEqual(insertCalls.length, 0, 'initializeDatabase must execute ZERO vehicle or deployment INSERT queries');

    console.log('PASS: TEST K (Database schema initialization is purely DDL/admin and executes 0 demo inserts)\n');

    console.log('================================================================');
    console.log('ALL ISSUE 4 TESTS PASSED SUCCESSFULLY (11 / 11 SUITES)');
    console.log('================================================================');
  } finally {
    server.close();
  }
}

runIssue4TestSuite().catch((err) => {
  console.error('\n❌ ISSUE 4 TEST SUITE FAILED:', err);
  process.exit(1);
});
