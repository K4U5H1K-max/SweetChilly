import React from 'react';
import {
  IconHome,
  IconMap,
  IconTruck,
  IconWarning,
  IconMore,
} from '../common/AppIcons';

/**
 * Admin Mobile Bottom Navigation
 * Destinations: Overview (Home) | Map | Fleet | Alerts | More
 * Switches true application screens without section scrolling.
 */
export default function AdminMobileNav({
  activeTab,
  onSelectTab,
  alertCount = 0,
  fleetCount = 0,
}) {
  const tabs = [
    {
      id: 'OVERVIEW',
      label: 'Home',
      icon: <IconHome className="w-5 h-5" />,
    },
    {
      id: 'MAP',
      label: 'Map',
      icon: <IconMap className="w-5 h-5" />,
    },
    {
      id: 'FLEET',
      label: 'Fleet',
      badge: fleetCount > 0 ? fleetCount : null,
      badgeColor: 'bg-slate-900',
      icon: <IconTruck className="w-5 h-5" />,
    },
    {
      id: 'ALERTS',
      label: 'Alerts',
      badge: alertCount > 0 ? alertCount : null,
      badgeColor: 'bg-rose-600',
      icon: <IconWarning className="w-5 h-5" />,
    },
    {
      id: 'MORE',
      label: 'More',
      icon: <IconMore className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Admin Bottom Navigation"
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
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <div className={isActive ? 'text-[#3B82F6]' : 'text-slate-400'}>
                  {tab.icon}
                </div>
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
                <span className="absolute bottom-0 w-8 h-0.5 bg-[#3B82F6] rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
