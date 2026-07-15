import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Legend,
} from "recharts";
import { api } from "../api";
import { useFetch } from "../useFetch";
import MetricCard from "./MetricCard";
import { Loading, ErrorBanner } from "./Loading";

const VEHICLE_COLORS = {
  "Intra-plant Tug": "#22d3a5",
  "Last-mile Delivery Van": "#3b82f6",
  "Freight Truck": "#f5a524",
  "Mining Haul Vehicle": "#f6584f",
  "Construction Equipment Carrier": "#a78bfa",
  "Forklift / Warehouse Vehicle": "#f472b6",
};

function bucketScores(rows) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${i * 10 + 9}`,
    count: 0,
  }));
  rows.forEach((r) => {
    const idx = Math.min(9, Math.floor(r.transition_readiness_score / 10));
    buckets[idx].count += 1;
  });
  return buckets;
}

export default function FleetOverview() {
  const { data, error, loading } = useFetch(() => api.getProcurementFleet(), []);

  const stats = useMemo(() => {
    if (!data) return null;
    const avgScore = data.reduce((s, r) => s + r.transition_readiness_score, 0) / data.length;
    const totalSavings = data.reduce((s, r) => s + r.annual_savings_inr, 0);
    const totalCo2 = data.reduce((s, r) => s + r.co2_saved_kg_per_year, 0);
    return { avgScore, totalSavings, totalCo2, count: data.length };
  }, [data]);

  if (loading) return <Loading label="Scoring fleet..." />;
  if (error) return <ErrorBanner message={error} />;

  const scoreDist = bucketScores(data);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Diesel Vehicles Analyzed" value={stats.count} />
        <MetricCard label="Avg Readiness Score" value={stats.avgScore.toFixed(1)} tone="accent" />
        <MetricCard
          label="Total Potential Savings"
          value={`₹${(stats.totalSavings / 1e7).toFixed(2)} Cr`}
          tone="accent"
        />
        <MetricCard label="Total CO2 Saved / yr" value={`${(stats.totalCo2 / 1000).toFixed(0)} tons`} tone="accent" />
      </div>

      <div className="panel p-4">
        <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">Readiness Score Distribution</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={scoreDist}>
            <CartesianGrid strokeDasharray="3 3" stroke="#223052" />
            <XAxis dataKey="range" stroke="#8b98b8" fontSize={12} />
            <YAxis stroke="#8b98b8" fontSize={12} />
            <Tooltip contentStyle={{ background: "#121a2e", border: "1px solid #223052" }} />
            <Bar dataKey="count" fill="#22d3a5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel p-4">
        <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">
          Readiness vs. Daily Distance by Vehicle Type
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#223052" />
            <XAxis type="number" dataKey="daily_distance_km" name="Daily Distance (km)" stroke="#8b98b8" fontSize={12} />
            <YAxis type="number" dataKey="transition_readiness_score" name="Readiness Score" stroke="#8b98b8" fontSize={12} />
            <ZAxis type="number" dataKey="payload_ton" range={[40, 300]} name="Payload (ton)" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#121a2e", border: "1px solid #223052" }} />
            <Legend />
            {Object.keys(VEHICLE_COLORS).map((type) => (
              <Scatter
                key={type}
                name={type}
                data={data.filter((d) => d.vehicle_type === type)}
                fill={VEHICLE_COLORS[type]}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="panel p-4 overflow-x-auto scrollbar-thin">
        <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">Fleet Detail</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-dim)] border-b border-[var(--panel-border)]">
              <th className="py-2 pr-4">Vehicle</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">City</th>
              <th className="py-2 pr-4">Distance/day</th>
              <th className="py-2 pr-4">Score</th>
              <th className="py-2 pr-4">Recommended EV</th>
              <th className="py-2 pr-4">Savings/yr</th>
              <th className="py-2 pr-4">Payback</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 30).map((r) => (
              <tr key={r.vehicle_id} className="border-b border-[var(--panel-border)]/50">
                <td className="py-2 pr-4 font-medium">{r.vehicle_id}</td>
                <td className="py-2 pr-4 text-[var(--text-dim)]">{r.vehicle_type}</td>
                <td className="py-2 pr-4 text-[var(--text-dim)]">{r.depot_city}</td>
                <td className="py-2 pr-4">{r.daily_distance_km} km</td>
                <td className="py-2 pr-4 text-[var(--accent)] font-medium">{r.transition_readiness_score}</td>
                <td className="py-2 pr-4">{r.recommended_oem_model}</td>
                <td className="py-2 pr-4">₹{(r.annual_savings_inr / 1e5).toFixed(1)}L</td>
                <td className="py-2 pr-4">{r.payback_years ? `${r.payback_years} yrs` : "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
