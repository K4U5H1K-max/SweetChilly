import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { formatIST } from '../utils/timeFormat';
import {
  IconMap,
  IconTruck,
  IconWarning,
  IconWeather,
  IconRoute,
  IconShield,
  IconPin,
  IconClose,
} from './common/AppIcons';
import InfoPopover from './common/InfoPopover';

export default function MapplsGISMap({
  selectedIncidentId,
  onSelectIncident,
  selectedVehicleId,
  onSelectVehicle,
  onEditVehicle,
  onOpenSafetyModal,
  onOpenDeployModal,
  onOpenVehicleHistory,
  onPlanBypass,
  fullHeight = false,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const incidentsLayerRef = useRef(null);
  const corridorsLayerRef = useRef(null);
  const vehiclesLayerRef = useRef(null);
  const hubsLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const weatherLayerRef = useRef(null);

  const incidentMarkersMapRef = useRef(new Map());
  const vehicleMarkersMapRef = useRef(new Map());

  const { incidents, alerts, vehicles, corridors, cities, weather, activeRoute, setActiveRoute } = useApp();

  const [layers, setLayers] = useState({
    incidents: true,
    vehicles: true,
    corridors: true,
    hubs: true,
    route: true,
    weather: false,
  });

  const [selectedItem, setSelectedItem] = useState(null); // { type: 'INCIDENT' | 'VEHICLE' | 'WEATHER', data: ... }

  const mapplsApiKey = import.meta.env.VITE_MAPPLS_API_KEY;

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centered on Northeast India (Assam / Meghalaya / Nagaland hub)
      const map = L.map(mapContainerRef.current, {
        center: [25.85, 92.70],
        zoom: 7,
        minZoom: 6,
        maxZoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      // Custom Zoom Control (Top Left)
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Clean OpenStreetMap Tile Layer - 100% Free, Reliable & Zero Watermark
      let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      let tileOptions = {
        subdomains: 'abc',
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        className: 'clean-gis-tiles',
      };

      if (mapplsApiKey) {
        tileUrl = `https://apis.mappls.com/advancedmaps/v1/${mapplsApiKey}/still_map/{z}/{x}/{y}.png`;
      }

      L.tileLayer(tileUrl, tileOptions).addTo(map);

      // Clean Attribution
      L.control
        .attribution({
          position: 'bottomright',
          prefix: '<span class="text-[11px] text-slate-500">NER Logistics GIS</span>',
        })
        .addTo(map);

      // Initialize Layer Groups
      corridorsLayerRef.current = L.layerGroup().addTo(map);
      hubsLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      incidentsLayerRef.current = L.layerGroup().addTo(map);
      vehiclesLayerRef.current = L.layerGroup().addTo(map);
      weatherLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapplsApiKey]);

  // Recenter Map
  const handleRecenter = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([25.85, 92.70], 7, { duration: 1.0 });
    }
  }, []);

  // Update Arterial Highway Corridors
  useEffect(() => {
    if (!mapInstanceRef.current || !corridorsLayerRef.current) return;
    corridorsLayerRef.current.clearLayers();

    if (!layers.corridors) return;

    corridors.forEach((corridor) => {
      if (!corridor.coordinates || corridor.coordinates.length < 2) return;

      const isDisrupted = corridor.status === 'DISRUPTED';
      const isCaution = corridor.status === 'CAUTION';

      let strokeColor = '#334155'; // Slate 700
      let strokeWidth = 3;
      let dashArray = null;

      if (isDisrupted) {
        strokeColor = '#E11D48'; // Rose 600
        strokeWidth = 4;
        dashArray = '8, 6';
      } else if (isCaution) {
        strokeColor = '#D97706'; // Amber 600
        strokeWidth = 3.5;
        dashArray = '6, 4';
      }

      const polyline = L.polyline(corridor.coordinates, {
        color: strokeColor,
        weight: strokeWidth,
        opacity: 0.85,
        dashArray: dashArray,
        lineCap: 'round',
        lineJoin: 'round',
      });

      const popupHtml = `
        <div class="p-3.5 bg-white min-w-[240px] font-sans">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span class="font-mono text-[11px] font-bold text-slate-500">${corridor.id}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              isDisrupted
                ? 'bg-rose-100 text-rose-800'
                : isCaution
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }">
              ${corridor.status}
            </span>
          </div>
          <div class="font-bold text-slate-900 text-sm mb-1">${corridor.name}</div>
          <div class="text-xs text-slate-600 mb-2">
            ${corridor.origin} → ${corridor.destination} (${corridor.lengthKm} km)
          </div>
          ${
            corridor.disruptionReason
              ? `<div class="p-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md mb-2">
                  <span class="font-bold">Hazard:</span> ${corridor.disruptionReason}
                </div>`
              : ''
          }
          <div class="text-[11px] text-slate-500 flex justify-between">
            <span>Avg Transit: ~${corridor.avgTransitHours}h</span>
            <span class="${corridor.delayMinutes > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}">
              +${corridor.delayMinutes}m delay
            </span>
          </div>
        </div>
      `;

      polyline.bindPopup(popupHtml, { className: 'govtech-popup' });
      corridorsLayerRef.current.addLayer(polyline);
    });
  }, [corridors, layers.corridors]);

  // Update Regional Logistics Hubs
  useEffect(() => {
    if (!mapInstanceRef.current || !hubsLayerRef.current) return;
    hubsLayerRef.current.clearLayers();

    if (!layers.hubs) return;

    cities.forEach((city) => {
      const hubIcon = L.divIcon({
        className: 'custom-hub-marker',
        html: `
          <div class="group relative flex items-center justify-center">
            <div class="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-white shadow-md transition-transform group-hover:scale-125"></div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm opacity-90 group-hover:opacity-100 pointer-events-none">
              ${city.name}
            </div>
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([city.lat, city.lng], { icon: hubIcon });

      const popupHtml = `
        <div class="p-3 bg-white min-w-[200px] font-sans">
          <div class="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
            <span class="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Regional Hub</span>
            <span class="text-[11px] text-slate-500 font-mono">${city.state}</span>
          </div>
          <div class="font-bold text-slate-900 text-sm mb-1">${city.name}</div>
          <div class="text-xs text-slate-600 mb-2">${city.hubType || 'Key logistics node'}</div>
          <div class="text-[11px] font-mono text-slate-500">
            ${city.lat.toFixed(4)}°N, ${city.lng.toFixed(4)}°E
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'govtech-popup' });
      hubsLayerRef.current.addLayer(marker);
    });
  }, [cities, layers.hubs]);

  // Update Dynamic Incident Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !incidentsLayerRef.current) return;
    incidentsLayerRef.current.clearLayers();
    incidentMarkersMapRef.current.clear();

    if (!layers.incidents) return;

    incidents.forEach((inc) => {
      const isCritical = inc.severity === 'CRITICAL' || inc.severity === 'HIGH';
      const isSelected = selectedIncidentId === inc.id;

      const markerIcon = L.divIcon({
        className: 'custom-incident-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform ${
            isSelected ? 'scale-125 z-50' : 'hover:scale-110'
          }">
            ${
              isCritical
                ? '<div class="absolute w-7 h-7 rounded-full bg-rose-500/30 animate-ping"></div>'
                : ''
            }
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white ${
              isCritical ? 'bg-rose-600' : 'bg-amber-500'
            }">
              <span class="text-xs font-bold">!</span>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([inc.lat, inc.lng], { icon: markerIcon });

      marker.on('click', () => {
        setSelectedItem({ type: 'INCIDENT', data: inc });
        if (onSelectIncident) {
          onSelectIncident(inc.id);
        }
      });

      incidentsLayerRef.current.addLayer(marker);
      incidentMarkersMapRef.current.set(inc.id, marker);
    });
  }, [incidents, layers.incidents, selectedIncidentId, onSelectIncident]);

  // Update Dynamic Fleet Vehicle Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !vehiclesLayerRef.current) return;
    vehiclesLayerRef.current.clearLayers();
    vehicleMarkersMapRef.current.clear();

    if (!layers.vehicles) return;

    // Operational GIS map displays vehicles with active deployment or registered in fleet
    const activeVehicles = vehicles.filter((veh) => {
      if (veh.hasActiveDeployment !== undefined) {
        return Boolean(veh.hasActiveDeployment);
      }
      if (veh.deploymentStatus) {
        return ['ACTIVE', 'DELAYED', 'PLANNED'].includes(veh.deploymentStatus);
      }
      return false;
    });

    activeVehicles.forEach((veh) => {
      if (!veh.currentPos) return;

      const isSelected = selectedVehicleId === veh.id;
      const statusNormalized = String(veh.status || 'IN_TRANSIT').toUpperCase().replace(/\s+/g, '_');
      const isEmergency = veh.priority === 'EMERGENCY_CRITICAL' || statusNormalized === 'EMERGENCY';
      const isDelayed = statusNormalized === 'DELAYED';
      const isSafetyAlert = veh.isFlagged || veh.safetyStatus === 'BREAKDOWN' || veh.safetyStatus === 'ASSISTANCE_REQUIRED';

      let markerBg = 'bg-slate-900';
      if (isEmergency || veh.safetyStatus === 'ASSISTANCE_REQUIRED') markerBg = 'bg-rose-600';
      else if (isSafetyAlert || isDelayed) markerBg = 'bg-amber-600';

      const vehicleIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform ${
            isSelected ? 'scale-125 z-50' : 'hover:scale-110'
          }">
            ${
              isSafetyAlert
                ? '<div class="absolute w-8 h-8 rounded-lg bg-amber-500/40 animate-ping"></div>'
                : ''
            }
            <div class="w-7 h-7 rounded-lg ${markerBg} text-white flex items-center justify-center shadow-lg border-2 border-white">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" />
              </svg>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([veh.currentPos.lat, veh.currentPos.lng], { icon: vehicleIcon });

      marker.on('click', () => {
        setSelectedItem({ type: 'VEHICLE', data: veh });
        if (onSelectVehicle) {
          onSelectVehicle(veh.id);
        }
      });

      vehiclesLayerRef.current.addLayer(marker);
      vehicleMarkersMapRef.current.set(veh.id, marker);
    });
  }, [vehicles, layers.vehicles, selectedVehicleId, onSelectVehicle]);

  // Update Corridor Weather Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !weatherLayerRef.current) return;
    weatherLayerRef.current.clearLayers();

    if (!layers.weather || !weather || weather.length === 0) return;

    weather.forEach((w) => {
      const matchedCorridor = corridors.find((c) => c.id === w.corridorId);
      if (!matchedCorridor || !matchedCorridor.coordinates || matchedCorridor.coordinates.length === 0) return;

      const midIndex = Math.floor(matchedCorridor.coordinates.length / 2);
      const midCoord = matchedCorridor.coordinates[midIndex];

      const isHighRisk = w.landslideRisk === 'CRITICAL' || w.landslideRisk === 'HIGH';

      const weatherIcon = L.divIcon({
        className: 'custom-weather-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            <div class="px-2 py-1 rounded-lg ${
              isHighRisk ? 'bg-amber-900/90 text-amber-200' : 'bg-blue-900/90 text-blue-100'
            } border border-white/40 shadow-md text-[10px] font-mono flex items-center gap-1 backdrop-blur-xs">
              <span>🌧️</span>
              <span>${w.rainfallMm}mm</span>
            </div>
          </div>
        `,
        iconSize: [50, 20],
        iconAnchor: [25, 10],
      });

      const marker = L.marker(midCoord, { icon: weatherIcon });

      marker.on('click', () => {
        setSelectedItem({
          type: 'WEATHER',
          data: { ...w, corridorName: matchedCorridor.name },
        });
      });

      weatherLayerRef.current.addLayer(marker);
    });
  }, [weather, corridors, layers.weather]);

  // Update AI Projected Active Route
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();

    if (!activeRoute || !layers.route) return;

    const latLngs = [];

    if (activeRoute.waypoints && activeRoute.waypoints.length > 0) {
      activeRoute.waypoints.forEach((wp) => {
        if (wp.lat && wp.lng) {
          latLngs.push([wp.lat, wp.lng]);
        }
      });
    }

    if (latLngs.length < 2) return;

    // Glowing Background Line
    const glowLine = L.polyline(latLngs, {
      color: '#3B82F6',
      weight: 8,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    });
    routeLayerRef.current.addLayer(glowLine);

    // Main Crisp Polyline
    const mainLine = L.polyline(latLngs, {
      color: '#2563EB',
      weight: 4,
      opacity: 0.95,
      dashArray: '8, 6',
      lineCap: 'round',
      lineJoin: 'round',
    });
    routeLayerRef.current.addLayer(mainLine);

    // Auto-fit bounds
    try {
      const bounds = L.latLngBounds(latLngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], duration: 1.0 });
    } catch (err) {
      console.warn('[GIS Map] Error fitting bounds:', err);
    }
  }, [activeRoute, layers.route]);

  // Handle Incident Selection Focus
  useEffect(() => {
    if (!selectedIncidentId || !mapInstanceRef.current) return;
    const targetInc = incidents.find((i) => i.id === selectedIncidentId);
    if (targetInc) {
      mapInstanceRef.current.flyTo([targetInc.lat, targetInc.lng], 10, { duration: 0.8 });
      setSelectedItem({ type: 'INCIDENT', data: targetInc });
    }
  }, [selectedIncidentId, incidents]);

  // Handle Vehicle Selection Focus
  useEffect(() => {
    if (!selectedVehicleId || !mapInstanceRef.current) return;
    const targetVeh = vehicles.find((v) => v.id === selectedVehicleId);
    if (targetVeh && targetVeh.currentPos) {
      mapInstanceRef.current.flyTo([targetVeh.currentPos.lat, targetVeh.currentPos.lng], 10, { duration: 0.8 });
      setSelectedItem({ type: 'VEHICLE', data: targetVeh });
    }
  }, [selectedVehicleId, vehicles]);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-card flex flex-col relative overflow-hidden font-sans">
      {/* Top Map Control Bar */}
      <div className="border-b border-slate-100 bg-slate-50/90 px-3.5 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          <span className="font-heading font-bold text-xs text-slate-800">
            Regional GIS Operations Map
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-xs text-slate-500 hidden sm:inline">Spatial Intelligence</span>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 max-w-full">
          {activeRoute && (
            <button
              onClick={() => setLayers((prev) => ({ ...prev, route: !prev.route }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer touch-target sm:min-h-0 ${
                layers.route
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Route
            </button>
          )}

          <button
            onClick={() => setLayers((prev) => ({ ...prev, incidents: !prev.incidents }))}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer touch-target sm:min-h-0 ${
              layers.incidents
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Disruptions ({incidents.length})
          </button>

          <button
            onClick={() => setLayers((prev) => ({ ...prev, vehicles: !prev.vehicles }))}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer touch-target sm:min-h-0 ${
              layers.vehicles
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Fleet ({vehicles.length})
          </button>

          <button
            onClick={() => setLayers((prev) => ({ ...prev, weather: !prev.weather }))}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer touch-target sm:min-h-0 ${
              layers.weather
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Weather
          </button>

          <button
            onClick={handleRecenter}
            title="Reset Map to Regional NER View"
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all whitespace-nowrap cursor-pointer touch-target sm:min-h-0"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Main Leaflet Map Canvas */}
      <div className="relative w-full">
        <div
          ref={mapContainerRef}
          className={`w-full ${fullHeight ? 'h-[520px] sm:h-[620px] md:h-[720px]' : 'h-[380px] sm:h-[480px] md:h-[560px]'} bg-slate-100 relative z-0`}
          style={{ minHeight: '340px' }}
        />

        {/* Floating Active Route Projection HUD */}
        {activeRoute && (
          <div className="absolute top-3 right-3 z-400 bg-slate-900/95 text-white rounded-xl border border-slate-700 p-3 shadow-xl max-w-xs sm:max-w-sm font-sans backdrop-blur-md animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block animate-pulse"></span>
                Active Projected Route
              </span>
              <button
                onClick={() => setActiveRoute(null)}
                className="text-slate-400 hover:text-rose-400 text-xs font-bold px-1 cursor-pointer"
                title="Clear Projected Route"
              >
                ✕
              </button>
            </div>

            <div className="font-bold text-xs text-white mb-1.5 truncate">
              {activeRoute.recommendedCorridor}
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs bg-slate-800/80 p-2 rounded-lg border border-slate-700/80 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px]">Distance:</span>
                <span className="font-bold">{activeRoute.distanceKm} km</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">ETA:</span>
                <span className="font-bold">~{activeRoute.estimatedDurationHours}h</span>
              </div>
              <div>
                <span className="text-emerald-400 block text-[9px]">Saved:</span>
                <span className="font-bold text-emerald-400">+{activeRoute.delayAvoidedMinutes || 180}m</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected-Item Floating Detail Bottom Sheet / Card */}
        {selectedItem && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-sm z-400 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl p-4 animate-in slide-in-from-bottom-3 duration-200 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-900 text-white font-mono">
                  {selectedItem.type}
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {selectedItem.data.id || selectedItem.data.licensePlate || selectedItem.data.corridorId}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* INCIDENT CARD */}
            {selectedItem.type === 'INCIDENT' && (
              <div className="space-y-2">
                <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                  {selectedItem.data.title || selectedItem.data.type}
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {selectedItem.data.description}
                </p>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                  <span>Reported: {formatIST(selectedItem.data.reportedAt, 'timeOnly')}</span>
                  <span className="font-bold text-rose-600 uppercase">{selectedItem.data.severity}</span>
                </div>
                {onPlanBypass && (
                  <button
                    onClick={() => {
                      onPlanBypass(selectedItem.data);
                      setSelectedItem(null);
                    }}
                    className="w-full mt-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-target sm:min-h-0"
                  >
                    <IconRoute className="w-3.5 h-3.5" />
                    <span>Calculate Tactical Bypass</span>
                  </button>
                )}
              </div>
            )}

            {/* VEHICLE CARD */}
            {selectedItem.type === 'VEHICLE' && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">{selectedItem.data.licensePlate || selectedItem.data.id}</span>
                  <span className="text-emerald-700 font-bold">{selectedItem.data.speedKmH || 0} km/h</span>
                </div>
                <div className="text-slate-600">
                  Route: <strong>{selectedItem.data.origin || 'Depot'} → {selectedItem.data.destination || 'Hub'}</strong>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Driver: {selectedItem.data.driverName} • {selectedItem.data.driverPhone}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  {onOpenSafetyModal && (
                    <button
                      onClick={() => onOpenSafetyModal(selectedItem.data.id)}
                      className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-center text-xs touch-target sm:min-h-0"
                    >
                      Safety Check
                    </button>
                  )}
                  {onOpenDeployModal && (
                    <button
                      onClick={() => onOpenDeployModal(selectedItem.data.id)}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-center text-xs touch-target sm:min-h-0"
                    >
                      Deploy
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* WEATHER CARD */}
            {selectedItem.type === 'WEATHER' && (
              <div className="space-y-2 text-xs">
                <h4 className="font-heading font-bold text-slate-900">{selectedItem.data.corridorName || selectedItem.data.location}</h4>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Rainfall:</span>
                    <span className="font-bold text-blue-700">{selectedItem.data.rainfallMm} mm</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Visibility:</span>
                    <span className="font-bold text-slate-700">{selectedItem.data.visibilityM} m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Condition:</span>
                    <span className="font-bold text-slate-700">{selectedItem.data.condition}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Landslide Risk:</span>
                    <span className={`font-bold ${selectedItem.data.landslideRisk === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {selectedItem.data.landslideRisk}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Map Legend */}
      <div className="border-t border-slate-100 bg-slate-50/70 px-3.5 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="font-bold text-slate-700">Legend:</span>
          
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
            <span>Disruption</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span>
            <span>Fleet</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3.5 h-0.5 bg-rose-600 inline-block border-t border-dashed border-rose-300"></span>
            <span>Blocked</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3.5 h-0.5 bg-slate-700 inline-block"></span>
            <span>Open Highway</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3.5 h-1 bg-blue-600 rounded-full inline-block"></span>
            <span>Active Route</span>
          </div>
        </div>

        <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
          WGS-84 • 8 NE States
        </div>
      </div>
    </div>
  );
}
