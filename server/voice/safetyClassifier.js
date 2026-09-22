/**
 * Project Brahmaputra — Track 4 Safety Classifier
 * Deterministic structured intent classification, 5-tuple outcome extraction, and escalation rules.
 */

export const VALID_SAFETY_STATUSES = [
  'NOT_CHECKED',
  'PENDING_CALL',
  'SAFE',
  'DELAYED',
  'BREAKDOWN',
  'ROAD_BLOCKED',
  'ASSISTANCE_REQUIRED',
  'NO_RESPONSE',
  'UNKNOWN',
];

export const ESCALATION_REQUIRED_OUTCOMES = [
  'BREAKDOWN',
  'ASSISTANCE_REQUIRED',
  'NO_RESPONSE',
  'UNKNOWN',
];

/**
 * Normalized 5-tuple status matrix for all standard outcomes.
 */
export const OUTCOME_BOOLEAN_MATRIX = {
  SAFE: {
    driverSafe: true,
    vehicleOperational: true,
    roadPassable: true,
    assistanceRequired: false,
  },
  DELAYED: {
    driverSafe: true,
    vehicleOperational: true,
    roadPassable: true,
    assistanceRequired: false,
  },
  BREAKDOWN: {
    driverSafe: true,
    vehicleOperational: false,
    roadPassable: true,
    assistanceRequired: true,
  },
  ROAD_BLOCKED: {
    driverSafe: true,
    vehicleOperational: true,
    roadPassable: false,
    assistanceRequired: false,
  },
  ASSISTANCE_REQUIRED: {
    driverSafe: false,
    vehicleOperational: false,
    roadPassable: false,
    assistanceRequired: true,
  },
  NO_RESPONSE: {
    driverSafe: false,
    vehicleOperational: false,
    roadPassable: true,
    assistanceRequired: true,
  },
  UNKNOWN: {
    driverSafe: false,
    vehicleOperational: false,
    roadPassable: false,
    assistanceRequired: true,
  },
};

/**
 * Evaluates whether an outcome warrants human operator escalation.
 */
export function requiresEscalation(outcome) {
  return ESCALATION_REQUIRED_OUTCOMES.includes(outcome);
}

/**
 * Classifies a transcript or scenario into a structured outcome with confidence and summary.
 * @param {string} transcript - Spoken dialogue transcript
 * @param {string} [scenarioHint] - Optional explicit scenario tag
 * @param {object} [vehicleContext] - Vehicle details for contextual summaries
 */
