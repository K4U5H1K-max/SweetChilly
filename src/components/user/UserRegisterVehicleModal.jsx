import React, { useState } from 'react';
import { NER_CITIES } from '../../data/nerData';
import api from '../../services/api';
import { useApp } from '../../context/AppContext';

const VEHICLE_TYPES = [
  'Heavy Cargo Truck (10-Ton)',
  'Medium Transport Truck (5-Ton)',
  'Light Commercial Vehicle (2.5-Ton)',
  'Cold Chain Refrigerated Van',
  '4WD Hill Cargo Carrier (3-Ton)',
  'Bulk Fuel / Fluid Tanker (8-KL)',
];

export default function UserRegisterVehicleModal({ isOpen, onClose, onSuccess }) {
  const { refreshVehicles } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    type: VEHICLE_TYPES[0],
    licensePlate: '',
    cargoCapacityKg: 5000,
    driverName: '',
    driverPhone: '',
    hubCityId: 'GHY',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Form Validations
    if (!formData.name.trim()) {
      setError('Please provide a vehicle or fleet identifier.');
      return;
    }
    if (!formData.licensePlate.trim()) {
      setError('Please provide a valid registration / license plate.');
      return;
    }
    if (!formData.driverName.trim()) {
      setError('Please enter the primary assigned driver name.');
      return;
    }
    if (!formData.driverPhone.trim()) {
      setError('Please provide a driver contact phone number.');
      return;
    }

    const selectedCity = NER_CITIES.find((c) => c.id === formData.hubCityId) || NER_CITIES[0];

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        licensePlate: formData.licensePlate.trim().toUpperCase(),
        cargoCapacityKg: parseInt(formData.cargoCapacityKg, 10) || 5000,
        fuelLevel: 100,
        currentLocationLat: selectedCity.lat,
        currentLocationLng: selectedCity.lng,
        currentLocationName: `${selectedCity.name} Logistics Hub`,
        driverName: formData.driverName.trim(),
        driverPhone: formData.driverPhone.trim(),
      };

      const res = await api.createVehicle(payload);
      if (res && res.success !== false) {
        await refreshVehicles();
        if (onSuccess) onSuccess(res.data || res);
        onClose();
      } else {
        throw new Error(res?.message || 'Failed to register vehicle.');
      }
    } catch (err) {
      setError(err.message || 'Error registering vehicle. Please check details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-slate-900">Register Operator Vehicle</h2>
              <p className="text-xs text-slate-500">Enrol a new transport asset into your operator fleet</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Vehicle / Fleet Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Brahmaputra Hauler-09"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                License Plate / Registration <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AS-01-EF-4321"
                value={formData.licensePlate}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                className="w-full px-3.5 py-2 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Vehicle Category / Class
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assigned Driver Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kalita"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Driver Contact Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={formData.driverPhone}
                onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Initial Regional Depot / Staging Hub
            </label>
            <select
              value={formData.hubCityId}
              onChange={(e) => setFormData({ ...formData, hubCityId: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden transition-all"
            >
              {NER_CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.state}) — {c.hubType}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              )}
              <span>{loading ? 'Enrolling Asset...' : '+ Register Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
