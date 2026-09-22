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
      console.warn('[CorridorTelemetryLedger] Action failed:', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden font-sans" id="corridors">
      {/* Section Header & Tab Controls */}
      <div className="border-b border-slate-100 bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Fleet & Corridor Command Center
            </span>
          </div>
          <h3 className="font-heading font-bold text-base text-white mt-0.5">
            Logistics Asset Manifest, Active Deployments & Corridor Telemetry
          </h3>
        </div>

        {/* Tab & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenDeployModal && (
            <button
              onClick={() => onOpenDeployModal(null)}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>⚡</span>
              <span>Deploy Vehicle</span>
            </button>
          )}

          {onOpenAddVehicle && (
            <button
              onClick={onOpenAddVehicle}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <span>+</span>
              <span>Register Vehicle</span>
            </button>
          )}

          <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex items-center gap-1 text-xs">
            <button
              onClick={() => { setActiveTab('fleet'); setStatusFilter('ALL'); }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeTab === 'fleet'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Fleet Directory ({vehicles.length})
            </button>
            <button
              onClick={() => { setActiveTab('deployments'); setStatusFilter('ALL'); }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeTab === 'deployments'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Active Deployments ({activeDeployments.length})
            </button>
            <button
              onClick={() => { setActiveTab('history'); setStatusFilter('ALL'); }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              History ({deploymentHistory.length})
            </button>
            <button
              onClick={() => { setActiveTab('corridors'); setStatusFilter('ALL'); }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeTab === 'corridors'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Corridors ({corridors.length})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: FLEET DIRECTORY & ASSET AVAILABILITY
      ======================================================== */}
      {activeTab === 'fleet' && (
        <div className="flex flex-col">
          {/* Sub-toolbar: Filters & Search */}
          <div className="border-b border-slate-200/80 bg-slate-50/70 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500 font-semibold text-xs mr-1">Filter:</span>
              {[
                { id: 'ALL', label: `All (${vehicles.length})` },
                { id: 'AVAILABLE', label: `Available (${vehicles.filter(v => v.deploymentStatus === 'AVAILABLE' || !v.hasActiveDeployment).length})` },
                { id: 'DEPLOYED', label: `Deployed (${vehicles.filter(v => v.hasActiveDeployment || ['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus)).length})` },
                { id: 'FLAGGED', label: `Safety Flagged (${vehicles.filter(v => v.isFlagged || (v.safetyStatus && v.safetyStatus !== 'NOT_CHECKED' && v.safetyStatus !== 'SAFE')).length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
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
                placeholder="Search asset, cargo, driver, reg..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 rounded-md bg-white border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-slate-500 shadow-2xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer">
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
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
        </div>
      )}

      {/* ========================================================
          TAB 2: ACTIVE DEPLOYMENTS TABLE
      ======================================================== */}
      {activeTab === 'deployments' && (
        <div className="flex flex-col">
          {/* Sub-toolbar */}
          <div className="border-b border-slate-200/80 bg-slate-50/70 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs">
                Active Corridor Deployments ({activeDeployments.length})
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 text-[11px]">
                Enforced: 1 Active Deployment per Vehicle Asset
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search active deployment, corridor, cargo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 rounded-md bg-white border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-slate-500 shadow-2xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer">
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
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
        </div>
      )}

      {/* ========================================================
          TAB 3: DEPLOYMENT HISTORY TABLE
      ======================================================== */}
      {activeTab === 'history' && (
        <div className="flex flex-col">
          {/* Sub-toolbar */}
          <div className="border-b border-slate-200/80 bg-slate-50/70 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs">
                Permanent Deployment Journey History ({deploymentHistory.length})
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 text-[11px]">
                Preserved historical record across vehicle lifecycles
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search history by ID, vehicle, route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 rounded-md bg-white border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-slate-500 shadow-2xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer">
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
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
        </div>
      )}

      {/* ========================================================
          TAB 4: ARTERIAL HIGHWAY CORRIDORS & WEATHER
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
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <span>Registered fleet: {vehicles.length} assets ({vehicles.filter(v => v.deploymentStatus === 'AVAILABLE' || !v.hasActiveDeployment).length} available)</span>
        <span>Active deployments: {activeDeployments.length} ongoing journeys</span>
      </div>
    </div>
  );
}
