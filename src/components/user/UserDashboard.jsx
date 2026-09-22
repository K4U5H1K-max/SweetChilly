import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import UserVehicleManager from './UserVehicleManager';
import UserDeploymentsView from './UserDeploymentsView';
import UserRouteIntelligenceView from './UserRouteIntelligenceView';
import UserRegisterVehicleModal from './UserRegisterVehicleModal';
import UserDeployModal from './UserDeployModal';
import UserReportIncidentModal from './UserReportIncidentModal';

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
  const [preselectedDeployVehicle, setPreselectedDeployVehicle] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  const handleDeploySpecificVehicle = (v) => {
    setPreselectedDeployVehicle(v);
    setDeployModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
                Operator Logistics Workspace
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                Live Backend Connected
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight mt-1">
              Welcome, {currentUser?.fullName || 'Logistics Operator'}
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Operator fleet dispatch, route feasibility, and active transport journey telemetry across the North Eastern Region.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRegisterModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Register Vehicle</span>
            </button>

            <button
              onClick={() => {
                setPreselectedDeployVehicle(null);
                setDeployModalOpen(true);
              }}
              disabled={availableVehicles.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Dispatch Journey</span>
            </button>

            <button
              onClick={() => setReportModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Report Road Issue</span>
            </button>
          </div>
        </div>

        {/* Scoped Fleet Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">My Fleet Assets</span>
            <span className="text-2xl font-mono font-bold text-slate-900">
              {vehiclesLoading ? '...' : vehicles.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Active in Transit</span>
            <span className="text-2xl font-mono font-bold text-emerald-600">
              {deploymentsLoading ? '...' : activeDeployments.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Available at Depot</span>
            <span className="text-2xl font-mono font-bold text-blue-600">
              {vehiclesLoading ? '...' : availableVehicles.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Lifetime Missions</span>
            <span className="text-2xl font-mono font-bold text-slate-800">
              {deploymentsLoading ? '...' : deployments.length}
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span>Operations Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('VEHICLES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'VEHICLES'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-4 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
          </svg>
          <span>My Vehicles</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'VEHICLES' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {vehicles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('DEPLOYMENTS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'DEPLOYMENTS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Deployments / Trips</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'DEPLOYMENTS' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {activeDeployments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ROUTES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ROUTES'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span>Route & Accessibility Intelligence</span>
        </button>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Active Journeys Summary Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900">Current In-Transit Journeys</h3>
                <p className="text-xs text-slate-500">Live corridor transport missions assigned to your operator fleet</p>
              </div>
              {activeDeployments.length > 0 && (
                <button
                  onClick={() => setActiveTab('DEPLOYMENTS')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Manage All Journeys $\rightarrow$
                </button>
              )}
            </div>

            {activeDeployments.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-600">No active trips currently in transit</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {vehicles.length === 0
                    ? 'Register your fleet to start dispatching journeys.'
                    : `${availableVehicles.length} vehicles available for dispatch.`}
                </p>
                {availableVehicles.length > 0 && (
                  <button
                    onClick={() => {
                      setPreselectedDeployVehicle(null);
                      setDeployModalOpen(true);
                    }}
                    className="mt-3 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700"
                  >
                    Dispatch Journey Now
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeDeployments.slice(0, 4).map((d) => (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-xs text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {d.vehiclePlate || d.vehicleId}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                          {d.status}
                        </span>
                      </div>
                      <h4 className="font-heading font-bold text-sm text-slate-900 mt-1">
                        {d.origin} $\rightarrow$ {d.destination}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{d.assignedCorridor || 'Corridor'}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                      <span>Cargo: <strong className="text-slate-800">{d.cargo}</strong></span>
                      <button
                        onClick={() => setActiveTab('DEPLOYMENTS')}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Regional Alert Advisory Banner */}
          {alerts && alerts.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="font-heading font-bold text-sm text-amber-900">Active Regional Corridor Advisories</h3>
              </div>
              <div className="space-y-2 mt-3">
                {alerts.slice(0, 3).map((a) => (
                  <div key={a.id} className="text-xs text-amber-900 flex items-start gap-2">
                    <span className="font-bold font-mono text-[10px] bg-amber-200/70 px-1.5 py-0.5 rounded-sm shrink-0">
                      {a.severity}
                    </span>
                    <span>{a.title} — {a.location}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'VEHICLES' && (
        <UserVehicleManager onDeployVehicle={handleDeploySpecificVehicle} />
      )}

      {activeTab === 'DEPLOYMENTS' && (
        <UserDeploymentsView
          onOpenDeployModal={() => {
            setPreselectedDeployVehicle(null);
            setDeployModalOpen(true);
          }}
        />
      )}

      {activeTab === 'ROUTES' && <UserRouteIntelligenceView />}

      {/* Modals */}
      <UserRegisterVehicleModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={() => setActionSuccessMsg('New operator vehicle registered successfully!')}
      />

      <UserDeployModal
        isOpen={deployModalOpen}
        preselectedVehicle={preselectedDeployVehicle}
        onClose={() => {
          setDeployModalOpen(false);
          setPreselectedDeployVehicle(null);
        }}
        onSuccess={() => setActionSuccessMsg('Journey dispatched and authorized successfully!')}
      />

      <UserReportIncidentModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSuccess={() => setActionSuccessMsg('Field incident report submitted successfully!')}
      />
    </div>
  );
}
