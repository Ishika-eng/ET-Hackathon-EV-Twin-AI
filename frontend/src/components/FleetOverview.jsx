import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Legend,
} from "recharts";
import { api } from "../api";
import { useFetch } from "../useFetch";
import MetricCard from "./MetricCard";
import { PageSkeleton, ErrorBanner } from "./Loading";

const COLUMNS = [
  { key: "vehicle_id", label: "Vehicle" },
  { key: "vehicle_type", label: "Type" },
  { key: "depot_city", label: "City" },
  { key: "daily_distance_km", label: "Distance/day", numeric: true },
  { key: "transition_readiness_score", label: "Score", numeric: true },
  { key: "confidence_score", label: "Confidence", numeric: true },
  { key: "recommended_oem_model", label: "Recommended EV" },
  { key: "battery_supply_risk_tier", label: "Battery Supply Risk" },
  { key: "annual_savings_inr", label: "Savings/yr", numeric: true },
  { key: "payback_years", label: "Payback", numeric: true },
];

function SortIcon({ active, dir }) {
  if (!active) return <span className="text-[var(--text-dim)]/40">↕</span>;
  return <span className="text-[var(--accent)]">{dir === "asc" ? "↑" : "↓"}</span>;
}

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
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "transition_readiness_score", dir: "desc" });
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => {
    if (!data) return null;
    const avgScore = data.reduce((s, r) => s + r.transition_readiness_score, 0) / data.length;
    const totalSavings = data.reduce((s, r) => s + r.annual_savings_inr, 0);
    const totalCo2 = data.reduce((s, r) => s + r.co2_saved_kg_per_year, 0);
    return { avgScore, totalSavings, totalCo2, count: data.length };
  }, [data]);

  const filteredSorted = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    let rows = data;
    if (q) {
      rows = rows.filter((r) =>
        [r.vehicle_id, r.vehicle_type, r.depot_city, r.recommended_oem_model]
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    const { key, dir } = sort;
    const sorted = [...rows].sort((a, b) => {
      const av = a[key], bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [data, search, sort]);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  };

  if (loading) return <PageSkeleton metricCount={4} />;
  if (error) return <ErrorBanner message={error} />;

  const scoreDist = bucketScores(data);
  const visibleRows = showAll ? filteredSorted : filteredSorted.slice(0, 15);

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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
            <XAxis dataKey="range" stroke="var(--text-dim)" fontSize={12} />
            <YAxis stroke="var(--text-dim)" fontSize={12} />
            <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--panel-border)" }} />
            <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel p-4">
        <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">
          Readiness vs. Daily Distance by Vehicle Type
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
            <XAxis type="number" dataKey="daily_distance_km" name="Daily Distance (km)" stroke="var(--text-dim)" fontSize={12} />
            <YAxis type="number" dataKey="transition_readiness_score" name="Readiness Score" stroke="var(--text-dim)" fontSize={12} />
            <ZAxis type="number" dataKey="payload_ton" range={[40, 300]} name="Payload (ton)" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "var(--panel)", border: "1px solid var(--panel-border)" }} />
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

      <div className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-medium text-[var(--text-dim)]">
            Fleet Detail <span className="text-[var(--text-dim)]/70">({filteredSorted.length} of {data.length})</span>
          </h3>
          <input
            type="search"
            placeholder="Search vehicle, type, city, EV model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--panel-border)] rounded-md px-3 py-1.5 text-sm w-full sm:w-72 outline-none"
          />
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-dim)] border-b border-[var(--panel-border)]">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="py-2 pr-4 select-none hover:text-[var(--text)] whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      {col.label} <SortIcon active={sort.key === col.key} dir={sort.dir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.vehicle_id} className="border-b border-[var(--panel-border)]/50">
                  <td className="py-2 pr-4 font-medium">{r.vehicle_id}</td>
                  <td className="py-2 pr-4 text-[var(--text-dim)]">{r.vehicle_type}</td>
                  <td className="py-2 pr-4 text-[var(--text-dim)]">{r.depot_city}</td>
                  <td className="py-2 pr-4">{r.daily_distance_km} km</td>
                  <td className="py-2 pr-4 text-[var(--accent)] font-medium">{r.transition_readiness_score}</td>
                  <td className="py-2 pr-4 text-[var(--text-dim)]">{r.confidence_score}%</td>
                  <td className="py-2 pr-4">{r.recommended_oem_model}</td>
                  <td className={`py-2 pr-4 whitespace-nowrap ${
                    r.battery_supply_risk_tier === "Critical" ? "text-[var(--danger)]" :
                    r.battery_supply_risk_tier === "High" ? "text-[var(--warning)]" : "text-[var(--text-dim)]"
                  }`}>
                    {r.battery_supply_risk_tier} <span className="text-[var(--text-dim)]">({r.cell_chemistry})</span>
                  </td>
                  <td className="py-2 pr-4">₹{(r.annual_savings_inr / 1e5).toFixed(1)}L</td>
                  <td className="py-2 pr-4">{r.payback_years ? `${r.payback_years} yrs` : "N/A"}</td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-6 text-center text-[var(--text-dim)]">
                    No vehicles match "{search}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredSorted.length > 15 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="mt-3 text-sm text-[var(--accent)] hover:underline"
          >
            {showAll ? "Show fewer" : `Show all ${filteredSorted.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
