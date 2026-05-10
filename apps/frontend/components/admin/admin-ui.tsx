import type { ComponentProps, ReactNode } from "react"
import { AlertTriangle, EllipsisVertical, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  OpsMultiSelectMenu,
  type OpsOption,
  OpsReadonlyFieldState,
  OpsSelectionChip,
  OpsSelectMenu,
} from "@/components/ui/ops-selection"
import { cn } from "@/lib/utils"

const adminControlClass =
  "w-full rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] text-sm text-[var(--ops-text)] outline-none transition hover:border-[var(--ops-border-soft)] focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"

export function AdminInlineMessage({
  tone,
  children,
}: {
  tone: "danger" | "warning" | "success"
  children: ReactNode
}) {
  const toneClass =
    tone === "danger"
      ? "border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]"
      : tone === "warning"
        ? "border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]"
        : "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#047857_74%,var(--ops-text))]"

  return <div className={cn("rounded-xl border px-4 py-3 text-sm", toneClass)}>{children}</div>
}

export function AdminSection({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: string
  description?: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "space-y-3 border-b border-[var(--ops-border-soft)] pb-4 last:border-b-0 last:pb-0",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--ops-text)]">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[var(--ops-text-muted)]">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function AdminField({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--ops-text)]">
        {label}
      </label>
      {children}
      {hint ? <span className="block text-xs text-[var(--ops-text-muted)]">{hint}</span> : null}
    </div>
  )
}

export function AdminInput(props: ComponentProps<typeof Input>) {
  return <Input {...props} className={cn(adminControlClass, "h-10 px-3.5 py-2.5", props.className)} />
}

export function AdminTextarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(adminControlClass, "min-h-28 resize-y px-3.5 py-2.5", props.className)}
    />
  )
}

export function AdminSelect(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(adminControlClass, "h-10 cursor-pointer px-3.5 py-2.5", props.className)}
    />
  )
}

export function AdminSelectMenu({
  value,
  onValueChange,
  placeholder,
  options,
  disabled = false,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: OpsOption[]
  disabled?: boolean
}) {
  return (
    <OpsSelectMenu
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      options={options}
      disabled={disabled}
    />
  )
}

export function AdminMultiSelectMenu({
  selectedValues,
  onToggle,
  placeholder,
  options,
  disabled = false,
}: {
  selectedValues: string[]
  onToggle: (value: string) => void
  placeholder: string
  options: OpsOption[]
  disabled?: boolean
}) {
  return (
    <OpsMultiSelectMenu
      selectedValues={selectedValues}
      onToggle={onToggle}
      placeholder={placeholder}
      options={options}
      disabled={disabled}
    />
  )
}

export function AdminSelectionChip({
  label,
  onRemove,
  selected = false,
}: {
  label: string
  onRemove?: () => void
  selected?: boolean
}) {
  return (
    <OpsSelectionChip label={label} onRemove={onRemove} selected={selected} />
  )
}

export function AdminReadonlyFieldState(props: ComponentProps<typeof OpsReadonlyFieldState>) {
  return <OpsReadonlyFieldState {...props} />
}

export function AdminCheckboxRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--ops-border-soft)] bg-[var(--ops-surface)] px-3.5 py-3 transition hover:bg-[var(--ops-surface-muted)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-[var(--ops-border-strong)]"
      />
      <span className="min-w-0">
        <span className="block text-sm text-[var(--ops-text)]">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-[var(--ops-text-muted)]">{description}</span>
        ) : null}
      </span>
    </label>
  )
}

export function AdminCheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="m-0 h-[0.9375rem] w-[0.9375rem] cursor-pointer rounded-[0.25rem] accent-[var(--ripnel-accent)]"
      />
      <span className="text-[0.8125rem] leading-none text-[var(--ops-text-muted)]">{label}</span>
    </label>
  )
}

