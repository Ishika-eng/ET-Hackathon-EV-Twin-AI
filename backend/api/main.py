"""FastAPI backend exposing the 3 agents + orchestrator chat as a REST API."""
import io
import json
import os

import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from backend.config import DATA_DIR
from backend.agents import procurement_agent, fleet_health_agent, supply_chain_agent, carbon_intelligence, orchestrator

app = FastAPI(title="EV Twin AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def ensure_data_exists():
    """The synthetic datasets are gitignored (regenerable, not source of
    truth) -- generate them on first boot if a fresh deploy doesn't have
    them yet, so the platform doesn't depend on a separate build step."""
    if not os.path.exists(os.path.join(DATA_DIR, "fleet_vehicles.csv")):
        from backend.data.generate_data import main as generate_data
        generate_data()


def df_records(df):
    """Convert a DataFrame to JSON-safe records. pandas.to_json emits `null`
    for NaN (unlike .to_dict(), which leaves NaN floats that Starlette's
    stricter JSON encoder rejects outright)."""
    return json.loads(df.to_json(orient="records"))


@app.get("/api/procurement/fleet")
def get_procurement_fleet():
    df = procurement_agent.analyze_fleet()
    return df_records(df)


@app.get("/api/procurement/plan")
def get_procurement_plan(phase_size: int = 20):
    return procurement_agent.procurement_plan(phase_size=phase_size)


TEMPLATE_COLUMN_ORDER = [
    "vehicle_id", "vehicle_type", "daily_distance_km", "payload_ton",
    "duty_hours_per_day", "dwell_time_hours", "fuel_consumption_l_per_100km", "annual_km",
    "fuel_cost_per_liter_inr", "idle_time_pct", "depot_city",
]


@app.get("/api/procurement/template", response_class=PlainTextResponse)
def get_fleet_csv_template():
    """A downloadable CSV template so a real fleet operator knows the exact
    schema to prepare -- required columns plus commented guidance on the
    optional ones and their defaults."""
    assert set(TEMPLATE_COLUMN_ORDER) == procurement_agent.REQUIRED_FLEET_COLUMNS | (
        procurement_agent.OPTIONAL_FLEET_DEFAULTS.keys() - {"is_electrified"}
    ), "TEMPLATE_COLUMN_ORDER drifted out of sync with procurement_agent's schema"

    # kept strictly valid CSV (no comment lines) so downloading the template,
    # filling it in, and re-uploading it round-trips cleanly -- allowed
    # vehicle_type values are documented in the frontend upload form instead
    example_rows = [
        ["V001", "Last-mile Delivery Van", "85", "1.2", "9", "5", "14", "9600", "92.5", "18", "Pune"],
        ["V002", "Freight Truck", "220", "6.5", "10", "6", "32", "24000", "92.5", "12", "Chennai"],
    ]
    lines = [",".join(TEMPLATE_COLUMN_ORDER)] + [",".join(row) for row in example_rows]
    return "\n".join(lines) + "\n"


@app.get("/api/procurement/known-segments")
def get_known_segments():
    return {"segments": procurement_agent.KNOWN_SEGMENTS}


@app.post("/api/procurement/upload")
async def upload_fleet(
    file: UploadFile = File(...),
    electricity_cost_inr_per_kwh: float = Form(None),
    grid_emission_factor_kg_per_kwh: float = Form(None),
    diesel_emission_factor_kg_per_l: float = Form(None),
    charger_kw: float = Form(None),
):
    """Analyze a user-uploaded fleet CSV instead of the bundled synthetic
    demo data -- this is what makes the platform usable on a real fleet."""
    raw = await file.read()
    try:
        uploaded_df = pd.read_csv(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")

    try:
        clean_df, schema_warnings = procurement_agent.validate_and_normalize_fleet(uploaded_df)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if clean_df.empty:
        raise HTTPException(status_code=400, detail="No valid rows remained after validation.")

    assumptions_override = {
        k: v for k, v in {
            "electricity_cost_inr_per_kwh": electricity_cost_inr_per_kwh,
            "grid_emission_factor_kg_per_kwh": grid_emission_factor_kg_per_kwh,
            "diesel_emission_factor_kg_per_l": diesel_emission_factor_kg_per_l,
            "charger_kw": charger_kw,
        }.items() if v is not None
    }

    df, meta = procurement_agent.analyze_fleet(fleet_df=clean_df, assumptions=assumptions_override, return_meta=True)
    return {
        "results": df_records(df),
        "warnings": schema_warnings,
        "skipped_vehicles": meta["skipped_vehicles"],
        "assumptions_used": meta["assumptions_used"],
        "vehicles_analyzed": len(df),
        "vehicles_submitted": len(uploaded_df),
    }


@app.get("/api/health/fleet")
def get_health_fleet():
    df = fleet_health_agent.analyze_fleet_health()
    return df_records(df)


@app.get("/api/health/validation")
def get_health_validation():
    return fleet_health_agent.validate_predictions()


@app.get("/api/supply-chain/suppliers")
def get_suppliers():
    df = supply_chain_agent.analyze_supply_chain()
    return df_records(df)


@app.get("/api/supply-chain/concentration")
def get_concentration():
    return df_records(supply_chain_agent.material_concentration_summary())


@app.get("/api/supply-chain/lead-time")
def get_lead_time():
    return supply_chain_agent.detection_lead_time_report()


@app.get("/api/carbon/summary")
def get_carbon_summary():
    return carbon_intelligence.carbon_summary()


@app.get("/api/carbon/top-impact")
def get_top_impact(n: int = 10):
    return df_records(carbon_intelligence.top_carbon_impact_vehicles(n=n))


class ChatRequest(BaseModel):
    message: str
    history: list = []


@app.post("/api/chat")
def chat(req: ChatRequest):
    try:
        reply = orchestrator.chat(req.message, history=req.history)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="The chat agent failed to respond -- please try rephrasing your question.")
    return {"reply": reply}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
