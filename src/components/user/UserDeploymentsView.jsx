import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import UserDeployModal from './UserDeployModal';
import UserDeploymentDetailsModal from './UserDeploymentDetailsModal';
import UserReportIncidentModal from './UserReportIncidentModal';
import StatusChip from '../common/StatusChip';

export default function UserDeploymentsView({ onOpenDeployModal }) {
  const {
    activeDeployments,
    deploymentHistory,
    deploymentsLoading,
    deploymentsError,
    completeDeployment,
    cancelDeployment,
    availableVehicles,
  } = useApp();

  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'HISTORY'
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const handleComplete = async (dep) => {
    setActionError(null);
    setActionSuccess(null);
    setActionLoadingId(dep.id);
    try {
      const res = await completeDeployment(dep.id);
      if (res && res.success !== false) {
        setActionSuccess(`Journey for vehicle ${dep.vehiclePlate || dep.vehicleId} marked as COMPLETED.`);
      } else {
        throw new Error(res?.message || 'Failed to complete deployment.');
      }
    } catch (err) {
      setActionError(err.message || 'Error completing journey.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (dep) => {
    if (!window.confirm(`Are you sure you want to cancel the journey for ${dep.vehiclePlate || dep.vehicleId}?`)) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setActionLoadingId(dep.id);
    try {
      const res = await cancelDeployment(dep.id);
      if (res && res.success !== false) {
        setActionSuccess(`Journey for vehicle ${dep.vehiclePlate || dep.vehicleId} has been CANCELLED.`);
      } else {
        throw new Error(res?.message || 'Failed to cancel deployment.');
      }
    } catch (err) {
      setActionError(err.message || 'Error cancelling journey.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-heading font-bold text-[#0B1220]">Operator Transport Missions</h2>
            <p className="text-[11px] text-slate-500">Live corridor journeys, delivery confirmations, and mission logs</p>
          </div>

          <button
            onClick={() => (onOpenDeployModal ? onOpenDeployModal() : setDeployModalOpen(true))}
            disabled={availableVehicles.length === 0}
            className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 touch-target"
          >
            <span>⚡</span>
            <span>Dispatch Journey ({availableVehicles.length} Ready)</span>
          </button>
        </div>

        {/* Segmented Tab Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all touch-target sm:min-h-0 sm:min-w-0 ${
              activeTab === 'ACTIVE'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active Journeys ({activeDeployments.length})
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all touch-target sm:min-h-0 sm:min-w-0 ${
              activeTab === 'HISTORY'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Past Mission History ({deploymentHistory.length})
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold text-rose-700 ml-2">✕</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-emerald-700 ml-2">✕</button>
        </div>
      )}

      {/* ==================== ACTIVE JOURNEYS (Driver Mode - Reference Screen 7) ==================== */}
      {activeTab === 'ACTIVE' && (
        <div>
          {deploymentsLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-xs font-semibold">Loading active journeys...</span>
            </div>
          ) : activeDeployments.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Active Missions In Transit</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                {availableVehicles.length > 0
                  ? `You have ${availableVehicles.length} vehicle(s) ready at depot for corridor dispatch.`
                  : 'Enrol a vehicle to start assigning transport missions.'}
              </p>
              {availableVehicles.length > 0 && (
                <button
                  onClick={() => (onOpenDeployModal ? onOpenDeployModal() : setDeployModalOpen(true))}
                  className="px-4 py-2 bg-[#2563EB] text-white font-semibold text-xs rounded-lg shadow-xs hover:bg-blue-700"
                >
                  ⚡ Dispatch First Journey
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {activeDeployments.map((d) => (
                <div
                  key={d.id}
                  className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all space-y-3"
                >
                  {/* Top Vehicle & Cargo Row (Reference Screen 7) */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <div className="truncate">
                        <span className="text-[11px] font-medium text-slate-500 block">Active Transport Mission</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#0B1220]">
                            {d.vehiclePlate || d.vehicleId}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-semibold text-slate-700 truncate">{d.cargo}</span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          Corridor: {d.assignedCorridor || 'Direct Arterial'}
                        </p>
                      </div>
                    </div>

                    <StatusChip variant="info" size="md">
                      {d.status || 'ACTIVE'}
                    </StatusChip>
                  </div>

                  {/* Next Destination Highlight Card (Reference Screen 7) */}
                  <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider block">
                      Next Destination
                    </span>
                    <div className="text-base sm:text-lg font-bold font-heading text-[#0B1220] mt-0.5">
                      {d.destination}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <span>→</span>
                        <span>{d.origin} to {d.destination}</span>
                      </span>
                    </div>
                  </div>

                  {/* Primary Touch Action Buttons (Reference Screen 7) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => handleComplete(d)}
                      disabled={actionLoadingId === d.id}
                      className="py-2.5 px-3 bg-[#16A34A] hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 touch-target cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Complete Mission</span>
                    </button>

                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="py-2.5 px-3 bg-[#F59E0B] hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 touch-target cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Report Road Issue</span>
                    </button>

                    <button
                      onClick={() => setSelectedDeployment(d)}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 touch-target cursor-pointer"
                    >
                      <span>Details & Log →</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== PAST MISSIONS HISTORY ==================== */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-3">
          {deploymentHistory.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
              No historical missions completed yet.
            </div>
          ) : (
            deploymentHistory.map((d) => (
              <div
                key={d.id}
                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0B1220]">
                      {d.vehiclePlate || d.vehicleId}
                    </span>
                    <StatusChip variant={d.status === 'COMPLETED' ? 'success' : 'warning'} size="sm">
                      {d.status}
                    </StatusChip>
                  </div>
                  <p className="text-slate-600 mt-1">
                    {d.origin} → {d.destination} ({d.cargo})
                  </p>
                </div>

                <button
                  onClick={() => setSelectedDeployment(d)}
                  className="text-[#2563EB] font-bold hover:text-blue-800"
                >
                  Inspect →
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {selectedDeployment && (
        <UserDeploymentDetailsModal
          isOpen={Boolean(selectedDeployment)}
          deployment={selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
        />
      )}

      <UserDeployModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        onSuccess={() => setActionSuccess('New mission dispatched successfully.')}
      />

      <UserReportIncidentModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSuccess={() => setActionSuccess('Field incident report logged and broadcast successfully.')}
      />
    </div>
  );
}
