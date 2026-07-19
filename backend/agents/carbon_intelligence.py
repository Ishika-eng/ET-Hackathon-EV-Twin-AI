"""
Carbon Intelligence: derived entirely from the Procurement Agent's per-vehicle
CO2-saved figures. Not a separate reasoning agent -- just aggregation against
a stated Net Zero target, using published emission factors so the numbers are
defensible (see procurement_agent.py for factor sources).
"""
from backend import state
from backend.agents.procurement_agent import analyze_fleet

NET_ZERO_TARGET_PCT = 30  # India's 2030 commercial EV penetration target
TARGET_YEAR = 2030


def carbon_summary(fleet_analysis=None, already_electrified_count=None, total_fleet_size=None):
    if fleet_analysis is None:
        fleet_analysis = analyze_fleet()

    # the demo fleet's 50-already-electrified / 200-total composition doesn't
    # apply to an uploaded fleet -- an uploaded CSV is entirely diesel
    # candidates with no separate "already electrified" tracking, so fall
    # back to the analyzed fleet's own size instead of the demo constants
    if already_electrified_count is None or total_fleet_size is None:
        if state.get_active_fleet() is not None:
            already_electrified_count = 0
            total_fleet_size = len(fleet_analysis)
        else:
            already_electrified_count = 50
            total_fleet_size = 200

    total_potential_co2_kg = fleet_analysis.co2_saved_kg_per_year.sum()
    current_electrified_pct = round(already_electrified_count / total_fleet_size * 100, 1) if total_fleet_size else 0.0

    # Scope 1 = direct fleet combustion emissions being eliminated
    # Scope 3 = upstream/value-chain emissions from fuel supply chain (approx 18% of combustion emissions, common estimation factor)
    scope1_reduction_kg = total_potential_co2_kg
    scope3_reduction_kg = total_potential_co2_kg * 0.18

    return {
        "current_electrification_pct": current_electrified_pct,
        "net_zero_target_pct": NET_ZERO_TARGET_PCT,
        "target_year": TARGET_YEAR,
        "gap_to_target_pct": round(max(0, NET_ZERO_TARGET_PCT - current_electrified_pct), 1),
        "potential_scope1_reduction_kg_per_year": round(scope1_reduction_kg),
        "potential_scope3_reduction_kg_per_year": round(scope3_reduction_kg),
        "potential_scope1_reduction_tons_per_year": round(scope1_reduction_kg / 1000, 1),
        "vehicles_pending_electrification": len(fleet_analysis),
    }


def top_carbon_impact_vehicles(fleet_analysis=None, n=10):
    """Highest CO2-saved-per-vehicle -- for 'highest-impact next electrification priorities'."""
    if fleet_analysis is None:
        fleet_analysis = analyze_fleet()
    return fleet_analysis.sort_values("co2_saved_kg_per_year", ascending=False).head(n)[
        ["vehicle_id", "vehicle_type", "depot_city", "co2_saved_kg_per_year", "transition_readiness_score"]
    ]


if __name__ == "__main__":
    print(carbon_summary())
    print(top_carbon_impact_vehicles().to_string())
