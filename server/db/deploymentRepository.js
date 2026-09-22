/**
 * Project Brahmaputra — Deployment Repository
 *
 * Provides an abstract repository layer for vehicle deployment / trip persistence.
 * Supports PostgreSQL with transparent in-memory development fallback when DATABASE_URL is unset.
 */

import { INITIAL_NER_DEPLOYMENTS } from './schema.js';

export const VALID_DEPLOYMENT_STATUSES = [
  'PLANNED',
  'ACTIVE',
  'DELAYED',
  'COMPLETED',
  'CANCELLED',
];

export const ACTIVE_DEPLOYMENT_STATUSES = [
  'PLANNED',
  'ACTIVE',
  'DELAYED',
];

export class DeploymentRepository {
  /**
   * @param {import('pg').Pool | null} [pool]
   */
  constructor(pool = null) {
    this.pool = pool;
    const nowIso = new Date().toISOString();
    // In-memory backing store for local testing/dev when DATABASE_URL is unset
    this.memoryStore = INITIAL_NER_DEPLOYMENTS.map((d) => ({
      createdAt: d.createdAt || nowIso,
      updatedAt: d.updatedAt || nowIso,
      startedAt: d.startedAt || nowIso,
      completedAt: d.completedAt || null,
      ...d,
    }));
    this.vehicleRepo = null;
  }

  /**
   * Set or update active pool.
   * @param {import('pg').Pool | null} pool
   */
  setPool(pool) {
    this.pool = pool;
  }

  /**
   * Set vehicle repository for ownership-aware queries.
   * @param {object} vehRepo
   */
  setVehicleRepository(vehRepo) {
    this.vehicleRepo = vehRepo;
  }

  /**
   * Checks if repository is backed by PostgreSQL.
   * @returns {boolean}
   */
  isPersistent() {
    return Boolean(this.pool);
  }

