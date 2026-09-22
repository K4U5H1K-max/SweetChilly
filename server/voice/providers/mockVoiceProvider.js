/**
 * Project Brahmaputra — Track 4 Mock Voice Provider
 * Extends BaseVoiceProvider for zero-cost deterministic local simulation & testing.
 */

import { BaseVoiceProvider } from './baseProvider.js';
import { classifyDialogue } from '../safetyClassifier.js';
import { buildGreetingMessage } from '../agentPrompt.js';

export const DIALOGUE_TEMPLATES = {
  SAFE: {
    dialogue: [
      {
        role: 'agent',
        text: 'Hello. This is the automated Brahmaputra Driver Safety Assistant. Vehicle {regNumber} has been flagged following an operational corridor alert. Are you and your vehicle safe?',
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
        text: 'Hello. This is the automated Brahmaputra Driver Safety Assistant. Vehicle {regNumber} has been flagged for transit delay near {corridor}. What is your current transit status?',
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
        text: 'Hello. This is the automated Brahmaputra Driver Safety Assistant calling vehicle {regNumber}. Please state your current situation.',
      },
      {
        role: 'driver',
        text: 'Dispatch, we have broken down near mile marker 44. Engine temperature is overheating and radiator has burst. We are safely pulled over but cannot move.',
      },
      {
        role: 'agent',
        text: 'Understood. I have recorded that you are safe and require vehicle mechanical assistance. The Brahmaputra Control Center has been notified.',
      },
    ],
    status: 'COMPLETED',
  },
  ROAD_BLOCKED: {
    dialogue: [
      {
        role: 'agent',
        text: 'Hello. This is the automated Brahmaputra Driver Safety Assistant calling vehicle {regNumber} regarding the {corridor} route. Please confirm road status.',
      },
      {
        role: 'driver',
        text: 'Dispatch, there is a fresh rockfall and mud accumulation blocking both carriageways ahead. Police are holding all vehicles. Road is completely impassable.',
      },
      {
        role: 'agent',
        text: 'Received road blockage advisory. Route planner detour will be calculated and dispatched to your unit.',
      },
    ],
    status: 'COMPLETED',
  },
  ASSISTANCE_REQUIRED: {
    dialogue: [
      {
        role: 'agent',
        text: 'Hello. This is the automated Brahmaputra Driver Safety Assistant. Emergency verification for vehicle {regNumber}. Do you require assistance?',
      },
      {
        role: 'driver',
        text: 'Dispatch! We need urgent assistance. Our refrigeration unit has failed, medical vaccines are at risk, and our relief driver requires medical attention for heat exhaustion.',
      },
      {
        role: 'agent',
        text: 'Emergency priority acknowledged. Immediate coordinator escalation triggered in command ledger. Remain calm.',
      },
    ],
    status: 'COMPLETED',
  },
  NO_RESPONSE: {
    dialogue: [
      {
        role: 'agent',
        text: 'Hello. This is the automated Brahmaputra Driver Safety Assistant calling vehicle {regNumber}...',
      },
      {
        role: 'driver',
        text: '[No audio response received — Call timed out after 4 rings]',
      },
      {
        role: 'agent',
        text: 'No response received. Driver safety check flagged for immediate operator phone trace.',
      },
    ],
    status: 'COMPLETED',
  },
  UNKNOWN: {
    dialogue: [
      {
        role: 'agent',
        text: 'Hello. This is the automated Brahmaputra Driver Safety Assistant calling vehicle {regNumber}. Please state your status.',
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

export class MockVoiceProvider extends BaseVoiceProvider {
  constructor(config = {}) {
    super('mock', config);
  }

  /**
   * Initiates simulated outbound call.
   */
  async initiateCall({ vehicle, scenario = 'SAFE', simulatedOutcome, customDriverText = null, flagReason = null, preferredLanguage = 'en' }) {
    const targetScenario = (simulatedOutcome || scenario || 'SAFE').toUpperCase();
    const template = DIALOGUE_TEMPLATES[targetScenario] || DIALOGUE_TEMPLATES.SAFE;

    const reg = vehicle?.regNumber || vehicle?.id || 'NER-VH-001';
    const corridor = vehicle?.assignedCorridor || 'Corridor';
    const driverName = vehicle?.driverName || 'Driver';

    // Build dialogue turns
    const dialogueHistory = template.dialogue.map((turn, idx) => {
      let text = turn.text
        .replace(/\{regNumber\}/g, reg)
        .replace(/\{corridor\}/g, corridor)
        .replace(/\{driverName\}/g, driverName);

      // Customize opening greeting with language template if first agent turn
      if (idx === 0 && turn.role === 'agent') {
        text = buildGreetingMessage(vehicle, preferredLanguage);
      }

      // If custom driver text was supplied and this is the driver turn
      if (turn.role === 'driver' && customDriverText && customDriverText.trim()) {
        text = customDriverText.trim();
      }

      return {
        role: turn.role,
        speaker: turn.role === 'agent' ? 'AI Safety Agent' : `Driver ${driverName}`,
        text,
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });

    const transcript = dialogueHistory
      .map((turn) => `${turn.speaker}: "${turn.text}"`)
      .join('\n');

    // Classify structured outcome
    const classification = classifyDialogue(transcript, targetScenario, vehicle);

    return {
      status: template.status || 'COMPLETED',
      callStatus: template.status || 'COMPLETED',
      providerCallId: `MOCK-${Date.now()}`,
      dialogueHistory,
      transcript,
      structuredOutcome: classification.structuredOutcome,
      outcome: classification.outcome,
      outcomeConfidence: classification.outcomeConfidence,
      confidence: classification.confidence,
      summary: classification.summary,
      escalationRequired: classification.escalationRequired,
      driverSafe: classification.driverSafe,
      vehicleOperational: classification.vehicleOperational,
      roadPassable: classification.roadPassable,
      assistanceRequired: classification.assistanceRequired,
      detectedLanguage: preferredLanguage,
    };
  }

  async handleCallAnswered({ callId }) {
    return { callId, status: 'ANSWERED' };
  }

  async handleDriverSpeech({ callId, speechText, detectedLanguage = 'en' }) {
    const classification = classifyDialogue(speechText, null);
    return {
      agentResponse: classification.summary,
      shouldEndCall: true,
      partialOutcome: classification,
      detectedLanguage,
    };
  }

  async generateAgentResponse({ dialogueHistory = [], context = {}, language = 'en' }) {
    return {
      text: buildGreetingMessage(context.vehicle || {}, language),
      shouldEndCall: dialogueHistory.length >= 4,
    };
  }

  async handleCallCompleted({ callId, transcript = '', outcomeHint = 'SAFE' }) {
    const classification = classifyDialogue(transcript, outcomeHint);
    return {
      callId,
      status: 'COMPLETED',
      ...classification,
    };
  }

  async handleCallFailed({ callId, reason = 'NO_ANSWER' }) {
    const outcome = reason === 'NO_ANSWER' ? 'NO_RESPONSE' : 'UNKNOWN';
    const classification = classifyDialogue('', outcome);
    return {
      callId,
      status: 'FAILED',
      ...classification,
    };
  }

  /**
   * Mock webhook validation is always valid for local testing.
   */
  validateWebhook({ headers = {}, rawBody = {} } = {}) {
    return { valid: true, event: rawBody };
  }
}

// Standalone function wrapper preserving 100% backward compatibility
export async function executeMockCall(params) {
  const provider = new MockVoiceProvider();
  return provider.initiateCall(params);
}

export const mockVoiceProvider = new MockVoiceProvider();
export default mockVoiceProvider;
