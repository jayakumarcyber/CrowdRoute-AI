"""Comprehensive Unit and Integration Tests for CrowdRoute AI.
Strictly verifies all 12 required test conditions:
1. Fleet count remains exactly unchanged.
2. No bus is duplicated or invented.
3. Unavailable buses cannot be moved.
4. Incompatible routes are rejected.
5. A bus arriving after the peak is not recommended for that peak.
6. Every proposed move has an explicit source-service impact.
7. A move that violates minimum source service is rejected.
8. Missing source-service information prevents an unsafe recommendation.
9. No feasible move returns "No safe move".
10. Invalid IDs, negative capacities, and invalid inputs are rejected.
11. Delaying the final event shifts the synthetic demand peak according to the configured forecast rules.
12. Baseline and proposed simulations use the same initial fleet and demand assumptions.
"""

import copy
import pytest
from pydantic import ValidationError

from backend.app.models import (
    AllocateRequest,
    Bus,
    BusMove,
    ForecastRequest,
    ScenarioData,
    SimulateRequest,
    Stop,
)
from backend.app.forecast import (
    generate_demand_forecast,
    load_default_scenario,
    parse_time_to_minutes,
)
from backend.app.allocator import allocate_fixed_fleet, audit_fleet_conservation
from backend.app.tradeoffs import evaluate_candidate_move
from backend.app.simulator import compare_schedules, run_discrete_simulation


# =====================================================================
# FIXTURES
# =====================================================================

@pytest.fixture
def default_scenario() -> ScenarioData:
    """Returns a fresh deep copy of the default scenario."""
    return load_default_scenario()


# =====================================================================
# TEST 1: Fleet count remains exactly unchanged
# =====================================================================

def test_1_fleet_count_remains_exactly_unchanged(default_scenario):
    """Verifies that the fleet size before and after allocation and simulation is identical."""
    initial_count = len(default_scenario.fleet)
    assert initial_count == 16, "Default scenario should configure 16 buses"

    alloc_res = allocate_fixed_fleet(AllocateRequest(scenario=default_scenario))
    assert alloc_res.fleet_audit.initial_fleet_count == initial_count
    assert alloc_res.fleet_audit.final_fleet_count == initial_count
    assert alloc_res.fleet_audit.inventory_conserved is True

    sim_res = compare_schedules(SimulateRequest(scenario=default_scenario))
    assert sim_res.initial_fleet_count == initial_count
    assert sim_res.fleet_audit.initial_fleet_count == initial_count
    assert sim_res.fleet_audit.final_fleet_count == initial_count
    assert sim_res.fleet_audit.inventory_conserved is True


# =====================================================================
# TEST 2: No bus is duplicated or invented
# =====================================================================

def test_2_no_bus_duplicated_or_invented(default_scenario):
    """Verifies that only existing buses are moved and no duplicate assignments occur."""
    original_bus_ids = {b.bus_id for b in default_scenario.fleet}

    alloc_res = allocate_fixed_fleet(AllocateRequest(scenario=default_scenario))
    assert alloc_res.fleet_audit.duplicate_buses_detected is False
    assert alloc_res.fleet_audit.invented_buses_detected is False

    moved_ids = [m.bus_id for m in alloc_res.recommended_moves]
    # No bus invented: every moved bus must exist in initial fleet
    for b_id in moved_ids:
        assert b_id in original_bus_ids, f"Invented bus ID {b_id} detected!"

    # No bus duplicated in recommendation batch
    assert len(moved_ids) == len(set(moved_ids)), "Duplicate bus movement detected in recommendation batch!"


# =====================================================================
# TEST 3: Unavailable buses cannot be moved
# =====================================================================

def test_3_unavailable_buses_cannot_be_moved(default_scenario):
    """Verifies that vehicles marked maintenance/offline are rejected from reallocation."""
    # Mark all peripheral buses as maintenance
    scenario_modified = copy.deepcopy(default_scenario)
    for b in scenario_modified.fleet:
        if b.initial_stop_id == "STOP_PERIPHERAL":
            b.status = "maintenance"

    alloc_res = allocate_fixed_fleet(AllocateRequest(scenario=scenario_modified))
    # All candidate moves from peripheral must be rejected due to availability
    for move in alloc_res.recommended_moves:
        bus_obj = next(b for b in scenario_modified.fleet if b.bus_id == move.bus_id)
        assert bus_obj.status == "available"

    # Verify that maintenance buses appear in rejected candidates
    rejection_reasons = [r.constraint_violated for r in alloc_res.rejected_moves]
    assert "HARD_CONSTRAINT_BUS_AVAILABILITY" in rejection_reasons


# =====================================================================
# TEST 4: Incompatible routes are rejected
# =====================================================================

