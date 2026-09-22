/**
 * Project Brahmaputra — Authentication & Cryptographic Utilities
 *
 * Provides bcryptjs password hashing, JWT token handling, input normalization,
 * and safe user serialization.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const DEFAULT_DEV_JWT_SECRET = 'dev-brahmaputra-jwt-secret-key-2026';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Security Fatal] Insecure production configuration: JWT_SECRET environment variable is required in production mode.');
    }
    return DEFAULT_DEV_JWT_SECRET;
  }
  return secret;
}

/**
 * Validates and normalizes an email address.
 * @param {string} email
 * @returns {{ valid: boolean, email?: string, error?: string }}
 */
export function validateAndNormalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required.' };
  }
  const normalized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return { valid: false, error: 'Please provide a valid email address format.' };
  }
  return { valid: true, email: normalized };
}

/**
 * Validates password strength baseline.
 * @param {string} password
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters in length.' };
  }
  return { valid: true };
}

/**
 * Hashes a plaintext password using bcryptjs.
 * @param {string} plaintext
 * @returns {Promise<string>}
 */
export async function hashPassword(plaintext) {
  const validation = validatePassword(plaintext);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plaintext, salt);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 * @param {string} plaintext
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plaintext, hash) {
  if (!plaintext || !hash) return false;
  return bcrypt.compare(plaintext, hash);
}

/**
 * Generates a signed JWT access token with minimal safe payload.
 * @param {object} user
 * @param {string} [expiresIn='24h']
 * @returns {string}
 */
export function generateToken(user, expiresIn = '24h') {
  if (!user || !user.id) {
    throw new Error('User object with ID is required to generate authentication token.');
  }
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'USER',
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

/**
 * Verifies and decodes a JWT access token.
 * @param {string} token
 * @returns {object}
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token string is required for verification.');
  }
  return jwt.verify(token, getJwtSecret());
}

/**
 * Extracts Bearer token from HTTP Authorization header.
 * @param {string | undefined} authHeader
 * @returns {string | null}
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const parts = authHeader.trim().split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  return null;
}

/**
 * Strips password hash and private security fields, returning a safe user profile.
 * @param {object} user
 * @returns {object | null}
 */
export function toSafeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName || user.full_name || '',
    email: user.email,
    role: user.role || 'USER',
    isActive: user.isActive !== undefined ? Boolean(user.isActive) : (user.is_active !== undefined ? Boolean(user.is_active) : true),
    createdAt: user.createdAt || user.created_at ? new Date(user.createdAt || user.created_at).toISOString() : undefined,
    updatedAt: user.updatedAt || user.updated_at ? new Date(user.updatedAt || user.updated_at).toISOString() : undefined,
  };
}
