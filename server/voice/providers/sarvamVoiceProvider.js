/**
 * Project Brahmaputra — Track 4 Sarvam Voice Agent Provider Adapter
 *
 * Implements the official Sarvam AI Instant Outbound Agent Telephony API integration.
 * Conforms to the BaseVoiceProvider abstract interface contract.
 *
 * Enforces strict security guardrails:
 * - Safe dry-run mode (SARVAM_LIVE_CALLS_ENABLED=false) to prevent accidental telephony charges
 * - Phone number allowlist protection (SARVAM_ALLOWED_TEST_NUMBERS)
 * - Zero API key logging or client-side leakage
 * - Bi-directional call ID correlation (Internal Call ID <-> Sarvam Outbound Job ID)
 */

import { BaseVoiceProvider } from './baseProvider.js';
import { normalizeStructuredResult, classifyFromBooleans } from '../safetyClassifier.js';
import { maskPhone } from '../securityGuardrails.js';

export class SarvamVoiceProvider extends BaseVoiceProvider {
  /**
   * @param {object} [config]
   */
  constructor(config = {}) {
    super('sarvam', config);

    this.apiKey = process.env.SARVAM_API_KEY || config.apiKey || null;
    this.orgId = process.env.SARVAM_ORG_ID || config.orgId || null;
    this.workspaceId = process.env.SARVAM_WORKSPACE_ID || config.workspaceId || null;
    this.agentId = process.env.SARVAM_AGENT_ID || config.agentId || null;
    this.agentVersion = process.env.SARVAM_AGENT_VERSION || config.agentVersion || '1.0';
    this.connectionId = process.env.SARVAM_CONNECTION_ID || config.connectionId || null;
    this.agentPhoneNumber = process.env.SARVAM_AGENT_PHONE_NUMBER || config.agentPhoneNumber || null;
    this.webhookUrl =
      process.env.SARVAM_WEBHOOK_URL ||
      config.webhookUrl ||
      `${process.env.PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/voice/webhooks/status`;

    // Safety guardrails: dry-run default and allowlist
    const liveEnv = process.env.SARVAM_LIVE_CALLS_ENABLED;
    this.liveCallsEnabled = config.liveCallsEnabled !== undefined
      ? Boolean(config.liveCallsEnabled)
      : (liveEnv === 'true' || liveEnv === true);

    const allowlistEnv = process.env.SARVAM_ALLOWED_TEST_NUMBERS || config.allowedTestNumbers || '';
    this.allowedTestNumbers = typeof allowlistEnv === 'string'
      ? allowlistEnv.split(',').map((n) => n.trim().replace(/[- ]/g, '')).filter(Boolean)
      : (Array.isArray(allowlistEnv) ? allowlistEnv : []);
  }

  /**
   * Constructs the official Sarvam Instant Outbound API endpoint URL.
   * @returns {string}
   */
  getEndpointUrl() {
    const org = this.orgId || '{org_id}';
    const ws = this.workspaceId || '{workspace_id}';
    return `https://apps.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(org)}/workspaces/${encodeURIComponent(ws)}/outbounds`;
  }

  /**
   * Asserts that required Sarvam credentials & identifiers are set before a live call.
   */
  assertConfigured() {
    const missing = [];
    if (!this.apiKey) missing.push('SARVAM_API_KEY');
    if (!this.orgId) missing.push('SARVAM_ORG_ID');
    if (!this.workspaceId) missing.push('SARVAM_WORKSPACE_ID');
    if (!this.agentId) missing.push('SARVAM_AGENT_ID');

    if (missing.length > 0) {
      throw new Error(
        `[SarvamVoiceProvider] Missing required Sarvam configuration: ${missing.join(', ')}. ` +
        `Please set environment variables or use VOICE_PROVIDER=mock for local simulation.`
      );
    }
  }

