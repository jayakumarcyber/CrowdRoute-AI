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
import { DataSourcesPage } from './pages/DataSourcesPage';
import { ComplaintSection } from './components/ComplaintSection';
import { ActivityLogEntry } from './components/LiveFestivalUpdates';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ReportProblemModal, TrackReportModal } from './components/CivicModals';
import { AlertCircle } from 'lucide-react';
import { formatTo12Hour } from './utils/timeFormat';

const getFormattedNow = () =>
  new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

const getPageFromUrl = (): 'home' | 'dashboard' | 'complaints' | 'sources' => {
  if (typeof window === 'undefined') return 'home';
  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  if (pathname.startsWith('/dashboard') || hash.includes('dashboard')) return 'dashboard';
  if (pathname.startsWith('/complaints') || hash.includes('complaints')) return 'complaints';
  if (pathname.startsWith('/sources') || hash.includes('sources')) return 'sources';
  return 'home';
};

const getTabFromUrl = (): string => {
  if (typeof window === 'undefined') return 'scenario';
  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get('tab');
  if (tabParam) return tabParam;
  const hash = window.location.hash.toLowerCase();
  if (hash.includes('tab=')) {
    const match = hash.match(/tab=([a-z-]+)/);
    if (match) return match[1];
  }
  return 'scenario';
};

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<'home' | 'dashboard' | 'complaints' | 'sources'>(getPageFromUrl());
  const [dashboardTab, setDashboardTab] = useState<string>(getTabFromUrl());
  const [systemMode, setSystemMode] = useState<OperationalMode>('DEMO_SYNTHETIC');

  // Civic Modals States (Matching WaterlogAI quick action dialogs)
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState<boolean>(false);

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
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<string>(getFormattedNow());
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([
    {
      id: 'init-0',
      timestamp: getFormattedNow(),
      action: 'System Initialized',
      details: 'Loaded baseline festival schedule (9:30 PM finish, Clear weather). Fixed fleet: 16 buses.',
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

        setLastUpdateTimestamp(getFormattedNow());
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
        timestamp: getFormattedNow(),
        action: 'Reset to Scenario Defaults',
        details: 'Restored baseline 9:30 PM event conclusion and Clear weather.',
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
      timestamp: getFormattedNow(),
      action: description,
      details: `Scenario updated (End time: ${formatTo12Hour(updatedScenario.festival_programme.scheduled_event_end_time)}, Weather: ${updatedScenario.weather.condition}). Auto-recalculating pipeline.`,
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

  /**
   * Browser URL synchronized navigation
   */
  const navigateTo = useCallback(
    (page: 'home' | 'dashboard' | 'complaints' | 'sources', tab?: string) => {
      setActivePage(page);
      if (tab) setDashboardTab(tab);

      const targetTab = tab || (page === 'dashboard' ? dashboardTab : undefined);
      let targetPath = '/';
      if (page === 'dashboard') {
        targetPath = targetTab && targetTab !== 'scenario' ? `/dashboard?tab=${targetTab}` : '/dashboard';
      } else if (page === 'complaints') {
        targetPath = '/complaints';
      } else if (page === 'sources') {
        targetPath = '/sources';
      }

      if (window.location.pathname + window.location.search !== targetPath) {
        try {
          window.history.pushState({ page, tab: targetTab }, '', targetPath);
        } catch (e) {
          window.location.hash = page;
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [dashboardTab]
  );

  // Synchronize on browser Back/Forward or direct hash/path changes
  useEffect(() => {
    const handleUrlChange = () => {
      setActivePage(getPageFromUrl());
      setDashboardTab(getTabFromUrl());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const handleNavigateDashboard = (tab?: string) => {
    navigateTo('dashboard', tab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* 1. HEADER */}
      <Header
        activePage={activePage}
        setActivePage={navigateTo}
        systemMode={systemMode}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenTrackModal={() => setIsTrackModalOpen(true)}
        onNavigateSection={(sectionId) => {
          if (activePage !== 'home') {
            navigateTo('home');
            setTimeout(() => {
              const el = document.getElementById(sectionId);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          } else {
            const el = document.getElementById(sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }
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

      {/* 2. MAIN CONTENT VIEW PROTECTED BY ERROR BOUNDARY */}
      <main className="flex-1">
        <ErrorBoundary fallbackTitle="Portal View Recovery" onReset={handleResetDefaults}>
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
                navigateTo('complaints');
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
          ) : activePage === 'sources' ? (
            <DataSourcesPage
              scenario={scenario}
              liveStatus={liveStatus}
              uploadResult={uploadResult}
              onRefreshLive={handleRefreshLive}
              onBackToHome={() => {
                navigateTo('home');
              }}
              onNavigatePastData={() => {
                handleNavigateDashboard('historical');
              }}
              isLoading={isLoading}
            />
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
                navigateTo('home');
              }}
              isLoading={isLoading}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* 3. FOOTER */}
      <Footer />

      {/* 4. CIVIC ACTION MODALS (MATCHING WATERLOGAI SCREENSHOTS 4 & 5) */}
      <ReportProblemModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        stops={scenario?.stops || []}
      />
      <TrackReportModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
      />
    </div>
  );
};

export default App;
