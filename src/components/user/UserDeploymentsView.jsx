import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import UserDeployModal from './UserDeployModal';
import UserDeploymentDetailsModal from './UserDeploymentDetailsModal';

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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-900">Operator Transport Missions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track active corridor deployments, confirm delivery completions, and inspect historical journey logs.
          </p>
        </div>

        <button
          onClick={() => (onOpenDeployModal ? onOpenDeployModal() : setDeployModalOpen(true))}
          disabled={availableVehicles.length === 0}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
          title={availableVehicles.length === 0 ? 'No available vehicles to deploy' : 'Deploy available vehicle'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Dispatch New Journey ({availableVehicles.length} available)</span>
        </button>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-4">✕</button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'ACTIVE'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Active Deployments</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'ACTIVE' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {activeDeployments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'HISTORY'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Journey History</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'HISTORY' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {deploymentHistory.length}
          </span>
        </button>
      </div>

      {/* Content Area */}
      {deploymentsLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs font-semibold">Hydrating journeys from backend...</span>
        </div>
      ) : activeTab === 'ACTIVE' ? (
        /* Active Deployments Grid */
        activeDeployments.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-base font-heading font-bold text-slate-800">No Active Journeys Underway</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              All your registered vehicles are currently stationed at regional hubs. Dispatch a journey to start corridor transport.
            </p>
            {availableVehicles.length > 0 && (
              <button
                onClick={() => setDeployModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-emerald-700 transition-colors"
              >
                Dispatch First Journey
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeDeployments.map((d) => (
              <div
                key={d.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {d.vehiclePlate || d.vehicleId}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          d.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {d.status}
                        </span>
                        {d.priority === 'HIGH' || d.priority === 'EMERGENCY' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {d.priority}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="font-heading font-bold text-base text-slate-800 mt-2">
                        {d.origin} $\rightarrow$ {d.destination}
                      </h3>
                      <p className="text-xs font-mono text-blue-600">{d.assignedCorridor || 'NER Transit Corridor'}</p>
                    </div>

                    <button
                      onClick={() => setSelectedDeployment(d)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Manifest
                    </button>
                  </div>

                  <div className="space-y-2 py-3 border-y border-slate-100 my-3 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Cargo:</span>
                      <span className="font-medium text-slate-800">{d.cargo}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Assigned Driver:</span>
                      <span className="font-semibold text-slate-800">{d.driverName || 'Operator Assigned'}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Dispatch Time:</span>
                      <span className="font-mono text-slate-700">{d.startTime ? new Date(d.startTime).toLocaleTimeString() : 'Recent'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleCancel(d)}
                    disabled={actionLoadingId === d.id}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel Journey
                  </button>
                  <button
                    onClick={() => handleComplete(d)}
                    disabled={actionLoadingId === d.id}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoadingId === d.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span>Complete Journey</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Deployment History Table */
        deploymentHistory.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <h3 className="text-base font-heading font-bold text-slate-800">No Journey History Recorded</h3>
            <p className="text-xs text-slate-500 mt-1">Completed and cancelled transport missions will be logged here permanently.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Journey ID</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Route</th>
                    <th className="py-3 px-4">Cargo</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deploymentHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{h.id}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{h.vehiclePlate || h.vehicleId}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{h.origin} $\rightarrow$ {h.destination}</td>
                      <td className="py-3 px-4 text-slate-600">{h.cargo}</td>
                      <td className="py-3 px-4 text-slate-600">{h.driverName || 'Operator Assigned'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          h.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedDeployment(h)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Modals */}
      <UserDeployModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        onSuccess={() => setActionSuccess('Journey dispatched successfully!')}
      />

      <UserDeploymentDetailsModal
        isOpen={Boolean(selectedDeployment)}
        deployment={selectedDeployment}
        onClose={() => setSelectedDeployment(null)}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
