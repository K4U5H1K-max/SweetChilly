/**
 * Project Brahmaputra — Track 4 Voice Service Orchestrator
 *
 * Manages call sessions, state transitions, vehicle safety status updates, and escalation handling.
 * Integrates with pluggable voice providers via BaseVoiceProvider contract.
 */

import { getVoiceProvider } from './providers/voiceProviderFactory.js';
import { checkCallCooldown, recordCallTimestamp, maskPhone } from './securityGuardrails.js';
import { normalizeStructuredResult } from './safetyClassifier.js';

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
   * Trigger a voice safety call for a vehicle via the active voice provider.
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
      preferredLanguage,
      providerName,
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

    // Session Language determination
    const language = preferredLanguage || vehicle.preferredLanguage || 'en';

    // Resolve active voice provider via Provider Factory abstraction
    const provider = getVoiceProvider(providerName);

    // Initial temporary session for provider context
    const tempSession = {
      callId,
      vehicleId: vehicle.id,
      triggerSource,
      flagReason: flagReason || vehicle.flagReason || 'Scheduled Driver Safety Check',
      preferredLanguage: language,
    };

    // Execute provider outbound call
    const callResult = await provider.initiateCall({
      session: tempSession,
      vehicle,
      scenario: outcomeToSimulate,
      simulatedOutcome: outcomeToSimulate,
      customDriverText: driverUtterance,
      flagReason: flagReason || vehicle.flagReason,
      preferredLanguage: language,
    });

    const completedTime = new Date().toISOString();
    recordCallTimestamp(vehicle.id);

    // Normalize classification result (guarantees 5-tuple boolean flags)
    const normalizedResult = normalizeStructuredResult(callResult, outcomeToSimulate);

    // Construct persistent session record
    const isCompleted = (callResult.status || callResult.callStatus) === 'COMPLETED';
    const session = {
      callId,
      vehicleId: vehicle.id,
      providerCallId: callResult.providerCallId || null,
      provider: provider.name,
      triggerSource,
      flagReason: flagReason || vehicle.flagReason || 'Scheduled Driver Safety Check',
      status: callResult.status || callResult.callStatus || (isCompleted ? 'COMPLETED' : 'QUEUED'),
      isDryRun: Boolean(callResult.isDryRun),
      startedAt: startTime,
      completedAt: isCompleted ? completedTime : null,
      dialogueHistory: callResult.dialogueHistory || [],
      transcript: callResult.transcript || '',
      preferredLanguage: language,
      detectedLanguage: callResult.detectedLanguage || language,
      // Normalized 5-tuple + outcome schema
      driverSafe: isCompleted ? normalizedResult.driverSafe : undefined,
      vehicleOperational: isCompleted ? normalizedResult.vehicleOperational : undefined,
      roadPassable: isCompleted ? normalizedResult.roadPassable : undefined,
      assistanceRequired: isCompleted ? normalizedResult.assistanceRequired : undefined,
      outcome: isCompleted ? normalizedResult.outcome : 'PENDING_CALL',
      confidence: isCompleted ? normalizedResult.confidence : 0.90,
      summary: isCompleted ? normalizedResult.summary : (callResult.transcript || 'Safety check initiated.'),
      // Backward-compatible Phase 1 fields
      structuredOutcome: isCompleted ? normalizedResult.outcome : 'PENDING_CALL',
      outcomeConfidence: isCompleted ? normalizedResult.confidence : 0.90,
      escalationRequired: isCompleted ? normalizedResult.escalationRequired : false,
      escalationResolved: false,
      escalationResolvedBy: null,
      resolutionNotes: null,
      driverPhone: vehicle.driverPhone || '+91-98640-XXXXX',
    };

    // Update vehicle permanent state
    if (isCompleted) {
      vehicle.safetyStatus = normalizedResult.outcome;
      vehicle.lastSafetyCheck = completedTime;
      vehicle.activeCallId = callId;

      // Flag state management
      if (normalizedResult.outcome === 'SAFE') {
        vehicle.isFlagged = false;
        vehicle.flagReason = null;
      } else {
        vehicle.isFlagged = true;
        if (!vehicle.flagReason) {
          vehicle.flagReason = `Safety check outcome: ${normalizedResult.outcome}`;
        }
      }
    } else {
      vehicle.safetyStatus = 'PENDING_CALL';
      vehicle.activeCallId = callId;
      vehicle.isFlagged = true;
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
   * Get internal raw session reference by callId or providerCallId (for internal service/webhook updates).
   */
  getRawSessionById(callId) {
    if (!callId) return null;
    const targetId = String(callId).toLowerCase();
    return (
      this.sessions.find(
        (s) =>
          String(s.callId).toLowerCase() === targetId ||
          (s.providerCallId && String(s.providerCallId).toLowerCase() === targetId)
      ) || null
    );
  }

  /**
   * Get raw session by either internal callId, providerCallId, or vehicleId.
   */
  getRawSessionByAnyId(identifier) {
    if (!identifier) return null;
    const target = String(identifier).toLowerCase();
    return (
      this.sessions.find(
        (s) =>
          String(s.callId).toLowerCase() === target ||
          (s.providerCallId && String(s.providerCallId).toLowerCase() === target) ||
          String(s.vehicleId).toLowerCase() === target
      ) || null
    );
  }

  /**
   * Get a single session by callId (sanitized for client consumption).
   */
  getSessionById(callId) {
    if (!callId) return null;
    const session = this.getRawSessionById(callId);
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
