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
import { maskPhone, validateAndNormalizePhone } from '../securityGuardrails.js';

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

    const configuredVersion = config.agentVersion !== undefined ? config.agentVersion : process.env.SARVAM_AGENT_VERSION;
    this.agentVersion = parseAndValidateAgentVersion(
      configuredVersion !== undefined && configuredVersion !== null ? configuredVersion : 1
    );

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

    const allowlistEnv = config.allowedTestNumbers !== undefined && config.allowedTestNumbers !== null
      ? config.allowedTestNumbers
      : (process.env.SARVAM_ALLOWED_TEST_NUMBERS || '');
    const rawAllowlist = typeof allowlistEnv === 'string'
      ? allowlistEnv.split(',').map((n) => n.trim()).filter(Boolean)
      : (Array.isArray(allowlistEnv) ? allowlistEnv : []);

    // Store normalized E.164 phone numbers for strict exact authorization comparison
    this.allowedTestNumbers = rawAllowlist
      .map((num) => {
        const norm = validateAndNormalizePhone(String(num));
        return norm.valid ? norm.phone : String(num).replace(/[- ]/g, '');
      })
      .filter(Boolean);

    // Allowlist enforcement switch: default is true when absent/unspecified (safe default)
    const enforceAllowlistEnv = process.env.ENFORCE_SARVAM_CALL_ALLOWLIST;
    if (config.enforceAllowlist !== undefined) {
      this.enforceAllowlist = Boolean(config.enforceAllowlist);
    } else if (enforceAllowlistEnv !== undefined && enforceAllowlistEnv !== null && enforceAllowlistEnv !== '') {
      this.enforceAllowlist = String(enforceAllowlistEnv).toLowerCase().trim() !== 'false';
    } else {
      this.enforceAllowlist = true;
    }
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

    if (!Number.isInteger(this.agentVersion) || this.agentVersion <= 0) {
      throw new Error(`[SarvamVoiceProvider] Invalid SARVAM_AGENT_VERSION. Expected a positive integer.`);
    }
  }

  /**
   * Validates if a target phone number is permitted to be called.
   * - When ENFORCE_SARVAM_CALL_ALLOWLIST=false, allowlist check is skipped and dynamic driverPhone is permitted.
   * - When ENFORCE_SARVAM_CALL_ALLOWLIST=true (default), destination must exist in SARVAM_ALLOWED_TEST_NUMBERS.
   * - Fail-safe: If ENFORCE_SARVAM_CALL_ALLOWLIST=true and SARVAM_ALLOWED_TEST_NUMBERS is missing/empty, call is rejected.
   * - Performs strict exact matching against normalized complete E.164 phone numbers (no permissive suffix matching).
   *
   * @param {string} phoneNumber
   * @returns {{ allowed: boolean, reason?: string }}
   */
  checkPhoneAllowlist(phoneNumber) {
    if (!this.enforceAllowlist) {
      return { allowed: true };
    }

    if (!this.allowedTestNumbers || this.allowedTestNumbers.length === 0) {
      return {
        allowed: false,
        reason: 'Sarvam call allowlist enforcement is enabled but SARVAM_ALLOWED_TEST_NUMBERS is empty.',
      };
    }

    const normTarget = validateAndNormalizePhone(phoneNumber);
    const targetToCompare = normTarget.valid ? normTarget.phone : String(phoneNumber || '').trim();

    const isAllowed = this.allowedTestNumbers.some((allowed) => allowed === targetToCompare);

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

    const appVersion = parseAndValidateAgentVersion(this.agentVersion);

    const payload = {
      app_config: {
        app_id: this.agentId || 'brahmaputra_safety_agent',
        app_version: appVersion,
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

    const targetPhone = vehicle.driverPhone;
    if (!targetPhone) {
      throw new Error('[SarvamVoiceProvider] Vehicle record has no registered driverPhone.');
    }

    // Validate destination phone number format
    const phoneValidation = validateAndNormalizePhone(targetPhone);
    if (!phoneValidation.valid) {
      throw new Error(`[SarvamVoiceProvider] Invalid vehicle driverPhone: ${phoneValidation.error}`);
    }

    // Check allowlist (enforced by default, or skipped when ENFORCE_SARVAM_CALL_ALLOWLIST=false)
    const allowlistCheck = this.checkPhoneAllowlist(phoneValidation.phone || targetPhone);
    if (!allowlistCheck.allowed) {
      throw new Error(`[SarvamVoiceProvider] Telephony guardrail blocked: ${allowlistCheck.reason}`);
    }

    const outboundPayload = this.buildOutboundPayload({ session, vehicle, flagReason });

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

    // Safely extract endpoint path without secrets or query parameters
    let endpointPath = endpointUrl;
    try {
      const parsedUrl = new URL(endpointUrl);
      endpointPath = parsedUrl.pathname;
    } catch {
      endpointPath = endpointUrl;
    }

    // Safely extract webhook URL host/path
    let webhookHostPath = outboundPayload.webhook_config?.url || 'N/A';
    try {
      const parsedWh = new URL(outboundPayload.webhook_config?.url);
      webhookHostPath = `${parsedWh.host}${parsedWh.pathname}`;
    } catch {
      webhookHostPath = outboundPayload.webhook_config?.url || 'N/A';
    }

    // DEBUG-SAFE summary of outbound payload structure (keys & masked data only)
    const safeDispatchSummary = {
      endpoint_path: endpointPath,
      app_id: outboundPayload.app_config?.app_id || 'N/A',
      app_version: outboundPayload.app_config?.app_version || 'N/A',
      connection_id: outboundPayload.app_config?.connection_config?.connection_id || 'N/A',
      agent_phone_number: maskPhone(outboundPayload.app_config?.connection_config?.agent_phone_number),
      user_phone_number: maskPhone(outboundPayload.user_config?.user_phone_number),
      agent_variable_keys: Object.keys(outboundPayload.app_config?.agent_variables || {}),
      webhook_url_host_path: webhookHostPath,
      metadata_keys: Object.keys(outboundPayload.webhook_config?.metadata || {}),
    };

    console.log('[SarvamVoiceProvider] Outbound request dispatch summary:\n' + JSON.stringify(safeDispatchSummary, null, 2));

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

    let rawResponseText = '';
    try {
      rawResponseText = await response.text();
    } catch (readErr) {
      rawResponseText = '';
    }

    let parsedResponseBody = null;
    try {
      parsedResponseBody = rawResponseText ? JSON.parse(rawResponseText) : null;
    } catch {
      parsedResponseBody = null;
    }

    if (!response.ok) {
      let rawDiagnostic = '';
      if (parsedResponseBody !== null) {
        rawDiagnostic = typeof parsedResponseBody === 'string'
          ? parsedResponseBody
          : JSON.stringify(parsedResponseBody);
      } else if (rawResponseText) {
        rawDiagnostic = rawResponseText;
      } else {
        rawDiagnostic = response.statusText || 'Unknown Sarvam Error';
      }

      const sanitizedBody = sanitizeDiagnosticText(rawDiagnostic, this.apiKey);
      const statusInfo = response.statusText ? `${response.status} (${response.statusText})` : `${response.status}`;
      const errorMessage = `[SarvamVoiceProvider] Sarvam API error\nStatus: ${statusInfo}\nBody: ${sanitizedBody}`;

      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    const responseBody = parsedResponseBody || {};

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

/**
 * Safely sanitizes diagnostic error messages, JSON strings, and logs:
 * - Redacts active API keys and bearer tokens
 * - Masks any embedded phone numbers (Indian & International E.164)
 * - Prevents raw credential or PII leakage
 *
 * @param {string|object} rawText
 * @param {string} [secretKey]
 * @returns {string}
 */
export function sanitizeDiagnosticText(rawText, secretKey = null) {
  if (rawText === null || rawText === undefined) return '';
  let text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);

  // 1. Redact specific API key if supplied
  if (secretKey && typeof secretKey === 'string' && secretKey.trim().length >= 4) {
    const escapedSecret = secretKey.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escapedSecret, 'g'), '[REDACTED_SECRET]');
  }

  // Also check process.env.SARVAM_API_KEY if defined
  if (process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY.trim().length >= 4) {
    const escapedEnvSecret = process.env.SARVAM_API_KEY.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escapedEnvSecret, 'g'), '[REDACTED_SECRET]');
  }

  // 2. Redact generic API keys / Authorization header tokens
  text = text.replace(/(?:x-api-key|api[-_]?key|authorization|bearer)[\s:="']+([a-zA-Z0-9_\-\.]{8,})/gi, (match, token) => {
    return match.replace(token, '[REDACTED_SECRET]');
  });

  // 3. Mask phone numbers (Indian mobile + international E.164 formats)
  // Matches +91-98640-12345, +919864012345, 9864012345, +14155552671, etc.
  text = text.replace(/(?:\+91[\-\s]?)?[6-9]\d{2}[\-\s]?\d{2}[\-\s]?\d{5}\b/g, (match) => maskPhone(match));
  text = text.replace(/\+[1-9]\d{1,2}[\-\s]?\d{3,4}[\-\s]?\d{4,6}\b/g, (match) => maskPhone(match));

  return text;
}

