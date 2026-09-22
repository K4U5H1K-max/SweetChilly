/**
 * Project Brahmaputra — Database Connection Manager
 *
 * Provides connection pooling, environment-aware SSL detection,
 * query execution, and sanitized status reporting.
 */

import pg from 'pg';

const { Pool } = pg;

let pool = null;
let isConnected = false;

/**
 * Checks whether DATABASE_URL is configured in environment.
 * @returns {boolean}
 */
export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL;
  return Boolean(url && typeof url === 'string' && url.trim().length > 0);
}

/**
 * Safely sanitizes database connection strings and error messages
 * so passwords or credentials are never exposed in logs or API errors.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeDbString(text) {
  if (!text) return '';
  const str = typeof text === 'string' ? text : JSON.stringify(text);
  return str.replace(/:\/\/[^:]+:([^@]+)@/g, '://[REDACTED_USER]:[REDACTED_SECRET]@');
}

/**
 * Initializes and returns the PostgreSQL connection pool.
 * @param {string} [connectionString]
 * @returns {import('pg').Pool | null}
 */
export function getPool(connectionString = null) {
  if (pool) return pool;

  const dbUrl = connectionString || process.env.DATABASE_URL;
  if (!dbUrl || typeof dbUrl !== 'string' || !dbUrl.trim()) {
    return null;
  }

  const trimmedUrl = dbUrl.trim();
  const isHosted =
    trimmedUrl.includes('render.com') ||
    trimmedUrl.includes('neon.tech') ||
    trimmedUrl.includes('supabase.co') ||
    trimmedUrl.includes('amazonaws.com') ||
    trimmedUrl.includes('sslmode=require') ||
    process.env.NODE_ENV === 'production';

  const poolConfig = {
    connectionString: trimmedUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  if (isHosted && !trimmedUrl.includes('localhost') && !trimmedUrl.includes('127.0.0.1')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('[Database] Unexpected error on idle PostgreSQL client:', sanitizeDbString(err.message));
  });

  return pool;
}

/**
 * Tests database connectivity and reports status cleanly.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function testConnection() {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: 'DATABASE_URL not configured' };
  }

  try {
    const currentPool = getPool();
    if (!currentPool) {
      return { ok: false, error: 'Failed to create PostgreSQL pool' };
    }
    const client = await currentPool.connect();
    try {
      await client.query('SELECT 1');
      isConnected = true;
      return { ok: true };
    } finally {
      client.release();
    }
  } catch (err) {
    isConnected = false;
    const sanitizedErr = sanitizeDbString(err.message);
    return { ok: false, error: sanitizedErr };
  }
}

/**
 * Executes a parameterized SQL query with the active pool.
 * @param {string} text - Parameterized SQL string
 * @param {any[]} [params] - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params = []) {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error('Database pool is not initialized. DATABASE_URL may be unset.');
  }
  return currentPool.query(text, params);
}

/**
 * Closes the database pool (for test teardowns and graceful shutdown).
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
  }
}
