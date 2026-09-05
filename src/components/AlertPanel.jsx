import React from 'react';
import { useApp } from '../context/AppContext';

export default function AlertPanel({ onSelectIncident, selectedIncidentId, onPlanBypass }) {
  const { alerts, incidents } = useApp();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col h-full overflow-hidden font-sans">
      {/* Panel Header */}
      <div className="border-b border-slate-100 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse"></span>
          <h3 className="font-heading font-bold text-xs text-white">
            Active disruptions
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-rose-600/90 text-white text-xs font-semibold">
          {alerts.length} active
        </span>
      </div>

      {/* Alert List Container */}
      <div className="p-3 flex-1 overflow-y-auto max-h-[520px] space-y-2.5">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No active disruptions logged. All corridors operating nominally.
          </div>
        ) : (
          alerts.map((alert) => {
            const isCritical = alert.level === 'CRITICAL';
            const isSelected = selectedIncidentId === alert.incidentId;

            return (
              <div
                key={alert.id}
                onClick={() => onSelectIncident && onSelectIncident(alert.incidentId)}
                className={`rounded-lg border p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 shadow-sm'
                    : isCritical
                    ? 'border-rose-200 hover:border-rose-300 bg-white hover:bg-rose-50/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                }`}
              >
                {/* Header Row: ID, District, Severity */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      {alert.id}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-medium text-slate-700">
                      {alert.district}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      isCritical
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {alert.level}
                  </span>
                </div>

                {/* Headline */}
                <h4 className="font-heading font-bold text-sm text-slate-900 leading-snug mb-1.5">
                  {alert.headline}
                </h4>

                {/* Impact Statement */}
                <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                  <span className="font-semibold text-slate-800">Impact:</span> {alert.impact}
                </p>

                {/* Advisory Callout */}
                <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200/80 text-xs text-slate-700 mb-2.5 leading-relaxed">
                  <span className="font-semibold text-rose-700">Advisory:</span> {alert.advisory}
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-medium">
                  <span className="text-slate-400 font-mono text-[11px]">Logged: {alert.activeSince}</span>
                  <div className="flex items-center gap-2">
                    {onPlanBypass && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlanBypass(alert);
                        }}
                        className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold transition-colors"
                      >
                        ⚡ Find bypass
                      </button>
                    )}
                    <button
                      onClick={() => onSelectIncident && onSelectIncident(alert.incidentId)}
                      className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>Locate on map</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Panel Bottom Feed Telemetry */}
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
        <span>Operational updates: NHAI, BRO & State Police</span>
        <span className="text-emerald-700 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          Live feed active
        </span>
      </div>
    </div>
  );
}
