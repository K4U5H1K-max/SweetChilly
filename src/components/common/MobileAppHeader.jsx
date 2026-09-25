import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatIST } from '../../utils/timeFormat';

/**
 * Mobile App Header
 * Compact, GovTech dark navy header with operator greeting, dynamic IST date, and status beacon
 */
export default function MobileAppHeader({ title, subtitle, onOpenSettings }) {
  const { currentUser } = useAuth();

  const getGreeting = () => {
    // Current hour in IST
    const istHour = parseInt(
      new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
      10
    );

    if (istHour < 12) return 'Good Morning,';
    if (istHour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const displayName = title || currentUser?.fullName || 'Operator Console';
  const orgName = currentUser?.organization || 'Assam Regional Fleet';

  return (
    <header className="w-full bg-[#0B1220] text-white px-3.5 pt-3 pb-3.5 border-b border-slate-800/90 shadow-sm font-sans pt-safe">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex flex-col min-w-0 flex-1">
          {/* 1. BRAND / ORGANIZATION */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase truncate">
              Brahmaputra • {orgName}
            </span>
          </div>

          {/* 2. USER / CONTEXT */}
          <div className="flex items-baseline gap-1.5 mt-0.5 min-w-0">
            <span className="text-xs font-normal text-slate-400 shrink-0">
              {getGreeting()}
            </span>
            <h1 className="text-sm sm:text-base font-bold text-white font-heading tracking-tight leading-tight truncate">
              {displayName}
            </h1>
          </div>

          {/* 3. CONTEXT / IST TIME */}
          <span className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
            {subtitle || `Regional Operations • ${formatIST(new Date(), 'dateOnly')}`}
          </span>
        </div>

        {/* Right Status Beacon */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-2 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 text-slate-300 flex items-center gap-1.5 font-mono text-[10px] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-emerald-400">LIVE</span>
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors touch-target cursor-pointer"
              title="Settings / Profile"
              aria-label="Settings and Profile"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
