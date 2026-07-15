"""FastAPI backend exposing the 3 agents + orchestrator chat as a REST API."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.agents import procurement_agent, fleet_health_agent, supply_chain_agent, carbon_intelligence, orchestrator

app = FastAPI(title="EV Twin AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/procurement/fleet")
def get_procurement_fleet():
    df = procurement_agent.analyze_fleet()
    return df.to_dict(orient="records")


@app.get("/api/procurement/plan")
def get_procurement_plan(phase_size: int = 20):
    return procurement_agent.procurement_plan(phase_size=phase_size)


@app.get("/api/health/fleet")
def get_health_fleet():
    df = fleet_health_agent.analyze_fleet_health()
    return df.to_dict(orient="records")


@app.get("/api/health/validation")
def get_health_validation():
    return fleet_health_agent.validate_predictions()


@app.get("/api/supply-chain/suppliers")
def get_suppliers():
    df = supply_chain_agent.analyze_supply_chain()
    return df.to_dict(orient="records")


@app.get("/api/supply-chain/concentration")
def get_concentration():
    return supply_chain_agent.material_concentration_summary().to_dict(orient="records")


@app.get("/api/supply-chain/lead-time")
def get_lead_time():
    return supply_chain_agent.detection_lead_time_report()


@app.get("/api/carbon/summary")
def get_carbon_summary():
    return carbon_intelligence.carbon_summary()


@app.get("/api/carbon/top-impact")
def get_top_impact(n: int = 10):
    return carbon_intelligence.top_carbon_impact_vehicles(n=n).to_dict(orient="records")


class ChatRequest(BaseModel):
    message: str
    history: list = []


@app.post("/api/chat")
def chat(req: ChatRequest):
    try:
        reply = orchestrator.chat(req.message, history=req.history)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"reply": reply}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
