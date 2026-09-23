/**
 * Project Brahmaputra — Phase 3B.2
 * Admin Deployment UI, State Management & Fleet Integration Tests
 */

import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import { VehicleRepository } from '../server/db/vehicleRepository.js';
import { DeploymentRepository } from '../server/db/deploymentRepository.js';
import { calculateKPIs, INITIAL_NER_DEPLOYMENTS, INITIAL_VEHICLES } from '../src/data/nerData.js';

console.log('=== [PROJECT BRAHMAPUTRA — PHASE 3B.2: FRONTEND DEPLOYMENT UI & STATE TESTS] ===\n');

async function runFrontendDeploymentUITests() {
  const vehRepo = new VehicleRepository(null, { seedDemo: true });
  const depRepo = new DeploymentRepository(null, { seedDemo: true });
  vehRepo.setDeploymentRepository(depRepo);

  // Setup lightweight Express test server simulating the backend API
  const app = express();
  app.use(express.json());

  app.get('/api/vehicles', async (req, res) => {
    const list = await vehRepo.getAllVehicles();
    const projected = await Promise.all(list.map((v) => vehRepo.projectActiveDeployment(v)));
    res.json({ success: true, count: projected.length, data: projected });
  });

  app.get('/api/vehicles/:id', async (req, res) => {
    const v = await vehRepo.getVehicleById(req.params.id);
    if (!v) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    const projected = await vehRepo.projectActiveDeployment(v);
    res.json({ success: true, data: projected });
  });

  app.get('/api/deployments', async (req, res) => {
    const list = await depRepo.getAllDeployments(req.query);
    res.json({ success: true, count: list.length, data: list });
  });

  app.get('/api/deployments/:id', async (req, res) => {
    const d = await depRepo.getDeploymentById(req.params.id);
    if (!d) return res.status(404).json({ success: false, message: 'Deployment not found' });
    res.json({ success: true, data: d });
  });

  app.get('/api/vehicles/:vehicleId/deployments', async (req, res) => {
    const list = await depRepo.getDeploymentsByVehicleId(req.params.vehicleId, req.query);
    res.json({ success: true, count: list.length, data: list });
  });

  app.post('/api/deployments', async (req, res) => {
    try {
      const v = await vehRepo.getVehicleById(req.body.vehicleId);
      if (!v) return res.status(404).json({ success: false, message: 'Vehicle not found' });
      const d = await depRepo.createDeployment(req.body);
      res.status(201).json({ success: true, data: d });
    } catch (err) {
      const isConflict = err.message.includes('already has an active deployment');
      res.status(isConflict ? 409 : 400).json({ success: false, message: err.message });
    }
  });

  app.post('/api/deployments/:id/complete', async (req, res) => {
    try {
      const d = await depRepo.completeDeployment(req.params.id);
      res.json({ success: true, data: d });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.post('/api/deployments/:id/cancel', async (req, res) => {
    try {
      const d = await depRepo.cancelDeployment(req.params.id);
      res.json({ success: true, data: d });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Test Deployment Hydration from API
    console.log('1. Testing Deployment Hydration from API...');
    const depRes = await fetch(`${baseUrl}/api/deployments`);
    assert.strictEqual(depRes.status, 200);
    const depData = await depRes.json();
    assert.ok(depData.success);
    assert.ok(Array.isArray(depData.data));
    assert.strictEqual(depData.data.length, INITIAL_NER_DEPLOYMENTS.length);
    console.log(`  ✓ Hydrated ${depData.data.length} deployments successfully.`);

    // 2. Test Active Deployments vs Deployment History Derivation
    console.log('2. Testing Active Deployments vs History Derivation...');
    const allDeps = depData.data;
    const activeDeps = allDeps.filter((d) => ['ACTIVE', 'DELAYED', 'PLANNED'].includes(d.status));
    const historyDeps = allDeps.filter((d) => ['COMPLETED', 'CANCELLED'].includes(d.status));
    assert.ok(activeDeps.length > 0);
    assert.strictEqual(historyDeps.length, 0); // Initially all 8 seed deployments are ACTIVE/DELAYED
    console.log(`  ✓ Derived ${activeDeps.length} active deployments and ${historyDeps.length} historical deployments.`);

    // 3. Test Available vs Deployed Vehicles Derivation
    console.log('3. Testing Available vs Deployed Vehicles Derivation...');
    const vehRes = await fetch(`${baseUrl}/api/vehicles`);
    const vehData = await vehRes.json();
    const allVehs = vehData.data;

    const availableVehs = allVehs.filter((v) => v.deploymentStatus === 'AVAILABLE' || !v.hasActiveDeployment);
    const deployedVehs = allVehs.filter((v) => v.hasActiveDeployment || ['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus));
    assert.strictEqual(deployedVehs.length, allVehs.length);
    assert.strictEqual(availableVehs.length, 0);
    console.log(`  ✓ Derived ${deployedVehs.length} deployed vehicles and ${availableVehs.length} available vehicles.`);

    // 4. Create an Un-deployed Vehicle and Verify Availability Detection
    console.log('4. Testing Un-deployed Vehicle Availability Detection...');
    const newVeh = await vehRepo.createVehicle({
      id: 'VEH-FRONTEND-001',
      regNumber: 'AS-01-FE-9001',
      name: 'Frontend Test Hauler',
      driverPhone: '+919864099999',
      driverName: 'F. Tester',
    });
    assert.ok(newVeh);

    const postVehRes = await fetch(`${baseUrl}/api/vehicles`);
    const postVehData = await postVehRes.json();
    const updatedVehs = postVehData.data;

    const postAvailVehs = updatedVehs.filter((v) => v.deploymentStatus === 'AVAILABLE' || !v.hasActiveDeployment);
    assert.strictEqual(postAvailVehs.length, 1);
    assert.strictEqual(postAvailVehs[0].id, 'VEH-FRONTEND-001');
    assert.strictEqual(postAvailVehs[0].deploymentStatus, 'AVAILABLE');
    assert.strictEqual(postAvailVehs[0].hasActiveDeployment, false);
    console.log('  ✓ Newly created vehicle is immediately detected as AVAILABLE.');

    // 5. Test Deploying the Available Vehicle
    console.log('5. Testing Deploying the Available Vehicle...');
    const createDepRes = await fetch(`${baseUrl}/api/deployments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: 'VEH-FRONTEND-001',
        origin: 'Guwahati',
        destination: 'Silchar',
        assignedCorridor: 'NH-6 (Sonapur Arterial)',
        cargo: 'High-Altitude Emergency Consignment',
        priority: 'EMERGENCY_CRITICAL',
        status: 'ACTIVE',
      }),
    });
    assert.strictEqual(createDepRes.status, 201);
    const createDepData = await createDepRes.json();
    assert.ok(createDepData.success);
    const createdDepId = createDepData.data.id;
    assert.strictEqual(createDepData.data.vehicleId, 'VEH-FRONTEND-001');
    console.log(`  ✓ Deployment ${createdDepId} created successfully.`);

    // 6. Verify Vehicle Transitions from AVAILABLE -> DEPLOYED
    console.log('6. Verifying Vehicle Transitions from AVAILABLE -> DEPLOYED...');
    const checkVehRes = await fetch(`${baseUrl}/api/vehicles/VEH-FRONTEND-001`);
    const checkVehData = await checkVehRes.json();
    assert.strictEqual(checkVehData.data.hasActiveDeployment, true);
    assert.strictEqual(checkVehData.data.activeDeploymentId, createdDepId);
    assert.strictEqual(checkVehData.data.deploymentStatus, 'ACTIVE');
    assert.strictEqual(checkVehData.data.origin, 'Guwahati');
    assert.strictEqual(checkVehData.data.destination, 'Silchar');
    console.log('  ✓ Vehicle state successfully synchronized to DEPLOYED with active route.');

    // 7. Test Duplicate Active Deployment Collision Rejection (HTTP 409)
    console.log('7. Testing Duplicate Active Deployment Collision Rejection...');
    const conflictRes = await fetch(`${baseUrl}/api/deployments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: 'VEH-FRONTEND-001',
        origin: 'Silchar',
        destination: 'Imphal',
        assignedCorridor: 'NH-37',
        cargo: 'Secondary Cargo',
        status: 'ACTIVE',
      }),
    });
    assert.strictEqual(conflictRes.status, 409);
    const conflictData = await conflictRes.json();
    assert.strictEqual(conflictData.success, false);
    assert.ok(conflictData.message.includes('already has an active deployment'));
    console.log('  ✓ Duplicate active deployment rejected with HTTP 409 Conflict.');

    // 8. Test Completing the Deployment
    console.log('8. Testing Completing the Deployment...');
    const completeRes = await fetch(`${baseUrl}/api/deployments/${createdDepId}/complete`, {
      method: 'POST',
    });
    assert.strictEqual(completeRes.status, 200);
    const completeData = await completeRes.json();
    assert.strictEqual(completeData.data.status, 'COMPLETED');
    assert.ok(completeData.data.completedAt !== null);
    console.log('  ✓ Deployment completed with completedAt recorded.');

    // 9. Verify Vehicle Returns to AVAILABLE & Deployment Enters History
    console.log('9. Verifying Vehicle Returns to AVAILABLE & History Retention...');
    const postCompleteVehRes = await fetch(`${baseUrl}/api/vehicles/VEH-FRONTEND-001`);
    const postCompleteVehData = await postCompleteVehRes.json();
    assert.strictEqual(postCompleteVehData.data.hasActiveDeployment, false);
    assert.strictEqual(postCompleteVehData.data.deploymentStatus, 'AVAILABLE');

    const historyDepRes = await fetch(`${baseUrl}/api/deployments?status=COMPLETED`);
    const historyDepData = await historyDepRes.json();
    assert.ok(historyDepData.data.some((d) => d.id === createdDepId));
    console.log('  ✓ Vehicle is AVAILABLE again, completed deployment permanently retained in history.');

    // 10. Test Vehicle-Specific Deployment History
    console.log('10. Testing Vehicle-Specific Deployment History...');
    const vehHistoryRes = await fetch(`${baseUrl}/api/vehicles/VEH-FRONTEND-001/deployments`);
    const vehHistoryData = await vehHistoryRes.json();
    assert.strictEqual(vehHistoryData.data.length, 1);
    assert.strictEqual(vehHistoryData.data[0].id, createdDepId);
    assert.strictEqual(vehHistoryData.data[0].status, 'COMPLETED');
    console.log('  ✓ Vehicle deployment history retrieval verified.');

    // 11. Test Redeploying the Vehicle and Cancelling
    console.log('11. Testing Redeploying Vehicle and Cancelling...');
    const redeployRes = await fetch(`${baseUrl}/api/deployments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: 'VEH-FRONTEND-001',
        origin: 'Silchar',
        destination: 'Aizawl',
        assignedCorridor: 'NH-306',
        cargo: 'Return Equipment',
        status: 'ACTIVE',
      }),
    });
    assert.strictEqual(redeployRes.status, 201);
    const redeployData = await redeployRes.json();
    const secondDepId = redeployData.data.id;

    // Cancel deployment
    const cancelRes = await fetch(`${baseUrl}/api/deployments/${secondDepId}/cancel`, {
      method: 'POST',
    });
    assert.strictEqual(cancelRes.status, 200);
    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelData.data.status, 'CANCELLED');

    const vehHistoryAfterCancel = await fetch(`${baseUrl}/api/vehicles/VEH-FRONTEND-001/deployments`);
    const vehHistoryAfterCancelData = await vehHistoryAfterCancel.json();
    assert.strictEqual(vehHistoryAfterCancelData.data.length, 2);
    console.log('  ✓ Cancelled deployment recorded in vehicle history (2 total entries).');

    // 12. Test Dynamic KPI Calculation with Deployments
    console.log('12. Testing Dynamic KPI Calculation with Deployments...');
    const kpisResult = calculateKPIs([], [], updatedVehs, undefined, undefined, allDeps);
    assert.ok(kpisResult.activeDeployments >= 8);
    assert.ok(kpisResult.totalVehicles >= 9);
    console.log(`  ✓ KPIs dynamic calculation verified (Active Deployments: ${kpisResult.activeDeployments}, Total Vehicles: ${kpisResult.totalVehicles}).`);

    // 13. Verify Track 4 Safety Status Decoupling
    console.log('13. Verifying Track 4 Safety Status Decoupling...');
    await vehRepo.updateVehicle('VEH-FRONTEND-001', {
      safetyStatus: 'BREAKDOWN',
      isFlagged: true,
      flagReason: 'Engine overheating on mountain pass',
    });
    const flaggedVehRes = await fetch(`${baseUrl}/api/vehicles/VEH-FRONTEND-001`);
    const flaggedVehData = await flaggedVehRes.json();
    assert.strictEqual(flaggedVehData.data.safetyStatus, 'BREAKDOWN');
    assert.strictEqual(flaggedVehData.data.isFlagged, true);
    assert.strictEqual(flaggedVehData.data.deploymentStatus, 'AVAILABLE');
    console.log('  ✓ Track 4 safety status (BREAKDOWN) is completely decoupled from deployment status (AVAILABLE).');
  } finally {
    server.close();
  }

  console.log('\n=== ALL PHASE 3B.2 FRONTEND DEPLOYMENT UI & INTEGRATION TESTS PASSED ===\n');
}

runFrontendDeploymentUITests().catch((err) => {
  console.error('\n❌ FRONTEND DEPLOYMENT UI TEST SUITE FAILED:', err);
  process.exit(1);
});
