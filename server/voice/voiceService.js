/**
 * Project Brahmaputra — Track 4 Voice Service Orchestrator
 *
 * Manages call sessions, state transitions, vehicle safety status updates, and escalation handling.
 * Integrates with pluggable voice providers via BaseVoiceProvider contract.
 * Backed authoritatively by VehicleRepository for persistent fleet state.
 */

import { getVoiceProvider } from './providers/voiceProviderFactory.js';
import { checkCallCooldown, recordCallTimestamp, maskPhone } from './securityGuardrails.js';
import { normalizeStructuredResult } from './safetyClassifier.js';
import { vehicleRepository } from '../db/vehicleRepository.js';

class VoiceService {
  constructor() {
    this.sessions = [];
    this.getVehicles = () => [];
    this.escalationHooks = [];
    this.repository = vehicleRepository;
  }

  /**
   * Bind the live vehicles array accessor or repository reference.
   */
  init(vehiclesGetterOrRepo) {
    if (vehiclesGetterOrRepo && typeof vehiclesGetterOrRepo.getVehicleById === 'function') {
      this.repository = vehiclesGetterOrRepo;
    } else if (typeof vehiclesGetterOrRepo === 'function') {
      this.getVehicles = vehiclesGetterOrRepo;
    }
  }

  /**
   * Register a callback for when an operational escalation occurs.
   */
  registerEscalationHook(fn) {
    if (typeof fn === 'function') {
      this.escalationHooks.push(fn);
    }
  }

  /**
   * Dispatches escalation event to registered hooks.
   */
  notifyEscalation({ session, vehicle, outcome, summary }) {
    for (const hook of this.escalationHooks) {
      try {
        hook({ session, vehicle, outcome, summary });
      } catch (err) {
        console.error('[VoiceService] Error in escalation hook:', err);
      }
    }
  }

