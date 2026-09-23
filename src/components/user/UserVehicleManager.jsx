import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import UserRegisterVehicleModal from './UserRegisterVehicleModal';
import UserEditVehicleModal from './UserEditVehicleModal';
import StatusChip from '../common/StatusChip';

export default function UserVehicleManager({ onDeployVehicle }) {
  const { vehicles, vehiclesLoading, vehiclesError, refreshVehicles } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const activeCount = useMemo(() => {
    return vehicles.filter((v) => v.hasActiveDeployment || ['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus)).length;
  }, [vehicles]);

  const availableCount = useMemo(() => {
    return vehicles.filter((v) => !v.hasActiveDeployment && v.deploymentStatus !== 'ACTIVE' && v.deploymentStatus !== 'DELAYED').length;
  }, [vehicles]);

  const delayedCount = useMemo(() => {
    return vehicles.filter((v) => v.deploymentStatus === 'DELAYED').length;
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.type?.toLowerCase().includes(searchTerm.toLowerCase());

      const isDeployed = v.hasActiveDeployment || ['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus);

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') {
        matchesStatus = isDeployed;
      } else if (statusFilter === 'AVAILABLE') {
        matchesStatus = !isDeployed;
      } else if (statusFilter === 'DELAYED') {
        matchesStatus = v.deploymentStatus === 'DELAYED';
      }

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, statusFilter]);

  const handleDeleteVehicle = async (vehicle) => {
    if (vehicle.hasActiveDeployment || ['ACTIVE', 'DELAYED', 'PLANNED'].includes(vehicle.deploymentStatus)) {
      setActionError(`Cannot decommission ${vehicle.licensePlate} while an active deployment is underway.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to decommission vehicle ${vehicle.licensePlate} (${vehicle.name})?`)) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setDeletingVehicleId(vehicle.id);
    try {
      const res = await api.deleteVehicle(vehicle.id);
      if (res && res.success !== false) {
        setActionSuccess(`Vehicle ${vehicle.licensePlate} decommissioned successfully.`);
        await refreshVehicles();
      } else {
        throw new Error(res?.message || 'Failed to delete vehicle.');
      }
    } catch (err) {
      setActionError(err.message || 'Error deleting vehicle.');
    } finally {
      setDeletingVehicleId(null);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Controls & Segmented Filter Bar (Reference Screen 6: Fleet Tracking) */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-heading font-bold text-[#0B1220]">Fleet Tracking & Units</h2>
            <p className="text-[11px] text-slate-500">Live operator transport assets across regional staging hubs</p>
          </div>

          <button
            onClick={() => setRegisterModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#0B1220] hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 touch-target"
          >
            <span className="font-bold text-sm">+</span>
            <span>Register Unit</span>
          </button>
        </div>

        {/* Filter Pills matching Reference Screen 6 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'ALL', label: `All (${vehicles.length})` },
            { id: 'ACTIVE', label: `Active (${activeCount})` },
            { id: 'AVAILABLE', label: `Available (${availableCount})` },
            { id: 'DELAYED', label: `Delayed (${delayedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all touch-target sm:min-h-0 sm:min-w-0 ${
                statusFilter === tab.id
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="mt-3 relative">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search plate number, driver, asset..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:bg-white outline-hidden transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Action Messages */}
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

      {/* Vehicles List (Reference Screen 6: Fleet Tracking Cards) */}
      {vehiclesLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span className="text-xs font-semibold">Loading operator fleet...</span>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Vehicles Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No enrolled vehicles match your selected filter.'
              : 'Register your first vehicle unit to start managing corridor movements.'}
          </p>
          <button
            onClick={() => setRegisterModalOpen(true)}
            className="px-4 py-2 bg-[#0B1220] text-white font-semibold text-xs rounded-lg shadow-xs hover:bg-slate-800"
          >
            + Register Vehicle Unit
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVehicles.map((v) => {
            const isDeployed = v.hasActiveDeployment || ['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus);
            const isDelayed = v.deploymentStatus === 'DELAYED';
            const statusVariant = isDelayed ? 'warning' : isDeployed ? 'info' : 'success';
            const statusLabel = isDelayed ? 'Delayed' : isDeployed ? 'On Route' : 'Safe';

            return (
              <div
                key={v.id}
                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs sm:text-sm text-[#0B1220] tracking-tight">
                          {v.licensePlate || v.id}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-600 truncate">{v.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{v.type}</p>
                      <p className="text-[11px] font-mono text-slate-600 mt-0.5">
                        Driver: <strong className="text-slate-800">{v.driverName}</strong> • {v.driverPhone}
                      </p>
                    </div>
                  </div>

                  <StatusChip variant={statusVariant} size="md">
                    {statusLabel}
                  </StatusChip>
                </div>

                {/* Corridor & Location Details */}
                <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-400">Hub / Staging: </span>
                    <strong className="text-slate-800">{v.currentLocationName || (v.origin ? `${v.origin} Hub` : 'Depot / Staging Hub')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Capacity: </span>
                    <strong className="text-slate-800">{v.cargoCapacityKg || 5000} kg</strong>
                  </div>
                </div>

                {/* Card Action Hub */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingVehicle(v)}
                      className="text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(v)}
                      disabled={deletingVehicleId === v.id || isDeployed}
                      className="text-rose-600 hover:text-rose-800 disabled:opacity-30 font-semibold px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
                    >
                      Decommission
                    </button>
                  </div>

                  {!isDeployed && onDeployVehicle && (
                    <button
                      onClick={() => onDeployVehicle(v)}
                      className="px-3 py-1.5 bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1 cursor-pointer touch-target sm:min-h-0 sm:min-w-0"
                    >
                      <span>⚡</span>
                      <span>Dispatch</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <UserRegisterVehicleModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={() => {
          setActionSuccess('New fleet unit enrolled successfully.');
          refreshVehicles();
        }}
      />

      {editingVehicle && (
        <UserEditVehicleModal
          isOpen={Boolean(editingVehicle)}
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSuccess={() => {
            setActionSuccess('Fleet unit updated successfully.');
            refreshVehicles();
          }}
        />
      )}
    </div>
  );
}
