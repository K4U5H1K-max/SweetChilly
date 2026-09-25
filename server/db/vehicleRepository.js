/**
 * Project Brahmaputra — Vehicle Repository
 *
 * Provides an abstract repository layer for vehicle persistence.
 * Supports PostgreSQL with transparent fallback to in-memory store when DATABASE_URL is unset.
 */

import { INITIAL_NER_VEHICLES, resolveLocationCoordinates } from './schema.js';

export class VehicleRepository {
  /**
   * @param {import('pg').Pool | null} [pool]
   * @param {object} [options]
   * @param {boolean} [options.seedDemo=false]
   */
  constructor(pool = null, { seedDemo = false } = {}) {
    this.pool = pool;
    this.memoryStore = [];
    if (seedDemo) {
      this.seedDemoData();
    }
    this.deploymentRepo = null;
    this.userRepo = null;
  }

  /**
   * Explicit development/test helper to seed demonstration fleet into memory store.
   * @returns {number}
   */
  seedDemoData() {
    const nowIso = new Date().toISOString();
    this.memoryStore = INITIAL_NER_VEHICLES.map((v) => ({
      ownerUserId: v.ownerUserId || null,
      createdAt: v.createdAt || nowIso,
      updatedAt: v.updatedAt || nowIso,
      ...v,
    }));
    return this.memoryStore.length;
  }

  /**
   * Set or update active pool.
   * @param {import('pg').Pool | null} pool
   */
  setPool(pool) {
    this.pool = pool;
  }

  /**
   * Set deployment repository for active deployment projection.
   * @param {object} depRepo
   */
  setDeploymentRepository(depRepo) {
    this.deploymentRepo = depRepo;
  }

  /**
   * Set user repository for safe owner metadata projection.
   * @param {object} userRepo
   */
  setUserRepository(userRepo) {
    this.userRepo = userRepo;
  }

  /**
   * Projects active deployment state onto a vehicle object for backward compatibility.
   * Enforces position-source hierarchy:
   * 1. Real current telemetry (if genuine live telemetry coordinates exist)
   * 2. Active deployment origin coordinates (initial position before telemetry)
   * 3. Legitimate persisted vehicle/depot location
   * 4. Unknown / null (No marker, never Guwahati fallback)
   *
   * @param {object} vehicle
   * @returns {Promise<object>}
   */
  async projectActiveDeployment(vehicle) {
    if (!vehicle) return null;
    try {
      let activeDep = null;
      if (this.deploymentRepo && typeof this.deploymentRepo.getActiveDeploymentByVehicleId === 'function') {
        activeDep = await this.deploymentRepo.getActiveDeploymentByVehicleId(vehicle.id);
      }
      if (activeDep) {
        const originLat = activeDep.originLat !== null && activeDep.originLat !== undefined
          ? Number(activeDep.originLat)
          : (resolveLocationCoordinates(activeDep.origin)?.lat ?? null);
        const originLng = activeDep.originLng !== null && activeDep.originLng !== undefined
          ? Number(activeDep.originLng)
          : (resolveLocationCoordinates(activeDep.origin)?.lng ?? null);

        let currentPos = null;
        let locationSource = 'UNKNOWN';

        if (vehicle.telemetryPos && vehicle.telemetryPos.lat !== null && vehicle.telemetryPos.lat !== undefined && vehicle.telemetryPos.lng !== null && vehicle.telemetryPos.lng !== undefined) {
          currentPos = { lat: Number(vehicle.telemetryPos.lat), lng: Number(vehicle.telemetryPos.lng) };
          locationSource = 'LIVE_TELEMETRY';
        } else if (originLat !== null && originLng !== null && !isNaN(originLat) && !isNaN(originLng)) {
          currentPos = { lat: originLat, lng: originLng };
          locationSource = 'DEPLOYMENT_ORIGIN';
        } else if (vehicle.currentPos && vehicle.currentPos.lat !== null && vehicle.currentPos.lat !== undefined && vehicle.currentPos.lng !== null && vehicle.currentPos.lng !== undefined && !isNaN(vehicle.currentPos.lat) && !isNaN(vehicle.currentPos.lng)) {
          currentPos = { lat: Number(vehicle.currentPos.lat), lng: Number(vehicle.currentPos.lng) };
          locationSource = 'VEHICLE_LOCATION';
        }

        return {
          ...vehicle,
          origin: activeDep.origin || vehicle.origin,
          destination: activeDep.destination || vehicle.destination,
          assignedCorridor: activeDep.assignedCorridor || vehicle.assignedCorridor,
          cargo: activeDep.cargo || vehicle.cargo,
          priority: activeDep.priority || vehicle.priority,
          currentPos,
          locationSource,
          hasActiveDeployment: true,
          activeDeploymentId: activeDep.id,
          deploymentStatus: activeDep.status,
          originLat,
          originLng,
          destinationLat: activeDep.destinationLat !== null && activeDep.destinationLat !== undefined
            ? Number(activeDep.destinationLat)
            : (resolveLocationCoordinates(activeDep.destination)?.lat ?? null),
          destinationLng: activeDep.destinationLng !== null && activeDep.destinationLng !== undefined
            ? Number(activeDep.destinationLng)
            : (resolveLocationCoordinates(activeDep.destination)?.lng ?? null),
        };
      }
    } catch (err) {
      // Fallback gracefully without projection on error
    }
    const hasLiveTelemetry = vehicle.telemetryPos && vehicle.telemetryPos.lat !== null && vehicle.telemetryPos.lat !== undefined && vehicle.telemetryPos.lng !== null && vehicle.telemetryPos.lng !== undefined && !isNaN(vehicle.telemetryPos.lat) && !isNaN(vehicle.telemetryPos.lng);
    const hasValidPersisted = vehicle.currentPos && vehicle.currentPos.lat !== null && vehicle.currentPos.lng !== null && !isNaN(vehicle.currentPos.lat) && !isNaN(vehicle.currentPos.lng);

    let finalPos = null;
    let locationSource = 'UNKNOWN';
    if (hasLiveTelemetry) {
      finalPos = { lat: Number(vehicle.telemetryPos.lat), lng: Number(vehicle.telemetryPos.lng) };
      locationSource = 'LIVE_TELEMETRY';
    } else if (hasValidPersisted) {
      finalPos = vehicle.currentPos;
      locationSource = 'VEHICLE_LOCATION';
    }

    return {
      ...vehicle,
      currentPos: finalPos,
      locationSource,
      hasActiveDeployment: false,
      activeDeploymentId: null,
      deploymentStatus: 'AVAILABLE',
    };
  }

