# EV Twin AI

AI digital twin platform for industrial EV fleets and their battery-material supply chains.
Built for the EY Hackathon (India industrial EV transition challenge).

## What it does

Three agents share one fleet data model, plus an orchestrator that reasons across all of them:

- **Procurement Agent** — scores diesel vehicles on EV-transition readiness, matches each to the
  best-fit OEM model, computes ROI/payback and CO2 savings, and produces a phased rollout plan.
- **Fleet Health Agent (APM)** — predicts battery SOH/Remaining Useful Life from telemetry, flags
  thermal anomalies, generates maintenance triggers and charging recommendations. Validates its
  predictions against observed telemetry (MAE/RMSE) rather than asserting accuracy blindly.
- **Supply Chain Risk Agent** — scores battery-material suppliers (lithium/cobalt/nickel/cells) on
  concentration, geopolitical, and quality risk; reports how much earlier a risk-score-based flag
  would have caught historical disruptions versus a traditional quarterly review.
- **Orchestrator Agent** — a Groq-powered chat agent with tool access into the three agents above,
  for cross-cutting questions like "why is vehicle V017 degrading faster than average?"

Carbon Intelligence (Net Zero/Scope 1/3 tracking) and the Digital Twin vehicle view are computed
directly from the above agents' outputs rather than being separate agents.

No ML model training is used — predictions come from physics-informed formulas and threshold
rules; the LLM (via Groq) handles reasoning/narration/chat only.

## Setup

```bash
python3.13 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and add your free Groq API key from https://console.groq.com/keys

python backend/data/generate_data.py   # generates the synthetic datasets
```

## Run

**Dashboard (main demo surface):**
```bash
source venv/bin/activate
streamlit run frontend/app.py
```

**API (optional, shows the platform's service layer for the architecture diagram):**
```bash
source venv/bin/activate
uvicorn backend.api.main:app --reload
# docs at http://localhost:8000/docs
```

## Project structure

```
backend/
  config.py                    # env/config
  data/
    generate_data.py           # synthetic fleet, telemetry, supplier data generator
    *.csv                      # generated datasets (run generate_data.py first)
  agents/
    procurement_agent.py       # readiness scoring, OEM matching, ROI
    fleet_health_agent.py      # SOH/RUL prediction, anomaly detection, validation
    supply_chain_agent.py      # supplier risk scoring, lead-time analysis
    carbon_intelligence.py     # Net Zero / Scope 1+3 aggregation
    orchestrator.py            # Groq chat agent with tool access
  api/
    main.py                    # FastAPI REST layer
frontend/
  app.py                       # Streamlit dashboard
```

## Demo narrative

1. **Fleet Overview** — see the diesel fleet's readiness score distribution.
2. **Procurement Plan** — phased rollout with savings/CO2 per phase.
3. **Battery Health** — switch to the already-electrified pilot fleet, see SOH/RUL predictions
   and their validated accuracy.
4. **Digital Twin** — click into any single vehicle, diesel or electric.
5. **Supply Chain Risk** — critical suppliers, concentration flags, detection lead-time metric.
6. **Carbon Intelligence** — Net Zero progress against the 2030 target.
7. **Ask the Fleet** — ask the orchestrator a cross-cutting question and watch it call multiple
   agents to answer with real numbers.
