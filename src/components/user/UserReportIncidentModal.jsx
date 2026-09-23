import React, { useState } from 'react';
import { NER_CITIES } from '../../data/nerData';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function UserReportIncidentModal({ isOpen, onClose, onSuccess }) {
  const { addIncident } = useApp();
  const [formData, setFormData] = useState({
    title: '',
    type: 'LANDSLIDE',
    severity: 'HIGH',
    cityId: 'GHY',
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const selectedCity = NER_CITIES.find((c) => c.id === formData.cityId) || NER_CITIES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const title = formData.title.trim() || `${formData.type.replace('_', ' ')} near ${selectedCity.name}`;
    if (!formData.description.trim()) {
      setError('Please provide incident details or describe the affected section.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-7 animate-in fade-in zoom-in-95 duration-200 my-6">
        {/* Header matching Reference Screen 4 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Back"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h2 className="text-base sm:text-lg font-heading font-bold text-[#0B1220]">Report Incident</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Incident Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Incident Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] outline-hidden font-medium text-slate-800"
            >
              <option value="LANDSLIDE">Landslide / Mudslide</option>
              <option value="FLOOD">Flooding / Waterlogging</option>
              <option value="ROAD_BLOCKED">Severe Roadblock / Boulder Fall</option>
              <option value="BRIDGE_DAMAGE">Bridge Damage / Structural Failure</option>
              <option value="ACCIDENT">Accident / Vehicle Breakdown</option>
              <option value="WEATHER">Severe Weather / Heavy Fog</option>
            </select>
          </div>

          {/* Severity Selector Chips (Reference Screen 4) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Severity Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'LOW', label: 'Low', color: formData.severity === 'LOW' ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { id: 'MEDIUM', label: 'Moderate', color: formData.severity === 'MEDIUM' ? 'bg-[#F59E0B] text-white border-[#F59E0B]' : 'bg-amber-50 text-amber-700 border-amber-200' },
                { id: 'HIGH', label: 'High', color: formData.severity === 'HIGH' ? 'bg-[#EA580C] text-white border-[#EA580C]' : 'bg-orange-50 text-orange-700 border-orange-200' },
                { id: 'CRITICAL', label: 'Critical', color: formData.severity === 'CRITICAL' ? 'bg-[#DC2626] text-white border-[#DC2626]' : 'bg-rose-50 text-rose-700 border-rose-200' },
              ].map((sev) => (
                <button
                  type="button"
                  key={sev.id}
                  onClick={() => setFormData({ ...formData, severity: sev.id })}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer touch-target ${sev.color}`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location Selection & Coordinates */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Location / Regional Hub
            </label>
            <select
              value={formData.cityId}
              onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] outline-hidden font-medium text-slate-800"
            >
              {NER_CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.state} ({c.type})
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Coordinates: {selectedCity.lat.toFixed(4)}, {selectedCity.lng.toFixed(4)}</span>
            </div>
          </div>

          {/* Incident Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Corridor Impact
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe the situation, affected corridor, lane status..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:bg-white outline-hidden transition-all text-slate-800 resize-none"
            />
          </div>

          {/* Submit Action (Reference Screen 4) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#DC2626] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer touch-target"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Broadcasting Incident...</span>
                </>
              ) : (
                <span>Submit Incident</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
