import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import UserVehicleManager from './UserVehicleManager';
import UserDeploymentsView from './UserDeploymentsView';
import UserRouteIntelligenceView from './UserRouteIntelligenceView';
import UserRegisterVehicleModal from './UserRegisterVehicleModal';
import UserDeployModal from './UserDeployModal';
import UserReportIncidentModal from './UserReportIncidentModal';
import UserMobileNav from './UserMobileNav';
import MobileAppHeader from '../common/MobileAppHeader';
import QuickActionGrid from '../common/QuickActionGrid';
import StatusChip from '../common/StatusChip';

export default function UserDashboard() {
  const { currentUser } = useAuth();
  const {
    vehicles,
    availableVehicles,
    activeDeployments,
    deployments,
    alerts,
    vehiclesLoading,
    deploymentsLoading,
  } = useApp();

  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'VEHICLES' | 'DEPLOYMENTS' | 'ROUTES'
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [quickActionsSheetOpen, setQuickActionsSheetOpen] = useState(false);
  const [preselectedDeployVehicle, setPreselectedDeployVehicle] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  const handleDeploySpecificVehicle = (v) => {
    setPreselectedDeployVehicle(v);
    setDeployModalOpen(true);
  };

  const activeDepsCount = activeDeployments ? activeDeployments.length : 0;
  const availCount = availableVehicles ? availableVehicles.length : 0;
  const totalVehiclesCount = vehicles ? vehicles.length : 0;
  const totalDeploymentsCount = deployments ? deployments.length : 0;
  const activeAlertsCount = alerts ? alerts.length : 0;

  const kpiCards = [
    {
      id: 'kpi-vehicles',
      value: vehiclesLoading ? '...' : totalVehiclesCount,
      label: 'Registered Fleet',
      subtext: `${availCount} Available at Depot`,
      chipVariant: 'neutral',
      chipLabel: 'Fleet',
    },
    {
      id: 'kpi-trips',
      value: deploymentsLoading ? '...' : activeDepsCount,
      label: 'Active Trips',
      subtext: `${activeDepsCount} In Transit`,
      chipVariant: 'info',
      chipLabel: 'Live',
    },
    {
      id: 'kpi-available',
      value: vehiclesLoading ? '...' : availCount,
      label: 'Available Units',
      subtext: 'Ready for Dispatch',
      chipVariant: 'success',
      chipLabel: 'Ready',
    },
    {
      id: 'kpi-missions',
      value: deploymentsLoading ? '...' : totalDeploymentsCount,
      label: 'Logged Missions',
      subtext: 'Trip Audit History',
      chipVariant: 'neutral',
      chipLabel: 'Audit',
    },
  ];

  return (
    <div className="w-full flex flex-col font-sans bg-[#F5F7FA]">
      {/* ==================== MOBILE APP HEADER (Screen 2) ==================== */}
      <div className="md:hidden">
        <MobileAppHeader
          title={currentUser?.fullName || 'Operator Console'}
          subtitle={`NER Tenant: ${currentUser?.organization || 'Assam Regional Fleet'}`}
        />
      </div>

      {/* ==================== DESKTOP TOP WORKSPACE HEADER ==================== */}
      <section className="hidden md:block w-full bg-white border-b border-slate-200 py-6 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Operator Feed
                </span>
                <span>•</span>
                <span className="font-mono text-slate-600">Tenant: {currentUser?.email}</span>
              </div>
              <h1 className="font-heading text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                NER Operator Logistics & Fleet Workspace
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Real-time fleet tracking, multi-point journey dispatch, and corridor accessibility intelligence across the 8 North Eastern States.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setPreselectedDeployVehicle(null);
                  setDeployModalOpen(true);
                }}
                disabled={availCount === 0}
                className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>⚡</span>
                <span>Dispatch Journey</span>
              </button>

              <button
                onClick={() => setRegisterModalOpen(true)}
                className="px-4 py-2 bg-[#0B1220] hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span>
                <span>Register Vehicle</span>
              </button>

              <button
                onClick={() => setReportModalOpen(true)}
                className="px-4 py-2 bg-[#DC2626] hover:bg-red-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Report Incident</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== MAIN WORKSPACE BODY ==================== */}
      <section className="w-full py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6">
          {/* Action Success Alert Notification */}
          {actionSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{actionSuccessMsg}</span>
              </div>
              <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 font-bold ml-4 p-1 cursor-pointer">✕</button>
            </div>
          )}

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <nav className="flex items-center gap-1.5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'OVERVIEW'
                    ? 'text-slate-900 bg-white border border-slate-200 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Command Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('VEHICLES')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'VEHICLES'
                    ? 'text-slate-900 bg-white border border-slate-200 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>My Vehicles</span>
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono bg-slate-900 text-white">
                  {totalVehiclesCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('DEPLOYMENTS')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'DEPLOYMENTS'
                    ? 'text-slate-900 bg-white border border-slate-200 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Deployments & Trips</span>
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono bg-[#2563EB] text-white">
                  {activeDepsCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('ROUTES')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'ROUTES'
                    ? 'text-slate-900 bg-white border border-slate-200 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Route Intelligence</span>
              </button>
            </nav>

            <div className="text-xs text-slate-500 font-mono">
              WGS-84 • Guwahati Hub
            </div>
          </div>

          {/* ==================== TAB 1: OVERVIEW (Matching Reference Screen 2) ==================== */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Critical Alert Banner (Reference Screen 2) */}
              {activeAlertsCount > 0 && (
                <div className="bg-[#DC2626] text-white rounded-xl p-3.5 shadow-md flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs sm:text-sm font-bold leading-tight">
                        {activeAlertsCount} Critical Regional Advisories
                      </h4>
                      <p className="text-[11px] text-white/90 truncate mt-0.5">
                        {alerts[0]?.headline || alerts[0]?.title || 'Roadblock detected on arterial corridor. Requires immediate operator attention.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('ROUTES')}
                    className="px-2.5 py-1 bg-white text-[#DC2626] font-bold text-xs rounded-lg shrink-0 shadow-xs cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    View
                  </button>
                </div>
              )}

              {/* 2×2 Command Center KPI Grid (Reference Screen 2) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                {kpiCards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-semibold text-slate-500 truncate">
                        {card.label}
                      </span>
                      <StatusChip variant={card.chipVariant} size="sm">
                        {card.chipLabel}
                      </StatusChip>
                    </div>

                    <div className="my-1">
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0B1220] tracking-tight leading-none">
                        {card.value}
                      </div>
                    </div>

                    <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate">{card.subtext}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Action Grid (Reference Screen 2) */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
                <QuickActionGrid
                  onReportIncident={() => setReportModalOpen(true)}
                  onPlanRoute={() => setActiveTab('ROUTES')}
                  onViewMap={() => setActiveTab('ROUTES')}
                  onFleetStatus={() => setActiveTab('VEHICLES')}
                />
              </div>

              {/* Current In-Transit Journeys (Reference Screen 6 & 7) */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-card">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-heading font-bold text-sm text-[#0B1220]">
                      Current In-Transit Journeys
                    </h3>
                    <p className="text-xs text-slate-500">Live monitored movements on North East corridors</p>
                  </div>
                  {activeDeployments.length > 0 && (
                    <button
                      onClick={() => setActiveTab('DEPLOYMENTS')}
                      className="text-xs font-bold text-[#2563EB] hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage all</span>
                      <span>→</span>
                    </button>
                  )}
                </div>

                {activeDeployments.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100 px-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-slate-700">No active trips currently in transit</p>
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
                        className="mt-3 px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-xs touch-target"
                      >
                        ⚡ Dispatch Journey Now
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeDeployments.slice(0, 4).map((d) => (
                      <div
                        key={d.id}
                        className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#2563EB] shrink-0 shadow-xs">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#0B1220] bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                {d.vehiclePlate || d.vehicleId}
                              </span>
                              <StatusChip variant="success" size="sm">
                                {d.status || 'ON ROUTE'}
                              </StatusChip>
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm text-[#0B1220] mt-1 break-words">
                              {d.origin} → {d.destination}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Cargo: <strong className="text-slate-700">{d.cargo}</strong> • {d.assignedCorridor || 'Corridor'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                          <button
                            onClick={() => setActiveTab('DEPLOYMENTS')}
                            className="text-xs font-bold text-[#2563EB] hover:text-blue-800 transition-colors touch-target sm:min-h-0 sm:min-w-0"
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

          {/* ==================== TAB 2: MY VEHICLES (Reference Screen 6) ==================== */}
          {activeTab === 'VEHICLES' && (
            <UserVehicleManager onDeployVehicle={handleDeploySpecificVehicle} />
          )}

          {/* ==================== TAB 3: DEPLOYMENTS & TRIPS (Reference Screen 7) ==================== */}
          {activeTab === 'DEPLOYMENTS' && (
            <UserDeploymentsView
              onOpenDeployModal={() => {
                setPreselectedDeployVehicle(null);
                setDeployModalOpen(true);
              }}
            />
          )}

          {/* ==================== TAB 4: ROUTE INTELLIGENCE ==================== */}
          {activeTab === 'ROUTES' && <UserRouteIntelligenceView />}
        </div>
      </section>

      {/* ==================== MOBILE BOTTOM NAVIGATION ==================== */}
      <UserMobileNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        vehicleCount={totalVehiclesCount}
        activeTripsCount={activeDepsCount}
        onOpenQuickActions={() => setQuickActionsSheetOpen(true)}
      />

      {/* ==================== QUICK ACTIONS BOTTOM SHEET ==================== */}
      {quickActionsSheetOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center animate-fade-in"
          onClick={() => setQuickActionsSheetOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-2xl p-5 shadow-2xl pb-safe space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>
            <h3 className="font-heading font-bold text-sm text-[#0B1220] mb-2">Operator Quick Actions</h3>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => {
                  setQuickActionsSheetOpen(false);
                  setPreselectedDeployVehicle(null);
                  setDeployModalOpen(true);
                }}
                disabled={availCount === 0}
                className="w-full py-3 px-4 bg-[#16A34A] hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-between touch-target"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">⚡</span>
                  <div className="text-left">
                    <span className="block font-bold">Dispatch Journey</span>
                    <span className="text-[10px] text-emerald-100 block">{availCount} vehicle(s) ready</span>
                  </div>
                </div>
                <span>→</span>
              </button>

              <button
                onClick={() => {
                  setQuickActionsSheetOpen(false);
                  setRegisterModalOpen(true);
                }}
                className="w-full py-3 px-4 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-between touch-target"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-bold">+</span>
                  <div className="text-left">
                    <span className="block font-bold">Register Fleet Vehicle</span>
                    <span className="text-[10px] text-blue-100 block">Enrol asset to tenant fleet</span>
                  </div>
                </div>
                <span>→</span>
              </button>

              <button
                onClick={() => {
                  setQuickActionsSheetOpen(false);
                  setReportModalOpen(true);
                }}
                className="w-full py-3 px-4 bg-[#DC2626] hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-between touch-target"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-base">report_problem</span>
                  <div className="text-left">
                    <span className="block font-bold">Report Road Issue</span>
                    <span className="text-[10px] text-rose-100 block">Log roadblock or hazard</span>
                  </div>
                </div>
                <span>→</span>
              </button>
            </div>

            <button
              onClick={() => setQuickActionsSheetOpen(false)}
              className="w-full py-2.5 text-center text-xs font-semibold text-slate-600 hover:text-slate-900 touch-target mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
        onClose={() => setReportModalOpen(false)}
        onSuccess={() => setActionSuccessMsg('Field incident report logged and broadcast successfully!')}
      />
    </div>
  );
}
