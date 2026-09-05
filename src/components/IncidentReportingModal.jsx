import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function IncidentReportingModal({ isOpen, onClose, onIncidentCreated }) {
  const { addIncident, addAlert } = useApp();

  // Form State
  const [incidentType, setIncidentType] = useState('Landslide');
  const [severity, setSeverity] = useState('HIGH');
  const [latitude, setLatitude] = useState('25.1147');
  const [longitude, setLongitude] = useState('92.3685');
  const [reportedBy, setReportedBy] = useState('Field Officer D. Sangma (Patrol 4)');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Status & Progress
  const [status, setStatus] = useState('idle'); // idle | uploading | verifying | result | error
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  if (!isOpen) return null;

  // Handle GPS Auto-Detect
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Browser Geolocation is not supported by your environment. Please enter coordinates manually.');
      return;
    }

    setGpsLoading(true);
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(4));
        setLongitude(position.coords.longitude.toFixed(4));
        setGpsLoading(false);
      },
      (err) => {
        console.warn('[GPS Geolocation] Error:', err.message);
        setErrorMessage('Could not acquire GPS position. Manual coordinates enabled.');
        setGpsLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Preset Coordinator Setter
  const applyPreset = (lat, lng, label) => {
    setLatitude(lat);
    setLongitude(lng);
    setDescription((prev) => (prev ? prev : `Field report logged near ${label}`));
  };

  // Handle File Selection & Preview
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Unsupported file format. Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Image file is too large (Exceeds 8MB limit). Please upload a smaller photo.');
      return;
    }

    setErrorMessage('');
    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!incidentType) {
      setErrorMessage('Please select an incident type.');
      return;
    }

    if (!latitude || !longitude || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      setErrorMessage('Valid numerical GPS latitude and longitude coordinates are required.');
      return;
    }

    if (!imageFile) {
      setErrorMessage('Please upload photo evidence of the incident for AI verification.');
      return;
    }

    let verifyingTimer = null;
    try {
      setStatus('uploading');
      setStatusMessage('Uploading photographic evidence...');

      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('incidentType', incidentType);
      formData.append('severity', severity);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('reportedBy', reportedBy);
      formData.append('description', description);

      verifyingTimer = setTimeout(() => {
        setStatus('verifying');
        setStatusMessage('Groq Vision AI verifying road obstruction...');
      }, 700);

      const response = await api.verifyIncident(formData);
      if (verifyingTimer) clearTimeout(verifyingTimer);

      if (response && response.success) {
        const resultData = response.data || response;
        setVerificationResult(resultData);
        setStatus('result');

        if (resultData.verified) {
          if (resultData.incident) {
            addIncident(resultData.incident);
          }
          if (resultData.alert) {
            addAlert(resultData.alert);
          }
          if (onIncidentCreated) {
            onIncidentCreated(resultData.incident?.id || resultData.incidentId);
          }
        }
      } else {
        throw new Error(response?.message || 'Verification pipeline encountered an error.');
      }
    } catch (err) {
      if (verifyingTimer) clearTimeout(verifyingTimer);
      console.error('[Incident Reporting] Submission error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to submit or verify incident with regional server.');
    }
  };

  const handleResetAndClose = () => {
    setStatus('idle');
    setVerificationResult(null);
    setImageFile(null);
    setImagePreview(null);
    setDescription('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto font-sans">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <span className="material-symbols-outlined text-xl">report_problem</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base text-white tracking-tight">
                  Report incident & verify with AI
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-rose-400 text-[10px] font-mono font-semibold border border-rose-500/30">
                  Groq Vision
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Log road obstruction, upload evidence photo, and trigger automated verification
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ========================================================
            VERIFICATION RESULT MODAL
        ======================================================== */}
        {status === 'result' && verificationResult && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto animate-fade-in">
            {verificationResult.verified ? (
              /* VERIFIED CARD */
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      ✓
                    </span>
                    <span className="font-heading font-bold text-sm text-emerald-900">
                      Incident verified by AI vision
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold">
                    {(verificationResult.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-emerald-100 space-y-1">
                    <div className="text-slate-500 text-[11px] uppercase font-semibold">Disruption Classification</div>
                    <div className="font-bold text-slate-900 text-sm">{verificationResult.classification}</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-emerald-100 space-y-1">
                    <div className="text-slate-500 text-[11px] uppercase font-semibold">Corridor Location</div>
                    <div className="font-bold text-slate-900 text-sm">
                      {verificationResult.incident?.location || verificationResult.incident?.corridorName || 'Assigned Corridor'}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-emerald-100 text-xs text-slate-700 space-y-1.5 leading-relaxed">
                  <div>
                    <span className="font-bold text-emerald-800">Visual Evidence:</span>{' '}
                    <span>{verificationResult.evidence || verificationResult.reasoning || verificationResult.damageAssessment || verificationResult.damage_assessment}</span>
                  </div>
                  {(verificationResult.operationalImpact || verificationResult.damageAssessment || verificationResult.damage_assessment) && (
                    <div>
                      <span className="font-bold text-slate-800">Impact Assessment:</span>{' '}
                      <span>{verificationResult.operationalImpact || verificationResult.damageAssessment || verificationResult.damage_assessment}</span>
                    </div>
                  )}
                  {(verificationResult.recommendedResponse || verificationResult.recommendedAction || verificationResult.recommended_action) && (
                    <div>
                      <span className="font-bold text-blue-800">Recommended Action:</span>{' '}
                      <span>{verificationResult.recommendedResponse || verificationResult.recommendedAction || verificationResult.recommended_action}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Alert active on GIS map</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    View on map →
                  </button>
                </div>
              </div>
            ) : (
              /* REJECTED CARD */
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                      ✕
                    </span>
                    <span className="font-heading font-bold text-sm text-rose-900">
                      AI verification inconclusive
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-xs font-semibold">
                    {(verificationResult.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-rose-200 text-xs text-slate-700 space-y-1.5">
                  <div>
                    <span className="font-bold text-rose-700">Reasoning:</span>{' '}
                    <span>{verificationResult.reasoning || verificationResult.message || 'Image does not show clear evidence of road obstruction or disaster.'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600">Observed Status:</span>{' '}
                    <span className="font-semibold">{verificationResult.classification || 'Clear Roadway'}</span>
                  </div>
                  <p className="text-xs text-slate-500 pt-1">
                    No false alert was broadcast to the logistics network.
                  </p>
                </div>

                <div className="pt-3 border-t border-rose-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Please capture a clear photo of road damage.</span>
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                  >
                    Upload different photo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            LOADING SPINNER SCREEN
        ======================================================== */}
        {(status === 'uploading' || status === 'verifying') && (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-slate-200 border-t-blue-600 animate-spin"></div>
            <div className="space-y-1">
              <div className="font-heading font-bold text-base text-slate-900">
                {statusMessage}
              </div>
              <p className="text-xs text-slate-500">
                Evaluating scene structure, debris morphology, and highway accessibility...
              </p>
            </div>
          </div>
        )}

        {/* ========================================================
            MAIN REPORTING FORM
        ======================================================== */}
        {(status === 'idle' || status === 'error') && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <span className="font-bold">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Row 1: Incident Type & Severity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Incident type <span className="text-rose-600">*</span>
                </label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg text-slate-900 text-xs p-2.5 font-medium focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
                >
                  <option value="Landslide">Landslide / Slope Failure</option>
                  <option value="Flash Flood">Flash Flood / Road Submersion</option>
                  <option value="Bridge Damage">Bridge Damage / Pier Scour</option>
                  <option value="Roadblock">Roadblock / Tree Collapse</option>
                  <option value="Road Damage">Pavement Slush & Collapse</option>
                  <option value="Other">Other Corridor Disruption</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  2. Severity level
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSeverity(lvl)}
                      className={`py-2 text-center rounded-lg text-xs font-bold transition-all ${
                        severity === lvl
                          ? lvl === 'CRITICAL'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : lvl === 'HIGH'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Location & GPS Auto-Detect */}
            <div className="border border-slate-200 rounded-xl bg-slate-50/50 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  3. GPS coordinates (WGS-84)
                </label>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={gpsLoading}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-sm text-blue-600">my_location</span>
                  <span>{gpsLoading ? 'Acquiring...' : 'Use Current GPS'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Latitude (°N)</span>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="25.1147"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-blue-600 shadow-2xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Longitude (°E)</span>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="92.3685"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-blue-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-slate-500 text-xs font-medium">Presets:</span>
                {[
                  { lat: '25.1147', lng: '92.3685', name: 'Sonapur NH-6' },
                  { lat: '26.3456', lng: '92.6841', name: 'Nagaon NH-27' },
                  { lat: '24.8021', lng: '93.1235', name: 'Jiribam NH-37' },
                  { lat: '25.5788', lng: '91.8933', name: 'Shillong Hub' },
                ].map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p.lat, p.lng, p.name)}
                    className="px-2 py-0.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Photo Upload & Preview Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                4. Photographic evidence <span className="text-rose-600">*</span>
              </label>

              {imagePreview ? (
                <div className="border border-slate-200 rounded-xl bg-slate-50 p-3 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-48 h-32 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-300 shadow-xs">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-1.5 text-xs">
                    <div className="font-bold text-slate-900 truncate">{imageFile?.name}</div>
                    <div className="text-xs text-slate-500">
                      Size: {(imageFile?.size / 1024).toFixed(1)} KB • Format: {imageFile?.type}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="px-3 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-colors mt-2"
                    >
                      Remove / Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50/50 p-6 text-center transition-colors cursor-pointer relative group">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1.5 text-slate-700">
                    <span className="material-symbols-outlined text-3xl text-blue-600 group-hover:scale-110 transition-transform">
                      add_photo_alternate
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Click or drag photographic evidence here
                    </span>
                    <span className="text-xs text-slate-400">
                      JPG, PNG, WEBP (Max 8MB)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Row 4: Officer Name & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  5. Reporting officer / unit
                </label>
                <input
                  type="text"
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                  placeholder="Officer Name / Unit ID"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-blue-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  6. Operational description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Mudflow across 40m highway stretch"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-blue-600 shadow-2xs"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 hidden sm:inline">
                Groq Vision AI verification required before broadcasting
              </span>
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span>Verify with AI & submit</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
