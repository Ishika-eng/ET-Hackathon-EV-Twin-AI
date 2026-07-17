import { useState } from "react";
import { Download, PlayCircle, AlertTriangle } from "lucide-react";
import { api } from "../api";
import { useFetch } from "../useFetch";
import MetricCard from "./MetricCard";
import Button from "./Button";
import { ErrorBanner } from "./Loading";

export default function UploadFleet() {
  const segments = useFetch(() => api.getKnownSegments(), []);
  const [file, setFile] = useState(null);
  const [assumptions, setAssumptions] = useState({
    electricity_cost_inr_per_kwh: "",
    grid_emission_factor_kg_per_kwh: "",
    diesel_emission_factor_kg_per_l: "",
    charger_kw: "",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.uploadFleet(file, assumptions);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="panel p-5">
        <h3 className="text-sm font-medium mb-2">Analyze your own fleet</h3>
        <p className="text-sm text-[var(--text-dim)] mb-4">
          Upload a CSV of your real fleet to run it through the Procurement Agent — everything
          on the Fleet Overview / Procurement Plan tabs uses bundled demo data, this uses yours.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <a
            href={api.getFleetTemplateUrl()}
            download="fleet_template.csv"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-[var(--panel-border)] hover:border-[var(--accent-blue)] transition-colors"
          >
            <Download size={14} strokeWidth={2.25} /> Download CSV template
          </a>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-[var(--text-dim)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-[var(--panel-border)] file:bg-[var(--bg)] file:text-[var(--text)] file:text-sm"
          />
          <Button onClick={analyze} disabled={!file || loading} icon={PlayCircle}>
            {loading ? "Analyzing..." : "Analyze Fleet"}
          </Button>
        </div>

        {!segments.loading && !segments.error && (
          <p className="text-xs text-[var(--text-dim)]">
            <span className="text-[var(--text)]">vehicle_type</span> must be one of:{" "}
            {segments.data.segments.join(", ")}
          </p>
        )}

        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-[var(--text-dim)]">
            Override regional assumptions (optional — defaults shown)
          </summary>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {[
              { key: "electricity_cost_inr_per_kwh", label: "Electricity ₹/kWh", placeholder: "8.0" },
              { key: "grid_emission_factor_kg_per_kwh", label: "Grid kg CO2/kWh", placeholder: "0.716" },
              { key: "diesel_emission_factor_kg_per_l", label: "Diesel kg CO2/L", placeholder: "2.68" },
              { key: "charger_kw", label: "Depot charger kW", placeholder: "15" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs text-[var(--text-dim)] block mb-1">{f.label}</label>
                <input
                  type="number"
                  step="any"
                  placeholder={f.placeholder}
                  value={assumptions[f.key]}
                  onChange={(e) => setAssumptions({ ...assumptions, [f.key]: e.target.value })}
                  className="w-full bg-[var(--bg)] border border-[var(--panel-border)] rounded-md px-2 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
        </details>
      </div>

      {error && <ErrorBanner message={error} />}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Vehicles Submitted" value={result.vehicles_submitted} />
            <MetricCard label="Vehicles Analyzed" value={result.vehicles_analyzed} tone="accent" />
            <MetricCard
              label="Avg Readiness Score"
              value={result.results.length ? (result.results.reduce((s, r) => s + r.transition_readiness_score, 0) / result.results.length).toFixed(1) : "—"}
            />
            <MetricCard
              label="Total Annual Savings"
              value={`₹${(result.results.reduce((s, r) => s + r.annual_savings_inr, 0) / 1e5).toFixed(1)} L`}
              tone="accent"
            />
          </div>

          {result.warnings.length > 0 && (
            <div className="panel p-4 border-[var(--warning)]">
              <div className="text-sm font-medium text-[var(--warning)] mb-2 flex items-center gap-1.5">
                <AlertTriangle size={14} strokeWidth={2.25} /> Warnings
              </div>
              <ul className="text-sm text-[var(--text-dim)] list-disc list-inside space-y-1">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {result.skipped_vehicles.length > 0 && (
            <div className="panel p-4">
              <div className="text-sm font-medium mb-2">Skipped vehicles</div>
              <ul className="text-sm text-[var(--text-dim)] list-disc list-inside space-y-1">
                {result.skipped_vehicles.map((s) => (
                  <li key={s.vehicle_id}>{s.vehicle_id}: {s.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {result.results.length > 0 && (
            <div className="panel p-4 overflow-x-auto scrollbar-thin">
              <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">Results</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-dim)] border-b border-[var(--panel-border)]">
                    <th className="py-2 pr-4">Vehicle</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Confidence</th>
                    <th className="py-2 pr-4">Recommended EV</th>
                    <th className="py-2 pr-4">Savings/yr</th>
                    <th className="py-2 pr-4">Payback</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r) => (
                    <tr key={r.vehicle_id} className="border-b border-[var(--panel-border)]/50">
                      <td className="py-2 pr-4 font-medium">{r.vehicle_id}</td>
                      <td className="py-2 pr-4 text-[var(--text-dim)]">{r.vehicle_type}</td>
                      <td className="py-2 pr-4 text-[var(--accent)] font-medium">{r.transition_readiness_score}</td>
                      <td className="py-2 pr-4">{r.confidence_score}%</td>
                      <td className="py-2 pr-4">{r.recommended_oem_model}</td>
                      <td className="py-2 pr-4">₹{(r.annual_savings_inr / 1e5).toFixed(1)}L</td>
                      <td className="py-2 pr-4">{r.payback_years ? `${r.payback_years} yrs` : "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
