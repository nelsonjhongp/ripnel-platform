"use client"

import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { opsInputCompact } from "@/components/ui/ops-control-styles"
import { INFO_BOX_MUTED, METHOD_CONFIG } from "../cash-constants"
import { HelpTooltip } from "@/components/ui/help-tooltip"
import { CAJA } from "../cash-messages"

export function CashCloseDialog({
  open,
  onOpenChange,
  methodValues,
  closeSummaryTotal,
  warningMessage,
  closingBalanceDeclared,
  onClosingBalanceDeclaredChange,
  notes,
  onNotesChange,
  loading,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  methodValues: Record<string, string> | null
  closeSummaryTotal: string | null
  warningMessage?: string | null
  closingBalanceDeclared: string
  onClosingBalanceDeclaredChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  loading: boolean
  onConfirm: () => void
}) {
  return (
    <OpsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={CAJA.closeDialog.title}
      description={CAJA.closeDialog.description}
      size="md"
      bodyClassName="space-y-4"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg px-4"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {CAJA.closeDialog.cancel}
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="rounded-lg px-4"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? CAJA.closeDialog.processing : CAJA.closeDialog.confirm}
          </Button>
        </div>
      }
    >
      <div>
        {warningMessage ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] px-3 py-2.5 text-sm text-[var(--ops-tone-warning-text)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{warningMessage}</p>
          </div>
        ) : null}

        {methodValues ? (
          <div className={`${INFO_BOX_MUTED} space-y-1`}>
            {METHOD_CONFIG.map((method) => (
              <div
                key={method.key}
                className="flex justify-between text-sm"
              >
                <span className="text-[var(--ops-text-muted)]">
                  {CAJA.methods[method.key]}
                </span>
                <span className="font-medium text-[var(--ops-text)]">
                  {methodValues[method.key]}
                </span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-[var(--ops-border-strong)] pt-2 text-sm font-semibold">
              <span className="text-[var(--ops-text)]">
                <span className="inline-flex items-center gap-1">
                  {CAJA.closeDialog.total}
                  <HelpTooltip content={CAJA.closeDialog.totalHint} />
                </span>
              </span>
              <span className="text-[var(--ops-text)]">
                {closeSummaryTotal ?? ""}
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <OpsFormField
            label={CAJA.closeDialog.declaredLabel}
            density="compact"
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={closingBalanceDeclared}
              onChange={(event) =>
                onClosingBalanceDeclaredChange(event.target.value)
              }
              placeholder={CAJA.closeDialog.declaredPlaceholder}
              className={opsInputCompact}
            />
          </OpsFormField>
          <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
            {CAJA.closeDialog.declaredHint}
          </p>
        </div>

        <div className="mt-4">
          <OpsFormField
            label={CAJA.closeDialog.notesLabel}
            density="compact"
          >
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={2}
              placeholder={CAJA.closeDialog.notesPlaceholder}
              className={opsInputCompact}
            />
          </OpsFormField>
        </div>
      </div>
    </OpsDialog>
  )
}
