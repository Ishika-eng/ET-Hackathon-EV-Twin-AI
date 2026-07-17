export default function MetricCard({ label, value, sub, tone = "default" }) {
  const toneColor = {
    default: "text-[var(--text)]",
    accent: "text-[var(--accent)]",
    danger: "text-[var(--danger)]",
    warning: "text-[var(--warning)]",
  }[tone];

  return (
    <div className="panel p-4 flex flex-col gap-1.5 min-w-0 hover:border-[var(--text-dim)]/40">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-dim)]">{label}</span>
      <span className={`text-2xl font-semibold ${toneColor} truncate tabular-nums`}>{value}</span>
      {sub && <span className="text-xs text-[var(--text-dim)]">{sub}</span>}
    </div>
  );
}
