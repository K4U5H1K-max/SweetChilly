/**
 * Project Brahmaputra — Track 4 Voice AI Subsystem
 * Common Voice Provider Abstract Contract (Interface)
 *
 * Defines the unified interface required for all voice telephony adapters
 * (MockVoiceProvider, TwilioVoiceProvider, RetellVoiceProvider, VapiVoiceProvider, etc.)
 */

export class BaseVoiceProvider {
  /**
   * @param {string} name - Provider identifier (e.g., 'mock', 'twilio', 'retell')
   * @param {object} config - Provider-specific configuration options
   */
  constructor(name = 'base', config = {}) {
    if (new.target === BaseVoiceProvider) {
      throw new TypeError('Cannot construct BaseVoiceProvider instances directly. Must extend this class.');
    }
    this.name = name;
    this.config = config;
  }

  /**
   * Initiates an outbound safety check call.
   * @param {object} params
   * @param {object} params.session - The VoiceSafetyCallSession instance
   * @param {object} params.vehicle - The target Vehicle record
   * @param {string} [params.preferredLanguage='en'] - 'en' | 'hi' | 'as' | 'bn'
   * @param {string} [params.customDriverText] - Optional test speech utterance
   * @param {string} [params.flagReason] - Reason the vehicle was flagged
   * @param {string} [params.simulatedOutcome] - Target simulation outcome (for mock provider)
   * @returns {Promise<{ callId: string, status: string, providerCallId?: string, dialogueHistory?: Array, transcript?: string, structuredOutcome?: string, outcomeConfidence?: number, summary?: string, escalationRequired?: boolean }>}
   */
  async initiateCall(params) {
    throw new Error(`[${this.name}] initiateCall() is not implemented.`);
  }

  /**
   * Handles webhook or event when the driver answers the telephone call.
   * @param {object} params
   * @param {string} params.callId
   * @param {string} [params.providerCallId]
   * @param {string} [params.timestamp]
   * @returns {Promise<{ callId: string, status: string }>}
   */
  async handleCallAnswered(params) {
    throw new Error(`[${this.name}] handleCallAnswered() is not implemented.`);
  }

  /**
   * Handles incoming transcribed speech utterance from the driver.
   * @param {object} params
   * @param {string} params.callId
   * @param {string} params.speechText - Recognized driver speech
   * @param {number} [params.confidence] - Speech recognition confidence (0.0 - 1.0)
   * @param {string} [params.detectedLanguage] - Language detected by ASR
   * @returns {Promise<{ agentResponse: string, shouldEndCall: boolean, partialOutcome?: object }>}
   */
  async handleDriverSpeech(params) {
    throw new Error(`[${this.name}] handleDriverSpeech() is not implemented.`);
  }

  /**
   * Generates next AI Agent response based on conversation history and system instructions.
   * @param {object} params
   * @param {string} params.callId
   * @param {Array} params.dialogueHistory
   * @param {object} params.context - Vehicle and corridor details
   * @param {string} [params.language='en']
   * @returns {Promise<{ text: string, shouldEndCall: boolean }>}
   */
  async generateAgentResponse(params) {
    throw new Error(`[${this.name}] generateAgentResponse() is not implemented.`);
  }

  /**
   * Finalizes call session when telephony hangup / disconnect occurs.
   * Produces the normalized structured safety outcome.
   * @param {object} params
   * @param {string} params.callId
   * @param {string} [params.transcript]
   * @param {string} [params.outcomeHint]
   * @param {number} [params.durationSeconds]
   * @returns {Promise<{ structuredOutcome: string, outcomeConfidence: number, summary: string, escalationRequired: boolean, structuredResult: object }>}
   */
  async handleCallCompleted(params) {
    throw new Error(`[${this.name}] handleCallCompleted() is not implemented.`);
  }

  /**
   * Handles failed, busy, or unreachable call attempts.
   * @param {object} params
   * @param {string} params.callId
   * @param {string} params.reason - 'BUSY' | 'NO_ANSWER' | 'FAILED' | 'REJECTED'
   * @param {string} [params.providerErrorCode]
   * @returns {Promise<{ status: string, structuredOutcome: string, escalationRequired: boolean }>}
   */
  async handleCallFailed(params) {
    throw new Error(`[${this.name}] handleCallFailed() is not implemented.`);
  }

  /**
   * Validates cryptographic authenticity of incoming provider webhooks.
   * @param {object} params
   * @param {object} params.headers - HTTP request headers
   * @param {string|object} params.rawBody - Raw request body
   * @param {object} [params.query] - Query parameters
   * @returns {{ valid: boolean, error?: string, event?: object }}
   */
  validateWebhook(params) {
    throw new Error(`[${this.name}] validateWebhook() is not implemented.`);
  }
}

export default BaseVoiceProvider;
