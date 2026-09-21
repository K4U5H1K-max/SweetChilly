/**
 * Track 4 Voice Service Orchestrator
 * Manages call sessions, state transitions, vehicle safety status updates, and escalation handling.
 */

import { executeMockCall } from './mockVoiceProvider.js';
import { checkCallCooldown, recordCallTimestamp, maskPhone } from './securityGuardrails.js';

class VoiceService {
  constructor() {
    this.sessions = [];
    this.getVehicles = () => [];
  }

  /**
   * Bind the live vehicles array accessor.
   */
  init(vehiclesGetter) {
    this.getVehicles = typeof vehiclesGetter === 'function' ? vehiclesGetter : () => vehiclesGetter;
  }

  /**
   * Helper to find a vehicle by ID (case-insensitive) across provided array or default store.
   */
  findVehicle(vehiclesPool, vehicleId) {
    let pool = [];
    if (Array.isArray(vehiclesPool)) {
      pool = vehiclesPool;
    } else if (typeof this.getVehicles === 'function') {
      pool = this.getVehicles() || [];
    }

    if (!vehicleId) return null;
    const targetId = String(vehicleId).toLowerCase();
    return pool.find((v) => String(v.id).toLowerCase() === targetId) || null;
  }

  /**
   * Mask sensitive PII before returning session to client.
   */
  sanitizeSession(session) {
    if (!session) return null;
    return {
      ...session,
      driverPhone: session.driverPhone ? maskPhone(session.driverPhone) : undefined,
    };
  }

  /**
   * Manually flag or unflag a vehicle for safety check.
   * Supports both (vehicles, vehicleId, reason, flagged) and ({ vehicleId, flagged, reason })
   */
  flagVehicle(arg1, arg2, arg3, arg4) {
    let pool = null;
    let vehicleId = null;
    let reason = null;
    let isFlagged = true;

    if (Array.isArray(arg1)) {
      pool = arg1;
      vehicleId = arg2;
      reason = arg3;
      isFlagged = arg4 !== undefined ? Boolean(arg4) : true;
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      pool = arg1.vehicles || null;
      vehicleId = arg1.vehicleId;
      reason = arg1.reason;
      isFlagged = arg1.flagged !== undefined ? Boolean(arg1.flagged) : (arg1.isFlagged !== undefined ? Boolean(arg1.isFlagged) : true);
    } else {
      vehicleId = arg1;
      reason = arg2;
      isFlagged = arg3 !== undefined ? Boolean(arg3) : true;
    }

    const vehicle = this.findVehicle(pool, vehicleId);
    if (!vehicle) {
      return {
        success: false,
        error: `Vehicle with ID '${vehicleId}' not found in active fleet.`,
      };
    }

    vehicle.isFlagged = isFlagged;
    vehicle.flagReason = isFlagged ? (reason || 'Manual operator flag: Safety check requested') : null;

    if (isFlagged) {
      if (vehicle.safetyStatus === 'NOT_CHECKED' || !vehicle.safetyStatus) {
        vehicle.safetyStatus = 'PENDING_CALL';
      }
    } else {
      if (vehicle.safetyStatus === 'PENDING_CALL') {
        vehicle.safetyStatus = 'NOT_CHECKED';
      }
    }

    vehicle.updatedAt = new Date().toISOString();

    return {
      success: true,
      vehicle,
      message: isFlagged
        ? `Vehicle ${vehicle.id} flagged for safety check (${vehicle.flagReason}).`
        : `Vehicle ${vehicle.id} unflagged.`,
    };
  }

