import React, { useState } from 'react';
import Navbar from './components/Navbar';
import CommandCenterKPIs from './components/CommandCenterKPIs';
import MapplsGISMap from './components/MapplsGISMap';
import AlertPanel from './components/AlertPanel';
import DistrictAccessibility from './components/DistrictAccessibility';
import CorridorTelemetryLedger from './components/CorridorTelemetryLedger';
import IncidentReportingModal from './components/IncidentReportingModal';
import VehicleManager from './components/VehicleManager';
import RoutePlannerModal from './components/RoutePlannerModal';
import ProjectBrahmaputraLanding from './components/ProjectBrahmaputra/ProjectBrahmaputraLanding';
import { useApp } from './context/AppContext';

export default function App() {
  const { kpis, backendHealth } = useApp();
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [routePlannerOrigin, setRoutePlannerOrigin] = useState('Guwahati');
  const [routePlannerDestination, setRoutePlannerDestination] = useState('Silchar');
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

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
      title: 'Fleet unit deployed',
      message: `Vehicle ${newVehicle.id} (${newVehicle.type}) deployed on ${newVehicle.origin} → ${newVehicle.destination}.`,
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

  return (
    <>
      {showLandingPage && (
        <ProjectBrahmaputraLanding onProceed={() => setShowLandingPage(false)} />
      )}
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
        {/* Top Global Navigation Bar */}
        <Navbar
          onOpenReportModal={() => setIsReportModalOpen(true)}
          onOpenAddVehicle={() => setIsVehicleModalOpen(true)}
          onOpenRoutePlanner={() => setIsRoutePlannerOpen(true)}
        />

      {/* Floating Operational Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white rounded-xl border border-slate-700 p-4 shadow-2xl max-w-md animate-fade-in flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-heading font-bold text-xs text-emerald-400">
                {toastNotification.title}
              </span>
              <button
                onClick={() => setToastNotification(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toastNotification.message}</p>
          </div>
        </div>
      )}

      <main className="w-full pt-[73px] bg-slate-100 flex-1">
        {/* ==================== COMMAND CENTER HERO & INTRO ==================== */}
        <section className="w-full bg-white border-b border-slate-200 py-8 px-4 sm:px-6 lg:px-8" id="command-center">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            {/* Metadata Ticker Strip */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live command feed
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-600">
                GIS engine: OpenStreetMap & Mappls
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="hidden sm:inline font-medium text-slate-600">
                8 Monitored arterial corridors (NH-27, NH-6, NH-37, NH-15)
              </span>
            </div>

            {/* Headline & Mission Statement Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-7">
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  NER Logistics & Accessibility Command Center
                </h1>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-2xl">
                  Real-time GIS accessibility intelligence, disruption tracking, and emergency supply fleet coordination across North Eastern Region arterial corridors.
                </p>
              </div>
              <div className="lg:col-span-5 flex flex-wrap items-center justify-start lg:justify-end gap-2.5">
                {/* Primary Route Planner CTA */}
                <button
                  onClick={() => setIsRoutePlannerOpen(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>⚡</span>
                  <span>Plan safe route</span>
                </button>

                {/* Primary Add Vehicle CTA */}
                <button
                  onClick={() => setIsVehicleModalOpen(true)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="font-bold text-sm">+</span>
                  <span>Deploy vehicle</span>
                </button>

                {/* Primary Report Incident CTA */}
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Report incident</span>
                </button>
              </div>
            </div>

            {/* ==================== 5 PRIMARY LIVE KPI CARDS ==================== */}
            <div className="pt-2">
              <CommandCenterKPIs />
            </div>
          </div>
        </section>

        {/* ==================== MAIN OPERATIONS AREA: GIS MAP + ALERTS ==================== */}
        <section className="w-full py-8 px-4 sm:px-6 lg:px-8" id="gis-map">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-semibold text-blue-700">
                  GIS Operations
                </div>
                <h2 className="font-heading text-xl font-bold text-slate-900 tracking-tight">
                  North East GIS Map & Disruption Monitor
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Interactive pan, zoom and marker inspection</span>
              </div>
            </div>

            {/* Grid: 8-Col Map + 4-Col Live Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-8 flex flex-col">
                <MapplsGISMap
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={setSelectedIncidentId}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={setSelectedVehicleId}
                  onEditVehicle={handleEditVehicle}
                />
              </div>
              <div className="lg:col-span-4 flex flex-col" id="disruptions">
                <AlertPanel
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={setSelectedIncidentId}
                  onPlanBypass={handlePlanBypass}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==================== SECTION 2: DISTRICT ACCESSIBILITY LEDGER ==================== */}
        <section className="w-full py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 border-t border-b border-slate-200" id="districts">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-semibold text-blue-700">
                  District Accessibility
                </div>
                <h2 className="font-heading text-xl font-bold text-slate-900 tracking-tight">
                  Regional district readiness and vulnerability scorecard
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Derived from passable highway routes and local disruptions
              </p>
            </div>

            <DistrictAccessibility />
          </div>
        </section>

        {/* ==================== SECTION 3: CORRIDORS & FLEET TELEMETRY ==================== */}
        <section className="w-full py-8 px-4 sm:px-6 lg:px-8 bg-white" id="corridors">
          <div className="max-w-7xl mx-auto">
            <CorridorTelemetryLedger
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={(vehId) => {
                setSelectedVehicleId(vehId);
                const el = document.getElementById('gis-map');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onOpenAddVehicle={() => setIsVehicleModalOpen(true)}
              onEditVehicle={handleEditVehicle}
            />
          </div>
        </section>
      </main>

      {/* AI Dynamic Route Planner Modal */}
      <RoutePlannerModal
        isOpen={isRoutePlannerOpen}
        onClose={() => setIsRoutePlannerOpen(false)}
        initialOrigin={routePlannerOrigin}
        initialDestination={routePlannerDestination}
        onRouteProjected={handleRouteProjected}
        onDeployOnRoute={(routeData) => {
          setIsVehicleModalOpen(true);
        }}
      />

      {/* Vehicle Management & Telemetry Ingest Modal */}
      <VehicleManager
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onVehicleCreated={handleVehicleCreated}
        editingVehicleId={editingVehicleId}
        onCloseEdit={() => setEditingVehicleId(null)}
      />

      {/* Field Officer Incident Ingest Modal */}
      <IncidentReportingModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onIncidentCreated={handleIncidentCreated}
      />
    </div>
  </>
  );
}
