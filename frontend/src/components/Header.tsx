import React, { useState } from 'react';
import {
  Phone,
  Clock,
  Bus,
  LayoutDashboard,
  Menu,
  X,
  ShieldCheck,
  AlertTriangle,
  Search,
  Activity,
  MapPin,
  Calendar,
  FileSpreadsheet,
  LineChart,
} from 'lucide-react';
import { OperationalMode } from '../types/api';

interface HeaderProps {
  activePage: 'home' | 'dashboard' | 'complaints' | 'sources';
  setActivePage: (page: 'home' | 'dashboard' | 'complaints' | 'sources', tab?: string) => void;
  systemMode: OperationalMode;
  onNavigateSection?: (sectionId: string) => void;
  onOpenReportModal?: () => void;
  onOpenTrackModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  systemMode,
  onNavigateSection,
  onOpenReportModal,
  onOpenTrackModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId?: string) => {
    setActivePage('home');
    setMobileMenuOpen(false);
    if (sectionId && onNavigateSection) {
      setTimeout(() => onNavigateSection(sectionId), 60);
    }
  };

  return (
    <header className="sticky top-0 z-50 shadow-md">
      
      {/* 1. TOP UTILITY STRIP (GOVERNMENT TELEMETRY) */}
      <div className="bg-[#060b14] text-slate-400 text-xs border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex justify-between items-center gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <Phone className="w-3 h-3 text-sky-400" />
              <span>State Transport Helpline: <strong className="text-white font-medium">1800-425-4333</strong> (Toll Free)</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Festival Egress Control: <strong className="text-white font-medium">Active (24x7)</strong></span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold tracking-wider uppercase font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Fixed Fleet: 16 Buses Conserved
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-700/50 text-[10px] font-semibold tracking-wide uppercase">
              <ShieldCheck className="w-3 h-3 text-sky-400" />
              Tamil Nadu State Transit
            </span>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY NAVBAR (DEEP NAVY WATERLOGAI STYLE) */}
      <div className="bg-[#0a1120] text-slate-200 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-4">
          
          {/* BRAND IDENTITY */}
          <button
            onClick={() => handleNavClick()}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-600 to-blue-800 text-white flex items-center justify-center shadow-md shadow-sky-900/30 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-xl text-white tracking-tight leading-tight">
                  CrowdRoute <span className="text-sky-400">AI</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 font-bold uppercase tracking-wider">
                  Transit GIS
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Festival Crowd Prediction & Bus Allocation
              </span>
            </div>
          </button>

          {/* DESKTOP MAIN NAVIGATION */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => handleNavClick('hero')}
              className={`transition-colors py-1 ${
                activePage === 'home' ? 'text-sky-400 font-extrabold border-b-2 border-sky-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('bus-map-section')}
              className="text-slate-300 hover:text-white transition-colors py-1"
            >
              Bus Map
            </button>
            <button
              onClick={() => handleNavClick('crowd-forecast')}
              className="text-slate-300 hover:text-white transition-colors py-1"
            >
              Crowd Prediction
            </button>
            <button
              onClick={() => handleNavClick('bus-timetable-section')}
              className="text-slate-300 hover:text-white transition-colors py-1"
            >
              Timetable
            </button>
            <button
              onClick={() => handleNavClick('bus-allocation')}
              className="text-slate-300 hover:text-white transition-colors py-1"
            >
              Bus Planning
            </button>
            <button
              onClick={() => setActivePage('dashboard', 'simulation')}
              className="text-slate-300 hover:text-white transition-colors py-1"
            >
              Simulation
            </button>
            <button
              onClick={() => setActivePage('dashboard', 'historical')}
              className="text-slate-300 hover:text-white transition-colors py-1"
            >
              Historical Data
            </button>
            <button
              onClick={() => setActivePage('sources')}
              className={`transition-colors py-1 ${
                activePage === 'sources' ? 'text-sky-400 font-extrabold border-b-2 border-sky-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              Data & Sources
            </button>
          </nav>

          {/* RIGHT ACTION CONTROLS */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActivePage(activePage === 'dashboard' ? 'home' : 'dashboard')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-sm ${
                activePage === 'dashboard'
                  ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-600'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 hover:shadow-md'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{activePage === 'dashboard' ? 'Portal Home' : 'View Dashboard'}</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-slate-300 hover:text-white rounded-lg border border-slate-700 bg-slate-900"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* 3. SECONDARY WHITE ACTION SUB-BAR (SCREENSHOT 3 CIVIC SERVICES) */}
      <div className="bg-white border-b border-slate-200 py-2 px-4 sm:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600 uppercase tracking-wider">
              CIVIC SERVICES / QUICK ACTIONS:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Report Problem (Red Button matching Screenshot 3) */}
            <button
              type="button"
              onClick={onOpenReportModal ? onOpenReportModal : () => setActivePage('complaints')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm shadow-red-600/20 transition-all hover:translate-y-[-0.5px]"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Report Problem</span>
            </button>

            {/* Track Complaint (Blue Button matching Screenshot 3) */}
            <button
              type="button"
              onClick={onOpenTrackModal ? onOpenTrackModal : () => setActivePage('complaints')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-sm shadow-blue-700/20 transition-all hover:translate-y-[-0.5px]"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track Report</span>
            </button>

            {/* Console / Queue (Dark Navy Button matching Screenshot 3) */}
            <button
              type="button"
              onClick={() => setActivePage('dashboard')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0a1120] hover:bg-slate-800 text-white text-xs font-bold border border-slate-700 transition-all shadow-sm"
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Transit Operations Queue</span>
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE COLLAPSIBLE MENU */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#0b1329] text-white border-b border-slate-700 px-4 py-4 space-y-2.5 animate-fadeIn">
          <button
            onClick={() => handleNavClick('hero')}
            className="block w-full text-left font-bold text-xs uppercase tracking-wider py-1.5 text-sky-400 hover:text-white"
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('bus-map-section')}
            className="block w-full text-left font-bold text-xs uppercase tracking-wider py-1.5 text-slate-300 hover:text-white"
          >
            Bus Map
          </button>
          <button
            onClick={() => handleNavClick('crowd-forecast')}
            className="block w-full text-left font-bold text-xs uppercase tracking-wider py-1.5 text-slate-300 hover:text-white"
          >
            Crowd Prediction
          </button>
          <button
            onClick={() => handleNavClick('bus-timetable-section')}
            className="block w-full text-left font-bold text-xs uppercase tracking-wider py-1.5 text-slate-300 hover:text-white"
          >
            Timetable
          </button>
          <button
            onClick={() => handleNavClick('bus-allocation')}
            className="block w-full text-left font-bold text-xs uppercase tracking-wider py-1.5 text-slate-300 hover:text-white"
          >
            Bus Planning
          </button>
          <button
            onClick={() => {
              setActivePage('dashboard', 'historical');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left font-bold text-xs uppercase tracking-wider py-1.5 text-slate-300 hover:text-white"
          >
            Historical Data
          </button>
          <button
            onClick={() => {
              setActivePage('sources');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left font-bold text-xs uppercase tracking-wider py-1.5 text-slate-300 hover:text-white"
          >
            Data Sources
          </button>
          <button
            onClick={() => {
              setActivePage('complaints');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left font-bold text-xs uppercase tracking-wider py-1.5 text-orange-400 hover:text-white"
          >
            Report a Problem
          </button>
        </div>
      )}

    </header>
  );
};
