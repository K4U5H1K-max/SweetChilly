import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenReportModal, onOpenAddVehicle, onOpenRoutePlanner }) {
  const [activeTab, setActiveTab] = useState('command-center');
  const [timeStr, setTimeStr] = useState('');
  const { backendHealth } = useApp();
  const { currentUser, logout, isAuthenticated } = useAuth();
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
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs font-sans">
      {/* Geodetic Telemetry Top Datum Ticker */}
      <div className="w-full border-b border-slate-100 bg-slate-50 px-4 sm:px-6 py-1 flex items-center justify-between text-xs text-slate-500">
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
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-blue-700 transition-colors">
              <span className="font-mono text-xs tracking-tighter">NER</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-base text-slate-900 leading-none tracking-tight">
                  NER Operations Intelligence
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold font-mono uppercase tracking-wider hidden sm:inline-block">
                  Command Center
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium leading-tight mt-1">
                Logistics & Accessibility Platform
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-slate-600">
            {[
              { id: 'command-center', label: 'Overview', href: '#command-center' },
              { id: 'gis-map', label: 'GIS map', href: '#gis-map' },
              { id: 'disruptions', label: 'Disruptions', href: '#disruptions' },
              { id: 'districts', label: 'District readiness', href: '#districts' },
              { id: 'corridors', label: 'Fleet & corridors', href: '#corridors' },
            ].map((tab) => (
              <a
                key={tab.id}
                href={tab.href}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'text-slate-900 bg-slate-100 font-bold'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Right Action Hub */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Route Planner Action */}
          <button
            onClick={onOpenRoutePlanner}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs hover:border-slate-400"
          >
            <span className="text-blue-600">⚡</span>
            <span>Route planner</span>
          </button>

          {/* Deploy Vehicle Action */}
          <button
            onClick={onOpenAddVehicle}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs hidden sm:flex"
          >
            <span>+</span>
            <span>Deploy vehicle</span>
          </button>

          {/* Report Incident Action */}
          <button
            onClick={onOpenReportModal}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">add_a_photo</span>
            <span>Report incident</span>
          </button>

          {/* Admin User Pill & Logout Button */}
          {isAuthenticated && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
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
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold border border-slate-200 hover:border-rose-200 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                title="Sign out of administrative command session"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
