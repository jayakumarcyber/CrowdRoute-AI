"""FastAPI Application for CrowdRoute AI.
Provides RESTful APIs for scenario retrieval, demand forecasting,
historical data ingestion, live status checks, fixed-fleet constrained reallocation,
side-by-side schedule simulation, and serves the interactive dashboard.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from backend.app.models import (
    AllocateRequest,
    AllocateResponse,
    ForecastRequest,
    ForecastResponse,
    HistoricalUploadResponse,
    LiveDataSummaryResponse,
    ScenarioData,
    SimulateRequest,
    SimulateResponse,
    UserDataValidationResult,
)
from backend.app.forecast import generate_demand_forecast, load_default_scenario
from backend.app.allocator import allocate_fixed_fleet
from backend.app.simulator import compare_schedules
from backend.app.historical import (
    generate_sample_historical_csv,
    parse_and_validate_historical_file,
)
from backend.app.live_data import get_live_data_summary

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("crowdroute_ai")

app = FastAPI(
    title="CrowdRoute AI - Dynamic Festival Crowd Prediction and Fixed-Fleet Bus Optimization",
    description=(
        "Backend API for SAKTHI HACKFEST'26. "
        "Provides dynamic crowd demand forecasting responding to user and historical data, "
        "and fixed-fleet redistribution trade-off analysis under strict fleet conservation constraints.\n\n"
        "DISCLAIMER: All outputs are planning estimates and must NOT be used "
        "for direct real-world vehicle dispatch or life-critical passenger safety operations."
    ),
    version="1.1.0",
)

# Enable CORS for dashboard integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
def health_check() -> Dict[str, Any]:
    """Returns service health status, supported modes, and domain metadata."""
    return {
        "status": "healthy",
        "service": "CrowdRoute AI",
        "version": "1.1.0",
        "hackathon": "SAKTHI HACKFEST'26",
        "domain": "Generative AI Domain - Festival Transit Management",
        "supported_modes": ["DEMO_SYNTHETIC", "USER_DATA"],
        "supported_data_sources": ["MANUAL_INPUT", "HISTORICAL_RECORDS", "LIVE_API", "SYNTHETIC_DEMO"],
        "disclaimer": "SYNTHETIC DEMO & PLANNING ENGINE ONLY. Never invent real-world physical measurements.",
    }


@app.get("/api/scenario", response_model=ScenarioData, tags=["Scenario"])
def get_scenario() -> ScenarioData:
    """Returns the baseline synthetic demonstration scenario (stops, travel matrix, fleet)."""
    try:
        scenario = load_default_scenario()
        return scenario
    except Exception as exc:
        logger.error(f"Error loading demo scenario: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load synthetic scenario: {str(exc)}",
        )


@app.post("/api/validate/scenario", response_model=UserDataValidationResult, tags=["Scenario"])
def validate_scenario(scenario: ScenarioData) -> UserDataValidationResult:
    """Validates user-defined scenario and checks field completeness for User Data Mode."""
    missing: List[str] = []
    errors: List[str] = []
    warnings: List[str] = []

    # Check attendance
    if scenario.festival_programme.expected_total_attendance <= 0:
        missing.append("expected_total_attendance (must be > 0 in user data mode)")

    # Check stops
    if not scenario.stops:
        missing.append("stops (at least one transit stop must be defined)")

    # Check fleet
    if not scenario.fleet:
        missing.append("fleet (at least one vehicle must be defined)")

    # Check demand distribution
    dist = scenario.festival_programme.demand_distribution
    if not dist:
        missing.append("demand_distribution (stop shares must be specified)")
    else:
        dist_sum = sum(dist.values())
        if abs(dist_sum - 1.0) > 0.05:
            warnings.append(f"Demand distribution shares sum to {dist_sum:.2f} instead of 1.00 (100%).")

    is_valid = len(missing) == 0 and len(errors) == 0

    return UserDataValidationResult(
        is_valid=is_valid,
        mode="USER_DATA",
        missing_fields=missing,
        validation_errors=errors,
        warnings=warnings,
        input_sources={
            "festival_programme": "USER_MANUAL",
            "stops": "USER_MANUAL",
            "fleet": "USER_MANUAL",
            "travel_matrix": "USER_MANUAL",
        },
    )


@app.post("/api/historical/upload", response_model=HistoricalUploadResponse, tags=["Historical Data"])
async def upload_historical_file(
    file: UploadFile = File(...),
    column_mapping: Optional[str] = Form(None),
) -> HistoricalUploadResponse:
    """Ingests and validates historical passenger boarding records from CSV or Excel (.xlsx)."""
    try:
        file_bytes = await file.read()
        custom_map = None
        if column_mapping:
            try:
                custom_map = json.loads(column_mapping)
            except Exception:
                pass

        result = parse_and_validate_historical_file(
            file_bytes=file_bytes,
            filename=file.filename or "uploaded_data.csv",
            custom_mapping=custom_map,
        )
        return result
    except Exception as exc:
        logger.error(f"Error parsing historical upload: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Historical file upload failed: {str(exc)}",
        )


@app.get("/api/historical/sample", tags=["Historical Data"])
def get_sample_historical_csv() -> PlainTextResponse:
    """Provides a verified sample CSV representing previous festival passenger boarding counts."""
    csv_text = generate_sample_historical_csv()
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="sample_festival_historical_data.csv"'},
    )


@app.get("/api/live/status", response_model=LiveDataSummaryResponse, tags=["Live Data"])
def get_live_status() -> LiveDataSummaryResponse:
    """Returns honest, uninvented status report for all external live feeds (weather, GTFS-RT)."""
    try:
        status_report = get_live_data_summary()
        return status_report
    except Exception as exc:
        logger.error(f"Error checking live status: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Live status check failed: {str(exc)}",
        )


@app.post("/api/forecast", response_model=ForecastResponse, tags=["Forecasting"])
def post_forecast(request: ForecastRequest = ForecastRequest()) -> ForecastResponse:
    """Generates dynamic demand forecast responding to user parameters or historical records."""
    try:
        logger.info(
            f"Generating demand forecast [Mode: {request.operational_mode}, "
            f"Historical records: {len(request.historical_records or [])}]"
        )
        response = generate_demand_forecast(request)
        return response
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error(f"Forecasting error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Forecasting failed: {str(exc)}",
        )


@app.post("/api/allocate", response_model=AllocateResponse, tags=["Optimization"])
def post_allocate(request: AllocateRequest = AllocateRequest()) -> AllocateResponse:
    """Evaluates candidate bus movements and returns safe reallocations under strict fleet conservation."""
    try:
        logger.info("Executing fixed-fleet allocation optimization")
        response = allocate_fixed_fleet(request)
        return response
    except Exception as exc:
        logger.error(f"Allocation error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Allocation failed: {str(exc)}",
        )


@app.post("/api/simulate", response_model=SimulateResponse, tags=["Simulation"])
def post_simulate(request: SimulateRequest = SimulateRequest()) -> SimulateResponse:
    """Runs a side-by-side discrete interval simulation comparing baseline vs proposed allocations."""
    try:
        logger.info("Running comparative discrete simulation")
        response = compare_schedules(request)
        return response
    except Exception as exc:
        logger.error(f"Simulation error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Simulation failed: {str(exc)}",
        )


# =====================================================================
# DASHBOARD STATIC FILES MOUNT
# =====================================================================

STATIC_DIR = Path(__file__).resolve().parent / "static"
if not STATIC_DIR.exists():
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", include_in_schema=False)
def serve_dashboard():
    """Serves the interactive CrowdRoute AI web dashboard."""
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return PlainTextResponse("CrowdRoute AI API is running. Dashboard is being initialized.")
