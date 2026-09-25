import React from 'react';
import { useApp } from '../context/AppContext';
import {
  IconRoad,
  IconMap,
  IconWarning,
  IconTruck,
  IconClock,
} from './common/AppIcons';
import InfoPopover from './common/InfoPopover';

export default function CommandCenterKPIs() {
  const { kpis, incidents, vehicles, activeDeployments, availableVehicles, alerts } = useApp();

  const activeDepsCount = activeDeployments ? activeDeployments.length : (kpis.vehiclesInTransit || 0);
  const availCount = availableVehicles ? availableVehicles.length : vehicles.length;
  const activeAlertsCount = alerts ? alerts.length : (kpis.activeAlerts || 0);

  const cards = [
    {
      id: 'kpi-accessibility',
      value: kpis.districtAccessibility || '78.5%',
      label: 'Regional Accessibility',
      subtext: 'Across monitored districts',
      conceptKey: 'REGIONAL_ACCESSIBILITY',
      badge: parseFloat(kpis.districtAccessibility) >= 80 ? 'Good' : 'Caution',
      badgeClass: parseFloat(kpis.districtAccessibility) >= 80
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <IconRoad className="w-5 h-5 text-emerald-600" />,
      accentColor: 'border-l-4 border-l-emerald-500',
    },
    {
      id: 'kpi-districts',
      value: kpis.districtsMonitored || 16,
      label: 'Districts Monitored',
      subtext: '8 NER State Capitals & Hubs',
      conceptKey: 'DISTRICTS_MONITORED',
      badge: '100% Coverage',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <IconMap className="w-5 h-5 text-blue-600" />,
      accentColor: 'border-l-4 border-l-blue-500',
    },
    {
      id: 'kpi-alerts',
      value: activeAlertsCount,
      label: 'Active Disruptions',
      subtext: `${incidents ? incidents.length : 0} incident logs`,
      conceptKey: 'DISRUPTION_SEVERITY',
      badge: activeAlertsCount > 0 ? `${activeAlertsCount} Critical` : 'Nominal',
      badgeClass: activeAlertsCount > 0
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <IconWarning className="w-5 h-5 text-rose-600" />,
      accentColor: 'border-l-4 border-l-rose-500',
    },
    {
      id: 'kpi-vehicles',
      value: activeDepsCount,
      label: 'Active Deployments',
      subtext: `${availCount} at depot • ${vehicles.length} total`,
      conceptKey: 'ACTIVE_DEPLOYMENTS',
      badge: `${activeDepsCount} In Transit`,
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: <IconTruck className="w-5 h-5 text-indigo-600" />,
      accentColor: 'border-l-4 border-l-indigo-500',
    },
    {
      id: 'kpi-delay',
      value: kpis.averageCorridorDelay || '45 mins',
      label: 'Corridor Delay',
      subtext: 'Monsoon bottleneck impact',
      conceptKey: 'CORRIDOR_DELAY',
      badge: 'Caution',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <IconClock className="w-5 h-5 text-amber-600" />,
      accentColor: 'border-l-4 border-l-amber-500',
    },
  ];

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 font-sans">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between ${card.accentColor}`}
        >
          {/* Top Row: Icon + Info Button */}
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
              {card.icon}
            </div>
            <div className="flex items-center gap-1">
              <span
                className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold border ${card.badgeClass} whitespace-nowrap`}
              >
                {card.badge}
              </span>
              <InfoPopover conceptKey={card.conceptKey} iconSize="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Number First Display */}
          <div className="my-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0B1220] tracking-tight leading-none">
              {card.value}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1 truncate">
              {card.label}
            </div>
          </div>

          {/* Subtext */}
          <div className="pt-2 mt-1 border-t border-slate-100 text-[11px] text-slate-500 truncate">
            {card.subtext}
          </div>
        </div>
      ))}
    </div>
  );
}
