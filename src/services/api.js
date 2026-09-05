/**
 * Frontend API Service Layer
 * Reusable client communicating with the lightweight NER Logistics Intelligence backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
};

export default api;
