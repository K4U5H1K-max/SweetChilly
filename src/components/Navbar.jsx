import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getCurrentISTClock } from '../utils/timeFormat';
import { IconRoute, IconPlus, IconWarning } from './common/AppIcons';

export default function Navbar({ onOpenReportModal, onOpenAddVehicle, onOpenRoutePlanner, onOpenMenu }) {
  const [activeTab, setActiveTab] = useState('command-center');
  const [timeStr, setTimeStr] = useState(getCurrentISTClock());
  const { backendHealth } = useApp();
  const { currentUser, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
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
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs font-sans pt-safe">
      {/* Geodetic Telemetry Top Datum Ticker - Hidden on small mobile */}
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
      <div className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-2">
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center gap-2.5 sm:gap-6 min-w-0">
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img
              src="/pwa-192x192.png"
              alt="Project Brahmaputra"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain shrink-0 shadow-xs ring-1 ring-slate-200/50"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-heading font-bold text-sm sm:text-base text-slate-900 leading-tight tracking-tight truncate">
                  Brahmaputra
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-[9px] sm:text-[10px] font-bold font-mono uppercase tracking-wider shrink-0">
                  Command
                </span>
              </div>
              <span className="hidden sm:inline-block text-xs text-slate-500 font-medium leading-tight mt-0.5 truncate">
                Logistics & Accessibility Platform
              </span>
              <span className="sm:hidden text-[10px] text-slate-500 font-mono leading-none truncate">
                NER Logistics Command
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Hub */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Route Planner Action - Desktop Only */}
          <button
            onClick={onOpenRoutePlanner}
            className="hidden sm:flex px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-all items-center gap-1.5 shadow-xs hover:border-slate-400 cursor-pointer"
            title="Open GIS Route Feasibility Planner"
          >
            <IconRoute className="w-3.5 h-3.5 text-blue-600" />
            <span>Route Planner</span>
          </button>

          {/* Deploy Vehicle Action - Desktop Only */}
          <button
            onClick={onOpenAddVehicle}
            className="hidden sm:flex px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span>Register Vehicle</span>
          </button>

          {/* Report Incident Action - Compact Icon on Mobile, Full on Desktop */}
          <button
            onClick={onOpenReportModal}
            className="w-9 h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 sm:bg-rose-600 hover:bg-rose-100 sm:hover:bg-rose-700 text-rose-600 sm:text-white border border-rose-200/80 sm:border-transparent text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs touch-target sm:min-h-0 sm:min-w-0 cursor-pointer"
            aria-label="Report Hazard"
            title="Report Hazard / Incident"
          >
            <IconWarning className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-rose-600 sm:text-white" />
            <span className="hidden sm:inline">Report</span>
          </button>

          {/* Mobile Menu Action -> Opens More/Navigation */}
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              className="sm:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-all cursor-pointer touch-target"
              aria-label="Navigation Menu"
              title="Menu"
            >
              <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Admin User Pill & Logout Button - Desktop Only */}
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
              <div className="hidden xl:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {currentUser?.fullName || 'Admin Operator'}
                </span>
                <span className="text-[10px] text-amber-700 font-mono font-semibold leading-tight">
                  ADMIN
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold border border-slate-200 hover:border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs touch-target sm:min-h-0 sm:min-w-0"
                title="Sign out of command session"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
