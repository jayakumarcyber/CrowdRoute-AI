import React, { useState } from 'react';
import { ArrowRight, BarChart3, Users, Zap, ShieldAlert, HelpCircle } from 'lucide-react';
import { ForecastResponse, RiskLevel, Stop } from '../types/api';
import { DemandChart } from './DemandChart';

interface CrowdForecastProps {
  forecast: ForecastResponse | null;
  stops?: Stop[];
  onViewDetailedTable: () => void;
}

export const CrowdForecast: React.FC<CrowdForecastProps> = ({
  forecast,
  stops = [],
  onViewDetailedTable,
}) => {
  const [showChart, setShowChart] = useState(true);

  if (!forecast) {
    return (
      <section id="crowd-forecast" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-500">
          Loading crowd predictions...
        </div>
      </section>
    );
  }

  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return {
          label: 'Very High Crowd Risk',
          classes: 'bg-red-50 text-red-800 border-red-200 font-bold',
        };
      case 'HIGH':
        return {
          label: 'High Crowd Risk',
          classes: 'bg-orange-50 text-orange-800 border-orange-200 font-bold',
        };
      case 'MODERATE':
        return {
          label: 'Moderate Crowd Risk',
          classes: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
        };
      case 'LOW':
      default:
        return {
          label: 'Low Crowd Risk',
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
        };
    }
  };

  const stopList = Object.values(forecast.stop_summaries || {});

  return (
    <section id="crowd-forecast" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      
      {/* SECTION TITLE BAR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b-2 border-slate-200">
        <div className="space-y-1">
          <div className="text-xs font-bold text-sky-700 tracking-wider uppercase">
            CROWD & PASSENGER MONITORING
          </div>
          <h2 className="font-heading text-3xl font-bold text-slate-900 tracking-tight">
            Crowd Prediction
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Forecast of passenger arrivals, expected congestion, and busiest times across active bus terminals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold">
            {forecast.method_used}
          </span>
          <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wider">
            {forecast.confidence_level === 'PRELIMINARY_BASELINE' ? 'Preliminary Estimate' : forecast.confidence_level}
          </span>
          <button
            onClick={() => setShowChart(!showChart)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold shadow-sm"
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
            <span>{showChart ? 'Hide Crowd Graph' : 'Show Crowd Graph'}</span>
          </button>
          <button
            onClick={onViewDetailedTable}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold shadow-sm"
          >
            <span>Full 15-Minute Timeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* STOP SUMMARY PREVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stopList.map((stop) => {
          const isCritical = stop.overall_risk === 'CRITICAL';
          const badge = getRiskBadge(stop.overall_risk);
          const stopObj = stops.find((s) => s.stop_id === stop.stop_id);
          const stopTitle = stopObj ? stopObj.name : stop.stop_id;

          return (
            <div
              key={stop.stop_id}
              className={`bg-white border rounded-xl p-5 shadow-sm space-y-4 transition-all hover:shadow-md ${
                isCritical
                  ? 'border-l-4 border-l-red-600 border-slate-200'
                  : 'border-slate-200'
              }`}
            >
              {/* TOP HEADER */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 leading-snug">
                    {stopTitle}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Code: {stop.stop_id}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] border whitespace-nowrap ${badge.classes}`}>
                  {badge.label}
                </span>
              </div>

              {/* METRIC ROWS */}
              <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1">
                    <span>Busiest Time:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {stop.peak_interval}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Expected Passengers:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {stop.peak_demand.toLocaleString()} pax/window
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Bus Carrying Capacity:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {stop.baseline_scheduled_capacity.toLocaleString()} pax/window
                  </span>
                </div>
              </div>

              {/* TOTAL EXPECTED DEMAND & STATUS */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1 text-slate-700 font-medium">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Total Crowd: <strong>{stop.total_demand.toLocaleString()}</strong></span>
                </div>
                {isCritical ? (
                  <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                    Bottleneck
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    Sufficient
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DEMAND CURVE CHART */}
      {showChart && <DemandChart intervals={forecast.intervals} stops={stops} />}

      {/* FOOTNOTE DISCLAIMER */}
      <div className="bg-slate-100 border-l-4 border-sky-600 rounded-r-md px-4 py-2.5 text-xs text-slate-600">
        <strong>Prediction Methodology: </strong>
        {forecast.confidence_indicator}. Bus Carrying Capacity represents standard boarding throughput of{' '}
        <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">
          floor(capacity / 2)
        </code>{' '}
        passengers per bus for each 15-minute interval cycle.
      </div>

    </section>
  );
};
