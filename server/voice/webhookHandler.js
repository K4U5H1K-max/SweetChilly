/**
 * Project Brahmaputra — Track 4 Webhook Handler & Telephony State Machine
 *
 * Implements:
 * - Telephony state machine transition validation
 * - Webhook signature authenticity verification
 * - Idempotency & duplicate event deduplication
 * - Unknown Call ID rejection
 * - Persistent vehicle state synchronization via vehicleRepository
 * - Sanitized responses (zero credential leakage)
 */

import { getVoiceProvider } from './providers/voiceProviderFactory.js';
import { voiceService } from './voiceService.js';
import { normalizeStructuredResult } from './safetyClassifier.js';
import { vehicleRepository } from '../db/vehicleRepository.js';

// Valid status lifecycle enum
export const TELEPHONY_STATUSES = [
  'CALL_INITIATED',
  'RINGING',
  'ANSWERED',
  'IN_PROGRESS',
  'COMPLETED',
  'BUSY',
  'NO_ANSWER',
  'FAILED',
];

// State machine transition adjacency rules
export const VALID_TRANSITIONS = {
  QUEUED: ['CALL_INITIATED', 'RINGING', 'ANSWERED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER'],
  CALL_INITIATED: ['RINGING', 'ANSWERED', 'IN_PROGRESS', 'COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED'],
  RINGING: ['ANSWERED', 'IN_PROGRESS', 'COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED'],
  ANSWERED: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER'],
  IN_PROGRESS: ['COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER'],
  // Terminal states (no transitions allowed out of terminal states)
  COMPLETED: [],
  BUSY: [],
  NO_ANSWER: [],
  FAILED: [],
};

// In-memory idempotency cache for deduplication (with 15 min TTL)
const processedWebhooks = new Map();
const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000;

function cleanupIdempotencyCache() {
  const now = Date.now();
  for (const [key, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL_MS) {
      processedWebhooks.delete(key);
    }
  }
}

/**
 * Validates if transition from currentState to nextState is allowed.
 */
