import { SECTION_ICONS, LogoIcon } from "../icons";
import Button from "./Button";
import DashboardPreview from "./DashboardPreview";
import { Reveal, CountUp } from "./Reveal";
import { ArrowRight } from "lucide-react";

const STATS = [
  { prefix: "", value: 2, suffix: "M+", label: "EVs registered in FY2025" },
  { prefix: "<", value: 7, suffix: "%", label: "of total vehicle sales" },
  { prefix: "<", value: 2.5, suffix: "%", label: "industrial/commercial penetration" },
  { prefix: "", value: 30, suffix: "%", label: "govt. target by 2030" },
];

const FEATURES = [
  {
    id: "procurement",
    title: "Risk-Adjusted Procurement Intelligence",
    desc: "Scores every diesel vehicle's EV-transition readiness and matches it to the best-fit OEM model — with a confidence score that drops when that model's battery cells trace back to a high-risk supplier. Procurement and Supply Chain aren't separate tabs here; one decision reflects both.",
  },
  {
    id: "health",
    title: "Battery Health (APM)",
    desc: "Predicts SOH and Remaining Useful Life from telemetry, flags thermal anomalies, and validates its own accuracy against observed data.",
  },
  {
    id: "twin",
    title: "Digital Twin",
    desc: "A live avatar for every vehicle — diesel or electric — showing its full readiness or health profile in one view.",
  },
  {
    id: "supply",
    title: "Supply Chain Risk",
    desc: "Tracks battery-material suppliers across tiers, flags concentration and geopolitical risk, and measures detection lead time versus manual review.",
  },
  {
    id: "carbon",
    title: "Carbon Intelligence",
    desc: "Tracks Net Zero progress against India's 2030 target and quantifies Scope 1 and Scope 3 emission reductions.",
  },
  {
    id: "chat",
    title: "Ask the Fleet",
    desc: "An orchestrator agent that reasons across all of the above to answer cross-cutting questions with real numbers, not guesses.",
  },
];

const STACK = ["React", "FastAPI", "Groq · Llama 3.3", "Python", "Recharts", "Tailwind"];

export default function LandingPage({ onEnter }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="landing-bg">
        <div className="blob blob-blue" />
        <div className="blob blob-green" />
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-20 text-center relative z-10">
        <span className="inline-block px-3 py-1 rounded-full border border-[var(--panel-border)] text-xs text-[var(--text-dim)] mb-6">
          EY Hackathon — Industrial EV Transition
        </span>

        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-blue-dim)] flex items-center justify-center mb-6 animate-pulse-ring">
          <LogoIcon size={32} className="text-[var(--accent-blue)]" strokeWidth={2} />
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold mb-4">EV Twin AI</h1>
        <p className="text-lg text-[var(--text-dim)] max-w-2xl mb-2">
          AI Digital Twin Platform for Industrial EV Fleets & Manufacturing Supply Chains
        </p>
        <p className="text-sm text-[var(--text-dim)] max-w-xl mb-10">
          Three specialized agents share one fleet data model — covering procurement economics,
          battery lifecycle, and supply chain risk — plus an orchestrator that reasons across all
          of them, so operators get answers instead of spreadsheets.
        </p>

        <div className="flex gap-4 mb-16">
          <Button onClick={onEnter} size="md" className="px-6 py-3 text-sm">
            Launch Dashboard <ArrowRight size={16} strokeWidth={2.25} />
          </Button>
        </div>

        <div className="mb-20 w-full px-4">
          <DashboardPreview />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mb-20">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="panel p-4">
                <div className="text-2xl font-semibold text-[var(--accent-blue)] tabular-nums">
                  <CountUp prefix={s.prefix} value={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-[var(--text-dim)] mt-1">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="w-full max-w-5xl mb-20">
          <Reveal>
            <h2 className="text-sm uppercase tracking-wide text-[var(--text-dim)] mb-6">
              Two interconnected angles, one platform
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-4 text-left">
            <Reveal delay={0}>
              <div className="panel p-5 h-full">
                <div className="text-sm font-medium text-[var(--accent-blue)] mb-2">For Fleet Operators</div>
                <p className="text-sm text-[var(--text-dim)]">
                  Manage EV procurement, battery lifecycle, and maintenance operations with the same
                  rigour applied to conventional industrial equipment.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="panel p-5 h-full">
                <div className="text-sm font-medium text-[var(--accent-blue)] mb-2">For EV Manufacturers</div>
                <p className="text-sm text-[var(--text-dim)]">
                  Manage complex, quality-critical battery material supply chains — lithium, cobalt,
                  nickel sourcing and multi-tier supplier risk.
                </p>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal className="w-full max-w-3xl mb-20">
          <div className="panel p-6 border-l-4 border-l-[var(--accent-blue)] text-left">
            <div className="text-xs uppercase tracking-wide text-[var(--accent-blue)] mb-2">What makes this different</div>
            <p className="text-sm text-[var(--text-dim)]">
              Most fleet tools treat procurement and supply chain as separate dashboards. Here, a
              vehicle's EV recommendation is <span className="text-[var(--text)]">directly informed</span> by
              the battery supply chain risk of that OEM's cells — if the recommended model's cell
              supplier is high-risk, the confidence score reflects it automatically, not on a
              different tab you'd have to remember to check.
            </p>
          </div>
        </Reveal>

        <div className="w-full max-w-5xl mb-20">
          <Reveal>
            <h2 className="text-sm uppercase tracking-wide text-[var(--text-dim)] mb-6">What's inside</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {FEATURES.map((f, i) => {
              const Icon = SECTION_ICONS[f.id];
              return (
                <Reveal key={f.title} delay={(i % 3) * 90}>
                  <div className="panel p-5 h-full hover:border-[var(--accent-blue)]/50">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent-blue-dim)] flex items-center justify-center mb-3">
                      <Icon size={18} className="text-[var(--accent-blue)]" strokeWidth={2.25} />
                    </div>
                    <div className="font-medium mb-1">{f.title}</div>
                    <div className="text-sm text-[var(--text-dim)]">{f.desc}</div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {STACK.map((t) => (
            <span key={t} className="px-3 py-1 rounded-full bg-[var(--panel)] border border-[var(--panel-border)] text-xs text-[var(--text-dim)]">
              {t}
            </span>
          ))}
        </div>
        <p className="text-xs text-[var(--text-dim)]">
          Predictions use physics-informed formulas, not trained ML — the LLM handles reasoning and narration only.
        </p>
      </div>
    </div>
  );
}
