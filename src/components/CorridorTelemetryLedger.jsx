import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export default function CorridorTelemetryLedger({
  onSelectVehicle,
  selectedVehicleId,
  onOpenAddVehicle,
  onEditVehicle,
}) {
  const { corridors, vehicles, weather } = useApp();
  const [activeTab, setActiveTab] = useState('fleet');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered fleet list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const s = String(v.status || '').toUpperCase().replace(/\s+/g, '_');
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'IN_TRANSIT' && s === 'IN_TRANSIT') ||
        (statusFilter === 'DELAYED' && s === 'DELAYED') ||
        (statusFilter === 'EMERGENCY' && (s === 'EMERGENCY' || v.priority === 'EMERGENCY_CRITICAL')) ||
        (statusFilter === 'AT_DESTINATION' && s === 'AT_DESTINATION');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.id.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        v.cargo.toLowerCase().includes(q) ||
        v.origin.toLowerCase().includes(q) ||
        v.destination.toLowerCase().includes(q) ||
        (v.regNumber && v.regNumber.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [vehicles, statusFilter, searchQuery]);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden font-sans" id="corridors">
      {/* Section Header & Tab Controls */}
      <div className="border-b border-slate-100 bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-xs text-slate-400 font-semibold">
              Fleet & corridor operations
            </span>
          </div>
          <h3 className="font-heading font-bold text-base text-white mt-0.5">
            Fleet movement manifest and corridor status
          </h3>
        </div>

        {/* Tab & Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'fleet' && onOpenAddVehicle && (
            <button
              onClick={onOpenAddVehicle}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
            >
              <span>+</span>
              <span>Deploy vehicle</span>
            </button>
          )}

          <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'fleet'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Active fleet ({vehicles.length})
            </button>
            <button
              onClick={() => setActiveTab('corridors')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'corridors'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Arterial corridors ({corridors.length})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: ACTIVE FLEET MANIFEST TABLE
      ======================================================== */}
      {activeTab === 'fleet' && (
        <div className="flex flex-col">
          {/* Sub-toolbar: Filters & Search */}
          <div className="border-b border-slate-200/80 bg-slate-50/70 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500 font-semibold text-xs mr-1">Status:</span>
              {[
                { id: 'ALL', label: `All (${vehicles.length})` },
                { id: 'IN_TRANSIT', label: 'In Transit' },
                { id: 'DELAYED', label: 'Delayed' },
                { id: 'EMERGENCY', label: 'Emergency' },
                { id: 'AT_DESTINATION', label: 'At Destination' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search vehicle, cargo, route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 rounded-md bg-white border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-slate-500 shadow-2xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 text-xs">
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-semibold sticky top-0 z-10 backdrop-blur-xs">
                  <th className="py-2.5 px-4">Vehicle ID</th>
                  <th className="py-2.5 px-4">Unit & driver</th>
                  <th className="py-2.5 px-4">Type & capacity</th>
                  <th className="py-2.5 px-4">Assigned cargo</th>
                  <th className="py-2.5 px-4">Route trajectory</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Telemetry</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      No vehicles match current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => {
                    const statusNormalized = String(v.status || 'IN_TRANSIT').toUpperCase().replace(/\s+/g, '_');
                    const isEmergency = v.priority === 'EMERGENCY_CRITICAL' || statusNormalized === 'EMERGENCY';
                    const isDelayed = statusNormalized === 'DELAYED';
                    const isAtDest = statusNormalized === 'AT_DESTINATION';
                    const isSelected = selectedVehicleId === v.id;

                    let statusBadge = 'bg-slate-100 text-slate-800 border-slate-200';
                    if (isEmergency) statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                    else if (isDelayed) statusBadge = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
                    else if (isAtDest) statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                    else if (statusNormalized === 'IN_TRANSIT') statusBadge = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';

                    return (
                      <tr
                        key={v.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {v.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{v.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {v.regNumber} • {v.driverName || 'Operator'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {v.type} <span className="text-slate-400 text-[11px]">({v.capacity || '5T'})</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {v.cargo}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-medium">{v.origin}</span> → <span className="font-medium">{v.destination}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border ${statusBadge}`}>
                            {statusNormalized.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div className="text-slate-800 font-semibold">{v.speedKmH || 0} km/h</div>
                          {v.delayEstMinutes > 0 && (
                            <div className="text-[11px] text-rose-600 font-bold">+{v.delayEstMinutes}m delay</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onSelectVehicle && onSelectVehicle(v.id)}
                              title="Focus & Track on GIS Map"
                              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                            >
                              Track
                            </button>
                            <button
                              onClick={() => onEditVehicle && onEditVehicle(v.id)}
                              title="Update Status / Telemetry"
                              className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
                            >
                              Update
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: ARTERIAL HIGHWAY CORRIDORS & WEATHER
      ======================================================== */}
      {activeTab === 'corridors' && (
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-semibold sticky top-0 z-10 backdrop-blur-xs">
                <th className="py-2.5 px-4">Corridor ID</th>
                <th className="py-2.5 px-4">Corridor name & road</th>
                <th className="py-2.5 px-4">Origin / Dest</th>
                <th className="py-2.5 px-4">Length</th>
                <th className="py-2.5 px-4">Transit time</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Delay overhead</th>
                <th className="py-2.5 px-4">Weather conditions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {corridors.map((c) => {
                const isDisrupted = c.status === 'DISRUPTED';
                const isCaution = c.status === 'CAUTION';
                const corridorWeather = weather.find((w) => w.corridorId === c.id);

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {c.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      {c.disruptionReason && (
                        <div className="text-xs text-rose-600 font-medium mt-0.5">
                          ⚠️ {c.disruptionReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {c.origin} → {c.destination}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {c.lengthKm} km
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      ~{c.avgTransitHours} hrs
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                          isDisrupted
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isCaution
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={isDisrupted ? 'text-rose-600' : isCaution ? 'text-amber-600' : 'text-slate-800'}>
                        +{c.delayMinutes} mins
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {corridorWeather ? (
                        <div>
                          <span className="font-semibold text-slate-800">{corridorWeather.rainfallMm}mm rain</span> • {corridorWeather.condition}
                        </div>
                      ) : (
                        'Nominal'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
        <span>Active fleet: {vehicles.length} units registered</span>
        <span>Corridors monitored: {corridors.length} arterials</span>
      </div>
    </div>
  );
}
