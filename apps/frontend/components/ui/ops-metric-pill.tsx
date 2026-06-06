import { cn } from "@/lib/utils"

export function OpsMetricPill({
  label,
  value,
  tone = "default",
  active = false,
  onClick,
}: {
  label: string
  value: string | number
  tone?: "default" | "accent" | "warning" | "success"
  active?: boolean
  onClick?: () => void
}) {
  const toneClass = active
    ? tone === "accent"
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent)_18%,var(--ops-surface))] text-[var(--ops-text)]"
      : tone === "warning"
        ? "border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]"
        : tone === "success"
          ? "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] text-[var(--ops-text)]"
          : "border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent)_18%,var(--ops-surface))] text-[var(--ops-text)]"
    : tone === "accent"
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] text-[var(--ops-text)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ripnel-accent)_14%,transparent)]"
      : tone === "warning"
        ? "border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]"
        : tone === "success"
          ? "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] text-[var(--ops-tone-success-text)]"
          : "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] text-[var(--ops-text)]"
  const labelClass =
    active && tone === "success"
      ? "text-[var(--ops-tone-success-text)]"
      : tone === "accent"
      ? "text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]"
      : tone === "warning"
        ? "text-[var(--ops-tone-warning-text)]"
        : tone === "success"
          ? "text-[var(--ops-tone-success-text)]"
        : "text-[var(--ops-text-muted)]"
  const valueClass =
    tone === "accent"
      ? "text-[var(--ops-text)]"
      : tone === "warning"
        ? "text-[var(--ops-tone-warning-text)]"
        : tone === "success"
          ? "text-[var(--ops-tone-success-text)]"
        : "text-[var(--ops-text)]"

  const content = (
    <>
      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", labelClass)}>
        {label}
      </span>
      <span className={cn("text-base font-semibold leading-none", valueClass)}>{value}</span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2.5 rounded-full border px-3 py-2 transition",
          toneClass
        )}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border px-3 py-2",
        toneClass
      )}
    >
      {content}
    </div>
  )
}
