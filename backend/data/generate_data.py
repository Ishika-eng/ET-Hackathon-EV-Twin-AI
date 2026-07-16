"""
Synthetic data generator for EV Twin AI.

Produces 5 CSVs into backend/data/:
  - fleet_vehicles.csv     : diesel + already-electrified vehicles, operational profile
  - battery_telemetry.csv  : daily telemetry time series for electrified vehicles
  - oem_catalog.csv        : available EV models for procurement matching
  - suppliers.csv          : multi-tier battery material supply chain
  - supply_events.csv      : historical supplier disruption/quality events (for lead-time validation)

Battery telemetry carries both a "true" underlying SOH trajectory (per-vehicle
random degradation coefficients, representing real-world variance a generic
model can't see) and a noisy "observed" SOH reading (what a BMS would actually
report). The Fleet Health Agent fits a generic formula and its predictions are
validated against the "observed" series — standing in for real fleet data
until the platform is connected to live BMS/telematics feeds.
"""
import numpy as np
import pandas as pd
import os
from datetime import datetime, timedelta

SEED = 42
rng = np.random.default_rng(SEED)

OUT_DIR = os.path.dirname(__file__)

VEHICLE_TYPES = [
    # type, count_weight, distance_range_km, payload_range_ton, duty_hours_range
    ("Intra-plant Tug", 0.20, (10, 40), (0.5, 2.0), (6, 10)),
    ("Last-mile Delivery Van", 0.25, (60, 140), (0.5, 2.5), (8, 12)),
    ("Freight Truck", 0.20, (100, 300), (3.0, 9.0), (8, 14)),
    ("Mining Haul Vehicle", 0.15, (30, 90), (10.0, 25.0), (10, 18)),
    ("Construction Equipment Carrier", 0.10, (20, 60), (5.0, 15.0), (6, 12)),
    ("Forklift / Warehouse Vehicle", 0.10, (5, 25), (0.5, 3.0), (8, 16)),
]

CITIES = [
    ("Pune", 18.5204, 73.8567), ("Chennai", 13.0827, 80.2707),
    ("Ahmedabad", 23.0225, 72.5714), ("Jamshedpur", 22.8046, 86.2029),
    ("Nagpur", 21.1458, 79.0882), ("Vadodara", 22.3072, 73.1812),
    ("Bengaluru", 12.9716, 77.5946), ("Kolkata", 22.5726, 88.3639),
]

N_VEHICLES = 200
N_ALREADY_EV = 50  # subset already electrified -> feeds Fleet Health Agent
TELEMETRY_DAYS = 180


def generate_fleet():
    rows = []
    type_choices = rng.choice(
        len(VEHICLE_TYPES), size=N_VEHICLES, p=[t[1] for t in VEHICLE_TYPES]
    )
    ev_flags = np.zeros(N_VEHICLES, dtype=bool)
    ev_flags[rng.choice(N_VEHICLES, size=N_ALREADY_EV, replace=False)] = True

    for i in range(N_VEHICLES):
        vtype, _, dist_r, payload_r, duty_r = VEHICLE_TYPES[type_choices[i]]
        city = CITIES[rng.integers(0, len(CITIES))]
        daily_distance = round(rng.uniform(*dist_r), 1)
        payload = round(rng.uniform(*payload_r), 2)
        duty_hours = round(rng.uniform(*duty_r), 1)
        dwell_time = round(rng.uniform(2, 12), 1)  # hours available at depot
        fuel_consumption = round(rng.uniform(12, 35), 1)  # L/100km diesel
        fuel_cost_per_l = 92.5  # INR, national avg diesel price
        annual_km = round(daily_distance * rng.uniform(300, 340))
        age_years = round(rng.uniform(0.5, 9), 1)
        idle_pct = round(rng.uniform(5, 35), 1)

        rows.append({
            "vehicle_id": f"V{i+1:03d}",
            "vehicle_type": vtype,
            "is_electrified": bool(ev_flags[i]),
            "depot_city": city[0],
            "depot_lat": city[1] + rng.uniform(-0.05, 0.05),
            "depot_lon": city[2] + rng.uniform(-0.05, 0.05),
            "daily_distance_km": daily_distance,
            "payload_ton": payload,
            "duty_hours_per_day": duty_hours,
            "dwell_time_hours": dwell_time,
            "fuel_consumption_l_per_100km": fuel_consumption,
            "fuel_cost_per_liter_inr": fuel_cost_per_l,
            "annual_km": annual_km,
            "age_years": age_years,
            "idle_time_pct": idle_pct,
        })
    return pd.DataFrame(rows)