export function classifyDialogue(transcript = '', scenarioHint = null, vehicleContext = {}) {
  const normTranscript = String(transcript || '').toLowerCase();
  const hint = scenarioHint ? String(scenarioHint).toUpperCase() : null;

  // 1. Direct Scenario Hint Resolution
  if (hint && VALID_SAFETY_STATUSES.includes(hint) && hint !== 'NOT_CHECKED' && hint !== 'PENDING_CALL') {
    return generateStructuredResult(hint, transcript, vehicleContext, 0.95);
  }

  // 2. Keyword-based Intent Extraction from Transcript
  if (
    normTranscript.includes('medical') ||
    normTranscript.includes('injury') ||
    normTranscript.includes('injured') ||
    normTranscript.includes('police') ||
    normTranscript.includes('immediate assist') ||
    normTranscript.includes('emergency assistance')
  ) {
    return generateStructuredResult('ASSISTANCE_REQUIRED', transcript, vehicleContext, 0.94);
  }

  if (
    normTranscript.includes('engine overheat') ||
    normTranscript.includes('breakdown') ||
    normTranscript.includes('broken down') ||
    normTranscript.includes('tow truck') ||
    normTranscript.includes('stalled') ||
    normTranscript.includes('puncture') ||
    normTranscript.includes('mechanical')
  ) {
    return generateStructuredResult('BREAKDOWN', transcript, vehicleContext, 0.93);
  }

  if (
    normTranscript.includes('rockfall') ||
    normTranscript.includes('landslide') ||
    normTranscript.includes('road blocked') ||
    normTranscript.includes('impassable') ||
    normTranscript.includes('bridge collapse') ||
    normTranscript.includes('road obstruction')
  ) {
    return generateStructuredResult('ROAD_BLOCKED', transcript, vehicleContext, 0.91);
  }

  if (
    normTranscript.includes('delayed') ||
    normTranscript.includes('traffic') ||
    normTranscript.includes('rain') ||
    normTranscript.includes('slow moving') ||
    normTranscript.includes('holding back') ||
    normTranscript.includes('congestion')
  ) {
    return generateStructuredResult('DELAYED', transcript, vehicleContext, 0.90);
  }

  if (
    normTranscript.includes('no answer') ||
    normTranscript.includes('unresponsive') ||
    normTranscript.includes('call disconnected') ||
    normTranscript.includes('voicemail') ||
    normTranscript.includes('timeout')
  ) {
    return generateStructuredResult('NO_RESPONSE', transcript, vehicleContext, 0.96);
  }

  if (
    normTranscript.includes('all clear') ||
    normTranscript.includes('all safe') ||
    normTranscript.includes('no issue') ||
    normTranscript.includes('moving on schedule') ||
    normTranscript.includes('fine here') ||
    normTranscript.includes('good here') ||
    normTranscript.includes('operational')
  ) {
    return generateStructuredResult('SAFE', transcript, vehicleContext, 0.95);
  }

  if (
    normTranscript.length > 0 &&
    (normTranscript.includes('garbled') ||
      normTranscript.includes('static') ||
      normTranscript.includes('noise') ||
      normTranscript.includes('unclear'))
  ) {
    return generateStructuredResult('UNKNOWN', transcript, vehicleContext, 0.55);
  }

  // Fallback if nothing matched
  return generateStructuredResult(hint || 'UNKNOWN', transcript, vehicleContext, 0.60);
}

/**
 * Builds the canonical classification result object conforming to Track 4 Phase 2A schema.
 */
function generateStructuredResult(outcome, transcript, vehicleContext = {}, confidence = 0.90) {
  const normalizedOutcome = VALID_SAFETY_STATUSES.includes(outcome) ? outcome : 'UNKNOWN';
  const flags = OUTCOME_BOOLEAN_MATRIX[normalizedOutcome] || OUTCOME_BOOLEAN_MATRIX.UNKNOWN;
  const needsEscalation = requiresEscalation(normalizedOutcome);
  const reg = vehicleContext.regNumber || vehicleContext.id || 'Vehicle';
  const corridor = vehicleContext.assignedCorridor || 'Corridor';

  let summary = '';
  switch (normalizedOutcome) {
    case 'SAFE':
      summary = `Driver of ${reg} confirmed vehicle and crew are safe. Transit progressing smoothly along ${corridor}.`;
      break;
    case 'DELAYED':
      summary = `Driver of ${reg} reported moderate weather or convoy delay. Transit continuing under caution.`;
      break;
    case 'BREAKDOWN':
      summary = `Driver of ${reg} reported vehicle breakdown / mechanical failure along ${corridor}. Mechanical assistance requested.`;
      break;
    case 'ROAD_BLOCKED':
      summary = `Driver of ${reg} confirmed road blockage/obstruction ahead on ${corridor}. Rerouting advisory required.`;
      break;
    case 'ASSISTANCE_REQUIRED':
      summary = `CRITICAL: Driver of ${reg} requested emergency assistance along ${corridor}. High-priority human dispatch escalation triggered.`;
      break;
    case 'NO_RESPONSE':
      summary = `Driver safety call for ${reg} was unanswered after multiple rings. Operator verification required.`;
      break;
    case 'UNKNOWN':
    default:
      summary = `Safety dialogue for ${reg} was inconclusive or inaudible. Human operator review recommended.`;
      break;
  }

  return {
    driverSafe: flags.driverSafe,
    vehicleOperational: flags.vehicleOperational,
    roadPassable: flags.roadPassable,
    assistanceRequired: flags.assistanceRequired,
    outcome: normalizedOutcome,
    confidence: Number(confidence.toFixed(2)),
    summary,
    // Backward-compatible aliases for Phase 1
    structuredOutcome: normalizedOutcome,
    outcomeConfidence: Number(confidence.toFixed(2)),
    escalationRequired: needsEscalation,
  };
}

