import React from 'react';

/**
 * Admin Mobile Bottom Navigation matching Reference Screen 2 & 3
 * Destinations: Home | Map | Alerts | Fleet | More
 */
export default function AdminMobileNav({
  activeTab,
  onSelectTab,
  alertCount = 0,
  fleetCount = 0,
  onOpenMore,
}) {
  const tabs = [
    {
      id: 'command-center',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'gis-map',
      label: 'Map',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      id: 'disruptions',
      label: 'Alerts',
      badge: alertCount > 0 ? alertCount : null,
      badgeColor: 'bg-red-600',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      id: 'corridors',
      label: 'Fleet',
      badge: fleetCount > 0 ? fleetCount : null,
      badgeColor: 'bg-slate-900',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Admin Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B1220] text-slate-400 border-t border-slate-800 shadow-2xl px-2 pb-safe"
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

        {/* More Menu Action */}
        <button
          onClick={onOpenMore}
          className="flex-1 py-1 flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition-all touch-target"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span className="text-[10px] tracking-tight mt-0.5">More</span>
        </button>
      </div>
    </nav>
  );
}
