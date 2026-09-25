import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../Navbar';
import CommandCenterKPIs from '../CommandCenterKPIs';
import MapplsGISMap from '../MapplsGISMap';
import AlertPanel from '../AlertPanel';
import DistrictAccessibility from '../DistrictAccessibility';
import CorridorTelemetryLedger from '../CorridorTelemetryLedger';
import IncidentReportingModal from '../IncidentReportingModal';
import VehicleManager from '../VehicleManager';
import DeployVehicleModal from '../DeployVehicleModal';
import DeploymentDetailsModal from '../DeploymentDetailsModal';
import RoutePlannerModal from '../RoutePlannerModal';
import DriverSafetyModal from '../DriverSafetyModal';
import AdminMobileNav from './AdminMobileNav';
import { useApp } from '../../context/AppContext';
import { formatIST } from '../../utils/timeFormat';
import {
  IconHome,
  IconMap,
  IconTruck,
  IconWarning,
  IconMore,
  IconShield,
  IconRoute,
  IconPlus,
} from '../common/AppIcons';
import InfoPopover from '../common/InfoPopover';

export default function AdminDashboard() {
  const { kpis, backendHealth, alerts, vehicles, incidents, activeDeployments } = useApp();

  // Active Screen: 'OVERVIEW' | 'MAP' | 'FLEET' | 'ALERTS' | 'MORE'
  const [adminActiveTab, setAdminActiveTab] = useState('OVERVIEW');

  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployPreselectedVehicleId, setDeployPreselectedVehicleId] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsDeploymentId, setDetailsDeploymentId] = useState(null);
  const [detailsVehicleId, setDetailsVehicleId] = useState(null);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [safetyVehicleId, setSafetyVehicleId] = useState(null);
  const [routePlannerOrigin, setRoutePlannerOrigin] = useState('Guwahati');
  const [routePlannerDestination, setRoutePlannerDestination] = useState('Silchar');
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  // =========================================================================
  // Mobile / PWA Browser Back-Button Hierarchy Handling
  // =========================================================================
  const anyModalOpen =
    isReportModalOpen ||
    isVehicleModalOpen ||
    Boolean(editingVehicleId) ||
    isDeployModalOpen ||
    isDetailsModalOpen ||
    isRoutePlannerOpen ||
    isSafetyModalOpen;

  const handleSelectTab = useCallback((tabId) => {
    if (tabId !== adminActiveTab) {
      window.history.pushState({ screen: tabId }, '');
      setAdminActiveTab(tabId);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [adminActiveTab]);

  useEffect(() => {
    if (!window.history.state || !window.history.state.screen) {
      window.history.replaceState({ screen: 'OVERVIEW' }, '');
    }

    const handlePopState = (event) => {
      if (anyModalOpen) {
        setIsReportModalOpen(false);
        setIsVehicleModalOpen(false);
        setEditingVehicleId(null);
        setIsDeployModalOpen(false);
        setIsDetailsModalOpen(false);
        setIsRoutePlannerOpen(false);
        setIsSafetyModalOpen(false);
        return;
      }

      const targetScreen = event.state?.screen || 'OVERVIEW';
      setAdminActiveTab(targetScreen);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [anyModalOpen]);

  const handleOpenSafetyModal = (vehId) => {
    setSafetyVehicleId(vehId);
    setIsSafetyModalOpen(true);
  };

  const handleOpenDeployModal = (vehId = null) => {
    setDeployPreselectedVehicleId(vehId);
    setIsDeployModalOpen(true);
  };

  const handleOpenDeploymentDetails = (depId) => {
    setDetailsDeploymentId(depId);
    setDetailsVehicleId(null);
    setIsDetailsModalOpen(true);
  };

  const handleOpenVehicleHistory = (vehId) => {
    setDetailsVehicleId(vehId);
    setDetailsDeploymentId(null);
    setIsDetailsModalOpen(true);
  };

  const handleIncidentCreated = (newIncidentId) => {
    setSelectedIncidentId(newIncidentId);
    setToastNotification({
      type: 'success',
      title: 'Incident Verified & Broadcast',
      message: `Disruption logged as verified alert. Interactive marker placed on GIS map.`,
    });
    setTimeout(() => setToastNotification(null), 6000);
    handleSelectTab('MAP');
  };

  const handleVehicleCreated = (newVehicle) => {
    setSelectedVehicleId(newVehicle.id);
    setToastNotification({
      type: 'success',
      title: 'Vehicle Registered in Fleet',
      message: `Vehicle ${newVehicle.id} (${newVehicle.type}) permanently registered and available for corridor dispatch.`,
    });
    setTimeout(() => setToastNotification(null), 6000);
  };

  const handleDeploymentCreated = (newDeployment) => {
    setSelectedVehicleId(newDeployment.vehicleId);
    setToastNotification({
      type: 'success',
      title: 'Vehicle Deployed on Corridor',
      message: `Mission ${newDeployment.id || ''} active: ${newDeployment.origin} → ${newDeployment.destination} (${newDeployment.assignedCorridor}).`,
    });
    setTimeout(() => setToastNotification(null), 6000);
  };

  const handleEditVehicle = (vehId) => {
    setEditingVehicleId(vehId);
  };

  const handleRouteProjected = (route) => {
    setToastNotification({
      type: 'success',
      title: 'Optimal Route Projected',
      message: `Corridor route rendered: ${route.recommendedCorridor} (${route.distanceKm} km, ~${route.estimatedDurationHours}h).`,
    });
    setTimeout(() => setToastNotification(null), 6000);
    handleSelectTab('MAP');
  };

  const handlePlanBypass = (alert) => {
    if ((alert.district && alert.district.toLowerCase().includes('cachar')) || (alert.headline && alert.headline.toLowerCase().includes('sonapur'))) {
      setRoutePlannerOrigin('Guwahati');
      setRoutePlannerDestination('Silchar');
    } else if (alert.headline && alert.headline.toLowerCase().includes('jiribam')) {
      setRoutePlannerOrigin('Silchar');
      setRoutePlannerDestination('Imphal');
    } else {
      setRoutePlannerOrigin('Guwahati');
      setRoutePlannerDestination('Dimapur');
    }
    setIsRoutePlannerOpen(true);
  };

  return (
    <div className={`min-h-screen min-h-[100dvh] bg-[#F5F7FA] text-[#0B1220] flex flex-col font-sans antialiased ${adminActiveTab === 'MAP' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden lg:overflow-visible lg:h-auto pb-14 lg:pb-8' : 'pb-20 lg:pb-8'}`}>
      {/* Top Global Navigation Bar */}
      <Navbar
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenAddVehicle={() => setIsVehicleModalOpen(true)}
        onOpenRoutePlanner={() => setIsRoutePlannerOpen(true)}
      />

      {/* Global Floating Toast Notification */}
      {toastNotification && (
        <div className="fixed top-20 right-4 z-500 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-4 animate-fade-in flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
            ✓
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white font-heading">{toastNotification.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toastNotification.message}</p>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="w-full pt-[56px] sm:pt-[73px] flex-1 min-h-0 flex flex-col">
        {/* Desktop Screen Navigation Bar */}
        <section className="hidden lg:block w-full bg-white border-b border-slate-200 py-4 px-6 lg:px-8 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="font-heading font-bold text-lg text-slate-900">
                NER Logistics Command Center
              </h2>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500">8 North Eastern States</span>
            </div>

            <nav className="flex items-center gap-2">
              {[
                { id: 'OVERVIEW', label: 'Command Overview', icon: <IconHome className="w-4 h-4" /> },
                { id: 'MAP', label: 'GIS Map & Operations', icon: <IconMap className="w-4 h-4" /> },
                { id: 'FLEET', label: 'Fleet Telemetry', badge: vehicles ? vehicles.length : 0, icon: <IconTruck className="w-4 h-4" /> },
                { id: 'ALERTS', label: 'Hazard Alerts', badge: alerts ? alerts.length : 0, icon: <IconWarning className="w-4 h-4" /> },
                { id: 'MORE', label: 'Accessibility Scorecard', icon: <IconMore className="w-4 h-4" /> },
              ].map((tab) => {
                const isActive = adminActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
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

        {/* ========================================================= */}
        {/* SCREEN 1: OVERVIEW (Real KPIs, Active Movements, Actions) */}
        {/* ========================================================= */}
        {adminActiveTab === 'OVERVIEW' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5 animate-fade-in">
            {/* Header Hero */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-semibold text-slate-700">Live Regional Command Feed</span>
                  <span>•</span>
                  <span className="font-mono">8 North Eastern States</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#0B1220]">
                  NER Logistics Intelligence & Disruption Command Center
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Real-time multi-tenant fleet dispatch, road accessibility scorecard, and automated Track 4 safety evaluation.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsRoutePlannerOpen(true)}
                  className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer touch-target"
                >
                  <IconRoute className="w-4 h-4" />
                  <span>Plan Route</span>
                </button>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-3.5 py-2 bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer touch-target"
                >
                  <IconWarning className="w-4 h-4" />
                  <span>Report Hazard</span>
                </button>
              </div>
            </div>

            {/* 5 Primary KPIs */}
            <CommandCenterKPIs />

            {/* Quick Map & Disruption Summary Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-8">
                <MapplsGISMap
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={(id) => setSelectedIncidentId(id)}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={(id) => setSelectedVehicleId(id)}
                  onEditVehicle={handleEditVehicle}
                  onOpenSafetyModal={handleOpenSafetyModal}
                  onOpenDeployModal={handleOpenDeployModal}
                  onOpenVehicleHistory={handleOpenVehicleHistory}
                  onPlanBypass={handlePlanBypass}
                />
              </div>

              <div className="lg:col-span-4 h-full">
                <AlertPanel
                  maxHeightClass="max-h-[500px] lg:max-h-[520px]"
                  onSelectIncident={(id) => {
                    setSelectedIncidentId(id);
                    handleSelectTab('MAP');
                  }}
                  onPlanBypass={handlePlanBypass}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: MAP (Dedicated Full-Screen GIS Intelligence) */}
        {/* ========================================================= */}
        {adminActiveTab === 'MAP' && (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-5 space-y-2 sm:space-y-4 animate-fade-in w-full flex-1 min-h-0 flex flex-col">
            <div className="hidden sm:flex bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm sm:text-base font-heading font-bold text-slate-900">
                  Spatial Operations & Corridor Telemetry
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Interactive GIS map with layers for active deployments, road hazards, and corridor weather
                </p>
              </div>
              <button
                onClick={() => setIsRoutePlannerOpen(true)}
                className="px-3 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer touch-target sm:min-h-0 shrink-0"
              >
                <IconRoute className="w-4 h-4" />
                <span>Calculate Bypass</span>
              </button>
            </div>

            <MapplsGISMap
              fullHeight={true}
              className="flex-1 min-h-0"
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={(id) => setSelectedIncidentId(id)}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={(id) => setSelectedVehicleId(id)}
              onEditVehicle={handleEditVehicle}
              onOpenSafetyModal={handleOpenSafetyModal}
              onOpenDeployModal={handleOpenDeployModal}
              onOpenVehicleHistory={handleOpenVehicleHistory}
              onPlanBypass={handlePlanBypass}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: FLEET (Corridor Telemetry & Multi-Tenant Ledger) */}
        {/* ========================================================= */}
        {adminActiveTab === 'FLEET' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 animate-fade-in w-full">
            <CorridorTelemetryLedger
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={(id) => {
                setSelectedVehicleId(id);
                handleSelectTab('MAP');
              }}
              onOpenAddVehicle={() => setIsVehicleModalOpen(true)}
              onEditVehicle={handleEditVehicle}
              onOpenSafetyModal={handleOpenSafetyModal}
              onOpenDeployModal={handleOpenDeployModal}
              onOpenDeploymentDetails={handleOpenDeploymentDetails}
              onOpenVehicleHistory={handleOpenVehicleHistory}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 4: ALERTS (Disruptions & Hazards List) */}
        {/* ========================================================= */}
        {adminActiveTab === 'ALERTS' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 animate-fade-in w-full flex-1 min-h-0 flex flex-col">
            <AlertPanel
              className="flex-1 min-h-0"
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={(id) => {
                setSelectedIncidentId(id);
                handleSelectTab('MAP');
              }}
              onPlanBypass={handlePlanBypass}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 5: MORE (District Accessibility Scorecard & Details) */}
        {/* ========================================================= */}
        {adminActiveTab === 'MORE' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5 animate-fade-in">
            <DistrictAccessibility />
          </div>
        )}
      </main>

      {/* ==================== ADMIN MOBILE BOTTOM NAVIGATION ==================== */}
      <AdminMobileNav
        activeTab={adminActiveTab}
        onSelectTab={handleSelectTab}
        alertCount={alerts ? alerts.length : 0}
        fleetCount={vehicles ? vehicles.length : 0}
      />

      {/* ==================== MODALS ==================== */}
      <VehicleManager
        isOpen={isVehicleModalOpen || Boolean(editingVehicleId)}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setEditingVehicleId(null);
        }}
        editingVehicleId={editingVehicleId}
        onCloseEdit={() => setEditingVehicleId(null)}
        onVehicleCreated={handleVehicleCreated}
      />

      <IncidentReportingModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onIncidentCreated={handleIncidentCreated}
      />

      <DeployVehicleModal
        isOpen={isDeployModalOpen}
        preselectedVehicleId={deployPreselectedVehicleId}
        onClose={() => {
          setIsDeployModalOpen(false);
          setDeployPreselectedVehicleId(null);
        }}
        onDeploymentCreated={handleDeploymentCreated}
      />

      <DeploymentDetailsModal
        isOpen={isDetailsModalOpen}
        deploymentId={detailsDeploymentId}
        vehicleId={detailsVehicleId}
        onClose={() => setIsDetailsModalOpen(false)}
      />

      <RoutePlannerModal
        isOpen={isRoutePlannerOpen}
        initialOrigin={routePlannerOrigin}
        initialDestination={routePlannerDestination}
        onClose={() => setIsRoutePlannerOpen(false)}
        onRouteProjected={handleRouteProjected}
      />

      <DriverSafetyModal
        isOpen={isSafetyModalOpen}
        vehicleId={safetyVehicleId}
        onClose={() => {
          setIsSafetyModalOpen(false);
          setSafetyVehicleId(null);
        }}
      />
    </div>
  );
}
