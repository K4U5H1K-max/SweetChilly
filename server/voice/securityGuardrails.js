/**
 * Track 4 Security Guardrails & Data Masking
 * Handles phone masking, rate-limiting/cooldowns, and input validation.
 */

// In-memory call timestamps per vehicle for cooldown enforcement
const vehicleCallCooldowns = new Map();

/**
 * Mask a phone number to protect driver PII in public API responses.
 * Example: "+91-98640-12345" -> "+91 98640-XXXXX"
 */
export function maskPhone(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '+91 XXXXX-XXXXX';
  }
  const cleaned = phoneNumber.trim();
  if (cleaned.length <= 6) {
    return '***-***';
  }
  // Retain country code and first 5 digits, mask remaining digits
  return cleaned.replace(/(\+\d{1,3}[- ]?\d{5})[- ]?\d+/, '$1-XXXXX')
    .replace(/(\d{5})\d{5}/, '$1-XXXXX');
}

/**
 * Validates whether a safety call can be placed for a vehicle based on cooldown rules.
 * @param {string} vehicleId
 * @param {number} cooldownMinutes - Default 2 minutes in dev/simulation
 * @param {boolean} forceOverride - Whether to bypass cooldown (e.g., critical emergency)
 */
export function checkCallCooldown(vehicleId, cooldownMinutes = 2, forceOverride = false) {
  if (forceOverride) {
    return { allowed: true };
  }

  const lastCallTime = vehicleCallCooldowns.get(vehicleId.toLowerCase());
  if (!lastCallTime) {
    return { allowed: true };
  }

  const elapsedMs = Date.now() - lastCallTime;
  const cooldownMs = cooldownMinutes * 60 * 1000;

  if (elapsedMs < cooldownMs) {
    const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
    return {
      allowed: false,
      message: `Call cooldown active for vehicle ${vehicleId}. Please wait ${remainingSec}s before initiating another safety check.`,
      remainingSeconds: remainingSec,
    };
  }

  return { allowed: true };
}

/**
 * Records a successful call attempt timestamp for a vehicle.
 */
export function recordCallTimestamp(vehicleId) {
  vehicleCallCooldowns.set(vehicleId.toLowerCase(), Date.now());
}

/**
 * Reset cooldown for testing purposes.
 */
export function resetCooldown(vehicleId) {
  if (vehicleId) {
    vehicleCallCooldowns.delete(vehicleId.toLowerCase());
  } else {
    vehicleCallCooldowns.clear();
  }
}

/**
 * Validates incoming flag request parameters.
 */
export function validateFlagRequest(body) {
  const { vehicleId, reason } = body || {};
  if (!vehicleId || typeof vehicleId !== 'string') {
    return { valid: false, message: 'Valid vehicleId is required.' };
  }
  if (reason !== undefined && typeof reason !== 'string') {
    return { valid: false, message: 'Flag reason must be a string.' };
  }
  return { valid: true };
}

/**
 * Validates incoming trigger call request parameters.
 */
export function validateTriggerRequest(body) {
  const { vehicleId, scenario, simulatedOutcome } = body || {};
  if (!vehicleId || typeof vehicleId !== 'string') {
    return { valid: false, message: 'Valid vehicleId is required.' };
  }

  const outcomeParam = simulatedOutcome || scenario;
  const validScenarios = [
    'SAFE',
    'DELAYED',
    'BREAKDOWN',
    'ROAD_BLOCKED',
    'ASSISTANCE_REQUIRED',
    'NO_RESPONSE',
    'UNKNOWN',
  ];

  if (outcomeParam && !validScenarios.includes(String(outcomeParam).toUpperCase())) {
    return {
      valid: false,
      message: `Invalid scenario/outcome '${outcomeParam}'. Must be one of: ${validScenarios.join(', ')}.`,
    };
  }

  return { valid: true };
}
