import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import {
  NER_CITIES,
  NER_DISTRICTS,
  NER_CORRIDORS,
  INITIAL_INCIDENTS,
  INITIAL_ALERTS,
  INITIAL_VEHICLES,
  INITIAL_NER_DEPLOYMENTS,
  INITIAL_WEATHER,
  calculateKPIs,
} from '../data/nerData';
import api from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // State Containers
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [corridors, setCorridors] = useState(NER_CORRIDORS);
  const [districts, setDistricts] = useState(NER_DISTRICTS);
  const [weather, setWeather] = useState(INITIAL_WEATHER);
  const [activeRoute, setActiveRoute] = useState(null);

  // Authoritative Persistent Fleet State
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState(null);

  // Authoritative Persistent Deployment / Trip State
  const [deployments, setDeployments] = useState([]);
  const [deploymentsLoading, setDeploymentsLoading] = useState(true);
  const [deploymentsError, setDeploymentsError] = useState(null);

  // Backend Connectivity Telemetry
  const [backendHealth, setBackendHealth] = useState({
    status: 'checking',
    service: null,
    lastChecked: null,
  });

  // Central Authoritative Fleet Refresh / Hydration Function
  const refreshVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    setVehiclesError(null);
    try {
      const res = await api.getVehicles();
      if (res && res.success && Array.isArray(res.data)) {
        setVehicles(res.data);
        setVehiclesLoading(false);
        return res.data;
      } else if (res && Array.isArray(res.data)) {
        setVehicles(res.data);
        setVehiclesLoading(false);
        return res.data;
      } else if (Array.isArray(res)) {
        setVehicles(res);
        setVehiclesLoading(false);
        return res;
      } else {
        throw new Error('Invalid vehicle fleet payload structure received from backend API.');
      }
    } catch (err) {
      console.warn('[AppContext] Vehicle hydration failed:', err.message);
      const isDev = Boolean(import.meta.env?.DEV);
      setVehiclesError(err.message || 'Failed to load vehicle fleet from backend.');

      // Development / offline mode fallback:
      if (isDev) {
        console.info('[AppContext] Development fallback: initializing with demo INITIAL_VEHICLES.');
        setVehicles(INITIAL_VEHICLES);
      } else {
        setVehicles([]);
      }
      setVehiclesLoading(false);
      return null;
    }
  }, []);

  // Central Authoritative Deployment Refresh / Hydration Function
  const refreshDeployments = useCallback(async () => {
    setDeploymentsLoading(true);
    setDeploymentsError(null);
    try {
      const res = await api.getDeployments();
      if (res && res.success && Array.isArray(res.data)) {
        setDeployments(res.data);
        setDeploymentsLoading(false);
        return res.data;
      } else if (res && Array.isArray(res.data)) {
        setDeployments(res.data);
        setDeploymentsLoading(false);
        return res.data;
      } else if (Array.isArray(res)) {
        setDeployments(res);
        setDeploymentsLoading(false);
        return res;
      } else {
        throw new Error('Invalid deployments payload structure received from backend API.');
      }
    } catch (err) {
      console.warn('[AppContext] Deployment hydration failed:', err.message);
      const isDev = Boolean(import.meta.env?.DEV);
      setDeploymentsError(err.message || 'Failed to load deployments from backend.');

      if (isDev) {
        console.info('[AppContext] Development fallback: initializing with demo INITIAL_NER_DEPLOYMENTS.');
        setDeployments(INITIAL_NER_DEPLOYMENTS);
      } else {
        setDeployments([]);
      }
      setDeploymentsLoading(false);
      return null;
    }
  }, []);

  // Check Backend Health & Hydrate Vehicles & Deployments on Mount
  useEffect(() => {
    let isMounted = true;

    async function initializeApp() {
      // 1. Health check
      try {
        const res = await api.healthCheck();
        if (isMounted) {
          setBackendHealth({
            status: res.status === 'ok' || res.status === 'OK' ? 'online' : 'degraded',
            service: res.service || 'NER Logistics Intelligence API',
            lastChecked: new Date().toISOString(),
          });
          if (import.meta.env?.DEV) {
            console.log('[NER System] Backend Health Verified:', res);
          }
        }
      } catch (err) {
        if (isMounted) {
          setBackendHealth({
            status: 'offline',
            service: 'Unavailable',
            lastChecked: new Date().toISOString(),
          });
          if (import.meta.env?.DEV) {
            console.warn('[NER System] Backend not reachable. Running in local standalone mode.');
          }
        }
      }

      // 2. Authoritative Fleet & Deployments Hydration
      if (isMounted) {
        await Promise.allSettled([refreshVehicles(), refreshDeployments()]);
      }
    }

    initializeApp();
    return () => {
      isMounted = false;
    };
  }, [refreshVehicles, refreshDeployments]);

  // Derived Collections & State
  const activeDeployments = useMemo(() => {
    return deployments.filter((d) => ['ACTIVE', 'DELAYED', 'PLANNED'].includes(d.status));
  }, [deployments]);

  const deploymentHistory = useMemo(() => {
    return deployments.filter((d) => ['COMPLETED', 'CANCELLED'].includes(d.status));
  }, [deployments]);

  const availableVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (v.deploymentStatus) {
        return v.deploymentStatus === 'AVAILABLE';
      }
      return !v.hasActiveDeployment;
    });
  }, [vehicles]);

  const deployedVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (v.deploymentStatus) {
        return ['ACTIVE', 'DELAYED', 'PLANNED'].includes(v.deploymentStatus);
      }
      return Boolean(v.hasActiveDeployment);
    });
  }, [vehicles]);

  // Derived KPIs
  const kpis = useMemo(() => {
    return calculateKPIs(incidents, alerts, vehicles, corridors, districts, deployments);
  }, [incidents, alerts, vehicles, corridors, districts, deployments]);

  // Action Dispatches
  const addIncident = useCallback((incident) => {
    setIncidents((prev) => [incident, ...prev]);
  }, []);

  const addAlert = useCallback((alert) => {
    setAlerts((prev) => [alert, ...prev]);
  }, []);

  const addVehicle = useCallback((vehicle) => {
    if (!vehicle || !vehicle.id) return;
    setVehicles((prev) => {
      const existsIndex = prev.findIndex(
        (v) => String(v.id).toLowerCase() === String(vehicle.id).toLowerCase()
      );
      if (existsIndex >= 0) {
        const next = [...prev];
        next[existsIndex] = { ...next[existsIndex], ...vehicle };
        return next;
      }
      return [...prev, vehicle];
    });
  }, []);

  const updateVehicle = useCallback((vehicleId, updates) => {
    if (!vehicleId) return;
    setVehicles((prev) =>
      prev.map((v) =>
        String(v.id).toLowerCase() === String(vehicleId).toLowerCase()
          ? { ...v, ...(typeof updates === 'object' ? updates : {}) }
          : v
      )
    );
  }, []);

  const deleteVehicle = useCallback((vehicleId) => {
    if (!vehicleId) return;
    setVehicles((prev) =>
      prev.filter((v) => String(v.id).toLowerCase() !== String(vehicleId).toLowerCase())
    );
  }, []);

  const updateCorridor = useCallback((corridorId, updates) => {
    setCorridors((prev) =>
      prev.map((c) => (c.id === corridorId ? { ...c, ...updates } : c))
    );
  }, []);

  // Deployment Lifecycle Dispatches
  const createDeployment = useCallback(
    async (deploymentData) => {
      const res = await api.createDeployment(deploymentData);
      await Promise.allSettled([refreshDeployments(), refreshVehicles()]);
      return res;
    },
    [refreshDeployments, refreshVehicles]
  );

  const completeDeployment = useCallback(
    async (deploymentId) => {
      const res = await api.completeDeployment(deploymentId);
      await Promise.allSettled([refreshDeployments(), refreshVehicles()]);
      return res;
    },
    [refreshDeployments, refreshVehicles]
  );

  const cancelDeployment = useCallback(
    async (deploymentId) => {
      const res = await api.cancelDeployment(deploymentId);
      await Promise.allSettled([refreshDeployments(), refreshVehicles()]);
      return res;
    },
    [refreshDeployments, refreshVehicles]
  );

  const contextValue = useMemo(
    () => ({
      // Data
      cities: NER_CITIES,
      districts,
      corridors,
      incidents,
      alerts,
      vehicles,
      vehiclesLoading,
      vehiclesError,
      deployments,
      deploymentsLoading,
      deploymentsError,
      activeDeployments,
      deploymentHistory,
      availableVehicles,
      deployedVehicles,
      weather,
      activeRoute,
      kpis,
      backendHealth,

      // State Actions
      setDistricts,
      setCorridors,
      setIncidents,
      setAlerts,
      setVehicles,
      setDeployments,
      setWeather,
      setActiveRoute,
      addIncident,
      addAlert,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      refreshVehicles,
      refreshDeployments,
      createDeployment,
      completeDeployment,
      cancelDeployment,
      updateCorridor,
    }),
    [
      districts,
      corridors,
      incidents,
      alerts,
      vehicles,
      vehiclesLoading,
      vehiclesError,
      deployments,
      deploymentsLoading,
      deploymentsError,
      activeDeployments,
      deploymentHistory,
      availableVehicles,
      deployedVehicles,
      weather,
      activeRoute,
      kpis,
      backendHealth,
      addIncident,
      addAlert,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      refreshVehicles,
      refreshDeployments,
      createDeployment,
      completeDeployment,
      cancelDeployment,
      updateCorridor,
    ]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
