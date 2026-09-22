/**
 * Project Brahmaputra — Phase 3A.2
 * Frontend Persistent Data Hydration & AppContext State Lifecycle Tests
 */

import assert from 'node:assert';
import { INITIAL_VEHICLES, calculateKPIs } from '../src/data/nerData.js';

console.log('=== [PROJECT BRAHMAPUTRA — PHASE 3A.2: FRONTEND HYDRATION TESTS] ===\n');

/**
 * Lightweight harness simulating AppContext state machine logic
 */
class AppContextHarness {
  constructor({ isDev = false, initialVehicles = [] } = {}) {
    this.isDev = isDev;
    this.vehicles = initialVehicles;
    this.vehiclesLoading = true;
    this.vehiclesError = null;
  }

  async refreshVehicles(mockApiClient) {
    this.vehiclesLoading = true;
    this.vehiclesError = null;
    try {
      const res = await mockApiClient.getVehicles();
      if (res && res.success && Array.isArray(res.data)) {
        this.vehicles = res.data;
        this.vehiclesLoading = false;
        return res.data;
      } else if (res && Array.isArray(res.data)) {
        this.vehicles = res.data;
        this.vehiclesLoading = false;
        return res.data;
      } else if (Array.isArray(res)) {
        this.vehicles = res;
        this.vehiclesLoading = false;
        return res;
      } else {
        throw new Error('Invalid vehicle fleet payload structure received from backend API.');
      }
    } catch (err) {
      this.vehiclesError = err.message || 'Failed to load vehicle fleet from backend.';
      if (this.isDev) {
        this.vehicles = INITIAL_VEHICLES;
      } else {
        this.vehicles = [];
      }
      this.vehiclesLoading = false;
      return null;
    }
  }

  addVehicle(vehicle) {
    if (!vehicle || !vehicle.id) return;
    const existsIndex = this.vehicles.findIndex(
      (v) => String(v.id).toLowerCase() === String(vehicle.id).toLowerCase()
    );
    if (existsIndex >= 0) {
      this.vehicles[existsIndex] = { ...this.vehicles[existsIndex], ...vehicle };
    } else {
      this.vehicles.push(vehicle);
    }
  }

  updateVehicle(vehicleId, updates) {
    if (!vehicleId) return;
    this.vehicles = this.vehicles.map((v) =>
      String(v.id).toLowerCase() === String(vehicleId).toLowerCase()
        ? { ...v, ...(typeof updates === 'object' ? updates : {}) }
        : v
    );
  }

  deleteVehicle(vehicleId) {
    if (!vehicleId) return;
    this.vehicles = this.vehicles.filter(
      (v) => String(v.id).toLowerCase() !== String(vehicleId).toLowerCase()
    );
  }
}

