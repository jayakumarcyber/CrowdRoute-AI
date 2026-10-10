"""Demand Estimation Engine for CrowdRoute AI.
Provides an explainable, deterministic rule-based baseline estimating passenger
demand by stop and time interval based on festival schedule and weather.
NO deep-learning model trained on invented data.
"""

import json
import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from backend.app.models import (
    DemandIntervalEstimate,
    ForecastRequest,
    ForecastResponse,
    ScenarioData,
    StopForecastSummary,
)


DEFAULT_SCENARIO_PATH = Path(__file__).resolve().parent.parent / "data" / "demo_scenario.json"


def load_default_scenario() -> ScenarioData:
    """Loads and validates the default synthetic demo scenario from disk."""
    with open(DEFAULT_SCENARIO_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return ScenarioData.model_validate(data)


def parse_time_to_minutes(time_str: str) -> int:
    """Converts HH:MM string to total minutes from 00:00."""
    parts = time_str.strip().split(":")
    return int(parts[0]) * 60 + int(parts[1])


def format_minutes_to_time(minutes: int) -> str:
    """Converts total minutes from 00:00 to HH:MM string."""
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


def calculate_egress_weights(
    intervals: List[Tuple[int, int]],
    event_end_minutes: int,
    concentration_factor: float = 1.0,
    base_sigma_minutes: float = 24.0,
) -> List[float]:
    """Calculates normalized passenger departure distribution weights across intervals.
    
    The departure surge follows a smooth egress curve centered shortly after
    the final event end time.
    If weather is rainy (concentration_factor > 1.0), sigma compresses,
    meaning crowds rush to exit within a narrower window around event finish.
    """
    # Peak egress begins right as the event concludes; midpoint of peak window is ~7.5 min after end
    peak_center = event_end_minutes + 7.5
    effective_sigma = max(8.0, base_sigma_minutes / max(0.2, concentration_factor))

    raw_weights = []
    for start_m, end_m in intervals:
        mid_m = (start_m + end_m) / 2.0
        # Gaussian decay around peak egress time
        diff = mid_m - peak_center
        w = math.exp(-0.5 * (diff / effective_sigma) ** 2)
        raw_weights.append(w)

    total_weight = sum(raw_weights)
    if total_weight <= 0:
        return [1.0 / len(intervals)] * len(intervals)
    return [w / total_weight for w in raw_weights]


def generate_demand_forecast(request: Optional[ForecastRequest] = None) -> ForecastResponse:
    """Generates an explainable synthetic demand forecast for each stop and interval."""
    if request is None:
        request = ForecastRequest()

    scenario = request.scenario if request.scenario is not None else load_default_scenario()
    programme = scenario.festival_programme
    weather = scenario.weather

    # Apply optional request overrides
    event_end_str = request.scheduled_event_end_time_override or programme.scheduled_event_end_time
    weather_cond = request.weather_condition_override or weather.condition
    total_attendance = request.attendance_override if request.attendance_override is not None else programme.expected_total_attendance

    # Compute weather factor
    if weather_cond == "heavy_rain":
        concentration_factor = 1.4
    elif weather_cond == "light_rain":
        concentration_factor = 1.2
    else:
        concentration_factor = 1.0

    # Build time intervals
    horizon = programme.time_horizon
    start_minutes = parse_time_to_minutes(horizon.start_time)
    end_minutes = parse_time_to_minutes(horizon.end_time)
    step_minutes = horizon.interval_minutes

    time_slots: List[Tuple[int, int]] = []
    curr = start_minutes
    while curr < end_minutes:
        nxt = min(curr + step_minutes, end_minutes)
        time_slots.append((curr, nxt))
        curr = nxt

    event_end_minutes = parse_time_to_minutes(event_end_str)
    interval_weights = calculate_egress_weights(
        time_slots,
        event_end_minutes=event_end_minutes,
        concentration_factor=concentration_factor,
    )

    # Exiting passengers through transit
    total_transit_egress = int(total_attendance * programme.exiting_passenger_fraction)

    # Precompute baseline stop capacity per interval
    stop_map = {s.stop_id: s for s in scenario.stops}
    # Count baseline buses assigned to each stop
    buses_per_stop: Dict[str, int] = {s.stop_id: 0 for s in scenario.stops}
    for b in scenario.fleet:
        if b.initial_stop_id in buses_per_stop:
            buses_per_stop[b.initial_stop_id] += 1

    # Assume standard bus cycle: in a 15-min interval, a scheduled bus provides ~30 passenger movements
    # (i.e. capacity / 2 for a 30-min roundtrip cycle)
    avg_bus_cap = 60
    interval_capacity_per_bus = avg_bus_cap // 2

    estimates: List[DemandIntervalEstimate] = []
    stop_total_demand: Dict[str, int] = {s.stop_id: 0 for s in scenario.stops}
    stop_peak_info: Dict[str, Tuple[str, int]] = {s.stop_id: ("", -1) for s in scenario.stops}

    for idx, (s_m, e_m) in enumerate(time_slots):
        start_str = format_minutes_to_time(s_m)
        end_str = format_minutes_to_time(e_m)
        interval_label = f"{start_str}-{end_str}"
        w = interval_weights[idx]

        for stop in scenario.stops:
            share = programme.demand_distribution.get(stop.stop_id, 0.0)
            stop_share_passengers = total_transit_egress * share
            central_est = int(round(stop_share_passengers * w))
            low_est = int(round(central_est * 0.85))
            high_est = int(round(central_est * 1.20))

            stop_total_demand[stop.stop_id] += central_est
            if central_est > stop_peak_info[stop.stop_id][1]:
                stop_peak_info[stop.stop_id] = (interval_label, central_est)

            # Baseline scheduled capacity for this interval
            sched_buses = buses_per_stop.get(stop.stop_id, stop.baseline_scheduled_buses)
            interval_cap = sched_buses * interval_capacity_per_bus
            deficit = central_est - interval_cap

            # Risk classification
            if deficit > 500 or (interval_cap > 0 and central_est > 3 * interval_cap):
                risk = "CRITICAL"
            elif deficit > 100 or (interval_cap > 0 and central_est > 1.5 * interval_cap):
                risk = "HIGH"
            elif deficit > 0:
                risk = "MODERATE"
            else:
                risk = "LOW"

            prov = (
                f"Synthetic rule-based estimate: {share*100:.1f}% stop split, "
                f"weight={w:.4f} from egress curve centered at event end {event_end_str}. "
                f"Weather={weather_cond} (concentration={concentration_factor:.1f})."
            )

            estimates.append(
                DemandIntervalEstimate(
                    stop_id=stop.stop_id,
                    interval_index=idx,
                    start_time=start_str,
                    end_time=end_str,
                    low_estimate=low_est,
                    central_estimate=central_est,
                    high_estimate=high_est,
                    baseline_capacity=interval_cap,
                    deficit_surplus=deficit,
                    risk_level=risk,
                    provenance_note=prov,
                )
            )

    # Build stop summaries
    summaries: Dict[str, StopForecastSummary] = {}
    for stop in scenario.stops:
        tot = stop_total_demand[stop.stop_id]
        pk_int, pk_val = stop_peak_info[stop.stop_id]
        sched_buses = buses_per_stop.get(stop.stop_id, stop.baseline_scheduled_buses)
        total_baseline_cap = sched_buses * interval_capacity_per_bus * len(time_slots)

        if pk_val > sched_buses * interval_capacity_per_bus * 2:
            overall_risk = "CRITICAL"
        elif pk_val > sched_buses * interval_capacity_per_bus:
            overall_risk = "HIGH"
        elif tot > total_baseline_cap:
            overall_risk = "MODERATE"
        else:
            overall_risk = "LOW"

        summaries[stop.stop_id] = StopForecastSummary(
            stop_id=stop.stop_id,
            total_demand=tot,
            peak_interval=pk_int,
            peak_demand=pk_val,
            baseline_scheduled_capacity=total_baseline_cap,
            overall_risk=overall_risk,
        )

    assumptions = [
        f"Synthetic demand distribution: Total attendance assumed {total_attendance:,} people.",
        f"{programme.exiting_passenger_fraction*100:.0f}% of attendees leave via municipal transit network.",
        f"Event end time: {event_end_str}; egress curve standard deviation: {24.0/concentration_factor:.1f} minutes.",
        f"Weather mode: {weather_cond} with surge concentration factor {concentration_factor:.1f}.",
        "Demand estimates are strictly synthetic baselines for planning and comparison only.",
    ]

    return ForecastResponse(
        scenario_id=scenario.scenario_metadata.scenario_id,
        event_end_time=event_end_str,
        weather_condition=weather_cond,
        intervals=estimates,
        stop_summaries=summaries,
        assumptions=assumptions,
        data_provenance="Deterministic rule-based Gaussian egress model over synthetic scenario data.",
    )
