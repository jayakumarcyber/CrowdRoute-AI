"""Pydantic Models for CrowdRoute AI.
Strictly validates inputs, scenario definitions, forecasts, allocation trade-offs, and simulations.
"""

from typing import Dict, List, Literal, Optional, Any
from pydantic import BaseModel, Field, field_validator


# =====================================================================
# SCENARIO & FLEET DOMAIN MODELS
# =====================================================================

class Stop(BaseModel):
    stop_id: str = Field(..., min_length=1, description="Unique stop identifier")
    name: str = Field(..., min_length=1, description="Human readable name of the stop")
    description: str = Field(default="", description="Operational notes for the stop")
    min_service_buses: int = Field(..., ge=0, description="Minimum buses required to maintain baseline safety/service")
    baseline_scheduled_buses: int = Field(..., ge=0, description="Scheduled buses at baseline")
    supported_routes: List[str] = Field(default_factory=list, description="Permitted route codes at this stop")

    @field_validator("stop_id")
    @classmethod
    def validate_stop_id(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("stop_id cannot be empty or whitespace only")
        return v.strip()


class Bus(BaseModel):
    bus_id: str = Field(..., min_length=1, description="Unique bus inventory identifier")
    initial_stop_id: str = Field(..., min_length=1, description="Current depot/stop location")
    capacity: int = Field(..., gt=0, description="Passenger carrying capacity (must be strictly positive)")
    status: Literal["available", "maintenance", "in_transit", "offline"] = Field(
        default="available",
        description="Operational status of the bus"
    )
    compatible_stops: List[str] = Field(
        default_factory=list,
        description="List of stops this vehicle is authorized and equipped to serve"
    )
    compatible_routes: List[str] = Field(
        default_factory=list,
        description="List of route codes compatible with this vehicle"
    )

    @field_validator("bus_id")
    @classmethod
    def validate_bus_id(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("bus_id cannot be empty or whitespace only")
        return v.strip()


class TimeHorizon(BaseModel):
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Start time HH:MM")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="End time HH:MM")
    interval_minutes: int = Field(default=15, gt=0, le=60, description="Time step duration in minutes")


class FestivalProgramme(BaseModel):
    event_name: str = Field(..., min_length=1)
    scheduled_event_end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Event conclusion HH:MM")
    time_horizon: TimeHorizon
    expected_total_attendance: int = Field(..., ge=0, description="Total expected crowd attendance")
    exiting_passenger_fraction: float = Field(..., ge=0.0, le=1.0, description="Fraction exiting via transit")
    demand_distribution: Dict[str, float] = Field(
        ...,
        description="Share of departing passengers destined for each stop_id"
    )

    @field_validator("demand_distribution")
    @classmethod
    def validate_distribution_keys(cls, v: Dict[str, float]) -> Dict[str, float]:
        for stop_id, val in v.items():
            if val < 0.0:
                raise ValueError(f"Demand share for {stop_id} cannot be negative")
        return v


class WeatherScenario(BaseModel):
    condition: Literal["clear", "light_rain", "heavy_rain"] = Field(default="clear")
    surge_concentration_factor: float = Field(default=1.0, gt=0.0, description="Multiplier compressing surge into fewer intervals")
    travel_time_multiplier: float = Field(default=1.0, ge=1.0, description="Congestion/rain slowdown factor on travel time")
    notes: Optional[str] = Field(default="")


class ScenarioMetadata(BaseModel):
    scenario_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    data_nature: str = Field(default="SYNTHETIC DEMO DATA")
    disclaimer: str = Field(
        default="SYNTHETIC DEMO DATA ONLY. All passenger counts and fleet movements are simulated estimates."
    )
    created_for: str = Field(default="SAKTHI HACKFEST'26")
    configured_fleet_assumption: str = Field(
        default="Fixed fleet inventory. No buses added, deleted, or duplicated."
    )


class ScenarioData(BaseModel):
    scenario_metadata: ScenarioMetadata
    festival_programme: FestivalProgramme
    weather: WeatherScenario
    stops: List[Stop] = Field(..., min_length=1)
    travel_time_matrix_minutes: Dict[str, Dict[str, int]]
    fleet: List[Bus] = Field(..., min_length=1)

    @field_validator("fleet")
    @classmethod
    def validate_unique_buses(cls, buses: List[Bus]) -> List[Bus]:
        ids = [b.bus_id for b in buses]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate bus_id found in fleet inventory definition")
        return buses


# =====================================================================
# DEMAND FORECAST MODELS
# =====================================================================

class DemandIntervalEstimate(BaseModel):
    stop_id: str
    interval_index: int
    start_time: str
    end_time: str
    low_estimate: int
    central_estimate: int
    high_estimate: int
    baseline_capacity: int
    deficit_surplus: int
    risk_level: Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]
    provenance_note: str


class StopForecastSummary(BaseModel):
    stop_id: str
    total_demand: int
    peak_interval: str
    peak_demand: int
    baseline_scheduled_capacity: int
    overall_risk: Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]


