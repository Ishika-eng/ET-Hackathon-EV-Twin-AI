"""
Procurement Agent: scores diesel fleet vehicles on EV-transition readiness,
matches each to the best-fit OEM model, and computes ROI/savings.

Designed to run on either the bundled synthetic fleet or a user-uploaded
fleet CSV (see validate_and_normalize_fleet) -- and on region-specific
assumptions (electricity price, emission factors, charger power) instead of
hardcoded constants, since those vary by state and change over time.
"""
import os
import pandas as pd
from backend.config import DATA_DIR

DEFAULT_ASSUMPTIONS = {
    "diesel_emission_factor_kg_per_l": 2.68,   # kg CO2 per liter diesel (standard combustion factor)
    "grid_emission_factor_kg_per_kwh": 0.716,  # India national grid avg, CEA baseline (approx) -- varies by state
    "electricity_cost_inr_per_kwh": 8.0,       # varies by state/tariff slab/time-of-use
    "charger_kw": 15.0,                        # assumed depot AC charger power
}

# Columns a real fleet CSV must have -- everything else is optional and defaulted.
REQUIRED_FLEET_COLUMNS = {
    "vehicle_id", "vehicle_type", "daily_distance_km", "payload_ton",
    "duty_hours_per_day", "dwell_time_hours", "fuel_consumption_l_per_100km", "annual_km",
}
OPTIONAL_FLEET_DEFAULTS = {
    "fuel_cost_per_liter_inr": 92.5,  # national avg diesel price; override with local pump price
    "idle_time_pct": 15.0,
    "depot_city": "Unspecified",
    "is_electrified": False,
}

KNOWN_SEGMENTS = [
    "Intra-plant Tug", "Last-mile Delivery Van", "Freight Truck",
    "Mining Haul Vehicle", "Construction Equipment Carrier", "Forklift / Warehouse Vehicle",
]


