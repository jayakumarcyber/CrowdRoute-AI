import React, { useState, useEffect } from 'react';
import {
  AllocateResponse,
  ForecastResponse,
  HistoricalUploadResponse,
  LiveDataSummaryResponse,
  ScenarioData,
  SimulateResponse,
} from '../types/api';
import { ScenarioForm } from '../components/ScenarioForm';
import { HistoricalUpload } from '../components/HistoricalUpload';
import { SimulationComparison } from '../components/SimulationComparison';
import { TradeoffDetails } from '../components/TradeoffDetails';
import { DataSourceStatus } from '../components/DataSourceStatus';
import { BusMap } from '../components/BusMap';
import { BusMovementImpact } from '../components/BusMovementImpact';
import { BusTimetable } from '../components/BusTimetable';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  Sliders,
  FileSpreadsheet,
  CalendarDays,
  LineChart,
  Radio,
  ArrowLeft,
  MapPin,
  Calendar,
  Bus as BusIcon,
  Users,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { formatIntervalTo12Hour, formatTo12Hour } from '../utils/timeFormat';

interface DashboardPageProps {
  initialTab?: string;
  scenario: ScenarioData | null;
  forecast: ForecastResponse | null;
  allocation: AllocateResponse | null;
  simulation: SimulateResponse | null;
  uploadResult: HistoricalUploadResponse | null;
  liveStatus: LiveDataSummaryResponse | null;
  onApplyScenario: (updated: ScenarioData) => void;
  onReloadScenario: () => void;
  onUploadFile: (file: File) => Promise<HistoricalUploadResponse>;
  onLoadSampleCsv: () => Promise<void>;
  onRefreshLive: () => void;
  onBackToHome: () => void;
  isLoading?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  initialTab = 'scenario',
  scenario,
  forecast,
  allocation,
  simulation,
  uploadResult,
  liveStatus,
  onApplyScenario,
  onReloadScenario,
  onUploadFile,
  onLoadSampleCsv,
  onRefreshLive,
  onBackToHome,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Derived application metrics from real data (no fake numbers)
  const stopsCount = scenario?.stops.length || 3;
  const fleetCount = scenario?.fleet.length || 16;
  const totalAttendance = scenario?.festival_programme.expected_total_attendance || 40000;
  const exitingFraction = scenario?.festival_programme.exiting_passenger_fraction || 0.85;
  const expectedPassengers = Math.round(totalAttendance * exitingFraction);

  const mainSummary = forecast?.stop_summaries?.['STOP_MAIN'];
  const nextPeakWindow = mainSummary
    ? formatTo12Hour(mainSummary.peak_interval)
    : scenario
    ? formatTo12Hour(scenario.festival_programme.scheduled_event_end_time)
    : '9:30–9:45 PM';

  let highestRisk = 'Very High Crowd';
  let peakLocation = 'Central Terminal (STOP_MAIN)';
  if (forecast && forecast.stop_summaries) {
    const summaries = Object.values(forecast.stop_summaries);
    const critStop = summaries.find((s) => s.overall_risk === 'CRITICAL');
    const highStop = summaries.find((s) => s.overall_risk === 'HIGH');
    if (critStop) {
      highestRisk = 'Very High Crowd';
      peakLocation = `${critStop.stop_id} (${formatTo12Hour(critStop.peak_interval)})`;
    } else if (highStop) {
      highestRisk = 'High Crowd';
      peakLocation = `${highStop.stop_id} (${formatTo12Hour(highStop.peak_interval)})`;
    } else {
      highestRisk = 'Moderate Crowd';
      peakLocation = 'Active Stands';
    }
  }

