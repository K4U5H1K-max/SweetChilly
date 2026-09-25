import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export default function CorridorTelemetryLedger({
  onSelectVehicle,
  selectedVehicleId,
  onOpenAddVehicle,
  onEditVehicle,
  onOpenSafetyModal,
  onOpenDeployModal,
  onOpenDeploymentDetails,
  onOpenVehicleHistory,
}) {
  const {
    corridors,
    vehicles,
    weather,
    vehiclesLoading,
    vehiclesError,
    refreshVehicles,
    deployments,
    deploymentsLoading,
    deploymentsError,
    activeDeployments,
    deploymentHistory,
    completeDeployment,
    cancelDeployment,
  } = useApp();

  const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' | 'deployments' | 'history' | 'corridors'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionConfirm, setActionConfirm] = useState(null); // { type: 'COMPLETE' | 'CANCEL', depId: string } | null
  const [actionLoading, setActionLoading] = useState(false);

  // Filtered fleet list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const s = String(v.status || '').toUpperCase().replace(/\s+/g, '_');
      const isAvailable = v.deploymentStatus === 'AVAILABLE' || !v.hasActiveDeployment;
      const isDeployed = v.hasActiveDeployment || ['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'AVAILABLE' && isAvailable) ||
        (statusFilter === 'DEPLOYED' && isDeployed) ||
        (statusFilter === 'IN_TRANSIT' && s === 'IN_TRANSIT') ||
        (statusFilter === 'DELAYED' && s === 'DELAYED') ||
        (statusFilter === 'EMERGENCY' && (s === 'EMERGENCY' || v.priority === 'EMERGENCY_CRITICAL')) ||
        (statusFilter === 'FLAGGED' && (v.isFlagged || (v.safetyStatus && v.safetyStatus !== 'NOT_CHECKED' && v.safetyStatus !== 'SAFE')));

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.id.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        (v.cargo && v.cargo.toLowerCase().includes(q)) ||
        (v.origin && v.origin.toLowerCase().includes(q)) ||
        (v.destination && v.destination.toLowerCase().includes(q)) ||
        (v.driverName && v.driverName.toLowerCase().includes(q)) ||
        (v.safetyStatus && v.safetyStatus.toLowerCase().includes(q)) ||
        (v.regNumber && v.regNumber.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [vehicles, statusFilter, searchQuery]);

  // Filtered active deployments
  const filteredActiveDeployments = useMemo(() => {
    return activeDeployments.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        d.id.toLowerCase().includes(q) ||
        d.vehicleId.toLowerCase().includes(q) ||
        d.origin.toLowerCase().includes(q) ||
        d.destination.toLowerCase().includes(q) ||
        d.assignedCorridor.toLowerCase().includes(q) ||
        (d.cargo && d.cargo.toLowerCase().includes(q))
      );
    });
  }, [activeDeployments, searchQuery]);

  // Filtered history deployments
  const filteredHistoryDeployments = useMemo(() => {
    return deploymentHistory.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        d.id.toLowerCase().includes(q) ||
        d.vehicleId.toLowerCase().includes(q) ||
        d.origin.toLowerCase().includes(q) ||
        d.destination.toLowerCase().includes(q) ||
        d.assignedCorridor.toLowerCase().includes(q) ||
        (d.cargo && d.cargo.toLowerCase().includes(q)) ||
        d.status.toLowerCase().includes(q)
      );
    });
  }, [deploymentHistory, searchQuery]);

  function getSafetyBadge(status, isFlagged) {
    if (isFlagged && (!status || status === 'NOT_CHECKED' || status === 'PENDING_CALL')) {
      return 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse';
    }
    switch (status) {
      case 'SAFE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      case 'DELAYED':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
      case 'BREAKDOWN':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'ROAD_BLOCKED':
        return 'bg-orange-100 text-orange-900 border-orange-300 font-bold';
      case 'ASSISTANCE_REQUIRED':
        return 'bg-red-100 text-red-900 border-red-400 font-bold animate-pulse';
      case 'NO_RESPONSE':
        return 'bg-slate-200 text-slate-800 border-slate-400 font-semibold';
      case 'PENDING_CALL':
        return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
      case 'NOT_CHECKED':
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  }

  function getDeploymentStatusBadge(status) {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      case 'ACTIVE':
        return 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
      case 'DELAYED':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
      case 'PLANNED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-semibold';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  }

  const handleExecuteAction = async (actionType, depId) => {
    setActionLoading(true);
    try {
      if (actionType === 'COMPLETE') {
        await completeDeployment(depId);
      } else if (actionType === 'CANCEL') {
        await cancelDeployment(depId);
      }
      setActionConfirm(null);
    } catch (err) {
      console.error('Error updating deployment:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card flex flex-col font-sans w-full overflow-hidden">
      {/* ========================================================
          TOP HEADER: TITLE, DESKTOP ACTIONS, TAB STRIP
      ======================================================== */}
      <div className="border-b border-slate-100 bg-[#0B1220] text-white p-3.5 sm:p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse shrink-0"></span>
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-sm sm:text-base text-white tracking-tight leading-tight truncate">
                NER Arterial Highway Telemetry & Fleet Ledger
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                Real-time transport movements, cargo tracking, and vehicle status across 8 NE States
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenDeployModal && (
              <button
                onClick={() => onOpenDeployModal(null)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer touch-target sm:min-h-0"
              >
                <span>⚡</span>
                <span>Deploy Vehicle</span>
              </button>
            )}

            {onOpenAddVehicle && (
              <button
                onClick={onOpenAddVehicle}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer touch-target sm:min-h-0"
              >
                <span>+</span>
                <span>Register Vehicle</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Segmented Tab Strip */}
        <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex items-center gap-1 text-xs overflow-x-auto max-w-full pb-1 sm:pb-1">
          <button
            onClick={() => { setActiveTab('fleet'); setStatusFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer touch-target sm:min-h-0 shrink-0 ${
              activeTab === 'fleet'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Fleet Directory ({vehicles.length})
          </button>
          <button
            onClick={() => { setActiveTab('deployments'); setStatusFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer touch-target sm:min-h-0 shrink-0 ${
              activeTab === 'deployments'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Active Deployments ({activeDeployments.length})
          </button>
          <button
            onClick={() => { setActiveTab('history'); setStatusFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer touch-target sm:min-h-0 shrink-0 ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            History ({deploymentHistory.length})
          </button>
          <button
            onClick={() => { setActiveTab('corridors'); setStatusFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer touch-target sm:min-h-0 shrink-0 ${
              activeTab === 'corridors'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Corridors ({corridors.length})
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: FLEET DIRECTORY & ASSET AVAILABILITY
      ======================================================== */}
      {activeTab === 'fleet' && (
        <div className="flex flex-col w-full">
          {/* Sub-toolbar: Filters & Search */}
          <div className="border-b border-slate-200/80 bg-slate-50/70 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            {/* Filter Chips Horizontal Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
              <span className="text-slate-500 font-semibold text-xs mr-1 shrink-0">Filter:</span>
              {[
                { id: 'ALL', label: `All (${vehicles.length})` },
                { id: 'AVAILABLE', label: `Available (${vehicles.filter(v => v.deploymentStatus === 'AVAILABLE' || !v.hasActiveDeployment).length})` },
                { id: 'DEPLOYED', label: `Deployed (${vehicles.filter(v => v.hasActiveDeployment || ['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus)).length})` },
                { id: 'FLAGGED', label: `Safety Flagged (${vehicles.filter(v => v.isFlagged || (v.safetyStatus && v.safetyStatus !== 'NOT_CHECKED' && v.safetyStatus !== 'SAFE')).length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all font-semibold whitespace-nowrap cursor-pointer touch-target sm:min-h-0 shrink-0 ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Box - Full Width on Mobile */}
            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                placeholder="Search asset, cargo, driver, reg..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-0.5"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP VIEW: Fleet Multi-Column Table (Hidden on Mobile) */}
          <div className="hidden lg:block overflow-x-auto max-h-[540px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-semibold sticky top-0 z-10 backdrop-blur-xs">
                  <th className="py-2.5 px-4">Vehicle Asset</th>
                  <th className="py-2.5 px-4">Driver & Contact</th>
                  <th className="py-2.5 px-4">Type & Capacity</th>
                  <th className="py-2.5 px-4">Operational Status</th>
                  <th className="py-2.5 px-4">Active Route / Hub</th>
                  <th className="py-2.5 px-4">Safety Status (Track 4)</th>
                  <th className="py-2.5 px-4">Telemetry</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehiclesLoading && vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                        <span>Hydrating active fleet from persistent repository...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      {vehiclesError ? (
                        <div className="flex flex-col items-center justify-center gap-2 text-amber-700">
                          <span>Fleet synchronization warning: {vehiclesError}</span>
                          <button
                            onClick={() => refreshVehicles()}
                            className="px-3 py-1 text-xs bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Retry Sync
                          </button>
                        </div>
                      ) : (
                        'No vehicles match current filter criteria.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => {
                    const isSelected = selectedVehicleId === v.id;
                    const isAvailable = v.deploymentStatus === 'AVAILABLE' || !v.hasActiveDeployment;
                    const depStatus = v.deploymentStatus || (isAvailable ? 'AVAILABLE' : 'ACTIVE');

                    return (
                      <tr
                        key={v.id}
                        className={`transition-colors ${
                          v.isFlagged
                            ? 'bg-amber-50/40 border-l-4 border-l-amber-500'
                            : isSelected
                            ? 'bg-blue-50/60'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            {v.isFlagged && <span title={`Flagged: ${v.flagReason || 'Safety Check'}`} className="text-amber-600 text-xs">🚩</span>}
                            <div>
                              <span className="font-bold text-slate-900 block">{v.id}</span>
                              <span className="text-[11px] text-slate-500 font-normal">{v.name}</span>
                              {v.owner ? (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  Operator: {v.owner.fullName}
                                </span>
                              ) : (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  State Fleet
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{v.driverName || 'Operator'}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{v.regNumber}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {v.type} <span className="text-slate-400 text-[11px]">({v.capacity || '5T'})</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase border ${getDeploymentStatusBadge(depStatus)}`}>
                            {depStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {isAvailable ? (
                            <span className="text-slate-500 italic">Idle at {v.origin || 'Regional Base'}</span>
                          ) : (
                            <div>
                              <span className="font-semibold text-slate-900">{v.origin}</span> → <span className="font-semibold text-slate-900">{v.destination}</span>
                              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{v.cargo}</div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase border whitespace-nowrap ${getSafetyBadge(v.safetyStatus, v.isFlagged)}`}>
                              {(v.safetyStatus || 'NOT_CHECKED').replace('_', ' ')}
                            </span>
                            {v.isFlagged && v.flagReason && (
                              <span className="text-[10px] text-amber-800 font-medium truncate max-w-[130px]" title={v.flagReason}>
                                {v.flagReason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div className="text-slate-800 font-semibold">{v.speedKmH || 0} km/h</div>
                          {v.delayEstMinutes > 0 && (
                            <div className="text-[11px] text-rose-600 font-bold">+{v.delayEstMinutes}m delay</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isAvailable && onOpenDeployModal && (
                              <button
                                onClick={() => onOpenDeployModal(v.id)}
                                title="Deploy this Available Vehicle"
                                className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-0.5"
                              >
                                <span>⚡</span>
                                <span>Deploy</span>
                              </button>
                            )}

                            {onOpenVehicleHistory && (
                              <button
                                onClick={() => onOpenVehicleHistory(v.id)}
                                title="Inspect Chronological Journey History"
                                className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                              >
                                History
                              </button>
                            )}

                            <button
                              onClick={() => onOpenSafetyModal && onOpenSafetyModal(v.id)}
                              title="AI Voice Safety Check (Track 4)"
                              className={`px-2 py-1 rounded-md font-semibold text-xs transition-all shadow-2xs flex items-center gap-1 cursor-pointer ${
                                v.isFlagged
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold animate-pulse'
                                  : 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200'
                              }`}
                            >
                              <span>📞</span>
                              <span>Safety</span>
                            </button>

                            <button
                              onClick={() => onSelectVehicle && onSelectVehicle(v.id)}
                              title="Focus on GIS Map"
                              className="px-2 py-1 rounded-md bg-slate-900 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                            >
                              Track
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

          {/* MOBILE ONLY VIEW: Responsive Stacked Vehicle Cards (Visible on < lg) */}
          <div className="lg:hidden p-3 space-y-3">
            {filteredVehicles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl">
                No vehicles match current filter criteria.
              </div>
            ) : (
              filteredVehicles.map((v) => {
                const isAvailable = v.deploymentStatus === 'AVAILABLE' || !v.hasActiveDeployment;
                const depStatus = v.deploymentStatus || (isAvailable ? 'AVAILABLE' : 'ACTIVE');
                const isSelected = selectedVehicleId === v.id;

                return (
                  <div
                    key={v.id}
                    className={`bg-white rounded-2xl border p-4 shadow-card transition-all flex flex-col gap-3 ${
                      v.isFlagged
                        ? 'border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/20'
                        : isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/30'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* 1. Header Row: ID, Badges, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {v.id}
                        </span>
                        {v.owner ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Operator: {v.owner.fullName}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            State Fleet
                          </span>
                        )}
                        {v.isFlagged && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            🚩 Flagged
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border ${getDeploymentStatusBadge(depStatus)}`}>
                          {depStatus}
                        </span>
                      </div>
                    </div>

                    {/* 2. Vehicle Name / Title */}
                    <div>
                      <h4 className="font-heading font-bold text-sm text-slate-900 leading-snug">
                        {v.name}
                      </h4>
                    </div>

                    {/* 3. Structured Key-Value Details Grid */}
                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 text-xs space-y-2">
                      {/* Driver Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 text-[11px]">Driver & Contact:</span>
                        <div className="text-right min-w-0">
                          <span className="font-bold text-slate-900 block truncate">{v.driverName || 'Operator'}</span>
                          <span className="font-mono text-[11px] text-slate-500 block">{v.regNumber || 'No Reg'}</span>
                        </div>
                      </div>

                      {/* Vehicle Type & Capacity Row */}
                      <div className="flex items-center justify-between gap-2 border-t border-slate-200/50 pt-1.5">
                        <span className="text-slate-500 text-[11px]">Type & Capacity:</span>
                        <div className="text-right min-w-0">
                          <span className="font-semibold text-slate-800">{v.type}</span>
                          <span className="text-slate-500 text-[11px] font-mono ml-1">({v.capacity || '5 Ton'})</span>
                        </div>
                      </div>

                      {/* Route & Telemetry Row */}
                      <div className="flex items-center justify-between gap-2 border-t border-slate-200/50 pt-1.5">
                        <span className="text-slate-500 text-[11px]">Route / Base:</span>
                        <div className="text-right min-w-0">
                          {isAvailable ? (
                            <span className="text-slate-600 italic">Idle at {v.origin || 'Regional Base'}</span>
                          ) : (
                            <span className="font-bold text-slate-900">{v.origin} → {v.destination}</span>
                          )}
                          <span className="font-mono text-[11px] text-slate-500 block">
                            {v.speedKmH || 0} km/h {v.delayEstMinutes > 0 && <span className="text-rose-600 font-bold ml-1">+{v.delayEstMinutes}m delay</span>}
                          </span>
                        </div>
                      </div>

                      {/* Safety Status (Track 4) Row */}
                      <div className="flex items-center justify-between gap-2 border-t border-slate-200/50 pt-1.5">
                        <span className="text-slate-500 text-[11px]">Safety Status:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${getSafetyBadge(v.safetyStatus, v.isFlagged)}`}>
                          {(v.safetyStatus || 'NOT_CHECKED').replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* 4. Touch-Friendly Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      {isAvailable && onOpenDeployModal && (
                        <button
                          onClick={() => onOpenDeployModal(v.id)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer touch-target sm:min-h-0"
                        >
                          <span>⚡</span>
                          <span>Deploy</span>
                        </button>
                      )}

                      {onOpenVehicleHistory && (
                        <button
                          onClick={() => onOpenVehicleHistory(v.id)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer touch-target sm:min-h-0"
                        >
                          History
                        </button>
                      )}

                      <button
                        onClick={() => onOpenSafetyModal && onOpenSafetyModal(v.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-2xs flex items-center gap-1 cursor-pointer touch-target sm:min-h-0 ${
                          v.isFlagged
                            ? 'bg-amber-600 text-white animate-pulse'
                            : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        <span>📞</span>
                        <span>Safety</span>
                      </button>

                      <button
                        onClick={() => onSelectVehicle && onSelectVehicle(v.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer touch-target sm:min-h-0"
                      >
                        Track
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: ACTIVE DEPLOYMENTS
      ======================================================== */}
      {activeTab === 'deployments' && (
        <div className="flex flex-col w-full">
          {/* Sub-toolbar */}
          <div className="border-b border-slate-200/80 bg-slate-50/70 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs">
                Active Corridor Deployments ({activeDeployments.length})
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 text-[11px] hidden sm:inline">
                Enforced: 1 Active Deployment per Vehicle Asset
              </span>
            </div>

            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                placeholder="Search deployment, corridor, cargo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-0.5"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP VIEW: Table */}
          <div className="hidden lg:block overflow-x-auto max-h-[540px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-semibold sticky top-0 z-10 backdrop-blur-xs">
                  <th className="py-2.5 px-4">Deployment ID</th>
                  <th className="py-2.5 px-4">Vehicle Asset</th>
                  <th className="py-2.5 px-4">Trajectory</th>
                  <th className="py-2.5 px-4">Assigned Corridor</th>
                  <th className="py-2.5 px-4">Consignment Payload</th>
                  <th className="py-2.5 px-4">Started Time</th>
                  <th className="py-2.5 px-4">Status / Priority</th>
                  <th className="py-2.5 px-4 text-center">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deploymentsLoading && activeDeployments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                        <span>Hydrating deployments from PostgreSQL...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredActiveDeployments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      {deploymentsError ? (
                        <span className="text-amber-700">Deployment error: {deploymentsError}</span>
                      ) : (
                        'No vehicles are currently deployed on arterial corridors.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredActiveDeployments.map((d) => {
                    const linkedVeh = vehicles.find((v) => String(v.id).toLowerCase() === String(d.vehicleId).toLowerCase());
                    const isConfirming = actionConfirm && actionConfirm.depId === d.id;

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {d.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{d.vehicleId}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {linkedVeh?.name || 'Asset'} ({linkedVeh?.regNumber || 'No Reg'})
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <span>{d.origin}</span> → <span>{d.destination}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {d.assignedCorridor}
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          <div className="font-medium truncate max-w-[150px]" title={d.cargo}>
                            {d.cargo}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {d.startedAt ? new Date(d.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${getDeploymentStatusBadge(d.status)}`}>
                              {d.status}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">{d.priority}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isConfirming ? (
                            <div className="flex items-center justify-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                              <span className="text-[10px] font-bold text-slate-700">Confirm {actionConfirm.type}?</span>
                              <button
                                onClick={() => handleExecuteAction(actionConfirm.type, d.id)}
                                disabled={actionLoading}
                                className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded hover:bg-black cursor-pointer"
                              >
                                {actionLoading ? '...' : 'Yes'}
                              </button>
                              <button
                                onClick={() => setActionConfirm(null)}
                                className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] rounded hover:bg-slate-300 cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              {onOpenDeploymentDetails && (
                                <button
                                  onClick={() => onOpenDeploymentDetails(d.id)}
                                  title="Inspect Full Mission Manifest"
                                  className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                                >
                                  Inspect
                                </button>
                              )}

                              <button
                                onClick={() => setActionConfirm({ type: 'COMPLETE', depId: d.id })}
                                title="Conclude Mission (Frees Vehicle for New Trip)"
                                className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                              >
                                Complete
                              </button>

                              <button
                                onClick={() => setActionConfirm({ type: 'CANCEL', depId: d.id })}
                                title="Cancel Active Mission"
                                className="px-2 py-1 rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE ONLY VIEW: Active Deployment Stacked Cards */}
          <div className="lg:hidden p-3 space-y-3">
            {filteredActiveDeployments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl">
                No active journeys on corridors.
              </div>
            ) : (
              filteredActiveDeployments.map((d) => {
                const isConfirming = actionConfirm && actionConfirm.depId === d.id;
                return (
                  <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {d.vehicleId}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">{d.id}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mt-1">
                          {d.origin} → {d.destination}
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase shrink-0 ${getDeploymentStatusBadge(d.status)}`}>
                        {d.status}
                      </span>
                    </div>

                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Corridor:</span>
                        <strong className="text-slate-800">{d.assignedCorridor}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cargo:</span>
                        <strong className="text-slate-800">{d.cargo}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Priority:</span>
                        <span className="font-mono font-semibold text-slate-700">{d.priority}</span>
                      </div>
                    </div>

                    {isConfirming ? (
                      <div className="flex items-center justify-between gap-2 bg-slate-100 p-2.5 rounded-xl text-xs">
                        <span className="font-bold text-slate-800">Confirm {actionConfirm.type}?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleExecuteAction(actionConfirm.type, d.id)}
                            disabled={actionLoading}
                            className="px-3 py-1 bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer"
                          >
                            {actionLoading ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setActionConfirm(null)}
                            className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        {onOpenDeploymentDetails && (
                          <button
                            onClick={() => onOpenDeploymentDetails(d.id)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer touch-target sm:min-h-0"
                          >
                            Inspect
                          </button>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={() => setActionConfirm({ type: 'COMPLETE', depId: d.id })}
                            className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer touch-target sm:min-h-0"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => setActionConfirm({ type: 'CANCEL', depId: d.id })}
                            className="px-3 py-1.5 border border-rose-300 text-rose-700 font-semibold text-xs rounded-xl cursor-pointer touch-target sm:min-h-0"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: DEPLOYMENT HISTORY
      ======================================================== */}
      {activeTab === 'history' && (
        <div className="flex flex-col w-full">
          {/* Sub-toolbar */}
          <div className="border-b border-slate-200/80 bg-slate-50/70 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs">
                Permanent Deployment Journey History ({deploymentHistory.length})
              </span>
            </div>

            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                placeholder="Search history by ID, vehicle, route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-0.5"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP VIEW: Table */}
          <div className="hidden lg:block overflow-x-auto max-h-[540px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-semibold sticky top-0 z-10 backdrop-blur-xs">
                  <th className="py-2.5 px-4">Deployment ID</th>
                  <th className="py-2.5 px-4">Vehicle Unit</th>
                  <th className="py-2.5 px-4">Route Trajectory</th>
                  <th className="py-2.5 px-4">Corridor</th>
                  <th className="py-2.5 px-4">Cargo</th>
                  <th className="py-2.5 px-4">Started / Completed</th>
                  <th className="py-2.5 px-4">Final Outcome</th>
                  <th className="py-2.5 px-4 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistoryDeployments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      Completed and cancelled deployments will appear permanently here.
                    </td>
                  </tr>
                ) : (
                  filteredHistoryDeployments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {d.id}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {d.vehicleId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {d.origin} → {d.destination}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {d.assignedCorridor}
                      </td>
                      <td className="py-3 px-4 text-slate-700 truncate max-w-[140px]" title={d.cargo}>
                        {d.cargo}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        <div>Start: {d.startedAt ? new Date(d.startedAt).toLocaleDateString() : 'N/A'}</div>
                        <div>End: {d.completedAt ? new Date(d.completedAt).toLocaleDateString() : 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${getDeploymentStatusBadge(d.status)}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {onOpenDeploymentDetails && (
                          <button
                            onClick={() => onOpenDeploymentDetails(d.id)}
                            className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                          >
                            Details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE ONLY VIEW: History Stacked Cards */}
          <div className="lg:hidden p-3 space-y-3">
            {filteredHistoryDeployments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl">
                No past deployments on record.
              </div>
            ) : (
              filteredHistoryDeployments.map((d) => (
                <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {d.vehicleId}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">{d.id}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">
                        {d.origin} → {d.destination}
                      </h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase shrink-0 ${getDeploymentStatusBadge(d.status)}`}>
                      {d.status}
                    </span>
                  </div>

                  <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Corridor:</span>
                      <strong className="text-slate-800">{d.assignedCorridor}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cargo:</span>
                      <strong className="text-slate-800">{d.cargo}</strong>
                    </div>
                  </div>

                  {onOpenDeploymentDetails && (
                    <button
                      onClick={() => onOpenDeploymentDetails(d.id)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center touch-target sm:min-h-0"
                    >
                      Audit Journey Details
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: ARTERIAL HIGHWAY CORRIDORS & WEATHER
      ======================================================== */}
      {activeTab === 'corridors' && (
        <div className="flex flex-col w-full">
          {/* DESKTOP VIEW: Corridors Table */}
          <div className="hidden lg:block overflow-x-auto max-h-[540px]">
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

          {/* MOBILE ONLY VIEW: Corridors Stacked Cards */}
          <div className="lg:hidden p-3 space-y-3">
            {corridors.map((c) => {
              const isDisrupted = c.status === 'DISRUPTED';
              const isCaution = c.status === 'CAUTION';
              const corridorWeather = weather.find((w) => w.corridorId === c.id);

              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[11px] text-slate-400 font-bold">{c.id}</span>
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">{c.name}</h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border shrink-0 ${
                        isDisrupted
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isCaution
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  {c.disruptionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                      ⚠️ {c.disruptionReason}
                    </div>
                  )}

                  <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Route:</span>
                      <strong className="text-slate-800">{c.origin} → {c.destination}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Length & Transit:</span>
                      <span className="font-mono text-slate-700">{c.lengthKm} km (~{c.avgTransitHours}h)</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200/50 pt-1">
                      <span className="text-slate-500">Weather:</span>
                      <span className="font-semibold text-slate-700">
                        {corridorWeather ? `${corridorWeather.rainfallMm}mm rain, ${corridorWeather.condition}` : 'Nominal'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Integrated Bottom Summary Footer Strip */}
      <div className="border-t border-slate-100 bg-slate-50 p-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-1.5">
        <span>Registered fleet: <strong className="text-slate-700">{vehicles.length} assets</strong> ({vehicles.filter(v => v.deploymentStatus === 'AVAILABLE' || !v.hasActiveDeployment).length} available)</span>
        <span>Active deployments: <strong className="text-slate-700">{activeDeployments.length} ongoing journeys</strong></span>
      </div>
    </div>
  );
}