  /**
   * Trigger a voice safety call for a vehicle.
   * Supports both (vehicles, options) and (options)
   */
  async triggerSafetyCall(arg1, arg2) {
    let pool = null;
    let opts = {};

    if (Array.isArray(arg1)) {
      pool = arg1;
      opts = arg2 || {};
    } else {
      opts = arg1 || {};
      pool = opts.vehicles || null;
    }

    const {
      vehicleId,
      triggerSource = 'MANUAL_OPERATOR',
      flagReason,
      scenario,
      simulatedOutcome,
      customDriverText,
      customResponse,
      forceOverride = false,
    } = opts;

    const outcomeToSimulate = simulatedOutcome || scenario || 'SAFE';
    const driverUtterance = customResponse || customDriverText || null;

    const vehicle = this.findVehicle(pool, vehicleId);
    if (!vehicle) {
      return {
        success: false,
        error: `Vehicle with ID '${vehicleId}' not found in active fleet.`,
      };
    }

    // Check cooldown
    const cooldownCheck = checkCallCooldown(vehicle.id, 2, forceOverride);
    if (!cooldownCheck.allowed) {
      return {
        success: false,
        cooldown: true,
        error: cooldownCheck.message,
        cooldownRemainingMs: (cooldownCheck.remainingSeconds || 0) * 1000,
      };
    }

    const startTime = new Date().toISOString();
    const nextCallNum = this.sessions.length + 101;
    const callId = `CALL-NER-${String(nextCallNum).padStart(4, '0')}`;

    // Mark vehicle in-call state
    vehicle.activeCallId = callId;
    vehicle.safetyStatus = 'PENDING_CALL';

    // Execute mock voice dialogue and structured classification
    const callResult = await executeMockCall({
      vehicle,
      scenario: outcomeToSimulate,
      customDriverText: driverUtterance,
      flagReason: flagReason || vehicle.flagReason,
    });

    const completedTime = new Date().toISOString();
    recordCallTimestamp(vehicle.id);

    // Construct session record
    const session = {
      callId,
      vehicleId: vehicle.id,
      triggerSource,
      flagReason: flagReason || vehicle.flagReason || 'Scheduled Driver Safety Check',
      status: callResult.callStatus || 'COMPLETED',
      startedAt: startTime,
      completedAt: completedTime,
      dialogueHistory: callResult.dialogueHistory,
      transcript: callResult.transcript,
      structuredOutcome: callResult.structuredOutcome,
      outcomeConfidence: callResult.outcomeConfidence,
      summary: callResult.summary,
      escalationRequired: callResult.escalationRequired,
      escalationResolved: false,
      escalationResolvedBy: null,
      resolutionNotes: null,
      driverPhone: vehicle.driverPhone || '+91-98640-XXXXX',
    };

    // Update vehicle permanent state
    vehicle.safetyStatus = callResult.structuredOutcome;
    vehicle.lastSafetyCheck = completedTime;
    vehicle.activeCallId = callId;

    // Flag state management
    if (callResult.structuredOutcome === 'SAFE') {
      vehicle.isFlagged = false;
      vehicle.flagReason = null;
    } else {
      vehicle.isFlagged = true;
      if (!vehicle.flagReason) {
        vehicle.flagReason = `Safety check outcome: ${callResult.structuredOutcome}`;
      }
    }

    vehicle.updatedAt = new Date().toISOString();

    // Store in session ledger
    this.sessions.unshift(session);

    return {
      success: true,
      session: this.sanitizeSession(session),
      vehicle,
    };
  }

  /**
   * Get all sessions, optionally filtered by vehicleId.
   */
  getSessions(vehicleId = null) {
    let list = this.sessions;
    if (vehicleId) {
      const q = String(vehicleId).toLowerCase();
      list = list.filter((s) => String(s.vehicleId).toLowerCase() === q);
    }
    return list.map((s) => this.sanitizeSession(s));
  }

  /**
   * Get a single session by callId.
   */
  getSessionById(callId) {
    if (!callId) return null;
    const targetId = String(callId).toLowerCase();
    const session = this.sessions.find((s) => String(s.callId).toLowerCase() === targetId);
    return session ? this.sanitizeSession(session) : null;
  }

  /**
   * Resolve an operator escalation for a call session.
   * Supports both (vehicles, callId, notes) and (callId, notes)
   */
  resolveEscalation(arg1, arg2, arg3) {
    let pool = null;
    let callId = null;
    let notes = '';

    if (Array.isArray(arg1)) {
      pool = arg1;
      callId = arg2;
      notes = typeof arg3 === 'string' ? arg3 : (arg3?.notes || 'Escalation resolved by operator.');
    } else {
      callId = arg1;
      notes = typeof arg2 === 'string' ? arg2 : (arg2?.notes || 'Escalation resolved by operator.');
      pool = arg2?.vehicles || null;
    }

    const targetId = String(callId).toLowerCase();
    const session = this.sessions.find((s) => String(s.callId).toLowerCase() === targetId);
    if (!session) {
      return {
        success: false,
        error: `Call session '${callId}' not found.`,
      };
    }

    session.escalationResolved = true;
    session.escalationResolvedBy = 'Command Center Operator';
    session.resolutionNotes = notes;
    session.resolvedAt = new Date().toISOString();

    // Update associated vehicle if present
    const vehicle = this.findVehicle(pool, session.vehicleId);
    if (vehicle) {
      vehicle.isFlagged = false;
      vehicle.flagReason = null;
      vehicle.updatedAt = new Date().toISOString();
    }

    return {
      success: true,
      session: this.sanitizeSession(session),
      vehicle,
      message: `Escalation for session ${session.callId} resolved.`,
    };
  }
}

export const voiceService = new VoiceService();
export default voiceService;
