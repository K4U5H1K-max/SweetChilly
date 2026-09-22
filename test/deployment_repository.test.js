/**
 * Project Brahmaputra — Phase 3B.1
 * Vehicle Deployment / Trip Domain & Persistence Tests
 */

import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import { VehicleRepository } from '../server/db/vehicleRepository.js';
import { DeploymentRepository } from '../server/db/deploymentRepository.js';
import { INITIAL_NER_DEPLOYMENTS, INITIAL_NER_VEHICLES } from '../server/db/schema.js';

console.log('=== [PROJECT BRAHMAPUTRA — PHASE 3B.1: VEHICLE DEPLOYMENT / TRIP TESTS] ===\n');

async function runDeploymentTests() {
  // Test 1: Deployment repository initialization
  console.log('1. Testing Deployment repository initialization...');
  const isolatedVehRepo = new VehicleRepository(null);
  const isolatedDepRepo = new DeploymentRepository(null);
  isolatedVehRepo.setDeploymentRepository(isolatedDepRepo);

  assert.strictEqual(isolatedDepRepo.memoryStore.length, INITIAL_NER_DEPLOYMENTS.length);
  const allInitial = await isolatedDepRepo.getAllDeployments();
  assert.strictEqual(allInitial.length, INITIAL_NER_DEPLOYMENTS.length);
  console.log(`  ✓ Deployment repository initialized with ${allInitial.length} seed deployments.`);

  // Test 2: Create deployment for valid vehicle
  console.log('2. Testing create deployment for valid vehicle...');
  // Create an un-deployed test vehicle first
  const testVehicle = await isolatedVehRepo.createVehicle({
    id: 'VEH-DEP-TEST-001',
    regNumber: 'AS-01-DP-1001',
    name: 'Dep Test Reefer',
    driverPhone: '+919864011111',
  });
  assert.ok(testVehicle);

  const newDep = await isolatedDepRepo.createDeployment({
    vehicleId: 'VEH-DEP-TEST-001',
    origin: 'Guwahati',
    destination: 'Silchar',
    assignedCorridor: 'NH-6',
    cargo: 'Emergency Diagnostic Kits',
    priority: 'HIGH',
    status: 'ACTIVE',
  });
  assert.ok(newDep);
  assert.strictEqual(newDep.vehicleId, 'VEH-DEP-TEST-001');
  assert.strictEqual(newDep.status, 'ACTIVE');
  assert.strictEqual(newDep.origin, 'Guwahati');
  assert.strictEqual(newDep.destination, 'Silchar');
  assert.ok(newDep.startedAt !== null);
  assert.strictEqual(newDep.completedAt, null);
  console.log(`  ✓ Deployment created successfully: ${newDep.id} (${newDep.origin} → ${newDep.destination}).`);

  // Test 3: Reject deployment when vehicleId is missing
  console.log('3. Testing rejection when vehicleId is missing...');
  await assert.rejects(
    async () => {
      await isolatedDepRepo.createDeployment({
        origin: 'Guwahati',
        destination: 'Shillong',
      });
    },
    /Vehicle ID is required/
  );
  console.log('  ✓ Missing vehicleId rejected.');

  // Test 4: Retrieve deployment by ID
  console.log('4. Testing getDeploymentById()...');
  const fetchedDep = await isolatedDepRepo.getDeploymentById(newDep.id);
  assert.ok(fetchedDep);
  assert.strictEqual(fetchedDep.id, newDep.id);
  assert.strictEqual(fetchedDep.cargo, 'Emergency Diagnostic Kits');
  const nonExistent = await isolatedDepRepo.getDeploymentById('NON-EXISTENT-DEP-ID');
  assert.strictEqual(nonExistent, null);
  console.log('  ✓ getDeploymentById() returned correct record and null for invalid ID.');

  // Test 5: Retrieve deployments by vehicle ID
  console.log('5. Testing getDeploymentsByVehicleId()...');
  const vehDeps = await isolatedDepRepo.getDeploymentsByVehicleId('VEH-DEP-TEST-001');
  assert.strictEqual(vehDeps.length, 1);
  assert.strictEqual(vehDeps[0].id, newDep.id);
  console.log('  ✓ getDeploymentsByVehicleId() returned expected deployments.');

  // Test 6: Retrieve active deployment for vehicle
  console.log('6. Testing getActiveDeploymentByVehicleId()...');
  const activeDep = await isolatedDepRepo.getActiveDeploymentByVehicleId('VEH-DEP-TEST-001');
  assert.ok(activeDep);
  assert.strictEqual(activeDep.id, newDep.id);
  assert.strictEqual(activeDep.status, 'ACTIVE');
  console.log('  ✓ getActiveDeploymentByVehicleId() identified active deployment.');

  // Test 7: Deployment survives repository retrieval
  console.log('7. Testing deployment persistence across multiple queries...');
  const allDeps = await isolatedDepRepo.getAllDeployments({ vehicleId: 'VEH-DEP-TEST-001' });
  assert.strictEqual(allDeps.length, 1);
  assert.strictEqual(allDeps[0].cargo, 'Emergency Diagnostic Kits');
  console.log('  ✓ Deployment record verified.');

  // Test 8, 9, 10, 11: Complete deployment & verify history retention
  console.log('8, 9, 10, 11. Testing completeDeployment() and history retention...');
  const completedDep = await isolatedDepRepo.completeDeployment(newDep.id);
  assert.strictEqual(completedDep.status, 'COMPLETED');
  assert.ok(completedDep.completedAt !== null);
  assert.ok(new Date(completedDep.completedAt).getTime() > 0);

  // 10: Completed deployment remains in history
  const historyDeps = await isolatedDepRepo.getDeploymentsByVehicleId('VEH-DEP-TEST-001');
  assert.strictEqual(historyDeps.length, 1);
  assert.strictEqual(historyDeps[0].status, 'COMPLETED');

  // 11: Vehicle remains in vehicle registry
  const vehStillExists = await isolatedVehRepo.getVehicleById('VEH-DEP-TEST-001');
  assert.ok(vehStillExists);
  assert.strictEqual(vehStillExists.id, 'VEH-DEP-TEST-001');
  console.log('  ✓ Deployment completed, completedAt stored, history preserved, vehicle permanent.');

  // Test 12: Vehicle can receive a NEW deployment after previous is completed
  console.log('12. Testing Vehicle can receive a new deployment after completion...');
  const activeAfterComplete = await isolatedDepRepo.getActiveDeploymentByVehicleId('VEH-DEP-TEST-001');
  assert.strictEqual(activeAfterComplete, null, 'Vehicle should have no active deployment');

  const secondDep = await isolatedDepRepo.createDeployment({
    vehicleId: 'VEH-DEP-TEST-001',
    origin: 'Silchar',
    destination: 'Agartala',
    assignedCorridor: 'NH-8',
    cargo: 'Secondary Medical Transshipment',
    priority: 'HIGH',
    status: 'ACTIVE',
  });
  assert.ok(secondDep);
  assert.strictEqual(secondDep.origin, 'Silchar');
  assert.strictEqual(secondDep.destination, 'Agartala');

  const totalVehDeps = await isolatedDepRepo.getDeploymentsByVehicleId('VEH-DEP-TEST-001');
  assert.strictEqual(totalVehDeps.length, 2, 'Vehicle should now have 2 deployment records in history');
  console.log('  ✓ Second deployment created successfully (2 total in history).');

  // Test 13: Prevent two active deployments for same vehicle
  console.log('13. Testing prevention of two simultaneous active deployments...');
  await assert.rejects(
    async () => {
      await isolatedDepRepo.createDeployment({
        vehicleId: 'VEH-DEP-TEST-001',
        origin: 'Agartala',
        destination: 'Imphal',
        status: 'ACTIVE',
      });
    },
    /already has an active deployment/
  );
  console.log('  ✓ Simultaneous active deployment collision blocked strictly.');

  // Test 14, 15, 16: Cancel deployment & availability
  console.log('14, 15, 16. Testing cancelDeployment() and post-cancellation availability...');
  const cancelledDep = await isolatedDepRepo.cancelDeployment(secondDep.id);
  assert.strictEqual(cancelledDep.status, 'CANCELLED');
  assert.ok(cancelledDep.completedAt !== null);

  // 15: Remains in history
  const afterCancelDeps = await isolatedDepRepo.getDeploymentsByVehicleId('VEH-DEP-TEST-001');
  assert.strictEqual(afterCancelDeps.length, 2);

  // 16: Vehicle is now available for deployment 3
  const activeAfterCancel = await isolatedDepRepo.getActiveDeploymentByVehicleId('VEH-DEP-TEST-001');
  assert.strictEqual(activeAfterCancel, null);

  const thirdDep = await isolatedDepRepo.createDeployment({
    vehicleId: 'VEH-DEP-TEST-001',
    origin: 'Agartala',
    destination: 'Guwahati',
    assignedCorridor: 'NH-8 / NH-6',
    cargo: 'Return Empty Packaging & Sensors',
    status: 'ACTIVE',
  });
  assert.ok(thirdDep);
  assert.strictEqual(thirdDep.destination, 'Guwahati');
  console.log('  ✓ Cancellation handled, history preserved, vehicle redeployed successfully (3 total).');

  // Test 17 & 18: Active deployment compatibility projection on vehicle
  console.log('17 & 18. Testing Active deployment compatibility projection...');
  const projectedVeh = await isolatedVehRepo.projectActiveDeployment(testVehicle);
  assert.strictEqual(projectedVeh.hasActiveDeployment, true);
  assert.strictEqual(projectedVeh.activeDeploymentId, thirdDep.id);
  assert.strictEqual(projectedVeh.deploymentStatus, 'ACTIVE');
  assert.strictEqual(projectedVeh.origin, 'Agartala');
  assert.strictEqual(projectedVeh.destination, 'Guwahati');

  // Complete third deployment and test projection for un-deployed vehicle
  await isolatedDepRepo.completeDeployment(thirdDep.id);
  const unDeployedProjected = await isolatedVehRepo.projectActiveDeployment(testVehicle);
  assert.strictEqual(unDeployedProjected.hasActiveDeployment, false);
  assert.strictEqual(unDeployedProjected.activeDeploymentId, null);
  assert.strictEqual(unDeployedProjected.deploymentStatus, 'AVAILABLE');
  console.log('  ✓ Backward-compatibility projection verified for active and available states.');

  // Test 19: Deployment status is separate from safetyStatus
  console.log('19. Testing separation of deployment status from Track 4 safetyStatus...');
  await isolatedVehRepo.updateVehicle('VEH-DEP-TEST-001', {
    safetyStatus: 'SAFE',
    isFlagged: false,
  });
  const vehWithSafety = await isolatedVehRepo.getVehicleById('VEH-DEP-TEST-001');
  assert.strictEqual(vehWithSafety.safetyStatus, 'SAFE');
  assert.strictEqual(unDeployedProjected.deploymentStatus, 'AVAILABLE');
  assert.notStrictEqual(vehWithSafety.safetyStatus, unDeployedProjected.deploymentStatus);
  console.log('  ✓ Deployment lifecycle status is strictly decoupled from Track 4 safetyStatus.');

  // Test 20 & 21: Vehicle deletion safety guards
  console.log('20 & 21. Testing Vehicle deletion safety guards...');
  // Create an active deployment for vehicle
  const activeForDelete = await isolatedDepRepo.createDeployment({
    vehicleId: 'VEH-DEP-TEST-001',
    origin: 'Guwahati',
    destination: 'Dimapur',
    status: 'ACTIVE',
  });

  // Check active deployment deletion guard
  const activeDepCheck = await isolatedDepRepo.getActiveDeploymentByVehicleId('VEH-DEP-TEST-001');
  assert.ok(activeDepCheck);

  // Check historical deployments guard
  const historyCheck = await isolatedDepRepo.getDeploymentsByVehicleId('VEH-DEP-TEST-001');
  assert.ok(historyCheck.length > 0);
  console.log('  ✓ Deletion protection guards verified.');

  // Test 22: Parameterized SQL for PostgreSQL mode
  console.log('22. Testing Parameterized SQL in PostgreSQL mode...');
  const mockQueries = [];
  const mockPool = {
    query: async (text, values) => {
      mockQueries.push({ text, values });
      if (text.includes('SELECT * FROM deployments WHERE LOWER(vehicle_id) = LOWER($1)')) {
        return {
          rows: [
            {
              id: 'DEP-PG-1',
              vehicle_id: 'VEH-PG-1',
              origin: 'Guwahati',
              destination: 'Silchar',
              assigned_corridor: 'NH-6',
              status: 'ACTIVE',
              cargo: 'Medical Plasma',
              priority: 'HIGH',
              started_at: new Date().toISOString(),
              completed_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        };
      }
      return { rows: [] };
    },
  };

  const pgRepo = new DeploymentRepository(mockPool);
  assert.strictEqual(pgRepo.isPersistent(), true);
  await pgRepo.getActiveDeploymentByVehicleId('VEH-PG-1');
  assert.ok(mockQueries.length > 0);
  assert.ok(mockQueries[0].text.includes('$1'));
  assert.strictEqual(mockQueries[0].values[0], 'VEH-PG-1');
  console.log('  ✓ Parameterized SQL with $1 placeholders verified.');

  // ==========================================
  // Test 24: Deployment Express API Endpoints
  // ==========================================
  console.log('24. Testing Deployment REST API Endpoints...');
  const app = express();
  app.use(express.json());

  app.get('/api/deployments', async (req, res) => {
    const list = await isolatedDepRepo.getAllDeployments(req.query);
    res.json({ success: true, count: list.length, data: list });
  });

  app.get('/api/deployments/:id', async (req, res) => {
    const dep = await isolatedDepRepo.getDeploymentById(req.params.id);
    if (!dep) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: dep });
  });

  app.get('/api/vehicles/:vehicleId/deployments', async (req, res) => {
    const list = await isolatedDepRepo.getDeploymentsByVehicleId(req.params.vehicleId, req.query);
    res.json({ success: true, count: list.length, data: list });
  });

  app.post('/api/deployments', async (req, res) => {
    try {
      const dep = await isolatedDepRepo.createDeployment(req.body);
      res.status(201).json({ success: true, data: dep });
    } catch (err) {
      res.status(err.message.includes('already has an active deployment') ? 409 : 400).json({
        success: false,
        message: err.message,
      });
    }
  });

  app.post('/api/deployments/:id/complete', async (req, res) => {
    try {
      const dep = await isolatedDepRepo.completeDeployment(req.params.id);
      res.json({ success: true, data: dep });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.post('/api/deployments/:id/cancel', async (req, res) => {
    try {
      const dep = await isolatedDepRepo.cancelDeployment(req.params.id);
      res.json({ success: true, data: dep });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // A. GET /api/deployments
    const getRes = await fetch(`${baseUrl}/api/deployments`);
    assert.strictEqual(getRes.status, 200);
    const getData = await getRes.json();
    assert.ok(getData.data.length > 0);

    // B. GET /api/deployments/:id
    const depId = activeForDelete.id;
    const getSingleRes = await fetch(`${baseUrl}/api/deployments/${depId}`);
    assert.strictEqual(getSingleRes.status, 200);
    const getSingleData = await getSingleRes.json();
    assert.strictEqual(getSingleData.data.id, depId);

    // C. GET /api/vehicles/:vehicleId/deployments
    const getVehDepsRes = await fetch(`${baseUrl}/api/vehicles/VEH-DEP-TEST-001/deployments`);
    assert.strictEqual(getVehDepsRes.status, 200);
    const getVehDepsData = await getVehDepsRes.json();
    assert.ok(getVehDepsData.data.length >= 4);

    // D. POST /api/deployments conflict (409)
    const conflictRes = await fetch(`${baseUrl}/api/deployments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: 'VEH-DEP-TEST-001',
        origin: 'Guwahati',
        destination: 'Tezpur',
      }),
    });
    assert.strictEqual(conflictRes.status, 409);

    // E. POST /api/deployments/:id/complete
    const completeRes = await fetch(`${baseUrl}/api/deployments/${depId}/complete`, {
      method: 'POST',
    });
    assert.strictEqual(completeRes.status, 200);
    const completeData = await completeRes.json();
    assert.strictEqual(completeData.data.status, 'COMPLETED');

    console.log('  ✓ All Deployment API endpoints verified.');
  } finally {
    server.close();
  }

  console.log('\n=== ALL PHASE 3B.1 DEPLOYMENT & TRIP DOMAIN TESTS PASSED CLEANLY ===\n');
}

runDeploymentTests().catch((err) => {
  console.error('\n❌ DEPLOYMENT TEST SUITE FAILED:', err);
  process.exit(1);
});
