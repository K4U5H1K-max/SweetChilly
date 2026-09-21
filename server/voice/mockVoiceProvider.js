/**
 * Track 4 Mock Voice Provider
 * Simulates call lifecycle state transitions and realistic dialogue exchanges.
 */

import { classifyDialogue } from './safetyClassifier.js';

export const DIALOGUE_TEMPLATES = {
  SAFE: {
    dialogue: [
      {
        role: 'agent',
        text: 'Project Brahmaputra Emergency Dispatch calling. We are conducting a scheduled safety check for your vehicle {regNumber} along {corridor}. Please state your current status.',
      },
      {
        role: 'driver',
        text: 'Hello Dispatch. Everything is all clear here. Road conditions are good, cargo is secure, and we are moving on schedule without any issues.',
      },
      {
        role: 'agent',
        text: 'Confirmed safe status. Telemetry is updated. Please proceed with standard caution. Dispatch out.',
      },
    ],
    status: 'COMPLETED',
  },
  DELAYED: {
    dialogue: [
      {
        role: 'agent',
        text: 'Project Brahmaputra Emergency Dispatch calling vehicle {regNumber}. We noticed slow movement near {corridor}. What is your current transit status?',
      },
      {
        role: 'driver',
        text: 'Dispatch, we are encountering heavy monsoon downpour and single-lane convoy congestion. We are delayed by about 45 minutes, but vehicle and crew are safe.',
      },
      {
        role: 'agent',
        text: 'Understood. Estimated delay of 45 minutes recorded in command ledger. Maintain safe following distance.',
      },
    ],
    status: 'COMPLETED',
  },
  BREAKDOWN: {
    dialogue: [
      {
        role: 'agent',
        text: 'Project Brahmaputra Emergency Dispatch calling vehicle {regNumber}. Please state your current situation.',
      },
      {
        role: 'driver',
        text: 'Dispatch! Our engine overheated on the hill climb and radiator fluid is leaking. We pulled over safely onto the shoulder but vehicle is completely stalled. We need a mechanic and towing assistance.',
      },
      {
        role: 'agent',
        text: 'Breakdown condition acknowledged. Human operator escalation has been dispatched. Please stay inside the vehicle with hazard indicators active.',
      },
    ],
    status: 'COMPLETED',
  },
  ROAD_BLOCKED: {
    dialogue: [
      {
        role: 'agent',
        text: 'Project Brahmaputra Emergency Dispatch calling vehicle {regNumber}. Automated radar indicates disruption ahead on {corridor}. What do you observe?',
      },
      {
        role: 'driver',
        text: 'Dispatch, fresh rockfall and mud have completely blocked both lanes about 2 km ahead. Highway patrol is turning heavy vehicles back. Route is impassable.',
      },
      {
        role: 'agent',
        text: 'Road blockage confirmed. Corridor status updated in GIS monitor. Stand by for alternative detour coordinates.',
      },
    ],
    status: 'COMPLETED',
  },
  ASSISTANCE_REQUIRED: {
    dialogue: [
      {
        role: 'agent',
        text: 'Project Brahmaputra Emergency Dispatch calling vehicle {regNumber}. Are you and your crew safe?',
      },
      {
        role: 'driver',
        text: 'EMERGENCY! A rockfall hit our side cargo bay. My co-driver has a minor laceration and our steering axle is damaged. We require immediate medical attention and emergency road rescue!',
      },
      {
        role: 'agent',
        text: 'Critical emergency alert activated! High-priority operator and emergency medical services have been flagged with your exact GPS coordinates.',
      },
    ],
    status: 'COMPLETED',
  },
  NO_RESPONSE: {
    dialogue: [
      {
        role: 'agent',
        text: 'Project Brahmaputra Emergency Dispatch calling driver of {regNumber}... (Ringing for 45 seconds)',
      },
      {
        role: 'driver',
        text: '[Call was not answered. Call forwarded to automated voice recording / Line disconnected.]',
      },
      {
        role: 'agent',
        text: 'Call attempt timed out with no driver response. Unresponsive driver alert logged.',
      },
    ],
    status: 'NO_ANSWER',
  },
  UNKNOWN: {
    dialogue: [
      {
        role: 'agent',
        text: 'Project Brahmaputra Emergency Dispatch calling vehicle {regNumber}. Please state your status.',
      },
      {
        role: 'driver',
        text: '...(heavy static and howling wind noise)... over... cannot... (indecipherable audio transmission)...',
      },
      {
        role: 'agent',
        text: 'Audio transmission inaudible. Flagged for immediate dispatcher review.',
      },
    ],
    status: 'COMPLETED',
  },
};

/**
 * Simulates a complete mock safety call session.
 */
export async function executeMockCall({ vehicle, scenario, simulatedOutcome, customDriverText = null, flagReason = null }) {
  const targetScenario = simulatedOutcome || scenario || 'SAFE';
  const normalizedScenario = String(targetScenario).toUpperCase();
  const template = DIALOGUE_TEMPLATES[normalizedScenario] || DIALOGUE_TEMPLATES.SAFE;

  const reg = vehicle?.regNumber || vehicle?.id || 'NER-VH-001';
  const corridor = vehicle?.assignedCorridor || 'Corridor';
  const driverName = vehicle?.driverName || 'Driver';

  // Build customized dialogue history
  let dialogueHistory = template.dialogue.map((turn) => {
    let text = turn.text
      .replace(/\{regNumber\}/g, reg)
      .replace(/\{corridor\}/g, corridor)
      .replace(/\{driverName\}/g, driverName);

    // If custom driver text was supplied and this is the driver's turn
    if (turn.role === 'driver' && customDriverText && customDriverText.trim()) {
      text = customDriverText.trim();
    }

    return {
      role: turn.role,
      text,
      timestamp: new Date().toISOString(),
    };
  });

  const transcript = dialogueHistory
    .map((turn) => `${turn.role === 'agent' ? 'AI Voice Agent' : 'Driver'}: "${turn.text}"`)
    .join('\n');

  // Classify dialogue structured outcome
  const classification = classifyDialogue(transcript, normalizedScenario, vehicle);

  return {
    status: template.status || 'COMPLETED',
    callStatus: template.status || 'COMPLETED',
    dialogueHistory,
    transcript,
    structuredOutcome: classification.structuredOutcome,
    outcomeConfidence: classification.outcomeConfidence,
    summary: classification.summary,
    escalationRequired: classification.escalationRequired,
  };
}
