import React, { useState, useEffect } from 'react';
import { NER_CITIES } from '../../data/nerData';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';
import { IconShield, IconWarning, IconPin, IconClose, IconInfo } from '../common/AppIcons';
import InfoPopover from '../common/InfoPopover';

export default function UserReportIncidentModal({
  isOpen,
  initialContext = null,
  onClose,
  onSuccess,
}) {
  const { addIncident } = useApp();
  const [formData, setFormData] = useState({
    title: '',
    type: 'LANDSLIDE',
    severity: 'HIGH',
    cityId: 'GHY',
    corridorSection: '',
    description: '',
    laneBlockage: 'FULL',
    safetyImpact: 'High risk of transit delay; heavy freight cannot pass.',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialContext) {
      const matchedCity = NER_CITIES.find(
        (c) =>
          c.name.toLowerCase() === (initialContext.origin || '').toLowerCase() ||
          c.name.toLowerCase() === (initialContext.destination || '').toLowerCase()
      );

      setFormData((prev) => ({
        ...prev,
        cityId: matchedCity ? matchedCity.id : prev.cityId,
        corridorSection: initialContext.assignedCorridor || `${initialContext.origin || ''} → ${initialContext.destination || ''}`,
        description: initialContext.vehiclePlate
          ? `Vehicle ${initialContext.vehiclePlate} reporting corridor hazard on route ${initialContext.origin || ''} to ${initialContext.destination || ''}. `
          : '',
      }));
    }
  }, [initialContext, isOpen]);

  if (!isOpen) return null;

  const selectedCity = NER_CITIES.find((c) => c.id === formData.cityId) || NER_CITIES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const title =
      formData.title.trim() ||
      `${formData.type.replace(/_/g, ' ')} near ${selectedCity.name}${formData.corridorSection ? ` (${formData.corridorSection})` : ''}`;

    if (!formData.description.trim()) {
      setError('Please provide specific incident details or describe the affected carriageway.');
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
        corridorSection: formData.corridorSection || null,
        reportedAt: new Date().toISOString(),
        vehicleContext: initialContext
          ? {
              vehicleId: initialContext.vehicleId || null,
              deploymentId: initialContext.deploymentId || null,
              vehiclePlate: initialContext.vehiclePlate || null,
            }
          : null,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-200 my-auto text-left font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
              <IconWarning className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-[#0B1220] leading-tight">
                Report Road Hazard / Incident
              </h2>
              <p className="text-[11px] text-slate-500">
                Broadcast real-time road conditions to regional dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Pre-filled Context Callout */}
        {initialContext && (
          <div className="mb-3.5 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">
                {initialContext.vehiclePlate || initialContext.vehicleId}
              </span>
              <span className="truncate">
                Mission: <strong>{initialContext.origin} → {initialContext.destination}</strong>
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-blue-700 font-mono">Linked</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <IconWarning className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Incident Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Incident Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-hidden font-medium text-slate-800 cursor-pointer"
            >
              <option value="LANDSLIDE">Landslide / Boulder Collapse</option>
              <option value="FLOOD">Flash Flooding / Waterlogging</option>
              <option value="ROAD_BLOCKED">Corridor Blockage / Fallen Tree</option>
              <option value="BRIDGE_DAMAGE">Bridge Scour / Load Restriction</option>
              <option value="ACCIDENT">Vehicle Breakdown / Collision</option>
              <option value="WEATHER">Dense Fog / Zero Visibility</option>
            </select>
          </div>

          {/* Severity Selector Chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <span>Severity Level</span>
                <InfoPopover conceptKey="DISRUPTION_SEVERITY" iconSize="w-3 h-3" />
              </label>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {formData.severity}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'LOW', label: 'Low', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
                { id: 'MEDIUM', label: 'Medium', activeClass: 'bg-amber-500 text-white border-amber-500' },
                { id: 'HIGH', label: 'High', activeClass: 'bg-orange-600 text-white border-orange-600' },
                { id: 'CRITICAL', label: 'Critical', activeClass: 'bg-rose-600 text-white border-rose-600' },
              ].map((sev) => {
                const isSelected = formData.severity === sev.id;
                return (
                  <button
                    type="button"
                    key={sev.id}
                    onClick={() => setFormData({ ...formData, severity: sev.id })}
                    className={`py-2 px-1 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer touch-target ${
                      isSelected
                        ? `${sev.activeClass} shadow-xs`
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {sev.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Selection & Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Regional Hub / Node
              </label>
              <select
                value={formData.cityId}
                onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-hidden font-medium text-slate-800 cursor-pointer"
              >
                {NER_CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}, {c.state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Corridor / Highway Section
              </label>
              <input
                type="text"
                placeholder="e.g. NH-6 Sonapur Tunnel / NH-37"
                value={formData.corridorSection}
                onChange={(e) => setFormData({ ...formData, corridorSection: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-hidden font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Progressive Disclosure for HIGH / CRITICAL */}
          {(formData.severity === 'HIGH' || formData.severity === 'CRITICAL') && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs space-y-2 animate-fade-in">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <IconWarning className="w-4 h-4 text-amber-600" />
                <span>High Severity Advisory Protocol</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                This report will be highlighted to regional operations for urgent convoy rerouting. Ensure exact corridor bottleneck or obstruction details are provided below.
              </p>
            </div>
          )}

          {/* Incident Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Passability Details <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe the roadblock, lane status, mud depth, or obstacle..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:bg-white outline-hidden transition-all text-slate-800 resize-none"
            />
          </div>

          {/* Submit Action */}
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
                <span>Submit Verified Incident Report</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
