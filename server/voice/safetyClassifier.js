/**
 * Track 4 Safety Classifier
 * Deterministic structured intent classification & escalation rules for Phase 1.
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
  if (normTranscript.includes('medical') || normTranscript.includes('injury') || normTranscript.includes('injured') || normTranscript.includes('police') || normTranscript.includes('immediate assist') || normTranscript.includes('emergency assistance')) {
    return generateStructuredResult('ASSISTANCE_REQUIRED', transcript, vehicleContext, 0.94);
  }

  if (normTranscript.includes('engine overheat') || normTranscript.includes('breakdown') || normTranscript.includes('broken down') || normTranscript.includes('tow truck') || normTranscript.includes('stalled') || normTranscript.includes('puncture') || normTranscript.includes('mechanical')) {
    return generateStructuredResult('BREAKDOWN', transcript, vehicleContext, 0.93);
  }

  if (normTranscript.includes('rockfall') || normTranscript.includes('landslide') || normTranscript.includes('road blocked') || normTranscript.includes('impassable') || normTranscript.includes('bridge collapse') || normTranscript.includes('road obstruction')) {
    return generateStructuredResult('ROAD_BLOCKED', transcript, vehicleContext, 0.91);
  }

  if (normTranscript.includes('delayed') || normTranscript.includes('traffic') || normTranscript.includes('rain') || normTranscript.includes('slow moving') || normTranscript.includes('holding back') || normTranscript.includes('congestion')) {
    return generateStructuredResult('DELAYED', transcript, vehicleContext, 0.90);
  }

  if (normTranscript.includes('no answer') || normTranscript.includes('unresponsive') || normTranscript.includes('call disconnected') || normTranscript.includes('voicemail') || normTranscript.includes('timeout')) {
    return generateStructuredResult('NO_RESPONSE', transcript, vehicleContext, 0.96);
  }

  if (normTranscript.includes('all clear') || normTranscript.includes('all safe') || normTranscript.includes('no issue') || normTranscript.includes('moving on schedule') || normTranscript.includes('fine here') || normTranscript.includes('good here') || normTranscript.includes('operational')) {
    return generateStructuredResult('SAFE', transcript, vehicleContext, 0.95);
  }

  if (normTranscript.length > 0 && (normTranscript.includes('garbled') || normTranscript.includes('static') || normTranscript.includes('noise') || normTranscript.includes('unclear'))) {
    return generateStructuredResult('UNKNOWN', transcript, vehicleContext, 0.55);
  }

  // Fallback if nothing matched
  return generateStructuredResult(hint || 'UNKNOWN', transcript, vehicleContext, 0.60);
}

/**
 * Builds the canonical classification result object.
 */
function generateStructuredResult(outcome, transcript, vehicleContext = {}, confidence = 0.90) {
  const needsEscalation = requiresEscalation(outcome);
  const reg = vehicleContext.regNumber || vehicleContext.id || 'Vehicle';
  const corridor = vehicleContext.assignedCorridor || 'Corridor';

  let summary = '';
  switch (outcome) {
    case 'SAFE':
      summary = `Driver of ${reg} confirmed vehicle and crew are safe. Transit progressing smoothly along ${corridor}.`;
      break;
    case 'DELAYED':
      summary = `Driver of ${reg} reported moderate weather or convoy delay. Transit continuing under caution.`;
      break;
    case 'BREAKDOWN':
      summary = `Driver of ${reg} reported vehicle breakdown / mechanical failure along ${corridor}. Requires roadside/towing coordination.`;
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
    structuredOutcome: outcome,
    outcomeConfidence: confidence,
    summary,
    escalationRequired: needsEscalation,
  };
}
