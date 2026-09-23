import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import UserRegisterVehicleModal from './UserRegisterVehicleModal';
import UserEditVehicleModal from './UserEditVehicleModal';
import StatusChip from '../common/StatusChip';
import { IconTruck, IconPlus, IconShield, IconWifi, IconPin, IconDeployments } from '../common/AppIcons';
import InfoPopover from '../common/InfoPopover';

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
    <div className="space-y-4 font-sans max-w-7xl mx-auto">
      {/* Top Controls & Segmented Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-heading font-bold text-[#0B1220]">
                Registered Fleet Assets
              </h2>
              <InfoPopover conceptKey="STATE_FLEET" iconSize="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enrolled transport vehicles, load capacities, and corridor deployment status
            </p>
          </div>

          <button
            onClick={() => setRegisterModalOpen(true)}
            className="px-4 py-2 bg-[#0B1220] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 touch-target"
          >
            <IconPlus className="w-4 h-4" />
            <span>Register Vehicle</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto pb-1 max-w-md">
          {[
            { id: 'ALL', label: `All (${vehicles.length})` },
            { id: 'ACTIVE', label: `In Transit (${activeCount})` },
            { id: 'AVAILABLE', label: `Available (${availableCount})` },
            { id: 'DELAYED', label: `Delayed (${delayedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all touch-target sm:min-h-0 ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
            placeholder="Search license plate, driver name, vehicle type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-hidden transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Action Messages */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between animate-fade-in">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold text-rose-700 ml-2">✕</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between animate-fade-in">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-emerald-700 ml-2">✕</button>
        </div>
      )}

      {/* Vehicles List */}
      {vehiclesLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span className="text-xs font-semibold">Synchronizing fleet directory...</span>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <IconTruck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Fleet Vehicles Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No registered vehicles match your active search filters.'
              : 'Register your first vehicle unit to start dispatching corridor transport.'}
          </p>
          <button
            onClick={() => setRegisterModalOpen(true)}
            className="px-4 py-2 bg-[#0B1220] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer touch-target"
          >
            Register Vehicle Unit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredVehicles.map((v) => {
            const isDeployed = v.hasActiveDeployment || ['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus);
            const isDelayed = v.deploymentStatus === 'DELAYED';
            const statusVariant = isDelayed ? 'warning' : isDeployed ? 'info' : 'success';
            const statusLabel = isDelayed ? 'Delayed' : isDeployed ? 'In Transit' : 'Ready at Depot';

            return (
              <div
                key={v.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                        <IconTruck className="w-5 h-5 text-slate-800" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {v.licensePlate || v.id}
                          </span>
                          <span className="text-xs font-bold text-slate-700 truncate">{v.name}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{v.type}</p>
                        <p className="text-[11px] font-mono text-slate-600 mt-0.5">
                          Driver: <strong className="text-slate-800">{v.driverName}</strong> • {v.driverPhone}
                        </p>
                      </div>
                    </div>

                    <StatusChip variant={statusVariant} size="sm">
                      {statusLabel}
                    </StatusChip>
                  </div>

                  {/* Corridor & Location Details */}
                  <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <span className="text-slate-400">Location: </span>
                      <strong className="text-slate-800">{v.currentLocationName || (v.origin ? `${v.origin} Hub` : 'Guwahati Staging Hub')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Capacity: </span>
                      <strong className="text-slate-800">{v.cargoCapacityKg || 5000} kg</strong>
                    </div>
                  </div>
                </div>

                {/* Card Action Hub */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingVehicle(v)}
                      className="text-slate-600 hover:text-slate-900 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(v)}
                      disabled={deletingVehicleId === v.id || isDeployed}
                      className="text-rose-600 hover:text-rose-800 disabled:opacity-30 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Decommission
                    </button>
                  </div>

                  {!isDeployed && onDeployVehicle && (
                    <button
                      onClick={() => onDeployVehicle(v)}
                      className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer touch-target sm:min-h-0"
                    >
                      <IconDeployments className="w-3.5 h-3.5" />
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
          setActionSuccess('New fleet unit registered successfully.');
          refreshVehicles();
        }}
      />

      {editingVehicle && (
        <UserEditVehicleModal
          isOpen={Boolean(editingVehicle)}
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSuccess={() => {
            setActionSuccess('Fleet unit details updated successfully.');
            refreshVehicles();
          }}
        />
      )}
    </div>
  );
}