export function AdminCheckboxOption({
  label,
  helper,
  checked,
  onChange,
}: {
  label: string
  helper?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition",
        checked
          ? "border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)]"
          : "border-[var(--ops-border-soft)] bg-[var(--ops-surface)] hover:bg-[var(--ops-surface-muted)]"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="m-0 mt-0.5 h-[0.9375rem] w-[0.9375rem] cursor-pointer rounded-[0.25rem] accent-[var(--ripnel-accent)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--ops-text)]">{label}</span>
        {helper ? (
          <span className="mt-0.5 block text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            {helper}
          </span>
        ) : null}
      </span>
    </label>
  )
}

export function AdminFormActionsBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 border-t border-[var(--ops-border-strong)] pt-4 sm:flex-row sm:items-center sm:justify-end",
        className
      )}
    >
      {children}
    </div>
  )
}

export function AdminActionButton({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<typeof Button> & {
  tone?: "neutral" | "accent" | "danger"
}) {
  const variant =
    tone === "accent" ? "accent" : tone === "danger" ? "destructive" : "outline"

  return <Button {...props} variant={variant} size={props.size ?? "sm"} className={cn("rounded-lg px-3", className)} />
}

export function AdminRowActionButton({
  icon,
  tone = "neutral",
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  icon?: ReactNode
  tone?: "neutral" | "accent" | "danger"
}) {
  return (
    <AdminActionButton
      {...props}
      tone={tone}
      className={cn("gap-1.5 whitespace-nowrap", className)}
    >
      {icon}
      {children}
    </AdminActionButton>
  )
}

export function AdminRowActionsMenu({
  items,
  ariaLabel = "Acciones",
}: {
  items: Array<{
    label: string
    icon?: ReactNode
    onSelect: () => void
    tone?: "neutral" | "danger"
    disabled?: boolean
  }>
  ariaLabel?: string
}) {
  return (
    <div className="flex w-full justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="cursor-pointer rounded-lg"
            aria-label={ariaLabel}
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="min-w-44 rounded-lg">
          {items.map((item) => (
            <DropdownMenuItem
              key={item.label}
              disabled={item.disabled}
              variant={item.tone === "danger" ? "destructive" : "default"}
              className="cursor-pointer gap-2 rounded-md px-2 py-2"
              onSelect={() => item.onSelect()}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function AdminConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  confirmTone = "danger",
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  confirmTone?: "accent" | "danger" | "neutral"
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) {
    return null
  }

  return (
    <AdminModalShell
      title={title}
      onClose={onCancel}
      widthClass="max-w-md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AdminActionButton type="button" onClick={onCancel} disabled={busy}>
            Cancelar
          </AdminActionButton>
          <AdminActionButton type="button" tone={confirmTone} onClick={onConfirm} disabled={busy}>
            {busy ? "Procesando..." : confirmLabel}
          </AdminActionButton>
        </div>
      }
    >
      <div className="flex gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,#f43f5e_32%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_12%,var(--ops-surface))] text-[color:color-mix(in_srgb,#be123c_78%,var(--ops-text))]">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="text-sm leading-6 text-[var(--ops-text-muted)]">{description}</div>
      </div>
    </AdminModalShell>
  )
}

export function AdminModalShell({
  title,
  description,
  onClose,
  children,
  footer,
  widthClass = "max-w-2xl",
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  widthClass?: string
}) {
  return (
    <div className="ops-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cn("ops-overlay-panel w-full overflow-hidden rounded-2xl", widthClass)}>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border-strong)] px-5 py-4 md:px-6">
          <div>
            <h3 className="text-lg font-semibold text-[var(--ops-text)] md:text-xl">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{description}</p>
            ) : null}
          </div>
          <AdminActionButton type="button" tone="neutral" onClick={onClose}>
            <X className="h-4 w-4" />
            Cerrar
          </AdminActionButton>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-5 py-5 md:px-6">{children}</div>

        {footer ? <div className="border-t border-[var(--ops-border-strong)] px-5 py-4 md:px-6">{footer}</div> : null}
      </div>
    </div>
  )
}

export function AdminRowActions({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-nowrap justify-end gap-1.5">{children}</div>
}
