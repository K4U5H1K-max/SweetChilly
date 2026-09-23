import React, { useState, useRef, useEffect } from 'react';
import { IconInfo } from './AppIcons';

export const INFO_DEFINITIONS = {
  REGIONAL_ACCESSIBILITY: {
    title: 'Regional Accessibility Score',
    explanation: 'Indicates the composite road accessibility index across monitored North Eastern districts based on active corridor passability, terrain conditions, and weather constraints.',
  },
  STATE_FLEET: {
    title: 'Operator State Fleet',
    explanation: 'Total registered fleet assets assigned to this tenant organization across regional logistics hubs in the 8 North Eastern States.',
  },
  SAFETY_STATUS: {
    title: 'Safety Evaluation Status',
    explanation: 'Reflects driver and vehicle safety state assessed through automated telemetry checks, corridor risk assessments, and operator evaluations.',
  },
  ACCESSIBILITY_SCORE: {
    title: 'District Accessibility Metric',
    explanation: 'District road connectivity rating where ≥85% is Accessible, 70–84% requires Caution/Watch, and <70% signifies Restricted arterial transit.',
  },
  UNKNOWN_CONNECTIVITY: {
    title: 'Connectivity Status',
    explanation: 'Live vehicle telemetry or cellular signal is currently unavailable for this unit in the corridor.',
  },
  UNKNOWN_DEPLOYMENT: {
    title: 'Deployment State',
    explanation: 'No active transport mission or route is currently assigned to this vehicle at depot.',
  },
  ROUTE_CONFIDENCE: {
    title: 'Route Confidence Score',
    explanation: 'Reliability estimate of projected bypass corridors accounting for road width, load limits, landslide risk, and active field reports.',
  },
  DISRUPTION_SEVERITY: {
    title: 'Disruption Severity Classification',
    explanation: 'LOW indicates minor caution; MEDIUM signifies slow single-lane transit; HIGH denotes severe carriageway obstruction; CRITICAL signifies complete corridor closure.',
  },
  CORRIDOR_WEATHER: {
    title: 'Corridor Weather & Climate',
    explanation: 'Precipitation volume (mm) and atmospheric visibility along arterial mountain passes collected from regional meteorological feeds.',
  },
};

export default function InfoPopover({
  conceptKey,
  title,
  explanation,
  className = '',
  iconSize = 'w-3.5 h-3.5',
  buttonLabel = 'Information details',
  placement = 'top', // 'top' | 'bottom' | 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  const def = conceptKey && INFO_DEFINITIONS[conceptKey] ? INFO_DEFINITIONS[conceptKey] : null;
  const displayTitle = title || def?.title || 'Operational Information';
  const displayExplanation = explanation || def?.explanation || 'Operational metric provided by Project Brahmaputra platform.';

  // Detect touch/mobile environment
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle outside clicks / ESC key dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Desktop Hover Handlers
  const handleMouseEnter = () => {
    if (isMobile) return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Toggle for Touch / Mobile or Keyboard Interaction
  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleKeyDownTrigger = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDownTrigger}
        aria-label={`${buttonLabel}: ${displayTitle}`}
        aria-expanded={isOpen}
        className="inline-flex items-center justify-center p-0.5 rounded-full text-slate-400 hover:text-blue-600 focus:text-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 transition-colors cursor-pointer"
        tabIndex={0}
      >
        <IconInfo className={iconSize} />
      </button>

      {/* DESKTOP POPOVER / TOOLTIP */}
      {isOpen && !isMobile && (
        <div
          role="tooltip"
          className="absolute z-500 w-64 p-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs font-sans left-1/2 -translate-x-1/2 bottom-full mb-2 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold text-[11px] text-blue-300 font-heading tracking-tight flex items-center gap-1">
              <IconInfo className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              {displayTitle}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-mono">ⓘ info</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {displayExplanation}
          </p>
          {/* Arrow Indicator */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
        </div>
      )}

      {/* MOBILE TOUCH POPOVER / BOTTOM SHEET DIALOG */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 z-500 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl pb-safe space-y-3 text-left font-sans animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto sm:hidden mb-2"></div>
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <IconInfo className="w-4 h-4" />
                </div>
                <h4 className="font-heading font-bold text-sm text-slate-900">
                  {displayTitle}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                aria-label="Close information"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                Explanation & Meaning
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {displayExplanation}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer touch-target transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
