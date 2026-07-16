import { useState } from "react";
import LandingPage from "./components/LandingPage";
import FleetOverview from "./components/FleetOverview";
import ProcurementPlan from "./components/ProcurementPlan";
import BatteryHealth from "./components/BatteryHealth";
import DigitalTwin from "./components/DigitalTwin";
import SupplyChainRisk from "./components/SupplyChainRisk";
import CarbonIntelligence from "./components/CarbonIntelligence";
import ChatAssistant from "./components/ChatAssistant";

const SECTIONS = [
  { id: "fleet", label: "Fleet Overview", icon: "🚛", component: FleetOverview },
  { id: "procurement", label: "Procurement Plan", icon: "📋", component: ProcurementPlan },
  { id: "health", label: "Battery Health", icon: "🔧", component: BatteryHealth },
  { id: "twin", label: "Digital Twin", icon: "🧬", component: DigitalTwin },
  { id: "supply", label: "Supply Chain Risk", icon: "⚠️", component: SupplyChainRisk },
  { id: "carbon", label: "Carbon Intelligence", icon: "🌍", component: CarbonIntelligence },
  { id: "chat", label: "Ask the Fleet", icon: "💬", component: ChatAssistant },
];

function App() {
  const [entered, setEntered] = useState(false);
  const [active, setActive] = useState("fleet");
  const ActiveComponent = SECTIONS.find((s) => s.id === active).component;

  if (!entered) {
    return <LandingPage onEnter={() => setEntered(true)} />;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-[var(--panel-border)] flex flex-col p-4 gap-1">
        <button className="mb-6 px-2 text-left" onClick={() => setEntered(false)}>
          <div className="text-xl font-semibold flex items-center gap-2">
            <span>🔋</span> EV Twin AI
          </div>
          <div className="text-xs text-[var(--text-dim)] mt-1">
            AI Digital Twin Platform for Industrial EV Fleets & Manufacturing Supply Chains
          </div>
        </button>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
              active === s.id
                ? "bg-[var(--accent-dim)] text-[var(--accent)] font-medium"
                : "text-[var(--text-dim)] hover:bg-[var(--panel)] hover:text-[var(--text)]"
            }`}
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-lg font-semibold mb-6">
          {SECTIONS.find((s) => s.id === active).icon} {SECTIONS.find((s) => s.id === active).label}
        </h1>
        <ActiveComponent />
      </main>
    </div>
  );
}

export default App;
