"use client"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { opsInputCompact } from "@/components/ui/ops-control-styles"
import { INFO_BOX_MUTED } from "../cash-constants"
import { formatBusinessDate } from "../cash-utils"
import { CAJA } from "../cash-messages"

export function CashOpenDialog({
  open,
  onOpenChange,
  locationName,
  businessDate,
  openingBalance,
  onOpeningBalanceChange,
  notes,
  onNotesChange,
  loading,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationName?: string | null
  businessDate?: string | null
  openingBalance: string
  onOpeningBalanceChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  loading: boolean
  onConfirm: () => void
}) {
  return (
    <OpsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={CAJA.openDialog.title}
      description={CAJA.openDialog.description}
      size="sm"
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
            {CAJA.openDialog.cancel}
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="rounded-lg px-4"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? CAJA.openDialog.processing : CAJA.openDialog.confirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className={`${INFO_BOX_MUTED} space-y-1.5`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--ops-text-muted)]">
              {CAJA.openDialog.location}
            </span>
            <span className="text-sm font-medium text-[var(--ops-text)]">
              {locationName ?? CAJA.fallback.dash}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--ops-text-muted)]">
              {CAJA.openDialog.businessDate}
            </span>
            <span className="text-sm font-medium text-[var(--ops-text)]">
              {businessDate
                ? formatBusinessDate(businessDate)
                : CAJA.fallback.dash}
            </span>
          </div>
        </div>
        <OpsFormField
          label={CAJA.openDialog.openingBalanceLabel}
          density="compact"
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={openingBalance}
            onChange={(event) => onOpeningBalanceChange(event.target.value)}
            placeholder={CAJA.openDialog.openingBalancePlaceholder}
            className={`${opsInputCompact} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
        </OpsFormField>
        <OpsFormField
          label={CAJA.openDialog.notesLabel}
          density="compact"
        >
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            rows={2}
            placeholder={CAJA.openDialog.notesPlaceholder}
            className={opsInputCompact}
          />
        </OpsFormField>
      </div>
    </OpsDialog>
  )
}
