import React from 'react';
import NetworkStatusBanner from '../common/NetworkStatusBanner';
import InstallPromptBanner from '../common/InstallPromptBanner';

export default function AdminLayout({ children }) {
  return (
    <div className="w-full min-h-screen min-h-[100dvh] bg-slate-100 flex flex-col font-sans antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* Network Status & Install Banners */}
      <div className="fixed top-0 left-0 right-0 z-60">
        <NetworkStatusBanner />
        <InstallPromptBanner />
      </div>

      <div className="w-full flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
