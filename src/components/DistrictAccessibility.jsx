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
    <div className="w-full max-w-full min-w-0 bg-white rounded-2xl border border-slate-200/90 shadow-card flex flex-col font-sans overflow-hidden">
      {/* Top Header & Executive Summary Ribbon */}
      <div className="border-b border-slate-100 bg-[#0B1220] text-white p-3.5 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            <span className="text-xs text-slate-400 font-semibold truncate">
              Regional Accessibility Scorecard
            </span>
            <InfoPopover conceptKey="REGIONAL_ACCESSIBILITY" iconSize="w-3.5 h-3.5" />
          </div>
          <h3 className="font-heading font-bold text-sm sm:text-base md:text-lg text-white mt-1 leading-snug">
            District Road Accessibility & Vulnerability Status
          </h3>
        </div>

        {/* Executive Summary Stats - 2x2 grid on mobile (< sm), wrapping row on sm/md, flex on lg */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full lg:w-auto min-w-0">
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-between sm:justify-start gap-1.5 font-mono text-[11px] sm:text-xs">
            <span className="text-slate-400 font-sans text-[10px] sm:text-[11px]">Avg:</span>
            <span className="text-white font-bold">{stats.avgScore}%</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold flex items-center justify-between sm:justify-start gap-1.5 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="truncate">{stats.accessible} Accessible</span>
            </div>
          </div>
          <div className="px-2.5 py-1.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-300 font-semibold flex items-center justify-between sm:justify-start gap-1.5 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
              <span className="truncate">{stats.watch} Watch</span>
            </div>
          </div>
          <div className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 font-semibold flex items-center justify-between sm:justify-start gap-1.5 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
              <span className="truncate">{stats.restricted} Restricted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="border-b border-slate-200/80 bg-slate-50/80 p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 text-xs w-full min-w-0">
        {/* State Filter Pills Rail - Horizontally Scrollable inside its own container without causing page scroll */}
        <div className="w-full md:flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold text-xs shrink-0 select-none">State:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-1 py-1 px-0.5 no-scrollbar touch-pan-x">
            {states.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterState(st)}
                className={`px-3 py-1.5 rounded-lg transition-all font-semibold whitespace-nowrap shrink-0 cursor-pointer touch-target sm:min-h-0 text-xs ${
                  filterState === st
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 active:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Search Box */}
        <div className="w-full md:w-64 shrink-0 relative flex items-center">
          <input
            type="text"
            placeholder="Search district or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* DESKTOP VIEW: Analytical 6-Column Data Table (Hidden on Mobile/Tablet < 1024px) */}
      <div className="hidden lg:block overflow-x-auto max-h-[540px] w-full min-w-0">
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

      {/* MOBILE ONLY VIEW: Stacked Operational District Cards (< 1024px) */}
      <div className="lg:hidden p-3 sm:p-4 space-y-2.5 w-full min-w-0">
        {filteredDistricts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl">
            No districts match current filter criteria.
          </div>
        ) : (
          filteredDistricts.map((d) => {
            const tier = getStatusTier(d.accessibilityScore);
            return (
              <div
                key={d.id}
                onClick={() => onSelectDistrict && onSelectDistrict(d)}
                className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs hover:border-slate-300 transition-all cursor-pointer active:bg-slate-50 flex flex-col gap-2.5 min-w-0 w-full"
              >
                {/* Top Row: District Name & Status Badge */}
                <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading font-bold text-slate-900 text-sm sm:text-base leading-snug break-words">
                      {d.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{d.state}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border uppercase shrink-0 font-mono tracking-wide ${tier.badge}`}>
                    {tier.label}
                  </span>
                </div>

                {/* Score Progress Bar */}
                <div className="space-y-1.5 w-full min-w-0">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-600 font-sans text-xs font-medium">Accessibility:</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm font-mono">{d.accessibilityScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${tier.bar}`}
                      style={{ width: `${Math.min(Math.max(d.accessibilityScore, 0), 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Metadata Row: Vulnerability Index & District ID */}
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg w-full min-w-0">
                  <span className="truncate">
                    Vuln Index: <strong className="text-slate-800 font-semibold">{d.vulnerabilityIndex !== undefined ? d.vulnerabilityIndex.toFixed(2) : '0.35'}</strong>
                  </span>
                  <span className="text-slate-400 font-semibold shrink-0 ml-2">{d.id}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
