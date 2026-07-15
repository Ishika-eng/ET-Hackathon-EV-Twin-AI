import { useMemo, useState } from "react";
import { api } from "../api";
import { useFetch } from "../useFetch";
import MetricCard from "./MetricCard";
import { Loading, ErrorBanner } from "./Loading";

export default function DigitalTwin() {
  const proc = useFetch(() => api.getProcurementFleet(), []);
  const health = useFetch(() => api.getHealthFleet(), []);
  const [selected, setSelected] = useState(null);

  const allVehicles = useMemo(() => {
    if (!proc.data || !health.data) return [];
    const ids = new Set([...proc.data.map((r) => r.vehicle_id), ...health.data.map((r) => r.vehicle_id)]);
    return Array.from(ids).sort();
  }, [proc.data, health.data]);

  const active = selected || allVehicles[0];

  if (proc.loading || health.loading) return <Loading label="Loading fleet..." />;
  if (proc.error) return <ErrorBanner message={proc.error} />;
  if (health.error) return <ErrorBanner message={health.error} />;

  const healthRow = health.data.find((r) => r.vehicle_id === active);
  const procRow = proc.data.find((r) => r.vehicle_id === active);
  const isEv = !!healthRow;

  return (
    <div className="flex flex-col gap-6">
      <div className="panel p-4 flex items-center gap-4">
        <label className="text-sm text-[var(--text-dim)]">Select a vehicle</label>
        <select
          value={active || ""}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-[var(--bg)] border border-[var(--panel-border)] rounded-md px-3 py-1.5 text-sm"
        >
          {allVehicles.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {isEv ? (
        <>
          <div className="panel p-4 border-l-4 border-l-[var(--accent)]">
            <span className="text-[var(--accent)] font-medium">{active} — Electrified Vehicle</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="SOH" value={`${healthRow.current_soh_pct}%`} />
            <MetricCard label="Cycle Count" value={Math.round(healthRow.cycle_count)} />
            <MetricCard
              label="Est. RUL"
              value={healthRow.estimated_rul_days != null ? `${healthRow.estimated_rul_days} days` : "Stable"}
            />
            <MetricCard
              label="Thermal Anomaly"
              value={healthRow.thermal_anomaly ? "Yes" : "No"}
              tone={healthRow.thermal_anomaly ? "danger" : "accent"}
            />
          </div>
          <div className="panel p-4">
            <h3 className="text-sm font-medium text-[var(--text-dim)] mb-2">Maintenance triggers</h3>
            <ul className="text-sm list-disc list-inside space-y-1">
              {healthRow.maintenance_triggers.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
          <div className="panel p-4">
            <h3 className="text-sm font-medium text-[var(--text-dim)] mb-2">Charging recommendations</h3>
            <ul className="text-sm list-disc list-inside space-y-1">
              {healthRow.charging_recommendations.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </>
      ) : procRow ? (
        <>
          <div className="panel p-4 border-l-4 border-l-[var(--info)]">
            <span className="text-[var(--info)] font-medium">{active} — Diesel Vehicle (Procurement Candidate)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Readiness Score" value={`${procRow.transition_readiness_score}%`} tone="accent" />
            <MetricCard label="Recommended EV" value={procRow.recommended_oem_model} />
            <MetricCard label="Payback Period" value={procRow.payback_years ? `${procRow.payback_years} yrs` : "N/A"} />
            <MetricCard label="CO2 Saved/yr" value={`${(procRow.co2_saved_kg_per_year / 1000).toFixed(1)} tons`} />
          </div>
          <div className="panel p-4">
            <h3 className="text-sm font-medium text-[var(--text-dim)] mb-2">Score breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {Object.entries(procRow.score_breakdown).map(([k, v]) => (
                <div key={k} className="panel p-2">
                  <div className="text-xs text-[var(--text-dim)] capitalize">{k.replace(/_/g, " ")}</div>
                  <div className="font-medium">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-[var(--text-dim)]">No data for this vehicle.</div>
      )}
    </div>
  );
}
