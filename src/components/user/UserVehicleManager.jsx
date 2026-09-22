import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import UserRegisterVehicleModal from './UserRegisterVehicleModal';
import UserEditVehicleModal from './UserEditVehicleModal';

export default function UserVehicleManager({ onDeployVehicle }) {
  const { vehicles, vehiclesLoading, vehiclesError, refreshVehicles } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.driverName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'AVAILABLE' && (v.deploymentStatus === 'AVAILABLE' || (!v.hasActiveDeployment && v.currentStatus !== 'IN_TRANSIT'))) ||
        (statusFilter === 'IN_TRANSIT' && (['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus) || v.hasActiveDeployment || v.currentStatus === 'IN_TRANSIT'));

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
    <div className="space-y-6">
      {/* Top Controls Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-900">Operator Fleet Manifest</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your registered transport units, driver details, and deployment availability.
          </p>
        </div>

        <button
          onClick={() => setRegisterModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Register New Vehicle</span>
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

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search license plate, driver, name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
          >
            <option value="ALL">All Units ({vehicles.length})</option>
            <option value="AVAILABLE">Available for Journey</option>
            <option value="IN_TRANSIT">In Transit / Deployed</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table / Card Grid */}
      {vehiclesLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs font-semibold">Hydrating operator fleet from backend...</span>
        </div>
      ) : vehiclesError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-700">
          <p className="text-sm font-semibold mb-2">Failed to load vehicle fleet</p>
          <p className="text-xs text-rose-600 mb-4">{vehiclesError}</p>
          <button
            onClick={() => refreshVehicles()}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
          >
            Retry Hydration
          </button>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-base font-heading font-bold text-slate-800">No Operator Vehicles Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No registered vehicles matched your search filters.'
              : 'You have not enrolled any transport units yet. Register your first vehicle to begin assigning regional journeys.'}
          </p>
          <button
            onClick={() => setRegisterModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-blue-700 transition-colors"
          >
            Register First Vehicle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((v) => {
            const isDeployed = v.hasActiveDeployment || ['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus);
            return (
              <div
                key={v.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {v.licensePlate}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isDeployed
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isDeployed ? (v.deploymentStatus || 'IN TRANSIT') : 'AVAILABLE'}
                        </span>
                      </div>
                      <h3 className="font-heading font-bold text-base text-slate-800 mt-1.5">{v.name}</h3>
                      <p className="text-xs text-slate-500">{v.type}</p>
                    </div>
                  </div>

                  <div className="space-y-2 py-3 border-y border-slate-100 my-3 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Driver:</span>
                      <span className="font-semibold text-slate-800">{v.driverName}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-mono text-slate-700">{v.driverPhone}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Location:</span>
                      <span className="font-medium text-slate-700 truncate max-w-[180px]">{v.currentLocationName || 'NER Regional Staging'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Payload Capacity:</span>
                      <span className="font-mono font-medium text-slate-800">{v.cargoCapacityKg?.toLocaleString()} kg</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingVehicle(v)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Edit vehicle details"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(v)}
                      disabled={isDeployed || deletingVehicleId === v.id}
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                      title={isDeployed ? 'Cannot delete deployed vehicle' : 'Decommission vehicle'}
                    >
                      {deletingVehicleId === v.id ? '...' : 'Delete'}
                    </button>
                  </div>

                  {!isDeployed && onDeployVehicle && (
                    <button
                      onClick={() => onDeployVehicle(v)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Deploy</span>
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
        onSuccess={() => setActionSuccess('New vehicle registered successfully!')}
      />

      <UserEditVehicleModal
        isOpen={Boolean(editingVehicle)}
        vehicle={editingVehicle}
        onClose={() => setEditingVehicle(null)}
        onSuccess={() => setActionSuccess('Vehicle details updated successfully!')}
      />
    </div>
  );
}
