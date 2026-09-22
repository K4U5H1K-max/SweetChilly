/**
 * Project Brahmaputra — User Repository
 *
 * Provides an abstract repository layer for persistent User and Admin accounts.
 * Supports PostgreSQL with transparent in-memory development fallback when DATABASE_URL is unset.
 */

import { toSafeUser } from '../auth/authUtils.js';

export class UserRepository {
  /**
   * @param {import('pg').Pool | null} [pool]
   */
  constructor(pool = null) {
    this.pool = pool;
    this.memoryStore = [];
  }

  /**
   * Set or update active pool.
   * @param {import('pg').Pool | null} pool
   */
  setPool(pool) {
    this.pool = pool;
  }

  /**
   * Checks if repository is backed by PostgreSQL.
   * @returns {boolean}
   */
  isPersistent() {
    return Boolean(this.pool);
  }

  /**
   * Maps a PostgreSQL snake_case row to the canonical camelCase user object.
   * @param {object} row
   * @returns {object | null}
   */
  mapRowToUser(row) {
    if (!row) return null;
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role || 'USER',
      isActive: Boolean(row.is_active),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  }

  /**
   * Generates a stable unique user ID.
   * @returns {string}
   */
  generateUserId() {
    const timePart = Date.now().toString(36).toUpperCase();
    const randPart = Math.floor(1000 + Math.random() * 9000);
    return `USR-NER-${timePart}-${randPart}`;
  }

  /**
   * Retrieves all users (internal repository use).
   * @returns {Promise<object[]>}
   */
  async getAllUsers() {
    if (this.pool) {
      const res = await this.pool.query('SELECT * FROM users ORDER BY created_at ASC;');
      return res.rows.map((r) => this.mapRowToUser(r));
    }
    return this.memoryStore.map((u) => ({ ...u }));
  }

  /**
   * Retrieves a user by ID.
   * @param {string} id
   * @returns {Promise<object | null>}
   */
  async getUserById(id) {
    if (!id) return null;
    const targetId = String(id).trim();

    if (this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM users WHERE LOWER(id) = LOWER($1) LIMIT 1;',
        [targetId]
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToUser(res.rows[0]);
    }

    const found = this.memoryStore.find((u) => u.id.toLowerCase() === targetId.toLowerCase());
    return found ? { ...found } : null;
  }

  /**
   * Retrieves a user by email (case-insensitive).
   * @param {string} email
   * @returns {Promise<object | null>}
   */
  async getUserByEmail(email) {
    if (!email) return null;
    const targetEmail = String(email).trim().toLowerCase();

    if (this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;',
        [targetEmail]
      );
      if (res.rows.length === 0) return null;
      return this.mapRowToUser(res.rows[0]);
    }

