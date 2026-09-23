/**
 * Project Brahmaputra — Issue 2
 * Deployment-Based Active Vehicle Visibility Automated Test Suite
 *
 * Verifies that REGISTERED vehicles and DEPLOYED/ACTIVE vehicles are treated differently:
 * - TEST A: User A registers Vehicle A (no deployment). Appears in My Vehicles, NOT in Active Journeys, 0 active operational vehicles.
 * - TEST B: User A deploys Vehicle A (status: ACTIVE). ACTIVE deployment persisted, appears in Active Journeys, operational count = 1.
 * - TEST C: User A registers Vehicle B (undeployed). Appears in My Vehicles, NOT in Active Journeys, operational count remains 1.
 * - TEST D: Deployment completed. Vehicle A remains registered, disappears from Active Journeys, deployment saved in history, active count = 0.
 * - TEST E: Duplicate active deployment attempt while one is active -> Safely rejected with 409 Conflict.
 * - TEST F: Ownership isolation regression: User B cannot deploy User A's vehicle (HTTP 404 IDOR protection).
 * - TEST G: Admin operational visibility: Admin operational queries return genuine active deployments, not all registered vehicles.
 */

import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import { UserRepository } from '../server/db/userRepository.js';
import { VehicleRepository } from '../server/db/vehicleRepository.js';
import { DeploymentRepository } from '../server/db/deploymentRepository.js';
import { calculateKPIs } from '../src/data/nerData.js';
import {
  hashPassword,
  generateToken,
  verifyToken,
  toSafeUser,
} from '../server/auth/authUtils.js';

console.log('================================================================');
console.log('PROJECT BRAHMAPUTRA — ISSUE 2: DEPLOYMENT-BASED ACTIVE VISIBILITY');
console.log('================================================================\n');

