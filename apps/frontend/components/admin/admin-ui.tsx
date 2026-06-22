import type { ComponentProps, ReactNode } from "react"
import { AlertTriangle, CheckCircle2, EllipsisVertical, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { OpsDialogPanel } from "@/components/ui/ops-dialog"
import { Input } from "@/components/ui/input"
import { opsControlClassName, INFO_BOX } from "@/components/ui/ops-control-styles"
import { cn } from "@/lib/utils"

const adminControlClass = `${opsControlClassName} focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]`

export function AdminInlineMessage({
  tone,
  icon,
  title,
  children,
}: {
  tone: "danger" | "warning" | "success"
  icon?: ReactNode
  title?: string
  children: ReactNode
}) {
  const toneClass =
    tone === "danger"
      ? "text-[var(--ops-tone-danger-text)]"
      : tone === "warning"
        ? "text-[var(--ops-tone-warning-text)]"
        : "text-[var(--ops-tone-success-text)]"
  const DefaultIcon =
    tone === "success" ? CheckCircle2 : tone === "warning" ? Info : AlertTriangle
  const resolvedIcon = icon === undefined ? <DefaultIcon className="h-4 w-4" /> : icon

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`${INFO_BOX} flex items-start gap-2.5 text-sm text-[var(--ops-text-muted)] shadow-sm`}
    >
      {resolvedIcon ? (
        <span className={cn("mt-0.5 shrink-0", toneClass)}>{resolvedIcon}</span>
      ) : null}
      <div className="min-w-0 leading-5">
        {title ? <p className={cn("font-semibold", toneClass)}>{title}</p> : null}
        <div className={title ? "mt-0.5" : undefined}>{children}</div>
      </div>
    </div>
  )
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
  return <Input {...props} className={cn(adminControlClass, "h-9 px-3.5 py-2", props.className)} />
}

export function AdminTextarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(adminControlClass, "min-h-28 resize-y px-3.5 py-2.5", props.className)}
    />
  )
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

  // Semantic admin wrapper over the shared Button primitive.
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
  // Semantic row-action wrapper kept for dense tables and action clusters.
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
  closeVariant = "default",
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  confirmTone?: "accent" | "danger" | "neutral"
  busy?: boolean
  closeVariant?: "default" | "icon"
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
      closeVariant={closeVariant}
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
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="text-sm leading-6 text-[var(--ops-text-muted)]">{description}</div>
      </div>
    </AdminModalShell>
  )
}

/** @deprecated Prefer `OpsDialog` from `@/components/ui/ops-dialog` for new dialogs. Kept as a compatibility wrapper for legacy admin flows. */
export function AdminModalShell({
  title,
  description,
  onClose,
  children,
  footer,
  widthClass = "max-w-2xl",
  closeVariant = "default",
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  widthClass?: string
  closeVariant?: "default" | "icon"
}) {
  return (
    <div className="ops-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <OpsDialogPanel
        title={title}
        description={description}
        onClose={onClose}
        size={widthClass === "max-w-md" ? "sm" : "md"}
        panelClassName={widthClass}
        closeVariant={closeVariant === "icon" ? "icon" : "button"}
        bodyClassName="max-h-[80vh] px-5 py-5 md:px-6"
        footer={footer}
      >
        {children}
      </OpsDialogPanel>
    </div>
  )
}

export function AdminRowActions({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-nowrap justify-end gap-1.5">{children}</div>
}