  /**
   * Maps a PostgreSQL snake_case row to canonical camelCase deployment object.
   * @param {object} row
   * @returns {object}
   */
  mapRowToDeployment(row) {
    if (!row) return null;
    return {
      id: row.id,
      vehicleId: row.vehicle_id,
      origin: row.origin,
      destination: row.destination,
      assignedCorridor: row.assigned_corridor,
      status: row.status,
      cargo: row.cargo,
      priority: row.priority,
      startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  }

  /**
   * Retrieves all deployments, optionally filtered by status, vehicleId, and/or ownerUserId.
   * @param {object} [filters]
   * @param {string} [filters.status]
   * @param {string} [filters.vehicleId]
   * @param {string} [filters.ownerUserId]
   * @returns {Promise<object[]>}
   */
  async getAllDeployments(filters = {}) {
    const { status, vehicleId, ownerUserId } = filters;

    if (this.pool) {
      const conditions = [];
      const values = [];
      let idx = 1;

      if (status) {
        conditions.push(`LOWER(d.status) = LOWER($${idx++})`);
        values.push(status.trim());
      }
      if (vehicleId) {
        conditions.push(`LOWER(d.vehicle_id) = LOWER($${idx++})`);
        values.push(vehicleId.trim());
      }
      if (ownerUserId) {
        conditions.push(`v.owner_user_id = $${idx++}`);
        values.push(ownerUserId.trim());
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = ownerUserId
        ? `
          SELECT d.* FROM deployments d
          JOIN vehicles v ON d.vehicle_id = v.id
          ${whereClause}
          ORDER BY d.created_at DESC;
        `
        : `
          SELECT d.* FROM deployments d
          ${whereClause}
          ORDER BY d.created_at DESC;
        `;
      const res = await this.pool.query(sql, values);
      return res.rows.map((row) => this.mapRowToDeployment(row));
    }

    let results = [...this.memoryStore];
    if (status) {
      const targetStatus = String(status).trim().toLowerCase();
      results = results.filter((d) => String(d.status).toLowerCase() === targetStatus);
    }
    if (vehicleId) {
      const targetVehId = String(vehicleId).trim().toLowerCase();
      results = results.filter((d) => String(d.vehicleId).toLowerCase() === targetVehId);
    }
    if (ownerUserId) {
      const filtered = [];
      for (const d of results) {
        const veh = this.vehicleRepo ? await this.vehicleRepo.getVehicleById(d.vehicleId) : null;
        if (veh && veh.ownerUserId === ownerUserId) {
          filtered.push(d);
        }
      }
      results = filtered;
    }

    return results.map((d) => ({ ...d }));
  }

  /**
   * Retrieves all deployments belonging to vehicles owned by a specific user.
   * @param {string} ownerUserId
   * @param {object} [filters]
   * @returns {Promise<object[]>}
   */
  async getDeploymentsByOwner(ownerUserId, filters = {}) {
    if (!ownerUserId) return [];
    return this.getAllDeployments({ ...filters, ownerUserId });
  }

  /**
   * Retrieves a deployment by its unique ID.
   * @param {string} id
   * @returns {Promise<object | null>}
   */
  async getDeploymentById(id) {
    if (!id) return null;
    const targetId = String(id).trim();

    if (this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM deployments WHERE LOWER(id) = LOWER($1);',
        [targetId]
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToDeployment(res.rows[0]);
    }

    const found = this.memoryStore.find((d) => d.id.toLowerCase() === targetId.toLowerCase());
    return found ? { ...found } : null;
  }

  /**
   * Retrieves all deployments associated with a vehicle.
   * @param {string} vehicleId
   * @param {object} [filters]
   * @returns {Promise<object[]>}
   */
  async getDeploymentsByVehicleId(vehicleId, filters = {}) {
    if (!vehicleId) return [];
    return this.getAllDeployments({ ...filters, vehicleId });
  }

  /**
   * Retrieves the currently active deployment for a vehicle (status: PLANNED, ACTIVE, DELAYED).
   * @param {string} vehicleId
   * @returns {Promise<object | null>}
   */
  async getActiveDeploymentByVehicleId(vehicleId) {
    if (!vehicleId) return null;
    const targetVehId = String(vehicleId).trim();

    if (this.pool) {
      const sql = `
        SELECT * FROM deployments
        WHERE LOWER(vehicle_id) = LOWER($1)
          AND status IN ('PLANNED', 'ACTIVE', 'DELAYED')
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      const res = await this.pool.query(sql, [targetVehId]);
      if (res.rows.length === 0) return null;
      return this.mapRowToDeployment(res.rows[0]);
    }

    const found = this.memoryStore.find(
      (d) =>
        d.vehicleId.toLowerCase() === targetVehId.toLowerCase() &&
        ACTIVE_DEPLOYMENT_STATUSES.includes(String(d.status).toUpperCase())
    );
    return found ? { ...found } : null;
  }

  /**
   * Creates a new deployment record.
   * Enforces that a vehicle can have only one active deployment at a time.
   *
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createDeployment(data) {
    if (!data) throw new Error('Deployment data payload is required.');
    const vehicleId = String(data.vehicleId || '').trim();
    if (!vehicleId) throw new Error('Vehicle ID is required to create a deployment.');

    const origin = String(data.origin || '').trim();
    const destination = String(data.destination || '').trim();
    if (!origin || !destination) {
      throw new Error('Origin and destination are required for deployment.');
    }

    const assignedCorridor = String(data.assignedCorridor || `${origin} - ${destination}`).trim();
    const cargo = String(data.cargo || 'General Relief Cargo').trim();
    const priority = String(data.priority || 'MEDIUM').toUpperCase();
    const status = String(data.status || 'ACTIVE').toUpperCase();

    if (!VALID_DEPLOYMENT_STATUSES.includes(status)) {
      throw new Error(`Invalid deployment status '${status}'. Must be one of: ${VALID_DEPLOYMENT_STATUSES.join(', ')}`);
    }

    // Check active deployment invariant
    if (ACTIVE_DEPLOYMENT_STATUSES.includes(status)) {
      const activeDep = await this.getActiveDeploymentByVehicleId(vehicleId);
      if (activeDep) {
        throw new Error(
          `Vehicle '${vehicleId}' already has an active deployment (${activeDep.id} - ${activeDep.origin} → ${activeDep.destination}). Complete or cancel it first.`
        );
      }
    }

    const deploymentId = data.id
      ? String(data.id).trim()
      : `DEP-NER-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const startedAt = data.startedAt || (status === 'ACTIVE' ? new Date().toISOString() : null);
    const completedAt = data.completedAt || null;

    if (this.pool) {
      try {
        const res = await this.pool.query(
          `INSERT INTO deployments (
            id, vehicle_id, origin, destination, assigned_corridor, status,
            cargo, priority, started_at, completed_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
          ) RETURNING *;`,
          [
            deploymentId,
            vehicleId,
            origin,
            destination,
            assignedCorridor,
            status,
            cargo,
            priority,
            startedAt,
            completedAt,
          ]
        );
        const created = this.mapRowToDeployment(res.rows[0]);
        this.memoryStore.push({ ...created });
        return created;
      } catch (dbErr) {
        if (dbErr.code === '23505') {
          throw new Error(`Active deployment constraint violation: Vehicle '${vehicleId}' already has an active deployment.`);
        }
        if (dbErr.code === '23503') {
          throw new Error(`Referenced vehicle '${vehicleId}' does not exist in registry.`);
        }
        throw dbErr;
      }
    }

    const newDep = {
      id: deploymentId,
      vehicleId,
      origin,
      destination,
      assignedCorridor,
      status,
      cargo,
      priority,
      startedAt,
      completedAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.memoryStore.push(newDep);
    return { ...newDep };
  }

  /**
   * Updates an existing deployment.
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<object | null>}
   */
  async updateDeployment(id, updates) {
    if (!id || !updates || typeof updates !== 'object') return null;
    const targetId = String(id).trim();

    if (updates.status && !VALID_DEPLOYMENT_STATUSES.includes(String(updates.status).toUpperCase())) {
      throw new Error(`Invalid status '${updates.status}'. Must be one of: ${VALID_DEPLOYMENT_STATUSES.join(', ')}`);
    }

    if (this.pool) {
      const setClauses = ['updated_at = NOW()'];
      const values = [];
      let idx = 1;

      if (updates.origin !== undefined) {
        setClauses.push(`origin = $${idx++}`);
        values.push(updates.origin);
      }
      if (updates.destination !== undefined) {
        setClauses.push(`destination = $${idx++}`);
        values.push(updates.destination);
      }
      if (updates.assignedCorridor !== undefined) {
        setClauses.push(`assigned_corridor = $${idx++}`);
        values.push(updates.assignedCorridor);
      }
      if (updates.status !== undefined) {
        setClauses.push(`status = $${idx++}`);
        values.push(String(updates.status).toUpperCase());
      }
      if (updates.cargo !== undefined) {
        setClauses.push(`cargo = $${idx++}`);
        values.push(updates.cargo);
      }
      if (updates.priority !== undefined) {
        setClauses.push(`priority = $${idx++}`);
        values.push(updates.priority);
      }
      if (updates.startedAt !== undefined) {
        setClauses.push(`started_at = $${idx++}`);
        values.push(updates.startedAt);
      }
      if (updates.completedAt !== undefined) {
        setClauses.push(`completed_at = $${idx++}`);
        values.push(updates.completedAt);
      }

      values.push(targetId);
      const sql = `
        UPDATE deployments
        SET ${setClauses.join(', ')}
        WHERE LOWER(id) = LOWER($${idx})
        RETURNING *;
      `;

      const res = await this.pool.query(sql, values);
      if (res.rows.length === 0) return null;
      const updated = this.mapRowToDeployment(res.rows[0]);

      const memIdx = this.memoryStore.findIndex((d) => d.id.toLowerCase() === targetId.toLowerCase());
      if (memIdx !== -1) {
        this.memoryStore[memIdx] = { ...updated };
      }
      return updated;
    }

    const memIdx = this.memoryStore.findIndex((d) => d.id.toLowerCase() === targetId.toLowerCase());
    if (memIdx === -1) return null;

    const existing = this.memoryStore[memIdx];
    const updated = {
      ...existing,
      ...updates,
      status: updates.status ? String(updates.status).toUpperCase() : existing.status,
      updatedAt: new Date().toISOString(),
    };

    this.memoryStore[memIdx] = updated;
    return { ...updated };
  }

  /**
   * Starts a planned deployment.
   * @param {string} id
   * @returns {Promise<object | null>}
   */
  async startDeployment(id) {
    const existing = await this.getDeploymentById(id);
    if (!existing) return null;
    if (existing.status !== 'PLANNED') {
      throw new Error(`Cannot start deployment in '${existing.status}' status. Only PLANNED deployments can be started.`);
    }

    // Invariant check: vehicle must have no other active deployment
    const active = await this.getActiveDeploymentByVehicleId(existing.vehicleId);
    if (active && active.id !== existing.id) {
      throw new Error(`Vehicle '${existing.vehicleId}' already has an active deployment (${active.id}).`);
    }

    return this.updateDeployment(id, {
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
    });
  }

  /**
   * Marks a deployment as completed.
   * @param {string} id
   * @returns {Promise<object | null>}
   */
  async completeDeployment(id) {
    const existing = await this.getDeploymentById(id);
    if (!existing) return null;
    if (existing.status === 'COMPLETED') return existing; // Idempotent
    if (existing.status === 'CANCELLED') {
      throw new Error(`Cannot complete a CANCELLED deployment.`);
    }

    return this.updateDeployment(id, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Cancels an active or planned deployment.
   * @param {string} id
   * @returns {Promise<object | null>}
   */
  async cancelDeployment(id) {
    const existing = await this.getDeploymentById(id);
    if (!existing) return null;
    if (existing.status === 'CANCELLED') return existing; // Idempotent
    if (existing.status === 'COMPLETED') {
      throw new Error(`Cannot cancel a COMPLETED deployment.`);
    }

    return this.updateDeployment(id, {
      status: 'CANCELLED',
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Deletes a deployment by ID (primarily for test cleanup).
   * @param {string} id
   * @returns {Promise<object | null>}
   */
  async deleteDeployment(id) {
    if (!id) return null;
    const targetId = String(id).trim();

    if (this.pool) {
      const res = await this.pool.query(
        'DELETE FROM deployments WHERE LOWER(id) = LOWER($1) RETURNING *;',
        [targetId]
      );
      if (res.rows.length === 0) return null;
      const deleted = this.mapRowToDeployment(res.rows[0]);
      const memIdx = this.memoryStore.findIndex((d) => d.id.toLowerCase() === targetId.toLowerCase());
      if (memIdx !== -1) {
        this.memoryStore.splice(memIdx, 1);
      }
      return deleted;
    }

    const memIdx = this.memoryStore.findIndex((d) => d.id.toLowerCase() === targetId.toLowerCase());
    if (memIdx === -1) return null;
    const deleted = this.memoryStore.splice(memIdx, 1)[0];
    return { ...deleted };
  }
}

// Export singleton instance
export const deploymentRepository = new DeploymentRepository();
