import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const NER_HUBS = [
  'Guwahati',
  'Shillong',
  'Silchar',
  'Imphal',
  'Agartala',
  'Aizawl',
  'Kohima',
  'Itanagar',
  'Gangtok',
  'Siliguri',
  'Dimapur',
  'Jorhat',
  'Dibrugarh',
];

export default function RoutePlannerModal({
  isOpen,
  onClose,
  onRouteProjected,
  onDeployOnRoute,
  initialOrigin,
  initialDestination,
}) {
  const { setActiveRoute } = useApp();

  const [origin, setOrigin] = useState(initialOrigin || 'Guwahati');
  const [destination, setDestination] = useState(initialDestination || 'Silchar');
  const [vehicleType, setVehicleType] = useState('Refrigerated Medical Van');
  const [cargo, setCargo] = useState('Vaccines & Blood Plasma');
  const [priority, setPriority] = useState('EMERGENCY_CRITICAL');
  const [avoidDisruptions, setAvoidDisruptions] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [routeResult, setRouteResult] = useState(null);

  React.useEffect(() => {
    if (initialOrigin) setOrigin(initialOrigin);
    if (initialDestination) setDestination(initialDestination);
  }, [initialOrigin, initialDestination]);

  if (!isOpen) return null;

  const handlePlanRoute = async (e) => {
    e.preventDefault();
    if (origin === destination) {
      setErrorMessage('Origin and Destination must be different logistics hubs.');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    setLoadingStep('Consulting GIS elevation & active hazard telemetry...');

    try {
      setTimeout(() => {
        setLoadingStep('Computing disruption-aware corridor route with AI...');
      }, 700);

      const payload = {
        origin,
        destination,
        vehicleType,
        cargo,
        priority,
        avoidDisruptions,
      };

      const res = await api.planRoute(payload);
      if (res.success && res.data) {
        setRouteResult(res.data);
      } else {
        throw new Error(res.message || 'Failed to generate optimal route plan.');
      }
    } catch (err) {
      console.error('[Route Planner] Error:', err);
      setErrorMessage(err.message || 'Failed to connect to AI Route Planning Engine.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleApplyToMap = () => {
    if (!routeResult) return;
    setActiveRoute(routeResult);
    if (onRouteProjected) {
      onRouteProjected(routeResult);
    }
    onClose();
  };

  const handleDeployVehicle = () => {
    if (!routeResult) return;
    setActiveRoute(routeResult);
    if (onDeployOnRoute) {
      onDeployOnRoute({
        origin: routeResult.origin,
        destination: routeResult.destination,
        vehicleType: routeResult.vehicleType,
        cargo: routeResult.cargo,
        priority: routeResult.priority,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto font-sans">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base text-white tracking-tight">
                  AI disruption-aware route planner
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 text-[10px] font-mono font-semibold border border-amber-500/30">
                  NER-OPT-V2
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-corridor terrain analysis avoiding landslides, flood zones, and restrictions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Feedback Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <span className="font-bold text-rose-600">Error:</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Route Planning Form */}
          {!routeResult ? (
            <form onSubmit={handlePlanRoute} className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-950 flex items-start gap-3">
                <span className="text-blue-600 font-bold text-base mt-[-2px]">ℹ</span>
                <p className="leading-relaxed">
                  <span className="font-semibold">AI Routing Engine</span> continuously analyzes highway elevation, active landslide advisories, and road closures to compute the safest passable corridor for your fleet.
                </p>
              </div>

              {/* Origin & Destination Hubs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Origin depot <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  >
                    {NER_HUBS.map((hub) => (
                      <option key={hub} value={hub}>
                        {hub} (Departure Hub)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination terminal <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  >
                    {NER_HUBS.map((hub) => (
                      <option key={hub} value={hub}>
                        {hub} (Delivery Terminal)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fleet & Cargo Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="Refrigerated Medical Van">Refrigerated Medical Van</option>
                    <option value="Heavy Cargo Truck">Heavy Cargo Truck (12T+)</option>
                    <option value="Light Commercial Vehicle">Light Commercial Vehicle (&lt;5T)</option>
                    <option value="Fuel Tanker">Fuel Tanker</option>
                    <option value="Emergency Rescue Vehicle">Emergency Rescue Vehicle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cargo payload
                  </label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="e.g. Vaccines, Fortified Rice"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mission priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="EMERGENCY_CRITICAL">Emergency critical</option>
                    <option value="HIGH">High priority</option>
                    <option value="STANDARD">Standard dispatch</option>
                  </select>
                </div>
              </div>

              {/* Disruption Avoidance Checkbox */}
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="avoid-disruptions"
                    checked={avoidDisruptions}
                    onChange={(e) => setAvoidDisruptions(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="avoid-disruptions" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    Bypass active landslides, flood bottlenecks and road closures
                  </label>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full hidden sm:inline">
                  Recommended
                </span>
              </div>

              {/* Submit Action */}
              <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Groq AI routing engine with topography analysis
                </span>

                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2 shadow-xs"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>{loadingStep || 'Optimizing corridor...'}</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Generate optimal route</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ========================================================
                ROUTE CALCULATION RESULT DISPLAY
            ======================================================== */
            <div className="space-y-4 animate-fade-in text-xs">
              {/* Status & Corridor Banner */}
              <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 flex flex-col gap-2 shadow-md">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                    <span className="font-bold text-xs text-emerald-400">
                      Optimal corridor route generated
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Ref: {routeResult.routeId}</span>
                </div>

                <div className="font-heading font-bold text-base text-white pt-1">
                  {routeResult.recommendedCorridor}
                </div>

                <div className="text-xs text-slate-300 leading-relaxed">{routeResult.summary}</div>
              </div>

              {/* Metrics HUD Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col">
                  <span className="text-[11px] text-slate-500 font-semibold">Total distance</span>
                  <span className="font-bold text-base text-slate-900 font-mono mt-0.5">{routeResult.distanceKm} km</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col">
                  <span className="text-[11px] text-slate-500 font-semibold">Estimated transit</span>
                  <span className="font-bold text-base text-slate-900 font-mono mt-0.5">~{routeResult.estimatedDurationHours} hrs</span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col">
                  <span className="text-[11px] text-emerald-700 font-semibold">Delay saved</span>
                  <span className="font-bold text-base text-emerald-800 font-mono mt-0.5">+{routeResult.delayAvoidedMinutes || 180} mins</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col">
                  <span className="text-[11px] text-slate-500 font-semibold">Mission priority</span>
                  <span className="font-bold text-xs text-blue-700 pt-1 mt-0.5">{routeResult.priority}</span>
                </div>
              </div>

              {/* Avoided Disruptions Alert Card */}
              {routeResult.avoidedIncidents?.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                  <div className="font-bold text-rose-800 text-xs flex items-center gap-1.5">
                    <span>⚠️ Bottlenecks bypassed:</span>
                  </div>
                  <div className="space-y-1">
                    {routeResult.avoidedIncidents.map((inc, idx) => (
                      <div key={idx} className="text-xs text-rose-900 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Terrain Advisory */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-semibold text-slate-700 text-xs">Terrain advisory:</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {routeResult.terrainAdvisory}
                </p>
              </div>

              {/* Waypoint Milestones Table */}
              <div>
                <span className="block font-semibold text-slate-700 text-xs mb-1.5">
                  Corridor waypoints and checkpoints:
                </span>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 text-xs font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Seq</th>
                        <th className="p-2.5">Waypoint node</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Coordinates</th>
                        <th className="p-2.5">Tactical note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {routeResult.waypoints.map((wp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-bold text-slate-500 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{wp.name}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-md uppercase font-bold text-[9px] ${
                                wp.type === 'DETOUR'
                                  ? 'bg-amber-100 text-amber-800'
                                  : wp.type === 'ORIGIN' || wp.type === 'DESTINATION'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {wp.type}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                            {wp.lat.toFixed(4)}°N, {wp.lng.toFixed(4)}°E
                          </td>
                          <td className="p-2.5 text-slate-600 text-xs">{wp.note || 'Nominal Passable'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Bar */}
              <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setRouteResult(null)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  ← Reconfigure route
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeployVehicle}
                    className="px-4 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-colors shadow-xs"
                  >
                    Deploy vehicle on route
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyToMap}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <span>Project on GIS map</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