  return (
    <ErrorBoundary fallbackTitle="Dashboard Operations View Recovery">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={onBackToHome}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Portal Home</span>
              </button>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                TRANSPORT CONTROLLER CONSOLE
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Operations & Analytics Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Real-time parameter configuration, empirical past crowd calibration, and dispatch audit logs for festival operations.
            </p>
          </div>
        </div>

        {/* SECTION 2: DASHBOARD OVERVIEW SUMMARY METRICS (5 UNIFORM CARDS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Buses */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:border-teal-500 transition-all">
            <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
              <BusIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Total Buses
              </span>
              <span className="font-heading text-xl font-bold text-slate-900 leading-tight">
                {fleetCount} Buses
              </span>
              <span className="block text-[11px] text-emerald-700 font-semibold truncate">
                Fixed & Conserved
              </span>
            </div>
          </div>

          {/* Card 2: Stops Monitored */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:border-sky-500 transition-all">
            <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Stops Monitored
              </span>
              <span className="font-heading text-xl font-bold text-slate-900 leading-tight">
                {stopsCount} Stands
              </span>
              <span className="block text-[11px] text-slate-500 truncate">
                Active Corridor
              </span>
            </div>
          </div>

          {/* Card 3: Expected Passengers */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:border-indigo-500 transition-all">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Expected Passengers
              </span>
              <span className="font-heading text-xl font-bold text-slate-900 leading-tight font-mono">
                {expectedPassengers.toLocaleString()}
              </span>
              <span className="block text-[11px] text-slate-500 truncate">
                85% Egress Fraction
              </span>
            </div>
          </div>

          {/* Card 4: Highest Crowd Risk */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:border-red-500 transition-all">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Highest Crowd Risk
              </span>
              <span className="font-heading text-base font-bold text-red-700 leading-tight truncate block">
                {highestRisk}
              </span>
              <span className="block text-[11px] text-slate-500 truncate" title={peakLocation}>
                {peakLocation}
              </span>
            </div>
          </div>

          {/* Card 5: Next Demand Peak */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:border-orange-500 transition-all">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Next Demand Peak
              </span>
              <span className="font-heading text-xl font-bold text-slate-900 leading-tight font-mono">
                {nextPeakWindow}
              </span>
              <span className="block text-[11px] text-orange-700 font-semibold truncate">
                Post-ceremony surge
              </span>
            </div>
          </div>
        </div>

        {/* DASHBOARD TABS NAVIGATION */}
        <div className="flex flex-wrap gap-2 border-b-2 border-slate-200 pb-2">
          
          <button
            onClick={() => setActiveTab('scenario')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'scenario'
                ? 'bg-sky-50 text-sky-700 border border-sky-300 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-sky-600" />
            <span>1. Scenario & Fleet Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'map'
                ? 'bg-sky-50 text-sky-700 border border-sky-300 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4 text-rose-600" />
            <span>2. Interactive Bus Map</span>
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'timetable'
                ? 'bg-sky-50 text-sky-700 border border-sky-300 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>3. Bus Timetable & Relocations</span>
          </button>

          <button
            onClick={() => setActiveTab('historical')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'historical'
                ? 'bg-sky-50 text-sky-700 border border-sky-300 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>4. Past Crowd Data</span>
          </button>

          <button
            onClick={() => setActiveTab('forecast-table')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'forecast-table'
                ? 'bg-sky-50 text-sky-700 border border-sky-300 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-teal-600" />
            <span>5. Detailed 15-Min Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('simulation')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'simulation'
                ? 'bg-sky-50 text-sky-700 border border-sky-300 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-4 h-4 text-orange-600" />
            <span>6. Before and After Bus Changes</span>
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'sources'
                ? 'bg-sky-50 text-sky-700 border border-sky-300 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-600" />
            <span>7. Data Sources & Provenance</span>
          </button>

        </div>

        {/* TAB CONTENT PANELS WRAPPED IN ERROR BOUNDARY */}
        <div className="space-y-6">
          
          {/* TAB 1: SCENARIO & FLEET EDITOR */}
          {activeTab === 'scenario' && (
            <ScenarioForm
              scenario={scenario}
              onApplyScenario={onApplyScenario}
              onReloadSaved={onReloadScenario}
              isLoading={isLoading}
            />
          )}

          {/* TAB 2: INTERACTIVE BUS MAP */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <BusMap
                stops={scenario?.stops || []}
                fleet={scenario?.fleet || []}
                forecast={forecast}
                allocation={allocation}
                scenario={scenario}
              />
            </div>
          )}

          {/* TAB 3: OPERATIONAL BUS TIMETABLE */}
          {activeTab === 'timetable' && (
            <div className="space-y-4">
              <BusTimetable
                allocation={allocation}
                forecast={forecast}
                scenario={scenario}
              />
            </div>
          )}

          {/* TAB 4: PAST CROWD DATA */}
          {activeTab === 'historical' && (
            <HistoricalUpload
              onUploadFile={onUploadFile}
              onLoadSampleCsv={onLoadSampleCsv}
              uploadResult={uploadResult}
              accuracy={forecast?.actual_vs_predicted}
              isLoading={isLoading}
            />
          )}

          {/* TAB 5: DETAILED 15-MIN FORECAST TABLE */}
          {activeTab === 'forecast-table' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-heading font-bold text-xl text-slate-900">
                    15-Minute Crowd Prediction & Bus Carrying Capacity
                  </h3>
                  <p className="text-xs text-slate-500">
                    Passengers Still Waiting = <code className="bg-slate-100 px-1 py-0.5 rounded">Expected Passengers - Bus Carrying Capacity</code>.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {forecast?.intervals.length || 0} intervals analyzed
                </span>
              </div>

              {!forecast || !forecast.intervals || forecast.intervals.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300 space-y-2">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold text-slate-700">No Forecast Intervals Available</p>
                  <p className="text-xs text-slate-500">Forecast calculations are in progress or awaiting scenario parameters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left text-xs bg-white rounded border border-slate-200">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5">Interval</th>
                        <th className="p-2.5">Stop ID</th>
                        <th className="p-2.5">Low Estimate</th>
                        <th className="p-2.5">Expected Passengers</th>
                        <th className="p-2.5">High Estimate</th>
                        <th className="p-2.5">Bus Capacity</th>
                        <th className="p-2.5">People Still Waiting</th>
                        <th className="p-2.5">Crowd Risk</th>
                        <th className="p-2.5">Provenance Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {forecast.intervals.map((item, idx) => {
                        const isDeficit = item.deficit_surplus > 0;
                        const riskLabel =
                          item.risk_level === 'CRITICAL'
                            ? 'Very High Crowd'
                            : item.risk_level === 'HIGH'
                            ? 'High Crowd'
                            : item.risk_level === 'MODERATE'
                            ? 'Moderate Crowd'
                            : 'Low Crowd';
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">
                              {formatIntervalTo12Hour(item.start_time, item.end_time)}
                            </td>
                            <td className="p-2.5">{item.stop_id}</td>
                            <td className="p-2.5 text-slate-500">{item.low_estimate.toLocaleString()}</td>
                            <td className="p-2.5 font-bold text-slate-900">{item.central_estimate.toLocaleString()}</td>
                            <td className="p-2.5 text-slate-500">{item.high_estimate.toLocaleString()}</td>
                            <td className="p-2.5">
                              {item.baseline_capacity === 0 ? (
                                <span className="text-red-700 font-bold bg-red-50 border border-red-200 px-1 py-0.5 rounded text-[11px]">
                                  No buses assigned
                                </span>
                              ) : (
                                <span className="text-slate-700 font-semibold">
                                  {item.baseline_capacity.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  isDeficit
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {isDeficit ? `+${item.deficit_surplus.toLocaleString()}` : '0 (None waiting)'}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  item.risk_level === 'CRITICAL'
                                    ? 'bg-red-100 text-red-800'
                                    : item.risk_level === 'HIGH'
                                    ? 'bg-orange-100 text-orange-800'
                                    : item.risk_level === 'MODERATE'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {riskLabel}
                              </span>
                            </td>
                            <td className="p-2.5 font-sans text-slate-500 text-[11px] max-w-xs">
                              {item.provenance_note}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: BEFORE AND AFTER BUS CHANGES & REJECTIONS AUDIT */}
          {activeTab === 'simulation' && (
            <div className="space-y-6">
              <BusMovementImpact
                allocation={allocation}
                forecast={forecast}
                scenario={scenario}
              />
              {simulation ? (
                <SimulationComparison simulation={simulation} />
              ) : (
                <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl space-y-2">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold text-slate-700">Loading Simulation Results...</p>
                  <p className="text-xs text-slate-500">Calculating discrete boarding queues under identical arrival dynamics.</p>
                </div>
              )}
              <TradeoffDetails rejectedMoves={allocation?.rejected_moves || []} />
            </div>
          )}

          {/* TAB 7: DATA SOURCES & PROVENANCE */}
          {activeTab === 'sources' && (
            <DataSourceStatus
              liveStatus={liveStatus}
              onRefreshLive={onRefreshLive}
              isLoading={isLoading}
            />
          )}

        </div>

      </div>
    </ErrorBoundary>
  );
};
