/**
 * Project Brahmaputra — Track 4 Real Voice Provider Adapter Skeleton
 *
 * Prepared architecture for real outbound AI telephony providers
 * (e.g. Twilio Voice API, Retell AI, Vapi, or Bland AI).
 *
 * DO NOT initiate actual telephone calls in Phase 2A.
 * Credentials must be supplied via environment variables once a provider is approved.
 */

import { BaseVoiceProvider } from './baseProvider.js';
import { buildSystemPrompt, buildGreetingMessage } from '../agentPrompt.js';
import { normalizeStructuredResult } from '../safetyClassifier.js';
import crypto from 'node:crypto';

export class RealVoiceProviderSkeleton extends BaseVoiceProvider {
  constructor(config = {}) {
    super('real-skeleton', config);
    this.apiKey = process.env.VOICE_PROVIDER_API_KEY || config.apiKey || null;
    this.callerNumber = process.env.VOICE_CALLER_NUMBER || config.callerNumber || null;
    this.webhookSecret = process.env.VOICE_WEBHOOK_SECRET || config.webhookSecret || null;
    this.backendUrl = process.env.PUBLIC_BACKEND_URL || 'http://localhost:5000';
  }

  /**
   * Asserts that real telephony credentials have been configured before executing.
   */
  assertConfigured() {
    if (!this.apiKey) {
      throw new Error(
        `[RealVoiceProvider] Provider credentials are not configured. Please define VOICE_PROVIDER_API_KEY in environment or set VOICE_PROVIDER=mock for local simulation.`
      );
    }
  }

  /**
   * Prepares and dispatches an outbound call via provider REST API.
   */
  async initiateCall({ session, vehicle, preferredLanguage = 'en', flagReason = null }) {
    this.assertConfigured();

    const systemPrompt = buildSystemPrompt({
      vehicle,
      language: preferredLanguage,
      flagReason,
    });

    const initialGreeting = buildGreetingMessage(vehicle, preferredLanguage);

    const callPayload = {
      to: vehicle.driverPhone,
      from: this.callerNumber,
      webhookStatusUrl: `${this.backendUrl}/api/voice/webhooks/status`,
      webhookSpeechUrl: `${this.backendUrl}/api/voice/webhooks/speech`,
      agentConfig: {
        systemPrompt,
        initialGreeting,
        language: preferredLanguage,
        maxDurationSeconds: 75,
        temperature: 0.1,
      },
      metadata: {
        callId: session.callId,
        vehicleId: vehicle.id,
      },
    };

    // Return the queued telephony payload contract (for Phase 2B live execution)
    return {
      status: 'QUEUED',
      callStatus: 'QUEUED',
      providerCallId: `PROV-REQ-${Date.now()}`,
      dialogueHistory: [
        {
          role: 'agent',
          speaker: 'AI Safety Agent',
          text: initialGreeting,
          timestamp: new Date().toISOString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      transcript: `AI Voice Agent: "${initialGreeting}"`,
      detectedLanguage: preferredLanguage,
      payload: callPayload,
    };
  }

  async handleCallAnswered({ callId, providerCallId, timestamp }) {
    return {
      callId,
      providerCallId,
      status: 'IN_PROGRESS',
      answeredAt: timestamp || new Date().toISOString(),
    };
  }

  async handleDriverSpeech({ callId, speechText, confidence = 0.90, detectedLanguage = 'en' }) {
    return {
      agentResponse: 'Recorded. Staying connected for safety assessment.',
      shouldEndCall: false,
      detectedLanguage,
    };
  }

  async generateAgentResponse({ dialogueHistory, context, language = 'en' }) {
    return {
      text: 'Understood. I have recorded your status for the Brahmaputra Command Center.',
      shouldEndCall: dialogueHistory.length >= 4,
    };
  }

  async handleCallCompleted({ callId, transcript = '', durationSeconds = 45, rawOutcome = {} }) {
    const normalized = normalizeStructuredResult(rawOutcome);
    return {
      callId,
      status: 'COMPLETED',
      durationSeconds,
      ...normalized,
    };
  }

  async handleCallFailed({ callId, reason = 'FAILED', providerErrorCode = null }) {
    const outcome = reason === 'NO_ANSWER' ? 'NO_RESPONSE' : 'UNKNOWN';
    const normalized = normalizeStructuredResult({ outcome });
    return {
      callId,
      status: 'FAILED',
      reason,
      providerErrorCode,
      ...normalized,
    };
  }

  /**
   * Validates incoming telephony webhook HMAC signature.
   */
  validateWebhook({ headers = {}, rawBody = '', query = {} } = {}) {
    if (!this.webhookSecret) {
      return {
        valid: false,
        error: 'Webhook verification secret (VOICE_WEBHOOK_SECRET) is not configured on the backend.',
      };
    }

    const signature = headers['x-provider-signature'] || headers['x-twilio-signature'] || headers['x-retell-signature'];
    if (!signature) {
      return {
        valid: false,
        error: 'Missing webhook signature header.',
      };
    }

    try {
      const payloadString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payloadString)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      return {
        valid: isValid,
        error: isValid ? undefined : 'Invalid webhook HMAC signature.',
        event: typeof rawBody === 'object' ? rawBody : JSON.parse(rawBody),
      };
    } catch (err) {
      return {
        valid: false,
        error: `Webhook signature verification failed: ${err.message}`,
      };
    }
  }
}

export default RealVoiceProviderSkeleton;
