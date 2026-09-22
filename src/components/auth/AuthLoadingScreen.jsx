import React from 'react';

export default function AuthLoadingScreen({ message = 'Verifying secure session...' }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans select-none">
      {/* Decorative background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Emblem / Badge */}
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10 mb-6">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-sm tracking-tighter">
            NER
          </div>
        </div>

        {/* Branding */}
        <span className="text-xs font-mono tracking-widest text-blue-400 uppercase font-semibold mb-1">
          Project Brahmaputra
        </span>
        <h1 className="text-xl font-heading font-extrabold text-white tracking-tight mb-2">
          Operations Intelligence Platform
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mb-8">
          North Eastern Region Logistics & Emergency Access Command
        </p>

        {/* Loading Spinner & Status */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700/60 shadow-inner">
          <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
          <span className="text-xs font-medium text-slate-300 tracking-wide">{message}</span>
        </div>
      </div>
    </div>
  );
}
