import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-900 text-slate-300 border-t border-slate-800 pt-10 pb-8 font-sans">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 4-Column Ledger */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
          {/* Col 1: Identity */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                NER
              </div>
              <span className="font-heading font-bold text-white text-base tracking-tight">
                Operations Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-Powered Smart Logistics and Accessibility Intelligence Platform for the North Eastern Region of India. Real-time GIS disruption monitoring and emergency relief corridor coordination.
            </p>
            <div className="text-xs text-amber-400 font-medium">
              Operation Reference: NER-LOG-2026
            </div>
          </div>

          {/* Col 2: Datum Specification */}
          <div className="space-y-3 text-xs">
            <div className="font-heading font-semibold text-white tracking-wide text-xs border-b border-slate-800 pb-1.5">
              GIS specifications
            </div>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li className="flex justify-between items-center">
                <span>Spatial datum:</span>
                <span className="text-slate-200 font-medium font-mono text-[11px]">WGS-84 / EPSG-4326</span>
              </li>
              <li className="flex justify-between items-center">
                <span>Map tiles:</span>
                <span className="text-slate-200 font-medium">OpenStreetMap & Mappls</span>
              </li>
              <li className="flex justify-between items-center">
                <span>Telemetry ingest:</span>
                <span className="text-emerald-400 font-medium">Live streaming active</span>
              </li>
              <li className="flex justify-between items-center">
                <span>States tracked:</span>
                <span className="text-slate-200 font-medium">8 NE States (16 Hubs)</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Corridor Index */}
          <div className="space-y-3 text-xs">
            <div className="font-heading font-semibold text-white tracking-wide text-xs border-b border-slate-800 pb-1.5">
              Corridor network
            </div>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li className="flex justify-between items-center">
                <span>Monitored arterials:</span>
                <span className="text-slate-200 font-medium">8 National Highways</span>
              </li>
              <li className="flex justify-between items-center">
                <span>Active bottlenecks:</span>
                <span className="text-rose-400 font-semibold">2 Critical (NH-6, NH-37)</span>
              </li>
              <li className="flex justify-between items-center">
                <span>Fleet in transit:</span>
                <span className="text-blue-400 font-medium">Active transit units</span>
              </li>
              <li className="flex justify-between items-center">
                <span>Dispatch mode:</span>
                <span className="text-emerald-400 font-medium">Disruption-aware</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Citations & Ledger */}
          <div className="space-y-3 text-xs">
            <div className="font-heading font-semibold text-white tracking-wide text-xs border-b border-slate-800 pb-1.5">
              Operational protocols
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              All corridor closures and landslide alerts undergo multi-agency validation. Incident coordinates are harmonized across NHAI, State Police, and Border Roads Organisation (BRO) field detachments.
            </p>
          </div>
        </div>

        {/* Sub-footer Coordinate Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>© 2026 North Eastern Region Logistics Command</span>
            <span className="text-slate-600">•</span>
            <span>Ministry of DoNER</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px]">Gateway: 26°08'N 91°44'E (GHY)</span>
            <span className="text-emerald-400 font-semibold">Status: Live feed</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
