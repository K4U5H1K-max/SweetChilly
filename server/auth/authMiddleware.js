/**
 * Project Brahmaputra — Authentication & Role Authorization Middleware
 *
 * Enforces JWT authentication, active account verification, and role-based access control (RBAC).
 */

import { verifyToken, extractTokenFromHeader, toSafeUser } from './authUtils.js';
import { userRepository } from '../db/userRepository.js';

/**
 * Middleware: Verifies JWT token and attaches authenticated user context to request.
 * Returns 401 Unauthorized on missing, invalid, or expired tokens.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = extractTokenFromHeader(authHeader);

    if (!token && req.headers['x-access-token']) {
      token = String(req.headers['x-access-token']).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication token has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token payload.',
      });
    }

    // Resolve user from repository
    const user = await userRepository.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or has been removed.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated.',
      });
    }

    // Attach safe user profile to request (never passwordHash)
    req.user = toSafeUser(user);
    req.token = token;
    next();
  } catch (err) {
    console.error('[Auth Middleware] Unexpected authentication error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication verification.',
    });
  }
}

/**
 * Middleware Factory: Enforces that authenticated user has one of the allowed roles.
 * Must be preceded by `authenticateUser`.
 *
 * @param {...string} allowedRoles - e.g. 'ADMIN', 'USER'
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userRole = String(req.user.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden: requires ${normalizedAllowed.join(' or ')} permissions.`,
        requiredRoles: normalizedAllowed,
        userRole,
      });
    }

    next();
  };
}

/**
 * Optional authentication: Attaches req.user if valid token provided, otherwise leaves req.user = null.
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded?.userId) {
          const user = await userRepository.getUserById(decoded.userId);
          if (user && user.isActive) {
            req.user = toSafeUser(user);
            req.token = token;
          }
        }
      } catch (e) {
        // Ignore token decode errors in optionalAuth
      }
    }
    next();
  } catch (err) {
    next();
  }
}
