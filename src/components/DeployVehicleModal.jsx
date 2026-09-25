import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { NER_CITIES, NER_CORRIDORS } from '../data/nerData';

export default function DeployVehicleModal({
  isOpen,
  onClose,
  preselectedVehicleId,
  onDeploymentCreated,
}) {
  const { vehicles, availableVehicles, createDeployment } = useApp();

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [origin, setOrigin] = useState('Guwahati');
  const [destination, setDestination] = useState('Silchar');
  const [assignedCorridor, setAssignedCorridor] = useState('NH-6 (Sonapur Arterial)');
  const [cargo, setCargo] = useState('Emergency Relief Consignment');
  const [priority, setPriority] = useState('HIGH');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Determine selectable vehicles (strictly available vehicles only)
  const selectableVehicles = useMemo(() => {
    const available = (availableVehicles || []).filter(
      (v) => !v.hasActiveDeployment && !['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus)
    );
    if (preselectedVehicleId) {
      const match = (vehicles || []).find(
        (v) => String(v.id).toLowerCase() === String(preselectedVehicleId).toLowerCase()
      );
      if (match && !match.hasActiveDeployment && !['ACTIVE', 'DELAYED', 'PLANNED'].includes(match.deploymentStatus)) {
        if (!available.some((v) => v.id === match.id)) {
          return [match, ...available];
        }
      }
    }
    return available;
  }, [availableVehicles, vehicles, preselectedVehicleId]);

  // Selected vehicle object
  const selectedVehicle = useMemo(() => {
    return (
      selectableVehicles.find((v) => v.id === selectedVehicleId) ||
      selectableVehicles[0] ||
      null
    );
  }, [selectableVehicles, selectedVehicleId]);

  // Synchronize vehicle selection and origin on open/change
  useEffect(() => {
    if (isOpen) {
      if (preselectedVehicleId) {
        setSelectedVehicleId(preselectedVehicleId);
      } else if (selectableVehicles.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(selectableVehicles[0].id);
      }
      setErrorMessage('');
    }
  }, [isOpen, preselectedVehicleId, selectableVehicles]);

  // When selected vehicle changes, derive origin from vehicle's location if available
  useEffect(() => {
    if (selectedVehicle) {
      const vLoc = (selectedVehicle.origin || selectedVehicle.currentLocationName || '').replace(/\s+Logistics\s+Hub|\s+Hub/i, '').trim();
      if (vLoc && NER_CITIES.includes(vLoc)) {
        setOrigin(vLoc);
      }
    }
  }, [selectedVehicle]);

  // Mask driver phone for GovTech privacy compliance
  const maskedPhone = useMemo(() => {
    if (!selectedVehicle?.driverPhone) return 'Unassigned';
    const p = String(selectedVehicle.driverPhone).trim();
    if (p.length >= 10) {
      return `${p.slice(0, 5)}XXXX${p.slice(-2)}`;
    }
    return p;
  }, [selectedVehicle]);

  // Auto-suggest corridor when origin or destination changes
  useEffect(() => {
    const match = NER_CORRIDORS.find(
      (c) =>
        (c.origin === origin && c.destination === destination) ||
        (c.origin === destination && c.destination === origin)
    );
    if (match) {
      setAssignedCorridor(match.name);
    }
  }, [origin, destination]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedVehicle) {
      setErrorMessage('Please select an operational vehicle.');
      return;
    }
    if (!origin.trim()) {
      setErrorMessage('Origin hub is required.');
      return;
    }
    if (!destination.trim()) {
      setErrorMessage('Destination hub is required.');
      return;
    }
    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setErrorMessage('Origin and destination cannot be the same location.');
      return;
    }
    if (!assignedCorridor.trim()) {
      setErrorMessage('Assigned corridor is required.');
      return;
    }
    if (!cargo.trim()) {
      setErrorMessage('Cargo description is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicleId: selectedVehicle.id,
        origin: origin.trim(),
        destination: destination.trim(),
        assignedCorridor: assignedCorridor.trim(),
        cargo: cargo.trim(),
        priority,
        status: 'ACTIVE',
      };

      const res = await createDeployment(payload);
      const created = res?.data || res;
      if (onDeploymentCreated) {
        onDeploymentCreated(created);
      }
      onClose();
    } catch (err) {
      console.warn('[DeployVehicleModal] Deployment failed:', err.message);
      setErrorMessage(err.message || 'Failed to create deployment. Please check vehicle availability.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans my-6 animate-fadeIn">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-white tracking-tight">
                  Deploy Vehicle on Arterial Corridor
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  GovTech Logistics
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Assign an active journey manifest to an available fleet asset
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold">Error:</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-rose-500 hover:text-rose-800 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form Body */}
        {selectableVehicles.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              No vehicles are currently available for deployment.
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Complete an active journey or register another vehicle before starting a new deployment.
            </p>
            <div className="pt-2 flex justify-center">
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
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Section 1: Vehicle Selection & Manifest Summary */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Select Fleet Asset
                </label>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {selectableVehicles.length} Asset{selectableVehicles.length !== 1 ? 's' : ''} Ready
                </span>
              </div>

            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500 shadow-2xs"
            >
              {selectableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {v.name} ({v.regNumber || 'No Reg'}) [{v.deploymentStatus || (v.hasActiveDeployment ? 'DEPLOYED' : 'AVAILABLE')}]
                </option>
              ))}
            </select>

            {/* Selected Vehicle Metadata Ribbon */}
            {selectedVehicle && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Type / Capacity</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {selectedVehicle.type} ({selectedVehicle.capacity || '5 Ton'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Driver</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {selectedVehicle.driverName || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Driver Contact</span>
                  <span className="font-mono text-slate-600 block">{maskedPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Current Status</span>
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      selectedVehicle.deploymentStatus === 'AVAILABLE' || !selectedVehicle.hasActiveDeployment
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {selectedVehicle.deploymentStatus || (selectedVehicle.hasActiveDeployment ? 'DEPLOYED' : 'AVAILABLE')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Origin Logistics Hub <span className="text-rose-500">*</span>
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500 shadow-2xs"
              >
                {NER_CITIES.map((c) => (
                  <option key={`orig-${c.id}`} value={c.name}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Destination Logistics Hub <span className="text-rose-500">*</span>
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500 shadow-2xs"
              >
                {NER_CITIES.map((c) => (
                  <option key={`dest-${c.id}`} value={c.name}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Corridor & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Assigned Arterial Corridor <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={assignedCorridor}
                onChange={(e) => setAssignedCorridor(e.target.value)}
                placeholder="e.g. NH-6 (Sonapur Arterial)"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 shadow-2xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Mission Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500 shadow-2xs"
              >
                <option value="STANDARD">STANDARD (General Freight)</option>
                <option value="HIGH">HIGH (Essential Supplies / Food)</option>
                <option value="EMERGENCY_CRITICAL">EMERGENCY CRITICAL (Medical / Oxygen / Plasma)</option>
              </select>
            </div>
          </div>

          {/* Section 4: Cargo Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Consignment / Cargo Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="e.g. Emergency Vaccines & Cryogenic Medical Supplies"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 shadow-2xs font-medium"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Deploying...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span>Deploy Vehicle</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
);
}
