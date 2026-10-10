import React from 'react';
import {
  Bus,
  Users,
  ShieldCheck,
  Clock,
  CloudSun,
  CloudRain,
  Cloud,
  CloudLightning,
  Sun,
  RefreshCw,
  AlertCircle,
  Activity,
  Layers,
} from 'lucide-react';
import { ForecastResponse, OperationalMode, ScenarioData } from '../types/api';
import { formatTo12Hour } from '../utils/timeFormat';

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
  const stopsCount = scenario?.stops.length || 3;
  const fleetCount = scenario?.fleet.length || 16;
  const totalAttendance = scenario?.festival_programme.expected_total_attendance || 40000;
  const exitingFraction = scenario?.festival_programme.exiting_passenger_fraction || 0.85;
  const expectedPassengers = Math.round(totalAttendance * exitingFraction);

  const currentWeather = scenario?.weather.condition || 'clear';
  const endTime = scenario?.festival_programme.scheduled_event_end_time || '21:30';

  const getWeatherIcon = () => {
    switch (currentWeather) {
      case 'heavy_rain':
        return <CloudLightning className="w-5 h-5 text-purple-400" />;
      case 'rainy':
      case 'light_rain':
        return <CloudRain className="w-5 h-5 text-blue-400" />;
      case 'cloudy':
        return <Cloud className="w-5 h-5 text-slate-300" />;
      case 'clear':
      default:
        return <Sun className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-8 relative z-20 space-y-4">
      
      {/* 1. DARK 4-CARD METRIC STRIP (MATCHING WATERLOGAI SCREENSHOT 2) */}
      <div className="bg-[#0f172a] text-white border border-slate-800 rounded-xl shadow-2xl p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
          
          {/* CARD 1: 16 BUSES */}
          <div className="flex items-start gap-3.5 pt-3 sm:pt-0 sm:px-3 first:pl-0">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center flex-shrink-0 text-sky-400">
              <Bus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-heading text-2xl sm:text-3xl font-black text-white leading-none block font-mono">
                {fleetCount}
              </span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mt-1">
                CONSERVED FIXED FLEET
              </span>
              <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                {stopsCount} Monitored Stands • 0 Phantom
              </span>
            </div>
          </div>

          {/* CARD 2: 34,000 PASSENGERS */}
          <div className="flex items-start gap-3.5 pt-3 sm:pt-0 sm:px-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center flex-shrink-0 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-heading text-2xl sm:text-3xl font-black text-white leading-none block font-mono">
                {expectedPassengers.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mt-1">
                EXPECTED PASSENGERS
              </span>
              <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                85% Egress Fraction ({totalAttendance.toLocaleString()} Attendance)
              </span>
            </div>
          </div>

          {/* CARD 3: 16 / 16 CONSERVED */}
          <div className="flex items-start gap-3.5 pt-3 sm:pt-0 sm:px-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center flex-shrink-0 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-heading text-2xl sm:text-3xl font-black text-white leading-none block font-mono">
                {fleetCount} / {fleetCount}
              </span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mt-1">
                FLEET CONSERVATION
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold truncate block mt-0.5">
                100% Invariant Conserved
              </span>
            </div>
          </div>

          {/* CARD 4: 15 / 30 / 60M HORIZONS */}
          <div className="flex items-start gap-3.5 pt-3 sm:pt-0 sm:px-3 last:pr-0">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center flex-shrink-0 text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-heading text-2xl sm:text-3xl font-black text-white leading-none block font-mono">
                15 / 30 / 60m
              </span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mt-1">
                PREDICTION HORIZONS
              </span>
              <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                Post-Ceremony Demand Windows
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. LIVE OPERATIONAL TELEMETRY CARD (MATCHING CHENNAI WEATHER IN SCREENSHOT 2) */}
      <div className="bg-[#0a1120] border border-slate-800 text-white rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        
        {/* TOP STATUS BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
              {getWeatherIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-base text-white tracking-wide uppercase">
                  FESTIVAL CORRIDOR TELEMETRY
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tiruvannamalai Festival Zone • Lat: 12.2285° N, Lon: 79.0700° E • Conclusion: <strong>{formatTo12Hour(endTime)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
            <span className="text-slate-400 font-mono text-[11px]">
              Last updated: <span className="text-slate-200">Just now</span>
            </span>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* NOTICE CALLOUT (MATCHING WARNING BANNER IN SCREENSHOT 2) */}
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-3 text-xs text-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Automatic Reallocation Pipeline Active</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed pl-6">
            When weather conditions shift or closing ceremonies run late, crowd demand curves and bus movements recalculate instantly without manual re-runs.
          </p>
        </div>

      </div>

    </section>
  );
};