/**
 * Helper to parse boolean values from various boolean or string representations ('YES', 'NO', 'BLOCKED', etc.)
 */
function parseBooleanFlag(val, defaultVal = true) {
  if (typeof val === 'boolean') return val;
  if (val === undefined || val === null) return defaultVal;
  const s = String(val).trim().toLowerCase();
  if (['yes', 'true', '1', 'clear', 'passable', 'operational', 'safe'].includes(s)) return true;
  if (['no', 'false', '0', 'blocked', 'broken', 'impassable', 'down'].includes(s)) return false;
  return defaultVal;
}

/**
 * Classifies Sarvam post-call structured output variables and summaries into standard Track 4 schema.
 * @param {object} params
 * @param {boolean|string} [params.driverSafe]
 * @param {boolean|string} [params.vehicleOperational]
 * @param {boolean|string} [params.roadPassable]
 * @param {boolean|string} [params.assistanceRequired]
 * @param {string} [params.transcript]
 * @param {string} [params.summary]
 * @param {object} [params.rawOutcome]
 * @returns {object}
 */
export function classifyFromBooleans({
  driverSafe,
  vehicleOperational,
  roadPassable,
  assistanceRequired,
  transcript = '',
  summary = '',
  rawOutcome = {},
} = {}) {
  // Check if explicit valid outcome is provided (filter out non-terminal and un-evaluated outcomes)
  const rawExplicit = (rawOutcome.outcome || rawOutcome.structuredOutcome || rawOutcome.goal_evaluated || rawOutcome.call_goal_status);
  const explicitStr = rawExplicit ? String(rawExplicit).trim().toUpperCase() : null;
  const isTerminalExplicit = explicitStr &&
    VALID_SAFETY_STATUSES.includes(explicitStr) &&
    !['NOT_CHECKED', 'PENDING_CALL', 'NOT_EVALUATED', 'NOT EVALUATED', 'NONE'].includes(explicitStr);

  if (isTerminalExplicit) {
    const validOutcome = explicitStr;
    const defaultFlags = OUTCOME_BOOLEAN_MATRIX[validOutcome] || OUTCOME_BOOLEAN_MATRIX.UNKNOWN;
    const isEscalation = requiresEscalation(validOutcome);
    return {
      driverSafe: driverSafe !== undefined ? parseBooleanFlag(driverSafe, defaultFlags.driverSafe) : defaultFlags.driverSafe,
      vehicleOperational: vehicleOperational !== undefined ? parseBooleanFlag(vehicleOperational, defaultFlags.vehicleOperational) : defaultFlags.vehicleOperational,
      roadPassable: roadPassable !== undefined ? parseBooleanFlag(roadPassable, defaultFlags.roadPassable) : defaultFlags.roadPassable,
      assistanceRequired: assistanceRequired !== undefined ? parseBooleanFlag(assistanceRequired, defaultFlags.assistanceRequired) : defaultFlags.assistanceRequired,
      outcome: validOutcome,
      confidence: typeof rawOutcome.confidence === 'number' ? Math.min(1.0, Math.max(0.0, rawOutcome.confidence)) : 0.95,
      summary: summary || String(rawOutcome.summary || `Safety check evaluated with outcome ${validOutcome}.`),
      structuredOutcome: validOutcome,
      outcomeConfidence: typeof rawOutcome.confidence === 'number' ? Math.min(1.0, Math.max(0.0, rawOutcome.confidence)) : 0.95,
      escalationRequired: isEscalation,
    };
  }

  // Parse boolean flags
  const dSafe = driverSafe !== undefined ? parseBooleanFlag(driverSafe, true) : undefined;
  const vOp = vehicleOperational !== undefined ? parseBooleanFlag(vehicleOperational, true) : undefined;
  const rPassable = roadPassable !== undefined ? parseBooleanFlag(roadPassable, true) : undefined;
  const aReq = assistanceRequired !== undefined ? parseBooleanFlag(assistanceRequired, false) : undefined;

  let computedOutcome = 'SAFE';
  let confidence = 0.92;
  let forceEscalation = false;

  if (dSafe === false) {
    computedOutcome = 'ASSISTANCE_REQUIRED';
    forceEscalation = true;
  } else if (vOp === false) {
    computedOutcome = 'BREAKDOWN';
    forceEscalation = true;
  } else if (rPassable === false) {
    computedOutcome = 'ROAD_BLOCKED';
    // If assistance was requested alongside road blocked, require escalation
    if (aReq === true) {
      forceEscalation = true;
    }
  } else if (aReq === true) {
    computedOutcome = 'ASSISTANCE_REQUIRED';
    forceEscalation = true;
  } else if (dSafe === true && vOp === true && rPassable === true && aReq === false) {
    // Check if transcript indicates DELAYED
    const lowerText = `${transcript} ${summary}`.toLowerCase();
    if (lowerText.includes('delayed') || lowerText.includes('traffic') || lowerText.includes('slow moving') || lowerText.includes('congestion')) {
      computedOutcome = 'DELAYED';
    } else {
      computedOutcome = 'SAFE';
    }
  } else if (transcript || summary) {
    // Fall back to text classifier
    return classifyDialogue(`${transcript} ${summary}`.trim());
  } else {
    computedOutcome = 'UNKNOWN';
    confidence = 0.60;
  }

  const defaultSummary = summary || `Sarvam safety assessment completed: Outcome is ${computedOutcome}.`;
  const isEscalation = forceEscalation || requiresEscalation(computedOutcome);

  return {
    driverSafe: dSafe !== undefined ? dSafe : OUTCOME_BOOLEAN_MATRIX[computedOutcome].driverSafe,
    vehicleOperational: vOp !== undefined ? vOp : OUTCOME_BOOLEAN_MATRIX[computedOutcome].vehicleOperational,
    roadPassable: rPassable !== undefined ? rPassable : OUTCOME_BOOLEAN_MATRIX[computedOutcome].roadPassable,
    assistanceRequired: aReq !== undefined ? aReq : OUTCOME_BOOLEAN_MATRIX[computedOutcome].assistanceRequired,
    outcome: computedOutcome,
    confidence: Number(confidence.toFixed(2)),
    summary: defaultSummary,
    structuredOutcome: computedOutcome,
    outcomeConfidence: Number(confidence.toFixed(2)),
    escalationRequired: isEscalation,
  };
}

