export function Loading({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-3 text-[var(--text-dim)] text-sm p-8 justify-center">
      <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin shrink-0" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message }) {
  return (
    <div className="panel p-4 text-sm flex items-start gap-3" style={{ borderColor: "var(--danger)" }}>
      <span className="text-[var(--danger)] shrink-0">⚠</span>
      <span className="text-[var(--text-dim)]">{message}</span>
    </div>
  );
}

export function SkeletonBlock({ className = "h-4 w-full" }) {
  return <div className={`animate-pulse rounded-md bg-[var(--panel-hover)] ${className}`} />;
}
