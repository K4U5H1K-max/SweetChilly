import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import InfoPopover from './common/InfoPopover';

export default function DistrictAccessibility({ onSelectDistrict }) {
  const { districts } = useApp();
  const [filterState, setFilterState] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const states = useMemo(() => ['ALL', ...new Set(districts.map((d) => d.state))], [districts]);

  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => {
      const matchesState = filterState === 'ALL' || d.state === filterState;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || d.name.toLowerCase().includes(q) || d.state.toLowerCase().includes(q);
      return matchesState && matchesSearch;
    });
  }, [districts, filterState, searchQuery]);

  // Summary Metrics Breakdown
  const stats = useMemo(() => {
    const accessible = districts.filter((d) => d.accessibilityScore >= 85).length;
    const watch = districts.filter((d) => d.accessibilityScore >= 70 && d.accessibilityScore < 85).length;
    const restricted = districts.filter((d) => d.accessibilityScore < 70).length;
    const avgScore = (districts.reduce((acc, d) => acc + d.accessibilityScore, 0) / (districts.length || 1)).toFixed(1);
    return { accessible, watch, restricted, avgScore };
  }, [districts]);

  const getStatusTier = (score) => {
    if (score >= 85) {
      return {
        label: 'Accessible',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        bar: 'bg-emerald-500',
      };
    }
    if (score >= 70) {
      return {
        label: 'Watch',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        bar: 'bg-amber-500',
      };
    }
    return {
      label: 'Restricted',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      bar: 'bg-rose-500',
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card flex flex-col overflow-hidden font-sans">
      {/* Top Header & Executive Summary Ribbon */}
      <div className="border-b border-slate-100 bg-[#0B1220] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-slate-400 font-semibold">
              Regional Accessibility Scorecard
            </span>
            <InfoPopover conceptKey="REGIONAL_ACCESSIBILITY" iconSize="w-3.5 h-3.5" />
          </div>
          <h3 className="font-heading font-bold text-base text-white mt-0.5">
            District Road Accessibility & Vulnerability Status
          </h3>
        </div>

        {/* Executive Summary Stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2 font-mono">
            <span className="text-slate-400 font-sans">Regional Average:</span>
            <span className="text-white font-bold">{stats.avgScore}%</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{stats.accessible} Accessible</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-300 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>{stats.watch} Watch</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>{stats.restricted} Restricted</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="border-b border-slate-200/80 bg-slate-50/80 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* State Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          <span className="text-slate-500 font-semibold text-xs mr-1">State:</span>
          {states.map((st) => (
            <button
              key={st}
              onClick={() => setFilterState(st)}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap cursor-pointer ${
                filterState === st
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search district or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-slate-500 shadow-2xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* District Analytical Data Table */}
      <div className="overflow-x-auto max-h-[460px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-semibold sticky top-0 z-10 backdrop-blur-xs">
              <th className="py-2.5 px-4">District & Region</th>
              <th className="py-2.5 px-4">State</th>
              <th className="py-2.5 px-4">Accessibility Score</th>
              <th className="py-2.5 px-4">Status Tier</th>
              <th className="py-2.5 px-4">Vulnerability Index</th>
              <th className="py-2.5 px-4 text-right">District ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDistricts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                  No districts match current filter criteria.
                </td>
              </tr>
            ) : (
              filteredDistricts.map((d) => {
                const tier = getStatusTier(d.accessibilityScore);
                return (
                  <tr
                    key={d.id}
                    onClick={() => onSelectDistrict && onSelectDistrict(d)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">{d.name}</td>
                    <td className="py-3 px-4 text-slate-600">{d.state}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 w-9">{d.accessibilityScore}%</span>
                        <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden hidden sm:block">
                          <div className={`h-full ${tier.bar}`} style={{ width: `${d.accessibilityScore}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${tier.badge}`}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {d.vulnerabilityIndex !== undefined ? d.vulnerabilityIndex.toFixed(2) : '0.35'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-right">{d.id}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
