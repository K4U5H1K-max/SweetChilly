/**
 * Track 4 Security Guardrails & Data Masking
 * Handles phone masking, rate-limiting/cooldowns, and input validation.
 */

// In-memory call timestamps per vehicle for cooldown enforcement
const vehicleCallCooldowns = new Map();

/**
 * Mask a phone number to protect driver PII in public API responses.
 * Examples:
 * "+91-98640-12345" -> "+91-98640-XXXXX"
 * "+919864012345"   -> "+91-98640-XXXXX"
 * "9876543210"      -> "98765-XXXXX"
 */
export function maskPhone(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '+91 XXXXX-XXXXX';
  }
  const cleaned = phoneNumber.trim();
  if (cleaned.length <= 6) {
    return '***-***';
  }

  const rawDigits = cleaned.replace(/\D/g, '');
  if (rawDigits.length === 10) {
    const first5 = rawDigits.slice(0, 5);
    return cleaned.startsWith('+91') ? `+91-${first5}-XXXXX` : `${first5}-XXXXX`;
  }
  if (rawDigits.length === 12 && rawDigits.startsWith('91')) {
    const first5 = rawDigits.slice(2, 7);
    return `+91-${first5}-XXXXX`;
  }
  if (cleaned.startsWith('+')) {
    const country = cleaned.match(/^\+\d{1,3}/)?.[0] || '+91';
    const rest = cleaned.slice(country.length).replace(/\D/g, '');
    return `${country}-${rest.slice(0, Math.min(5, Math.max(1, rest.length - 2)))}-XXXXX`;
  }
  return cleaned.replace(/(\d{5})\d+/, '$1-XXXXX');
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

/**
 * Normalizes and validates an Indian or international phone number into E.164 format (+91XXXXXXXXXX).
 * @param {string} phoneNumber
 * @returns {{ valid: boolean, phone?: string, error?: string }}
 */
export function validateAndNormalizePhone(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      valid: false,
      error: 'Phone number is required and must be a string.',
    };
  }

  const trimmed = phoneNumber.trim();
  // Strip common formatting characters: spaces, hyphens, parentheses, periods
  const cleaned = trimmed.replace(/[\s\-\(\)\.]/g, '');

  if (!cleaned) {
    return {
      valid: false,
      error: 'Phone number cannot be empty.',
    };
  }

  // 1. 10-digit Indian mobile number (starts with 6, 7, 8, or 9)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return {
      valid: true,
      phone: `+91${cleaned}`,
    };
  }

  // 2. 11-digit Indian number starting with 0 (e.g. 09864012345)
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return {
      valid: true,
      phone: `+91${cleaned.slice(1)}`,
    };
  }

  // 3. Indian number with +91 or 91 country code prefix (e.g. +919864012345 or 919864012345)
  if (/^(\+91|91)[6-9]\d{9}$/.test(cleaned)) {
    const digits = cleaned.replace(/^\+?91/, '');
    return {
      valid: true,
      phone: `+91${digits}`,
    };
  }

  // 4. Standard valid E.164 international format (+ followed by 7-15 digits)
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    return {
      valid: true,
      phone: cleaned,
    };
  }

  return {
    valid: false,
    error: `Invalid phone number '${maskPhone(trimmed)}'. Please provide a valid 10-digit Indian mobile number (e.g. 9864012345) or E.164 format (+91XXXXXXXXXX).`,
  };
}

