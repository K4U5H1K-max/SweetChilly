import React from 'react';
import { useApp } from '../context/AppContext';

export default function CommandCenterKPIs() {
  const { kpis, incidents, vehicles } = useApp();

  const cards = [
    {
      id: 'kpi-accessibility',
      code: 'Regional accessibility',
      label: 'Regional road readiness',
      value: kpis.districtAccessibility || '78.4%',
      subtext: 'Across 16 monitored districts',
      badge: parseFloat(kpis.districtAccessibility) >= 80 ? 'Nominal' : 'Degraded',
      badgeClass: parseFloat(kpis.districtAccessibility) >= 80
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200',
      icon: 'insights',
      accentColor: 'border-l-4 border-l-emerald-500',
    },
    {
      id: 'kpi-districts',
      code: 'Districts monitored',
      label: 'GIS boundary coverage',
      value: kpis.districtsMonitored || 16,
      subtext: '16 regional administrative hubs',
      badge: '100% Coverage',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: 'map',
      accentColor: 'border-l-4 border-l-blue-500',
    },
    {
      id: 'kpi-alerts',
      code: 'Active disruptions',
      label: 'Corridor hazards & blocks',
      value: kpis.activeAlerts || 3,
      subtext: `${incidents.length} field reports logged`,
      badge: `${kpis.criticalBottlenecks || 2} Critical`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: 'warning',
      accentColor: 'border-l-4 border-l-rose-500',
    },
    {
      id: 'kpi-vehicles',
      code: 'Vehicles in transit',
      label: 'Active supply fleet units',
      value: kpis.vehiclesInTransit || 4,
      subtext: `${vehicles.length} total vehicles registered`,
      badge: 'Active Transit',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: 'local_shipping',
      accentColor: 'border-l-4 border-l-indigo-500',
    },
    {
      id: 'kpi-delay',
      code: 'Average corridor delay',
      label: 'Highway transit delay',
      value: kpis.averageCorridorDelay || '42 mins',
      subtext: 'Monsoon & bottleneck impact',
      badge: 'Elevated Risk',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: 'timer',
      accentColor: 'border-l-4 border-l-amber-500',
    },
  ];

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-sans">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${card.accentColor}`}
        >
          {/* Top Label & Status Badge */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-semibold text-slate-600 truncate">
              {card.code}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${card.badgeClass} whitespace-nowrap`}
            >
              {card.badge}
            </span>
          </div>

          {/* Value Display */}
          <div className="my-1">
            <div className="text-2xl font-bold font-heading tracking-tight text-slate-900 leading-none">
              {card.value}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1.5 truncate">
              {card.label}
            </div>
          </div>

          {/* Footer Subtext */}
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="truncate">{card.subtext}</span>
            <span className="material-symbols-outlined text-sm text-slate-400">
              {card.icon}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
