import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import UserVehicleManager from './UserVehicleManager';
import UserDeploymentsView from './UserDeploymentsView';
import UserRegisterVehicleModal from './UserRegisterVehicleModal';
import UserDeployModal from './UserDeployModal';
import UserReportIncidentModal from './UserReportIncidentModal';
import UserMobileNav from './UserMobileNav';
import MobileAppHeader from '../common/MobileAppHeader';
import StatusChip from '../common/StatusChip';
import MapplsGISMap from '../MapplsGISMap';
import RoutePlannerModal from '../RoutePlannerModal';
import { formatIST } from '../../utils/timeFormat';
import {
  IconHome,
  IconMap,
  IconDeployments,
  IconTruck,
  IconMore,
  IconWarning,
  IconShield,
  IconPlus,
  IconRoute,
  IconUser,
  IconDocument,
} from '../common/AppIcons';
import InfoPopover from '../common/InfoPopover';

export default function UserDashboard() {
  const { currentUser, logout } = useAuth();
  const {
    vehicles,
    availableVehicles,
    activeDeployments,
    deployments,
    alerts,
    incidents,
    vehiclesLoading,
    deploymentsLoading,
  } = useApp();

  // Primary active screen destination: 'HOME' | 'MAP' | 'DEPLOYMENTS' | 'VEHICLES' | 'MORE'
  const [activeTab, setActiveTab] = useState('HOME');

  // Modals state
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [preselectedDeployVehicle, setPreselectedDeployVehicle] = useState(null);
  const [reportContext, setReportContext] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  const activeDepsCount = activeDeployments ? activeDeployments.length : 0;
  const availCount = availableVehicles ? availableVehicles.length : 0;
  const totalVehiclesCount = vehicles ? vehicles.length : 0;
  const totalDeploymentsCount = deployments ? deployments.length : 0;
  const activeAlertsCount = alerts ? alerts.length : 0;

  // Determine overall safety state based on genuine telemetry
  const safetyState = React.useMemo(() => {
    if (activeAlertsCount > 2) return { status: 'CRITICAL', color: 'text-rose-600', dot: 'bg-rose-500', label: 'CRITICAL RISK' };
    if (activeAlertsCount > 0) return { status: 'WARNING', color: 'text-amber-600', dot: 'bg-amber-500', label: 'ELEVATED CAUTION' };
    return { status: 'SAFE', color: 'text-emerald-600', dot: 'bg-emerald-500', label: 'ALL CORRIDORS NOMINAL' };
  }, [activeAlertsCount]);

  // =========================================================================
  // Mobile / PWA Browser Back-Button Hierarchy Handling
  // =========================================================================
  const anyModalOpen = registerModalOpen || deployModalOpen || reportModalOpen || routePlannerOpen;

  // Push history state when navigating away from HOME or opening a modal
  const handleSelectTab = useCallback((tabId) => {
    if (tabId !== activeTab) {
      window.history.pushState({ screen: tabId }, '');
      setActiveTab(tabId);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeTab]);

  useEffect(() => {
    // Initial state setup
    if (!window.history.state || !window.history.state.screen) {
      window.history.replaceState({ screen: 'HOME' }, '');
    }

    const handlePopState = (event) => {
      // 1. Close any open modal first
      if (anyModalOpen) {
        setRegisterModalOpen(false);
        setDeployModalOpen(false);
        setReportModalOpen(false);
        setRoutePlannerOpen(false);
        return;
      }

      // 2. If on sub-screen, return to HOME before root exit
      const targetScreen = event.state?.screen || 'HOME';
      setActiveTab(targetScreen);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [anyModalOpen]);

  const handleDeploySpecificVehicle = (v) => {
    setPreselectedDeployVehicle(v);
    setDeployModalOpen(true);
  };

  const handleReportWithContext = (context) => {
    setReportContext(context);
    setReportModalOpen(true);
  };

  // KPI Definition for Number-First Grid
  const kpiCards = [
    {
      id: 'kpi-fleet',
      value: vehiclesLoading ? '...' : totalVehiclesCount,
      label: 'Registered Fleet',
      subtext: `${availCount} ready at depot`,
      conceptKey: 'STATE_FLEET',
      icon: <IconTruck className="w-5 h-5 text-slate-800" />,
      badge: 'Depot',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    {
      id: 'kpi-trips',
      value: deploymentsLoading ? '...' : activeDepsCount,
      label: 'Active Journeys',
      subtext: `${activeDepsCount} on corridor route`,
      conceptKey: 'UNKNOWN_DEPLOYMENT',
      icon: <IconDeployments className="w-5 h-5 text-blue-600" />,
      badge: 'In Transit',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'kpi-available',
      value: vehiclesLoading ? '...' : availCount,
      label: 'Available Units',
      subtext: 'Ready for dispatch',
      conceptKey: 'STATE_FLEET',
      icon: <IconTruck className="w-5 h-5 text-emerald-600" />,
      badge: 'Ready',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'kpi-disruptions',
      value: activeAlertsCount,
      label: 'Active Disruptions',
      subtext: `${incidents ? incidents.length : 0} regional alerts`,
      conceptKey: 'DISRUPTION_SEVERITY',
      icon: <IconWarning className="w-5 h-5 text-rose-600" />,
      badge: activeAlertsCount > 0 ? 'Hazard' : 'Nominal',
      badgeClass: activeAlertsCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  ];

  return (
    <div className="w-full flex flex-col font-sans bg-[#F5F7FA] flex-1">
      {/* ==================== MOBILE APP HEADER ==================== */}
      <div className="md:hidden">
        <MobileAppHeader
          title={currentUser?.fullName || 'Operator Console'}
          subtitle={`NER Organization: ${currentUser?.organization || 'Assam Regional Fleet'}`}
        />
      </div>

      {/* ==================== DESKTOP WORKSPACE TOP BAR ==================== */}
      <section className="hidden md:block w-full bg-white border-b border-slate-200 py-5 px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected Operator Console
                </span>
                <span>•</span>
                <span className="font-mono text-slate-600">{currentUser?.email}</span>
              </div>
              <h1 className="font-heading text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                NER Logistics & Fleet Operations
              </h1>
            </div>

            {/* Desktop Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setPreselectedDeployVehicle(null);
                  setDeployModalOpen(true);
                }}
                disabled={availCount === 0}
                className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <IconDeployments className="w-4 h-4" />
                <span>Dispatch Journey</span>
              </button>

              <button
                onClick={() => setRegisterModalOpen(true)}
                className="px-4 py-2 bg-[#0B1220] hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <IconPlus className="w-4 h-4" />
                <span>Register Vehicle</span>
              </button>

              <button
                onClick={() => {
                  setReportContext(null);
                  setReportModalOpen(true);
                }}
                className="px-4 py-2 bg-[#DC2626] hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <IconWarning className="w-4 h-4" />
                <span>Report Road Hazard</span>
              </button>
            </div>
          </div>

          {/* Desktop Persistent Navigation Tabs */}
          <nav className="flex items-center gap-2 border-t border-slate-100 pt-3">
            {[
              { id: 'HOME', label: 'Command Overview', icon: <IconHome className="w-4 h-4" /> },
              { id: 'MAP', label: 'GIS Operations Map', icon: <IconMap className="w-4 h-4" /> },
              { id: 'DEPLOYMENTS', label: 'Deployments & Trips', badge: activeDepsCount, icon: <IconDeployments className="w-4 h-4" /> },
              { id: 'VEHICLES', label: 'Fleet Assets', badge: totalVehiclesCount, icon: <IconTruck className="w-4 h-4" /> },
              { id: 'MORE', label: 'Alerts & Profile', badge: activeAlertsCount > 0 ? activeAlertsCount : null, icon: <IconMore className="w-4 h-4" /> },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge !== null && (
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                        isActive ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      {/* ==================== MAIN SCREEN WORKSPACE ==================== */}
      <main className="w-full flex-1 py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6">
          {/* Action Success Alert Notification */}
          {actionSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-medium">{actionSuccessMsg}</span>
              </div>
              <button
                onClick={() => setActionSuccessMsg(null)}
                className="text-emerald-600 hover:text-emerald-800 font-bold ml-4 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 1: HOME (Compact Operational Overview) */}
          {/* ========================================================= */}
          {activeTab === 'HOME' && (
            <div className="space-y-4 sm:space-y-5 animate-fade-in">
              {/* Critical Alert Banner */}
              {activeAlertsCount > 0 && (
                <div className="bg-[#DC2626] text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <IconWarning className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs sm:text-sm font-bold leading-tight">
                        {activeAlertsCount} Active Corridor Disruption Advisories
                      </h4>
                      <p className="text-[11px] text-white/90 truncate mt-0.5">
                        {alerts[0]?.headline || 'Roadblock detected on arterial corridor. Immediate operator attention required.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectTab('MAP')}
                    className="px-3 py-1.5 bg-white text-[#DC2626] font-bold text-xs rounded-xl shrink-0 shadow-xs cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    View Map
                  </button>
                </div>
              )}

              {/* Number-First 2×2 / 4-Col KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {kpiCards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        {card.icon}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${card.badgeClass}`}>
                          {card.badge}
                        </span>
                        <InfoPopover conceptKey={card.conceptKey} iconSize="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="my-1.5">
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0B1220] tracking-tight leading-none">
                        {card.value}
                      </div>
                      <div className="text-xs font-bold text-slate-700 mt-1 truncate">
                        {card.label}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 truncate">
                      {card.subtext}
                    </div>
                  </div>
                ))}
              </div>

              {/* Operational Safety & Regional Status Bar */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                    <IconShield className="w-5 h-5 text-slate-800" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700">Corridor Safety Evaluation</span>
                      <InfoPopover conceptKey="SAFETY_STATUS" iconSize="w-3 h-3" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${safetyState.dot} inline-block animate-pulse`}></span>
                      <span className={`text-xs font-extrabold font-mono ${safetyState.color}`}>
                        {safetyState.label}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400">
                        Updated {formatIST(new Date(), 'timeOnly')}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectTab('MAP')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
                >
                  <IconMap className="w-4 h-4 text-blue-600" />
                  <span>View Live GIS Map</span>
                </button>
              </div>

              {/* Quick Action Grid */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card">
                <h3 className="font-heading font-bold text-xs text-slate-400 uppercase tracking-wider mb-3 font-mono">
                  Operator Quick Actions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                  <button
                    onClick={() => {
                      setPreselectedDeployVehicle(null);
                      setDeployModalOpen(true);
                    }}
                    disabled={availCount === 0}
                    className="p-3.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/80 text-left transition-all disabled:opacity-40 cursor-pointer touch-target"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
                      <IconDeployments className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-blue-950 block">Dispatch Journey</span>
                    <span className="text-[10px] text-blue-700 block mt-0.5">{availCount} ready at depot</span>
                  </button>

                  <button
                    onClick={() => setRegisterModalOpen(true)}
                    className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all cursor-pointer touch-target"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-2 shadow-xs">
                      <IconPlus className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-slate-900 block">Register Vehicle</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Enrol fleet asset</span>
                  </button>

                  <button
                    onClick={() => handleSelectTab('MAP')}
                    className="p-3.5 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/80 text-left transition-all cursor-pointer touch-target"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-xs">
                      <IconMap className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-indigo-950 block">Live GIS Map</span>
                    <span className="text-[10px] text-indigo-700 block mt-0.5">Corridors & Weather</span>
                  </button>

                  <button
                    onClick={() => {
                      setReportContext(null);
                      setReportModalOpen(true);
                    }}
                    className="p-3.5 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 text-left transition-all cursor-pointer touch-target"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center mb-2 shadow-xs">
                      <IconWarning className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-rose-950 block">Report Hazard</span>
                    <span className="text-[10px] text-rose-700 block mt-0.5">Broadcast Roadblock</span>
                  </button>
                </div>
              </div>

              {/* Current Active In-Transit Journey Summary */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-heading font-bold text-sm text-[#0B1220]">
                      Current In-Transit Journeys
                    </h3>
                    <p className="text-xs text-slate-500">Live monitored vehicle movements on North East corridors</p>
                  </div>
                  {activeDeployments.length > 0 && (
                    <button
                      onClick={() => handleSelectTab('DEPLOYMENTS')}
                      className="text-xs font-bold text-[#2563EB] hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All ({activeDeployments.length})</span>
                      <span>→</span>
                    </button>
                  )}
                </div>

                {activeDeployments.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 px-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-2">
                      <IconDeployments className="w-5 h-5 text-slate-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">No active transport journeys in transit</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {totalVehiclesCount === 0
                        ? 'Enrol your fleet units to begin dispatching regional journeys.'
                        : `${availCount} vehicle(s) ready at depot for corridor dispatch.`}
                    </p>
                    {availCount > 0 && (
                      <button
                        onClick={() => {
                          setPreselectedDeployVehicle(null);
                          setDeployModalOpen(true);
                        }}
                        className="mt-3 px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-xs touch-target"
                      >
                        Dispatch Journey Now
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeDeployments.slice(0, 3).map((d) => (
                      <div
                        key={d.id}
                        className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#2563EB] shrink-0 shadow-xs">
                            <IconTruck className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#0B1220] bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                {d.vehiclePlate || d.vehicleId}
                              </span>
                              <StatusChip variant="success" size="sm">
                                {d.status || 'ACTIVE'}
                              </StatusChip>
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm text-[#0B1220] mt-1">
                              {d.origin} → {d.destination}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Cargo: <strong className="text-slate-700">{d.cargo}</strong> • {d.assignedCorridor || 'Corridor'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                          <button
                            onClick={() => handleReportWithContext(d)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <IconWarning className="w-3 h-3 text-rose-600" />
                            <span>Report Issue</span>
                          </button>
                          <button
                            onClick={() => handleSelectTab('DEPLOYMENTS')}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Details →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 2: MAP (Consolidated GIS + Disruptions + Weather) */}
          {/* ========================================================= */}
          {activeTab === 'MAP' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-base font-heading font-bold text-slate-900">
                    Regional GIS Intelligence Center
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live corridor passability, active fleet GPS tracking, disaster hazard markers, and weather
                  </p>
                </div>
                <button
                  onClick={() => setRoutePlannerOpen(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <IconRoute className="w-4 h-4" />
                  <span>Plan Route</span>
                </button>
              </div>

              <MapplsGISMap
                fullHeight={true}
                onPlanBypass={(alert) => setRoutePlannerOpen(true)}
                onOpenDeployModal={handleDeploySpecificVehicle}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 3: DEPLOYMENTS (3 Tabs: Ongoing, Upcoming, Completed) */}
          {/* ========================================================= */}
          {activeTab === 'DEPLOYMENTS' && (
            <div className="animate-fade-in">
              <UserDeploymentsView
                onOpenDeployModal={() => {
                  setPreselectedDeployVehicle(null);
                  setDeployModalOpen(true);
                }}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 4: VEHICLES (Fleet Directory & Deployment Triggers) */}
          {/* ========================================================= */}
          {activeTab === 'VEHICLES' && (
            <div className="animate-fade-in">
              <UserVehicleManager onDeployVehicle={handleDeploySpecificVehicle} />
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 5: MORE (Alerts, Profile, Platform Info, Logout) */}
          {/* ========================================================= */}
          {activeTab === 'MORE' && (
            <div className="space-y-4 max-w-4xl mx-auto animate-fade-in">
              {/* Profile Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card">
                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                    {currentUser?.fullName?.charAt(0) || 'O'}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-slate-900">
                      {currentUser?.fullName || 'Logistics Operator'}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 text-[10px] font-bold font-mono uppercase">
                        {currentUser?.role || 'OPERATOR'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {currentUser?.organization || 'Assam Regional Fleet'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-mono">Assigned Vehicles</span>
                    <strong className="text-base text-slate-900">{totalVehiclesCount}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-mono">Completed Missions</span>
                    <strong className="text-base text-slate-900">{totalDeploymentsCount}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-mono">Platform Standard</span>
                    <strong className="text-base text-slate-900">IST / WGS-84</strong>
                  </div>
                </div>
              </div>

              {/* Active Alerts List */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <IconWarning className="w-5 h-5 text-rose-600" />
                    <h3 className="font-heading font-bold text-sm text-slate-900">
                      Regional Disruption Advisories
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {alerts.length} Active
                  </span>
                </div>

                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No active advisories reported in the North Eastern network.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {alerts.map((al) => (
                      <div key={al.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-900">{al.headline}</span>
                          <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {al.level}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">{al.impact}</p>
                        <p className="text-slate-500 font-mono text-[10px] mt-1">Logged: {al.activeSince || 'Live'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Logout Button */}
              <button
                onClick={async () => {
                  await logout();
                  window.location.href = '/login';
                }}
                className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-2xl shadow-xs transition-colors cursor-pointer touch-target"
              >
                Sign Out of Operator Session
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ==================== MOBILE PERSISTENT BOTTOM NAVIGATION ==================== */}
      <UserMobileNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        vehicleCount={totalVehiclesCount}
        activeTripsCount={activeDepsCount}
      />

      {/* ==================== MODALS ==================== */}
      <UserRegisterVehicleModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={() => setActionSuccessMsg('New operator vehicle registered successfully into fleet!')}
      />

      <UserDeployModal
        isOpen={deployModalOpen}
        preselectedVehicle={preselectedDeployVehicle}
        onClose={() => {
          setDeployModalOpen(false);
          setPreselectedDeployVehicle(null);
        }}
        onSuccess={() => setActionSuccessMsg('Corridor journey dispatched and registered successfully!')}
      />

      <UserReportIncidentModal
        isOpen={reportModalOpen}
        initialContext={reportContext}
        onClose={() => {
          setReportModalOpen(false);
          setReportContext(null);
        }}
        onSuccess={() => setActionSuccessMsg('Field incident report logged and broadcast successfully!')}
      />

      <RoutePlannerModal
        isOpen={routePlannerOpen}
        onClose={() => setRoutePlannerOpen(false)}
      />
    </div>
  );
}
