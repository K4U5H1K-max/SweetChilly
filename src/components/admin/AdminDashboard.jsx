import React, { useState } from 'react';
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
import ProjectBrahmaputraLanding from '../ProjectBrahmaputra/ProjectBrahmaputraLanding';
import AdminMobileNav from './AdminMobileNav';
import { useApp } from '../../context/AppContext';

export default function AdminDashboard() {
  const { kpis, backendHealth, alerts, vehicles } = useApp();
  const [showLandingPage, setShowLandingPage] = useState(false);
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
  const [adminActiveTab, setAdminActiveTab] = useState('command-center');
  const [adminMoreSheetOpen, setAdminMoreSheetOpen] = useState(false);

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
      title: 'Incident verified and broadcast',
      message: `Disruption logged as verified alert. Interactive marker placed on map.`,
    });
    setTimeout(() => setToastNotification(null), 6000);

    const el = document.getElementById('gis-map');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleVehicleCreated = (newVehicle) => {
    setSelectedVehicleId(newVehicle.id);
    setToastNotification({
      type: 'success',
      title: 'Vehicle Registered in Fleet',
      message: `Vehicle ${newVehicle.id} (${newVehicle.type}) permanently registered and available for corridor dispatch.`,
    });
    setTimeout(() => setToastNotification(null), 6000);

    const el = document.getElementById('gis-map');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeploymentCreated = (newDeployment) => {
    setSelectedVehicleId(newDeployment.vehicleId);
    setToastNotification({
      type: 'success',
      title: 'Vehicle Deployed on Corridor',
      message: `Mission ${newDeployment.id || ''} active: ${newDeployment.origin} → ${newDeployment.destination} (${newDeployment.assignedCorridor}).`,
    });
    setTimeout(() => setToastNotification(null), 6000);

    const el = document.getElementById('gis-map');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEditVehicle = (vehId) => {
    setEditingVehicleId(vehId);
  };

  const handleRouteProjected = (route) => {
    setToastNotification({
      type: 'success',
      title: 'Optimal route projected',
      message: `Corridor route rendered: ${route.recommendedCorridor} (${route.distanceKm} km, ~${route.estimatedDurationHours}h).`,
    });
    setTimeout(() => setToastNotification(null), 6000);

    const el = document.getElementById('gis-map');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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

  const handleMobileNavSelect = (tabId) => {
    setAdminActiveTab(tabId);
    const el = document.getElementById(tabId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      {showLandingPage && (
        <ProjectBrahmaputraLanding onProceed={() => setShowLandingPage(false)} />
      )}
      <div className="min-h-screen bg-[#F5F7FA] text-[#0B1220] flex flex-col font-sans antialiased pb-20 lg:pb-6">
        {/* Top Global Navigation Bar */}
        <Navbar
          onOpenReportModal={() => setIsReportModalOpen(true)}
          onOpenAddVehicle={() => setIsVehicleModalOpen(true)}
          onOpenRoutePlanner={() => setIsRoutePlannerOpen(true)}
        />

        {/* Global Floating Toast Notification */}
        {toastNotification && (
          <div className="fixed top-20 right-4 z-500 max-w-sm w-full bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-4 animate-fade-in flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white font-heading">{toastNotification.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toastNotification.message}</p>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-slate-400 hover:text-white p-1 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="w-full pt-[60px] sm:pt-[73px] flex-1">
          {/* Section 1: Hero & Real-time KPIs */}
          <div id="command-center">
            {/* Command Center Title Bar */}
            <section className="w-full bg-white border-b border-slate-200 py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-semibold text-slate-700">Live Regional Command Feed</span>
                    <span>•</span>
                    <span className="font-mono">8 North Eastern States</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#0B1220]">
                    NER Logistics Command Center & Disruption Intelligence
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsRoutePlannerOpen(true)}
                    className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 touch-target sm:min-h-0 sm:min-w-0"
                  >
                    <span>⚡</span>
                    <span>Plan Route</span>
                  </button>
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-3 py-1.5 bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 touch-target sm:min-h-0 sm:min-w-0"
                  >
                    <span className="material-symbols-outlined text-sm">report_problem</span>
                    <span>Report</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 4 Primary KPIs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
              <CommandCenterKPIs kpis={kpis} />
            </div>
          </div>

          {/* Section 2: GIS Operations Map & Alert Panel Split */}
          <section id="gis-map" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* GIS Interactive Leaflet Map */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
                <MapplsGISMap
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={(id) => setSelectedIncidentId(id)}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={(id) => setSelectedVehicleId(id)}
                  onEditVehicle={handleEditVehicle}
                  onOpenSafetyModal={handleOpenSafetyModal}
                  onOpenDeployModal={handleOpenDeployModal}
                  onOpenVehicleHistory={handleOpenVehicleHistory}
                />
              </div>

              {/* Real-time Verified Disruption Alert Panel */}
              <div id="disruptions" className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-card">
                <AlertPanel
                  onSelectIncident={(id) => {
                    setSelectedIncidentId(id);
                    const el = document.getElementById('gis-map');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onPlanBypass={handlePlanBypass}
                />
              </div>
            </div>
          </section>

          {/* Section 3: District Accessibility & Network Terrain Analysis */}
          <section id="districts" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <DistrictAccessibility />
          </section>

          {/* Section 4: Multi-Tenant Fleet & Corridor Telemetry Ledger */}
          <section id="corridors" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <CorridorTelemetryLedger
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={(id) => {
                setSelectedVehicleId(id);
                const el = document.getElementById('gis-map');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onEditVehicle={handleEditVehicle}
              onOpenSafetyModal={handleOpenSafetyModal}
              onOpenDeployModal={handleOpenDeployModal}
              onOpenDeploymentDetails={handleOpenDeploymentDetails}
              onOpenVehicleHistory={handleOpenVehicleHistory}
            />
          </section>
        </main>

        {/* ==================== ADMIN MOBILE BOTTOM NAVIGATION (Reference Screen 2 & 3) ==================== */}
        <AdminMobileNav
          activeTab={adminActiveTab}
          onSelectTab={handleMobileNavSelect}
          alertCount={alerts ? alerts.length : 0}
          fleetCount={vehicles ? vehicles.length : 0}
          onOpenMore={() => setAdminMoreSheetOpen(true)}
        />

        {/* ==================== ADMIN MORE ACTION SHEET ==================== */}
        {adminMoreSheetOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center animate-fade-in"
            onClick={() => setAdminMoreSheetOpen(false)}
          >
            <div
              className="w-full bg-white rounded-t-2xl p-5 shadow-2xl pb-safe space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>
              <h3 className="font-heading font-bold text-sm text-[#0B1220] mb-2">Command Center Tools</h3>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => {
                    setAdminMoreSheetOpen(false);
                    setIsRoutePlannerOpen(true);
                  }}
                  className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs rounded-xl flex items-center justify-between touch-target"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">⚡</span>
                    <div className="text-left">
                      <span className="block font-bold">Route Feasibility Planner</span>
                      <span className="text-[10px] text-blue-600 block">AI bypass computation</span>
                    </div>
                  </div>
                  <span>→</span>
                </button>

                <button
                  onClick={() => {
                    setAdminMoreSheetOpen(false);
                    setIsVehicleModalOpen(true);
                  }}
                  className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-between touch-target"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold">+</span>
                    <div className="text-left">
                      <span className="block font-bold">Deploy Regional Vehicle</span>
                      <span className="text-[10px] text-slate-500 block">Dispatch fleet units</span>
                    </div>
                  </div>
                  <span>→</span>
                </button>

                <button
                  onClick={() => {
                    setAdminMoreSheetOpen(false);
                    setIsReportModalOpen(true);
                  }}
                  className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 font-semibold text-xs rounded-xl flex items-center justify-between touch-target"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-base text-red-600">report_problem</span>
                    <div className="text-left">
                      <span className="block font-bold">Report Field Disruption</span>
                      <span className="text-[10px] text-red-600 block">Broadcast verified incident</span>
                    </div>
                  </div>
                  <span>→</span>
                </button>

                <button
                  onClick={() => {
                    setAdminMoreSheetOpen(false);
                    if (vehicles && vehicles.length > 0) {
                      handleOpenSafetyModal(vehicles[0].id);
                    }
                  }}
                  className="w-full py-3 px-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-semibold text-xs rounded-xl flex items-center justify-between touch-target"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🎙️</span>
                    <div className="text-left">
                      <span className="block font-bold">Track 4: Driver Voice Safety AI</span>
                      <span className="text-[10px] text-purple-600 block">Outbound telemetry & safety eval</span>
                    </div>
                  </div>
                  <span>→</span>
                </button>
              </div>

              <button
                onClick={() => setAdminMoreSheetOpen(false)}
                className="w-full py-2.5 text-center text-xs font-semibold text-slate-600 hover:text-slate-900 touch-target mt-2"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Route Planner Modal */}
        <RoutePlannerModal
          isOpen={isRoutePlannerOpen}
          onClose={() => setIsRoutePlannerOpen(false)}
          defaultOrigin={routePlannerOrigin}
          defaultDestination={routePlannerDestination}
          onRouteCalculated={handleRouteProjected}
        />

        {/* Vehicle Registration & Telemetry Ingest Modal */}
        <VehicleManager
          isOpen={isVehicleModalOpen}
          onClose={() => setIsVehicleModalOpen(false)}
          onVehicleCreated={handleVehicleCreated}
          editingVehicleId={editingVehicleId}
          onCloseEdit={() => setEditingVehicleId(null)}
        />

        {/* Operational Deploy Vehicle Modal */}
        <DeployVehicleModal
          isOpen={isDeployModalOpen}
          onClose={() => setIsDeployModalOpen(false)}
          preselectedVehicleId={deployPreselectedVehicleId}
          onDeploymentCreated={handleDeploymentCreated}
        />

        {/* Deployment Details & Journey History Modal */}
        <DeploymentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setDetailsDeploymentId(null);
            setDetailsVehicleId(null);
          }}
          deploymentId={detailsDeploymentId}
          vehicleId={detailsVehicleId}
        />

        {/* Field Officer Incident Ingest Modal */}
        <IncidentReportingModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onIncidentCreated={handleIncidentCreated}
        />

        {/* Track 4: Driver Safety AI Voice Modal */}
        <DriverSafetyModal
          isOpen={isSafetyModalOpen}
          vehicleId={safetyVehicleId}
          onClose={() => setIsSafetyModalOpen(false)}
        />
      </div>
    </>
  );
}
