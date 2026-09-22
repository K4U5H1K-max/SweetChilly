import React, { useState } from 'react';
import { NER_CITIES, NER_CORRIDORS, NER_DISTRICTS } from '../../data/nerData';
import api from '../../services/api';

export default function UserRouteIntelligenceView() {
  const [selectedOrigin, setSelectedOrigin] = useState('Guwahati');
  const [selectedDestination, setSelectedDestination] = useState('Silchar');
  const [avoidDisruptions, setAvoidDisruptions] = useState(true);

  const [routePlan, setRoutePlan] = useState(null);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [planningError, setPlanningError] = useState(null);

  const matchingCorridor = NER_CORRIDORS.find(
    (c) => (c.origin === selectedOrigin && c.destination === selectedDestination) ||
           (c.origin === selectedDestination && c.destination === selectedOrigin)
  );

  const handlePlanRoute = async () => {
    setPlanningLoading(true);
    setPlanningError(null);
    try {
      const res = await api.planRoute({
        origin: selectedOrigin,
        destination: selectedDestination,
        vehicleType: 'Heavy Cargo Truck (10-Ton)',
        cargo: 'Essential Logistics Supplies',
        priority: 'HIGH',
        avoidDisruptions,
      });

      if (res && res.data) {
        setRoutePlan(res.data);
      } else if (res && res.success !== false) {
        setRoutePlan(res);
      } else {
        throw new Error(res?.message || 'Failed to calculate route plan.');
      }
    } catch (err) {
      setPlanningError(err.message || 'Error generating route plan.');
    } finally {
      setPlanningLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h2 className="text-xl font-heading font-bold text-slate-900">NER Corridor & Route Feasibility Intelligence</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time highway vulnerability scores, weather advisories, and transit duration estimates across North Eastern regional arteries.
        </p>
      </div>

      {/* Corridor Selector & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-sm text-slate-800">Tactical Route Planner</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Origin Node</label>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              {NER_CITIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Node</label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              {NER_CITIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="avoidDisruptions"
              checked={avoidDisruptions}
              onChange={(e) => setAvoidDisruptions(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="avoidDisruptions" className="text-xs text-slate-700 font-medium cursor-pointer">
              Bypass active flood & landslide blockades
            </label>
          </div>

          <button
            onClick={handlePlanRoute}
            disabled={planningLoading || selectedOrigin === selectedDestination}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {planningLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            )}
            <span>{planningLoading ? 'Evaluating Feasibility...' : 'Calculate Optimal Corridor'}</span>
          </button>

          {planningError && (
            <p className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {planningError}
            </p>
          )}

          <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Standard Distance:</span>
              <span className="font-mono font-bold text-slate-800">
                {matchingCorridor ? `${matchingCorridor.lengthKm} km` : 'Direct corridor'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Base Transit Time:</span>
              <span className="font-mono font-bold text-slate-800">
                {matchingCorridor ? `${matchingCorridor.avgTransitHours} hrs` : '4.5 hrs'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Direct Corridor Status:</span>
              <span className={`font-semibold ${
                matchingCorridor?.status === 'DISRUPTED'
                  ? 'text-rose-600'
                  : matchingCorridor?.status === 'CAUTION'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}>
                {matchingCorridor?.status || 'OPEN'}
              </span>
            </div>
          </div>
        </div>

        {/* Calculated Tactical Plan / District Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {routePlan ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-wider">
                    Calculated Tactical Plan
                  </span>
                  <h3 className="font-heading font-bold text-base text-slate-900 mt-0.5">
                    {routePlan.recommendedCorridor || `${selectedOrigin} $\rightarrow$ ${selectedDestination}`}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  OPTIMAL ROUTE
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Route Distance</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{routePlan.distanceKm} km</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Est. Transit</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">~{routePlan.estimatedDurationHours} hrs</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Delay Avoided</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">{routePlan.delayAvoidedMinutes || 0} min</span>
                </div>
              </div>

              {/* Advisories */}
              <div className="space-y-2 text-xs">
                {routePlan.avoidedIncidents && routePlan.avoidedIncidents.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900">
                    <span className="font-bold block mb-1">🛡️ Active Disruptions Bypassed:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      {routePlan.avoidedIncidents.map((inc, i) => (
                        <li key={i}>{inc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Terrain & Safety Advisory:</span>
                  <p className="text-[11px] leading-relaxed">{routePlan.terrainAdvisory || routePlan.summary}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Regional District Accessibility Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-sm text-slate-800">Regional District Accessibility Matrix</h3>
              <span className="text-[11px] font-mono text-slate-400">NER Logistics Grid</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {NER_DISTRICTS.map((d) => (
                <div
                  key={d.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-heading font-bold text-xs text-slate-800">{d.name}</h4>
                    <p className="text-[10px] text-slate-500">{d.state}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-mono font-bold ${
                      d.accessibilityScore >= 80
                        ? 'text-emerald-600'
                        : d.accessibilityScore >= 65
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}>
                      {d.accessibilityScore}% Access
                    </span>
                    <span className="block text-[9px] font-semibold uppercase text-slate-400">
                      {d.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
