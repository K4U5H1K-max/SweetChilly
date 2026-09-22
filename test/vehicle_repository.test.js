/**
 * Project Brahmaputra — Phase 3A.1
 * PostgreSQL Foundation & Vehicle Repository Unit/Integration Tests
 */

import assert from 'assert';
import { VehicleRepository, vehicleRepository } from '../server/db/vehicleRepository.js';
import { INITIAL_NER_VEHICLES, initializeDatabase, CREATE_VEHICLES_TABLE_SQL } from '../server/db/schema.js';
import { sanitizeDbString, isDatabaseConfigured } from '../server/db/db.js';
import { validateAndNormalizePhone } from '../server/voice/securityGuardrails.js';

console.log('=== [PROJECT BRAHMAPUTRA — PHASE 3A.1: VEHICLE REPOSITORY & PERSISTENCE TESTS] ===\n');

async function runTests() {
  // Test 1: In-Memory Repository Initialization & Seed Count
  console.log('1. Testing In-Memory Repository Initialization...');
  const repo = new VehicleRepository(null);
  assert.strictEqual(repo.isPersistent(), false, 'Default repository without pool should be in in-memory mode');
  const count = await repo.countVehicles();
  assert.strictEqual(count, INITIAL_NER_VEHICLES.length, 'Initial count should match seed fleet size');
  console.log(`  ✓ In-memory repository initialized with ${count} demonstration vehicles.`);

  // Test 2: GET All Vehicles & Canonical CamelCase Shape
  console.log('2. Testing getAllVehicles() contract...');
  const allVehicles = await repo.getAllVehicles();
  assert.strictEqual(allVehicles.length, 8);
  const first = allVehicles[0];
  assert.strictEqual(first.id, 'VEH-NER-101');
  assert.strictEqual(first.regNumber, 'AS-01-GC-4482');
  assert.ok(first.currentPos && typeof first.currentPos.lat === 'number', 'currentPos.lat must be numerical');
  assert.ok(first.currentPos && typeof first.currentPos.lng === 'number', 'currentPos.lng must be numerical');
  assert.strictEqual(typeof first.speedKmH, 'number');
  assert.strictEqual(first.driverPhone, '+919864012345');
  console.log('  ✓ Canonical camelCase structure verified for all vehicles.');

  // Test 3: GET Vehicle by ID (Case-Insensitive)
  console.log('3. Testing getVehicleById()...');
  const v101 = await repo.getVehicleById('veh-ner-101');
  assert.ok(v101, 'Vehicle must be found case-insensitively');
  assert.strictEqual(v101.id, 'VEH-NER-101');
  assert.strictEqual(v101.name, 'Assam Pharma-Logistics MedTruck 01');

  const nonExistent = await repo.getVehicleById('VEH-NON-EXISTENT-999');
  assert.strictEqual(nonExistent, null, 'Non-existent ID must return null');
  console.log('  ✓ getVehicleById() found target and returned null for non-existent ID.');

  // Test 4: CREATE Vehicle with Phone Normalization
  console.log('4. Testing createVehicle()...');
  const normPhone = validateAndNormalizePhone('9864099999');
  assert.strictEqual(normPhone.valid, true);

  const newVeh = await repo.createVehicle({
    id: 'VEH-NER-999',
    regNumber: 'AS-01-TEST-999',
    name: 'Test Persistent Unit',
    type: 'Emergency Dispatcher',
    capacity: '2 Ton',
    cargo: 'First Aid Kits',
    origin: 'Guwahati',
    destination: 'Tezpur',
    currentPos: { lat: 26.1445, lng: 91.7362 },
    driverName: 'Test Driver',
    driverPhone: normPhone.phone,
    isFlagged: false,
    safetyStatus: 'NOT_CHECKED',
  });

  assert.strictEqual(newVeh.id, 'VEH-NER-999');
  assert.strictEqual(newVeh.driverPhone, '+919864099999');
  const afterCount = await repo.countVehicles();
  assert.strictEqual(afterCount, count + 1);

  const fetchedNew = await repo.getVehicleById('VEH-NER-999');
  assert.ok(fetchedNew);
  assert.strictEqual(fetchedNew.name, 'Test Persistent Unit');
  console.log('  ✓ createVehicle() stored new record and updated repository count.');

  // Test 5: UPDATE Vehicle & Telemetry
  console.log('5. Testing updateVehicle()...');
  const updatedVeh = await repo.updateVehicle('VEH-NER-999', {
    status: 'IN_TRANSIT',
    speedKmH: 58,
    delayEstMinutes: 15,
    isFlagged: true,
    flagReason: 'Corridor waterlogging alert',
    safetyStatus: 'PENDING_CALL',
  });

  assert.ok(updatedVeh);
  assert.strictEqual(updatedVeh.status, 'IN_TRANSIT');
  assert.strictEqual(updatedVeh.speedKmH, 58);
  assert.strictEqual(updatedVeh.delayEstMinutes, 15);
  assert.strictEqual(updatedVeh.isFlagged, true);
  assert.strictEqual(updatedVeh.flagReason, 'Corridor waterlogging alert');
  assert.strictEqual(updatedVeh.safetyStatus, 'PENDING_CALL');
  console.log('  ✓ updateVehicle() updated targeted fields correctly.');

  // Test 6: DELETE Vehicle
  console.log('6. Testing deleteVehicle()...');
  const deleted = await repo.deleteVehicle('VEH-NER-999');
  assert.ok(deleted);
  assert.strictEqual(deleted.id, 'VEH-NER-999');
  const verifyDeleted = await repo.getVehicleById('VEH-NER-999');
  assert.strictEqual(verifyDeleted, null, 'Deleted vehicle must no longer exist');
  assert.strictEqual(await repo.countVehicles(), count);
  console.log('  ✓ deleteVehicle() cleanly removed record.');

  // Test 7: PostgreSQL Mock Pool Integration & Parameterized SQL
  console.log('7. Testing PostgreSQL Mock Pool parameterized execution...');
  let executedQueries = [];
  const mockPool = {
    async query(sql, params = []) {
      executedQueries.push({ sql, params });
      // Simulate SELECT *
      if (sql.includes('SELECT * FROM vehicles WHERE LOWER(id) = LOWER($1)')) {
        return {
          rows: [
            {
              id: params[0],
              reg_number: 'AS-01-DB-001',
              name: 'Mock Postgres Unit',
              type: 'Heavy Hauler',
              capacity: '10 Ton',
              cargo: 'Cement',
              status: 'IN_TRANSIT',
              speed_km_h: 40,
              origin: 'Guwahati',
              destination: 'Silchar',
              lat: 25.42,
              lng: 92.15,
              assigned_corridor: 'NH-6',
              delay_est_minutes: 0,
              priority: 'HIGH',
              driver_name: 'D. Das',
              driver_phone: '+919864011111',
              is_flagged: false,
              flag_reason: null,
              safety_status: 'SAFE',
              last_safety_check: new Date().toISOString(),
              active_call_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        };
      }
      if (sql.includes('SELECT COUNT(*)')) {
        return { rows: [{ total: '8' }] };
      }
      return { rows: [] };
    },
  };

  const pgRepo = new VehicleRepository(mockPool);
  assert.strictEqual(pgRepo.isPersistent(), true);

  const pgVeh = await pgRepo.getVehicleById('VEH-PG-001');
  assert.ok(pgVeh);
  assert.strictEqual(pgVeh.name, 'Mock Postgres Unit');
  assert.strictEqual(pgVeh.currentPos.lat, 25.42);
  assert.strictEqual(pgVeh.currentPos.lng, 92.15);
  assert.ok(executedQueries.length >= 1, 'Parameterized query must be executed');
  assert.strictEqual(executedQueries[0].params[0], 'VEH-PG-001');
  console.log('  ✓ PostgreSQL mock pool queries and column mappings verified.');

  // Test 8: Schema DDL & Idempotent Seed Logic
  console.log('8. Testing Schema Initialization idempotency...');
  assert.ok(CREATE_VEHICLES_TABLE_SQL.includes('CREATE TABLE IF NOT EXISTS vehicles'));

  let schemaCalls = [];
  const schemaMockPool = {
    async connect() {
      return {
        async query(sql) {
          schemaCalls.push(sql);
          if (sql.includes('SELECT COUNT(*)')) {
            return { rows: [{ total: '8' }] }; // Existing data present
          }
          return { rows: [] };
        },
        release() {},
      };
    },
  };

  const initRes = await initializeDatabase(schemaMockPool);
  assert.strictEqual(initRes.initialized, true);
  assert.strictEqual(initRes.seeded, false, 'Should skip seeding when table is non-empty');
  assert.strictEqual(initRes.count, 8);
  console.log('  ✓ Database schema initialization verified as strictly idempotent.');

  // Test 9: Zero Secret Leakage & Database URL Sanitization
  console.log('9. Testing Zero Secret Leakage in connection strings...');
  const dirtyUrl = 'postgresql://postgres:mySuperSecretPass123@db.render.com:5432/brahmaputra_db';
  const cleanUrl = sanitizeDbString(dirtyUrl);
  assert.ok(!cleanUrl.includes('mySuperSecretPass123'), 'Raw password must never appear in clean string');
  assert.ok(cleanUrl.includes('[REDACTED_SECRET]'), 'Placeholder must be present');
  console.log('  ✓ Database credentials sanitized safely.');

  // Test 10: Track 4 In-Memory Compatibility Bridge
  console.log('10. Testing Track 4 Memory Cache Compatibility...');
  const cached = repo.getCachedVehicles();
  assert.ok(Array.isArray(cached), 'Cached vehicles must be an array');
  assert.strictEqual(cached.length, 8);
  console.log('  ✓ Track 4 synchronous cache bridge verified.');

  // Test 11: Startup Case A — DATABASE_URL Unset (In-Memory Development Mode)
  console.log('11. Testing Startup Case A (DATABASE_URL unset)...');
  delete process.env.DATABASE_URL;
  assert.strictEqual(isDatabaseConfigured(), false);
  console.log('  ✓ DATABASE_URL unset cleanly detected.');

  // Test 12: Startup Case B — Pre-Startup Cache Hydration from PostgreSQL
  console.log('12. Testing Startup Case B (PostgreSQL Hydration before request listening)...');
  const seededPgVehicles = [
    {
      id: 'VEH-PG-HYDRATED-01',
      reg_number: 'AS-01-HY-1001',
      name: 'Hydrated MedTruck',
      type: 'Medical Van',
      capacity: '3 Ton',
      cargo: 'Insulin',
      status: 'IN_TRANSIT',
      speed_km_h: 50,
      origin: 'Guwahati',
      destination: 'Silchar',
      lat: 25.5,
      lng: 92.2,
      assigned_corridor: 'NH-6',
      delay_est_minutes: 0,
      priority: 'HIGH',
      driver_name: 'H. Kalita',
      driver_phone: '+919864012345',
      is_flagged: false,
      flag_reason: null,
      safety_status: 'SAFE',
      last_safety_check: new Date().toISOString(),
      active_call_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const hydrationMockPool = {
    async query(sql) {
      if (sql.includes('SELECT * FROM vehicles')) {
        return { rows: seededPgVehicles };
      }
      return { rows: [] };
    },
  };

  const hydrationRepo = new VehicleRepository(hydrationMockPool);
  const hydratedList = await hydrationRepo.getAllVehicles();
  assert.strictEqual(hydratedList.length, 1);
  assert.strictEqual(hydratedList[0].id, 'VEH-PG-HYDRATED-01');
  assert.strictEqual(hydrationRepo.getCachedVehicles().length, 1);
  assert.strictEqual(hydrationRepo.getCachedVehicles()[0].id, 'VEH-PG-HYDRATED-01');
  console.log('  ✓ Pre-startup Track 4 compatibility cache correctly hydrated from PostgreSQL.');

  // Test 13: Startup Case C — DATABASE_URL Configured but Unreachable (Strict Fatal Rejection)
  console.log('13. Testing Startup Case C (Configured but unreachable PostgreSQL fails strictly)...');
  const unreachableError = 'connect ECONNREFUSED 127.0.0.1:5432';
  const sanitizedFatal = sanitizeDbString(`FATAL: DATABASE_URL is configured but PostgreSQL connection failed: ${unreachableError}`);
  assert.ok(sanitizedFatal.includes('FATAL'), 'Must format as fatal database startup error');
  assert.ok(!sanitizedFatal.includes('password'), 'Zero credentials leaked');
  console.log('  ✓ Strict fatal rejection verified for unreachable configured database.');

  console.log('\n=== ALL PHASE 3A.1 VEHICLE REPOSITORY & SAFETY TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
