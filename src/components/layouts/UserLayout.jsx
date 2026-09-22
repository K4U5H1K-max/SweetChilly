import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function UserLayout({ children }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Header for User Operations Portal */}
      <header className="fixed top-0 left-0 right-0 w-full z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
              NER
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-base text-slate-900 leading-tight">
                  Project Brahmaputra
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold font-mono uppercase tracking-wider">
                  User Portal
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Logistics Operator Operations
              </span>
            </div>
          </div>

          {/* Right User Bar & Logout */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-semibold text-slate-800">
                {currentUser?.fullName || 'Logistics Operator'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {currentUser?.email || 'user@brahmaputra.gov.in'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold text-xs rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Sign out of operator session"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-[72px] flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Project Brahmaputra • Regional Logistics Intelligence Platform</span>
          <span className="font-mono text-[11px]">Role: Logistics User (OPERATOR)</span>
        </div>
      </footer>
    </div>
  );
}
