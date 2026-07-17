const VARIANTS = {
  primary: "bg-[var(--accent-blue)] text-[var(--bg)] hover:brightness-110 disabled:opacity-50",
  secondary: "bg-[var(--panel)] border border-[var(--panel-border)] text-[var(--text)] hover:border-[var(--accent-blue)] disabled:opacity-50",
  ghost: "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel)] disabled:opacity-50",
  danger: "bg-[var(--danger)] text-white hover:brightness-110 disabled:opacity-50",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all active:scale-[0.97] ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === "sm" ? 14 : 16} strokeWidth={2.25} />}
      {children}
    </button>
  );
}
