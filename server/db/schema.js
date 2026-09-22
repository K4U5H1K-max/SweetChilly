/**
 * Project Brahmaputra — Database Schema & Seed Initialization
 *
 * Provides idempotent table creation and seed data initialization.
 */

export const INITIAL_NER_VEHICLES = [
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
    driverPhone: '+919864012345',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-204',
    regNumber: 'ML-05-E-9012',
    name: 'Meghalaya Essential Food Supply 04',
    type: 'Heavy Cargo Truck',
    capacity: '12 Ton',
    cargo: 'Rice & Fortified Grains',
    status: 'IN_TRANSIT',
    speedKmH: 54,
    origin: 'Guwahati',
    destination: 'Shillong',
    currentPos: { lat: 25.8500, lng: 91.8100 },
    assignedCorridor: 'GS Road / NH-27',
    delayEstMinutes: 0,
    priority: 'HIGH',
    driverName: 'S. Marak',
    driverPhone: '+919436123456',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-309',
    regNumber: 'TR-01-B-3319',
    name: 'Tripura POL Tanker Convoy #09',
    type: 'POL Petroleum Tanker (18KL)',
    capacity: '18 KL',
    cargo: 'High-Speed Diesel (HSD) & Petrol',
    status: 'IN_TRANSIT',
    speedKmH: 38,
    origin: 'Guwahati',
    destination: 'Agartala',
    currentPos: { lat: 24.9500, lng: 92.4000 },
    assignedCorridor: 'NH-6 / NH-8',
    delayEstMinutes: 240,
    priority: 'HIGH',
    driverName: 'R. Debbarma',
    driverPhone: '+919862034567',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-412',
    regNumber: 'MN-01-AA-7821',
    name: 'Manipur Valley Oxygen & Medical LCV',
    type: 'Cryogenic Liquid Oxygen Tanker',
    capacity: '4.0 Ton',
    cargo: 'Liquid Medical Oxygen (LMO)',
    status: 'REROUTED',
    speedKmH: 42,
    origin: 'Silchar',
    destination: 'Imphal',
    currentPos: { lat: 24.8100, lng: 92.9500 },
    assignedCorridor: 'NH-37 (Via Jiribam Transshipment)',
    delayEstMinutes: 90,
    priority: 'EMERGENCY_CRITICAL',
    driverName: 'N. Singh',
    driverPhone: '+919856145678',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-515',
    regNumber: 'NL-07-C-5541',
    name: 'Nagaland Disaster Relief Express',
    type: 'Container Freight Truck',
    capacity: '10 Ton',
    cargo: 'Dry Rations, Tarpaulins & Water Purification Kits',
    status: 'IN_TRANSIT',
    speedKmH: 60,
    origin: 'Guwahati',
    destination: 'Kohima',
    currentPos: { lat: 26.3100, lng: 93.4200 },
    assignedCorridor: 'NH-27 / NH-29',
    delayEstMinutes: 30,
    priority: 'HIGH',
    driverName: 'K. Angami',
    driverPhone: '+919436056789',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-602',
    regNumber: 'MZ-01-A-1120',
    name: 'Mizoram High-Altitude LCV Convoy',
    type: 'Medium Duty Truck (4x4)',
    capacity: '6 Ton',
    cargo: 'Baby Food & Pharmaceutical Supplies',
    status: 'IDLE_STAGING',
    speedKmH: 0,
    origin: 'Silchar',
    destination: 'Aizawl',
    currentPos: { lat: 24.8170, lng: 92.7960 },
    assignedCorridor: 'NH-306 / NH-54',
    delayEstMinutes: 0,
    priority: 'HIGH',
    driverName: 'L. Sailo',
    driverPhone: '+919862567890',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-708',
    regNumber: 'AR-01-D-8890',
    name: 'Arunachal Strategic Border Supply #08',
    type: 'Heavy 6x6 All-Terrain Hauler',
    capacity: '15 Ton',
    cargo: 'Heavy Engineering Spares & Bridge Panels',
    status: 'IN_TRANSIT',
    speedKmH: 35,
    origin: 'Tezpur',
    destination: 'Itanagar',
    currentPos: { lat: 26.8500, lng: 93.2500 },
    assignedCorridor: 'NH-15 / NH-415',
    delayEstMinutes: 0,
    priority: 'HIGH',
    driverName: 'T. Riba',
    driverPhone: '+919436278901',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
  {
    id: 'VEH-NER-819',
    regNumber: 'SK-01-J-2244',
    name: 'Sikkim Hill Corridor Express',
    type: 'Multi-Axle Mountain Truck',
    capacity: '8 Ton',
    cargo: 'Emergency Hospital Oxygen Cylinders',
    status: 'IN_TRANSIT',
    speedKmH: 40,
    origin: 'Siliguri',
    destination: 'Gangtok',
    currentPos: { lat: 27.0500, lng: 88.4700 },
    assignedCorridor: 'NH-10 (Sevoke-Rongpo Corridor)',
    delayEstMinutes: 45,
    priority: 'HIGH',
    driverName: 'D. Bhutia',
    driverPhone: '+919733089012',
    isFlagged: false,
    flagReason: null,
    safetyStatus: 'NOT_CHECKED',
    lastSafetyCheck: null,
    activeCallId: null,
  },
];

