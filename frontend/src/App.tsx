import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './services/api';
import {
  AllocateResponse,
  ForecastResponse,
  HistoricalRecord,
  HistoricalUploadResponse,
  LiveDataSummaryResponse,
  OperationalMode,
  ScenarioData,
  SimulateResponse,
} from './types/api';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { ComplaintSection } from './components/ComplaintSection';
import { ActivityLogEntry } from './components/LiveFestivalUpdates';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<'home' | 'dashboard' | 'complaints'>('home');
  const [dashboardTab, setDashboardTab] = useState<string>('scenario');
  const [systemMode, setSystemMode] = useState<OperationalMode>('DEMO_SYNTHETIC');

  // Request sequencing reference to prevent stale responses from overwriting newer scenarios
  const latestRequestIdRef = useRef<number>(0);

  // Application Data States
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [allocation, setAllocation] = useState<AllocateResponse | null>(null);
  const [simulation, setSimulation] = useState<SimulateResponse | null>(null);
  const [uploadResult, setUploadResult] = useState<HistoricalUploadResponse | null>(null);
  const [historicalRecords, setHistoricalRecords] = useState<HistoricalRecord[] | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveDataSummaryResponse | null>(null);

  // Live constraint monitoring state
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<string>(new Date().toLocaleTimeString());
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([
    {
      id: 'init-0',
      timestamp: new Date().toLocaleTimeString(),
      action: 'System Initialized',
      details: 'Loaded baseline festival schedule (21:30 finish, Clear weather). Fixed fleet: 16 buses.',
      type: 'system',
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Run complete 3-stage pipeline (Forecast -> Allocate -> Simulate)
   * Enforces asynchronous sequencing: older slow responses cannot overwrite newer state.
   */
  const executeAnalysis = useCallback(
    async (
      currentScenario: ScenarioData,
      mode: OperationalMode,
      histRecords: HistoricalRecord[] | null
    ) => {
      const currentReqId = ++latestRequestIdRef.current;
      setIsLoading(true);
      setIsUpdating(true);
      setErrorMessage(null);

      try {
        // 1. Forecast Request
        const fcRes = await api.postForecast({
          scenario: currentScenario,
          operational_mode: mode,
          historical_records: histRecords,
        });
        if (currentReqId !== latestRequestIdRef.current) return;
        setForecast(fcRes);

        // 2. Allocate Request
        const allocRes = await api.postAllocate({
          scenario: currentScenario,
          forecast: fcRes,
          max_moves: 10,
        });
        if (currentReqId !== latestRequestIdRef.current) return;
        setAllocation(allocRes);

        // 3. Simulate Request
        const simRes = await api.postSimulate({
          scenario: currentScenario,
          moves_override: allocRes.recommended_moves,
        });
        if (currentReqId !== latestRequestIdRef.current) return;
        setSimulation(simRes);

        setLastUpdateTimestamp(new Date().toLocaleTimeString());
      } catch (err: any) {
        if (currentReqId !== latestRequestIdRef.current) return;
        console.error('Analysis execution error:', err);
        setErrorMessage(err.message || 'Failed to execute analysis.');
      } finally {
        if (currentReqId === latestRequestIdRef.current) {
          setIsLoading(false);
          setIsUpdating(false);
        }
      }
    },
    []
  );

  /**
   * Initial Load
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        // Load default scenario
        const sc = await api.getScenario();
        setScenario(sc);

        // Fetch live status
        try {
          const live = await api.getLiveStatus();
          setLiveStatus(live);
        } catch (e) {
          console.warn('Could not load live status:', e);
        }

        // Run baseline analysis
        await executeAnalysis(sc, 'DEMO_SYNTHETIC', null);
      } catch (err: any) {
        console.error('Initialization failed:', err);
        setErrorMessage(err.message || 'Failed to initialize portal.');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [executeAnalysis]);

  /**
   * Mode Change
   */
  const handleSetMode = (mode: OperationalMode) => {
    setSystemMode(mode);
    if (scenario) {
      executeAnalysis(scenario, mode, historicalRecords);
    }
  };

  /**
   * Reset Defaults
   */
  const handleResetDefaults = async () => {
    try {
      setIsLoading(true);
      const sc = await api.getScenario();
      setScenario(sc);
      setHistoricalRecords(null);
      setUploadResult(null);
      setSystemMode('DEMO_SYNTHETIC');
      const resetEntry: ActivityLogEntry = {
        id: `${Date.now()}-reset`,
        timestamp: new Date().toLocaleTimeString(),
        action: 'Reset to Scenario Defaults',
        details: 'Restored baseline 21:30 event conclusion and Clear weather.',
        type: 'reset',
      };
      setActivityLog((prev) => [resetEntry, ...prev.slice(0, 24)]);
      await executeAnalysis(sc, 'DEMO_SYNTHETIC', null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset scenario.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Live Operational Changes (Weather, Event Delays, Quick Actions)
   * Reacts automatically without manual re-runs.
   */
  const handleLiveScenarioUpdate = (updatedScenario: ScenarioData, description: string) => {
    setScenario(updatedScenario);
    const newEntry: ActivityLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      action: description,
      details: `Scenario updated (End time: ${updatedScenario.festival_programme.scheduled_event_end_time}, Weather: ${updatedScenario.weather.condition}). Auto-recalculating pipeline.`,
      type: description.toLowerCase().includes('weather')
        ? 'weather'
        : description.toLowerCase().includes('delay')
        ? 'delay'
        : 'system',
    };
    setActivityLog((prev) => [newEntry, ...prev.slice(0, 24)]);
    executeAnalysis(updatedScenario, systemMode, historicalRecords);
  };

  /**
   * Refresh Analysis
   */
  const handleRefresh = () => {
    if (scenario) {
      executeAnalysis(scenario, systemMode, historicalRecords);
    }
  };

  /**
   * Apply Scenario Form Edits
   */
  const handleApplyScenario = (updated: ScenarioData) => {
    handleLiveScenarioUpdate(updated, 'Manual Scenario Form Configuration Saved');
  };

  /**
   * File Upload
   */
  const handleUploadFile = async (file: File): Promise<HistoricalUploadResponse> => {
    setIsLoading(true);
    try {
      const res = await api.uploadHistoricalFile(file);
      setUploadResult(res);
      if (res.status !== 'INVALID_FILE' && res.records.length > 0) {
        setHistoricalRecords(res.records);
        // Switch to User Data Mode automatically
        setSystemMode('USER_DATA');
        if (scenario) {
          await executeAnalysis(scenario, 'USER_DATA', res.records);
        }
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load Sample Historical CSV
   */
  const handleLoadSampleCsv = async () => {
    try {
      setIsLoading(true);
      const blob = await api.getSampleHistoricalCsvBlob();
      const file = new File([blob], 'sample_festival_historical_data.csv', { type: 'text/csv' });
      await handleUploadFile(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample historical CSV.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh Live Feed
   */
  const handleRefreshLive = async () => {
    try {
      const live = await api.getLiveStatus();
      setLiveStatus(live);
    } catch (err: any) {
      console.warn('Live status refresh error:', err);
    }
  };

  const handleNavigateDashboard = (tab?: string) => {
    if (tab) setDashboardTab(tab);
    setActivePage('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* 1. HEADER */}
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
        systemMode={systemMode}
        onNavigateSection={(sectionId) => {
          const el = document.getElementById(sectionId);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* ERROR BANNER IF ANY */}
      {errorMessage && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-700 hover:text-red-900 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. MAIN CONTENT VIEW */}
      <main className="flex-1">
        {activePage === 'home' ? (
          <HomePage
            scenario={scenario}
            forecast={forecast}
            allocation={allocation}
            systemMode={systemMode}
            onSetMode={handleSetMode}
            onResetDefaults={handleResetDefaults}
            onRefresh={handleRefresh}
            onNavigateDashboard={handleNavigateDashboard}
            onNavigateComplaints={() => {
              setActivePage('complaints');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onLiveScenarioUpdate={handleLiveScenarioUpdate}
            isUpdating={isUpdating}
            activityLog={activityLog}
            lastUpdateTimestamp={lastUpdateTimestamp}
            isLoading={isLoading}
          />
        ) : activePage === 'complaints' ? (
          <div className="py-6">
            <ComplaintSection stops={scenario?.stops || []} />
          </div>
        ) : (
          <DashboardPage
            initialTab={dashboardTab}
            scenario={scenario}
            forecast={forecast}
            allocation={allocation}
            simulation={simulation}
            uploadResult={uploadResult}
            liveStatus={liveStatus}
            onApplyScenario={handleApplyScenario}
            onReloadScenario={handleResetDefaults}
            onUploadFile={handleUploadFile}
            onLoadSampleCsv={handleLoadSampleCsv}
            onRefreshLive={handleRefreshLive}
            onBackToHome={() => {
              setActivePage('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* 3. FOOTER */}
      <Footer />
    </div>
  );
};

export default App;
