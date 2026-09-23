import React from 'react';

/**
 * 4-Box Semantic Quick Action Grid matching Reference Screen 2
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
      label: 'Report Incident',
      bgColor: 'bg-red-50 hover:bg-red-100/80 border-red-200/80 text-red-700',
      iconColor: 'bg-red-600 text-white',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      onClick: onReportIncident,
    },
    {
      id: 'route',
      label: 'Plan Route',
      bgColor: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200/80 text-blue-700',
      iconColor: 'bg-blue-600 text-white',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      onClick: onPlanRoute,
    },
    {
      id: 'map',
      label: 'View Map',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/80 text-emerald-700',
      iconColor: 'bg-emerald-600 text-white',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      onClick: onViewMap,
    },
    {
      id: 'fleet',
      label: 'Fleet Status',
      bgColor: 'bg-purple-50 hover:bg-purple-100/80 border-purple-200/80 text-purple-700',
      iconColor: 'bg-purple-600 text-white',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      onClick: onFleetStatus,
    },
  ];

  return (
    <div className="w-full">
      <h3 className="text-xs font-bold text-slate-900 font-heading mb-2.5">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        {actions.map((act) => (
          <button
            key={act.id}
            onClick={act.onClick}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all shadow-xs cursor-pointer text-center touch-target ${act.bgColor}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-xs ${act.iconColor}`}>
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
