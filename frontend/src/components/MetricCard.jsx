export default function MetricCard({ label, value, sub, tone = "default" }) {
  const toneColor = {
    default: "text-[var(--text)]",
    accent: "text-[var(--accent)]",
    danger: "text-[var(--danger)]",
    warning: "text-[var(--warning)]",
  }[tone];

  return (
    <div className="panel p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs uppercase tracking-wide text-[var(--text-dim)]">{label}</span>
      <span className={`text-2xl font-semibold ${toneColor} truncate`}>{value}</span>
      {sub && <span className="text-xs text-[var(--text-dim)]">{sub}</span>}
    </div>
  );
}
