import React from 'react';

/**
 * Mobile Bottom Navigation Bar for User Portal matching Reference Screen styling
 * Dark Navy background with bright blue active indicators and safe-area padding
 */
export default function UserMobileNav({
  activeTab,
  onSelectTab,
  vehicleCount = 0,
  activeTripsCount = 0,
  onOpenQuickActions,
}) {
  const tabs = [
    {
      id: 'OVERVIEW',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'VEHICLES',
      label: 'Vehicles',
      badge: vehicleCount > 0 ? vehicleCount : null,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      id: 'DEPLOYMENTS',
      label: 'Trips',
      badge: activeTripsCount > 0 ? activeTripsCount : null,
      badgeColor: 'bg-emerald-500',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'ROUTES',
      label: 'Routes',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="User Portal Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B1220] text-slate-400 border-t border-slate-800 shadow-2xl px-2 pb-safe"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all relative touch-target ${
                isActive ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <div className={isActive ? 'text-[#2563EB]' : ''}>{tab.icon}</div>
                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold text-white font-mono ${
                      tab.badgeColor || 'bg-blue-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-[#2563EB] rounded-full"></span>
              )}
            </button>
          );
        })}

        {/* Quick Actions Trigger */}
        {onOpenQuickActions && (
          <button
            onClick={onOpenQuickActions}
            className="flex-1 py-1 flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition-all touch-target"
            title="Open Actions"
          >
            <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <span className="text-xs font-bold leading-none">+</span>
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Actions</span>
          </button>
        )}
      </div>
    </nav>
  );
}
