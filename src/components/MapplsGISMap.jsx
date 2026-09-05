import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';

export default function MapplsGISMap({
  selectedIncidentId,
  onSelectIncident,
  selectedVehicleId,
  onSelectVehicle,
  onEditVehicle,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const incidentsLayerRef = useRef(null);
  const corridorsLayerRef = useRef(null);
  const vehiclesLayerRef = useRef(null);
  const hubsLayerRef = useRef(null);
  const routeLayerRef = useRef(null);

  const incidentMarkersMapRef = useRef(new Map());
  const vehicleMarkersMapRef = useRef(new Map());

  const { incidents, alerts, vehicles, corridors, cities, activeRoute, setActiveRoute } = useApp();

  const [layers, setLayers] = useState({
    incidents: true,
    vehicles: true,
    corridors: true,
    hubs: true,
    route: true,
  });

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
          <div class="text-xs text-slate-600 mb-2">${city.description || 'Key logistics and transit node'}</div>
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
            ${
              isSelected
                ? '<div class="absolute -top-7 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold shadow-md whitespace-nowrap">Selected</div>'
                : ''
            }
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([inc.lat, inc.lng], { icon: markerIcon });

      const popupHtml = `
        <div class="p-3.5 bg-white min-w-[260px] font-sans">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span class="font-mono text-[10px] font-bold text-slate-500">${inc.id}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              isCritical
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-800'
            }">
              ${inc.severity}
            </span>
          </div>
          <div class="font-bold text-slate-900 text-sm mb-1">${inc.type}</div>
          <div class="text-xs text-slate-700 font-medium mb-1.5">${inc.location || 'Highway Corridor'}</div>
          <p class="text-xs text-slate-600 mb-2 leading-relaxed">${inc.description}</p>
          
          ${
            inc.imageUrl
              ? `<div class="mb-2 rounded-lg overflow-hidden border border-slate-200">
                  <img src="${inc.imageUrl}" alt="${inc.type}" class="w-full h-24 object-cover" />
                </div>`
              : ''
          }
          
          <div class="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-100 flex justify-between">
            <span>${inc.lat.toFixed(4)}°N, ${inc.lng.toFixed(4)}°E</span>
            <span class="text-slate-600">${inc.status}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'govtech-popup' });

      marker.on('click', () => {
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

    vehicles.forEach((veh) => {
      if (!veh.currentPos) return;

      const isSelected = selectedVehicleId === veh.id;
      const statusNormalized = String(veh.status || 'IN_TRANSIT').toUpperCase().replace(/\s+/g, '_');
      const isEmergency = veh.priority === 'EMERGENCY_CRITICAL' || statusNormalized === 'EMERGENCY';
      const isDelayed = statusNormalized === 'DELAYED';

      let markerBg = 'bg-slate-900';
      if (isEmergency) markerBg = 'bg-rose-600';
      else if (isDelayed) markerBg = 'bg-amber-600';

      const vehicleIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform ${
            isSelected ? 'scale-125 z-50' : 'hover:scale-110'
          }">
            <div class="w-7 h-7 rounded-lg ${markerBg} text-white flex items-center justify-center shadow-lg border-2 border-white">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" />
              </svg>
            </div>
            ${
              isSelected
                ? '<div class="absolute -top-7 px-2 py-0.5 rounded bg-blue-700 text-white text-[10px] font-bold shadow-md whitespace-nowrap">Tracking</div>'
                : ''
            }
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([veh.currentPos.lat, veh.currentPos.lng], { icon: vehicleIcon });

      const popupHtml = `
        <div class="p-3.5 bg-white min-w-[260px] font-sans">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span class="font-mono text-[10px] font-bold text-slate-500">${veh.id}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              isEmergency
                ? 'bg-rose-100 text-rose-800'
                : isDelayed
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-800'
            }">
              ${statusNormalized.replace('_', ' ')}
            </span>
          </div>
          <div class="font-bold text-slate-900 text-sm mb-0.5">${veh.name}</div>
          <div class="text-xs text-slate-600 mb-2">
            <span class="font-medium">${veh.origin}</span> → <span class="font-medium">${veh.destination}</span>
          </div>
          <div class="bg-slate-50 p-2 rounded-md border border-slate-100 text-xs space-y-1 mb-2">
            <div class="flex justify-between">
              <span class="text-slate-500">Payload:</span>
              <span class="font-semibold text-slate-800">${veh.cargo} (${veh.capacity || '5T'})</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Speed:</span>
              <span class="font-mono font-bold text-slate-800">${veh.speedKmH || 0} km/h</span>
            </div>
            ${
              veh.delayEstMinutes > 0
                ? `<div class="flex justify-between text-rose-600 font-bold">
                    <span>Est. Delay:</span>
                    <span>+${veh.delayEstMinutes} mins</span>
                  </div>`
                : ''
            }
          </div>
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span class="text-[11px] font-mono text-slate-400">
              ${veh.currentPos.lat.toFixed(4)}°N, ${veh.currentPos.lng.toFixed(4)}°E
            </span>
            ${
              onEditVehicle
                ? `<button id="edit-veh-btn-${veh.id}" class="px-2.5 py-1 rounded bg-slate-900 text-white hover:bg-blue-700 text-xs font-semibold transition-colors">
                    Update
                  </button>`
                : ''
            }
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'govtech-popup' });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`edit-veh-btn-${veh.id}`);
        if (btn && onEditVehicle) {
          btn.onclick = () => onEditVehicle(veh.id);
        }
      });

      marker.on('click', () => {
        if (onSelectVehicle) {
          onSelectVehicle(veh.id);
        }
      });

      vehiclesLayerRef.current.addLayer(marker);
      vehicleMarkersMapRef.current.set(veh.id, marker);
    });
  }, [vehicles, layers.vehicles, selectedVehicleId, onSelectVehicle, onEditVehicle]);

  // Update AI Projected Active Route
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();

    if (!activeRoute || !layers.route) return;

    const latLngs = [];

    // Collect waypoints
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

    // Waypoint Markers
    activeRoute.waypoints.forEach((wp, idx) => {
      const isDetour = wp.type === 'DETOUR';
      const isEnd = wp.type === 'ORIGIN' || wp.type === 'DESTINATION';

      let bg = 'bg-blue-600';
      if (isDetour) bg = 'bg-amber-500';
      if (isEnd) bg = 'bg-slate-900';

      const wpIcon = L.divIcon({
        className: 'custom-wp-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-5 h-5 rounded-full ${bg} text-white flex items-center justify-center font-bold text-[10px] shadow-md border-2 border-white">
              ${idx + 1}
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([wp.lat, wp.lng], { icon: wpIcon });
      marker.bindPopup(
        `<div class="p-2.5 font-sans">
          <div class="text-[10px] font-bold uppercase text-slate-500">Waypoint ${idx + 1} (${wp.type})</div>
          <div class="font-bold text-slate-900 text-xs">${wp.name}</div>
          <div class="text-[11px] text-slate-600">${wp.note || 'Nominal Passable'}</div>
        </div>`
      );
      routeLayerRef.current.addLayer(marker);
    });

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
      const marker = incidentMarkersMapRef.current.get(selectedIncidentId);
      if (marker) {
        setTimeout(() => marker.openPopup(), 850);
      }
    }
  }, [selectedIncidentId, incidents]);

  // Handle Vehicle Selection Focus
  useEffect(() => {
    if (!selectedVehicleId || !mapInstanceRef.current) return;
    const targetVeh = vehicles.find((v) => v.id === selectedVehicleId);
    if (targetVeh) {
      mapInstanceRef.current.flyTo([targetVeh.currentPos.lat, targetVeh.currentPos.lng], 10, { duration: 0.8 });
      const marker = vehicleMarkersMapRef.current.get(selectedVehicleId);
      if (marker) {
        setTimeout(() => marker.openPopup(), 850);
      }
    }
  }, [selectedVehicleId, vehicles]);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col relative overflow-hidden">
      {/* Top Map Control Bar */}
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          <span className="font-heading font-bold text-xs text-slate-800">
            North East operations map
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500 hidden sm:inline">Live incidents, fleet movement and corridor status</span>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          {activeRoute && (
            <button
              onClick={() => setLayers((prev) => ({ ...prev, route: !prev.route }))}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                layers.route
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Active route
            </button>
          )}

          <button
            onClick={() => setLayers((prev) => ({ ...prev, incidents: !prev.incidents }))}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              layers.incidents
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Incidents ({incidents.length})
          </button>

          <button
            onClick={() => setLayers((prev) => ({ ...prev, vehicles: !prev.vehicles }))}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              layers.vehicles
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Fleet ({vehicles.length})
          </button>

          <button
            onClick={() => setLayers((prev) => ({ ...prev, corridors: !prev.corridors }))}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              layers.corridors
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Corridors ({corridors.length})
          </button>

          <button
            onClick={handleRecenter}
            title="Reset Map to Regional NER View"
            className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all"
          >
            ↺ Recenter
          </button>
        </div>
      </div>

      {/* Main Leaflet Map Canvas */}
      <div className="relative w-full">
        <div
          ref={mapContainerRef}
          className="w-full h-[520px] md:h-[580px] bg-slate-100 relative z-0"
          style={{ minHeight: '480px' }}
        />

        {/* Floating Active Route Projection HUD */}
        {activeRoute && (
          <div className="absolute top-4 right-4 z-400 bg-slate-900/95 text-white rounded-xl border border-slate-700 p-3.5 shadow-xl max-w-xs sm:max-w-sm font-sans backdrop-blur-md animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block animate-pulse"></span>
                Active optimal route
              </span>
              <button
                onClick={() => setActiveRoute(null)}
                className="text-slate-400 hover:text-rose-400 text-xs font-bold px-1"
                title="Clear Projected Route"
              >
                ✕ Clear
              </button>
            </div>

            <div className="font-bold text-sm text-white mb-1.5">
              {activeRoute.recommendedCorridor}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs bg-slate-800/80 p-2 rounded-lg border border-slate-700/80 mb-2 font-mono">
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

            {activeRoute.avoidedIncidents?.length > 0 && (
              <div className="text-[11px] text-rose-300 flex items-center gap-1">
                <span>⚠️ Bypassing: {activeRoute.avoidedIncidents[0].split('(')[0]}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Map Legend */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-700 text-xs">Legend:</span>
          
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
            <span>Critical disruption</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Caution / delay</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span>
            <span>Fleet unit</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-rose-600 inline-block border-t border-dashed border-rose-300"></span>
            <span>Blocked arterial</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-slate-700 inline-block"></span>
            <span>Passable corridor</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-blue-600 rounded-full inline-block"></span>
            <span>Projected route</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          WGS-84 • Extent: 88°E - 97°E, 22°N - 29°N
        </div>
      </div>
    </div>
  );
}
