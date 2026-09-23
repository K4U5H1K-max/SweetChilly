import React from 'react';
import { IconWarning, IconRoute, IconMap, IconTruck } from './AppIcons';

/**
 * Semantic Quick Action Grid with concept-specific icons
 */
export default function QuickActionGrid({
  onReportIncident,
  onPlanRoute,
  onViewMap,
  onFleetStatus,
}) {
  const actions = [
    {
      id: 'report',
      label: 'Report Road Hazard',
      bgColor: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200/80 text-rose-700',
      iconColor: 'bg-rose-600 text-white',
      icon: <IconWarning className="w-5 h-5" />,
      onClick: onReportIncident,
    },
    {
      id: 'route',
      label: 'Plan Route',
      bgColor: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200/80 text-blue-700',
      iconColor: 'bg-blue-600 text-white',
      icon: <IconRoute className="w-5 h-5" />,
      onClick: onPlanRoute,
    },
    {
      id: 'map',
      label: 'Live GIS Map',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200/80 text-indigo-700',
      iconColor: 'bg-indigo-600 text-white',
      icon: <IconMap className="w-5 h-5" />,
      onClick: onViewMap,
    },
    {
      id: 'fleet',
      label: 'Fleet Assets',
      bgColor: 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800',
      iconColor: 'bg-slate-900 text-white',
      icon: <IconTruck className="w-5 h-5" />,
      onClick: onFleetStatus,
    },
  ];

  return (
    <div className="w-full font-sans">
      <h3 className="text-xs font-bold text-slate-900 font-heading mb-2.5">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        {actions.map((act) => (
          <button
            key={act.id}
            onClick={act.onClick}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all shadow-xs cursor-pointer text-center touch-target ${act.bgColor}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${act.iconColor}`}>
              {act.icon}
            </div>
            <span className="text-xs font-bold leading-tight tracking-tight">
              {act.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