def validate_and_normalize_fleet(df: pd.DataFrame):
    """Check an uploaded fleet CSV against the required schema, fill defaults
    for optional columns, and return (clean_df, warnings). Raises ValueError
    with a clear message if required columns are missing."""
    missing = REQUIRED_FLEET_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(
            f"Missing required column(s): {', '.join(sorted(missing))}. "
            f"Required columns: {', '.join(sorted(REQUIRED_FLEET_COLUMNS))}."
        )

    df = df.copy()
    warnings = []
    for col, default in OPTIONAL_FLEET_DEFAULTS.items():
        if col not in df.columns:
            df[col] = default
            warnings.append(f"Column '{col}' not provided -- defaulted to {default}.")

    numeric_cols = [
        "daily_distance_km", "payload_ton", "duty_hours_per_day", "dwell_time_hours",
        "fuel_consumption_l_per_100km", "annual_km", "fuel_cost_per_liter_inr", "idle_time_pct",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    bad_rows = df[df[numeric_cols].isna().any(axis=1)]
    if len(bad_rows):
        warnings.append(
            f"{len(bad_rows)} row(s) dropped due to missing/non-numeric values: "
            f"{', '.join(bad_rows.vehicle_id.astype(str).tolist()[:10])}"
            + (" ..." if len(bad_rows) > 10 else "")
        )
        df = df.drop(bad_rows.index)

    unknown_segments = sorted(set(df.vehicle_type) - set(KNOWN_SEGMENTS))
    if unknown_segments:
        warnings.append(
            f"Vehicle type(s) not in the OEM catalog (no match possible, will be skipped): "
            f"{', '.join(unknown_segments)}. Known types: {', '.join(KNOWN_SEGMENTS)}."
        )

    return df.reset_index(drop=True), warnings


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


def _charging_fit_score(dwell_hours, battery_kwh, charger_kw):
    charge_time_needed = battery_kwh / charger_kw
    if dwell_hours >= charge_time_needed * 1.2:
        return 100
    if dwell_hours >= charge_time_needed:
        return 60 + 40 * (dwell_hours - charge_time_needed) / (charge_time_needed * 0.2 + 1e-6)
    return max(0, 60 * dwell_hours / (charge_time_needed + 1e-6))


def _duty_intensity_bonus(duty_hours, idle_pct):
    # higher utilization + lower idle -> more diesel cost being burned -> higher payback urgency
    return min(100, duty_hours * 4 + (100 - idle_pct) * 0.3)


def _confidence_score(breakdown):
    """How much to trust this readiness score: high when every dimension
    agrees the vehicle is a good fit, low when one weak dimension (e.g. poor
    charging fit) is being masked by strong scores elsewhere -- that's exactly
    the situation where a procurement decision made on the headline score
    alone would be a mistake."""
    values = list(breakdown.values())
    avg = sum(values) / len(values)
    weakest = min(values)
    spread_penalty = (avg - weakest) * 0.6
    return round(max(30.0, 100.0 - spread_penalty), 1)


def score_vehicle(vehicle_row, oem_row, assumptions=DEFAULT_ASSUMPTIONS):
    range_score = _range_fit_score(vehicle_row.daily_distance_km, oem_row.range_km)
    payload_score = _payload_fit_score(vehicle_row.payload_ton, oem_row.payload_capacity_ton)
    charging_score = _charging_fit_score(vehicle_row.dwell_time_hours, oem_row.battery_kwh, assumptions["charger_kw"])
    duty_score = _duty_intensity_bonus(vehicle_row.duty_hours_per_day, vehicle_row.idle_time_pct)

    weighted = (
        range_score * 0.35
        + payload_score * 0.25
        + charging_score * 0.25
        + duty_score * 0.15
    )
    breakdown = {
        "range_fit": round(range_score, 1),
        "payload_fit": round(payload_score, 1),
        "charging_fit": round(charging_score, 1),
        "duty_intensity": round(duty_score, 1),
    }
    return round(weighted, 1), breakdown, _confidence_score(breakdown)


def compute_savings(vehicle_row, oem_row, assumptions=DEFAULT_ASSUMPTIONS):
    annual_km = vehicle_row.annual_km
    diesel_l = annual_km * vehicle_row.fuel_consumption_l_per_100km / 100
    diesel_cost = diesel_l * vehicle_row.fuel_cost_per_liter_inr

    kwh_per_km = oem_row.battery_kwh / oem_row.range_km
    annual_kwh = annual_km * kwh_per_km
    ev_energy_cost = annual_kwh * assumptions["electricity_cost_inr_per_kwh"]

    annual_savings_inr = diesel_cost - ev_energy_cost
    capex_inr = oem_row.price_inr_lakh * 100000
    payback_years = capex_inr / annual_savings_inr if annual_savings_inr > 0 else float("inf")

    co2_diesel_kg = diesel_l * assumptions["diesel_emission_factor_kg_per_l"]
    co2_ev_kg = annual_kwh * assumptions["grid_emission_factor_kg_per_kwh"]
    co2_saved_kg = co2_diesel_kg - co2_ev_kg

    return {
        "annual_diesel_cost_inr": round(diesel_cost),
        "annual_ev_energy_cost_inr": round(ev_energy_cost),
        "annual_savings_inr": round(annual_savings_inr),
        "payback_years": round(payback_years, 1) if payback_years != float("inf") else None,
        "co2_saved_kg_per_year": round(co2_saved_kg),
    }


def analyze_fleet(fleet_df=None, oem_df=None, assumptions=None, return_meta=False):
    """Score every diesel vehicle against every eligible OEM model in its segment,
    return best match + readiness score + savings for each vehicle.

    fleet_df/oem_df: pass a DataFrame to analyze a user-uploaded fleet instead
    of the bundled synthetic one (see validate_and_normalize_fleet).
    assumptions: override any of DEFAULT_ASSUMPTIONS (region-specific pricing/factors).
    return_meta: if True, returns (df, meta) where meta reports skipped vehicles --
    callers that already assume a bare DataFrame (existing agents/API routes)
    are unaffected since this defaults to False.
    """
    assumptions = {**DEFAULT_ASSUMPTIONS, **(assumptions or {})}
    if fleet_df is None:
        fleet, oem = _load()
    else:
        fleet = fleet_df
        oem = oem_df if oem_df is not None else _load()[1]
    diesel_fleet = fleet[~fleet.is_electrified].copy()

    results = []
    skipped = []
    for _, veh in diesel_fleet.iterrows():
        candidates = oem[oem.segment == veh.vehicle_type]
        if candidates.empty:
            skipped.append({"vehicle_id": veh.vehicle_id, "reason": f"no OEM catalog entry for vehicle_type '{veh.vehicle_type}'"})
            continue
        best_score, best_breakdown, best_oem, best_savings, best_confidence, best_rank = -1, None, None, None, None, None
        for _, oem_row in candidates.iterrows():
            score, breakdown, confidence = score_vehicle(veh, oem_row, assumptions)
            savings = compute_savings(veh, oem_row, assumptions)
            # operational fit drives the match, but within a 5-point band treat
            # scores as tied and prefer the OEM with the better payback --
            # otherwise a vehicle can get a top readiness score paired with a
            # decades-long payback, which reads as broken even though each
            # number is individually correct
            payback = savings["payback_years"]
            rank = (round(score / 5), -(payback if payback is not None else 1e9))
            if best_rank is None or rank > best_rank:
                best_score, best_breakdown, best_oem, best_savings, best_confidence, best_rank = (
                    score, breakdown, oem_row, savings, confidence, rank
                )

        results.append({
            "vehicle_id": veh.vehicle_id,
            "vehicle_type": veh.vehicle_type,
            "depot_city": veh.depot_city,
            "daily_distance_km": veh.daily_distance_km,
            "payload_ton": veh.payload_ton,
            "transition_readiness_score": best_score,
            "confidence_score": best_confidence,
            "score_breakdown": best_breakdown,
            "recommended_oem_model": best_oem.oem_model,
            "delivery_lead_time_days": int(best_oem.delivery_lead_time_days),
            **best_savings,
        })

    df = pd.DataFrame(results)
    if len(df):
        df = df.sort_values("transition_readiness_score", ascending=False)

    if return_meta:
        return df, {"skipped_vehicles": skipped, "assumptions_used": assumptions}
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
    print("\nTop candidate breakdown:", result.iloc[0].score_breakdown, "confidence:", result.iloc[0].confidence_score)