def generate_oem_catalog():
    return pd.DataFrame([
        {"oem_model": "Tata Ace EV", "segment": "Last-mile Delivery Van", "range_km": 154, "payload_capacity_ton": 0.6, "price_inr_lakh": 9.5, "delivery_lead_time_days": 45, "battery_kwh": 21.3},
        {"oem_model": "Euler HiLoad EV", "segment": "Last-mile Delivery Van", "range_km": 200, "payload_capacity_ton": 1.5, "price_inr_lakh": 12.0, "delivery_lead_time_days": 60, "battery_kwh": 37.3},
        {"oem_model": "Mahindra Treo Zor", "segment": "Intra-plant Tug", "range_km": 80, "payload_capacity_ton": 0.55, "price_inr_lakh": 3.8, "delivery_lead_time_days": 30, "battery_kwh": 7.4},
        {"oem_model": "Ashok Leyland Circuit", "segment": "Freight Truck", "range_km": 200, "payload_capacity_ton": 9.0, "price_inr_lakh": 45.0, "delivery_lead_time_days": 120, "battery_kwh": 150.0},
        {"oem_model": "Switch EiV 12", "segment": "Freight Truck", "range_km": 180, "payload_capacity_ton": 8.0, "price_inr_lakh": 42.0, "delivery_lead_time_days": 100, "battery_kwh": 140.0},
        {"oem_model": "BYD ETM6 (Industrial)", "segment": "Mining Haul Vehicle", "range_km": 120, "payload_capacity_ton": 20.0, "price_inr_lakh": 85.0, "delivery_lead_time_days": 150, "battery_kwh": 220.0},
        {"oem_model": "Olectra Construction EV", "segment": "Construction Equipment Carrier", "range_km": 100, "payload_capacity_ton": 12.0, "price_inr_lakh": 60.0, "delivery_lead_time_days": 130, "battery_kwh": 180.0},
        {"oem_model": "EFA Forklift Electric", "segment": "Forklift / Warehouse Vehicle", "range_km": 60, "payload_capacity_ton": 2.5, "price_inr_lakh": 5.2, "delivery_lead_time_days": 25, "battery_kwh": 15.0},
    ])


def generate_battery_telemetry(fleet_df):
    ev_ids = fleet_df.loc[fleet_df.is_electrified, "vehicle_id"].tolist()
    start_date = datetime.today() - timedelta(days=TELEMETRY_DAYS)
    rows = []

    for vid in ev_ids:
        # per-vehicle "true" degradation coefficients (unknown to the model, represents real-world variance)
        k_cycle = rng.uniform(0.006, 0.014)
        k_thermal = rng.uniform(0.08, 0.25)
        k_fastcharge = rng.uniform(2.0, 6.0)
        fast_charge_bias = rng.uniform(0.1, 0.6)  # this vehicle's typical fast-charge ratio
        base_temp = rng.uniform(24, 34)

        cycles = 0.0
        true_soh = 100.0

        for day in range(TELEMETRY_DAYS):
            date = start_date + timedelta(days=day)
            daily_km = max(0, rng.normal(fleet_df.loc[fleet_df.vehicle_id == vid, "daily_distance_km"].values[0], 8))
            cycles_today = daily_km / 180.0  # rough km-per-full-cycle-equivalent
            cycles += cycles_today

            fast_charge_ratio = np.clip(rng.normal(fast_charge_bias, 0.1), 0, 1)
            # only vehicles that fast-charge heavily push into anomaly territory --
            # keeps thermal risk a distinguishing signal rather than fleet-wide noise
            max_temp = base_temp + rng.uniform(0, 8) + (10 if fast_charge_ratio > 0.55 else 0)
            avg_temp = base_temp + rng.uniform(-2, 4)
            dod = np.clip(rng.normal(0.6, 0.15), 0.1, 1.0)

            true_soh = 100 - (
                k_cycle * cycles
                + k_thermal * max(0, avg_temp - 35) * (day / 30.0)
                + k_fastcharge * fast_charge_ratio * (cycles / 100.0)
            )
            true_soh = float(np.clip(true_soh, 55, 100))

            # observed = what a BMS sensor reports: true value + measurement noise
            observed_soh = float(np.clip(true_soh + rng.normal(0, 0.6), 50, 100))
            observed_soc = float(np.clip(rng.uniform(20, 95), 0, 100))

            rows.append({
                "vehicle_id": vid,
                "date": date.strftime("%Y-%m-%d"),
                "day_index": day,
                "cycle_count": round(cycles, 2),
                "soc_pct": round(observed_soc, 1),
                "soh_pct_observed": round(observed_soh, 2),
                "soh_pct_true": round(true_soh, 2),  # held out; used only for validation, not by the agent
                "avg_charge_temp_c": round(avg_temp, 1),
                "max_temp_c": round(max_temp, 1),
                "fast_charge_ratio": round(fast_charge_ratio, 2),
                "depth_of_discharge": round(dod, 2),
                "daily_km": round(daily_km, 1),
            })

    return pd.DataFrame(rows)


