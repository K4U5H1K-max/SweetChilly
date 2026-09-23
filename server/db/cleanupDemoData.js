/**
 * Project Brahmaputra — Controlled Production Demo Data Cleanup
 *
 * Implements safe, atomic transactional deletion of verified legacy demonstration
 * records from PostgreSQL while strictly preserving all genuine user accounts,
 * user-created vehicles, user-created deployments, and relational integrity.
 */

export const DEMO_VEHICLE_IDS = [
  'VEH-NER-101',
  'VEH-NER-204',
  'VEH-NER-309',
  'VEH-NER-412',
  'VEH-NER-515',
  'VEH-NER-602',
  'VEH-NER-708',
  'VEH-NER-819',
];

export const DEMO_DEPLOYMENT_IDS = [
  'DEP-NER-101',
  'DEP-NER-204',
  'DEP-NER-309',
  'DEP-NER-412',
  'DEP-NER-515',
  'DEP-NER-602',
  'DEP-NER-708',
  'DEP-NER-819',
];

/**
 * Executes a controlled transactional cleanup of legacy demonstration records against a PostgreSQL pool.
 *
 * @param {import('pg').Pool} pool
 * @param {Object} [options]
 * @param {boolean} [options.dryRun=false] - If true, rolls back transaction after verification.
 * @returns {Promise<{
 *   success: boolean,
 *   action: 'COMMIT' | 'ROLLBACK',
 *   before: Object,
 *   deleted: { deployments: number, vehicles: number },
 *   after: Object,
 *   error?: string
 * }>}
 */
