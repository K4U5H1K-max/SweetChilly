import React, { useState, useEffect } from 'react';

/**
 * Field-resilient Network Status Banner
 * Informs operator/admin if offline or reconnected without disrupting screen real-estate
 */
export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(t);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2 transition-all z-50 ${
        !isOnline
          ? 'bg-amber-600 text-white shadow-xs'
          : 'bg-emerald-600 text-white shadow-xs'
      }`}
    >
      {!isOnline ? (
        <>
          <svg className="w-3.5 h-3.5 shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-2.828-2.828a5 5 0 010 7.072M9.878 9.878a3 3 0 000 4.242M3 3l18 18" />
          </svg>
          <span>
            <strong>NER Field Offline</strong> — Operating in cached local shell. Live telemetry paused.
          </span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            <strong>Back Online</strong> — Regional telemetry re-synchronized.
          </span>
        </>
      )}
    </div>
  );
}
