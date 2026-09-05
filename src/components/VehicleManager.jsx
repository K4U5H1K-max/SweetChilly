import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const NER_HUB_COORDINATES = {
  Guwahati: { lat: 26.1445, lng: 91.7362 },
  Shillong: { lat: 25.5788, lng: 91.8933 },
  Silchar: { lat: 24.8170, lng: 92.7960 },
  Imphal: { lat: 24.8170, lng: 93.9368 },
  Agartala: { lat: 23.8315, lng: 91.2868 },
  Aizawl: { lat: 23.7271, lng: 92.7176 },
  Kohima: { lat: 25.6751, lng: 94.1086 },
  Itanagar: { lat: 27.0844, lng: 93.6053 },
  Gangtok: { lat: 27.3389, lng: 88.6065 },
  Dimapur: { lat: 25.9090, lng: 93.7266 },
  Jorhat: { lat: 26.7509, lng: 94.2037 },
  Dibrugarh: { lat: 27.4728, lng: 94.9120 },
  Haflong: { lat: 25.1667, lng: 93.0167 },
  Jiribam: { lat: 24.8021, lng: 93.1235 },
  Sonapur: { lat: 25.1147, lng: 92.3685 },
};

export default function VehicleManager({
  isOpen,
  onClose,
  onVehicleCreated,
  editingVehicleId,
  onCloseEdit,
}) {
  const { vehicles, addVehicle, updateVehicle } = useApp();

  // Mode: 'add' or 'edit'
  const isEditMode = Boolean(editingVehicleId);
  const targetVehicle = useMemo(
    () => vehicles.find((v) => v.id === editingVehicleId) || null,
    [vehicles, editingVehicleId]
  );

  // Form State for Adding Vehicle
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Truck');
  const [cargo, setCargo] = useState('Relief Supplies');
  const [capacity, setCapacity] = useState('5 Ton');
  const [origin, setOrigin] = useState('Guwahati');
  const [destination, setDestination] = useState('Silchar');
  const [status, setStatus] = useState('In Transit');
  const [priority, setPriority] = useState('HIGH');
  const [driverName, setDriverName] = useState('');
  const [latitude, setLatitude] = useState('26.1445');
  const [longitude, setLongitude] = useState('91.7362');

  // Edit / Telemetry Update State
  const [editStatus, setEditStatus] = useState('IN_TRANSIT');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editDelay, setEditDelay] = useState('0');
  const [editSpeed, setEditSpeed] = useState('45');

  // UI Telemetry States
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync Edit State when editingVehicleId changes
  React.useEffect(() => {
    if (targetVehicle) {
      setEditStatus(targetVehicle.status || 'IN_TRANSIT');
      setEditLat(targetVehicle.currentPos?.lat?.toFixed(4) || '25.5000');
      setEditLng(targetVehicle.currentPos?.lng?.toFixed(4) || '92.0000');
      setEditDelay(String(targetVehicle.delayEstMinutes || 0));
      setEditSpeed(String(targetVehicle.speedKmH || 45));
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [targetVehicle]);

  // Suggest Default Vehicle ID when opening add modal
  React.useEffect(() => {
    if (isOpen && !vehicleId) {
      setVehicleId(`NER-VH-${String(vehicles.length + 1).padStart(3, '0')}`);
      setRegNumber(`AS-01-FL-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [isOpen, vehicles.length, vehicleId]);

  if (!isOpen && !isEditMode) return null;

  // Handle Geolocation for New Vehicle
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Browser Geolocation unavailable. Manual coordinates remain active.');
      return;
    }
    setGpsLoading(true);
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(4));
        setLongitude(pos.coords.longitude.toFixed(4));
        setGpsLoading(false);
      },
      (err) => {
        console.warn('[GPS Geolocation] Error:', err.message);
        setErrorMessage('Could not acquire GPS position. Using manual coordinates.');
        setGpsLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Quick Preset Location Setter
  const applyPresetLocation = (hubKey) => {
    const coords = NER_HUB_COORDINATES[hubKey];
    if (coords) {
      setLatitude(coords.lat.toFixed(4));
      setLongitude(coords.lng.toFixed(4));
    }
  };

  // Advance / Simulate Step Towards Destination
  const handleSimulateStep = () => {
    if (!targetVehicle) return;
    const destCoords = NER_HUB_COORDINATES[targetVehicle.destination] || { lat: 24.8170, lng: 92.7960 };
    const currentLat = parseFloat(editLat) || targetVehicle.currentPos.lat;
    const currentLng = parseFloat(editLng) || targetVehicle.currentPos.lng;

    // Step 25% of remaining distance
    const nextLat = (currentLat + (destCoords.lat - currentLat) * 0.25).toFixed(4);
    const nextLng = (currentLng + (destCoords.lng - currentLng) * 0.25).toFixed(4);

    setEditLat(nextLat);
    setEditLng(nextLng);
    setEditSpeed('52');

    // If close to destination
    const distanceRemaining = Math.hypot(destCoords.lat - parseFloat(nextLat), destCoords.lng - parseFloat(nextLng));
    if (distanceRemaining < 0.05) {
      setEditStatus('AT_DESTINATION');
      setEditSpeed('0');
      setEditDelay('0');
    } else {
      setEditStatus('IN_TRANSIT');
    }
  };

  // Handle Add Vehicle Submission
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedId = vehicleId.trim();
    if (!trimmedId) {
      setErrorMessage('Vehicle ID is required (e.g. NER-VH-006).');
      return;
    }

    // Check duplicate in client state
    const duplicate = vehicles.some((v) => v.id.toLowerCase() === trimmedId.toLowerCase());
    if (duplicate) {
      setErrorMessage(`Vehicle ID '${trimmedId}' already exists in active fleet registry.`);
      return;
    }

    if (!origin || !destination) {
      setErrorMessage('Origin and Destination are required.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setErrorMessage('Valid numerical latitude and longitude coordinates are required.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        id: trimmedId,
        name: vehicleName.trim() || `NER ${vehicleType} (${origin} → ${destination})`,
        regNumber: regNumber.trim() || `NER-${Math.floor(1000 + Math.random() * 9000)}`,
        type: vehicleType,
        capacity: capacity || '5 Ton',
        cargo: cargo || 'Relief Supplies',
        origin,
        destination,
        status,
        priority,
        driverName: driverName.trim() || 'Authorized Operator',
        driverPhone: '+91-98640-XXXXX',
        latitude: latNum,
        longitude: lngNum,
      };

      const response = await api.createVehicle(payload);
      const savedVehicle = response.data || {
        ...payload,
        currentPos: { lat: latNum, lng: lngNum },
        assignedCorridor: `${origin} - ${destination}`,
        delayEstMinutes: status === 'Delayed' ? 45 : 0,
        speedKmH: status === 'In Transit' ? 45 : 0,
        status: status.toUpperCase().replace(/\s+/g, '_'),
      };

      addVehicle(savedVehicle);

      setSuccessMessage(`Vehicle ${savedVehicle.id} registered and deployed.`);
      setSubmitting(false);

      if (onVehicleCreated) {
        onVehicleCreated(savedVehicle);
      }

      setTimeout(() => {
        onClose();
        setSuccessMessage('');
        setVehicleId('');
      }, 1200);
    } catch (err) {
      console.error('[Vehicle Manager] Creation failed:', err);
      setErrorMessage(err.message || 'Failed to register vehicle with backend API.');
      setSubmitting(false);
    }
  };

  // Handle Edit / Telemetry Update Submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!targetVehicle) return;

    setErrorMessage('');
    setSuccessMessage('');

    const latNum = parseFloat(editLat);
    const lngNum = parseFloat(editLng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setErrorMessage('Valid numerical coordinates are required.');
      return;
    }

    setSubmitting(true);

    try {
      const updates = {
        status: editStatus,
        currentPos: { lat: latNum, lng: lngNum },
        latitude: latNum,
        longitude: lngNum,
        speedKmH: Number(editSpeed) || 0,
        delayEstMinutes: Number(editDelay) || 0,
      };

      await api.updateVehicle(targetVehicle.id, updates);
      updateVehicle(targetVehicle.id, updates);

      setSuccessMessage(`Telemetry updated for ${targetVehicle.id}.`);
      setSubmitting(false);

      setTimeout(() => {
        if (onCloseEdit) onCloseEdit();
        setSuccessMessage('');
      }, 900);
    } catch (err) {
      console.error('[Vehicle Manager] Update failed:', err);
      setErrorMessage(err.message || 'Failed to update vehicle telemetry.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto font-sans">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-white tracking-tight">
                {isEditMode ? `Update telemetry: ${targetVehicle?.id}` : 'Deploy supply vehicle'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditMode ? 'Live corridor position and speed telemetry' : 'Register emergency supply vehicle into active GIS fleet'}
              </p>
            </div>
          </div>
          <button
            onClick={isEditMode ? onCloseEdit : onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Feedback Banners */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <span className="font-bold text-rose-600">Error:</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <span className="font-bold text-emerald-600">Success:</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* ========================================================
              MODE A: TELEMETRY & STATUS UPDATE MODAL (EDIT MODE)
          ======================================================== */}
          {isEditMode && targetVehicle ? (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Vehicle unit:</span>
                  <span className="font-bold text-slate-900">{targetVehicle.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Assigned route:</span>
                  <span className="font-semibold text-blue-700">{targetVehicle.origin} → {targetVehicle.destination}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Cargo payload:</span>
                  <span className="font-medium text-slate-800">{targetVehicle.cargo} ({targetVehicle.capacity})</span>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Operational status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'IN_TRANSIT', label: 'In Transit' },
                    { value: 'DELAYED', label: 'Delayed' },
                    { value: 'EMERGENCY', label: 'Emergency' },
                    { value: 'AT_DESTINATION', label: 'At Destination' },
                  ].map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setEditStatus(st.value)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                        editStatus === st.value
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coordinates and Speed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GPS latitude (°N)
                  </label>
                  <input
                    type="text"
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GPS longitude (°E)
                  </label>
                  <input
                    type="text"
                    value={editLng}
                    onChange={(e) => setEditLng(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimated delay (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={editDelay}
                    onChange={(e) => setEditDelay(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Speed (km/h)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={editSpeed}
                    onChange={(e) => setEditSpeed(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Quick Simulate Movement Step */}
              <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3.5 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="font-semibold text-slate-900">Simulation telemetry:</div>
                  <div className="text-slate-500 text-xs">Advance vehicle along corridor towards {targetVehicle.destination}</div>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateStep}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span>Advance 1 step</span>
                  <span>→</span>
                </button>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onCloseEdit}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save telemetry'}
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================
                MODE B: ADD NEW VEHICLE MODAL
            ======================================================== */
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Row 1: ID and Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NER-VH-006"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AS-01-FL-8819"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 2: Type and Cargo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="Truck">Truck</option>
                    <option value="Heavy Truck">Heavy Truck</option>
                    <option value="Ambulance">Ambulance</option>
                    <option value="Supply Vehicle">Supply Vehicle</option>
                    <option value="Excavator">Excavator</option>
                    <option value="Rescue Vehicle">Rescue Vehicle</option>
                    <option value="Fuel Tanker">Fuel Tanker</option>
                    <option value="Refrigerated Van">Refrigerated Van</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cargo payload
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Relief Supplies"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Capacity
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5 Ton / 10,000L"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 3: Origin & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Origin <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={origin}
                    onChange={(e) => {
                      setOrigin(e.target.value);
                      applyPresetLocation(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  >
                    {Object.keys(NER_HUB_COORDINATES).map((hub) => (
                      <option key={hub} value={hub}>
                        {hub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  >
                    {Object.keys(NER_HUB_COORDINATES).map((hub) => (
                      <option key={hub} value={hub}>
                        {hub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Status and Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="In Transit">In Transit (Active on Corridors)</option>
                    <option value="Idle">Idle (Depot Staged)</option>
                    <option value="Delayed">Delayed (Corridor Congestion)</option>
                    <option value="Emergency">Emergency (Immediate Priority)</option>
                    <option value="At Destination">At Destination (Completed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mission priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="HIGH">High priority</option>
                    <option value="EMERGENCY_CRITICAL">Emergency critical</option>
                    <option value="MEDIUM">Medium standard</option>
                  </select>
                </div>
              </div>

              {/* Location Section */}
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    GPS coordinates
                  </span>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gpsLoading}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1"
                  >
                    <span>📍</span>
                    <span>{gpsLoading ? 'Acquiring...' : 'Use Current GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Latitude (e.g. 26.1445)"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Longitude (e.g. 91.7362)"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                  <span className="text-slate-500 font-medium">Presets:</span>
                  {['Guwahati', 'Shillong', 'Silchar', 'Sonapur', 'Haflong'].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => applyPresetLocation(h)}
                      className="px-2 py-0.5 rounded-md border border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-100 text-slate-700 font-medium transition-colors text-xs"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>{submitting ? 'Registering...' : 'Register & track vehicle'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