export const CREATE_USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'USER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
`;

export const CREATE_VEHICLES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(64) PRIMARY KEY,
  owner_user_id VARCHAR(64) REFERENCES users(id) ON DELETE RESTRICT,
  reg_number VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(128) NOT NULL,
  capacity VARCHAR(64) NOT NULL,
  cargo VARCHAR(255) NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'IN_TRANSIT',
  speed_km_h INTEGER NOT NULL DEFAULT 45,
  origin VARCHAR(128) NOT NULL,
  destination VARCHAR(128) NOT NULL,
  lat DOUBLE PRECISION NOT NULL DEFAULT 26.1445,
  lng DOUBLE PRECISION NOT NULL DEFAULT 91.7362,
  assigned_corridor VARCHAR(128) NOT NULL DEFAULT 'NH-27',
  delay_est_minutes INTEGER NOT NULL DEFAULT 0,
  priority VARCHAR(64) NOT NULL DEFAULT 'MEDIUM',
  driver_name VARCHAR(128) NOT NULL DEFAULT 'Driver',
  driver_phone VARCHAR(64) NOT NULL,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  safety_status VARCHAR(64) NOT NULL DEFAULT 'NOT_CHECKED',
  last_safety_check TIMESTAMPTZ,
  active_call_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_owner_user_id ON vehicles(owner_user_id);
`;