export async function executeControlledDemoCleanup(pool, options = {}) {
  if (!pool) {
    throw new Error('Database pool is required to execute controlled demo cleanup.');
  }

  const dryRun = Boolean(options.dryRun);
  const client = await pool.connect();

  try {
    // 1. Audit BEFORE State (Read-only)
    const usersCountRes = await client.query("SELECT count(*) AS total, count(*) FILTER (WHERE role = 'ADMIN') AS admin_count, count(*) FILTER (WHERE role = 'USER') AS user_count FROM users;");
    const vehCountRes = await client.query("SELECT count(*) AS total, count(*) FILTER (WHERE owner_user_id IS NOT NULL) AS real_count, count(*) FILTER (WHERE id = ANY($1::varchar[]) AND owner_user_id IS NULL) AS demo_count, count(*) FILTER (WHERE owner_user_id IS NULL AND NOT (id = ANY($1::varchar[]))) AS uncertain_count FROM vehicles;", [DEMO_VEHICLE_IDS]);
    const depCountRes = await client.query("SELECT count(*) AS total, count(*) FILTER (WHERE id = ANY($1::varchar[])) AS demo_count, count(*) FILTER (WHERE NOT (id = ANY($1::varchar[]))) AS real_count FROM deployments;", [DEMO_DEPLOYMENT_IDS]);

    // Check for any external deployments referencing demo vehicles
    const extDepRes = await client.query(
      'SELECT count(*) AS count FROM deployments WHERE vehicle_id = ANY($1::varchar[]) AND NOT (id = ANY($2::varchar[]));',
      [DEMO_VEHICLE_IDS, DEMO_DEPLOYMENT_IDS]
    );
    const externalDepCount = parseInt(extDepRes.rows[0]?.count || '0', 10);

    const beforeState = {
      users: {
        total: parseInt(usersCountRes.rows[0]?.total || '0', 10),
        admin: parseInt(usersCountRes.rows[0]?.admin_count || '0', 10),
        user: parseInt(usersCountRes.rows[0]?.user_count || '0', 10),
      },
      vehicles: {
        total: parseInt(vehCountRes.rows[0]?.total || '0', 10),
        real: parseInt(vehCountRes.rows[0]?.real_count || '0', 10),
        demo: parseInt(vehCountRes.rows[0]?.demo_count || '0', 10),
        uncertain: parseInt(vehCountRes.rows[0]?.uncertain_count || '0', 10),
      },
      deployments: {
        total: parseInt(depCountRes.rows[0]?.total || '0', 10),
        real: parseInt(depCountRes.rows[0]?.real_count || '0', 10),
        demo: parseInt(depCountRes.rows[0]?.demo_count || '0', 10),
        externalReferencingDemo: externalDepCount,
      },
    };

    // Safety abort if external deployments reference demo vehicles
    if (externalDepCount > 0) {
      return {
        success: false,
        action: 'ROLLBACK',
        before: beforeState,
        deleted: { deployments: 0, vehicles: 0 },
        after: beforeState,
        error: `Safety check failed: ${externalDepCount} genuine/external deployments reference demo vehicles. Aborting cleanup.`,
      };
    }

    // 2. BEGIN TRANSACTION
    await client.query('BEGIN');

    // Step A: Delete exact demonstration deployments (child table first)
    const delDepRes = await client.query(
      'DELETE FROM deployments WHERE id = ANY($1::varchar[]) RETURNING id;',
      [DEMO_DEPLOYMENT_IDS]
    );
    const deletedDepCount = delDepRes.rowCount || 0;

    // Step B: Delete exact demonstration vehicles (parent table second)
    const delVehRes = await client.query(
      'DELETE FROM vehicles WHERE id = ANY($1::varchar[]) AND owner_user_id IS NULL RETURNING id;',
      [DEMO_VEHICLE_IDS]
    );
    const deletedVehCount = delVehRes.rowCount || 0;

    // 3. In-Transaction Verification Checks
    const verifyDepRes = await client.query(
      'SELECT count(*) AS count FROM deployments WHERE id = ANY($1::varchar[]);',
      [DEMO_DEPLOYMENT_IDS]
    );
    const remainingDemoDep = parseInt(verifyDepRes.rows[0]?.count || '0', 10);

    const verifyVehRes = await client.query(
      'SELECT count(*) AS count FROM vehicles WHERE id = ANY($1::varchar[]);',
      [DEMO_VEHICLE_IDS]
    );
    const remainingDemoVeh = parseInt(verifyVehRes.rows[0]?.count || '0', 10);

    const verifyUsersRes = await client.query('SELECT count(*) AS total FROM users;');
    const remainingUsers = parseInt(verifyUsersRes.rows[0]?.total || '0', 10);

    const verifyRealVehRes = await client.query('SELECT count(*) AS total FROM vehicles WHERE owner_user_id IS NOT NULL;');
    const remainingRealVeh = parseInt(verifyRealVehRes.rows[0]?.total || '0', 10);

    const verifyRealDepRes = await client.query('SELECT count(*) AS total FROM deployments d JOIN vehicles v ON d.vehicle_id = v.id WHERE v.owner_user_id IS NOT NULL;');
    const remainingRealDep = parseInt(verifyRealDepRes.rows[0]?.total || '0', 10);

    // Assert zero demo records remain
    if (remainingDemoDep !== 0 || remainingDemoVeh !== 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        action: 'ROLLBACK',
        before: beforeState,
        deleted: { deployments: 0, vehicles: 0 },
        after: beforeState,
        error: `In-transaction verification failed: demo records still present (deployments: ${remainingDemoDep}, vehicles: ${remainingDemoVeh}).`,
      };
    }

    // Assert genuine entities were completely preserved
    if (remainingUsers !== beforeState.users.total || remainingRealVeh !== beforeState.vehicles.real) {
      await client.query('ROLLBACK');
      return {
        success: false,
        action: 'ROLLBACK',
        before: beforeState,
        deleted: { deployments: 0, vehicles: 0 },
        after: beforeState,
        error: 'In-transaction verification failed: genuine user or vehicle record counts altered. Rolling back.',
      };
    }

    if (dryRun) {
      await client.query('ROLLBACK');
      return {
        success: true,
        action: 'ROLLBACK',
        dryRun: true,
        before: beforeState,
        deleted: { deployments: deletedDepCount, vehicles: deletedVehCount },
        after: beforeState,
      };
    }

    // 4. COMMIT TRANSACTION
    await client.query('COMMIT');

    // 5. Post-Commit Snapshot
    const afterUsersRes = await client.query("SELECT count(*) AS total, count(*) FILTER (WHERE role = 'ADMIN') AS admin_count, count(*) FILTER (WHERE role = 'USER') AS user_count FROM users;");
    const afterVehRes = await client.query("SELECT count(*) AS total, count(*) FILTER (WHERE owner_user_id IS NOT NULL) AS real_count, count(*) FILTER (WHERE id = ANY($1::varchar[])) AS demo_count, count(*) FILTER (WHERE owner_user_id IS NULL) AS uncertain_count FROM vehicles;", [DEMO_VEHICLE_IDS]);
    const afterDepRes = await client.query("SELECT count(*) AS total, count(*) FILTER (WHERE id = ANY($1::varchar[])) AS demo_count, count(*) FILTER (WHERE NOT (id = ANY($1::varchar[]))) AS real_count FROM deployments;", [DEMO_DEPLOYMENT_IDS]);

    const afterState = {
      users: {
        total: parseInt(afterUsersRes.rows[0]?.total || '0', 10),
        admin: parseInt(afterUsersRes.rows[0]?.admin_count || '0', 10),
        user: parseInt(afterUsersRes.rows[0]?.user_count || '0', 10),
      },
      vehicles: {
        total: parseInt(afterVehRes.rows[0]?.total || '0', 10),
        real: parseInt(afterVehRes.rows[0]?.real_count || '0', 10),
        demo: parseInt(afterVehRes.rows[0]?.demo_count || '0', 10),
        uncertain: parseInt(afterVehRes.rows[0]?.uncertain_count || '0', 10),
      },
      deployments: {
        total: parseInt(afterDepRes.rows[0]?.total || '0', 10),
        real: parseInt(afterDepRes.rows[0]?.real_count || '0', 10),
        demo: parseInt(afterDepRes.rows[0]?.demo_count || '0', 10),
      },
    };

    return {
      success: true,
      action: 'COMMIT',
      before: beforeState,
      deleted: { deployments: deletedDepCount, vehicles: deletedVehCount },
      after: afterState,
    };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {}
    throw err;
  } finally {
    client.release();
  }
}
