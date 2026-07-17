import { Truck, ClipboardList, BatteryCharging, AlertTriangle, Globe2, MessageCircle } from "lucide-react";

const BARS = [30, 55, 40, 70, 85, 60, 95, 75, 50, 65];
const NAV = [
  { icon: Truck, active: true },
  { icon: ClipboardList },
  { icon: BatteryCharging },
  { icon: AlertTriangle },
  { icon: Globe2 },
  { icon: MessageCircle },
];

/** Decorative, fully static mockup of the real dashboard -- same visual
 * language (panels, two-tone palette, chart shape) as the actual app, so
 * the landing page shows the product instead of just describing it. */
export default function DashboardPreview() {
  return (
    <div
      className="w-full max-w-3xl mx-auto animate-float"
      style={{ transform: "perspective(1000px) rotateX(4deg) rotateY(-3deg)" }}
    >
      <div
        className="panel overflow-hidden text-left"
        style={{ boxShadow: "0 30px 80px -20px rgba(58, 163, 255, 0.25), 0 20px 60px -25px rgba(38, 219, 168, 0.15)" }}
      >
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[var(--panel-border)] bg-[var(--panel-hover)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--danger)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
          <span className="ml-3 text-xs text-[var(--text-dim)]">ev-twin-ai.app/dashboard</span>
        </div>

        <div className="flex">
          <div className="w-12 sm:w-14 shrink-0 border-r border-[var(--panel-border)] flex flex-col items-center py-4 gap-3">
            {NAV.map((n, i) => (
              <span
                key={i}
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  n.active ? "bg-[var(--accent-blue-dim)] text-[var(--accent-blue)]" : "text-[var(--text-dim)]"
                }`}
              >
                <n.icon size={14} strokeWidth={2.25} />
              </span>
            ))}
          </div>

          <div className="flex-1 p-4 sm:p-5 min-w-0">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
              {[
                { label: "Readiness", value: "81.7", tone: "var(--accent)" },
                { label: "Confidence", value: "87%", tone: "var(--accent-blue)" },
                { label: "CO2 Saved", value: "1.4K t", tone: "var(--accent)" },
              ].map((m) => (
                <div key={m.label} className="rounded-lg bg-[var(--bg)] border border-[var(--panel-border)] p-2.5">
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[var(--text-dim)] truncate">{m.label}</div>
                  <div className="text-sm sm:text-lg font-semibold tabular-nums" style={{ color: m.tone }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-[var(--bg)] border border-[var(--panel-border)] p-3 mb-3">
              <div className="flex items-end gap-1 sm:gap-1.5 h-16 sm:h-20">
                {BARS.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm animate-bar-grow"
                    style={{
                      height: `${h}%`,
                      background: h > 70 ? "var(--accent)" : "var(--accent-blue)",
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {[
                { id: "V032", tag: "Critical", color: "var(--danger)" },
                { id: "V147", tag: "High", color: "var(--warning)" },
                { id: "V103", tag: "Low", color: "var(--accent)" },
              ].map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs rounded-md px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--panel-border)]">
                  <span className="font-medium tabular-nums">{r.id}</span>
                  <span style={{ color: r.color }}>{r.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
