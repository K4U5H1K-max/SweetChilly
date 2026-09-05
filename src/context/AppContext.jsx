import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import {
  NER_CITIES,
  NER_DISTRICTS,
  NER_CORRIDORS,
  INITIAL_INCIDENTS,
  INITIAL_ALERTS,
  INITIAL_VEHICLES,
  INITIAL_WEATHER,
  calculateKPIs,
} from '../data/nerData';
import api from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // State Containers
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [vehicles, setVehicles] = useState(INITIAL_VEHICLES);
  const [corridors, setCorridors] = useState(NER_CORRIDORS);
  const [districts, setDistricts] = useState(NER_DISTRICTS);
  const [weather, setWeather] = useState(INITIAL_WEATHER);
  const [activeRoute, setActiveRoute] = useState(null);

  // Backend Connectivity Telemetry
  const [backendHealth, setBackendHealth] = useState({
    status: 'checking',
    service: null,
    lastChecked: null,
  });

  // Check Backend Health on Mount
  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        const res = await api.healthCheck();
        if (isMounted) {
          setBackendHealth({
            status: res.status === 'ok' ? 'online' : 'degraded',
            service: res.service || 'NER Logistics Intelligence API',
            lastChecked: new Date().toISOString(),
          });
          if (import.meta.env.DEV) {
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
          if (import.meta.env.DEV) {
            console.warn('[NER System] Backend not reachable at localhost:5000. Running in local standalone state mode.');
          }
        }
      }
    }

    checkHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Derived KPIs
  const kpis = useMemo(() => {
    return calculateKPIs(incidents, alerts, vehicles, corridors, districts);
  }, [incidents, alerts, vehicles, corridors, districts]);

  // Action Dispatches
  const addIncident = useCallback((incident) => {
    setIncidents((prev) => [incident, ...prev]);
  }, []);

  const addAlert = useCallback((alert) => {
    setAlerts((prev) => [alert, ...prev]);
  }, []);

  const addVehicle = useCallback((vehicle) => {
    setVehicles((prev) => [...prev, vehicle]);
  }, []);

  const updateVehicle = useCallback((vehicleId, updates) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, ...updates } : v))
    );
  }, []);

  const updateCorridor = useCallback((corridorId, updates) => {
    setCorridors((prev) =>
      prev.map((c) => (c.id === corridorId ? { ...c, ...updates } : c))
    );
  }, []);

  const contextValue = useMemo(
    () => ({
      // Data
      cities: NER_CITIES,
      districts,
      corridors,
      incidents,
      alerts,
      vehicles,
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
      setWeather,
      setActiveRoute,
      addIncident,
      addAlert,
      addVehicle,
      updateVehicle,
      updateCorridor,
    }),
    [
      districts,
      corridors,
      incidents,
      alerts,
      vehicles,
      weather,
      activeRoute,
      kpis,
      backendHealth,
      addIncident,
      addAlert,
      addVehicle,
      updateVehicle,
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
