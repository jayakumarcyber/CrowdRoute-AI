import React, { useState, useEffect, useRef } from 'react';
import { Save, RotateCcw, AlertTriangle, Check, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Bus, ScenarioData, Stop, WeatherCondition } from '../types/api';
import { formatTo12Hour, isValid24HourTime } from '../utils/timeFormat';

interface ScenarioFormProps {
  scenario: ScenarioData | null;
  onApplyScenario: (updated: ScenarioData) => void;
  onReloadSaved: () => void;
  isLoading?: boolean;
}

export const ScenarioForm: React.FC<ScenarioFormProps> = ({
  scenario,
  onApplyScenario,
  onReloadSaved,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<ScenarioData | null>(null);
  const [autoSyncStatus, setAutoSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SYNCED'>('SYNCED');
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    if (scenario) {
      setFormData(JSON.parse(JSON.stringify(scenario)));
      setAutoSyncStatus('SYNCED');
    }
  }, [scenario]);

  if (!formData) {
    return <div className="p-8 text-center text-slate-500">Loading scenario parameters...</div>;
  }

  const prog = formData.festival_programme;
  const weather = formData.weather;

  // Handle program scalar edits
  const handleProgChange = (field: string, value: any) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        festival_programme: {
          ...prev.festival_programme,
          [field]: value,
        },
      };
    });
  };

  // Handle time horizon edits
  const handleHorizonChange = (field: string, value: any) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        festival_programme: {
          ...prev.festival_programme,
          time_horizon: {
            ...prev.festival_programme.time_horizon,
            [field]: value,
          },
        },
      };
    });
  };

  // Handle demand share updates
  const handleShareChange = (stopId: string, percentage: number) => {
    const fraction = percentage / 100;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        festival_programme: {
          ...prev.festival_programme,
          demand_distribution: {
            ...prev.festival_programme.demand_distribution,
            [stopId]: fraction,
          },
        },
      };
    });
  };

  // Handle min buses updates
  const handleMinBusesChange = (stopId: string, minBuses: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stops: prev.stops.map((s) => (s.stop_id === stopId ? { ...s, min_service_buses: minBuses } : s)),
      };
    });
  };

  // Handle coordinates updates
  const handleStopCoordChange = (stopId: string, field: 'latitude' | 'longitude', value: string) => {
    const num = value.trim() ? parseFloat(value) : undefined;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stops: prev.stops.map((s) => (s.stop_id === stopId ? { ...s, [field]: num } : s)),
      };
    });
  };

  // Handle bus edits
  const handleBusChange = (busId: string, field: keyof Bus, value: any) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fleet: prev.fleet.map((b) => (b.bus_id === busId ? { ...b, [field]: value } : b)),
      };
    });
  };

  // PHASE 3: Automatic Scenario Pipeline Updates
  // When user changes ANY relevant input, automatically update complete analysis pipeline without manual rerun
  useEffect(() => {
    if (!formData || !scenario) return;
    // Don't auto-apply if identical to active scenario
    if (JSON.stringify(formData) === JSON.stringify(scenario)) return;

    // Validate essential inputs before triggering auto-pipeline
    const isEndTimeValid = isValid24HourTime(formData.festival_programme.scheduled_event_end_time);
    const isHorizonStartValid = isValid24HourTime(formData.festival_programme.time_horizon.start_time);
    const isHorizonEndValid = isValid24HourTime(formData.festival_programme.time_horizon.end_time);
    const sharesTotal = Object.values(formData.festival_programme.demand_distribution).reduce((sum, v) => sum + v, 0) * 100;
    const isSharesValid = Math.abs(sharesTotal - 100) < 1.0;

    if (!isEndTimeValid || !isHorizonStartValid || !isHorizonEndValid || !isSharesValid) {
      return;
    }

    setAutoSyncStatus('SYNCING');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onApplyScenario(formData);
      setAutoSyncStatus('SYNCED');
    }, 600);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, scenario, onApplyScenario]);

  const sharesSum = Object.values(prog.demand_distribution).reduce((sum, v) => sum + v, 0) * 100;
  const isSharesSumValid = Math.abs(sharesSum - 100) < 0.5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onApplyScenario(formData);
    setAutoSyncStatus('SYNCED');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
      
      {/* HEADER WITH AUTO-SYNC STATUS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-xl text-slate-900">
              Scenario Parameters & Fleet Inventory
            </h3>
            {autoSyncStatus === 'SYNCING' || isLoading ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-semibold animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                <span>Updating pipeline...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Auto-sync active</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Modify festival attendance, scheduled timings, stop shares, and bus availability. All changes recalculate forecasts and allocations automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={onReloadSaved}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reload Baseline</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ROW 1: EVENT DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Event / Festival Title
            </label>
            <input
              type="text"
              value={prog.event_name}
              onChange={(e) => handleProgChange('event_name', e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">
                Scheduled Event End Time (HH:MM)
              </label>
              <span className="text-[11px] font-mono text-sky-700 font-bold">
                {formatTo12Hour(prog.scheduled_event_end_time)}
              </span>
            </div>
            <input
              type="text"
              pattern="^(?:[01]\d|2[0-3]):[0-5]\d$"
              value={prog.scheduled_event_end_time}
              onChange={(e) => handleProgChange('scheduled_event_end_time', e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>
        </div>

        {/* ROW 2: ATTENDANCE & WEATHER */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Expected Attendance (Persons)
            </label>
            <input
              type="number"
              min="100"
              step="500"
              value={prog.expected_total_attendance}
              onChange={(e) => handleProgChange('expected_total_attendance', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Transit Egress Fraction (0.0 - 1.0)
            </label>
            <input
              type="number"
              min="0.05"
              max="1.0"
              step="0.05"
              value={prog.exiting_passenger_fraction}
              onChange={(e) => handleProgChange('exiting_passenger_fraction', parseFloat(e.target.value) || 0.85)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Weather Multiplier
            </label>
            <select
              value={weather.condition}
              onChange={(e) =>
                setFormData((prev) =>
                  prev ? { ...prev, weather: { ...prev.weather, condition: e.target.value as WeatherCondition } } : prev
                )
              }
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="clear">Clear Weather (Factor 1.0)</option>
              <option value="light_rain">Light Rain (Factor 1.2)</option>
              <option value="heavy_rain">Heavy Rain (Factor 1.4 - Severe surge)</option>
            </select>
          </div>
        </div>

        {/* ROW 3: TIME HORIZON */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">
                Forecast Start Time (HH:MM)
              </label>
              <span className="text-[11px] font-mono text-sky-700 font-bold">
                {formatTo12Hour(prog.time_horizon.start_time)}
              </span>
            </div>
            <input
              type="text"
              pattern="^(?:[01]\d|2[0-3]):[0-5]\d$"
              value={prog.time_horizon.start_time}
              onChange={(e) => handleHorizonChange('start_time', e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">
                Forecast End Time (HH:MM)
              </label>
              <span className="text-[11px] font-mono text-sky-700 font-bold">
                {formatTo12Hour(prog.time_horizon.end_time)}
              </span>
            </div>
            <input
              type="text"
              pattern="^(?:[01]\d|2[0-3]):[0-5]\d$"
              value={prog.time_horizon.end_time}
              onChange={(e) => handleHorizonChange('end_time', e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Interval Resolution (Minutes)
            </label>
            <input
              type="number"
              value={prog.time_horizon.interval_minutes}
              readOnly
              className="w-full px-3 py-2 rounded-md border border-slate-200 bg-slate-100 text-sm font-mono text-slate-600 cursor-not-allowed"
            />
          </div>
        </div>

        {/* STOPS & DEMAND SHARES TABLE */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-sm text-slate-900">
                Designated Bus Stops & Demand Distribution
              </h4>
              <p className="text-xs text-slate-500">
                Configure coordinates, passenger split percentages, and minimum required safety buses at donor terminals.
              </p>
            </div>
            <div className={`px-2.5 py-1 rounded text-xs font-bold font-mono border ${
              isSharesSumValid
                ? 'bg-sky-50 text-sky-800 border-sky-200'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}>
              Shares Total: {sharesSum.toFixed(1)}%
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-white rounded border border-slate-200">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Stop ID</th>
                  <th className="p-2.5">Location Name</th>
                  <th className="p-2.5">Min Reserve Buses</th>
                  <th className="p-2.5">Demand Share (%)</th>
                  <th className="p-2.5">Latitude</th>
                  <th className="p-2.5">Longitude</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {formData.stops.map((stop) => {
                  const shareVal = (prog.demand_distribution[stop.stop_id] || 0) * 100;
                  return (
                    <tr key={stop.stop_id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{stop.stop_id}</td>
                      <td className="p-2.5 font-sans">{stop.name}</td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={stop.min_service_buses}
                          onChange={(e) => handleMinBusesChange(stop.stop_id, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 rounded border border-slate-300 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={shareVal.toFixed(1)}
                            onChange={(e) => handleShareChange(stop.stop_id, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 rounded border border-slate-300 text-xs font-mono"
                          />
                          <span className="font-sans text-slate-500">%</span>
                        </div>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="e.g. 12.2285"
                          value={stop.latitude !== undefined && stop.latitude !== null ? stop.latitude : ''}
                          onChange={(e) => handleStopCoordChange(stop.stop_id, 'latitude', e.target.value)}
                          className="w-24 px-2 py-1 rounded border border-slate-300 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="e.g. 79.0700"
                          value={stop.longitude !== undefined && stop.longitude !== null ? stop.longitude : ''}
                          onChange={(e) => handleStopCoordChange(stop.stop_id, 'longitude', e.target.value)}
                          className="w-24 px-2 py-1 rounded border border-slate-300 text-xs font-mono"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FLEET INVENTORY SUMMARY */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-sm text-slate-900">
                Fixed Fleet Inventory ({formData.fleet.length} Buses)
              </h4>
              <p className="text-xs text-slate-500">
                Boarding throughput standardized to <code className="font-mono bg-slate-200 px-1 py-0.5 rounded">floor(capacity / 2)</code> per 15-minute interval.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-56 custom-scrollbar">
            <table className="w-full text-left text-xs bg-white rounded border border-slate-200">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-2.5">Bus ID</th>
                  <th className="p-2.5">Initial Station</th>
                  <th className="p-2.5">Total Capacity</th>
                  <th className="p-2.5">15-Min Boarding Cap</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {formData.fleet.map((bus) => {
                  const intCap = Math.floor(bus.capacity / 2);
                  return (
                    <tr key={bus.bus_id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-sky-700">{bus.bus_id}</td>
                      <td className="p-2.5">
                        <select
                          value={bus.initial_stop_id}
                          onChange={(e) => handleBusChange(bus.bus_id, 'initial_stop_id', e.target.value)}
                          className="px-2 py-1 rounded border border-slate-300 text-xs bg-white"
                        >
                          {formData.stops.map((s) => (
                            <option key={s.stop_id} value={s.stop_id}>
                              {s.stop_id}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="20"
                          max="120"
                          step="5"
                          value={bus.capacity}
                          onChange={(e) => handleBusChange(bus.bus_id, 'capacity', parseInt(e.target.value) || 60)}
                          className="w-16 px-2 py-1 rounded border border-slate-300 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2.5 font-bold text-emerald-700">{intCap} pax</td>
                      <td className="p-2.5">
                        <select
                          value={bus.status}
                          onChange={(e) => handleBusChange(bus.bus_id, 'status', e.target.value as any)}
                          className="px-2 py-1 rounded border border-slate-300 text-xs bg-white font-sans"
                        >
                          <option value="available">available</option>
                          <option value="maintenance">maintenance</option>
                          <option value="offline">offline</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-orange-600/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Apply Parameters & Recalculate Forecast</span>
          </button>
        </div>

      </form>
    </div>
  );
};
