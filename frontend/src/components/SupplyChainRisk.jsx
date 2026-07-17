import { useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { api } from "../api";
import { useFetch } from "../useFetch";
import MetricCard from "./MetricCard";
import { Loading, ErrorBanner } from "./Loading";

const TIER_COLORS = { Critical: "#b71c1c", High: "#e64a19", Medium: "#f9a825", Low: "#388e3c" };

export default function SupplyChainRisk() {
  const suppliers = useFetch(() => api.getSuppliers(), []);
  const concentration = useFetch(() => api.getConcentration(), []);
  const leadTime = useFetch(() => api.getLeadTime(), []);

  const criticalCount = useMemo(() => {
    if (!suppliers.data) return 0;
    return suppliers.data.filter((s) => s.risk_tier === "Critical" || s.risk_tier === "High").length;
  }, [suppliers.data]);

  if (suppliers.loading || concentration.loading || leadTime.loading) return <Loading label="Analyzing suppliers..." />;
  if (suppliers.error) return <ErrorBanner message={suppliers.error} />;
  if (concentration.error) return <ErrorBanner message={concentration.error} />;
  if (leadTime.error) return <ErrorBanner message={leadTime.error} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Suppliers Tracked" value={suppliers.data.length} />
        <MetricCard label="Critical / High Risk" value={criticalCount} tone="danger" />
        <MetricCard
          label="Avg Risk-Detection Lead Time"
          value={`${leadTime.data.avg_lead_time_days_earlier} days earlier`}
          tone="accent"
        />
      </div>

      <div className="panel p-4">
        <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">Supplier Risk Landscape</h3>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
            <XAxis type="number" dataKey="concentration_pct" name="Concentration %" stroke="var(--text-dim)" fontSize={12} />
            <YAxis type="number" dataKey="risk_score" name="Risk Score" stroke="var(--text-dim)" fontSize={12} />
            <ZAxis type="number" dataKey="volume_supplied_tons" range={[40, 300]} name="Volume (tons)" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "var(--panel)", border: "1px solid var(--panel-border)" }} />
            <Legend />
            {Object.keys(TIER_COLORS).map((tier) => (
              <Scatter
                key={tier}
                name={tier}
                data={suppliers.data.filter((s) => s.risk_tier === tier)}
                fill={TIER_COLORS[tier]}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="panel p-4 overflow-x-auto scrollbar-thin">
        <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">Material Concentration Flags</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-dim)] border-b border-[var(--panel-border)]">
              <th className="py-2 pr-4">Material</th>
              <th className="py-2 pr-4">Suppliers</th>
              <th className="py-2 pr-4">Countries</th>
              <th className="py-2 pr-4">Top-3 Share</th>
              <th className="py-2 pr-4">Avg Risk</th>
              <th className="py-2 pr-4">Flag</th>
            </tr>
          </thead>
          <tbody>
            {concentration.data.map((c) => (
              <tr key={c.material} className="border-b border-[var(--panel-border)]/50">
                <td className="py-2 pr-4 font-medium">{c.material}</td>
                <td className="py-2 pr-4">{c.supplier_count}</td>
                <td className="py-2 pr-4">{c.country_count}</td>
                <td className="py-2 pr-4">{c.top3_supplier_share_pct}%</td>
                <td className="py-2 pr-4">{c.avg_risk_score}</td>
                <td className={`py-2 pr-4 ${c.flag === "High concentration risk" ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}>
                  {c.flag}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel p-4 overflow-x-auto scrollbar-thin">
        <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">Critical Suppliers</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-dim)] border-b border-[var(--panel-border)]">
              <th className="py-2 pr-4">Supplier</th>
              <th className="py-2 pr-4">Material</th>
              <th className="py-2 pr-4">Country</th>
              <th className="py-2 pr-4">Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.data.filter((s) => s.risk_tier === "Critical").map((s) => (
              <tr key={s.supplier_id} className="border-b border-[var(--panel-border)]/50">
                <td className="py-2 pr-4 font-medium">{s.supplier_id}</td>
                <td className="py-2 pr-4">{s.material}</td>
                <td className="py-2 pr-4 text-[var(--text-dim)]">{s.country}</td>
                <td className="py-2 pr-4 text-[var(--danger)] font-medium">{s.risk_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
