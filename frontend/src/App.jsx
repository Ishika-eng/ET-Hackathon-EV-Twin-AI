import { useState } from "react";
import LandingPage from "./components/LandingPage";
import UploadFleet from "./components/UploadFleet";
import FleetOverview from "./components/FleetOverview";
import ProcurementPlan from "./components/ProcurementPlan";
import BatteryHealth from "./components/BatteryHealth";
import DigitalTwin from "./components/DigitalTwin";
import SupplyChainRisk from "./components/SupplyChainRisk";
import CarbonIntelligence from "./components/CarbonIntelligence";
import ChatAssistant from "./components/ChatAssistant";

const NAV_GROUPS = [
  {
    label: "My Fleet",
    items: [
      { id: "upload", label: "Upload Your Fleet", icon: "📤", component: UploadFleet, subtitle: "Analyze your own fleet CSV instead of the demo data" },
    ],
  },
  {
    label: "Fleet Intelligence",
    items: [
      { id: "fleet", label: "Fleet Overview", icon: "🚛", component: FleetOverview, subtitle: "EV-transition readiness across the diesel fleet" },
      { id: "procurement", label: "Procurement Plan", icon: "📋", component: ProcurementPlan, subtitle: "Phased rollout with savings and CO2 impact" },
      { id: "twin", label: "Digital Twin", icon: "🧬", component: DigitalTwin, subtitle: "Full profile for a single vehicle, diesel or electric" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "health", label: "Battery Health", icon: "🔧", component: BatteryHealth, subtitle: "SOH, RUL, and maintenance triggers for electrified vehicles" },
    ],
  },
  {
    label: "Supply Chain",
    items: [
      { id: "supply", label: "Supply Chain Risk", icon: "⚠️", component: SupplyChainRisk, subtitle: "Battery material supplier risk and concentration" },
    ],
  },
  {
    label: "Impact",
    items: [
      { id: "carbon", label: "Carbon Intelligence", icon: "🌍", component: CarbonIntelligence, subtitle: "Net Zero progress and emission reduction potential" },
    ],
  },
  {
    label: "Assistant",
    items: [
      { id: "chat", label: "Ask the Fleet", icon: "💬", component: ChatAssistant, subtitle: "Cross-agent reasoning over live fleet data" },
    ],
  },
];

const ALL_SECTIONS = NAV_GROUPS.flatMap((g) => g.items);

function App() {
  const [entered, setEntered] = useState(false);
  const [active, setActive] = useState("fleet");
  const activeSection = ALL_SECTIONS.find((s) => s.id === active);
  const ActiveComponent = activeSection.component;

  if (!entered) {
    return <LandingPage onEnter={() => setEntered(true)} />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 shrink-0 border-r border-[var(--panel-border)] flex flex-col overflow-y-auto scrollbar-thin">
        <button
          className="text-left px-5 py-5 border-b border-[var(--panel-border)] hover:bg-[var(--panel)]"
          onClick={() => setEntered(false)}
        >
          <div className="text-lg font-semibold flex items-center gap-2">
            <span>🔋</span> EV Twin AI
          </div>
          <div className="text-xs text-[var(--text-dim)] mt-1 leading-snug">
            AI Digital Twin Platform for Industrial EV Fleets &amp; Manufacturing Supply Chains
          </div>
        </button>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]/70">
                {group.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    title={s.subtitle}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left border-l-2 ${
                      active === s.id
                        ? "bg-[var(--accent-blue-dim)] text-[var(--accent-blue)] font-medium border-l-[var(--accent-blue)]"
                        : "text-[var(--text-dim)] border-l-transparent hover:bg-[var(--panel)] hover:text-[var(--text)]"
                    }`}
                  >
                    <span className="text-base leading-none">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-[1400px] w-full mx-auto px-6 md:px-8 pt-6 md:pt-8 pb-4 shrink-0">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <span>{activeSection.icon}</span> {activeSection.label}
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">{activeSection.subtitle}</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-[1400px] mx-auto px-6 md:px-8 pb-8 h-full">
            <ActiveComponent />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