class ForecastRequest(BaseModel):
    scenario: Optional[ScenarioData] = None
    scheduled_event_end_time_override: Optional[str] = Field(
        default=None,
        pattern=r"^\d{2}:\d{2}$",
        description="Optional override for final event ending time"
    )
    weather_condition_override: Optional[Literal["clear", "light_rain", "heavy_rain"]] = None
    attendance_override: Optional[int] = Field(default=None, ge=0)


class ForecastResponse(BaseModel):
    scenario_id: str
    disclaimer: str = "SYNTHETIC DEMO DATA ONLY - Not real passenger measurements"
    event_end_time: str
    weather_condition: str
    intervals: List[DemandIntervalEstimate]
    stop_summaries: Dict[str, StopForecastSummary]
    assumptions: List[str]
    data_provenance: str


# =====================================================================
# ALLOCATION & TRADE-OFF MODELS
# =====================================================================

class BusMove(BaseModel):
    bus_id: str
    source_stop_id: str
    destination_stop_id: str
    departure_time: str
    estimated_arrival_time: str
    target_peak_interval: str
    destination_need_reason: str
    estimated_destination_benefit: int
    source_service_before: int
    source_service_after: int
    source_service_impact_description: str
    delayed_or_unserved_passengers_at_source: int
    constraints_passed: List[str]
    assumptions: List[str]
    status: Literal["RECOMMENDED", "REJECTED"] = "RECOMMENDED"


class RejectedCandidate(BaseModel):
    candidate_id: str
    bus_id: str
    source_stop_id: str
    destination_stop_id: str
    reason_rejected: str
    constraint_violated: str


class FleetAudit(BaseModel):
    initial_fleet_count: int
    final_fleet_count: int
    inventory_conserved: bool
    duplicate_buses_detected: bool
    invented_buses_detected: bool
    missing_buses_detected: bool
    details: str


class AllocateRequest(BaseModel):
    scenario: Optional[ScenarioData] = None
    forecast: Optional[ForecastResponse] = None
    max_moves: Optional[int] = Field(default=10, ge=1)


class AllocateResponse(BaseModel):
    scenario_id: str
    disclaimer: str = "SYNTHETIC DEMO ESTIMATE ONLY - Fixed Fleet Heuristic Allocation"
    status: Literal["SUCCESS", "NO_SAFE_MOVE"]
    summary: str
    recommended_moves: List[BusMove]
    rejected_moves: List[RejectedCandidate]
    fleet_audit: FleetAudit


# =====================================================================
# SIMULATION MODELS
# =====================================================================

class StopSimulationSummary(BaseModel):
    stop_id: str
    stop_name: str
    total_arrivals: int
    total_boarded: int
    peak_queue: int
    unmet_demand: int
    average_waiting_time_minutes: float
    service_loss_summary: str


class IntervalSnapshot(BaseModel):
    interval: str
    stop_id: str
    arrivals: int
    waiting_queue_start: int
    boarded: int
    waiting_queue_end: int
    active_buses: int
    buses_in_transit: int


class SimulationRunResult(BaseModel):
    run_type: Literal["BASELINE_SCHEDULE", "PROPOSED_ALLOCATION"]
    total_passengers_arrived: int
    total_passengers_boarded: int
    system_unmet_demand: int
    system_peak_queue: int
    bus_utilization_rate: float
    stop_metrics: Dict[str, StopSimulationSummary]
    interval_snapshots: List[IntervalSnapshot]


class SimulateRequest(BaseModel):
    scenario: Optional[ScenarioData] = None
    moves_override: Optional[List[BusMove]] = None


class SimulateResponse(BaseModel):
    scenario_id: str
    disclaimer: str = "SYNTHETIC DEMO ESTIMATE ONLY - Deterministic Simulation"
    initial_fleet_count: int
    baseline_simulation: SimulationRunResult
    proposed_simulation: SimulationRunResult
    net_comparison: Dict[str, Any]
    fleet_audit: FleetAudit