/**
 * Validates and converts an agent version value into a strict positive integer.
 * Rejects floats ("1.0", 1.5), prefixed strings ("v1"), zero, negative integers, NaN, etc.
 *
 * @param {string|number} rawVersion
 * @returns {number}
 */
export function parseAndValidateAgentVersion(rawVersion) {
  if (rawVersion === null || rawVersion === undefined || rawVersion === '') {
    return 1;
  }

  if (typeof rawVersion === 'number') {
    if (Number.isInteger(rawVersion) && rawVersion > 0) {
      return rawVersion;
    }
    throw new Error(`[SarvamVoiceProvider] Invalid SARVAM_AGENT_VERSION '${rawVersion}'. Expected a positive integer.`);
  }

  if (typeof rawVersion === 'string') {
    const trimmed = rawVersion.trim();
    if (!trimmed) {
      return 1;
    }
    // Strict integer regex: only positive integer digits (1, 2, 3, etc.), no decimals, no 'v' prefix
    if (!/^\d+$/.test(trimmed)) {
      throw new Error(`[SarvamVoiceProvider] Invalid SARVAM_AGENT_VERSION '${rawVersion}'. Expected a positive integer.`);
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`[SarvamVoiceProvider] Invalid SARVAM_AGENT_VERSION '${rawVersion}'. Expected a positive integer.`);
    }

    return parsed;
  }

  throw new Error(`[SarvamVoiceProvider] Invalid SARVAM_AGENT_VERSION. Expected a positive integer.`);
}

export default SarvamVoiceProvider;