export function isValidStateTransition(currentState = 'QUEUED', nextState) {
  const current = String(currentState || 'QUEUED').toUpperCase();
  const next = String(nextState || '').toUpperCase();

  if (current === next) return true; // Idempotent same-state update
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

/**
 * Handles incoming provider status webhook.
 * @param {object} params
 * @param {object} params.headers
 * @param {object} params.body
 * @param {object} [params.query]
 * @returns {Promise<{ statusCode: number, body: object }>}
 */
export async function processStatusWebhook({ headers = {}, body = {}, query = {} }) {
  cleanupIdempotencyCache();

  const provider = getVoiceProvider();

  // 1. Authenticity Verification
  const authResult = provider.validateWebhook({ headers, rawBody: body, query });
  if (!authResult.valid) {
    return {
      statusCode: 401,
      body: {
        success: false,
        error: authResult.error || 'Unauthorized webhook signature.',
      },
    };
  }

  const payload = authResult.event || body;
  const metadata = payload.metadata || payload.webhook_config?.metadata || body.metadata || body.webhook_config?.metadata || {};

  const payloadCallId = payload.callId || payload.call_id || metadata.internal_call_id || metadata.internalCallId || metadata.call_id || body.callId || body.call_id || body.internal_call_id;
  const providerCallId = payload.providerCallId || body.job_id || body.interaction_id || body.outbound_id || body.providerCallId || body.id || payload.job_id;
  const vehicleId = payload.vehicleId || metadata.vehicle_id || metadata.vehicleId || body.vehicle_id || body.vehicleId || payload.vehicle_id;

  const {
    status,
    eventId,
    timestamp = new Date().toISOString(),
    transcript,
    summary,
    rawOutcome,
    variables,
    reason,
  } = payload;

  const lookupId = payloadCallId || providerCallId;
  if (!lookupId && !vehicleId) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Missing callId, providerCallId, or vehicleId in webhook payload.' },
    };
  }

  if (!status || !TELEPHONY_STATUSES.includes(String(status).toUpperCase())) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: `Invalid or missing status '${status}'. Must be one of: ${TELEPHONY_STATUSES.join(', ')}`,
      },
    };
  }

  const normalizedStatus = String(status).toUpperCase();

  // 2. Locate Target Session
  const session =
    (lookupId ? voiceService.getRawSessionById(lookupId) || voiceService.getRawSessionByAnyId(lookupId) : null) ||
    (providerCallId ? voiceService.getRawSessionByAnyId(providerCallId) : null) ||
    (vehicleId ? voiceService.getRawSessionByAnyId(vehicleId) : null);

  if (!session) {
    const sanitizedWarning = {
      lookupId: lookupId || 'N/A',
      vehicleId: vehicleId || 'N/A',
      status: normalizedStatus,
      topLevelKeys: Object.keys(body),
      metadataKeys: Object.keys(metadata),
    };
    console.warn(`[SarvamWebhook] Correlation warning: Call session '${lookupId || vehicleId}' not found in active session store.\n${JSON.stringify(sanitizedWarning, null, 2)}`);
    return {
      statusCode: 200,
      body: {
        received: true,
        processed: false,
        reason: 'UNMATCHED_CALL',
      },
    };
  }

  const effectiveCallId = session.callId;

  // 3. Idempotency Check
  const idempotencyKey = eventId || `${effectiveCallId}:${normalizedStatus}:${timestamp}`;
  if (processedWebhooks.has(idempotencyKey)) {
    return {
      statusCode: 200,
      body: {
        success: true,
        idempotent: true,
        message: 'Duplicate webhook event ignored (idempotent).',
        callId: effectiveCallId,
      },
    };
  }
  processedWebhooks.set(idempotencyKey, Date.now());

  // Attach providerCallId if newly available
  if (providerCallId && !session.providerCallId) {
    session.providerCallId = providerCallId;
  }

  // 4. Invalid State Transition Check
  const currentSessionStatus = session.status || 'QUEUED';
  if (!isValidStateTransition(currentSessionStatus, normalizedStatus)) {
    return {
      statusCode: 409,
      body: {
        success: false,
        error: `Invalid state transition from '${currentSessionStatus}' to '${normalizedStatus}'.`,
        callId: effectiveCallId,
        currentStatus: currentSessionStatus,
      },
    };
  }

  // 5. Apply State Updates
  session.status = normalizedStatus;
  session.updatedAt = timestamp;

  if (normalizedStatus === 'ANSWERED' || normalizedStatus === 'IN_PROGRESS') {
    session.answeredAt = timestamp;
  }

  if (normalizedStatus === 'COMPLETED') {
    session.completedAt = timestamp;
    if (transcript) session.transcript = transcript;
    if (summary) session.summary = summary;

    // Normalization across possible Sarvam variables or raw outcome
    const callVars = variables || rawOutcome || {};
    const normalized = normalizeStructuredResult({
      ...callVars,
      summary: summary || transcript || callVars.summary,
      transcript: transcript || callVars.transcript,
    });

    session.driverSafe = normalized.driverSafe;
    session.vehicleOperational = normalized.vehicleOperational;
    session.roadPassable = normalized.roadPassable;
    session.assistanceRequired = normalized.assistanceRequired;
    session.outcome = normalized.outcome;
    session.confidence = normalized.confidence;
    session.summary = normalized.summary;
    session.structuredOutcome = normalized.outcome;
    session.outcomeConfidence = normalized.confidence;
    session.escalationRequired = normalized.escalationRequired;

    // Persist vehicle record through vehicleRepository
    let vehicle = null;
    const isSafe = normalized.outcome === 'SAFE';
    const vehicleUpdates = {
      safetyStatus: normalized.outcome,
      lastSafetyCheck: timestamp,
      activeCallId: session.callId,
      isFlagged: !isSafe,
      flagReason: isSafe ? null : `Safety check outcome: ${normalized.outcome}`,
    };

    try {
      const updatedVehicle = await vehicleRepository.updateVehicle(session.vehicleId, vehicleUpdates);
      if (updatedVehicle) {
        vehicle = updatedVehicle;
      }
    } catch (dbErr) {
      console.error('[Webhook Handler] Vehicle persistence error on COMPLETED:', dbErr.message);
    }

    // Also update any in-memory test fleet reference
    const memoryVehicle = voiceService.findVehicle ? voiceService.findVehicle(null, session.vehicleId) : null;
    if (memoryVehicle) {
      Object.assign(memoryVehicle, vehicleUpdates, { updatedAt: timestamp });
    }

    if (normalized.escalationRequired && voiceService.notifyEscalation) {
      voiceService.notifyEscalation({
        session,
        vehicle: vehicle || memoryVehicle,
        outcome: normalized.outcome,
        summary: normalized.summary,
      });
    }
  }

  if (['FAILED', 'BUSY', 'NO_ANSWER'].includes(normalizedStatus)) {
    session.completedAt = timestamp;
    session.failureReason = reason || normalizedStatus;
    const fallbackOutcome = normalizedStatus === 'NO_ANSWER' ? 'NO_RESPONSE' : 'UNKNOWN';
    const normalized = normalizeStructuredResult({ outcome: fallbackOutcome });
    session.driverSafe = normalized.driverSafe;
    session.vehicleOperational = normalized.vehicleOperational;
    session.roadPassable = normalized.roadPassable;
    session.assistanceRequired = normalized.assistanceRequired;
    session.outcome = normalized.outcome;
    session.confidence = normalized.confidence;
    session.summary = `Call ${normalizedStatus.toLowerCase()}: ${reason || 'Driver unreachable'}.`;
    session.structuredOutcome = normalized.outcome;
    session.outcomeConfidence = normalized.confidence;
    session.escalationRequired = true;

    // Persist vehicle record through vehicleRepository
    let vehicle = null;
    const vehicleUpdates = {
      safetyStatus: normalized.outcome,
      lastSafetyCheck: timestamp,
      activeCallId: session.callId,
      isFlagged: true,
      flagReason: `Safety check failed: ${reason || normalizedStatus}`,
    };

    try {
      const updatedVehicle = await vehicleRepository.updateVehicle(session.vehicleId, vehicleUpdates);
      if (updatedVehicle) {
        vehicle = updatedVehicle;
      }
    } catch (dbErr) {
      console.error(`[Webhook Handler] Vehicle persistence error on ${normalizedStatus}:`, dbErr.message);
    }

    // Also update any in-memory test fleet reference
    const memoryVehicle = voiceService.findVehicle ? voiceService.findVehicle(null, session.vehicleId) : null;
    if (memoryVehicle) {
      Object.assign(memoryVehicle, vehicleUpdates, { updatedAt: timestamp });
    }

    if (voiceService.notifyEscalation) {
      voiceService.notifyEscalation({
        session,
        vehicle: vehicle || memoryVehicle,
        outcome: normalized.outcome,
        summary: session.summary,
      });
    }
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      message: `Call session ${effectiveCallId} updated to ${normalizedStatus}.`,
      callId: effectiveCallId,
      status: normalizedStatus,
    },
  };
}
