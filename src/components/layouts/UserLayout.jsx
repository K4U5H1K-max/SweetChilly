import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NetworkStatusBanner from '../common/NetworkStatusBanner';
import InstallPromptBanner from '../common/InstallPromptBanner';
import { getCurrentISTClock } from '../../utils/timeFormat';
import { IconWarning } from '../common/AppIcons';

export default function UserLayout({ children }) {
  const { currentUser, logout } = useAuth();
  const [timeStr, setTimeStr] = useState(getCurrentISTClock());
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(getCurrentISTClock());
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-100 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Network Status & Install Banners */}
      <div className="fixed top-0 left-0 right-0 z-60">
        <NetworkStatusBanner />
        <InstallPromptBanner />
      </div>

      {/* Top Header for User Operations Portal */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs font-sans pt-safe">
        {/* Geodetic Telemetry Top Datum Ticker */}
        <div className="hidden sm:flex w-full border-b border-slate-100 bg-slate-50 px-4 sm:px-6 py-1 items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Datum: WGS-84 / EPSG-4326
            </span>
            <span className="hidden md:inline text-slate-300">•</span>
            <span className="hidden md:inline">8 North Eastern States</span>
            <span className="hidden lg:inline text-slate-300">•</span>
            <span className="hidden lg:inline font-mono">Regional Grid: NER Geodetic Reference</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-slate-600">
              <span>IST Clock:</span>
              <span className="font-semibold text-slate-800">{timeStr}</span>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="h-14 sm:h-16 px-2.5 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Brand Logo & Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group min-w-0"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img
                src="/pwa-192x192.png"
                alt="Project Brahmaputra"
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-contain shrink-0 shadow-xs ring-1 ring-slate-200/50"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-heading font-bold text-sm sm:text-base text-slate-900 leading-tight tracking-tight truncate">
                    Brahmaputra
                  </span>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-blue-900 text-[9px] sm:text-[10px] font-bold font-mono uppercase tracking-wider shrink-0">
                    Operator
                  </span>
                </div>
                <span className="hidden sm:inline-block text-xs text-slate-500 font-medium leading-tight mt-0.5 truncate">
                  Logistics & Fleet Operations
                </span>
              </div>
            </div>
          </div>

          {/* Right User Bar & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
            {/* Report Hazard Action - Compact Icon on Mobile, Full on Desktop */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-report-incident-modal'))}
              className="w-9 h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 sm:bg-rose-600 hover:bg-rose-100 sm:hover:bg-rose-700 text-rose-600 sm:text-white border border-rose-200/80 sm:border-transparent text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs touch-target sm:min-h-0 sm:min-w-0 cursor-pointer"
              aria-label="Report Hazard"
              title="Report Hazard / Incident"
            >
              <IconWarning className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-rose-600 sm:text-white" />
              <span className="hidden sm:inline">Report</span>
            </button>

            {/* Desktop User Info */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px] lg:max-w-[180px]">
                {currentUser?.fullName || 'Logistics Operator'}
              </span>
              <span className="text-[10px] text-blue-700 font-mono font-semibold leading-tight">
                OPERATOR • {currentUser?.organization || 'Assam Fleet'}
              </span>
            </div>

            {/* Logout Action */}
            <button
              onClick={handleLogout}
              className="w-9 h-9 sm:w-auto px-0 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold border border-slate-200 hover:border-rose-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs sm:shadow-xs touch-target sm:min-h-0 sm:min-w-0"
              aria-label="Logout"
              title="Sign out of operator session"
            >
              <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-[56px] sm:pt-[73px] bg-[#F5F7FA] flex-1 min-h-0 flex flex-col">
        {children}
      </main>

      {/* Desktop Footer (Hidden on mobile to avoid double nav collision) */}
      <footer className="hidden md:block w-full bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Project Brahmaputra • Regional Logistics Intelligence Platform (GovTech Operations)</span>
          <span className="font-mono text-[11px]">Role: Logistics Operator Console (USER)</span>
        </div>
      </footer>
    </div>
  );
}