  /**
   * Synchronous helper to find a vehicle by ID (case-insensitive) across provided array, getter, or cache.
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
    const inPool = pool.find((v) => String(v.id).toLowerCase() === targetId);
    if (inPool) return inPool;

    // Synchronous memory cache fallback
    const repo = this.repository || vehicleRepository;
    if (repo && typeof repo.getCachedVehicles === 'function') {
      return repo.getCachedVehicles().find((v) => String(v.id).toLowerCase() === targetId) || null;
    }

    return null;
  }

  /**
   * Asynchronous authoritative vehicle lookup.
   */
  async getVehicle(vehicleId, pool = null) {
    if (!vehicleId) return null;
    const targetId = String(vehicleId).toLowerCase();

    // Check pool first if explicit array provided (e.g. test isolation)
    if (Array.isArray(pool)) {
      const inPool = pool.find((v) => String(v.id).toLowerCase() === targetId);
      if (inPool) return inPool;
    }

    const repo = this.repository || vehicleRepository;
    return await repo.getVehicleById(targetId);
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
   * Persists changes through vehicleRepository.
   * Supports both (vehicles, vehicleId, reason, flagged) and ({ vehicleId, flagged, reason })
   */
  async flagVehicle(arg1, arg2, arg3, arg4) {
    let pool = null;
    let vehicleId = null;
    let reason = null;
    let isFlagged = true;

    if (Array.isArray(arg1) || (arg1 === null && arg2 !== undefined)) {
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

    let vehicle = null;
    if (Array.isArray(pool)) {
      vehicle = pool.find((v) => String(v.id).toLowerCase() === String(vehicleId).toLowerCase());
    }
    if (!vehicle) {
      const repo = this.repository || vehicleRepository;
      vehicle = await repo.getVehicleById(vehicleId);
    }

    if (!vehicle) {
      return {
        success: false,
        error: `Vehicle with ID '${vehicleId}' not found in active fleet.`,
      };
    }

    let newSafetyStatus = vehicle.safetyStatus;
    if (isFlagged) {
      if (vehicle.safetyStatus === 'NOT_CHECKED' || !vehicle.safetyStatus) {
        newSafetyStatus = 'PENDING_CALL';
      }
    } else {
      if (vehicle.safetyStatus === 'PENDING_CALL') {
        newSafetyStatus = 'NOT_CHECKED';
      }
    }

    const flagReason = isFlagged ? (reason || 'Manual operator flag: Safety check requested') : null;
    const repo = this.repository || vehicleRepository;
    const updated = await repo.updateVehicle(vehicle.id, {
      isFlagged,
      flagReason,
      safetyStatus: newSafetyStatus,
    });

    const resultVehicle = updated || {
      ...vehicle,
      isFlagged,
      flagReason,
      safetyStatus: newSafetyStatus,
    };

    // Mutate pool object if passed as array (for in-memory test backward compatibility)
    if (Array.isArray(pool)) {
      const memObj = pool.find((v) => String(v.id).toLowerCase() === String(vehicle.id).toLowerCase());
      if (memObj) {
        Object.assign(memObj, resultVehicle);
      }
    }

    return {
      success: true,
      vehicle: resultVehicle,
      message: isFlagged
        ? `Vehicle ${resultVehicle.id} flagged for safety check (${resultVehicle.flagReason}).`
        : `Vehicle ${resultVehicle.id} unflagged.`,
    };
  }

  /**
   * Trigger a voice safety call for a vehicle via the active voice provider.
   * Persists active call state and results through vehicleRepository.
   * Supports both (vehicles, options) and (options)
   */
  async triggerSafetyCall(arg1, arg2) {
    let pool = null;
    let opts = {};

    if (Array.isArray(arg1) || (arg1 === null && typeof arg2 === 'object')) {
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

    let vehicle = null;
    if (Array.isArray(pool)) {
      vehicle = pool.find((v) => String(v.id).toLowerCase() === String(vehicleId).toLowerCase());
    }
    if (!vehicle) {
      const repo = this.repository || vehicleRepository;
      vehicle = await repo.getVehicleById(vehicleId);
    }

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

    // Immediately persist vehicle in-call state
    const repo = this.repository || vehicleRepository;
    await repo.updateVehicle(vehicle.id, {
      activeCallId: callId,
      safetyStatus: 'PENDING_CALL',
      isFlagged: true,
      flagReason: flagReason || vehicle.flagReason || 'Scheduled Driver Safety Check',
    });

    // Mark local reference
    vehicle.activeCallId = callId;
    vehicle.safetyStatus = 'PENDING_CALL';
    vehicle.isFlagged = true;

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

    // Execute provider outbound call with authoritative vehicle info
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

    // Update vehicle persistent state
    if (isCompleted) {
      const isSafe = normalizedResult.outcome === 'SAFE';
      const updates = {
        safetyStatus: normalizedResult.outcome,
        lastSafetyCheck: completedTime,
        activeCallId: callId,
        isFlagged: !isSafe,
        flagReason: isSafe ? null : (vehicle.flagReason || `Safety check outcome: ${normalizedResult.outcome}`),
      };
      const updatedVeh = await repo.updateVehicle(vehicle.id, updates);
      if (updatedVeh) {
        Object.assign(vehicle, updatedVeh);
      }
    } else {
      const updates = {
        safetyStatus: 'PENDING_CALL',
        activeCallId: callId,
        isFlagged: true,
      };
      const updatedVeh = await repo.updateVehicle(vehicle.id, updates);
      if (updatedVeh) {
        Object.assign(vehicle, updatedVeh);
      }
    }

    if (Array.isArray(pool)) {
      const memObj = pool.find((v) => String(v.id).toLowerCase() === String(vehicle.id).toLowerCase());
      if (memObj) {
        Object.assign(memObj, vehicle);
      }
    }

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
   * Persists cleared flag state through vehicleRepository.
   * Supports both (vehicles, callId, notes) and (callId, notes)
   */
  async resolveEscalation(arg1, arg2, arg3) {
    let pool = null;
    let callId = null;
    let notes = '';

    if (Array.isArray(arg1) || (arg1 === null && typeof arg2 === 'string')) {
      pool = arg1;
      callId = arg2;
      notes = typeof arg3 === 'string' ? arg3 : (arg3?.notes || 'Escalation resolved by operator.');
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      callId = arg1.callId;
      notes = arg1.notes || 'Escalation resolved by operator.';
      pool = arg1.vehicles || null;
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

    let vehicle = null;
    if (Array.isArray(pool)) {
      vehicle = pool.find((v) => String(v.id).toLowerCase() === String(session.vehicleId).toLowerCase());
    }
    if (!vehicle) {
      const repo = this.repository || vehicleRepository;
      vehicle = await repo.getVehicleById(session.vehicleId);
    }

    if (vehicle) {
      const repo = this.repository || vehicleRepository;
      const updatedVeh = await repo.updateVehicle(vehicle.id, {
        isFlagged: false,
        flagReason: null,
      });
      if (updatedVeh) {
        Object.assign(vehicle, updatedVeh);
      }
      if (Array.isArray(pool)) {
        const memObj = pool.find((v) => String(v.id).toLowerCase() === String(vehicle.id).toLowerCase());
        if (memObj) {
          Object.assign(memObj, vehicle);
        }
      }
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
