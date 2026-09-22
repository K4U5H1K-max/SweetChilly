/**
 * Project Brahmaputra — Track 4 Voice Provider Factory
 *
 * Dynamically resolves and caches the active voice provider implementation
 * according to environment configuration (VOICE_PROVIDER=mock).
 */

import { MockVoiceProvider } from './mockVoiceProvider.js';
import { RealVoiceProviderSkeleton } from './realVoiceProviderSkeleton.js';
import { SarvamVoiceProvider } from './sarvamVoiceProvider.js';

const providerRegistry = new Map();

/**
 * Returns the singleton instance of the requested voice provider.
 * @param {string} [providerName] - 'mock' | 'sarvam' | 'real-skeleton' | 'twilio' | 'retell' | 'vapi'
 * @returns {BaseVoiceProvider}
 */
export function getVoiceProvider(providerName = process.env.VOICE_PROVIDER || 'mock') {
  const normalized = String(providerName).trim().toLowerCase();

  if (providerRegistry.has(normalized)) {
    return providerRegistry.get(normalized);
  }

  let providerInstance;

  switch (normalized) {
    case 'mock':
    case 'simulation':
      providerInstance = new MockVoiceProvider();
      break;

    case 'sarvam':
    case 'sarvam-ai':
      providerInstance = new SarvamVoiceProvider();
      break;

    case 'real-skeleton':
    case 'skeleton':
      providerInstance = new RealVoiceProviderSkeleton();
      break;

    case 'twilio':
    case 'retell':
    case 'vapi':
    case 'bland':
      // Template real provider ready for Phase 2B credential injection
      providerInstance = new RealVoiceProviderSkeleton({ provider: normalized });
      break;

    default:
      console.warn(`[VoiceProviderFactory] Unknown VOICE_PROVIDER '${providerName}'. Defaulting to 'mock'.`);
      providerInstance = new MockVoiceProvider();
      break;
  }

  providerRegistry.set(normalized, providerInstance);
  return providerInstance;
}

/**
 * Reset provider cache (useful for testing provider switching).
 */
export function resetVoiceProviderRegistry() {
  providerRegistry.clear();
}

export default getVoiceProvider;