/**
 * Normalizes an external or LLM-generated result object into standard schema.
 */
export function normalizeStructuredResult(raw = {}, fallbackOutcome = 'UNKNOWN') {
  const vars = {
    ...(raw.variables || {}),
    ...(raw.agent_variables || {}),
    ...(raw.extracted_variables || {}),
    ...(raw.structured_data || {}),
    ...raw,
  };

  const rawOutcomeStr = vars.outcome || vars.structuredOutcome || vars.goal_evaluated || vars.call_goal_status;
  const outcomeUpper = rawOutcomeStr ? String(rawOutcomeStr).trim().toUpperCase() : null;
  const hasExplicitValidOutcome = outcomeUpper &&
    VALID_SAFETY_STATUSES.includes(outcomeUpper) &&
    !['NOT_CHECKED', 'PENDING_CALL', 'NOT_EVALUATED', 'NOT EVALUATED', 'NONE'].includes(outcomeUpper);

  // If no valid explicit outcome, but boolean properties are present (e.g. from Sarvam post-call outputs), route through classifyFromBooleans
  if (
    !hasExplicitValidOutcome &&
    (vars.driver_safe !== undefined ||
      vars.driverSafe !== undefined ||
      vars.vehicle_operational !== undefined ||
      vars.vehicleOperational !== undefined ||
      vars.road_passable !== undefined ||
      vars.roadPassable !== undefined ||
      vars.assistance_required !== undefined ||
      vars.assistanceRequired !== undefined ||
      vars.assistance_requested !== undefined)
  ) {
    return classifyFromBooleans({
      driverSafe: vars.driverSafe !== undefined ? vars.driverSafe : vars.driver_safe,
      vehicleOperational: vars.vehicleOperational !== undefined ? vars.vehicleOperational : vars.vehicle_operational,
      roadPassable: vars.roadPassable !== undefined ? vars.roadPassable : vars.road_passable,
      assistanceRequired:
        vars.assistanceRequired !== undefined
          ? vars.assistanceRequired
          : vars.assistance_required !== undefined
          ? vars.assistance_required
          : vars.assistance_requested,
      transcript: vars.transcript || raw.transcript,
      summary: vars.summary || vars.call_summary || raw.summary || raw.call_summary,
      rawOutcome: vars,
    });
  }

  // If no explicit valid outcome and no booleans, check if transcript or summary can be classified
  const textContent = (vars.transcript || raw.transcript || vars.summary || vars.call_summary || raw.summary || raw.call_summary || '').trim();
  if (!hasExplicitValidOutcome && textContent.length > 0) {
    const textClassification = classifyDialogue(textContent, null, vars.vehicleContext || raw.vehicleContext || {});
    if (textClassification && textClassification.outcome !== 'UNKNOWN') {
      return textClassification;
    }
  }

  const outcome = hasExplicitValidOutcome ? outcomeUpper : fallbackOutcome;
  const validOutcome = VALID_SAFETY_STATUSES.includes(outcome) ? outcome : fallbackOutcome;
  const defaultFlags = OUTCOME_BOOLEAN_MATRIX[validOutcome] || OUTCOME_BOOLEAN_MATRIX.UNKNOWN;

  const rawDriverSafe = vars.driverSafe !== undefined ? vars.driverSafe : vars.driver_safe;
  const rawVehicleOp = vars.vehicleOperational !== undefined ? vars.vehicleOperational : vars.vehicle_operational;
  const rawRoadPassable = vars.roadPassable !== undefined ? vars.roadPassable : vars.road_passable;
  const rawAssistReq = vars.assistanceRequired !== undefined ? vars.assistanceRequired : (vars.assistance_required || vars.assistance_requested);

  const parsedDriverSafe = rawDriverSafe !== undefined ? parseBooleanFlag(rawDriverSafe, defaultFlags.driverSafe) : defaultFlags.driverSafe;
  const parsedVehicleOp = rawVehicleOp !== undefined ? parseBooleanFlag(rawVehicleOp, defaultFlags.vehicleOperational) : defaultFlags.vehicleOperational;
  const parsedRoadPassable = rawRoadPassable !== undefined ? parseBooleanFlag(rawRoadPassable, defaultFlags.roadPassable) : defaultFlags.roadPassable;
  const parsedAssistReq = rawAssistReq !== undefined ? parseBooleanFlag(rawAssistReq, defaultFlags.assistanceRequired) : defaultFlags.assistanceRequired;

  const isEscalation = requiresEscalation(validOutcome);

  return {
    driverSafe: parsedDriverSafe,
    vehicleOperational: parsedVehicleOp,
    roadPassable: parsedRoadPassable,
    assistanceRequired: parsedAssistReq,
    outcome: validOutcome,
    confidence: typeof vars.confidence === 'number' ? Math.min(1.0, Math.max(0.0, vars.confidence)) : (vars.outcomeConfidence || 0.85),
    summary: String(vars.summary || vars.call_summary || raw.summary || raw.call_summary || `Safety check evaluated with outcome ${validOutcome}.`),
    structuredOutcome: validOutcome,
    outcomeConfidence: typeof vars.confidence === 'number' ? Math.min(1.0, Math.max(0.0, vars.confidence)) : (vars.outcomeConfidence || 0.85),
    escalationRequired: isEscalation,
  };
}

