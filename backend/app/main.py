"""FastAPI Application for CrowdRoute AI.
Provides RESTful APIs for scenario retrieval, demand forecasting,
fixed-fleet constrained reallocation, and side-by-side schedule simulation.
"""

import logging
from typing import Any, Dict
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.models import (
    AllocateRequest,
    AllocateResponse,
    ForecastRequest,
    ForecastResponse,
    ScenarioData,
    SimulateRequest,
    SimulateResponse,
)
from backend.app.forecast import generate_demand_forecast, load_default_scenario
from backend.app.allocator import allocate_fixed_fleet
from backend.app.simulator import compare_schedules

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("crowdroute_ai")

app = FastAPI(
    title="CrowdRoute AI - Festival Crowd Prediction and Fixed-Fleet Bus Optimization",
    description=(
        "Backend API for SAKTHI HACKFEST'26. "
        "Provides explainable crowd demand estimation and fixed-fleet redistribution "
        "trade-off analysis under strict fleet conservation constraints.\n\n"
        "DISCLAIMER: All outputs are synthetic planning estimates and must NOT be used "
        "for real-world vehicle dispatch or passenger safety operations."
    ),
    version="1.0.0",
)

# Enable CORS for future dashboard integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
def health_check() -> Dict[str, Any]:
    """Returns service health status and hackathon domain metadata."""
    return {
        "status": "healthy",
        "service": "CrowdRoute AI",
        "version": "1.0.0",
        "hackathon": "SAKTHI HACKFEST'26",
        "domain": "Generative AI Domain - Festival Transit Management",
        "mode": "SYNTHETIC DEMO PLANNING ENGINE",
        "disclaimer": "SYNTHETIC DEMO DATA ONLY. Not for real-world dispatch.",
    }


@app.get("/api/scenario", response_model=ScenarioData, tags=["Scenario"])
def get_scenario() -> ScenarioData:
    """Returns the active synthetic demonstration scenario containing stops, travel matrix, and fleet."""
    try:
        scenario = load_default_scenario()
        return scenario
    except Exception as exc:
        logger.error(f"Error loading demo scenario: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load synthetic scenario: {str(exc)}",
        )


@app.post("/api/forecast", response_model=ForecastResponse, tags=["Forecasting"])
def post_forecast(request: ForecastRequest = ForecastRequest()) -> ForecastResponse:
    """Generates an explainable rule-based passenger demand forecast by stop and interval."""
    try:
        logger.info(f"Generating demand forecast with event end override: {request.scheduled_event_end_time_override}")
        response = generate_demand_forecast(request)
        return response
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
