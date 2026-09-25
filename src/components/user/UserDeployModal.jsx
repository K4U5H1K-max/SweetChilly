import React, { useState, useEffect } from 'react';
import { NER_CITIES, NER_CORRIDORS } from '../../data/nerData';
import { useApp } from '../../context/AppContext';
import { IconDeployments } from '../common/AppIcons';

export default function UserDeployModal({ isOpen, preselectedVehicle, onClose, onSuccess }) {
  const { vehicles, availableVehicles, createDeployment } = useApp();

  const [formData, setFormData] = useState({
    vehicleId: '',
    origin: '',
    destination: '',
    assignedCorridor: '',
    cargo: 'Essential Medicines & Vaccines',
    priority: 'HIGH',
    dispatchNotes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Compute strictly available vehicles
  const effectiveAvailableVehicles = React.useMemo(() => {
    return (availableVehicles || []).filter(
      (v) => !v.hasActiveDeployment && !['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus)
    );
  }, [availableVehicles]);

  // Reset error and initialize vehicle selection when modal opens
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      return;
    }

    setError(null);

    // Resolve preselected vehicle if provided and genuinely available
    let targetVehicle = null;
    if (preselectedVehicle) {
      const preselectedId = typeof preselectedVehicle === 'object' ? preselectedVehicle.id : preselectedVehicle;
      const match = (vehicles || []).find((v) => String(v.id).toLowerCase() === String(preselectedId).toLowerCase());
      if (match && !match.hasActiveDeployment && !['ACTIVE', 'DELAYED', 'PLANNED'].includes(match.deploymentStatus)) {
        targetVehicle = match;
      }
    }

    if (!targetVehicle && effectiveAvailableVehicles.length > 0) {
      targetVehicle = effectiveAvailableVehicles.find((veh) => veh.id === formData.vehicleId) || effectiveAvailableVehicles[0];
    }

    if (targetVehicle) {
      const vOrigin = targetVehicle.origin || (targetVehicle.currentLocationName ? targetVehicle.currentLocationName.replace(/\s+Logistics\s+Hub|\s+Hub/i, '').trim() : 'Agartala');
      const cleanOrigin = NER_CITIES.find((c) => c.name.toLowerCase() === vOrigin.toLowerCase())?.name || vOrigin;
      const defaultDest = cleanOrigin === 'Silchar' ? 'Shillong' : 'Silchar';

      setFormData((prev) => ({
        ...prev,
        vehicleId: targetVehicle.id,
        origin: prev.origin || cleanOrigin,
        destination: prev.destination || defaultDest,
        assignedCorridor: prev.assignedCorridor || `${prev.origin || cleanOrigin} - ${prev.destination || defaultDest} Corridor`,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        vehicleId: '',
      }));
    }
  }, [isOpen, preselectedVehicle, effectiveAvailableVehicles, vehicles]);

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
    if (!formData.origin || !formData.destination) {
      setError('Origin and Destination hubs are required.');
      return;
    }
    if (formData.origin.trim().toLowerCase() === formData.destination.trim().toLowerCase()) {
      setError('Origin and Destination hubs cannot be identical.');
      return;
    }

    const originCity = NER_CITIES.find((c) => c.name.toLowerCase() === formData.origin.trim().toLowerCase());
    const destCity = NER_CITIES.find((c) => c.name.toLowerCase() === formData.destination.trim().toLowerCase());

    setLoading(true);
    try {
      const payload = {
        vehicleId: formData.vehicleId,
        origin: formData.origin.trim(),
        destination: formData.destination.trim(),
        originLat: originCity?.lat ?? null,
        originLng: originCity?.lng ?? null,
        destinationLat: destCity?.lat ?? null,
        destinationLng: destCity?.lng ?? null,
        assignedCorridor: formData.assignedCorridor || `${formData.origin} - ${formData.destination} Corridor`,
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

  const selectedVehicleObj = effectiveAvailableVehicles.find((v) => v.id === formData.vehicleId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 my-8 font-sans">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <IconDeployments className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-slate-900">Dispatch Vehicle Journey</h2>
              <p className="text-xs text-slate-500">Initiate an active transport mission across NER corridors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {effectiveAvailableVehicles.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
              <IconDeployments className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              No vehicles are currently available for deployment.
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 mb-5 max-w-xs mx-auto leading-relaxed">
              Complete an active journey or register another vehicle before starting a new deployment.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
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
                className="w-full px-3.5 py-2 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
              >
                {effectiveAvailableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.licensePlate || v.regNumber} ({v.driverName || 'Unassigned'})
                  </option>
                ))}
              </select>
              {selectedVehicleObj && (
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                  <span>Driver: <strong className="text-slate-700">{selectedVehicleObj.driverName}</strong></span>
                  <span>•</span>
                  <span>Capacity: <strong className="text-slate-700">{selectedVehicleObj.cargoCapacityKg?.toLocaleString() || selectedVehicleObj.capacity || 'N/A'} kg</strong></span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Origin Gateway</label>
                <select
                  value={formData.origin}
                  onChange={(e) => handleOriginChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
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
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
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
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
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
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.vehicleId}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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