async function runTests() {
  // Test 1: Successful Backend Vehicle Hydration
  console.log('1. Testing Successful Backend Vehicle Hydration...');
  const mockBackendFleet = [
    {
      id: 'VEH-PG-001',
      regNumber: 'AS-01-PG-1111',
      name: 'Persistent Pharma Truck',
      type: 'Refrigerated Van',
      capacity: '4 Ton',
      cargo: 'Life-Saving Drugs',
      status: 'IN_TRANSIT',
      speedKmH: 52,
      origin: 'Guwahati',
      destination: 'Silchar',
      currentPos: { lat: 25.42, lng: 92.15 },
      assignedCorridor: 'NH-6',
      delayEstMinutes: 0,
      priority: 'EMERGENCY_CRITICAL',
      driverName: 'A. Das',
      driverPhone: '+919864012345',
      isFlagged: false,
      flagReason: null,
      safetyStatus: 'NOT_CHECKED',
      lastSafetyCheck: null,
      activeCallId: null,
    },
    {
      id: 'VEH-PG-002',
      regNumber: 'ML-05-PG-2222',
      name: 'Persistent Cargo Hauler',
      type: 'Heavy Truck',
      capacity: '10 Ton',
      cargo: 'Rations',
      status: 'IN_TRANSIT',
      speedKmH: 45,
      origin: 'Guwahati',
      destination: 'Shillong',
      currentPos: { lat: 25.85, lng: 91.81 },
      assignedCorridor: 'NH-27',
      delayEstMinutes: 0,
      priority: 'HIGH',
      driverName: 'S. Sangma',
      driverPhone: '+919436123456',
      isFlagged: false,
      flagReason: null,
      safetyStatus: 'NOT_CHECKED',
      lastSafetyCheck: null,
      activeCallId: null,
    },
  ];

  const mockApi = {
    async getVehicles() {
      return { success: true, count: mockBackendFleet.length, data: mockBackendFleet };
    },
  };

  const harness = new AppContextHarness({ isDev: false, initialVehicles: [] });
  assert.strictEqual(harness.vehiclesLoading, true, 'Initial state must be loading');
  assert.strictEqual(harness.vehicles.length, 0, 'Initial vehicles must not prematurely display stale data');

  const loaded = await harness.refreshVehicles(mockApi);
  assert.ok(loaded);
  assert.strictEqual(harness.vehicles.length, 2);
  assert.strictEqual(harness.vehicles[0].id, 'VEH-PG-001');
  assert.strictEqual(harness.vehicles[1].id, 'VEH-PG-002');
  assert.strictEqual(harness.vehiclesLoading, false, 'Loading must resolve to false');
  assert.strictEqual(harness.vehiclesError, null, 'Error must be null on success');
  console.log('  ✓ Backend vehicles successfully hydrated and populated.');

  // Test 2: Backend Fleet Replaces Static INITIAL_VEHICLES
  console.log('2. Testing Backend Fleet Replaces Static INITIAL_VEHICLES...');
  const harnessWithStale = new AppContextHarness({ isDev: false, initialVehicles: INITIAL_VEHICLES });
  assert.strictEqual(harnessWithStale.vehicles.length, INITIAL_VEHICLES.length);
  await harnessWithStale.refreshVehicles(mockApi);
  assert.strictEqual(harnessWithStale.vehicles.length, 2, 'Authoritative backend response must replace stale demo fleet');
  assert.strictEqual(harnessWithStale.vehicles[0].id, 'VEH-PG-001');
  console.log('  ✓ Backend fleet completely replaces static INITIAL_VEHICLES.');

  // Test 3: No Duplicate Vehicles after Hydration
  console.log('3. Testing No Duplicate Vehicles After Hydration...');
  const ids = harness.vehicles.map((v) => v.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(ids.length, uniqueIds.size, 'No duplicate vehicle IDs allowed');
  console.log('  ✓ Zero duplicate vehicles verified.');

  // Test 4: Loading State Resolves Correctly
  console.log('4. Testing Loading State Lifecycle...');
  assert.strictEqual(harness.vehiclesLoading, false);
  console.log('  ✓ Loading state resolved cleanly.');

  // Test 5: Failed API Hydration Does Not Crash Application
  console.log('5. Testing Failed API Hydration Graceful Handling...');
  const failingApi = {
    async getVehicles() {
      throw new Error('Network error: 503 Service Unavailable');
    },
  };

  const prodHarness = new AppContextHarness({ isDev: false, initialVehicles: [] });
  const failResult = await prodHarness.refreshVehicles(failingApi);
  assert.strictEqual(failResult, null);
  assert.strictEqual(prodHarness.vehiclesLoading, false, 'Loading must resolve to false even on error');
  assert.ok(prodHarness.vehiclesError.includes('503 Service Unavailable'), 'Error message captured');
  assert.strictEqual(prodHarness.vehicles.length, 0, 'Production does not fabricate fake fleet on network failure');

  // Verify KPIs calculation still executes safely on empty array
  const safeKpis = calculateKPIs([], [], prodHarness.vehicles);
  assert.ok(safeKpis);
  assert.strictEqual(safeKpis.vehiclesInTransit, 0);
  console.log('  ✓ Failed API hydration does not crash dashboard; KPIs compute gracefully.');

  // Test 6: Development Fallback Behaves Correctly
  console.log('6. Testing Development Fallback Mode...');
  const devHarness = new AppContextHarness({ isDev: true, initialVehicles: [] });
  await devHarness.refreshVehicles(failingApi);
  assert.strictEqual(devHarness.vehiclesLoading, false);
  assert.ok(devHarness.vehiclesError);
  assert.strictEqual(devHarness.vehicles.length, INITIAL_VEHICLES.length, 'Dev fallback uses INITIAL_VEHICLES');
  console.log('  ✓ Development fallback activates gracefully for offline local work.');

  // Test 7: refreshVehicles() Retrieves Current Backend State
  console.log('7. Testing refreshVehicles() Dynamic Updates...');
  let dynamicBackend = [...mockBackendFleet];
  const dynamicApi = {
    async getVehicles() {
      return { success: true, count: dynamicBackend.length, data: dynamicBackend };
    },
  };

  const liveHarness = new AppContextHarness({ isDev: false });
  await liveHarness.refreshVehicles(dynamicApi);
  assert.strictEqual(liveHarness.vehicles.length, 2);

  // Backend receives a new vehicle externally
  dynamicBackend.push({
    id: 'VEH-PG-003',
    name: 'External Dispatched Unit',
    status: 'IN_TRANSIT',
  });

  await liveHarness.refreshVehicles(dynamicApi);
  assert.strictEqual(liveHarness.vehicles.length, 3);
  assert.strictEqual(liveHarness.vehicles[2].id, 'VEH-PG-003');
  console.log('  ✓ refreshVehicles() synchronized new backend records cleanly.');

  // Test 8: Existing Create Behavior
  console.log('8. Testing addVehicle() Deduplication and Addition...');
  liveHarness.addVehicle({
    id: 'VEH-CLIENT-999',
    name: 'Client Added Vehicle',
    status: 'IN_TRANSIT',
  });
  assert.strictEqual(liveHarness.vehicles.length, 4);

  // Duplicate addition should update rather than duplicate
  liveHarness.addVehicle({
    id: 'veh-client-999',
    name: 'Client Added Vehicle Updated Name',
    status: 'IN_TRANSIT',
  });
  assert.strictEqual(liveHarness.vehicles.length, 4, 'Duplicate ID must update existing element');
  assert.strictEqual(liveHarness.vehicles[3].name, 'Client Added Vehicle Updated Name');
  console.log('  ✓ addVehicle() created record with case-insensitive deduplication.');

  // Test 9: Existing Update Behavior
  console.log('9. Testing updateVehicle()...');
  liveHarness.updateVehicle('VEH-PG-001', {
    status: 'DELAYED',
    speedKmH: 20,
    delayEstMinutes: 45,
    isFlagged: true,
    flagReason: 'Mudslide detour',
  });
  const updated001 = liveHarness.vehicles.find((v) => v.id === 'VEH-PG-001');
  assert.ok(updated001);
  assert.strictEqual(updated001.status, 'DELAYED');
  assert.strictEqual(updated001.speedKmH, 20);
  assert.strictEqual(updated001.delayEstMinutes, 45);
  assert.strictEqual(updated001.isFlagged, true);
  assert.strictEqual(updated001.flagReason, 'Mudslide detour');
  console.log('  ✓ updateVehicle() updated telemetry and safety flag fields correctly.');

  // Test 10: Existing Delete Behavior
  console.log('10. Testing deleteVehicle()...');
  const countBeforeDelete = liveHarness.vehicles.length;
  liveHarness.deleteVehicle('veh-client-999');
  assert.strictEqual(liveHarness.vehicles.length, countBeforeDelete - 1);
  assert.strictEqual(liveHarness.vehicles.find((v) => v.id === 'VEH-CLIENT-999'), undefined);
  console.log('  ✓ deleteVehicle() cleanly removed record.');

  // Test 11: Track 4 UI Receives Compatible Vehicle Fields
  console.log('11. Testing Track 4 UI Field Compatibility...');
  const v = liveHarness.vehicles[0];
  const requiredTrack4Fields = [
    'id',
    'regNumber',
    'name',
    'type',
    'capacity',
    'cargo',
    'status',
    'speedKmH',
    'origin',
    'destination',
    'currentPos',
    'assignedCorridor',
    'delayEstMinutes',
    'priority',
    'driverName',
    'driverPhone',
    'isFlagged',
    'flagReason',
    'safetyStatus',
    'lastSafetyCheck',
    'activeCallId',
  ];

  for (const field of requiredTrack4Fields) {
    assert.ok(field in v, `Vehicle missing required Track 4 field: ${field}`);
  }
  assert.ok(typeof v.currentPos.lat === 'number', 'currentPos.lat must be numerical');
  assert.ok(typeof v.currentPos.lng === 'number', 'currentPos.lng must be numerical');
  console.log('  ✓ All 21 required Track 4 vehicle fields verified as fully compatible.');

  console.log('\n=== ALL 11 PHASE 3A.2 FRONTEND HYDRATION TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