export const CREATE_DEPLOYMENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS deployments (
  id VARCHAR(64) PRIMARY KEY,
  vehicle_id VARCHAR(64) NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  origin VARCHAR(128) NOT NULL,
  destination VARCHAR(128) NOT NULL,
  assigned_corridor VARCHAR(128) NOT NULL DEFAULT 'NH-27',
  status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
  cargo VARCHAR(255) NOT NULL DEFAULT 'General Relief Goods',
  priority VARCHAR(64) NOT NULL DEFAULT 'MEDIUM',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployments_vehicle_id ON deployments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_deployment_per_vehicle
ON deployments (vehicle_id)
WHERE status IN ('PLANNED', 'ACTIVE', 'DELAYED');
`;

export const INITIAL_NER_DEPLOYMENTS = [
  {
    id: 'DEP-NER-101',
    vehicleId: 'VEH-NER-101',
    origin: 'Guwahati',
    destination: 'Silchar',
    assignedCorridor: 'NH-6',
    status: 'ACTIVE',
    cargo: 'Vaccines, Blood Plasma & Insulin',
    priority: 'EMERGENCY_CRITICAL',
    startedAt: '2026-09-21T06:00:00.000Z',
    completedAt: null,
  },
  {
    id: 'DEP-NER-204',
    vehicleId: 'VEH-NER-204',
    origin: 'Guwahati',
    destination: 'Shillong',
    assignedCorridor: 'GS Road / NH-27',
    status: 'ACTIVE',
    cargo: 'Rice & Fortified Grains',
    priority: 'HIGH',
    startedAt: '2026-09-21T07:30:00.000Z',
    completedAt: null,
  },
  {
    id: 'DEP-NER-309',
    vehicleId: 'VEH-NER-309',
    origin: 'Guwahati',
    destination: 'Agartala',
    assignedCorridor: 'NH-6 / NH-8',
    status: 'DELAYED',
    cargo: 'High-Speed Diesel (HSD) & Petrol',
    priority: 'HIGH',
    startedAt: '2026-09-21T04:00:00.000Z',
    completedAt: null,
  },
  {
    id: 'DEP-NER-412',
    vehicleId: 'VEH-NER-412',
    origin: 'Silchar',
    destination: 'Imphal',
    assignedCorridor: 'NH-37 (Via Jiribam Transshipment)',
    status: 'ACTIVE',
    cargo: 'Liquid Medical Oxygen (LMO)',
    priority: 'EMERGENCY_CRITICAL',
    startedAt: '2026-09-21T05:15:00.000Z',
    completedAt: null,
  },
  {
    id: 'DEP-NER-515',
    vehicleId: 'VEH-NER-515',
    origin: 'Guwahati',
    destination: 'Kohima',
    assignedCorridor: 'NH-27 / NH-29',
    status: 'ACTIVE',
    cargo: 'Dry Rations, Tarpaulins & Water Purification Kits',
    priority: 'HIGH',
    startedAt: '2026-09-21T08:00:00.000Z',
    completedAt: null,
  },
  {
    id: 'DEP-NER-602',
    vehicleId: 'VEH-NER-602',
    origin: 'Silchar',
    destination: 'Aizawl',
    assignedCorridor: 'NH-306 / NH-54',
    status: 'ACTIVE',
    cargo: 'Baby Food & Pharmaceutical Supplies',
    priority: 'HIGH',
    startedAt: '2026-09-21T06:45:00.000Z',
    completedAt: null,
  },
  {
    id: 'DEP-NER-708',
    vehicleId: 'VEH-NER-708',
    origin: 'Tezpur',
    destination: 'Itanagar',
    assignedCorridor: 'NH-15 / NH-415',
    status: 'ACTIVE',
    cargo: 'Heavy Engineering Spares & Bridge Panels',
    priority: 'HIGH',
    startedAt: '2026-09-21T07:00:00.000Z',
    completedAt: null,
  },
  {
    id: 'DEP-NER-819',
    vehicleId: 'VEH-NER-819',
    origin: 'Siliguri',
    destination: 'Gangtok',
    assignedCorridor: 'NH-10 (Sevoke-Teesta Section)',
    status: 'ACTIVE',
    cargo: 'Emergency Hospital Oxygen Cylinders',
    priority: 'EMERGENCY_CRITICAL',
    startedAt: '2026-09-21T05:30:00.000Z',
    completedAt: null,
  },
];

import { hashPassword } from '../auth/authUtils.js';

export const INITIAL_NER_ADMIN = {
  id: 'USR-NER-ADMIN-001',
  fullName: process.env.ADMIN_INITIAL_NAME || process.env.ADMIN_NAME || 'NER Command Administrator',
  email: (process.env.ADMIN_INITIAL_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  role: 'ADMIN',
  isActive: true,
};

/**
 * Initializes the database schema and seeds initial demonstration vehicles, deployments, and admin if empty.
 * Safe to run on every startup (idempotent).
 *
 * @param {import('pg').Pool} pool
 * @returns {Promise<{ initialized: boolean, seeded: boolean, count: number, vehicleCount: number, deploymentCount: number, userCount: number }>}
 */
export async function initializeDatabase(pool) {
  if (!pool) {
    throw new Error('Database pool required for schema initialization.');
  }

  const client = await pool.connect();
  try {
    // 1. Ensure Tables & Constraints Exist
    await client.query(CREATE_USERS_TABLE_SQL);
    await client.query(CREATE_VEHICLES_TABLE_SQL);
    await client.query(CREATE_DEPLOYMENTS_TABLE_SQL);

    // Idempotent migration for existing vehicles table
    await client.query(`
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64) REFERENCES users(id) ON DELETE RESTRICT;
      CREATE INDEX IF NOT EXISTS idx_vehicles_owner_user_id ON vehicles(owner_user_id);
    `);

    // 2. Bootstrap Initial Administrator if explicitly configured and no ADMIN account exists
    const adminCheckRes = await client.query("SELECT COUNT(*) AS total FROM users WHERE role = 'ADMIN';");
    const adminCount = parseInt(adminCheckRes.rows[0]?.total || '0', 10);
    let seededAdmin = false;

    if (adminCount === 0) {
      const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      const adminPass = process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD;
      const adminName = process.env.ADMIN_INITIAL_NAME || process.env.ADMIN_NAME || 'NER Command Administrator';

      if (adminEmail && adminPass) {
        const passwordHash = await hashPassword(adminPass);
        const adminId = 'USR-NER-ADMIN-001';

        await client.query(
          `INSERT INTO users (
            id, full_name, email, password_hash, role, is_active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, 'ADMIN', TRUE, NOW(), NOW()
          ) ON CONFLICT (email) DO NOTHING;`,
          [adminId, adminName, adminEmail, passwordHash]
        );
        seededAdmin = true;
        console.log(`[Database] Initial administrator account bootstrapped successfully (${adminEmail}).`);
      } else {
        console.log('[Database] No initial admin bootstrap credentials configured (ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD). Skipping admin account creation.');
      }
    }

    // 3. Check Existing Vehicle Count
    const countResult = await client.query('SELECT COUNT(*) AS total FROM vehicles;');
    const currentCount = parseInt(countResult.rows[0]?.total || '0', 10);

    let seededVehicles = false;

    // 4. Seed Vehicles Only If Table Is Completely Empty
    if (currentCount === 0) {
      console.log('[Database] Vehicles table is empty. Seeding initial NER demonstration fleet...');
      for (const v of INITIAL_NER_VEHICLES) {
        await client.query(
          `INSERT INTO vehicles (
            id, reg_number, name, type, capacity, cargo, status, speed_km_h,
            origin, destination, lat, lng, assigned_corridor, delay_est_minutes,
            priority, driver_name, driver_phone, is_flagged, flag_reason,
            safety_status, last_safety_check, active_call_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19,
            $20, $21, $22, NOW(), NOW()
          ) ON CONFLICT (id) DO NOTHING;`,
          [
            v.id,
            v.regNumber,
            v.name,
            v.type,
            v.capacity,
            v.cargo,
            v.status,
            v.speedKmH,
            v.origin,
            v.destination,
            v.currentPos.lat,
            v.currentPos.lng,
            v.assignedCorridor,
            v.delayEstMinutes,
            v.priority,
            v.driverName,
            v.driverPhone,
            v.isFlagged,
            v.flagReason,
            v.safetyStatus,
            v.lastSafetyCheck,
            v.activeCallId,
          ]
        );
      }
      seededVehicles = true;
      console.log(`[Database] Successfully seeded ${INITIAL_NER_VEHICLES.length} demonstration vehicles.`);
    } else {
      console.log(`[Database] Vehicles table already contains ${currentCount} records. Skipping vehicle seed.`);
    }

    // 5. Check Existing Deployments Count
    const depCountResult = await client.query('SELECT COUNT(*) AS total FROM deployments;');
    const currentDepCount = parseInt(depCountResult.rows[0]?.total || '0', 10);

    let seededDeployments = false;

    // 6. Seed Deployments If Deployments Table Is Empty
    if (currentDepCount === 0) {
      console.log('[Database] Deployments table is empty. Seeding initial demonstration deployments...');
      for (const d of INITIAL_NER_DEPLOYMENTS) {
        await client.query(
          `INSERT INTO deployments (
            id, vehicle_id, origin, destination, assigned_corridor, status,
            cargo, priority, started_at, completed_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
          ) ON CONFLICT (id) DO NOTHING;`,
          [
            d.id,
            d.vehicleId,
            d.origin,
            d.destination,
            d.assignedCorridor,
            d.status,
            d.cargo,
            d.priority,
            d.startedAt,
            d.completedAt,
          ]
        );
      }
      seededDeployments = true;
      console.log(`[Database] Successfully seeded ${INITIAL_NER_DEPLOYMENTS.length} demonstration deployments.`);
    } else {
      console.log(`[Database] Deployments table already contains ${currentDepCount} records. Skipping deployment seed.`);
    }

    const finalCountResult = await client.query('SELECT COUNT(*) AS total FROM vehicles;');
    const finalCount = parseInt(finalCountResult.rows[0]?.total || '0', 10);

    const finalDepCountResult = await client.query('SELECT COUNT(*) AS total FROM deployments;');
    const finalDepCount = parseInt(finalDepCountResult.rows[0]?.total || '0', 10);

    const finalUserCountResult = await client.query('SELECT COUNT(*) AS total FROM users;');
    const finalUserCount = parseInt(finalUserCountResult.rows[0]?.total || '0', 10);

    return {
      initialized: true,
      seeded: seededVehicles || seededDeployments || seededAdmin,
      count: finalCount,
      vehicleCount: finalCount,
      deploymentCount: finalDepCount,
      userCount: finalUserCount,
    };
  } finally {
    client.release();
  }
}
