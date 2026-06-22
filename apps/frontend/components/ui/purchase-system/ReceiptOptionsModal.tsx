"use client"

import type { ReactNode } from "react"
import { Clock, Eye, FileText, Printer, ReceiptText, Smartphone } from "lucide-react"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RC } from "./receipt-messages"

type ReceiptFormat = "ticket-80mm" | "ticket-58mm" | "pdf-a4" | "pdf-ticket" | "preview"

type ReceiptOption = {
  id: ReceiptFormat
  label: string
  description: string
  icon: ReactNode
  available: boolean
}

const RECEIPT_OPTIONS: ReceiptOption[] = [
  {
    id: "ticket-80mm",
    label: RC.options.ticket80.label,
    description: RC.options.ticket80.description,
    icon: <Printer className="h-4 w-4" />,
    available: false,
  },
  {
    id: "ticket-58mm",
    label: RC.options.ticket58.label,
    description: RC.options.ticket58.description,
    icon: <Smartphone className="h-4 w-4" />,
    available: false,
  },
  {
    id: "pdf-ticket",
    label: RC.options.pdfTicket.label,
    description: RC.options.pdfTicket.description,
    icon: <ReceiptText className="h-4 w-4" />,
    available: false,
  },
  {
    id: "pdf-a4",
    label: RC.options.pdfA4.label,
    description: RC.options.pdfA4.description,
    icon: <FileText className="h-4 w-4" />,
    available: true,
  },
]

export type { ReceiptFormat }

export function ReceiptOptionsModal({
  open,
  onClose,
  saleId,
  onOpenPreview,
}: {
  open: boolean
  onClose: () => void
  saleId?: string
  onOpenPreview: () => void
}) {
  return (
    <OpsDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
      title={RC.dialog.title}
      description={RC.dialog.description}
      size="sm"
      bodyClassName="max-h-[70vh] space-y-4"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg px-4"
            onClick={onClose}
          >
            {RC.dialog.close}
          </Button>
        </div>
      }
    >
          {RECEIPT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={!option.available}
              onClick={() => {
                if (!option.available) return
                if (option.id === "pdf-a4" && saleId) {
                  window.open(`/api/sales/${saleId}/receipt-pdf`, "_blank")
                }
                onClose()
              }}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition",
                option.available
                  ? "cursor-pointer border-[var(--ops-border-soft)] bg-[var(--ops-surface)] hover:bg-[var(--ops-surface-muted)] hover:border-[var(--ripnel-accent)]"
                  : "cursor-not-allowed border-[var(--ops-border-soft)] bg-[var(--ops-surface)] opacity-60"
              )}
            >
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]">
                {option.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-sm font-semibold text-[var(--ops-text)]">{option.label}</span>
                  {!option.available ? (
                    <OpsStatusBadge tone="warning" size="sm" icon={<Clock className="h-3.5 w-3.5" />} className="shrink-0">
                      {RC.badge.comingSoon}
                    </OpsStatusBadge>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--ops-text-muted)]">{option.description}</span>
              </span>
            </button>
          ))}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenPreview()
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[var(--ops-border-strong)] px-4 py-3 text-left transition hover:bg-[var(--ops-surface-muted)] cursor-pointer"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]">
                <Eye className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--ops-text)]">{RC.preview.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--ops-text-muted)]">
                  {RC.preview.description}
                </span>
              </span>
            </button>
          </div>

          <p className="text-xs text-[var(--ops-text-muted)]">
            {RC.dialog.footerNote}
          </p>
    </OpsDialog>
  )
}
