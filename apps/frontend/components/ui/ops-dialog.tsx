"use client"

import type { ReactNode } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const OPS_DIALOG_SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-[520px]",
  lg: "max-w-[760px]",
} as const

export type OpsDialogSize = keyof typeof OPS_DIALOG_SIZE_CLASS

export function OpsDialogPanel({
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
  closeLabel = "Cerrar",
  closeVariant = "icon",
  bodyClassName,
  footerClassName,
  panelClassName,
}: {
  title: string
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: OpsDialogSize
  closeLabel?: string
  closeVariant?: "icon" | "button"
  bodyClassName?: string
  footerClassName?: string
  panelClassName?: string
}) {
  return (
    <div
      className={cn(
        "ops-overlay-panel flex max-h-[calc(100vh-2rem)] w-[min(92vw,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl",
        OPS_DIALOG_SIZE_CLASS[size],
        panelClassName,
      )}
    >
      <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4">
        <div className="min-w-0">
          <DialogPrimitive.Title asChild>
            <h3 className="truncate text-lg font-semibold text-[var(--ops-text)]">{title}</h3>
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description asChild>
              <p className="mt-0.5 text-sm text-[var(--ops-text-muted)]">{description}</p>
            </DialogPrimitive.Description>
          ) : null}
        </div>

        {closeVariant === "button" ? (
          <Button type="button" variant="outline" size="sm" className="rounded-lg px-3" onClick={onClose}>
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            Cerrar
          </Button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--ops-border-strong)] text-[var(--ops-text-muted)] transition hover:border-[color:color-mix(in_srgb,#dc2626_72%,var(--ops-border-strong))] hover:bg-[#dc2626] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,#dc2626_28%,transparent)]"
            aria-label={closeLabel}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className={cn("overflow-y-auto px-5 pb-4 pt-2", bodyClassName)}>{children}</div>

      {footer ? <div className={cn("px-5 pb-4 pt-2", footerClassName)}>{footer}</div> : null}
    </div>
  )
}

export function OpsDialog({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  closeLabel = "Cerrar",
  closeVariant = "icon",
  children,
  footer,
  bodyClassName,
  footerClassName,
  panelClassName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  size?: OpsDialogSize
  closeLabel?: string
  closeVariant?: "icon" | "button"
  children: ReactNode
  footer?: ReactNode
  bodyClassName?: string
  footerClassName?: string
  panelClassName?: string
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ops-overlay-backdrop fixed inset-0 z-50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none data-open:animate-in data-open:zoom-in-95 data-closed:animate-out data-closed:zoom-out-95">
          <OpsDialogPanel
            title={title}
            description={description}
            onClose={() => onOpenChange(false)}
            size={size}
            closeLabel={closeLabel}
            closeVariant={closeVariant}
            bodyClassName={bodyClassName}
            footerClassName={footerClassName}
            panelClassName={panelClassName}
            footer={footer}
          >
            {children}
          </OpsDialogPanel>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
