import type { InputHTMLAttributes, ReactNode } from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"

export function OpsPageShell({
  children,
  className,
  width = "wide",
}: {
  children: ReactNode
  className?: string
  width?: "default" | "wide"
}) {
  return (
    <section className="ops-page min-h-dvh px-4 py-[var(--ops-page-py)] md:px-8">
      <div
        className={cn(
          "mx-auto space-y-4",
          width === "wide" ? "max-w-[1180px]" : "max-w-[980px]",
          className
        )}
      >
        {children}
      </div>
    </section>
  )
}

export function OpsSectionDivider({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return <div className={cn("border-t border-[var(--ops-border-strong)] pt-4", className)}>{children}</div>
}

export function OpsTableBlock({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("space-y-4", className)}>{children}</div>
}

export function OpsFiltersRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid gap-2.5 lg:grid-cols-[minmax(0,1.55fr)_0.92fr_0.92fr_auto] lg:items-end",
        className
      )}
    >
      {children}
    </div>
  )
}

export function OpsTableWrap({
  children,
  minWidth = "1080px",
}: {
  children: ReactNode
  minWidth?: string
}) {
  return (
    <div className="overflow-x-auto">
      <div className="border-y border-[var(--ops-border-strong)]" style={{ minWidth }}>
        {children}
      </div>
    </div>
  )
}

export function OpsTableFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      {children}
    </div>
  )
}

export function OpsSearchField({
  label = "Buscar",
  name = "ops_search",
  autoComplete = "off",
  inputMode = "search",
  value,
  onChange,
  placeholder,
  ariaLabel,
  onFocus,
  density,
}: {
  label?: string
  name?: string
  autoComplete?: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"]
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
  onFocus?: () => void
  density?: "default" | "compact"
}) {
  const height = density === "compact" ? "h-9" : "h-10"
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
        {label}
      </label>
      <div className={`sales-field flex ${height} items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)] focus-within:border-[var(--ripnel-accent)] focus-within:ring-2 focus-within:ring-[var(--ripnel-accent-soft)]`}>
        <Search className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
        <input
          type="text"
          name={name}
          autoComplete={autoComplete}
          inputMode={inputMode}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
        />
      </div>
    </div>
  )
}