def test_4_incompatible_routes_are_rejected(default_scenario):
    """Verifies that buses without compatible destination authorization are rejected."""
    scenario_modified = copy.deepcopy(default_scenario)
    # Restrict peripheral buses so they are NOT compatible with STOP_MAIN
    for b in scenario_modified.fleet:
        if b.initial_stop_id == "STOP_PERIPHERAL":
            b.compatible_stops = ["STOP_PERIPHERAL"]  # Main Stand not permitted
            b.compatible_routes = ["ROUTE-LOCAL-ONLY"]

    alloc_res = allocate_fixed_fleet(AllocateRequest(scenario=scenario_modified))
    # No peripheral buses should be moved to STOP_MAIN
    for move in alloc_res.recommended_moves:
        assert move.destination_stop_id != "STOP_MAIN"

    rejection_reasons = [r.constraint_violated for r in alloc_res.rejected_moves]
    assert "HARD_CONSTRAINT_ROUTE_COMPATIBILITY" in rejection_reasons


# =====================================================================
# TEST 5: A bus arriving after the peak is not recommended for that peak
# =====================================================================

def test_5_bus_arriving_after_peak_rejected(default_scenario):
    """Verifies that transit delay causing arrival after peak start triggers rejection."""
    scenario_modified = copy.deepcopy(default_scenario)
    # Set transit time between peripheral and main to 120 minutes (2 hours)
    scenario_modified.travel_time_matrix_minutes["STOP_PERIPHERAL"]["STOP_MAIN"] = 120

    alloc_res = allocate_fixed_fleet(AllocateRequest(scenario=scenario_modified))
    # With 120m travel time from 21:00 departure, arrival is 23:00, way after 21:30 peak!
    rejection_reasons = [r.constraint_violated for r in alloc_res.rejected_moves]
    assert "HARD_CONSTRAINT_PEAK_ARRIVAL_WINDOW" in rejection_reasons

    # No move from peripheral to main should be recommended
    for move in alloc_res.recommended_moves:
        assert not (move.source_stop_id == "STOP_PERIPHERAL" and move.destination_stop_id == "STOP_MAIN")


# =====================================================================
# TEST 6: Every proposed move has an explicit source-service impact
# =====================================================================

def test_6_explicit_source_service_impact(default_scenario):
    """Verifies that each recommended move explicitly details the exact impact on the donor stop."""
    alloc_res = allocate_fixed_fleet(AllocateRequest(scenario=default_scenario))
    assert len(alloc_res.recommended_moves) > 0, "Default scenario should generate safe reallocations"

    for move in alloc_res.recommended_moves:
        assert move.source_service_before > 0
        assert move.source_service_after >= 0
        assert move.source_service_before > move.source_service_after
        assert move.source_service_impact_description is not None
        assert len(move.source_service_impact_description.strip()) > 20
        # Check that source stop ID or name is explicitly mentioned in the description
        assert (move.source_stop_id in move.source_service_impact_description or
                "Source stop" in move.source_service_impact_description)
        assert move.delayed_or_unserved_passengers_at_source >= 0


# =====================================================================
# TEST 7: A move that violates minimum source service is rejected
# =====================================================================

def test_7_violating_minimum_source_service_rejected(default_scenario):
    """Verifies that moving a bus below min_service_buses is strictly prevented."""
    scenario_modified = copy.deepcopy(default_scenario)
    # Peripheral stop has 4 buses; set min_service_buses = 4 so none can be spared
    for s in scenario_modified.stops:
        if s.stop_id == "STOP_PERIPHERAL":
            s.min_service_buses = 4

    alloc_res = allocate_fixed_fleet(AllocateRequest(scenario=scenario_modified))
    rejection_reasons = [r.constraint_violated for r in alloc_res.rejected_moves]
    assert "HARD_CONSTRAINT_MINIMUM_SOURCE_SERVICE" in rejection_reasons

    for move in alloc_res.recommended_moves:
        assert move.source_stop_id != "STOP_PERIPHERAL"


# =====================================================================
# TEST 8: Missing source-service info prevents an unsafe recommendation
# =====================================================================

def test_8_missing_source_service_prevents_unsafe_recommendation(default_scenario):
    """Verifies that evaluate_candidate_move rejects candidates with unknown source stop info."""
    bus = default_scenario.fleet[0]
    move, rejection = evaluate_candidate_move(
        scenario=default_scenario,
        bus=bus,
        source_stop_id="STOP_UNKNOWN_UNREGISTERED",
        destination_stop_id="STOP_MAIN",
        departure_time_str="21:00",
        destination_peak_interval="21:30-21:45",
        destination_deficit=1000,
        current_source_buses_count=4,
        source_demand_est=100,
    )

    assert move is None
    assert rejection is not None
    assert rejection.constraint_violated == "HARD_CONSTRAINT_SOURCE_IMPACT_KNOWABILITY"


