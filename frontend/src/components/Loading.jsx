import { AlertTriangle, Loader2 } from "lucide-react";

export function Loading({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-2.5 text-[var(--text-dim)] text-sm p-8 justify-center">
      <Loader2 size={16} className="animate-spin shrink-0" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message }) {
  return (
    <div className="panel p-4 text-sm flex items-start gap-3" style={{ borderColor: "var(--danger)" }}>
      <AlertTriangle size={16} className="text-[var(--danger)] shrink-0 mt-0.5" />
      <span className="text-[var(--text-dim)]">{message}</span>
    </div>
  );
}

export function SkeletonBlock({ className = "h-4 w-full", style }) {
  return <div className={`animate-skeleton rounded-md bg-[var(--panel-hover)] ${className}`} style={style} />;
}

/** Mimics the metric-cards + chart shape most pages load into, so the
 * loading state doesn't jump/reflow once real content arrives. */
export function PageSkeleton({ metricCount = 4, chartHeight = 260 }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: metricCount }).map((_, i) => (
          <div key={i} className="panel p-4 flex flex-col gap-2">
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonBlock className="h-6 w-1/2" />
          </div>
        ))}
      </div>
      <div className="panel p-4">
        <SkeletonBlock className="h-3 w-40 mb-4" />
        <SkeletonBlock className="w-full" style={{ height: chartHeight }} />
      </div>
    </div>
  );
}
