export function Loading({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-3 text-[var(--text-dim)] p-8">
      <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message }) {
  return (
    <div className="panel border-[var(--danger)] p-4 text-[var(--danger)] text-sm">
      {message}
    </div>
  );
}
