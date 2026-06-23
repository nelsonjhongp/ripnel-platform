"use client"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { POS } from "../pos-messages"

export function ClearSaleDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <OpsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={POS.summary.clearTitle}
      description={POS.summary.clearDesc}
      size="sm"
      bodyClassName="space-y-3"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg px-4"
            onClick={() => onOpenChange(false)}
          >
            {POS.summary.cancel}
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="rounded-lg px-4"
            onClick={onConfirm}
          >
            {POS.summary.clearButton}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--ops-text-muted)]">{POS.summary.clearHint}</p>
    </OpsDialog>
  )
}
