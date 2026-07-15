import { useState } from "react";
import { api } from "../api";
import { useFetch } from "../useFetch";
import { Loading, ErrorBanner } from "./Loading";

export default function ProcurementPlan() {
  const [phaseSize, setPhaseSize] = useState(20);
  const { data, error, loading } = useFetch(() => api.getProcurementPlan(phaseSize), [phaseSize]);
  const [openPhase, setOpenPhase] = useState(1);

  return (
    <div className="flex flex-col gap-6">
      <div className="panel p-4 flex items-center gap-4">
        <label className="text-sm text-[var(--text-dim)]">Vehicles per phase</label>
        <input
          type="range"
          min={5}
          max={50}
          value={phaseSize}
          onChange={(e) => setPhaseSize(Number(e.target.value))}
          className="accent-[var(--accent)]"
        />
        <span className="text-sm font-medium w-8">{phaseSize}</span>
      </div>

      {loading && <Loading label="Building rollout plan..." />}
      {error && <ErrorBanner message={error} />}

      {data &&
        data.map((phase) => (
          <div key={phase.phase} className="panel overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setOpenPhase(openPhase === phase.phase ? null : phase.phase)}
            >
              <span className="font-medium">
                Phase {phase.phase} — {phase.vehicle_count} vehicles (avg score {phase.avg_readiness_score})
              </span>
              <span className="text-[var(--text-dim)]">{openPhase === phase.phase ? "−" : "+"}</span>
            </button>
            {openPhase === phase.phase && (
              <div className="px-4 pb-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="panel p-3">
                    <div className="text-xs text-[var(--text-dim)] uppercase">Annual Savings</div>
                    <div className="text-xl font-semibold text-[var(--accent)]">
                      ₹{(phase.total_annual_savings_inr / 1e5).toFixed(1)} L
                    </div>
                  </div>
                  <div className="panel p-3">
                    <div className="text-xs text-[var(--text-dim)] uppercase">CO2 Saved / yr</div>
                    <div className="text-xl font-semibold text-[var(--accent)]">
                      {(phase.total_co2_saved_kg_per_year / 1000).toFixed(1)} tons
                    </div>
                  </div>
                </div>
                <div className="text-sm text-[var(--text-dim)]">
                  <span className="text-[var(--text)]">Vehicles: </span>
                  {phase.vehicle_ids.join(", ")}
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