    const found = this.memoryStore.find((u) => u.email.toLowerCase() === targetEmail);
    return found ? { ...found } : null;
  }

  /**
   * Creates a new user record.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createUser(data) {
    if (!data) throw new Error('User data payload is required.');

    const fullName = String(data.fullName || data.full_name || '').trim();
    if (!fullName) throw new Error('Full name is required to create a user account.');

    const email = String(data.email || '').trim().toLowerCase();
    if (!email) throw new Error('Email is required to create a user account.');

    const passwordHash = data.passwordHash || data.password_hash;
    if (!passwordHash) throw new Error('Password hash is required to create a user account.');

    const role = String(data.role || 'USER').toUpperCase();
    if (!['USER', 'ADMIN'].includes(role)) {
      throw new Error(`Invalid role '${role}'. Must be either USER or ADMIN.`);
    }

    const isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;
    const userId = data.id ? String(data.id).trim() : this.generateUserId();

    // Check duplicate email
    const existing = await this.getUserByEmail(email);
    if (existing) {
      throw new Error(`User with email '${email}' already exists.`);
    }

    if (this.pool) {
      try {
        const res = await this.pool.query(
          `INSERT INTO users (
            id, full_name, email, password_hash, role, is_active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, NOW(), NOW()
          ) RETURNING *;`,
          [userId, fullName, email, passwordHash, role, isActive]
        );
        const created = this.mapRowToUser(res.rows[0]);
        this.memoryStore.push({ ...created });
        return created;
      } catch (dbErr) {
        if (dbErr.code === '23505') {
          throw new Error(`User with email '${email}' already exists.`);
        }
        throw dbErr;
      }
    }

    const nowIso = new Date().toISOString();
    const newUser = {
      id: userId,
      fullName,
      email,
      passwordHash,
      role,
      isActive,
      createdAt: data.createdAt || nowIso,
      updatedAt: data.updatedAt || nowIso,
    };

    this.memoryStore.push(newUser);
    return { ...newUser };
  }

  /**
   * Updates an existing user record.
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<object | null>}
   */
  async updateUser(id, updates = {}) {
    if (!id || !updates || typeof updates !== 'object') return null;
    const targetId = String(id).trim();

    if (this.pool) {
      const setClauses = ['updated_at = NOW()'];
      const values = [];
      let idx = 1;

      if (updates.fullName !== undefined || updates.full_name !== undefined) {
        setClauses.push(`full_name = $${idx++}`);
        values.push(updates.fullName || updates.full_name);
      }
      if (updates.email !== undefined) {
        setClauses.push(`email = $${idx++}`);
        values.push(String(updates.email).trim().toLowerCase());
      }
      if (updates.passwordHash !== undefined || updates.password_hash !== undefined) {
        setClauses.push(`password_hash = $${idx++}`);
        values.push(updates.passwordHash || updates.password_hash);
      }
      if (updates.role !== undefined) {
        const roleUpper = String(updates.role).toUpperCase();
        if (!['USER', 'ADMIN'].includes(roleUpper)) {
          throw new Error(`Invalid role '${roleUpper}'. Must be USER or ADMIN.`);
        }
        setClauses.push(`role = $${idx++}`);
        values.push(roleUpper);
      }
      if (updates.isActive !== undefined || updates.is_active !== undefined) {
        setClauses.push(`is_active = $${idx++}`);
        values.push(Boolean(updates.isActive !== undefined ? updates.isActive : updates.is_active));
      }

      values.push(targetId);
      const sql = `
        UPDATE users
        SET ${setClauses.join(', ')}
        WHERE LOWER(id) = LOWER($${idx})
        RETURNING *;
      `;

      const res = await this.pool.query(sql, values);
      if (res.rows.length === 0) return null;
      const updated = this.mapRowToUser(res.rows[0]);

      const memIdx = this.memoryStore.findIndex((u) => u.id.toLowerCase() === targetId.toLowerCase());
      if (memIdx !== -1) {
        this.memoryStore[memIdx] = { ...updated };
      }
      return updated;
    }

    const memIdx = this.memoryStore.findIndex((u) => u.id.toLowerCase() === targetId.toLowerCase());
    if (memIdx === -1) return null;

    const existing = this.memoryStore[memIdx];
    const updated = {
      ...existing,
      fullName: updates.fullName !== undefined ? updates.fullName : (updates.full_name !== undefined ? updates.full_name : existing.fullName),
      email: updates.email !== undefined ? String(updates.email).trim().toLowerCase() : existing.email,
      passwordHash: updates.passwordHash || updates.password_hash || existing.passwordHash,
      role: updates.role ? String(updates.role).toUpperCase() : existing.role,
      isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : (updates.is_active !== undefined ? Boolean(updates.is_active) : existing.isActive),
      updatedAt: new Date().toISOString(),
    };

    this.memoryStore[memIdx] = updated;
    return { ...updated };
  }

  /**
   * Deletes a user by ID (primarily for test cleanup).
   * @param {string} id
   * @returns {Promise<object | null>}
   */
  async deleteUser(id) {
    if (!id) return null;
    const targetId = String(id).trim();

    if (this.pool) {
      const res = await this.pool.query(
        'DELETE FROM users WHERE LOWER(id) = LOWER($1) RETURNING *;',
        [targetId]
      );
      if (res.rows.length === 0) return null;
      const deleted = this.mapRowToUser(res.rows[0]);
      const memIdx = this.memoryStore.findIndex((u) => u.id.toLowerCase() === targetId.toLowerCase());
      if (memIdx !== -1) {
        this.memoryStore.splice(memIdx, 1);
      }
      return deleted;
    }

    const memIdx = this.memoryStore.findIndex((u) => u.id.toLowerCase() === targetId.toLowerCase());
    if (memIdx === -1) return null;
    const deleted = this.memoryStore.splice(memIdx, 1)[0];
    return { ...deleted };
  }

  /**
   * Returns total registered user count.
   * @returns {Promise<number>}
   */
  async countUsers() {
    if (this.pool) {
      const res = await this.pool.query('SELECT COUNT(*) AS total FROM users;');
      return parseInt(res.rows[0]?.total || '0', 10);
    }
    return this.memoryStore.length;
  }
}

// Global Singleton Instance
export const userRepository = new UserRepository();
export default userRepository;
