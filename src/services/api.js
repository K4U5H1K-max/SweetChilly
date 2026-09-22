/**
 * Frontend API Service Layer
 * Reusable client communicating with the lightweight NER Logistics Intelligence backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : (import.meta.env.DEV ? 'http://localhost:5000' : '');

let currentAuthToken = null;

// Initialize token from localStorage if in browser environment
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    currentAuthToken = localStorage.getItem('ner_auth_token') || null;
  } catch (e) {
    // Ignore localStorage access restrictions
  }
}

export function setAuthToken(token) {
  currentAuthToken = token || null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (token) {
        localStorage.setItem('ner_auth_token', token);
      } else {
        localStorage.removeItem('ner_auth_token');
      }
    } catch (e) {
      // Ignore localStorage access restrictions
    }
  }
}

export function getAuthToken() {
  return currentAuthToken;
}

export function clearAuthToken() {
  setAuthToken(null);
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(currentAuthToken ? { 'Authorization': `Bearer ${currentAuthToken}` } : {}),
    ...options.headers,
  };

  const timeoutMs = options.timeout || 45000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const config = {
    ...options,
    headers,
    signal: options.signal || controller.signal,
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${endpoint} timed out after ${timeoutMs / 1000}s. Please check network connectivity and try again.`);
    }
    console.warn(`[API Client] Error on ${endpoint}:`, error.message);
    throw error;
  }
}

export const api = {
  /**
   * Verified backend health check
   */
  async healthCheck() {
    return request('/api/health');
  },

  /**
   * Fetch list of active incidents
   */
  async getIncidents() {
    return request('/api/incidents');
  },

  /**
   * Report a new incident (manual)
   */
  async createIncident(incidentData) {
    return request('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(incidentData),
    });
  },

  /**
   * AI/Vision multimodal incident verification via Groq
   * @param {FormData} formData - Multipart form containing image, incidentType, severity, lat, lng, description
   */
  async verifyIncident(formData) {
    return request('/api/incidents/verify', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Alias for verifyIncident
   */
  async createAndVerifyIncident(formData) {
    return this.verifyIncident(formData);
  },

  /**
   * Fetch active verified alerts
   */
  async getAlerts() {
    return request('/api/alerts');
  },

  /**
   * Fetch fleet vehicle manifests
   */
  async getVehicles() {
    return request('/api/vehicles');
  },

  /**
   * Register a new vehicle
   */
  async addVehicle(vehicleData) {
    return request('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData),
    });
  },

  /**
   * Alias for addVehicle
   */
  async createVehicle(vehicleData) {
    return this.addVehicle(vehicleData);
  },

  /**
   * Update existing vehicle status, coordinates, or telemetry
   */
  async updateVehicle(vehicleId, updates) {
    return request(`/api/vehicles/${encodeURIComponent(vehicleId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Decommission a vehicle
   */
  async deleteVehicle(vehicleId) {
    return request(`/api/vehicles/${encodeURIComponent(vehicleId)}`, {
      method: 'DELETE',
    });
  },

  // ==========================================
  // Vehicle Deployment / Trip Management
  // ==========================================

  /**
   * Fetch all deployments (optionally filtered by status / vehicleId)
   * @param {{ status?: string, vehicleId?: string }} [params]
   */
  async getDeployments(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.vehicleId) query.set('vehicleId', params.vehicleId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/deployments${qs}`);
  },

  /**
   * Fetch a single deployment by ID
   * @param {string} deploymentId
   */
  async getDeploymentById(deploymentId) {
    return request(`/api/deployments/${encodeURIComponent(deploymentId)}`);
  },

  /**
   * Fetch all deployments for a specific vehicle
   * @param {string} vehicleId
   * @param {{ status?: string }} [params]
   */
  async getVehicleDeployments(vehicleId, params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/vehicles/${encodeURIComponent(vehicleId)}/deployments${qs}`);
  },

  /**
   * Create a new vehicle deployment
   * @param {{ vehicleId: string, origin: string, destination: string, assignedCorridor?: string, cargo?: string, priority?: string, status?: string }} data
   */
  async createDeployment(data) {
    return request('/api/deployments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Start a planned deployment
   * @param {string} deploymentId
   */
  async startDeployment(deploymentId) {
    return request(`/api/deployments/${encodeURIComponent(deploymentId)}/start`, {
      method: 'POST',
    });
  },

  /**
   * Complete an active/delayed deployment
   * @param {string} deploymentId
   */
  async completeDeployment(deploymentId) {
    return request(`/api/deployments/${encodeURIComponent(deploymentId)}/complete`, {
      method: 'POST',
    });
  },

  /**
   * Cancel a deployment
   * @param {string} deploymentId
   */
  async cancelDeployment(deploymentId) {
    return request(`/api/deployments/${encodeURIComponent(deploymentId)}/cancel`, {
      method: 'POST',
    });
  },

  /**
   * Request Groq-powered disruption-aware route plan
   */
  async planRoute(routeParams) {
    return request('/api/routes/plan', {
      method: 'POST',
      body: JSON.stringify(routeParams),
    });
  },

  /**
   * Fetch aggregated dashboard KPIs
   */
  async getKPIs() {
    return request('/api/kpis');
  },

  /**
   * Fetch corridor weather telemetry
   */
  async getWeather() {
    return request('/api/weather');
  },

  // ==========================================
  // Track 4: Driver Safety & Voice AI Client
  // ==========================================

  /**
   * Flag or unflag a vehicle for safety check
   * @param {{ vehicleId: string, reason: string, flagged?: boolean }} data
   */
  async flagVehicle(data) {
    return request('/api/voice/flag-vehicle', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Trigger a voice safety check session
   * @param {{ vehicleId: string, triggerSource?: string, flagReason?: string, simulatedOutcome?: string, customResponse?: string }} data
   */
  async triggerSafetyCall(data) {
    return request('/api/voice/calls/trigger', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * List all safety call sessions (optionally filtered by vehicleId)
   * @param {string} [vehicleId]
   */
  async getSafetyCalls(vehicleId) {
    const query = vehicleId ? `?vehicleId=${encodeURIComponent(vehicleId)}` : '';
    return request(`/api/voice/calls${query}`);
  },

  /**
   * Get single safety call session by callId
   * @param {string} callId
   */
  async getSafetyCall(callId) {
    return request(`/api/voice/calls/${encodeURIComponent(callId)}`);
  },

  /**
   * Resolve an operator escalation for a call session
   * @param {string} callId
   * @param {string} [notes]
   */
  async resolveSafetyCall(callId, notes) {
    return request(`/api/voice/calls/${encodeURIComponent(callId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  /**
   * Dev simulation helper for quick outcome verification
   * @param {{ vehicleId: string, simulatedOutcome?: string, flagReason?: string }} data
   */
  async simulateSafetyCall(data) {
    return request('/api/voice/simulate-call', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get Voice Provider runtime configuration (provider type, live calls state)
   */
  async getVoiceConfig() {
    return request('/api/voice/config');
  },

  // ==========================================
  // Authentication & Identity Management
  // ==========================================

  setAuthToken,
  getAuthToken,
  clearAuthToken,

  /**
   * Register a new user account (strictly USER role)
   * @param {{ fullName: string, email: string, password: string }} userData
   */
  async register(userData) {
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (res?.token) {
      setAuthToken(res.token);
    }
    return res;
  },

  /**
   * Authenticate user / admin with email and password
   * @param {{ email: string, password: string }} credentials
   */
  async login(credentials) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res?.token) {
      setAuthToken(res.token);
    }
    return res;
  },

  /**
   * Retrieve current authenticated user profile
   */
  async getCurrentUser() {
    return request('/api/auth/me');
  },

  /**
   * Terminate authenticated session
   */
  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      clearAuthToken();
    }
    return { success: true };
  },
};

export default api;
