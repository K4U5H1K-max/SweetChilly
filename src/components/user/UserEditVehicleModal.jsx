import React, { useState, useEffect } from 'react';
import { NER_CITIES } from '../../data/nerData';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function UserEditVehicleModal({ isOpen, vehicle, onClose, onSuccess }) {
  const { refreshVehicles } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    cargoCapacityKg: 5000,
    driverName: '',
    driverPhone: '',
    currentLocationName: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        name: vehicle.name || '',
        type: vehicle.type || 'Medium Transport Truck (5-Ton)',
        cargoCapacityKg: vehicle.cargoCapacityKg || 5000,
        driverName: vehicle.driverName || '',
        driverPhone: vehicle.driverPhone || '',
        currentLocationName: vehicle.currentLocationName || (vehicle.origin ? `${vehicle.origin} Hub` : (NER_CITIES[0] ? `${NER_CITIES[0]} Hub` : 'Central Hub')),
      });
      setError(null);
    }
  }, [vehicle]);

  if (!isOpen || !vehicle) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Vehicle name cannot be blank.');
      return;
    }
    if (!formData.driverName.trim()) {
      setError('Driver name cannot be blank.');
      return;
    }
    if (!formData.driverPhone.trim()) {
      setError('Driver phone number cannot be blank.');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        name: formData.name.trim(),
        type: formData.type,
        cargoCapacityKg: parseInt(formData.cargoCapacityKg, 10) || 5000,
        driverName: formData.driverName.trim(),
        driverPhone: formData.driverPhone.trim(),
        currentLocationName: formData.currentLocationName.trim(),
      };

      const res = await api.updateVehicle(vehicle.id, updates);
      if (res && res.success !== false) {
        await refreshVehicles();
        if (onSuccess) onSuccess(res.data || res);
        onClose();
      } else {
        throw new Error(res?.message || 'Failed to update vehicle details.');
      }
    } catch (err) {
      setError(err.message || 'Error updating vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-slate-900">Configure Vehicle Asset</h2>
              <p className="text-xs font-mono text-slate-500 uppercase">{vehicle.licensePlate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Vehicle Name / Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payload Capacity (kg)
              </label>
              <input
                type="number"
                min="500"
                max="50000"
                step="100"
                value={formData.cargoCapacityKg}
                onChange={(e) => setFormData({ ...formData, cargoCapacityKg: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Current Location / Depot
              </label>
              <input
                type="text"
                value={formData.currentLocationName}
                onChange={(e) => setFormData({ ...formData, currentLocationName: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assigned Driver <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Driver Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.driverPhone}
                onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              )}
              <span>{loading ? 'Saving...' : 'Update Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