MATERIALS = ["Lithium Carbonate", "Cobalt", "Nickel Sulphate", "NMC Cells", "LFP Cells", "Graphite (Anode)"]
COUNTRIES = [
    ("Australia", 15), ("Chile", 25), ("DR Congo", 78), ("Indonesia", 45),
    ("China", 55), ("South Korea", 20), ("India", 10), ("Argentina", 30),
]


def generate_suppliers():
    rows = []
    for i in range(40):
        material = MATERIALS[rng.integers(0, len(MATERIALS))]
        tier = int(rng.choice([1, 2, 3], p=[0.4, 0.4, 0.2]))
        country, geo_risk_base = COUNTRIES[rng.integers(0, len(COUNTRIES))]
        concentration_pct = round(rng.uniform(3, 45), 1)
        quality_deviation_rate = round(rng.uniform(0.2, 8.0), 2)
        lead_time_days = int(rng.uniform(15, 90))
        geopolitical_risk_score = int(np.clip(geo_risk_base + rng.uniform(-10, 10), 0, 100))
        sustainability_score = int(rng.uniform(40, 98))
        rows.append({
            "supplier_id": f"SUP{i+1:03d}",
            "material": material,
            "tier": tier,
            "country": country,
            "concentration_pct": concentration_pct,
            "quality_deviation_rate_pct": quality_deviation_rate,
            "lead_time_days": lead_time_days,
            "geopolitical_risk_score": geopolitical_risk_score,
            "sustainability_compliance_score": sustainability_score,
            "volume_supplied_tons": int(rng.uniform(50, 5000)),
        })
    return pd.DataFrame(rows)


def generate_supply_events(suppliers_df):
    """Historical disruption/quality events used to validate risk-detection lead time:
    days_before_disruption = how many days earlier the risk-score-based flag would
    have fired versus the traditional quarterly-review baseline.
    """
    rows = []
    sample = suppliers_df.sample(n=25, random_state=SEED)
    start_date = datetime.today() - timedelta(days=400)
    for _, sup in sample.iterrows():
        event_date = start_date + timedelta(days=int(rng.uniform(0, 380)))
        severity = rng.choice(["Low", "Medium", "High", "Critical"], p=[0.35, 0.35, 0.2, 0.1])
        # quarterly review baseline = up to 90 days lag; risk-model flags earlier
        # proportional to how bad the risk score already was
        risk_composite = (
            sup.concentration_pct * 0.4
            + sup.geopolitical_risk_score * 0.35
            + sup.quality_deviation_rate_pct * 3.0
        )
        traditional_detection_lag_days = int(rng.uniform(45, 90))
        early_flag_days = int(np.clip(risk_composite / 100 * 75 + rng.uniform(0, 15), 5, 85))
        detection_lead_time_days = max(0, traditional_detection_lag_days - early_flag_days)

        rows.append({
            "event_id": f"EVT{len(rows)+1:03d}",
            "supplier_id": sup.supplier_id,
            "material": sup.material,
            "event_date": event_date.strftime("%Y-%m-%d"),
            "event_type": rng.choice(["Quality Deviation", "Supply Disruption", "Price Shock", "Compliance Gap"]),
            "severity": severity,
            "traditional_detection_lag_days": traditional_detection_lag_days,
            "ai_flagged_lead_days_earlier": detection_lead_time_days,
        })
    return pd.DataFrame(rows)


def main():
    fleet_df = generate_fleet()
    oem_df = generate_oem_catalog()
    telemetry_df = generate_battery_telemetry(fleet_df)
    suppliers_df = generate_suppliers()
    events_df = generate_supply_events(suppliers_df)

    fleet_df.to_csv(os.path.join(OUT_DIR, "fleet_vehicles.csv"), index=False)
    oem_df.to_csv(os.path.join(OUT_DIR, "oem_catalog.csv"), index=False)
    telemetry_df.to_csv(os.path.join(OUT_DIR, "battery_telemetry.csv"), index=False)
    suppliers_df.to_csv(os.path.join(OUT_DIR, "suppliers.csv"), index=False)
    events_df.to_csv(os.path.join(OUT_DIR, "supply_events.csv"), index=False)

    print(f"fleet_vehicles.csv       : {len(fleet_df)} rows ({N_ALREADY_EV} already electrified)")
    print(f"oem_catalog.csv          : {len(oem_df)} rows")
    print(f"battery_telemetry.csv    : {len(telemetry_df)} rows ({N_ALREADY_EV} vehicles x {TELEMETRY_DAYS} days)")
    print(f"suppliers.csv            : {len(suppliers_df)} rows")
    print(f"supply_events.csv        : {len(events_df)} rows")


if __name__ == "__main__":
    main()
