import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  AllocateResponse,
  Bus,
  ForecastResponse,
  RiskLevel,
  Stop,
} from '../types/api';
import { MapPin, Bus as BusIcon, AlertTriangle, ArrowRight, ShieldCheck, Info } from 'lucide-react';

interface BusMapProps {
  stops: Stop[];
  fleet: Bus[];
  forecast: ForecastResponse | null;
  allocation: AllocateResponse | null;
}

// Documented planning coordinates for the temple festival egress simulation
export const DEMO_STOP_COORDINATES: Record<string, { lat: number; lng: number; description: string }> = {
  STOP_MAIN: {
    lat: 12.2285,
    lng: 79.0700,
    description: 'Central Terminal 400m from temple main gate',
  },
  STOP_PERIPHERAL: {
    lat: 12.2450,
    lng: 79.0680,
    description: 'North Bypass Ring staging hub with idle capacity',
  },
  STOP_EAST_GATE: {
    lat: 12.2260,
    lng: 79.0830,
    description: 'Pedestrian feeder corridor and parking zone',
  },
};

export const BusMap: React.FC<BusMapProps> = ({
  stops,
  fleet,
  forecast,
  allocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string>('STOP_MAIN');

  // Risk color helper
  const getRiskColor = (risk?: RiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return '#dc2626'; // Red - Very High Risk
      case 'HIGH':
        return '#ea580c'; // Orange - High Risk
      case 'MODERATE':
        return '#d97706'; // Amber - Moderate Risk
      case 'LOW':
      default:
        return '#059669'; // Emerald - Low Risk
    }
  };

  const getRiskLabel = (risk?: RiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return 'Very High Crowd Risk';
      case 'HIGH':
        return 'High Crowd Risk';
      case 'MODERATE':
        return 'Moderate Crowd Risk';
      case 'LOW':
      default:
        return 'Low Crowd Risk';
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up prior map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet Map centered on Tiruvannamalai temple area
    const map = L.map(mapContainerRef.current, {
      center: [12.2335, 79.0730],
      zoom: 14,
      scrollWheelZoom: false,
    });

    mapInstanceRef.current = map;

    // Add OpenStreetMap tile layer with clear attribution
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    // Render Markers for each stop
    stops.forEach((stop) => {
      const coords = DEMO_STOP_COORDINATES[stop.stop_id] || {
        lat: 12.2335,
        lng: 79.0730,
        description: stop.name,
      };

      const summary = forecast?.stop_summaries[stop.stop_id];
      const risk = summary?.overall_risk || 'LOW';
      const color = getRiskColor(risk);

      // Custom Circular HTML Pin
      const markerHtml = `
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background-color: ${color};
          border: 3px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: bold;
          font-family: sans-serif;
          font-size: 14px;
          cursor: pointer;
        ">
          🚌
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-bus-pin',
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);

      // Bind simple popup
      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; min-width: 160px;">
          <strong style="color: #0f172a; font-size: 13px;">${stop.name}</strong><br/>
          <span style="font-size: 11px; color: #64748b;">Code: <strong>${stop.stop_id}</strong></span><br/>
          <span style="font-size: 11px; color: ${color}; font-weight: bold;">${getRiskLabel(risk)}</span>
        </div>
      `);

      marker.on('click', () => {
        setSelectedStopId(stop.stop_id);
      });
    });

    // Render Relocation Route Arrows if recommended moves exist
    if (allocation?.recommended_moves && allocation.recommended_moves.length > 0) {
      allocation.recommended_moves.forEach((move) => {
        const originCoords = DEMO_STOP_COORDINATES[move.source_stop_id];
        const destCoords = DEMO_STOP_COORDINATES[move.destination_stop_id];

        if (originCoords && destCoords) {
          // Draw dashed polyline
          const line = L.polyline(
            [
              [originCoords.lat, originCoords.lng],
              [destCoords.lat, destCoords.lng],
            ],
            {
              color: '#ea580c',
              weight: 4,
              opacity: 0.85,
              dashArray: '8, 8',
            }
          ).addTo(map);

          line.bindPopup(`
            <div style="font-family: sans-serif; padding: 4px;">
              <strong style="color: #ea580c;">Suggested Bus Move: ${move.bus_id}</strong><br/>
              <span style="font-size: 11px;">From: <strong>${move.source_stop_id}</strong> ➔ To: <strong>${move.destination_stop_id}</strong></span><br/>
              <span style="font-size: 11px;">Arrives: <strong>${move.estimated_arrival_time}</strong> (Relieves +${move.estimated_destination_benefit} pax)</span>
            </div>
          `);
        }
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [stops, forecast, allocation]);

  // Selected stop details
  const selectedStop = stops.find((s) => s.stop_id === selectedStopId) || stops[0];
  const selectedSummary = forecast?.stop_summaries[selectedStopId];
  const assignedBuses = fleet.filter((b) => b.initial_stop_id === selectedStopId);
  const outgoingMoves = allocation?.recommended_moves.filter((m) => m.source_stop_id === selectedStopId) || [];
  const incomingMoves = allocation?.recommended_moves.filter((m) => m.destination_stop_id === selectedStopId) || [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
      
      {/* HEADER & CITIZEN GUIDANCE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-sky-600" />
            <span>Interactive Bus Stand & Route Map</span>
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            View live crowd risk by bus stop, see stationed buses, and track proposed bus movements across town.
          </p>
        </div>

        {/* MAP LEGEND */}
        <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            Very High Risk
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            High Risk
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Moderate
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            Low Risk
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-orange-600 border-l border-slate-200 pl-2">
            <span className="w-3 h-0.5 bg-orange-600 border-t border-dashed"></span>
            Bus Relocation
          </span>
        </div>
      </div>

      {/* MAP CANVAS & STOP DETAILS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEAFLET MAP WRAPPER */}
        <div className="lg:col-span-8 rounded-xl overflow-hidden border border-slate-300 relative shadow-inner">
          <div ref={mapContainerRef} className="w-full h-96 sm:h-[420px] z-10" />
          
          <div className="absolute bottom-2 left-2 z-20 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] text-slate-600 border border-slate-200">
            📍 Reference Demonstration Locations: Maha Deepam Festival Bus Hubs
          </div>
        </div>

        {/* DETAILS PANEL FOR SELECTED STOP */}
        <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-4">
          
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-2 border-b border-slate-200 pb-2">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Selected Bus Stand
                </span>
                <h4 className="font-heading font-bold text-base text-slate-900">
                  {selectedStop ? selectedStop.name : selectedStopId}
                </h4>
                <span className="font-mono text-xs text-sky-700 font-bold">
                  Code: {selectedStopId}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold border uppercase ${
                  selectedSummary?.overall_risk === 'CRITICAL'
                    ? 'bg-red-50 text-red-800 border-red-300'
                    : selectedSummary?.overall_risk === 'HIGH'
                    ? 'bg-orange-50 text-orange-800 border-orange-300'
                    : selectedSummary?.overall_risk === 'MODERATE'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                {getRiskLabel(selectedSummary?.overall_risk)}
              </span>
            </div>

            {/* KEY METRICS */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Total Expected Crowd:</span>
                <strong className="font-mono text-slate-900">
                  {selectedSummary ? `${selectedSummary.total_demand.toLocaleString()} passengers` : 'Calculating...'}
                </strong>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Busiest Time (Peak):</span>
                <strong className="font-mono text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {selectedSummary ? selectedSummary.peak_interval : 'N/A'}
                </strong>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Peak Period Arrivals:</span>
                <strong className="font-mono text-slate-900">
                  {selectedSummary ? `${selectedSummary.peak_demand.toLocaleString()} pax` : 'N/A'}
                </strong>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Buses Stationed Here:</span>
                <strong className="font-mono text-emerald-700">
                  {assignedBuses.length} buses ({assignedBuses.reduce((sum, b) => sum + b.capacity, 0)} seats)
                </strong>
              </div>
            </div>

            {/* BUSES LIST */}
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-semibold text-slate-600 block">
                Assigned Vehicles at this Stand:
              </span>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
                {assignedBuses.map((b) => (
                  <span
                    key={b.bus_id}
                    className="font-mono text-[10px] bg-white border border-slate-300 px-1.5 py-0.5 rounded text-slate-800 font-semibold"
                  >
                    {b.bus_id} ({b.capacity}s)
                  </span>
                ))}
              </div>
            </div>

            {/* RELOCATION IMPACT */}
            {outgoingMoves.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-800 space-y-1">
                <strong className="block text-[11px] font-bold">
                  ⚠️ Stop Losing a Bus:
                </strong>
                {outgoingMoves.map((m, idx) => (
                  <p key={idx} className="text-[11px] leading-snug">
                    Bus <strong>{m.bus_id}</strong> leaves at {m.departure_time} for <strong>{m.destination_stop_id}</strong>. {m.source_service_impact_description}
                  </p>
                ))}
              </div>
            )}

            {incomingMoves.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 text-xs text-emerald-800 space-y-1">
                <strong className="block text-[11px] font-bold">
                  ✓ Extra Buses Arriving:
                </strong>
                {incomingMoves.map((m, idx) => (
                  <p key={idx} className="text-[11px] leading-snug">
                    Bus <strong>{m.bus_id}</strong> arrives at {m.estimated_arrival_time} providing <strong>+{m.estimated_destination_benefit}</strong> extra passenger capacity.
                  </p>
                ))}
              </div>
            )}

          </div>

          <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
            Click on any bus stand circle on the map to inspect its real-time predicted demand and carrying capacity.
          </div>

        </div>

      </div>

    </div>
  );
};
