import React from 'react';
import { useApp } from '../context/AppContext';
import { formatIST } from '../utils/timeFormat';
import { IconWarning, IconRoute, IconMap, IconPin } from './common/AppIcons';
import InfoPopover from './common/InfoPopover';

export default function AlertPanel({
  onSelectIncident,
  selectedIncidentId,
  onPlanBypass,
  className = '',
  maxHeightClass = '',
}) {
  const { alerts, incidents } = useApp();

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-card flex flex-col h-full overflow-hidden font-sans ${className}`}>
      {/* Panel Header */}
      <div className="border-b border-slate-100 bg-[#0B1220] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse"></span>
          <h3 className="font-heading font-bold text-xs text-white">
            Verified Disruption Advisories
          </h3>
          <InfoPopover conceptKey="DISRUPTION_SEVERITY" iconSize="w-3.5 h-3.5" />
        </div>
        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold font-mono">
          {alerts.length} Active
        </span>
      </div>

      {/* Alert List Container - Fluidly scrollable inside container */}
      <div className={`p-3 flex-1 min-h-0 overflow-y-auto space-y-2.5 ${maxHeightClass}`}>
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <IconWarning className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-700">No active disruptions logged</p>
            <p className="text-[11px] text-slate-500 mt-0.5">All monitored corridors operating nominally.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isCritical = alert.level === 'CRITICAL';
            const isSelected = selectedIncidentId === alert.incidentId;

            return (
              <div
                key={alert.id}
                onClick={() => onSelectIncident && onSelectIncident(alert.incidentId)}
                className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
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
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                      {alert.id}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-semibold text-slate-700">
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
                <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 leading-snug mb-1.5">
                  {alert.headline}
                </h4>

                {/* Impact Statement */}
                <p className="text-xs text-slate-600 leading-relaxed mb-2">
                  <span className="font-bold text-slate-800">Impact:</span> {alert.impact}
                </p>

                {/* Advisory Callout */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 mb-2.5 leading-relaxed">
                  <span className="font-bold text-rose-700">Advisory:</span> {alert.advisory}
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-medium">
                  <span className="text-slate-400 font-mono text-[11px] truncate">
                    {alert.activeSince || 'Live'}
                  </span>
                  <div className="flex items-center gap-2">
                    {onPlanBypass && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlanBypass(alert);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <IconRoute className="w-3 h-3 text-blue-600" />
                        <span>Find Bypass</span>
                      </button>
                    )}
                    <button
                      onClick={() => onSelectIncident && onSelectIncident(alert.incidentId)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Locate</span>
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
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <span>Verified feeds: NHAI, BRO & State Police</span>
        <span className="text-emerald-700 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          Connected
        </span>
      </div>
    </div>
  );
}
