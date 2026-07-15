"""EV Twin AI -- Streamlit dashboard. Imports agent modules directly (no
network hop) so the demo has one process to run and no CORS/port issues."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import pandas as pd
import plotly.express as px

from backend.agents import procurement_agent, fleet_health_agent, supply_chain_agent, carbon_intelligence, orchestrator
from backend.config import GROQ_API_KEY

st.set_page_config(page_title="EV Twin AI", layout="wide", page_icon="🔋")

st.title("🔋 EV Twin AI")
st.caption("AI Digital Twin Platform for Industrial EV Fleets & Manufacturing Supply Chains")

tabs = st.tabs([
    "🚛 Fleet Overview", "📋 Procurement Plan", "🔧 Battery Health",
    "🧬 Digital Twin", "⚠️ Supply Chain Risk", "🌍 Carbon Intelligence", "💬 Ask the Fleet"
])

# ---------------- Fleet Overview ----------------
with tabs[0]:
    st.subheader("Fleet Electrification Readiness")
    with st.spinner("Scoring fleet..."):
        proc_df = procurement_agent.analyze_fleet()

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Diesel Vehicles Analyzed", len(proc_df))
    c2.metric("Avg Readiness Score", f"{proc_df.transition_readiness_score.mean():.1f}")
    c3.metric("Total Potential Annual Savings", f"₹{proc_df.annual_savings_inr.sum()/1e7:.2f} Cr")
    c4.metric("Total CO2 Saved/yr", f"{proc_df.co2_saved_kg_per_year.sum()/1000:.0f} tons")

    fig = px.histogram(proc_df, x="transition_readiness_score", nbins=20,
                        title="Readiness Score Distribution", color_discrete_sequence=["#2E7D32"])
    st.plotly_chart(fig, use_container_width=True)

    fig2 = px.scatter(proc_df, x="daily_distance_km", y="transition_readiness_score",
                       color="vehicle_type", size="payload_ton", hover_data=["vehicle_id"],
                       title="Readiness vs. Daily Distance by Vehicle Type")
    st.plotly_chart(fig2, use_container_width=True)

    st.dataframe(proc_df.drop(columns=["score_breakdown"]), use_container_width=True)

# ---------------- Procurement Plan ----------------
with tabs[1]:
    st.subheader("Phased Procurement Rollout")
    phase_size = st.slider("Vehicles per phase", 5, 50, 20)
    plan = procurement_agent.procurement_plan(proc_df, phase_size=phase_size)

    for phase in plan:
        with st.expander(f"Phase {phase['phase']} — {phase['vehicle_count']} vehicles "
                          f"(avg score {phase['avg_readiness_score']})", expanded=(phase['phase'] == 1)):
            pc1, pc2 = st.columns(2)
            pc1.metric("Annual Savings", f"₹{phase['total_annual_savings_inr']/1e5:.1f} L")
            pc2.metric("CO2 Saved/yr", f"{phase['total_co2_saved_kg_per_year']/1000:.1f} tons")
            st.write("Vehicles:", ", ".join(phase["vehicle_ids"]))

# ---------------- Battery Health ----------------
with tabs[2]:
    st.subheader("Fleet Battery Health & Maintenance")
    with st.spinner("Analyzing telemetry..."):
        health_df = fleet_health_agent.analyze_fleet_health()
        validation = fleet_health_agent.validate_predictions()

    c1, c2, c3 = st.columns(3)
    c1.metric("EVs Monitored", len(health_df))
    c2.metric("Prediction Accuracy (MAE)", f"±{validation['overall_mae']}% SOH")
    c3.metric("Vehicles Needing Attention", int((health_df.estimated_rul_days.fillna(9999) < 180).sum()))

    st.caption(f"Model validated against {validation['n_observations']} observed telemetry readings "
               f"(RMSE {validation['overall_rmse']}%) — standing in for live BMS data until connected.")

    fig3 = px.bar(health_df.sort_values("current_soh_pct"), x="vehicle_id", y="current_soh_pct",
                  color="thermal_anomaly", title="Current SOH by Vehicle",
                  color_discrete_map={True: "#D32F2F", False: "#1976D2"})
    st.plotly_chart(fig3, use_container_width=True)

    st.markdown("**Maintenance Triggers**")
    triggers_df = health_df[["vehicle_id", "current_soh_pct", "estimated_rul_days", "maintenance_triggers"]]
    st.dataframe(triggers_df, use_container_width=True)

# ---------------- Digital Twin ----------------
with tabs[3]:
    st.subheader("Vehicle Digital Twin")
    all_vehicles = sorted(list(proc_df.vehicle_id) + list(health_df.vehicle_id))
    selected = st.selectbox("Select a vehicle", all_vehicles)

    is_ev = selected in health_df.vehicle_id.values
    if is_ev:
        row = health_df[health_df.vehicle_id == selected].iloc[0]
        st.success(f"{selected} — Electrified Vehicle")
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("SOH", f"{row.current_soh_pct}%")
        c2.metric("Cycle Count", int(row.cycle_count))
        c3.metric("Est. RUL", f"{row.estimated_rul_days} days" if pd.notna(row.estimated_rul_days) else "Stable")
        c4.metric("Thermal Anomaly", "Yes ⚠️" if row.thermal_anomaly else "No ✅")
        st.write("**Maintenance triggers:**", row.maintenance_triggers)
        st.write("**Charging recommendations:**", row.charging_recommendations)
    else:
        row = proc_df[proc_df.vehicle_id == selected].iloc[0]
        st.info(f"{selected} — Diesel Vehicle (Procurement Candidate)")
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Readiness Score", f"{row.transition_readiness_score}%")
        c2.metric("Recommended EV", row.recommended_oem_model)
        c3.metric("Payback Period", f"{row.payback_years} yrs" if row.payback_years else "N/A")
        c4.metric("CO2 Saved/yr", f"{row.co2_saved_kg_per_year/1000:.1f} tons")
        st.write("**Score breakdown:**", row.score_breakdown)

# ---------------- Supply Chain Risk ----------------
with tabs[4]:
    st.subheader("Battery Material Supply Chain Risk")
    with st.spinner("Analyzing suppliers..."):
        supply_df = supply_chain_agent.analyze_supply_chain()
        concentration_df = supply_chain_agent.material_concentration_summary(supply_df)
        lead_time = supply_chain_agent.detection_lead_time_report()

    c1, c2, c3 = st.columns(3)
    c1.metric("Suppliers Tracked", len(supply_df))
    c2.metric("Critical/High Risk", int((supply_df.risk_tier.isin(["Critical", "High"])).sum()))
    c3.metric("Avg Risk-Detection Lead Time", f"{lead_time['avg_lead_time_days_earlier']} days earlier")

    fig4 = px.scatter(supply_df, x="concentration_pct", y="risk_score", color="risk_tier",
                       size="volume_supplied_tons", hover_data=["supplier_id", "material", "country"],
                       title="Supplier Risk Landscape", color_discrete_map={
                           "Critical": "#B71C1C", "High": "#E64A19", "Medium": "#F9A825", "Low": "#388E3C"
                       })
    st.plotly_chart(fig4, use_container_width=True)

    st.markdown("**Material Concentration Flags**")
    st.dataframe(concentration_df, use_container_width=True)

    st.markdown("**Critical Suppliers**")
    st.dataframe(supply_df[supply_df.risk_tier == "Critical"], use_container_width=True)

# ---------------- Carbon Intelligence ----------------
with tabs[5]:
    st.subheader("Net Zero Progress & Carbon Intelligence")
    carbon = carbon_intelligence.carbon_summary(proc_df)
    top_impact = carbon_intelligence.top_carbon_impact_vehicles(proc_df)

    c1, c2, c3 = st.columns(3)
    c1.metric("Current Electrification", f"{carbon['current_electrification_pct']}%")
    c2.metric(f"2030 Target ({carbon['net_zero_target_pct']}%)", f"Gap: {carbon['gap_to_target_pct']}%")
    c3.metric("Potential Scope 1 Reduction", f"{carbon['potential_scope1_reduction_tons_per_year']} tons/yr")

    fig5 = px.bar(top_impact, x="vehicle_id", y="co2_saved_kg_per_year", color="vehicle_type",
                  title="Highest-Impact Next Electrification Priorities")
    st.plotly_chart(fig5, use_container_width=True)

# ---------------- Chat Assistant ----------------
with tabs[6]:
    st.subheader("💬 Ask the Fleet (Orchestrator Agent)")
    if not GROQ_API_KEY:
        st.warning("GROQ_API_KEY not set. Add it to your .env file to enable the chat assistant.")
    else:
        if "chat_history" not in st.session_state:
            st.session_state.chat_history = []

        for msg in st.session_state.chat_history:
            with st.chat_message(msg["role"]):
                st.write(msg["content"])

        if prompt := st.chat_input("e.g. Why is vehicle V017 degrading faster than average?"):
            st.session_state.chat_history.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.write(prompt)
            with st.chat_message("assistant"):
                with st.spinner("Thinking..."):
                    reply = orchestrator.chat(prompt, history=st.session_state.chat_history[:-1])
                st.write(reply)
            st.session_state.chat_history.append({"role": "assistant", "content": reply})
