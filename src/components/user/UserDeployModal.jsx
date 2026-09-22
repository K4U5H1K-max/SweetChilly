import React, { useState, useEffect } from 'react';
import { NER_CITIES, NER_CORRIDORS } from '../../data/nerData';
import { useApp } from '../../context/AppContext';

export default function UserDeployModal({ isOpen, preselectedVehicle, onClose, onSuccess }) {
  const { availableVehicles, createDeployment } = useApp();

  const [formData, setFormData] = useState({
    vehicleId: '',
    origin: 'Guwahati',
    destination: 'Shillong',
    assignedCorridor: 'Guwahati - Shillong (GS Road / NH-27)',
    cargo: 'Essential Medicines & Vaccines',
    priority: 'HIGH',
    dispatchNotes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (preselectedVehicle) {
      setFormData((prev) => ({ ...prev, vehicleId: preselectedVehicle.id }));
    } else if (availableVehicles.length > 0 && !formData.vehicleId) {
      setFormData((prev) => ({ ...prev, vehicleId: availableVehicles[0].id }));
    }
  }, [preselectedVehicle, availableVehicles]);

  // Sync corridor name when origin/dest changes
  const handleOriginChange = (orig) => {
    setFormData((prev) => {
      const match = NER_CORRIDORS.find((c) => c.origin === orig && c.destination === prev.destination);
      return {
        ...prev,
        origin: orig,
        assignedCorridor: match ? match.name : `${orig} - ${prev.destination} Corridor`,
      };
    });
  };

  const handleDestChange = (dest) => {
    setFormData((prev) => {
      const match = NER_CORRIDORS.find((c) => c.origin === prev.origin && c.destination === dest);
      return {
        ...prev,
        destination: dest,
        assignedCorridor: match ? match.name : `${prev.origin} - ${dest} Corridor`,
      };
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.vehicleId) {
      setError('Please select an available vehicle to deploy.');
      return;
    }
    if (formData.origin === formData.destination) {
      setError('Origin and Destination hubs cannot be identical.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        vehicleId: formData.vehicleId,
        origin: formData.origin,
        destination: formData.destination,
        assignedCorridor: formData.assignedCorridor,
        cargo: formData.cargo,
        priority: formData.priority,
        status: 'ACTIVE',
        dispatchNotes: formData.dispatchNotes || 'Dispatched via Operator Portal',
      };

      const res = await createDeployment(payload);
      if (res && res.success !== false) {
        if (onSuccess) onSuccess(res.data || res);
        onClose();
      } else {
        throw new Error(res?.message || 'Failed to dispatch deployment.');
      }
    } catch (err) {
      setError(err.message || 'Error deploying vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicleObj = availableVehicles.find((v) => v.id === formData.vehicleId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-slate-900">Dispatch Vehicle Journey</h2>
              <p className="text-xs text-slate-500">Initiate an active transport mission across NER corridors</p>
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

        {availableVehicles.length === 0 && !preselectedVehicle ? (
          <div className="text-center py-6">
            <p className="text-sm font-semibold text-slate-700">No Available Vehicles</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              All your registered transport units are currently in transit or no vehicles are registered yet.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Available Vehicle <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full px-3.5 py-2 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} — {v.name} ({v.driverName})
                  </option>
                ))}
              </select>
              {selectedVehicleObj && (
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                  <span>Driver: <strong className="text-slate-700">{selectedVehicleObj.driverName}</strong></span>
                  <span>•</span>
                  <span>Capacity: <strong className="text-slate-700">{selectedVehicleObj.cargoCapacityKg?.toLocaleString()} kg</strong></span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Origin Gateway</label>
                <select
                  value={formData.origin}
                  onChange={(e) => handleOriginChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  {NER_CITIES.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Destination Terminal</label>
                <select
                  value={formData.destination}
                  onChange={(e) => handleDestChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  {NER_CITIES.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cargo Manifest</label>
                <input
                  type="text"
                  required
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mission Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  <option value="NORMAL">Standard Transit</option>
                  <option value="HIGH">High Priority Supply</option>
                  <option value="EMERGENCY">Emergency Relief / Medical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Dispatch & Waybill Notes</label>
              <textarea
                rows={2}
                placeholder="Optional notes for checkpoint inspection..."
                value={formData.dispatchNotes}
                onChange={(e) => setFormData({ ...formData, dispatchNotes: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
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
                className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                )}
                <span>{loading ? 'Authorizing Mission...' : 'Dispatch Journey'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
