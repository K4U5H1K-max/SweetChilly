import React, { useState, useEffect } from 'react';

/**
 * PWA Install Prompt Component
 * Captures `beforeinstallprompt` event and shows a sleek, non-intrusive action
 * Hides automatically when running standalone or after dismissed
 */
export default function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running in standalone PWA mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // If already standalone or dismissed or no install prompt available, render nothing
  if (isStandalone || dismissed || !deferredPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="PWA Installation Prompt"
      className="bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800 shadow-md flex items-center justify-between gap-3 text-xs z-50 animate-fade-in"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white shrink-0 text-xs shadow-xs">
          NER
        </div>
        <div className="truncate">
          <span className="font-bold text-white block truncate">Install Brahmaputra Mobile App</span>
          <span className="text-[11px] text-slate-400 block truncate">Fast standalone access on your home screen</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Install</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Dismiss install prompt"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
