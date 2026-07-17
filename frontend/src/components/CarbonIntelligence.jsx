import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "../api";
import { useFetch } from "../useFetch";
import MetricCard from "./MetricCard";
import { Loading, ErrorBanner } from "./Loading";

const TYPE_COLORS = {
  "Intra-plant Tug": "#22d3a5",
  "Last-mile Delivery Van": "#3b82f6",
  "Freight Truck": "#f5a524",
  "Mining Haul Vehicle": "#f6584f",
  "Construction Equipment Carrier": "#a78bfa",
  "Forklift / Warehouse Vehicle": "#f472b6",
};

export default function CarbonIntelligence() {
  const summary = useFetch(() => api.getCarbonSummary(), []);
  const topImpact = useFetch(() => api.getTopImpact(10), []);

  if (summary.loading || topImpact.loading) return <Loading label="Computing carbon impact..." />;
  if (summary.error) return <ErrorBanner message={summary.error} />;
  if (topImpact.error) return <ErrorBanner message={topImpact.error} />;

  const c = summary.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Current Electrification" value={`${c.current_electrification_pct}%`} />
        <MetricCard
          label={`2030 Target (${c.net_zero_target_pct}%)`}
          value={`Gap: ${c.gap_to_target_pct}%`}
          tone={c.gap_to_target_pct > 0 ? "warning" : "accent"}
        />
        <MetricCard
          label="Potential Scope 1 Reduction"
          value={`${c.potential_scope1_reduction_tons_per_year} tons/yr`}
          tone="accent"
        />
      </div>

      <div className="panel p-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-[var(--text-dim)] uppercase">Scope 1 Reduction Potential</div>
          <div className="text-lg font-semibold">{c.potential_scope1_reduction_kg_per_year.toLocaleString()} kg/yr</div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-dim)] uppercase">Scope 3 Reduction Potential</div>
          <div className="text-lg font-semibold">{c.potential_scope3_reduction_kg_per_year.toLocaleString()} kg/yr</div>
        </div>
      </div>

      <div className="panel p-4">
        <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">Highest-Impact Next Electrification Priorities</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topImpact.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
            <XAxis dataKey="vehicle_id" stroke="var(--text-dim)" fontSize={12} />
            <YAxis stroke="var(--text-dim)" fontSize={12} />
            <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--panel-border)" }} />
            <Bar dataKey="co2_saved_kg_per_year" fill="var(--accent)" radius={[4, 4, 0, 0]}>
              {topImpact.data.map((r) => (
                <Cell key={r.vehicle_id} fill={TYPE_COLORS[r.vehicle_type] || "var(--accent)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
