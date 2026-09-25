import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import UserDeployModal from './UserDeployModal';
import UserDeploymentDetailsModal from './UserDeploymentDetailsModal';
import UserReportIncidentModal from './UserReportIncidentModal';
import StatusChip from '../common/StatusChip';
import { formatIST } from '../../utils/timeFormat';
import { IconDeployments, IconPlus, IconTruck, IconWarning, IconShield, IconRoute } from '../common/AppIcons';
import InfoPopover from '../common/InfoPopover';

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

  const [activeSegment, setActiveSegment] = useState('ONGOING'); // 'ONGOING' | 'UPCOMING' | 'COMPLETED'
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportContext, setReportContext] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filter lists based on real data
  const ongoingList = activeDeployments.filter((d) => d.status === 'ACTIVE' || d.status === 'DELAYED');
  const upcomingList = activeDeployments.filter((d) => d.status === 'PLANNED');
  const completedList = deploymentHistory.filter((d) => d.status === 'COMPLETED' || d.status === 'CANCELLED');

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

  const handleReportFromDeployment = (dep) => {
    setReportContext({
      deploymentId: dep.id,
      vehicleId: dep.vehicleId,
      vehiclePlate: dep.vehiclePlate || dep.vehicleId,
      origin: dep.origin,
      destination: dep.destination,
      assignedCorridor: dep.assignedCorridor,
    });
    setReportModalOpen(true);
  };

  return (
    <div className="space-y-4 font-sans max-w-7xl mx-auto">
      {/* Top Banner & Tab Switcher */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-heading font-bold text-[#0B1220] truncate">
                Transport Deployments & Missions
              </h2>
              <InfoPopover conceptKey="UNKNOWN_DEPLOYMENT" iconSize="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Corridor movements, route manifests, and delivery audits across the North Eastern network
            </p>
          </div>

          <button
            onClick={() => (onOpenDeployModal ? onOpenDeployModal() : setDeployModalOpen(true))}
            disabled={availableVehicles.length === 0}
            className="w-full sm:w-auto px-4 py-2 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 touch-target"
          >
            <IconPlus className="w-4 h-4" />
            <span>Dispatch Journey ({availableVehicles.length} Ready)</span>
          </button>
        </div>

        {/* 3 Segmented Tabs: ONGOING | UPCOMING | COMPLETED */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl max-w-md w-full overflow-x-auto">
          <button
            onClick={() => setActiveSegment('ONGOING')}
            className={`flex-1 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all touch-target sm:min-h-0 ${
              activeSegment === 'ONGOING'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Ongoing ({ongoingList.length})</span>
          </button>

          <button
            onClick={() => setActiveSegment('UPCOMING')}
            className={`flex-1 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all touch-target sm:min-h-0 ${
              activeSegment === 'UPCOMING'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Upcoming ({upcomingList.length})</span>
          </button>

          <button
            onClick={() => setActiveSegment('COMPLETED')}
            className={`flex-1 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all touch-target sm:min-h-0 ${
              activeSegment === 'COMPLETED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Completed ({completedList.length})</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Notifications */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between animate-fade-in">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold text-rose-700 ml-2 cursor-pointer">✕</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between animate-fade-in">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-emerald-700 ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Loading Indicator */}
      {deploymentsLoading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
          <div className="w-7 h-7 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span className="text-xs font-semibold">Synchronizing deployment records...</span>
        </div>
      )}

      {/* ==================== TAB 1: ONGOING DEPLOYMENTS ==================== */}
      {!deploymentsLoading && activeSegment === 'ONGOING' && (
        <div>
          {ongoingList.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 text-center shadow-card">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                <IconDeployments className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Ongoing Journeys in Transit</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3.5">
                {availableVehicles.length > 0
                  ? `${availableVehicles.length} vehicle(s) ready at depot for corridor dispatch.`
                  : 'Register a vehicle to begin assigning regional transport missions.'}
              </p>
              {availableVehicles.length > 0 && (
                <button
                  onClick={() => (onOpenDeployModal ? onOpenDeployModal() : setDeployModalOpen(true))}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer touch-target"
                >
                  Dispatch Journey
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {ongoingList.map((dep) => (
                <div
                  key={dep.id}
                  className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3.5 sm:p-4 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 mb-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-extrabold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                          {dep.vehiclePlate || dep.vehicleId}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] font-mono text-slate-500 truncate">{dep.id}</span>
                      </div>
                      <StatusChip
                        variant={dep.status === 'DELAYED' ? 'warning' : 'info'}
                        size="sm"
                      >
                        {dep.status}
                      </StatusChip>
                    </div>

                    {/* Route Destination */}
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 text-sm font-heading font-bold text-slate-900 flex-wrap">
                        <span>{dep.origin}</span>
                        <span className="text-blue-600">→</span>
                        <span>{dep.destination}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        Corridor: <strong className="text-slate-700">{dep.assignedCorridor || 'Direct Highway'}</strong>
                      </p>
                    </div>

                    {/* Metadata Details */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Started</span>
                        <span className="font-semibold text-slate-700">
                          {formatIST(dep.startedAt || dep.createdAt, 'timeOnly')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Cargo</span>
                        <span className="font-semibold text-slate-700 truncate block">
                          {dep.cargo || 'Essential Goods'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedDeployment(dep)}
                        className="px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer touch-target sm:min-h-0"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleReportFromDeployment(dep)}
                        className="px-2.5 sm:px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 touch-target sm:min-h-0"
                        title="Report roadblock or hazard on this route"
                      >
                        <IconWarning className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Report</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleComplete(dep)}
                      disabled={actionLoadingId === dep.id}
                      className="px-3 py-1.5 bg-[#16A34A] hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer touch-target sm:min-h-0 ml-auto"
                    >
                      {actionLoadingId === dep.id ? 'Saving...' : 'Complete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: UPCOMING DEPLOYMENTS ==================== */}
      {!deploymentsLoading && activeSegment === 'UPCOMING' && (
        <div>
          {upcomingList.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 text-center shadow-card">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                <IconRoute className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Upcoming Journeys Scheduled</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3.5">
                Future scheduled journeys will appear here when planned in advance.
              </p>
              {availableVehicles.length > 0 && (
                <button
                  onClick={() => (onOpenDeployModal ? onOpenDeployModal() : setDeployModalOpen(true))}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer touch-target"
                >
                  Plan & Dispatch Journey
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {upcomingList.map((dep) => (
                <div
                  key={dep.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-card"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="font-mono font-bold text-xs text-slate-800">
                      {dep.vehiclePlate || dep.vehicleId}
                    </span>
                    <StatusChip variant="neutral" size="sm">PLANNED</StatusChip>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{dep.origin} → {dep.destination}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Cargo: {dep.cargo}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: COMPLETED DEPLOYMENTS ==================== */}
      {!deploymentsLoading && activeSegment === 'COMPLETED' && (
        <div>
          {completedList.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 text-center shadow-card">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                <IconDeployments className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Past Mission History</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Completed transport records will be preserved here for regional compliance audits.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-card">
              <div className="divide-y divide-slate-100">
                {completedList.map((dep) => (
                  <div
                    key={dep.id}
                    className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {dep.vehiclePlate || dep.vehicleId}
                        </span>
                        <StatusChip
                          variant={dep.status === 'COMPLETED' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {dep.status}
                        </StatusChip>
                        <span className="text-[11px] text-slate-400 font-mono">{dep.id}</span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 mt-1">
                        {dep.origin} → {dep.destination}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cargo: {dep.cargo} • Completed: <strong>{formatIST(dep.completedAt || dep.updatedAt, 'full')}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedDeployment(dep)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors self-start sm:self-center cursor-pointer touch-target sm:min-h-0"
                    >
                      Audit Details →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <UserDeployModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        onSuccess={() => setActionSuccess('Journey dispatched and registered successfully!')}
      />

      <UserReportIncidentModal
        isOpen={reportModalOpen}
        initialContext={reportContext}
        onClose={() => {
          setReportModalOpen(false);
          setReportContext(null);
        }}
        onSuccess={() => setActionSuccess('Incident broadcasted successfully with route link!')}
      />

      <UserDeploymentDetailsModal
        isOpen={Boolean(selectedDeployment)}
        deployment={selectedDeployment}
        onClose={() => setSelectedDeployment(null)}
      />
    </div>
  );
}
