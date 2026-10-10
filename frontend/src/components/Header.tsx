import React, { useState } from 'react';
import { Phone, Clock, Bus, LayoutDashboard, Menu, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { OperationalMode } from '../types/api';

interface HeaderProps {
  activePage: 'home' | 'dashboard' | 'complaints';
  setActivePage: (page: 'home' | 'dashboard' | 'complaints') => void;
  systemMode: OperationalMode;
  onNavigateSection?: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  systemMode,
  onNavigateSection,
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
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-slate-200">
      {/* 1. TOP UTILITY BAR (GOVERNMENT STYLE) */}
      <div className="bg-slate-950 text-slate-400 text-xs border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex justify-between items-center gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>Transport Helpline: <strong className="text-white font-medium">1800-425-4333</strong> (Toll Free)</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Festival Egress Control: <strong className="text-white font-medium">24x7 Active</strong></span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActivePage('complaints');
                setMobileMenuOpen(false);
              }}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-semibold"
            >
              <AlertCircle className="w-3 h-3 text-orange-400" />
              <span>Report a Problem</span>
            </button>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-900/60 text-sky-300 border border-sky-700/50 text-[11px] font-semibold tracking-wide uppercase">
              <ShieldCheck className="w-3 h-3 text-sky-400" />
              Government Transport Portal
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVIGATION NAVBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center gap-4">
        {/* BRAND IDENTITY */}
        <button
          onClick={() => handleNavClick()}
          className="flex items-center gap-3 text-left focus:outline-none"
        >
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-sky-700 text-white flex items-center justify-center shadow-md shadow-sky-900/20 flex-shrink-0">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-xl sm:text-2xl text-slate-900 tracking-tight leading-tight">
              CrowdRoute <span className="text-sky-600">AI</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Festival Crowd Prediction & Bus Planning
            </span>
          </div>
        </button>

        {/* DESKTOP NAVIGATION MENU */}
        <nav className="hidden lg:flex items-center gap-5">
          <button
            onClick={() => handleNavClick('hero')}
            className={`text-sm font-semibold transition-colors ${
              activePage === 'home' ? 'text-sky-600' : 'text-slate-700 hover:text-sky-600'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('crowd-forecast')}
            className="text-sm font-semibold text-slate-700 hover:text-sky-600 transition-colors"
          >
            Crowd Prediction
          </button>
          <button
            onClick={() => handleNavClick('bus-map-section')}
            className="text-sm font-semibold text-slate-700 hover:text-sky-600 transition-colors"
          >
            Bus Map
          </button>
          <button
            onClick={() => handleNavClick('bus-allocation')}
            className="text-sm font-semibold text-slate-700 hover:text-sky-600 transition-colors"
          >
            Bus Planning
          </button>
          <button
            onClick={() => {
              setActivePage('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`text-sm font-semibold transition-colors ${
              activePage === 'dashboard' ? 'text-sky-600' : 'text-slate-700 hover:text-sky-600'
            }`}
          >
            Past Crowd Data
          </button>
          <button
            onClick={() => {
              setActivePage('complaints');
              setMobileMenuOpen(false);
            }}
            className={`text-sm font-semibold transition-colors ${
              activePage === 'complaints' ? 'text-orange-600 font-bold' : 'text-slate-700 hover:text-orange-600'
            }`}
          >
            Public Complaints
          </button>
        </nav>

        {/* PRIMARY ACTIONS & DASHBOARD TOGGLE */}
        <div className="flex items-center gap-3">
          {/* Mode Pill */}
          <span
            className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase border ${
              systemMode === 'USER_DATA'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {systemMode === 'USER_DATA' ? 'User Data Active' : 'Synthetic Demo'}
          </span>

          <button
            onClick={() => setActivePage(activePage === 'dashboard' ? 'home' : 'dashboard')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-all shadow-sm ${
              activePage === 'dashboard'
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{activePage === 'dashboard' ? 'View Portal Home' : 'View Dashboard'}</span>
          </button>

          {/* MOBILE MENU TOGGLE */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md border border-slate-200"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <button
            onClick={() => handleNavClick('hero')}
            className="block w-full text-left font-semibold text-slate-800 hover:text-sky-600 py-1"
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('crowd-forecast')}
            className="block w-full text-left font-semibold text-slate-800 hover:text-sky-600 py-1"
          >
            Crowd Prediction
          </button>
          <button
            onClick={() => handleNavClick('bus-map-section')}
            className="block w-full text-left font-semibold text-slate-800 hover:text-sky-600 py-1"
          >
            Bus Map
          </button>
          <button
            onClick={() => handleNavClick('bus-allocation')}
            className="block w-full text-left font-semibold text-slate-800 hover:text-sky-600 py-1"
          >
            Bus Planning (Suggested Changes)
          </button>
          <button
            onClick={() => {
              setActivePage('dashboard');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left font-semibold text-slate-800 hover:text-sky-600 py-1"
          >
            Past Crowd Data & Dashboard
          </button>
          <button
            onClick={() => {
              setActivePage('complaints');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left font-bold text-orange-600 hover:text-orange-700 py-1"
          >
            Report a Problem (Public Complaints)
          </button>
        </div>
      )}
    </header>
  );
};
