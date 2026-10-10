import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { LiveFestivalUpdates, ActivityLogEntry } from '../components/LiveFestivalUpdates';
import { SummaryMetrics } from '../components/SummaryMetrics';
import { CrowdForecast } from '../components/CrowdForecast';
import { BusMap } from '../components/BusMap';
import { BusMovementImpact } from '../components/BusMovementImpact';
import {
  AllocateResponse,
  ForecastResponse,
  OperationalMode,
  ScenarioData,
} from '../types/api';
import { CheckCircle2, Shield, Users, Bus, AlertCircle, ArrowRight } from 'lucide-react';

interface HomePageProps {
  scenario: ScenarioData | null;
  forecast: ForecastResponse | null;
  allocation: AllocateResponse | null;
  systemMode: OperationalMode;
  onSetMode: (mode: OperationalMode) => void;
  onResetDefaults: () => void;
  onRefresh: () => void;
  onNavigateDashboard: (tab?: string) => void;
  onNavigateComplaints?: () => void;
  onLiveScenarioUpdate?: (updated: ScenarioData, desc: string) => void;
  isUpdating?: boolean;
  activityLog?: ActivityLogEntry[];
  lastUpdateTimestamp?: string;
  isLoading?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  scenario,
  forecast,
  allocation,
  systemMode,
  onSetMode,
  onResetDefaults,
  onRefresh,
  onNavigateDashboard,
  onNavigateComplaints,
  onLiveScenarioUpdate,
  isUpdating = false,
  activityLog = [],
  lastUpdateTimestamp = '',
  isLoading,
}) => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. HERO SECTION */}
      <HeroSection
        onScrollToForecast={() => scrollTo('crowd-forecast')}
        onScrollToAllocation={() => scrollTo('bus-movement-impact')}
        onReportProblem={onNavigateComplaints}
      />

      {/* 2. OFFICIAL CONSTRAINT 1: LIVE FESTIVAL OPERATIONS CONTROLLER */}
      {onLiveScenarioUpdate && (
        <LiveFestivalUpdates
          scenario={scenario}
          onUpdateScenario={onLiveScenarioUpdate}
          onResetDefaults={onResetDefaults}
          isUpdating={isUpdating}
          activityLog={activityLog}
          lastUpdateTimestamp={lastUpdateTimestamp}
        />
      )}

      {/* 3. SIMPLE INFORMATION STRIP */}
      <SummaryMetrics
        scenario={scenario}
        forecast={forecast}
        systemMode={systemMode}
        onSetMode={onSetMode}
        onResetDefaults={onResetDefaults}
        onRefresh={onRefresh}
        isLoading={isLoading}
      />

      {/* 4. CROWD FORECAST PREVIEW */}
      <CrowdForecast
        forecast={forecast}
        stops={scenario?.stops || []}
        onViewDetailedTable={() => onNavigateDashboard('forecast-table')}
      />

      {/* 5. INTERACTIVE BUS STOP & ROUTE MAP */}
      <section id="bus-map-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <BusMap
          stops={scenario?.stops || []}
          fleet={scenario?.fleet || []}
          forecast={forecast}
          allocation={allocation}
        />
      </section>

      {/* 6. OFFICIAL CONSTRAINT 2: FIXED FLEET WITH VISIBLE SERVICE TRADE-OFFS */}
      <div id="bus-allocation">
        <BusMovementImpact
          allocation={allocation}
          forecast={forecast}
          scenario={scenario}
          onViewSimulation={() => onNavigateDashboard('simulation')}
        />
      </div>

      {/* 6. REPORT A TRANSPORT PROBLEM QUICK CITIZEN BANNER */}
      <section id="complaint-banner" className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100 border border-orange-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-200/70 text-orange-900 text-xs font-bold uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5 text-orange-700" />
              <span>CITIZEN FEEDBACK & GRIEVANCE REPORTING</span>
            </div>
            <h3 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              Facing Overcrowding or Bus Delays at the Festival?
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              Submit a quick report to help transport controllers adjust bus movements. Receive an instant tracking reference code with no complex signup.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <button
              onClick={onNavigateComplaints}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-md shadow-orange-600/20 transition-all hover:translate-y-[-1px]"
            >
              <span>Report a Transport Problem</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. ABOUT CIVICPULSE / PORTAL ETHICS & ARCHITECTURE */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-lg">
              🏛️
            </div>
            <div>
              <h3 className="font-heading font-bold text-xl text-slate-900">
                About CrowdRoute AI Decision Support System
              </h3>
              <p className="text-xs text-sky-700 font-semibold">
                Designed for SAKTHI HACKFEST'26 — Generative AI Domain
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
            <strong>CrowdRoute AI</strong> provides municipal transport authorities with actionable, transparent recommendations during high-consequence temple festivals and mass gatherings. Unlike black-box models, all decisions strictly preserve physical constraints:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0 text-xs">
                ✓
              </div>
              <div>
                <strong className="text-sm text-slate-900 block mb-1">
                  Zero-Phantom Fleet Conservation
                </strong>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The active bus fleet is strictly conserved before and after optimization. No additional buses are invented, duplicated, or assumed out of nowhere.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0 text-xs">
                ✓
              </div>
              <div>
                <strong className="text-sm text-slate-900 block mb-1">
                  Donor Terminal Safety Reserves
                </strong>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every donor stop maintains configured minimum service buses to ensure passenger safety and prevent transferring crowd panics elsewhere.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0 text-xs">
                ✓
              </div>
              <div>
                <strong className="text-sm text-slate-900 block mb-1">
                  Standardized Boarding Capacity
                </strong>
                <p className="text-xs text-slate-600 leading-relaxed">
                  All deficit reductions and discrete simulations consistently enforce <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">floor(capacity / 2)</code> per 15-minute interval for realistic dispatch cycles.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0 text-xs">
                ✓
              </div>
              <div>
                <strong className="text-sm text-slate-900 block mb-1">
                  Transparent Data Provenance
                </strong>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Honest disclosures distinguish verified synthetic demo baselines from user-supplied overrides and historical observations.
                </p>
              </div>
            </div>

          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => onNavigateDashboard('scenario')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm"
            >
              <span>Open Operator Management Console →</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