# =====================================================================
# TEST 9: No feasible move returns "No safe move"
# =====================================================================

def test_9_no_feasible_move_returns_no_safe_move(default_scenario):
    """Verifies that when all candidates violate constraints, system returns 'No safe move'."""
    scenario_modified = copy.deepcopy(default_scenario)
    # Lock down peripheral stop completely: all buses in maintenance
    for b in scenario_modified.fleet:
        if b.initial_stop_id == "STOP_PERIPHERAL":
            b.status = "maintenance"

    alloc_res = allocate_fixed_fleet(AllocateRequest(scenario=scenario_modified))
    assert alloc_res.status == "NO_SAFE_MOVE"
    assert len(alloc_res.recommended_moves) == 0
    assert "No safe move" in alloc_res.summary


# =====================================================================
# TEST 10: Invalid IDs, negative capacities, and invalid inputs are rejected
# =====================================================================

def test_10_invalid_inputs_rejected():
    """Verifies that Pydantic models strictly reject negative capacities, empty IDs, and invalid inputs."""
    # Negative bus capacity
    with pytest.raises(ValidationError):
        Bus(
            bus_id="BUS-TEST",
            initial_stop_id="STOP_MAIN",
            capacity=-50,
            status="available"
        )

    # Zero bus capacity
    with pytest.raises(ValidationError):
        Bus(
            bus_id="BUS-TEST",
            initial_stop_id="STOP_MAIN",
            capacity=0,
            status="available"
        )

    # Empty bus_id
    with pytest.raises(ValidationError):
        Bus(
            bus_id="   ",
            initial_stop_id="STOP_MAIN",
            capacity=60,
            status="available"
        )

    # Negative min_service_buses
    with pytest.raises(ValidationError):
        Stop(
            stop_id="STOP-TEST",
            name="Test Stop",
            min_service_buses=-1,
            baseline_scheduled_buses=5
        )

    # Duplicate bus IDs in ScenarioData
    valid_scenario = load_default_scenario()
    duplicate_fleet = list(valid_scenario.fleet)
    # Append duplicate bus
    duplicate_fleet.append(valid_scenario.fleet[0])
    scenario_dict = valid_scenario.model_dump()
    scenario_dict["fleet"].append(scenario_dict["fleet"][0])
    with pytest.raises(ValidationError):
        ScenarioData.model_validate(scenario_dict)


# =====================================================================
# TEST 11: Delaying final event shifts demand peak according to rules
# =====================================================================

def test_11_delaying_event_shifts_demand_peak():
    """Verifies that delaying the final event shifts the synthetic demand peak dynamically."""
    # Run 1: Event ends at 21:30
    fc_standard = generate_demand_forecast(
        ForecastRequest(scheduled_event_end_time_override="21:30")
    )
    main_summary_standard = fc_standard.stop_summaries["STOP_MAIN"]
    peak_standard = main_summary_standard.peak_interval

    # Run 2: Event ends at 22:00 (delayed by 30 mins)
    fc_delayed = generate_demand_forecast(
        ForecastRequest(scheduled_event_end_time_override="22:00")
    )
    main_summary_delayed = fc_delayed.stop_summaries["STOP_MAIN"]
    peak_delayed = main_summary_delayed.peak_interval

    assert peak_standard == "21:30-21:45"
    assert peak_delayed == "22:00-22:15"

    peak_std_start = parse_time_to_minutes(peak_standard.split("-")[0])
    peak_del_start = parse_time_to_minutes(peak_delayed.split("-")[0])
    assert peak_del_start > peak_std_start, "Delaying event must shift peak interval later in time"


# =====================================================================
# TEST 12: Baseline and proposed simulations use identical initial fleet & demand
# =====================================================================

def test_12_simulation_identical_initial_fleet_and_demand(default_scenario):
    """Verifies that comparative simulation holds starting conditions and arrivals strictly constant."""
    sim_res = compare_schedules(SimulateRequest(scenario=default_scenario))

    base_sim = sim_res.baseline_simulation
    prop_sim = sim_res.proposed_simulation

    # Identical total arrivals across the network
    assert base_sim.total_passengers_arrived == prop_sim.total_passengers_arrived
    assert base_sim.total_passengers_arrived > 0

    # Identical arrivals at each stop individually
    for stop_id in default_scenario.stops:
        s_id = stop_id.stop_id
        assert base_sim.stop_metrics[s_id].total_arrivals == prop_sim.stop_metrics[s_id].total_arrivals

    # Identical initial fleet count
    assert sim_res.initial_fleet_count == len(default_scenario.fleet)
    assert sim_res.fleet_audit.inventory_conserved is True

    # Same number of interval snapshots evaluated
    assert len(base_sim.interval_snapshots) == len(prop_sim.interval_snapshots)
