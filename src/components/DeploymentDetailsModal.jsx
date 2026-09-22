import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function DeploymentDetailsModal({
  isOpen,
  onClose,
  deploymentId,
  vehicleId,
  onDeploymentUpdated,
}) {
  const { vehicles, completeDeployment, cancelDeployment } = useApp();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'COMPLETE' | 'CANCEL' | null

  // Local data containers
  const [deploymentData, setDeploymentData] = useState(null);
  const [vehicleHistory, setVehicleHistory] = useState([]);

  // Find linked vehicle in context
  const linkedVehicle = useMemo(() => {
    const vId = vehicleId || deploymentData?.vehicleId;
    if (!vId) return null;
    return vehicles.find((v) => String(v.id).toLowerCase() === String(vId).toLowerCase()) || null;
  }, [vehicles, vehicleId, deploymentData?.vehicleId]);

  // Load deployment or vehicle history
  const loadData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setConfirmAction(null);

    try {
      if (deploymentId) {
        const res = await api.getDeploymentById(deploymentId);
        const dep = res?.data || res;
        setDeploymentData(dep);
      } else if (vehicleId) {
        const res = await api.getVehicleDeployments(vehicleId);
        const list = res?.data || (Array.isArray(res) ? res : []);
        setVehicleHistory(list);
      }
    } catch (err) {
      console.warn('[DeploymentDetailsModal] Data fetch error:', err.message);
      setErrorMessage(err.message || 'Failed to load deployment details.');
    } finally {
      setLoading(false);
    }
  }, [isOpen, deploymentId, vehicleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isOpen) return null;

  // Mask driver phone
  const getMaskedPhone = (phone) => {
    if (!phone) return 'Unassigned';
    const p = String(phone).trim();
    if (p.length >= 10) {
      return `${p.slice(0, 5)}XXXX${p.slice(-2)}`;
    }
    return p;
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
      case 'DELAYED':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      case 'PLANNED':
        return 'bg-slate-100 text-slate-700 border-slate-300 font-medium';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-semibold';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Priority badge styling
  const getPriorityBadge = (p) => {
    switch (p) {
      case 'EMERGENCY_CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'STANDARD':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const handleExecuteComplete = async (depId) => {
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await completeDeployment(depId);
      setSuccessMessage('Deployment completed successfully. Vehicle is now available for new dispatches.');
      setConfirmAction(null);
      if (onDeploymentUpdated) onDeploymentUpdated(res?.data || res);
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete deployment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteCancel = async (depId) => {
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await cancelDeployment(depId);
      setSuccessMessage('Deployment cancelled. Record preserved in journey history and vehicle is now available.');
      setConfirmAction(null);
      if (onDeploymentUpdated) onDeploymentUpdated(res?.data || res);
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to cancel deployment.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans my-6 animate-fadeIn">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-white tracking-tight">
                  {deploymentId ? 'Deployment Mission Manifest' : 'Vehicle Journey History'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {deploymentId ? (deploymentData?.id || 'DEPLOYMENT') : (linkedVehicle?.id || vehicleId)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {deploymentId
                  ? 'Authoritative journey telemetry, corridor assignment, and lifecycle controls'
                  : 'Complete historical and active journey log for this logistics asset'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Notices */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold">Notice:</span>
              <span>{errorMessage}</span>
            </div>
            <button type="button" onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-800 font-bold ml-2 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold">✓ Success:</span>
              <span>{successMessage}</span>
            </div>
            <button type="button" onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <span className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-xs font-semibold">Retrieving authoritative records...</span>
          </div>
        )}

        {/* Body Content */}
        {!loading && (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* ========================================================
                MODE A: SINGLE DEPLOYMENT MANIFEST VIEW
            ======================================================== */}
            {deploymentId && deploymentData && (
              <div className="space-y-6">
                {/* Top Status & Route Banner */}
                <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Arterial Transit Route
                    </span>
                    <div className="text-xl font-bold font-heading flex items-center gap-2 mt-0.5">
                      <span>{deploymentData.origin}</span>
                      <span className="text-blue-400 text-sm">➔</span>
                      <span>{deploymentData.destination}</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                      <span className="font-semibold text-blue-300">{deploymentData.assignedCorridor}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-3 py-1 rounded-full text-xs border ${getStatusBadge(deploymentData.status)}`}>
                      {deploymentData.status}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] border ${getPriorityBadge(deploymentData.priority)}`}>
                      {deploymentData.priority} Priority
                    </span>
                  </div>
                </div>

                {/* Grid of Key Manifest Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Vehicle Details */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                      Assigned Vehicle Asset
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Vehicle ID:</span>
                      <span className="font-mono font-bold text-slate-800">{deploymentData.vehicleId}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Asset Name:</span>
                      <span className="font-semibold text-slate-800">{linkedVehicle?.name || 'Logistics Asset'}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Registration:</span>
                      <span className="font-mono text-slate-700">{linkedVehicle?.regNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Type / Capacity:</span>
                      <span className="text-slate-700">{linkedVehicle?.type || 'Truck'} ({linkedVehicle?.capacity || '5T'})</span>
                    </div>
                  </div>

                  {/* Driver & Consignment Details */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                      Driver & Cargo Manifest
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Assigned Driver:</span>
                      <span className="font-semibold text-slate-800">{linkedVehicle?.driverName || 'Operator'}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Driver Contact:</span>
                      <span className="font-mono text-slate-700">{getMaskedPhone(linkedVehicle?.driverPhone)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Cargo Payload:</span>
                      <span className="font-semibold text-slate-800 truncate">{deploymentData.cargo}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Track 4 Safety State:</span>
                      <span className="font-bold text-slate-800">{linkedVehicle?.safetyStatus || 'NOT_CHECKED'}</span>
                    </div>
                  </div>
                </div>

                {/* Timestamps & Audit Information */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-2">
                    Authoritative Timestamps & Lifecycle Audit
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Created At</span>
                      <span className="font-mono text-slate-700">
                        {deploymentData.createdAt ? new Date(deploymentData.createdAt).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Started At</span>
                      <span className="font-mono text-slate-700">
                        {deploymentData.startedAt ? new Date(deploymentData.startedAt).toLocaleString() : 'Pending Start'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Completed / Cancelled At</span>
                      <span className="font-mono text-slate-700">
                        {deploymentData.completedAt ? new Date(deploymentData.completedAt).toLocaleString() : 'In Progress'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Record ID</span>
                      <span className="font-mono text-slate-700">{deploymentData.id}</span>
                    </div>
                  </div>
                </div>

                {/* Operational Action Strip */}
                {['ACTIVE', 'DELAYED', 'PLANNED'].includes(deploymentData.status) && (
                  <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Operational Actions</div>
                      <div className="text-[11px] text-slate-500">
                        Conclude or terminate this active journey to release the vehicle asset for future deployments
                      </div>
                    </div>

                    {confirmAction === null && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmAction('CANCEL')}
                          className="px-3.5 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cancel Deployment
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction('COMPLETE')}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>✓</span>
                          <span>Complete Deployment</span>
                        </button>
                      </div>
                    )}

                    {confirmAction === 'COMPLETE' && (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                        <span className="text-xs text-emerald-900 font-semibold">Confirm completion?</span>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleExecuteComplete(deploymentData.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded cursor-pointer"
                        >
                          {actionLoading ? 'Saving...' : 'Yes, Complete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction(null)}
                          className="px-2.5 py-1 bg-slate-200 text-slate-700 text-xs rounded hover:bg-slate-300 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {confirmAction === 'CANCEL' && (
                      <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                        <span className="text-xs text-rose-900 font-semibold">Confirm cancellation?</span>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleExecuteCancel(deploymentData.id)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-bold rounded cursor-pointer"
                        >
                          {actionLoading ? 'Saving...' : 'Yes, Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction(null)}
                          className="px-2.5 py-1 bg-slate-200 text-slate-700 text-xs rounded hover:bg-slate-300 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                MODE B: VEHICLE DEPLOYMENT JOURNEY HISTORY
            ======================================================== */}
            {vehicleId && (
              <div className="space-y-4">
                {/* Vehicle Asset Ribbon */}
                {linkedVehicle && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicle Unit</span>
                      <span className="font-mono font-bold text-slate-900">{linkedVehicle.id}</span>
                      <div className="text-slate-600 text-[11px] truncate">{linkedVehicle.name}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Registration</span>
                      <span className="font-mono text-slate-800">{linkedVehicle.regNumber || 'N/A'}</span>
                      <div className="text-slate-500 text-[11px]">{linkedVehicle.type}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Driver</span>
                      <span className="font-semibold text-slate-800">{linkedVehicle.driverName || 'Unassigned'}</span>
                      <div className="font-mono text-slate-500 text-[11px]">{getMaskedPhone(linkedVehicle.driverPhone)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Availability</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          linkedVehicle.deploymentStatus === 'AVAILABLE' || !linkedVehicle.hasActiveDeployment
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        {linkedVehicle.deploymentStatus || (linkedVehicle.hasActiveDeployment ? 'DEPLOYED' : 'AVAILABLE')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Timeline Header */}
                <div className="flex items-center justify-between pt-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Journey History ({vehicleHistory.length} Record{vehicleHistory.length !== 1 ? 's' : ''})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Chronological lifecycle record preserved in PostgreSQL
                  </span>
                </div>

                {/* Empty State */}
                {vehicleHistory.length === 0 && (
                  <div className="bg-slate-50 rounded-xl p-8 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    <p className="font-semibold">No journey history logged for this vehicle asset yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      When this vehicle is deployed on arterial corridors, complete trip logs will be permanently preserved here.
                    </p>
                  </div>
                )}

                {/* Journey History Cards */}
                {vehicleHistory.length > 0 && (
                  <div className="space-y-3">
                    {vehicleHistory.map((dep, idx) => {
                      const isActive = ['ACTIVE', 'DELAYED', 'PLANNED'].includes(dep.status);
                      return (
                        <div
                          key={dep.id}
                          className={`rounded-xl p-4 border transition-all ${
                            isActive
                              ? 'bg-blue-50/50 border-blue-200 shadow-xs'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800">{dep.id}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] border ${getStatusBadge(dep.status)}`}>
                                {dep.status}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getPriorityBadge(dep.priority)}`}>
                                {dep.priority}
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-500 font-mono">
                              {dep.startedAt ? new Date(dep.startedAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Route</span>
                              <span className="font-bold text-slate-900">
                                {dep.origin} ➔ {dep.destination}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Corridor</span>
                              <span className="text-slate-700 font-medium">{dep.assignedCorridor}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Consignment</span>
                              <span className="text-slate-700 font-medium truncate block">{dep.cargo}</span>
                            </div>
                          </div>

                          {/* Completed / Cancelled timestamp */}
                          {dep.completedAt && (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                              <span>Completed / Concluded:</span>
                              <span className="font-mono text-slate-600">{new Date(dep.completedAt).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
