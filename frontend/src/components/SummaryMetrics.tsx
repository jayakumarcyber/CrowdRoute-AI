import React from 'react';
import { MapPin, Bus, AlertTriangle, Clock, RotateCcw, RefreshCw } from 'lucide-react';
import { ForecastResponse, OperationalMode, ScenarioData } from '../types/api';

interface SummaryMetricsProps {
  scenario: ScenarioData | null;
  forecast: ForecastResponse | null;
  systemMode: OperationalMode;
  onSetMode: (mode: OperationalMode) => void;
  onResetDefaults: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({
  scenario,
  forecast,
  systemMode,
  onSetMode,
  onResetDefaults,
  onRefresh,
  isLoading = false,
}) => {
  // Compute metric values dynamically
  const stopsCount = scenario?.stops.length || 3;
  const fleetCount = scenario?.fleet.length || 16;
  const horizonText = scenario
    ? `${scenario.festival_programme.time_horizon.start_time} - ${scenario.festival_programme.time_horizon.end_time}`
    : '21:00 - 23:00';

  // Find peak risk
  let highestRisk = 'Very High Crowd Risk';
  let peakLocation = 'Main Stand';
  if (forecast && forecast.stop_summaries) {
    const summaries = Object.values(forecast.stop_summaries);
    const hasCritical = summaries.some((s) => s.overall_risk === 'CRITICAL');
    const hasHigh = summaries.some((s) => s.overall_risk === 'HIGH');
    if (hasCritical) {
      highestRisk = 'Very High Crowd Risk';
      const critStop = summaries.find((s) => s.overall_risk === 'CRITICAL');
      peakLocation = critStop ? `${critStop.stop_id} (${critStop.peak_interval})` : 'Main Stand';
    } else if (hasHigh) {
      highestRisk = 'High Crowd Risk';
      const highStop = summaries.find((s) => s.overall_risk === 'HIGH');
      peakLocation = highStop ? `${highStop.stop_id} (${highStop.peak_interval})` : 'North Stand';
    } else {
      highestRisk = 'Moderate Crowd Risk';
      peakLocation = 'Active Hubs';
    }
  }

  const [showExplainer, setShowExplainer] = React.useState(false);

  return (
    <section className="bg-white border-b border-slate-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
        
        {/* 4 COMPACT STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CARD 1: STOPS MONITORED */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:border-sky-500 transition-all">
            <div className="w-12 h-12 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Bus Stops Monitored
              </span>
              <span className="font-heading text-2xl font-bold text-slate-900 leading-tight">
                {stopsCount} Stands
              </span>
              <span className="block text-xs text-slate-500">
                Main, Peripheral & East Gate
              </span>
            </div>
          </div>

          {/* CARD 2: AVAILABLE BUSES */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:border-teal-500 transition-all">
            <div className="w-12 h-12 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Bus Fleet
              </span>
              <span className="font-heading text-2xl font-bold text-slate-900 leading-tight">
                {fleetCount} Buses
              </span>
              <span className="block text-xs text-emerald-700 font-semibold">
                All {fleetCount} Buses Accounted For
              </span>
            </div>
          </div>

          {/* CARD 3: HIGHEST PREDICTED RISK */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:border-rose-500 transition-all">
            <div className="w-12 h-12 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Highest Crowd Risk
              </span>
              <span className="font-heading text-xl font-bold text-rose-700 leading-tight">
                {highestRisk}
              </span>
              <span className="block text-xs text-slate-500 truncate max-w-[150px]" title={peakLocation}>
                {peakLocation}
              </span>
            </div>
          </div>

          {/* CARD 4: FORECAST HORIZON */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:border-indigo-500 transition-all">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Festival Window
              </span>
              <span className="font-heading text-2xl font-bold text-slate-900 leading-tight">
                {horizonText}
              </span>
              <span className="block text-xs text-slate-500">
                8 × 15-Minute Intervals
              </span>
            </div>
          </div>

        </div>

        {/* WHAT DOES THIS MEAN TOGGLE */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="text-xs text-sky-700 hover:text-sky-900 font-semibold inline-flex items-center gap-1 underline"
          >
            <span>What does this mean?</span>
          </button>
        </div>

        {showExplainer && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-900 space-y-2 animate-fadeIn">
            <strong className="block text-sm font-bold text-sky-950">
              Guide to Citizen & Transport Terms:
            </strong>
            <ul className="list-disc list-inside space-y-1 text-sky-800">
              <li>
                <strong>Crowd Prediction:</strong> Estimates how many people will gather at each bus stop during each 15-minute window based on festival closing ceremonies.
              </li>
              <li>
                <strong>Bus Carrying Capacity:</strong> The maximum number of passengers that active buses can safely pick up in a 15-minute cycle (<code className="font-mono bg-sky-100 px-1 rounded">half of seating capacity per interval</code>).
              </li>
              <li>
                <strong>Very High Crowd Risk:</strong> A situation where passengers arrive much faster than buses can carry them away, leading to long queues unless extra buses arrive.
              </li>
              <li>
                <strong>All 16 Buses Accounted For:</strong> Strict fleet conservation guarantees no extra phantom buses are invented; only currently available buses are relocated.
              </li>
              <li>
                <strong>Stop Losing a Bus:</strong> A donor terminal that shares a bus with a busier stop, whilst keeping enough buses for its own travelers.
              </li>
            </ul>
          </div>
        )}

        {/* SYSTEM STATUS & PROVENANCE BAR */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                systemMode === 'USER_DATA'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              {systemMode === 'USER_DATA' ? 'USER DATA MODE ACTIVE' : 'SYNTHETIC DEMO MODE'}
            </span>
            <span className="text-slate-600">
              {systemMode === 'USER_DATA'
                ? 'Predictions and fleet relocations are driven by user parameters and calibrated historical records.'
                : 'Using verified baseline synthetic scenario for Maha Deepam finale. Deterministic Gaussian egress model.'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
              SYNTHETIC DEMO ONLY • NOT REAL TELEMETRY
            </span>

            {/* MODE TOGGLES */}
            <div className="inline-flex rounded-md shadow-sm border border-slate-300 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => onSetMode('DEMO_SYNTHETIC')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  systemMode === 'DEMO_SYNTHETIC'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Demo Mode
              </button>
              <button
                type="button"
                onClick={() => onSetMode('USER_DATA')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-slate-200 ${
                  systemMode === 'USER_DATA'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                User Data Mode
              </button>
            </div>

            {/* RESET BUTTON */}
            <button
              onClick={onResetDefaults}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium"
              title="Reset to default synthetic parameters"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>

            {/* REFRESH BUTTON */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold"
              title="Recalculate predictions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
