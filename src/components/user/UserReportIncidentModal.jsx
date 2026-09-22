import React, { useState } from 'react';
import { NER_CITIES } from '../../data/nerData';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function UserReportIncidentModal({ isOpen, onClose, onSuccess }) {
  const { addIncident } = useApp();
  const [formData, setFormData] = useState({
    title: '',
    type: 'ROAD_BLOCKED',
    severity: 'MEDIUM',
    cityId: 'GHY',
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Please provide an incident summary title.');
      return;
    }
    if (!formData.description.trim()) {
      setError('Please provide incident details or location description.');
      return;
    }

    const selectedCity = NER_CITIES.find((c) => c.id === formData.cityId) || NER_CITIES[0];

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        incidentType: formData.type,
        severity: formData.severity,
        lat: selectedCity.lat,
        lng: selectedCity.lng,
        locationName: selectedCity.name,
        description: formData.description.trim(),
        reportedAt: new Date().toISOString(),
      };

      const res = await api.createIncident(payload);
      if (res && res.success !== false) {
        if (addIncident) addIncident(res.data || payload);
        if (onSuccess) onSuccess(res.data || payload);
        onClose();
      } else {
        throw new Error(res?.message || 'Failed to submit incident report.');
      }
    } catch (err) {
      setError(err.message || 'Error submitting report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-slate-900">Report Corridor Disruption</h2>
              <p className="text-xs text-slate-500">Submit field logistics obstacle, flood alert, or road hazard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Incident Summary <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Flash Flood Mudslide on NH-6"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Disruption Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="ROAD_BLOCKED">Road Blocked / Landslide</option>
                <option value="FLOOD_ALERT">Flash Flood Waterlogging</option>
                <option value="BRIDGE_DAMAGE">Bridge / Culvert Damage</option>
                <option value="HEAVY_CONGESTION">Severe Transit Chokepoint</option>
                <option value="WEATHER_HAZARD">Dense Fog / Heavy Rain</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Severity Level</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="LOW">Low (Minor Delay)</option>
                <option value="MEDIUM">Medium (Caution Required)</option>
                <option value="HIGH">High (Major Detour Needed)</option>
                <option value="CRITICAL">Critical (Complete Blockade)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nearest Hub / District Location</label>
            <select
              value={formData.cityId}
              onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              {NER_CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Incident Details & Observations <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe road conditions, estimated clearance delay, or recommended detour..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              )}
              <span>{loading ? 'Submitting...' : 'Submit Incident Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
