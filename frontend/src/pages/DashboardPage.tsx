import React, { useState } from 'react';
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
import {
  Sliders,
  FileSpreadsheet,
  CalendarDays,
  LineChart,
  Radio,
  ArrowLeft,
  MapPin,
} from 'lucide-react';

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
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
            Comprehensive parameter configuration, empirical historical data calibration, and dispatch audit logs.
          </p>
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
          onClick={() => setActiveTab('historical')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'historical'
              ? 'bg-sky-50 text-sky-700 border border-sky-300 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          <span>3. Past Crowd Data</span>
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
          <span>4. Detailed 15-Min Timeline</span>
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
          <span>5. Before and After Bus Changes</span>
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
          <span>6. Data Sources & Provenance</span>
        </button>

      </div>

      {/* TAB CONTENT PANELS */}
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
            />
          </div>
        )}

        {/* TAB 3: PAST CROWD DATA */}
        {activeTab === 'historical' && (
          <HistoricalUpload
            onUploadFile={onUploadFile}
            onLoadSampleCsv={onLoadSampleCsv}
            uploadResult={uploadResult}
            accuracy={forecast?.actual_vs_predicted}
            isLoading={isLoading}
          />
        )}

        {/* TAB 4: DETAILED 15-MIN FORECAST TABLE */}
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

            <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
              <table className="w-full text-left text-xs bg-white rounded border border-slate-200">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-2.5">Interval</th>
                    <th className="p-2.5">Stop ID</th>
                    <th className="p-2.5">Low Estimate</th>
                    <th className="p-2.5">Expected Passengers</th>
                    <th className="p-2.5">High Estimate</th>
                    <th className="p-2.5">Bus Carrying Capacity</th>
                    <th className="p-2.5">Passengers Still Waiting</th>
                    <th className="p-2.5">Crowd Risk</th>
                    <th className="p-2.5">Provenance Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {forecast?.intervals.map((item, idx) => {
                    const isDeficit = item.deficit_surplus > 0;
                    const riskLabel =
                      item.risk_level === 'CRITICAL'
                        ? 'Very High Crowd Risk'
                        : item.risk_level === 'HIGH'
                        ? 'High Crowd Risk'
                        : item.risk_level === 'MODERATE'
                        ? 'Moderate Crowd Risk'
                        : 'Low Crowd Risk';
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">
                          {item.start_time} - {item.end_time}
                        </td>
                        <td className="p-2.5">{item.stop_id}</td>
                        <td className="p-2.5 text-slate-500">{item.low_estimate.toLocaleString()}</td>
                        <td className="p-2.5 font-bold text-slate-900">{item.central_estimate.toLocaleString()}</td>
                        <td className="p-2.5 text-slate-500">{item.high_estimate.toLocaleString()}</td>
                        <td className="p-2.5 text-slate-700">{item.baseline_capacity.toLocaleString()}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isDeficit
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isDeficit ? `+${item.deficit_surplus.toLocaleString()}` : `${item.deficit_surplus.toLocaleString()}`}
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
          </div>
        )}

        {/* TAB 5: BEFORE AND AFTER BUS CHANGES & REJECTIONS AUDIT */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            <BusMovementImpact
              allocation={allocation}
              forecast={forecast}
              scenario={scenario}
            />
            <SimulationComparison simulation={simulation} />
            <TradeoffDetails rejectedMoves={allocation?.rejected_moves || []} />
          </div>
        )}

        {/* TAB 5: DATA SOURCES & PROVENANCE */}
        {activeTab === 'sources' && (
          <DataSourceStatus
            liveStatus={liveStatus}
            onRefreshLive={onRefreshLive}
            isLoading={isLoading}
          />
        )}

      </div>

    </div>
  );
};
