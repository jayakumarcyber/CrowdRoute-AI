import React from 'react';
import { ArrowRight, Shield, Activity, MapPin } from 'lucide-react';

interface HeroSectionProps {
  onScrollToForecast: () => void;
  onScrollToAllocation: () => void;
  onReportProblem?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onScrollToForecast,
  onScrollToAllocation,
  onReportProblem,
}) => {
  return (
    <section id="hero" className="relative bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border-b border-slate-200 py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT: TEXT CONTENT */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* EYEBROW */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold tracking-wider uppercase">
              <span className="text-sm">🏛️</span>
              <span>SMART PUBLIC TRANSPORT PLANNING</span>
            </div>

            {/* HEADLINE */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Smarter Crowd Prediction.<br />
              <span className="text-sky-600">Better Bus Planning.</span>
            </h1>

            {/* DESCRIPTION */}
            <p className="text-lg text-slate-700 leading-relaxed max-w-2xl">
              Anticipate festival crowds, identify overloaded bus stops, and plan existing buses before congestion becomes critical. An explainable decision-support portal for transport authorities and citizens.
            </p>

            {/* CTA BUTTONS */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onScrollToForecast}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-base shadow-md shadow-orange-600/20 transition-all hover:translate-y-[-1px]"
              >
                <Activity className="w-5 h-5" />
                <span>View Crowd Prediction</span>
              </button>

              <button
                onClick={onScrollToAllocation}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold text-base border border-slate-300 shadow-sm transition-all"
              >
                <span>Suggested Bus Changes</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>

              {onReportProblem && (
                <button
                  onClick={onReportProblem}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-lg text-orange-700 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200 font-semibold text-sm transition-all"
                >
                  <span>Report a Transport Problem</span>
                </button>
              )}
            </div>

            {/* TRUST & AUDIT BADGE */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs text-slate-600">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Strict Fleet Conservation Audited
              </div>
              <span className="text-slate-500">
                Zero phantom buses • Safety reserve minimums guaranteed at all donor stops.
              </span>
            </div>
          </div>

          {/* RIGHT: PHOTOGRAPH (REALISTIC INDIAN BUS TERMINAL DOCUMENTARY ASSET) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-300 bg-white group">
              <img
                src="/hero_bus_terminal.jpg"
                alt="Documentary photograph of high-density Indian bus stand terminal with passengers and transport buses"
                className="w-full h-80 sm:h-96 object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
              />
              
              {/* IMAGE CAPTION OVERLAY */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-transparent p-4 sm:p-5 text-white flex items-end justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-sky-300 font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>State Transit Central Terminal (BS_MAIN)</span>
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Festival Egress Queue & Bay Management
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500 text-white shadow-sm flex-shrink-0">
                  MONITORED
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
