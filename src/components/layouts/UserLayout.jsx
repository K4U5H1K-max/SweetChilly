import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NetworkStatusBanner from '../common/NetworkStatusBanner';
import InstallPromptBanner from '../common/InstallPromptBanner';

export default function UserLayout({ children }) {
  const { currentUser, logout } = useAuth();
  const [timeStr, setTimeStr] = useState('');
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utcH = String(now.getUTCHours()).padStart(2, '0');
      const utcM = String(now.getUTCMinutes()).padStart(2, '0');
      const utcS = String(now.getUTCSeconds()).padStart(2, '0');
      setTimeStr(`UTC ${utcH}:${utcM}:${utcS}`);
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
        {/* Geodetic Telemetry Top Datum Ticker - Hidden on small mobile to maximize workspace */}
        <div className="hidden sm:flex w-full border-b border-slate-100 bg-slate-50 px-4 sm:px-6 py-1 items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Datum: WGS-84 / EPSG-4326
            </span>
            <span className="hidden md:inline text-slate-300">•</span>
            <span className="hidden md:inline">8 North Eastern States</span>
            <span className="hidden lg:inline text-slate-300">•</span>
            <span className="hidden lg:inline font-mono">Guwahati Hub: 26°08'N, 91°44'E</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-slate-600">
              <span>Clock:</span>
              <span className="font-semibold text-slate-800">{timeStr}</span>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="h-14 sm:h-16 px-3.5 sm:px-6 flex items-center justify-between">
          {/* Brand Logo & Wordmark */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <div
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs group-hover:bg-blue-700 transition-colors shrink-0">
                <span className="font-mono text-xs tracking-tighter">NER</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-heading font-bold text-sm sm:text-base text-slate-900 leading-none tracking-tight truncate">
                    Brahmaputra
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-blue-900 text-[9px] sm:text-[10px] font-bold font-mono uppercase tracking-wider shrink-0">
                    Operator
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight mt-0.5 sm:mt-1 truncate">
                  Logistics & Fleet Workspace
                </span>
              </div>
            </div>
          </div>

          {/* Right User Bar & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px] lg:max-w-[180px]">
                {currentUser?.fullName || 'Logistics Operator'}
              </span>
              <span className="text-[10px] text-blue-700 font-mono font-semibold leading-tight">
                OPERATOR
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold border border-slate-200 hover:border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs touch-target sm:min-h-0 sm:min-w-0"
              title="Sign out of operator session"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area with Bottom Padding for Mobile Nav */}
      <main className="w-full pt-[60px] sm:pt-[73px] pb-20 md:pb-6 bg-slate-100 flex-1">
        {children}
      </main>

      {/* Desktop Footer (Hidden on mobile to avoid double nav collision) */}
      <footer className="hidden md:block w-full bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Project Brahmaputra • Regional Logistics Intelligence Platform</span>
          <span className="font-mono text-[11px]">Role: Logistics Operator Console (USER)</span>
        </div>
      </footer>
    </div>
  );
}
