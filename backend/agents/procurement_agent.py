"""
Procurement Agent: scores diesel fleet vehicles on EV-transition readiness,
matches each to the best-fit OEM model, and computes ROI/savings.
"""
import os
import pandas as pd
from backend.config import DATA_DIR

DIESEL_EMISSION_FACTOR_KG_PER_L = 2.68  # kg CO2 per liter diesel (standard combustion factor)
GRID_EMISSION_FACTOR_KG_PER_KWH = 0.716  # India national grid avg, CEA baseline (approx)
ELECTRICITY_COST_INR_PER_KWH = 8.0
CHARGER_KW = 15.0  # assumed depot AC charger power


def _load():
    fleet = pd.read_csv(os.path.join(DATA_DIR, "fleet_vehicles.csv"))
    oem = pd.read_csv(os.path.join(DATA_DIR, "oem_catalog.csv"))
    return fleet, oem


def _range_fit_score(daily_km, ev_range_km):
    # need headroom: usable range should exceed daily distance with margin
    usable_range = ev_range_km * 0.85
    if usable_range >= daily_km * 1.3:
        return 100
    if usable_range >= daily_km:
        return 70 + 30 * (usable_range - daily_km) / (daily_km * 0.3 + 1e-6)
    return max(0, 70 * usable_range / (daily_km + 1e-6))


def _payload_fit_score(payload_ton, ev_capacity_ton):
    if ev_capacity_ton >= payload_ton:
        excess = (ev_capacity_ton - payload_ton) / (ev_capacity_ton + 1e-6)
        return 100 if excess < 0.5 else max(60, 100 - (excess - 0.5) * 80)
    return max(0, 100 * ev_capacity_ton / (payload_ton + 1e-6))


def _charging_fit_score(dwell_hours, battery_kwh, charger_kw=CHARGER_KW):
    charge_time_needed = battery_kwh / charger_kw
    if dwell_hours >= charge_time_needed * 1.2:
        return 100
    if dwell_hours >= charge_time_needed:
        return 60 + 40 * (dwell_hours - charge_time_needed) / (charge_time_needed * 0.2 + 1e-6)
    return max(0, 60 * dwell_hours / (charge_time_needed + 1e-6))


def _duty_intensity_bonus(duty_hours, idle_pct):
    # higher utilization + lower idle -> more diesel cost being burned -> higher payback urgency
    return min(100, duty_hours * 4 + (100 - idle_pct) * 0.3)


def score_vehicle(vehicle_row, oem_row):
    range_score = _range_fit_score(vehicle_row.daily_distance_km, oem_row.range_km)
    payload_score = _payload_fit_score(vehicle_row.payload_ton, oem_row.payload_capacity_ton)
    charging_score = _charging_fit_score(vehicle_row.dwell_time_hours, oem_row.battery_kwh)
    duty_score = _duty_intensity_bonus(vehicle_row.duty_hours_per_day, vehicle_row.idle_time_pct)

    weighted = (
        range_score * 0.35
        + payload_score * 0.25
        + charging_score * 0.25
        + duty_score * 0.15
    )
    return round(weighted, 1), {
        "range_fit": round(range_score, 1),
        "payload_fit": round(payload_score, 1),
        "charging_fit": round(charging_score, 1),
        "duty_intensity": round(duty_score, 1),
    }


def compute_savings(vehicle_row, oem_row):
    annual_km = vehicle_row.annual_km
    diesel_l = annual_km * vehicle_row.fuel_consumption_l_per_100km / 100
    diesel_cost = diesel_l * vehicle_row.fuel_cost_per_liter_inr

    kwh_per_km = oem_row.battery_kwh / oem_row.range_km
    annual_kwh = annual_km * kwh_per_km
    ev_energy_cost = annual_kwh * ELECTRICITY_COST_INR_PER_KWH

    annual_savings_inr = diesel_cost - ev_energy_cost
    capex_inr = oem_row.price_inr_lakh * 100000
    payback_years = capex_inr / annual_savings_inr if annual_savings_inr > 0 else float("inf")

    co2_diesel_kg = diesel_l * DIESEL_EMISSION_FACTOR_KG_PER_L
    co2_ev_kg = annual_kwh * GRID_EMISSION_FACTOR_KG_PER_KWH
    co2_saved_kg = co2_diesel_kg - co2_ev_kg

    return {
        "annual_diesel_cost_inr": round(diesel_cost),
        "annual_ev_energy_cost_inr": round(ev_energy_cost),
        "annual_savings_inr": round(annual_savings_inr),
        "payback_years": round(payback_years, 1) if payback_years != float("inf") else None,
        "co2_saved_kg_per_year": round(co2_saved_kg),
    }


def analyze_fleet():
    """Score every diesel vehicle against every eligible OEM model in its segment,
    return best match + readiness score + savings for each vehicle."""
    fleet, oem = _load()
    diesel_fleet = fleet[~fleet.is_electrified].copy()

    results = []
    for _, veh in diesel_fleet.iterrows():
        candidates = oem[oem.segment == veh.vehicle_type]
        if candidates.empty:
            continue
        best_score, best_breakdown, best_oem, best_savings = -1, None, None, None
        for _, oem_row in candidates.iterrows():
            score, breakdown = score_vehicle(veh, oem_row)
            if score > best_score:
                best_score, best_breakdown, best_oem = score, breakdown, oem_row
                best_savings = compute_savings(veh, oem_row)

        results.append({
            "vehicle_id": veh.vehicle_id,
            "vehicle_type": veh.vehicle_type,
            "depot_city": veh.depot_city,
            "daily_distance_km": veh.daily_distance_km,
            "payload_ton": veh.payload_ton,
            "transition_readiness_score": best_score,
            "score_breakdown": best_breakdown,
            "recommended_oem_model": best_oem.oem_model,
            "delivery_lead_time_days": int(best_oem.delivery_lead_time_days),
            **best_savings,
        })

    df = pd.DataFrame(results).sort_values("transition_readiness_score", ascending=False)
    return df


def procurement_plan(df=None, phase_size=20):
    """Phase the rollout: Phase 1 = highest readiness, Phase 2 = next tier, etc."""
    if df is None:
        df = analyze_fleet()
    df = df.reset_index(drop=True)
    phases = []
    for i in range(0, len(df), phase_size):
        chunk = df.iloc[i:i + phase_size]
        phases.append({
            "phase": len(phases) + 1,
            "vehicle_count": len(chunk),
            "vehicle_ids": chunk.vehicle_id.tolist(),
            "avg_readiness_score": round(chunk.transition_readiness_score.mean(), 1),
            "total_annual_savings_inr": int(chunk.annual_savings_inr.sum()),
            "total_co2_saved_kg_per_year": int(chunk.co2_saved_kg_per_year.sum()),
            "total_capex_estimate_inr": None,
        })
    return phases


if __name__ == "__main__":
    result = analyze_fleet()
    print(result.head(10).to_string())
    print("\nTop candidate breakdown:", result.iloc[0].score_breakdown)
