import React from 'react';
import { ArrowRight, ShieldCheck, Bus, Clock, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { AllocateResponse } from '../types/api';

interface BusAllocationProps {
  allocation: AllocateResponse | null;
  onViewSimulation: () => void;
}

export const BusAllocation: React.FC<BusAllocationProps> = ({
  allocation,
  onViewSimulation,
}) => {
  if (!allocation) {
    return (
      <section id="bus-allocation" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-500">
          Loading suggested bus changes...
        </div>
      </section>
    );
  }

  const { recommended_moves, status, summary, fleet_audit } = allocation;

  return (
    <section id="bus-allocation" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      
      {/* SECTION TITLE BAR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b-2 border-slate-200">
        <div className="space-y-1">
          <div className="text-xs font-bold text-sky-700 tracking-wider uppercase">
            BUS REDISTRIBUTION PLANNING
          </div>
          <h2 className="font-heading text-3xl font-bold text-slate-900 tracking-tight">
            Suggested Bus Changes
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Strategic relocation of existing buses to relieve heavy crowds at the busiest stand while strictly protecting minimum bus services at the donor stop.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              All {fleet_audit.final_fleet_count} Buses Accounted For (Zero Added/Lost)
            </span>
          </div>

          <button
            onClick={onViewSimulation}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold shadow-sm"
          >
            <span>Before and After Bus Changes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* RECOMMENDED MOVES CONTAINER */}
      {status === 'NO_SAFE_MOVE' || recommended_moves.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-amber-800 font-bold text-base">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span>No Safe Bus Moves Feasible</span>
          </div>
          <p className="text-sm text-amber-700 max-w-xl mx-auto">
            {summary || 'All evaluated bus moves either left the origin stop with too few buses, or arrived too late after peak crowds passed.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {recommended_moves.map((move, idx) => (
            <div
              key={`${move.bus_id}-${idx}`}
              className="bg-white border border-slate-200 border-t-4 border-t-orange-600 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow"
            >
              {/* TOP HEADER */}
              <div className="flex justify-between items-center">
                <div className="inline-flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-1 rounded">
                    Bus ID: {move.bus_id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    APPROVED MOVE
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Busiest Window: {move.target_peak_interval}
                </div>
              </div>

              {/* ROUTE FLOW */}
              <div className="flex items-center gap-3 text-lg font-bold text-slate-900 py-1">
                <span className="font-mono text-slate-700">{move.source_stop_id}</span>
                <span className="text-orange-600 font-normal">➔</span>
                <span className="font-mono text-sky-700">{move.destination_stop_id}</span>
              </div>

              {/* TIMINGS */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex justify-between items-center text-xs text-slate-600 font-mono">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Departs: <strong className="text-slate-900">{move.departure_time}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Arrives Destination: <strong className="text-slate-900">{move.estimated_arrival_time}</strong></span>
                </div>
              </div>

              {/* BENEFIT VS TRADE-OFF */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                <div className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Extra Passenger Capacity at Destination: +{move.estimated_destination_benefit} passengers/window</span>
                </div>
                <div className="text-slate-700 flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 flex-shrink-0"></span>
                  <span><strong>Stop Losing a Bus ({move.source_stop_id}):</strong> {move.source_service_impact_description}</span>
                </div>
              </div>

              {/* CONSTRAINTS AUDIT LIST */}
              <div className="space-y-1 pt-1 text-xs text-slate-500">
                <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                  Safety & Conservation Checks Passed:
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  {move.constraints_passed.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex items-center gap-1 text-slate-600">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{c.split(':')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </section>
  );
};
