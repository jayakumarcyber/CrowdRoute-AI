# CrowdRoute AI — Backend Service

**Festival Crowd Prediction and Fixed-Fleet Bus Optimization**  
**Hackathon:** SAKTHI HACKFEST'26 — Generative AI Domain  
**Status:** Phase 1 Backend MVP (Completed & Verified)

---

> [!WARNING]
> **DISCLAIMER: SYNTHETIC DEMO DATA ONLY**  
> All passenger demand numbers, egress curves, and bus arrival estimates are generated from synthetic demo models for planning and demonstration purposes. They must **NOT** be used for real-world passenger dispatch or life-critical transport operations.

---

## 1. Overview & Problem Context

On the closing night of a major temple festival, approximately **40,000 attendees** seek to depart a small town within a two-hour window (21:00 to 23:00). 

- **The Problem:** The Main Bus Stand (12 scheduled buses) rapidly experiences severe bottlenecks and crushing queues within 30 minutes. Meanwhile, 2 km away, a Peripheral Ring Stop has 4 buses waiting idle with almost no passengers.
- **The Core Constraint (Constraint 2):** **The fleet is strictly fixed.** The system cannot magically create new buses or deploy emergency vehicles. It may only redistribute existing buses and must explicitly account for which route or stop loses service as a result of every move.
- **The Guiding Insight:** Moving 1 bus to the right place at the right time is worth more than adding 10 buses too late.

CrowdRoute AI provides an explainable, deterministic rule-based demand forecasting and fixed-fleet optimization backend that respects operational safety constraints, provides transparent trade-offs, and quantifies donor-stop service impacts.

---

## 2. Architecture & Modules

```
backend/
├── app/
│   ├── __init__.py      # Package initialization
│   ├── models.py        # Pydantic schemas, strict data validations, and domain types
│   ├── forecast.py      # Rule-based demand estimation & Gaussian egress surge modeling
│   ├── allocator.py     # Constrained greedy fixed-fleet reallocation engine
│   ├── tradeoffs.py     # Operational constraint validator & source-service impact analyzer
│   ├── simulator.py     # Deterministic discrete interval queue and transit simulator
│   └── main.py          # FastAPI application & REST endpoints
├── data/
│   └── demo_scenario.json # Synthetic festival scenario (16 buses, 3 stops, travel matrix)
├── tests/
│   ├── __init__.py
│   ├── test_all.py      # Comprehensive 12-rule Pytest test suite
│   └── test_api.py      # FastAPI HTTP endpoint tests
├── requirements.txt     # Python dependencies
└── README.md            # Backend documentation
```

---

## 3. Operational Constraints Enforced

Every proposed bus relocation must pass all hard constraints:

1. **Strict Fleet Conservation:** No bus is ever added, duplicated, or removed. The inventory count before and after allocation is audited and guaranteed identical.
2. **Vehicle Operational Availability:** Only buses with `status == "available"` may be dispatched. Vehicles marked `maintenance` or `offline` are rejected.
3. **Route Compatibility:** The destination stop and route must be compatible with the bus's authorized operating envelope.
4. **Peak Arrival Window:** The vehicle must depart and complete road transit *before* the destination's peak demand interval begins. A bus arriving after the peak has started is rejected as ineffective.
5. **Minimum Source Service:** Relocating a bus must **never** reduce the active fleet at the donor stop below its configured `min_service_buses` safety baseline.
6. **Explicit Source-Service Impact:** Every recommendation calculates and exposes the exact service loss (initial buses, remaining buses, capacity drop, and unserved passengers at the source). If source impact cannot be calculated, the move is rejected.
7. **Net Positive Benefit:** The move is only recommended if the relieved bottleneck at the destination strictly exceeds any resulting deficit at the donor stop.

---

## 4. Setup & Running Instructions (Windows 11)

### Step 1: Open PowerShell in Project Root
```powershell
cd "d:\CrowdRoute AI"
```

### Step 2: Activate the Virtual Environment
```powershell
.\.venv\Scripts\Activate.ps1
```

### Step 3: Install Dependencies
```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

### Step 4: Run the Test Suite
```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -v
```

### Step 5: Start the FastAPI Development Server
```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive Swagger documentation is available at:  
👉 **http://127.0.0.1:8000/docs**

---

## 5. API Endpoints & Example Payloads