async function runIssue2TestSuite() {
  // 1. Setup Isolated In-Memory Repositories
  const userRepo = new UserRepository(null);
  const vehRepo = new VehicleRepository(null);
  const depRepo = new DeploymentRepository(null);
  vehRepo.setDeploymentRepository(depRepo);
  vehRepo.setUserRepository(userRepo);
  depRepo.setVehicleRepository(vehRepo);

  // Clear demo data from test store to ensure completely clean slate for test assertions
  vehRepo.memoryStore = [];
  depRepo.memoryStore = [];
  userRepo.memoryStore = [];

  // 2. Setup Express App with Real Middleware & Endpoints matching server/index.js
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
      res.json({ success: true, count: projectedList.length, data: projectedList });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get('/api/vehicles/:id', testOptionalAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const vehicle = await vehRepo.getVehicleById(id);
      if (!vehicle) {
        return res.status(404).json({ success: false, message: `Vehicle '${id}' not found.` });
      }
      if (req.user && req.user.role === 'USER' && vehicle.ownerUserId !== req.user.id) {
        return res.status(404).json({ success: false, message: `Vehicle '${id}' not found.` });
      }
      let projected = await vehRepo.projectActiveDeployment(vehicle);
      if (req.user && req.user.role === 'ADMIN') {
        projected = await vehRepo.attachSafeOwner(projected);
      }
      res.json({ success: true, data: projected });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/vehicles', testAuthenticate, async (req, res) => {
    try {
      const v = req.body;
      const isUser = req.user.role === 'USER';
      const ownerUserId = isUser ? req.user.id : (v.ownerUserId || null);
      const newVeh = await vehRepo.createVehicle({
        ...v,
        ownerUserId,
      });
      const projected = await vehRepo.projectActiveDeployment(newVeh);
      res.status(201).json({ success: true, data: projected });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
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
      res.json({ success: true, count: list.length, data: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get('/api/deployments/:id', testOptionalAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deployment = await depRepo.getDeploymentById(id);
      if (!deployment) {
        return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
      }
      if (req.user && req.user.role === 'USER') {
        const vehicle = await vehRepo.getVehicleById(deployment.vehicleId);
        if (!vehicle || vehicle.ownerUserId !== req.user.id) {
          return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
        }
      }
      res.json({ success: true, data: deployment });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/deployments', testAuthenticate, async (req, res) => {
    try {
      const { vehicleId, origin, destination, assignedCorridor, cargo, priority, status } = req.body;
      if (!vehicleId) {
        return res.status(400).json({ success: false, message: 'vehicleId is required.' });
      }
      if (!origin || !destination) {
        return res.status(400).json({ success: false, message: 'origin and destination are required.' });
      }

      const vehicle = await vehRepo.getVehicleById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({ success: false, message: `Vehicle '${vehicleId}' not found in registry.` });
      }

      // USER role must own the vehicle to deploy it
      if (req.user.role === 'USER' && vehicle.ownerUserId !== req.user.id) {
        return res.status(404).json({ success: false, message: `Vehicle '${vehicleId}' not found in registry.` });
      }

      // Check if vehicle already has an active deployment
      const activeDep = await depRepo.getActiveDeploymentByVehicleId(vehicleId);
      if (activeDep) {
        return res.status(409).json({
          success: false,
          message: `Vehicle '${vehicleId}' already has an active deployment (${activeDep.id}). Complete or cancel it before deploying again.`,
        });
      }

      const newDep = await depRepo.createDeployment({
        vehicleId,
        origin,
        destination,
        assignedCorridor: assignedCorridor || `${origin} - ${destination}`,
        cargo: cargo || vehicle.cargo || 'General Relief Cargo',
        priority: priority || vehicle.priority || 'MEDIUM',
        status: status || 'ACTIVE',
      });

      res.status(201).json({ success: true, data: newDep });
    } catch (err) {
      const isConflict = err.message && err.message.includes('already has an active deployment');
      res.status(isConflict ? 409 : 400).json({ success: false, message: err.message });
    }
  });

  app.post('/api/deployments/:id/complete', testAuthenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const deployment = await depRepo.getDeploymentById(id);
      if (!deployment) {
        return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
      }
      if (req.user === 'USER') {
        const vehicle = await vehRepo.getVehicleById(deployment.vehicleId);
        if (!vehicle || vehicle.ownerUserId !== req.user.id) {
          return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
        }
      }
      const completed = await depRepo.completeDeployment(id);
      res.json({ success: true, data: completed });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.post('/api/deployments/:id/cancel', testAuthenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const deployment = await depRepo.getDeploymentById(id);
      if (!deployment) {
        return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
      }
      if (req.user && req.user.role === 'USER') {
        const vehicle = await vehRepo.getVehicleById(deployment.vehicleId);
        if (!vehicle || vehicle.ownerUserId !== req.user.id) {
          return res.status(404).json({ success: false, message: `Deployment '${id}' not found.` });
        }
      }
      const cancelled = await depRepo.cancelDeployment(id);
      res.json({ success: true, data: cancelled });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Start HTTP Test Server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  try {
    // 3. Create Test Users & Tokens
    const passwordHash = await hashPassword('SecurePass123!');
    const userA = await userRepo.createUser({
      id: 'USR-OPERATOR-A',
      email: 'operator.a@assam.gov.in',
      passwordHash,
      fullName: 'Operator A (Assam Fleet)',
      role: 'USER',
    });
    const userB = await userRepo.createUser({
      id: 'USR-OPERATOR-B',
      email: 'operator.b@meghalaya.gov.in',
      passwordHash,
      fullName: 'Operator B (Meghalaya Fleet)',
      role: 'USER',
    });
    const adminUser = await userRepo.createUser({
      id: 'USR-ADMIN-HQ',
      email: 'hq.admin@nerlogistics.gov.in',
      passwordHash,
      fullName: 'HQ Admin Command',
      role: 'ADMIN',
    });

    const tokenUserA = generateToken(userA);
    const tokenUserB = generateToken(userB);
    const tokenAdmin = generateToken(adminUser);

    console.log('✓ Test environment, repositories, and tokens initialized.');

    // =========================================================================
    // TEST A — Registration Only
    // User A registers Vehicle A. No deployment exists.
    // =========================================================================
    console.log('\n--- TEST A: Registration Only (No Deployment) ---');
    const regVehARes = await request('/api/vehicles', 'POST', {
      id: 'VEH-TEST-A1',
      name: 'Assam Medical Carrier Alpha',
      regNumber: 'AS-01-MC-1001',
      type: 'Refrigerated Pharma Truck',
      capacity: '5 Ton',
      cargo: 'Vaccines & Cold Chain Supplies',
      origin: 'Guwahati',
      destination: 'Silchar',
    }, tokenUserA);

    assert.strictEqual(regVehARes.status, 201, 'Vehicle A registration should succeed with 201 Created');
    assert.strictEqual(regVehARes.body.data.hasActiveDeployment, false, 'New registered vehicle must have hasActiveDeployment = false');
    assert.strictEqual(regVehARes.body.data.deploymentStatus, 'AVAILABLE', 'New registered vehicle must have deploymentStatus = AVAILABLE');

    // Check User A's My Vehicles
    const userAVehiclesRes = await request('/api/vehicles', 'GET', null, tokenUserA);
    assert.strictEqual(userAVehiclesRes.status, 200);
    assert.strictEqual(userAVehiclesRes.body.count, 1, 'My Vehicles must contain registered Vehicle A');
    assert.strictEqual(userAVehiclesRes.body.data[0].id, 'VEH-TEST-A1');
    assert.strictEqual(userAVehiclesRes.body.data[0].hasActiveDeployment, false);

    // Check User A's Active Journeys
    const userAActiveJourneysRes = await request('/api/deployments?status=ACTIVE', 'GET', null, tokenUserA);
    assert.strictEqual(userAActiveJourneysRes.status, 200);
    assert.strictEqual(userAActiveJourneysRes.body.count, 0, 'Active Journeys must be 0 for undeployed vehicle');

    // Check KPI calculation: Registered-only vehicle does NOT count as in-transit
    const kpisA = calculateKPIs([], [], userAVehiclesRes.body.data, undefined, undefined, userAActiveJourneysRes.body.data);
    assert.strictEqual(kpisA.totalVehicles, 1, 'Total vehicles registered should be 1');
    assert.strictEqual(kpisA.activeDeployments, 0, 'Active deployments should be 0');
    assert.strictEqual(kpisA.vehiclesInTransit, 0, 'Vehicles in transit KPI should be 0');
    console.log('✓ TEST A PASSED: Registered-only vehicle exists in My Vehicles, NOT in Active Journeys, and does not count as in-transit.');

    // =========================================================================
    // TEST B — Active Deployment
    // User A deploys Vehicle A.
    // =========================================================================
    console.log('\n--- TEST B: Active Deployment Creation ---');
    const deployARes = await request('/api/deployments', 'POST', {
      vehicleId: 'VEH-TEST-A1',
      origin: 'Guwahati',
      destination: 'Silchar',
      assignedCorridor: 'NH-6 Corridor',
      cargo: 'Emergency Blood Plasma',
      priority: 'EMERGENCY_CRITICAL',
      status: 'ACTIVE',
    }, tokenUserA);

    assert.strictEqual(deployARes.status, 201, 'Deployment creation should succeed with 201 Created');
    const depAId = deployARes.body.data.id;
    assert.strictEqual(deployARes.body.data.status, 'ACTIVE');
    assert.strictEqual(deployARes.body.data.vehicleId, 'VEH-TEST-A1');

    // Verify Vehicle A now reflects active deployment
    const userAVehiclesAfterDepRes = await request('/api/vehicles', 'GET', null, tokenUserA);
    assert.strictEqual(userAVehiclesAfterDepRes.body.count, 1, 'Vehicle A remains in My Vehicles');
    assert.strictEqual(userAVehiclesAfterDepRes.body.data[0].hasActiveDeployment, true, 'Vehicle A must now have hasActiveDeployment = true');
    assert.strictEqual(userAVehiclesAfterDepRes.body.data[0].deploymentStatus, 'ACTIVE', 'Vehicle A deploymentStatus must be ACTIVE');
    assert.strictEqual(userAVehiclesAfterDepRes.body.data[0].activeDeploymentId, depAId);

    // Verify Active Journeys query
    const userAActiveJourneysAfterDepRes = await request('/api/deployments?status=ACTIVE', 'GET', null, tokenUserA);
    assert.strictEqual(userAActiveJourneysAfterDepRes.body.count, 1, 'Active Journeys must return 1 active deployment');
    assert.strictEqual(userAActiveJourneysAfterDepRes.body.data[0].id, depAId);

    // Verify KPI calculation with active deployment
    const kpisB = calculateKPIs([], [], userAVehiclesAfterDepRes.body.data, undefined, undefined, userAActiveJourneysAfterDepRes.body.data);
    assert.strictEqual(kpisB.totalVehicles, 1);
    assert.strictEqual(kpisB.activeDeployments, 1, 'Active deployments KPI should be 1');
    assert.strictEqual(kpisB.vehiclesInTransit, 1, 'Vehicles in transit KPI should be 1');
    console.log('✓ TEST B PASSED: Active deployment persisted, vehicle marked as deployed, appears in Active Journeys, and operational counts reflect 1 in-transit.');

    // =========================================================================
    // TEST C — Another Undeployed Vehicle
    // User A registers Vehicle B (VEH-TEST-A2) but does not deploy it.
    // =========================================================================
    console.log('\n--- TEST C: Second Undeployed Vehicle Alongside Active Vehicle ---');
    const regVehA2Res = await request('/api/vehicles', 'POST', {
      id: 'VEH-TEST-A2',
      name: 'Assam Relief Cargo Beta',
      regNumber: 'AS-01-RC-2002',
      type: 'Heavy 6x6 Cargo Hauler',
      capacity: '10 Ton',
      cargo: 'Dry Rations & Water Filters',
    }, tokenUserA);

    assert.strictEqual(regVehA2Res.status, 201);
    assert.strictEqual(regVehA2Res.body.data.hasActiveDeployment, false);

    // Check User A's My Vehicles: should show BOTH vehicles
    const userABothVehiclesRes = await request('/api/vehicles', 'GET', null, tokenUserA);
    assert.strictEqual(userABothVehiclesRes.body.count, 2, 'My Vehicles must show both registered vehicles');

    // Check Active Journeys: must STILL show ONLY Vehicle A's deployment
    const userAActiveJourneysStill1 = await request('/api/deployments?status=ACTIVE', 'GET', null, tokenUserA);
    assert.strictEqual(userAActiveJourneysStill1.body.count, 1, 'Active Journeys must only show deployed Vehicle A');
    assert.strictEqual(userAActiveJourneysStill1.body.data[0].vehicleId, 'VEH-TEST-A1');

    // Verify KPIs: 2 total registered vehicles, 1 active deployment, 1 vehicle in transit
    const kpisC = calculateKPIs([], [], userABothVehiclesRes.body.data, undefined, undefined, userAActiveJourneysStill1.body.data);
    assert.strictEqual(kpisC.totalVehicles, 2, 'Total vehicles should be 2');
    assert.strictEqual(kpisC.activeDeployments, 1, 'Active deployments should be 1');
    assert.strictEqual(kpisC.vehiclesInTransit, 1, 'Vehicles in transit should strictly be 1, NOT 2');
    console.log('✓ TEST C PASSED: Second registered vehicle appears in My Vehicles, but does not inflate active journeys or operational counts.');

    // =========================================================================
    // TEST D — Deployment Completion
    // Complete Vehicle A's active deployment.
    // =========================================================================
    console.log('\n--- TEST D: Deployment Completion ---');
    const completeRes = await request(`/api/deployments/${depAId}/complete`, 'POST', {}, tokenUserA);
    assert.strictEqual(completeRes.status, 200, 'Completing deployment should succeed with 200 OK');
    assert.strictEqual(completeRes.body.data.status, 'COMPLETED');

    // Vehicle A remains registered, but active status is cleared
    const userAVehiclesAfterCompRes = await request('/api/vehicles', 'GET', null, tokenUserA);
    assert.strictEqual(userAVehiclesAfterCompRes.body.count, 2, 'Both vehicles remain registered in My Vehicles');
    const vehAAfterComp = userAVehiclesAfterCompRes.body.data.find((v) => v.id === 'VEH-TEST-A1');
    assert.strictEqual(vehAAfterComp.hasActiveDeployment, false, 'Vehicle A must no longer have active deployment');
    assert.strictEqual(vehAAfterComp.deploymentStatus, 'AVAILABLE', 'Vehicle A must be AVAILABLE for new deployment');

    // Active Journeys is now empty
    const userAActiveJourneysEmptyRes = await request('/api/deployments?status=ACTIVE', 'GET', null, tokenUserA);
    assert.strictEqual(userAActiveJourneysEmptyRes.body.count, 0, 'Active Journeys must now be 0');

    // Historical deployments contains completed record
    const historyRes = await request('/api/deployments?status=COMPLETED', 'GET', null, tokenUserA);
    assert.strictEqual(historyRes.body.count, 1, 'Historical deployments must contain the completed record');
    assert.strictEqual(historyRes.body.data[0].id, depAId);
    assert.strictEqual(historyRes.body.data[0].status, 'COMPLETED');

    // KPIs reflect 0 in transit
    const kpisD = calculateKPIs([], [], userAVehiclesAfterCompRes.body.data, undefined, undefined, userAActiveJourneysEmptyRes.body.data);
    assert.strictEqual(kpisD.totalVehicles, 2);
    assert.strictEqual(kpisD.activeDeployments, 0);
    assert.strictEqual(kpisD.vehiclesInTransit, 0);
    console.log('✓ TEST D PASSED: Completed deployment removes vehicle from active views, preserves vehicle in My Vehicles, saves audit history, and resets operational count.');

    // =========================================================================
    // TEST E — Duplicate Active Deployment
    // Redeploy Vehicle A, then attempt to create a second ACTIVE deployment for Vehicle A.
    // =========================================================================
    console.log('\n--- TEST E: Duplicate Active Deployment Prevention ---');
    const redeployARes = await request('/api/deployments', 'POST', {
      vehicleId: 'VEH-TEST-A1',
      origin: 'Guwahati',
      destination: 'Nagaon',
      assignedCorridor: 'NH-27',
      cargo: 'Emergency Medical Kits',
      status: 'ACTIVE',
    }, tokenUserA);
    assert.strictEqual(redeployARes.status, 201, 'Redeploying available vehicle should succeed');
    const activeDep2Id = redeployARes.body.data.id;

    // Attempt second deployment on same vehicle
    const duplicateDeployRes = await request('/api/deployments', 'POST', {
      vehicleId: 'VEH-TEST-A1',
      origin: 'Guwahati',
      destination: 'Tezpur',
      assignedCorridor: 'NH-15',
      cargo: 'Food Packs',
      status: 'ACTIVE',
    }, tokenUserA);

    assert.strictEqual(duplicateDeployRes.status, 409, 'Duplicate active deployment must be rejected with 409 Conflict');
    assert.ok(
      duplicateDeployRes.body.message.includes('already has an active deployment'),
      'Error message must indicate vehicle already has an active deployment'
    );

    // Verify only 1 active deployment exists for Vehicle A
    const activeCheckRes = await request('/api/deployments?status=ACTIVE', 'GET', null, tokenUserA);
    assert.strictEqual(activeCheckRes.body.count, 1);
    assert.strictEqual(activeCheckRes.body.data[0].id, activeDep2Id);
    console.log('✓ TEST E PASSED: Duplicate active deployment attempt was safely rejected with 409 Conflict.');

    // =========================================================================
    // TEST F — Ownership Regression Guard
    // User B attempts to deploy User A's vehicle (VEH-TEST-A2).
    // =========================================================================
    console.log('\n--- TEST F: Cross-User Deployment Prevention (IDOR Guard) ---');
    const userBCrossDeployRes = await request('/api/deployments', 'POST', {
      vehicleId: 'VEH-TEST-A2',
      origin: 'Guwahati',
      destination: 'Shillong',
      assignedCorridor: 'GS Road',
      cargo: 'Unauthorized Cross-Dispatch',
      status: 'ACTIVE',
    }, tokenUserB);

    assert.strictEqual(userBCrossDeployRes.status, 404, 'User B must not be able to deploy User A vehicle (404 Not Found non-enumerating)');

    // User B's active journeys must remain 0
    const userBActiveJourneys = await request('/api/deployments?status=ACTIVE', 'GET', null, tokenUserB);
    assert.strictEqual(userBActiveJourneys.body.count, 0, 'User B must have 0 active journeys');
    console.log('✓ TEST F PASSED: Issue 1 cross-user ownership isolation enforced on deployment creation.');

    // =========================================================================
    // TEST G — Admin Operational Visibility
    // Admin sees all registered vehicles in fleet manager, but operational views distinguish active deployments.
    // =========================================================================
    console.log('\n--- TEST G: Admin Operational Visibility & Distinctions ---');
    // User B registers a vehicle
    await request('/api/vehicles', 'POST', {
      id: 'VEH-TEST-B1',
      name: 'Meghalaya Highland Truck',
      regNumber: 'ML-05-HT-3003',
      type: 'Mountain 4x4 Hauler',
      capacity: '6 Ton',
      cargo: 'Hill Transport Goods',
    }, tokenUserB);

    // Admin lists all registered vehicles (3 total: A1 deployed, A2 undeployed, B1 undeployed)
    const adminAllVehiclesRes = await request('/api/vehicles', 'GET', null, tokenAdmin);
    assert.strictEqual(adminAllVehiclesRes.status, 200);
    assert.strictEqual(adminAllVehiclesRes.body.count, 3, 'Admin fleet list must show all 3 registered vehicles');

    // Admin lists active deployments across all operators (only 1 active: A1)
    const adminActiveDeploymentsRes = await request('/api/deployments?status=ACTIVE', 'GET', null, tokenAdmin);
    assert.strictEqual(adminActiveDeploymentsRes.status, 200);
    assert.strictEqual(adminActiveDeploymentsRes.body.count, 1, 'Admin operational active deployments must strictly return 1 active deployment');
    assert.strictEqual(adminActiveDeploymentsRes.body.data[0].vehicleId, 'VEH-TEST-A1');

    // Admin KPI computation
    const adminKPIs = calculateKPIs([], [], adminAllVehiclesRes.body.data, undefined, undefined, adminActiveDeploymentsRes.body.data);
    assert.strictEqual(adminKPIs.totalVehicles, 3, 'Total registered fleet should be 3');
    assert.strictEqual(adminKPIs.activeDeployments, 1, 'Active operational deployments should be 1');
    assert.strictEqual(adminKPIs.vehiclesInTransit, 1, 'Vehicles in transit should be 1');
    console.log('✓ TEST G PASSED: Admin sees all 3 registered vehicles in fleet directory, while operational queries strictly return the 1 active deployment.');

  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log('\n✓ Test HTTP server closed.');
  }

  console.log('\n================================================================');
  console.log('ALL ISSUE 2 DEPLOYMENT-BASED VISIBILITY TESTS PASSED SUCCESSFULLY');
  console.log('================================================================\n');
}

runIssue2TestSuite().catch((err) => {
  console.error('\n❌ ISSUE 2 TEST SUITE FAILED:', err);
  process.exit(1);
});