  /**
   * Attaches minimal safe owner metadata ({ id, fullName, email }) to vehicle object.
   * @param {object} vehicle
   * @returns {Promise<object>}
   */
  async attachSafeOwner(vehicle) {
    if (!vehicle) return null;
    if (!vehicle.ownerUserId || !this.userRepo) {
      return { ...vehicle, owner: null };
    }

    try {
      const user = await this.userRepo.getUserById(vehicle.ownerUserId);
      if (user) {
        return {
          ...vehicle,
          owner: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
          },
        };
      }
    } catch (err) {
      // Ignore lookup failure
    }
    return { ...vehicle, owner: null };
  }

  /**
   * Checks if repository is backed by PostgreSQL.
   * @returns {boolean}
   */
  isPersistent() {
    return Boolean(this.pool);
  }

  /**
   * Maps a PostgreSQL snake_case row to the canonical camelCase vehicle object.
   * @param {object} row
   * @returns {object}
   */
  mapRowToVehicle(row) {
    if (!row) return null;
    const hasValidCoords = row.lat !== undefined && row.lat !== null && row.lng !== undefined && row.lng !== null && !isNaN(Number(row.lat)) && !isNaN(Number(row.lng));
    return {
      id: row.id,
      ownerUserId: row.owner_user_id || null,
      regNumber: row.reg_number,
      licensePlate: row.reg_number,
      name: row.name,
      type: row.type,
      capacity: row.capacity,
      cargo: row.cargo,
      status: row.status,
      speedKmH: Number(row.speed_km_h || 0),
      origin: row.origin,
      destination: row.destination,
      currentPos: hasValidCoords ? {
        lat: Number(row.lat),
        lng: Number(row.lng),
      } : null,
      assignedCorridor: row.assigned_corridor,
      delayEstMinutes: Number(row.delay_est_minutes || 0),
      priority: row.priority,
      driverName: row.driver_name,
      driverPhone: row.driver_phone,
      isFlagged: Boolean(row.is_flagged),
      flagReason: row.flag_reason || null,
      safetyStatus: row.safety_status || 'NOT_CHECKED',
      lastSafetyCheck: row.last_safety_check ? new Date(row.last_safety_check).toISOString() : null,
      activeCallId: row.active_call_id || null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  }

  /**
   * Synchronous cached vehicle accessor for Track 4 / memory compatibility.
   * @returns {object[]}
   */
  getCachedVehicles() {
    return this.memoryStore;
  }

  /**
   * Synchronizes in-memory cache with database rows.
   * @param {object[]} vehicles
   */
  syncMemoryCache(vehicles) {
    if (Array.isArray(vehicles)) {
      this.memoryStore = vehicles.map((v) => ({ ...v }));
    }
  }

  /**
   * Retrieves all vehicles from database or in-memory store, optionally filtered by owner.
   * @param {object} [options]
   * @param {string} [options.ownerUserId]
   * @returns {Promise<object[]>}
   */
  async getAllVehicles(options = {}) {
    const { ownerUserId } = options;

    if (this.pool) {
      if (ownerUserId) {
        const res = await this.pool.query(
          'SELECT * FROM vehicles WHERE owner_user_id = $1 ORDER BY created_at ASC, id ASC;',
          [ownerUserId]
        );
        return res.rows.map((row) => this.mapRowToVehicle(row));
      }

      const res = await this.pool.query(
        'SELECT * FROM vehicles ORDER BY created_at ASC, id ASC;'
      );
      const mapped = res.rows.map((row) => this.mapRowToVehicle(row));
      this.syncMemoryCache(mapped);
      return mapped;
    }

    let results = [...this.memoryStore];
    if (ownerUserId) {
      results = results.filter((v) => v.ownerUserId === ownerUserId);
    }
    return results.map((v) => ({ ...v }));
  }

  /**
   * Retrieves vehicles owned by a specific user.
   * @param {string} ownerUserId
   * @returns {Promise<object[]>}
   */
  async getVehiclesByOwner(ownerUserId) {
    if (!ownerUserId) return [];
    return this.getAllVehicles({ ownerUserId });
  }

  /**
   * Retrieves a vehicle by ID.
   * @param {string} id
   * @returns {Promise<object | null>}
   */
  async getVehicleById(id) {
    if (!id) return null;
    const targetId = String(id).trim();

    if (this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM vehicles WHERE LOWER(id) = LOWER($1) LIMIT 1;',
        [targetId]
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToVehicle(res.rows[0]);
    }

    const found = this.memoryStore.find((v) => v.id.toLowerCase() === targetId.toLowerCase());
    return found ? { ...found } : null;
  }

  /**
   * Inserts a new vehicle record.
   * @param {object} v
   * @returns {Promise<object>}
   */
  async createVehicle(v) {
    const rawOrigin = v.origin || (v.currentLocationName ? v.currentLocationName.replace(/\s+Logistics\s+Hub|\s+Hub/i, '').trim() : null);
    const resolvedOriginCoords = resolveLocationCoordinates(rawOrigin || v.currentLocationName);

    const lat = v.currentPos?.lat !== undefined && v.currentPos?.lat !== null
      ? Number(v.currentPos.lat)
      : (v.currentLocationLat !== undefined && v.currentLocationLat !== null
          ? Number(v.currentLocationLat)
          : (v.latitude !== undefined && v.latitude !== null ? Number(v.latitude) : (resolvedOriginCoords?.lat ?? null)));
    const lng = v.currentPos?.lng !== undefined && v.currentPos?.lng !== null
      ? Number(v.currentPos.lng)
      : (v.currentLocationLng !== undefined && v.currentLocationLng !== null
          ? Number(v.currentLocationLng)
          : (v.longitude !== undefined && v.longitude !== null ? Number(v.longitude) : (resolvedOriginCoords?.lng ?? null)));

    const vehicleId = v.id || `VEH-NER-${Date.now().toString(36).toUpperCase()}`;
    const ownerUserId = v.ownerUserId || null;
    const regNumber = v.regNumber || v.licensePlate || 'AS-01-XX-0000';
    const name = v.name || 'NER Freight Unit';
    const type = v.type || 'Standard Cargo Truck';
    const capacity = v.capacity || '5 Ton';
    const cargo = v.cargo || 'General Freight';
    const status = v.status || 'AVAILABLE';
    const speedKmH = Number(v.speedKmH) || 45;
    const origin = rawOrigin || (v.currentLocationName ? v.currentLocationName.replace(/\s+Logistics\s+Hub|\s+Hub/i, '').trim() : null) || 'Unassigned Depot';
    const destination = v.destination || null;
    const assignedCorridor = v.assignedCorridor || (destination ? `${origin} - ${destination}` : null);
    const delayEstMinutes = Number(v.delayEstMinutes) || 0;
    const priority = v.priority || 'MEDIUM';
    const driverName = v.driverName || 'Driver';
    const driverPhone = v.driverPhone || '+919876543210';
    const isFlagged = Boolean(v.isFlagged);
    const flagReason = v.flagReason || null;
    const safetyStatus = v.safetyStatus || 'NOT_CHECKED';
    const lastSafetyCheck = v.lastSafetyCheck || null;
    const activeCallId = v.activeCallId || null;

    if (this.pool) {
      const res = await this.pool.query(
        `INSERT INTO vehicles (
          id, owner_user_id, reg_number, name, type, capacity, cargo, status, speed_km_h,
          origin, destination, lat, lng, assigned_corridor, delay_est_minutes,
          priority, driver_name, driver_phone, is_flagged, flag_reason,
          safety_status, last_safety_check, active_call_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21, $22, $23, NOW(), NOW()
        ) RETURNING *;`,
        [
          vehicleId,
          ownerUserId,
          regNumber,
          name,
          type,
          capacity,
          cargo,
          status,
          speedKmH,
          origin,
          destination,
          lat,
          lng,
          assignedCorridor,
          delayEstMinutes,
          priority,
          driverName,
          driverPhone,
          isFlagged,
          flagReason,
          safetyStatus,
          lastSafetyCheck,
          activeCallId,
        ]
      );

      const created = this.mapRowToVehicle(res.rows[0]);
      // Update memory cache
      this.memoryStore.push({ ...created });
      return created;
    }

    const newVeh = {
      id: vehicleId,
      ownerUserId,
      regNumber,
      licensePlate: regNumber,
      name,
      type,
      capacity,
      cargo,
      status,
      speedKmH,
      origin,
      destination,
      currentPos: (lat !== null && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng))) ? { lat: Number(lat), lng: Number(lng) } : null,
      assignedCorridor,
      delayEstMinutes,
      priority,
      driverName,
      driverPhone,
      isFlagged,
      flagReason,
      safetyStatus,
      lastSafetyCheck,
      activeCallId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.memoryStore.push(newVeh);
    return { ...newVeh };
  }

  /**
   * Updates an existing vehicle record.
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<object | null>}
   */
  async updateVehicle(id, updates = {}) {
    if (!id) return null;
    const targetId = String(id).trim();

    if (this.pool) {
      // Build dynamic parameterized UPDATE statement
      const setClauses = [];
      const values = [];
      let idx = 1;

      if (updates.ownerUserId !== undefined) {
        setClauses.push(`owner_user_id = $${idx++}`);
        values.push(updates.ownerUserId);
      }
      if (updates.regNumber !== undefined) {
        setClauses.push(`reg_number = $${idx++}`);
        values.push(updates.regNumber);
      }
      if (updates.name !== undefined) {
        setClauses.push(`name = $${idx++}`);
        values.push(updates.name);
      }
      if (updates.type !== undefined) {
        setClauses.push(`type = $${idx++}`);
        values.push(updates.type);
      }
      if (updates.capacity !== undefined) {
        setClauses.push(`capacity = $${idx++}`);
        values.push(updates.capacity);
      }
      if (updates.cargo !== undefined) {
        setClauses.push(`cargo = $${idx++}`);
        values.push(updates.cargo);
      }
      if (updates.status !== undefined) {
        setClauses.push(`status = $${idx++}`);
        values.push(updates.status);
      }
      if (updates.speedKmH !== undefined) {
        setClauses.push(`speed_km_h = $${idx++}`);
        values.push(Number(updates.speedKmH));
      }
      if (updates.origin !== undefined) {
        setClauses.push(`origin = $${idx++}`);
        values.push(updates.origin);
      }
      if (updates.destination !== undefined) {
        setClauses.push(`destination = $${idx++}`);
        values.push(updates.destination);
      }
      if (updates.currentPos?.lat !== undefined || updates.latitude !== undefined) {
        const latVal = updates.currentPos?.lat !== undefined ? updates.currentPos.lat : updates.latitude;
        setClauses.push(`lat = $${idx++}`);
        values.push(Number(latVal));
      }
      if (updates.currentPos?.lng !== undefined || updates.longitude !== undefined) {
        const lngVal = updates.currentPos?.lng !== undefined ? updates.currentPos.lng : updates.longitude;
        setClauses.push(`lng = $${idx++}`);
        values.push(Number(lngVal));
      }
      if (updates.assignedCorridor !== undefined) {
        setClauses.push(`assigned_corridor = $${idx++}`);
        values.push(updates.assignedCorridor);
      }
      if (updates.delayEstMinutes !== undefined) {
        setClauses.push(`delay_est_minutes = $${idx++}`);
        values.push(Number(updates.delayEstMinutes));
      }
      if (updates.priority !== undefined) {
        setClauses.push(`priority = $${idx++}`);
        values.push(updates.priority);
      }
      if (updates.driverName !== undefined) {
        setClauses.push(`driver_name = $${idx++}`);
        values.push(updates.driverName);
      }
      if (updates.driverPhone !== undefined) {
        setClauses.push(`driver_phone = $${idx++}`);
        values.push(updates.driverPhone);
      }
      if (updates.isFlagged !== undefined) {
        setClauses.push(`is_flagged = $${idx++}`);
        values.push(Boolean(updates.isFlagged));
      }
      if (updates.flagReason !== undefined) {
        setClauses.push(`flag_reason = $${idx++}`);
        values.push(updates.flagReason);
      }
      if (updates.safetyStatus !== undefined) {
        setClauses.push(`safety_status = $${idx++}`);
        values.push(updates.safetyStatus);
      }
      if (updates.lastSafetyCheck !== undefined) {
        setClauses.push(`last_safety_check = $${idx++}`);
        values.push(updates.lastSafetyCheck);
      }
      if (updates.activeCallId !== undefined) {
        setClauses.push(`active_call_id = $${idx++}`);
        values.push(updates.activeCallId);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(targetId);

      const sql = `
        UPDATE vehicles
        SET ${setClauses.join(', ')}
        WHERE LOWER(id) = LOWER($${idx})
        RETURNING *;
      `;

      const res = await this.pool.query(sql, values);
      if (res.rows.length === 0) return null;
      const updated = this.mapRowToVehicle(res.rows[0]);

      // Sync memory cache
      const memIdx = this.memoryStore.findIndex((v) => v.id.toLowerCase() === targetId.toLowerCase());
      if (memIdx !== -1) {
        this.memoryStore[memIdx] = { ...updated };
      }
      return updated;
    }

    const memIdx = this.memoryStore.findIndex((v) => v.id.toLowerCase() === targetId.toLowerCase());
    if (memIdx === -1) return null;

    const existing = this.memoryStore[memIdx];
    const newPos = {
      lat: updates.currentPos?.lat !== undefined ? Number(updates.currentPos.lat) : (updates.latitude !== undefined ? Number(updates.latitude) : existing.currentPos?.lat),
      lng: updates.currentPos?.lng !== undefined ? Number(updates.currentPos.lng) : (updates.longitude !== undefined ? Number(updates.longitude) : existing.currentPos?.lng),
    };

    const updated = {
      ...existing,
      ...updates,
      currentPos: newPos,
      updatedAt: new Date().toISOString(),
    };

    this.memoryStore[memIdx] = updated;
    return { ...updated };
  }

  /**
   * Deletes a vehicle by ID.
   * @param {string} id
   * @returns {Promise<object | null>}
   */
  async deleteVehicle(id) {
    if (!id) return null;
    const targetId = String(id).trim();

    if (this.pool) {
      const res = await this.pool.query(
        'DELETE FROM vehicles WHERE LOWER(id) = LOWER($1) RETURNING *;',
        [targetId]
      );
      if (res.rows.length === 0) return null;
      const deleted = this.mapRowToVehicle(res.rows[0]);

      const memIdx = this.memoryStore.findIndex((v) => v.id.toLowerCase() === targetId.toLowerCase());
      if (memIdx !== -1) {
        this.memoryStore.splice(memIdx, 1);
      }
      return deleted;
    }

    const memIdx = this.memoryStore.findIndex((v) => v.id.toLowerCase() === targetId.toLowerCase());
    if (memIdx === -1) return null;

    const deleted = this.memoryStore.splice(memIdx, 1)[0];
    return { ...deleted };
  }

  /**
   * Returns total vehicle count.
   * @returns {Promise<number>}
   */
  async countVehicles() {
    if (this.pool) {
      const res = await this.pool.query('SELECT COUNT(*) AS total FROM vehicles;');
      return parseInt(res.rows[0]?.total || '0', 10);
    }
    return this.memoryStore.length;
  }
}

// Global Singleton Instance
export const vehicleRepository = new VehicleRepository();
export default vehicleRepository;
