"""
Orchestrator Agent: a Groq-powered chat agent with tool access into the
Procurement, Fleet Health, and Supply Chain agents' data. Answers cross-cutting
questions (e.g. "why is vehicle V017 degrading faster?") by pulling structured
data from whichever agent(s) are relevant and reasoning over it -- it does not
compute predictions itself, only narrates/prioritizes what the other agents
already produced.
"""
import json
from groq import Groq

from backend.config import GROQ_API_KEY, GROQ_MODEL
from backend.agents import procurement_agent, fleet_health_agent, supply_chain_agent, carbon_intelligence

_client = None


def _get_client():
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not set. Add it to your .env file (see .env.example).")
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


# ---- Tool implementations (called by the LLM) ----

def tool_get_procurement_summary():
    df = procurement_agent.analyze_fleet()
    return {
        "vehicles_analyzed": len(df),
        "avg_readiness_score": round(df.transition_readiness_score.mean(), 1),
        "top_10": df.head(10)[["vehicle_id", "vehicle_type", "transition_readiness_score",
                                "recommended_oem_model", "annual_savings_inr", "payback_years"]].to_dict(orient="records"),
    }


def tool_get_vehicle_procurement_detail(vehicle_id: str):
    df = procurement_agent.analyze_fleet()
    row = df[df.vehicle_id == vehicle_id]
    if row.empty:
        return {"error": f"vehicle {vehicle_id} not found in diesel fleet (may already be electrified)"}
    return row.iloc[0].to_dict()


def tool_get_fleet_health_summary():
    df = fleet_health_agent.analyze_fleet_health()
    return {
        "vehicles_monitored": len(df),
        "at_risk_soon": df[df.estimated_rul_days.notna() & (df.estimated_rul_days < 180)][
            ["vehicle_id", "current_soh_pct", "estimated_rul_days", "maintenance_triggers"]
        ].to_dict(orient="records"),
        "thermal_anomalies": df[df.thermal_anomaly][["vehicle_id", "hot_events_count"]].to_dict(orient="records"),
    }


def tool_get_vehicle_health_detail(vehicle_id: str):
    df = fleet_health_agent.analyze_fleet_health()
    row = df[df.vehicle_id == vehicle_id]
    if row.empty:
        return {"error": f"vehicle {vehicle_id} not found in electrified fleet"}
    return row.iloc[0].to_dict()


def tool_get_supply_chain_summary():
    df = supply_chain_agent.analyze_supply_chain()
    concentration = supply_chain_agent.material_concentration_summary(df)
    lead_time = supply_chain_agent.detection_lead_time_report()
    return {
        "critical_suppliers": df[df.risk_tier == "Critical"][["supplier_id", "material", "country", "risk_score"]].to_dict(orient="records"),
        "material_concentration_flags": concentration[concentration.flag != "Diversified"].to_dict(orient="records"),
        "avg_risk_detection_lead_time_days": lead_time["avg_lead_time_days_earlier"],
    }


def tool_get_carbon_summary():
    return carbon_intelligence.carbon_summary()


TOOLS = [
    {"type": "function", "function": {
        "name": "get_procurement_summary",
        "description": "Get fleet-wide EV transition readiness scores and top procurement candidates.",
        "parameters": {"type": "object", "properties": {}},
    }},
    {"type": "function", "function": {
        "name": "get_vehicle_procurement_detail",
        "description": "Get detailed readiness score breakdown and OEM recommendation for one diesel vehicle.",
        "parameters": {"type": "object", "properties": {
            "vehicle_id": {"type": "string", "description": "e.g. V007"}
        }, "required": ["vehicle_id"]},
    }},
    {"type": "function", "function": {
        "name": "get_fleet_health_summary",
        "description": "Get fleet-wide battery health: vehicles at risk soon, thermal anomalies.",
        "parameters": {"type": "object", "properties": {}},
    }},
    {"type": "function", "function": {
        "name": "get_vehicle_health_detail",
        "description": "Get detailed battery health, SOH, RUL, thermal and charging data for one electrified vehicle.",
        "parameters": {"type": "object", "properties": {
            "vehicle_id": {"type": "string", "description": "e.g. V017"}
        }, "required": ["vehicle_id"]},
    }},
    {"type": "function", "function": {
        "name": "get_supply_chain_summary",
        "description": "Get critical/high-risk battery material suppliers and concentration risk flags.",
        "parameters": {"type": "object", "properties": {}},
    }},
    {"type": "function", "function": {
        "name": "get_carbon_summary",
        "description": "Get Net Zero progress, Scope 1/3 emission reduction potential.",
        "parameters": {"type": "object", "properties": {}},
    }},
]

_TOOL_IMPL = {
    "get_procurement_summary": lambda **kw: tool_get_procurement_summary(),
    "get_vehicle_procurement_detail": lambda **kw: tool_get_vehicle_procurement_detail(**kw),
    "get_fleet_health_summary": lambda **kw: tool_get_fleet_health_summary(),
    "get_vehicle_health_detail": lambda **kw: tool_get_vehicle_health_detail(**kw),
    "get_supply_chain_summary": lambda **kw: tool_get_supply_chain_summary(),
    "get_carbon_summary": lambda **kw: tool_get_carbon_summary(),
}

SYSTEM_PROMPT = """You are the orchestrator agent for EV Twin AI, an industrial EV fleet
intelligence platform. You have tool access to three specialist agents: Procurement
(fleet electrification readiness & OEM matching), Fleet Health (battery SOH/RUL/
maintenance), and Supply Chain Risk (battery material supplier risk). Use the tools
to fetch real data before answering -- never guess numbers. When a question spans
multiple domains (e.g. prioritization questions), call multiple tools and synthesize
a single, concise, numbers-backed answer. Keep answers tight and operational, the way
a fleet manager would want them, not generic advice."""


def chat(user_message: str, history=None):
    client = _get_client()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    for _ in range(5):  # tool-call loop guard
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.3,
        )
        msg = response.choices[0].message

        if not msg.tool_calls:
            return msg.content

        messages.append({"role": "assistant", "content": msg.content, "tool_calls": [
            tc.model_dump() for tc in msg.tool_calls
        ]})

        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments or "{}")
            try:
                result = _TOOL_IMPL[tc.function.name](**args)
            except Exception as e:
                result = {"error": str(e)}
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result, default=str),
            })

    return "I wasn't able to complete that request -- please try rephrasing."


if __name__ == "__main__":
    print(chat("Which vehicles should we prioritize for electrification next quarter, and are there any battery health risks I should know about?"))