### `GET /health`
Returns service status, version, and domain metadata.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "CrowdRoute AI",
  "version": "1.0.0",
  "hackathon": "SAKTHI HACKFEST'26",
  "domain": "Generative AI Domain - Festival Transit Management",
  "mode": "SYNTHETIC DEMO PLANNING ENGINE",
  "disclaimer": "SYNTHETIC DEMO DATA ONLY. Not for real-world dispatch."
}
```

---

### `GET /api/scenario`
Returns the active synthetic demonstration scenario (stops, travel times, fleet inventory, festival schedule).

---

### `POST /api/forecast`
Generates explainable passenger demand forecasts across 15-minute intervals.

**Example Request:**
```json
{
  "scheduled_event_end_time_override": "21:30",
  "weather_condition_override": "clear",
  "attendance_override": 40000
}
```

**Example Response:**
```json
{
  "scenario_id": "SCN-SAKTHI-FEST-2026-01",
  "disclaimer": "SYNTHETIC DEMO DATA ONLY - Not real passenger measurements",
  "event_end_time": "21:30",
  "weather_condition": "clear",
  "intervals": [
    {
      "stop_id": "STOP_MAIN",
      "interval_index": 2,
      "start_time": "21:30",
      "end_time": "21:45",
      "low_estimate": 7326,
      "central_estimate": 8619,
      "high_estimate": 10343,
      "baseline_capacity": 360,
      "deficit_surplus": 8259,
      "risk_level": "CRITICAL",
      "provenance_note": "Synthetic rule-based estimate: 78.0% stop split, weight=0.3250 from egress curve centered at event end 21:30. Weather=clear (concentration=1.0)."
    }
  ],
  "stop_summaries": {
    "STOP_MAIN": {
      "stop_id": "STOP_MAIN",
      "total_demand": 26520,
      "peak_interval": "21:30-21:45",
      "peak_demand": 8619,
      "baseline_scheduled_capacity": 2880,
      "overall_risk": "CRITICAL"
    }
  },
  "assumptions": [
    "Synthetic demand distribution: Total attendance assumed 40,000 people.",
    "85% of attendees leave via municipal transit network.",
    "Event end time: 21:30; egress curve standard deviation: 24.0 minutes."
  ],
  "data_provenance": "Deterministic rule-based Gaussian egress model over synthetic scenario data."
}
```

---

### `POST /api/allocate`
Evaluates existing buses and generates constrained reallocation recommendations.

**Example Request:**
```json
{
  "max_moves": 5
}
```

**Example Response:**
```json
{
  "scenario_id": "SCN-SAKTHI-FEST-2026-01",
  "disclaimer": "SYNTHETIC DEMO ESTIMATE ONLY - Fixed Fleet Heuristic Allocation",
  "status": "SUCCESS",
  "summary": "Recommended 3 safe fixed-fleet reallocations relieving critical crowd bottlenecks while preserving source minimum service levels. Fleet inventory strictly conserved at 16 vehicles.",
  "recommended_moves": [
    {
      "bus_id": "BUS-P01",
      "source_stop_id": "STOP_PERIPHERAL",
      "destination_stop_id": "STOP_MAIN",
      "departure_time": "21:00",
      "estimated_arrival_time": "21:15",
      "target_peak_interval": "21:30-21:45",
      "destination_need_reason": "Destination stop 'Main Bus Stand (Central Terminal)' (STOP_MAIN) faces severe peak demand deficit of 8259 passengers during interval 21:30-21:45.",
      "estimated_destination_benefit": 60,
      "source_service_before": 4,
      "source_service_after": 3,
      "source_service_impact_description": "Source stop 'Peripheral Ring Stop (North Bypass)' (STOP_PERIPHERAL) loses 1 bus (Bus BUS-P01, capacity 60). Scheduled fleet decreases from 4 to 3 buses (capacity 240 -> 180). Minimum safety requirement of 1 bus(es) is satisfied.",
      "delayed_or_unserved_passengers_at_source": 0,
      "constraints_passed": [
        "HARD_CONSTRAINT_SOURCE_IMPACT_KNOWABILITY: Source impact fully quantified",
        "HARD_CONSTRAINT_DESTINATION_VALIDITY: Destination verified in network",
        "HARD_CONSTRAINT_BUS_AVAILABILITY: Vehicle status confirmed available",
        "HARD_CONSTRAINT_ROUTE_COMPATIBILITY: Route and stop authorized for vehicle",
        "HARD_CONSTRAINT_PEAK_ARRIVAL_WINDOW: Bus arrives at 21:15 ahead of peak 21:30-21:45",
        "HARD_CONSTRAINT_MINIMUM_SOURCE_SERVICE: Source retains 3 buses (min 1 required)",
        "HARD_CONSTRAINT_NET_BENEFIT_POSITIVE: Net gain of +60 passengers accommodated"
      ],
      "assumptions": [
        "Travel time: 15 mins (includes weather multiplier 1.00).",
        "Bus boards at maximum passenger rating of 60.",
        "Source passenger demand for period estimated at 884 passengers."
      ],
      "status": "RECOMMENDED"
    }
  ],
  "rejected_moves": [],
  "fleet_audit": {
    "initial_fleet_count": 16,
    "final_fleet_count": 16,
    "inventory_conserved": true,
    "duplicate_buses_detected": false,
    "invented_buses_detected": false,
    "missing_buses_detected": false,
    "details": "Initial fleet: 16 vehicles. Final fleet: 16 vehicles. Moved vehicles: 3. Inventory conservation: PASSED."
  }
}
```

---

### `POST /api/simulate`
Executes side-by-side discrete interval simulation comparing original fixed schedule vs proposed allocation under identical arrivals.

**Example Request:**
```json
{}
```

**Example Response:**
```json
{
  "scenario_id": "SCN-SAKTHI-FEST-2026-01",
  "disclaimer": "SYNTHETIC DEMO ESTIMATE ONLY - Deterministic Simulation",
  "initial_fleet_count": 16,
  "net_comparison": {
    "system_additional_passengers_boarded": 630,
    "system_unmet_demand_reduction": 630,
    "main_hub_peak_queue_reduction": 630,
    "source_stop_peak_queue_increase": 0,
    "fleet_conservation_verified": true,
    "relocated_buses_count": 3,
    "notes": "Simulated metrics are purely synthetic estimates based on model rules. No real-world precision or performance guarantees are implied."
  },
  "fleet_audit": {
    "initial_fleet_count": 16,
    "final_fleet_count": 16,
    "inventory_conserved": true,
    "duplicate_buses_detected": false,
    "invented_buses_detected": false,
    "missing_buses_detected": false,
    "details": "Initial fleet: 16 vehicles. Final fleet: 16 vehicles. Moved vehicles: 3. Inventory conservation: PASSED."
  }
}
```
