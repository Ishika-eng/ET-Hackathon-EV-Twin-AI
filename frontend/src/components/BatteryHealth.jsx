import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "../api";
import { useFetch } from "../useFetch";
import MetricCard from "./MetricCard";
import { Loading, ErrorBanner } from "./Loading";

export default function BatteryHealth() {
  const health = useFetch(() => api.getHealthFleet(), []);
  const validation = useFetch(() => api.getHealthValidation(), []);

  const atRisk = useMemo(() => {
    if (!health.data) return 0;
    return health.data.filter((r) => r.estimated_rul_days != null && r.estimated_rul_days < 180).length;
  }, [health.data]);

  if (health.loading || validation.loading) return <Loading label="Analyzing telemetry..." />;
  if (health.error) return <ErrorBanner message={health.error} />;
  if (validation.error) return <ErrorBanner message={validation.error} />;

  const chartData = [...health.data].sort((a, b) => a.current_soh_pct - b.current_soh_pct);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="EVs Monitored" value={health.data.length} />
        <MetricCard label="Prediction Accuracy (MAE)" value={`±${validation.data.overall_mae}% SOH`} tone="accent" />
        <MetricCard label="Vehicles Needing Attention" value={atRisk} tone={atRisk > 0 ? "warning" : "accent"} />
      </div>

      <p className="text-xs text-[var(--text-dim)]">
        Model validated against {validation.data.n_observations} observed telemetry readings
        (RMSE {validation.data.overall_rmse}%) — standing in for live BMS data until connected.
      </p>

      <div className="panel p-4">
        <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">Current SOH by Vehicle</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
            <XAxis dataKey="vehicle_id" stroke="var(--text-dim)" fontSize={10} interval={2} />
            <YAxis domain={[0, 100]} stroke="var(--text-dim)" fontSize={12} />
            <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--panel-border)" }} />
            <Bar dataKey="current_soh_pct" fill="var(--accent-blue)" radius={[4, 4, 0, 0]}>
              {chartData.map((r) => (
                <Cell key={r.vehicle_id} fill={r.thermal_anomaly ? "var(--danger)" : "var(--accent-blue)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 text-xs text-[var(--text-dim)] mt-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--accent-blue)] inline-block" /> Normal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--danger)] inline-block" /> Thermal anomaly</span>
        </div>
      </div>

      <div className="panel p-4 overflow-x-auto scrollbar-thin">
        <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">Maintenance Triggers</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-dim)] border-b border-[var(--panel-border)]">
              <th className="py-2 pr-4">Vehicle</th>
              <th className="py-2 pr-4">SOH</th>
              <th className="py-2 pr-4">Est. RUL</th>
              <th className="py-2 pr-4">Triggers</th>
            </tr>
          </thead>
          <tbody>
            {health.data.map((r) => (
              <tr key={r.vehicle_id} className="border-b border-[var(--panel-border)]/50 align-top">
                <td className="py-2 pr-4 font-medium">{r.vehicle_id}</td>
                <td className="py-2 pr-4">{r.current_soh_pct}%</td>
                <td className="py-2 pr-4">{r.estimated_rul_days != null ? `${r.estimated_rul_days}d` : "Stable"}</td>
                <td className="py-2 pr-4 text-[var(--text-dim)]">{r.maintenance_triggers.join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