  /**
   * Validates if a target phone number is permitted to be called in staging/dev.
   * @param {string} phoneNumber
   * @returns {{ allowed: boolean, reason?: string }}
   */
  checkPhoneAllowlist(phoneNumber) {
    if (!this.allowedTestNumbers || this.allowedTestNumbers.length === 0) {
      // If no explicit allowlist is configured, all numbers allowed when live calls enabled
      return { allowed: true };
    }

    const cleanTarget = String(phoneNumber || '').replace(/[- ]/g, '');
    const isAllowed = this.allowedTestNumbers.some((allowed) => {
      const cleanAllowed = String(allowed).replace(/[- ]/g, '');
      return cleanTarget === cleanAllowed || cleanTarget.endsWith(cleanAllowed) || cleanAllowed.endsWith(cleanTarget);
    });

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Destination phone number ${maskPhone(phoneNumber)} is not in SARVAM_ALLOWED_TEST_NUMBERS allowlist.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Builds the official Sarvam Instant Outbound request body.
   * @param {object} params
   * @param {object} params.session - VoiceSafetyCallSession
   * @param {object} params.vehicle - Vehicle record
   * @param {string} [params.flagReason]
   * @returns {object}
   */
  buildOutboundPayload({ session, vehicle, flagReason = null }) {
    const toPhoneNumber = vehicle.driverPhone || '+919864012345';
    const reasonText = flagReason || vehicle.flagReason || 'Vehicle safety audit requested by Brahmaputra Command Center';

    const agentVariables = {
      driver_name: vehicle.driverName || 'Driver',
      vehicle_id: vehicle.id,
      flag_reason: reasonText,
    };

    if (vehicle.driverGender) {
      agentVariables.gender = vehicle.driverGender;
    }

    const payload = {
      app_config: {
        app_id: this.agentId || 'brahmaputra_safety_agent',
        app_version: this.agentVersion || '1.0',
        app_type: 'agent',
        connection_config: {
          connection_id: this.connectionId || 'default_connection',
          agent_phone_number: this.agentPhoneNumber || '+919999999999',
        },
        agent_variables: agentVariables,
      },
      user_config: {
        user_phone_number: toPhoneNumber,
      },
      webhook_config: {
        url: this.webhookUrl,
        metadata: {
          vehicle_id: vehicle.id,
          internal_call_id: session.callId,
        },
      },
    };

    return payload;
  }

  /**
   * Initiates an outbound safety check call via Sarvam Instant Outbound API.
   * In dry-run mode (SARVAM_LIVE_CALLS_ENABLED=false), safely returns a queued payload
   * without making any external network requests.
   *
   * @param {object} params
   * @param {object} params.session
   * @param {object} params.vehicle
   * @param {string} [params.flagReason]
   * @param {string} [params.preferredLanguage='en']
   * @returns {Promise<object>}
   */
  async initiateCall({ session, vehicle, flagReason = null, preferredLanguage = 'en' }) {
    if (!vehicle) {
      throw new Error('[SarvamVoiceProvider] Vehicle record is required to initiate call.');
    }

    const outboundPayload = this.buildOutboundPayload({ session, vehicle, flagReason });
    const targetPhone = vehicle.driverPhone;

    // Check allowlist
    const allowlistCheck = this.checkPhoneAllowlist(targetPhone);
    if (!allowlistCheck.allowed) {
      throw new Error(`[SarvamVoiceProvider] Telephony guardrail blocked: ${allowlistCheck.reason}`);
    }

    // DRY-RUN SAFETY MODE
    if (!this.liveCallsEnabled) {
      const dryRunProviderCallId = `SARVAM-DRYRUN-${Date.now()}`;
      return {
        status: 'QUEUED',
        callStatus: 'QUEUED',
        providerCallId: dryRunProviderCallId,
        provider: 'sarvam',
        isDryRun: true,
        endpoint: this.getEndpointUrl(),
        payload: outboundPayload,
        dialogueHistory: [
          {
            role: 'system',
            speaker: 'Sarvam Instant Outbound',
            text: `[DRY-RUN MODE] Outbound call prepared for ${maskPhone(targetPhone)}. No live phone call initiated.`,
            timestamp: new Date().toISOString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
        transcript: `[Sarvam Dry-Run Outbound Prepared] Target: ${maskPhone(targetPhone)} | Internal Call ID: ${session.callId}`,
        detectedLanguage: preferredLanguage,
      };
    }

    // LIVE OUTBOUND MODE
    this.assertConfigured();

    const endpointUrl = this.getEndpointUrl();

    let response;
    try {
      response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(outboundPayload),
      });
    } catch (networkErr) {
      throw new Error(`[SarvamVoiceProvider] Network request failed when reaching Sarvam API: ${networkErr.message}`);
    }

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = responseBody?.message || responseBody?.error || `HTTP ${response.status} ${response.statusText}`;
      throw new Error(`[SarvamVoiceProvider] Sarvam API returned error: ${errorMsg}`);
    }

    const providerCallId =
      responseBody.job_id ||
      responseBody.outbound_id ||
      responseBody.interaction_id ||
      responseBody.id ||
      `SARVAM-${Date.now()}`;

    return {
      status: 'CALL_INITIATED',
      callStatus: 'CALL_INITIATED',
      providerCallId,
      provider: 'sarvam',
      isDryRun: false,
      sarvamResponse: responseBody,
      dialogueHistory: [
        {
          role: 'system',
          speaker: 'Sarvam Instant Outbound',
          text: `Outbound call dispatched via Sarvam Agent. Job ID: ${providerCallId}`,
          timestamp: new Date().toISOString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      transcript: `[Sarvam Outbound Dispatched] Job ID: ${providerCallId}`,
      detectedLanguage: preferredLanguage,
    };
  }

  /**
   * Handles call answered callback.
   */
  async handleCallAnswered({ callId, providerCallId, timestamp }) {
    return {
      callId,
      providerCallId,
      status: 'IN_PROGRESS',
      answeredAt: timestamp || new Date().toISOString(),
    };
  }

  /**
   * Handles driver speech event.
   */
  async handleDriverSpeech({ callId, speechText, confidence = 0.90, detectedLanguage = 'hi' }) {
    return {
      callId,
      agentResponse: 'Recorded.',
      shouldEndCall: false,
      detectedLanguage,
    };
  }

  /**
   * Generates next agent response (managed natively by Sarvam LLM agent).
   */
  async generateAgentResponse({ dialogueHistory = [], context = {}, language = 'hi' }) {
    return {
      text: 'Sarvam Agent handles conversation turns dynamically.',
      shouldEndCall: false,
    };
  }

  /**
   * Normalizes Sarvam completed call payload into the Brahmaputra 5-tuple schema.
   *
   * Handles:
   * - Structured boolean variables (driver_safe, vehicle_operational, road_passable, assistance_required)
   * - Sarvam post-call summary & transcripts
   * - Graceful handling when Sarvam Call Goal is "not_evaluated"
   */
  async handleCallCompleted({
    callId,
    providerCallId,
    transcript = '',
    summary = '',
    durationSeconds = 0,
    rawOutcome = {},
    variables = {},
  }) {
    // Merge structured variables from payload if present
    const combinedVars = {
      ...variables,
      ...rawOutcome,
    };

    const structuredResult = classifyFromBooleans({
      driverSafe: combinedVars.driver_safe ?? combinedVars.driverSafe,
      vehicleOperational: combinedVars.vehicle_operational ?? combinedVars.vehicleOperational,
      roadPassable: combinedVars.road_passable ?? combinedVars.roadPassable,
      assistanceRequired: combinedVars.assistance_required ?? combinedVars.assistanceRequired,
      transcript: transcript || combinedVars.transcript,
      summary: summary || combinedVars.call_summary || combinedVars.summary,
      rawOutcome: combinedVars,
    });

    return {
      callId,
      providerCallId,
      status: 'COMPLETED',
      durationSeconds,
      transcript: transcript || structuredResult.summary,
      summary: structuredResult.summary,
      ...structuredResult,
    };
  }

  /**
   * Handles failed, busy, or unanswered call attempts.
   */
  async handleCallFailed({ callId, providerCallId, reason = 'FAILED', providerErrorCode = null }) {
    const outcome = reason === 'NO_ANSWER' ? 'NO_RESPONSE' : 'UNKNOWN';
    const normalized = normalizeStructuredResult({ outcome });

    return {
      callId,
      providerCallId,
      status: 'FAILED',
      reason,
      providerErrorCode,
      ...normalized,
    };
  }

  /**
   * Validates incoming provider webhooks and extracts correlated identifiers.
   * Isolate webhook verification cleanly.
   *
   * @param {object} params
   * @param {object} params.headers
   * @param {string|object} params.rawBody
   * @param {object} [params.query]
   * @returns {{ valid: boolean, error?: string, event?: object }}
   */
  validateWebhook({ headers = {}, rawBody = {}, query = {} } = {}) {
    let body = rawBody;
    if (typeof rawBody === 'string') {
      try {
        body = JSON.parse(rawBody);
      } catch (err) {
        return {
          valid: false,
          error: `Invalid JSON body in Sarvam webhook: ${err.message}`,
        };
      }
    }

    if (!body || typeof body !== 'object') {
      return {
        valid: false,
        error: 'Empty or invalid webhook body.',
      };
    }

    // Optional webhook verification token / secret check if configured
    const secret = process.env.SARVAM_WEBHOOK_SECRET || process.env.VOICE_WEBHOOK_SECRET;
    if (secret) {
      const providedSecret =
        headers['x-sarvam-secret'] ||
        headers['x-webhook-secret'] ||
        headers['x-provider-signature'] ||
        query?.secret;

      if (!providedSecret || providedSecret !== secret) {
        return {
          valid: false,
          error: 'Unauthorized Sarvam webhook: secret token mismatch.',
        };
      }
    }

    // Extract correlated IDs: metadata.internal_call_id, job_id, interaction_id, etc.
    const metadata = body.metadata || body.webhook_config?.metadata || {};
    const internalCallId = metadata.internal_call_id || body.callId || body.internal_call_id;
    const providerCallId = body.job_id || body.interaction_id || body.outbound_id || body.providerCallId || body.id;
    const vehicleId = metadata.vehicle_id || body.vehicle_id || body.vehicleId;

    // Extract status and normalization data
    let status = body.status || body.event || body.call_status;
    if (status) {
      const s = String(status).toUpperCase();
      if (['SUCCESS', 'COMPLETED', 'ENDED', 'CALL_COMPLETED'].includes(s)) status = 'COMPLETED';
      else if (['RINGING', 'CALL_RINGING'].includes(s)) status = 'RINGING';
      else if (['IN_PROGRESS', 'ANSWERED', 'CONNECTED', 'CALL_ANSWERED'].includes(s)) status = 'ANSWERED';
      else if (['FAILED', 'ERROR', 'CALL_FAILED'].includes(s)) status = 'FAILED';
      else if (['BUSY', 'USER_BUSY'].includes(s)) status = 'BUSY';
      else if (['NO_ANSWER', 'UNANSWERED', 'TIMEOUT'].includes(s)) status = 'NO_ANSWER';
    }

    const event = {
      ...body,
      callId: internalCallId,
      providerCallId,
      vehicleId,
      status: status || body.status,
      transcript: body.transcript || body.conversation_transcript || body.call_summary,
      summary: body.call_summary || body.summary,
      variables: body.variables || body.agent_variables || body.structured_data || {},
    };

    return {
      valid: true,
      event,
    };
  }
}

export default SarvamVoiceProvider;
